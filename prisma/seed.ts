import {
  IngredientCategory,
  KnowledgeSource,
  MaterialType,
  PrismaClient,
  RecipeSource,
  RecipeStatus,
} from '@prisma/client';
import { buildCoreSubstitutes } from './core-substitutes';
import { isSafeIngredientCombination } from '../src/common/food-safety';
import {
  BASE_CATALOG_INGREDIENTS,
  buildIngredientCatalog,
  buildSafeBulkRecipes,
  SAFE_CATALOG_RECIPES,
  type CatalogRecipe,
} from './seed-catalog';

const prisma = new PrismaClient();

const TARGET_INGREDIENTS = Number(process.env.SEED_INGREDIENTS ?? 500);
const TARGET_RECIPES = Number(process.env.SEED_RECIPES ?? 1500);
const TARGET_SUBSTITUTES = Number(process.env.SEED_SUBSTITUTES ?? 1500);
const SEED_MINIMAL = process.env.SEED_MINIMAL === '1';

const coreIngredients = BASE_CATALOG_INGREDIENTS;
const coreRecipes = SAFE_CATALOG_RECIPES;

const coreSubstitutes = buildCoreSubstitutes(
  new Set(coreIngredients.map((i) => i.name)),
);

async function upsertCoreSubstitutes(ingredientMap: Map<string, string>) {
  for (const sub of coreSubstitutes) {
    const fromId = ingredientMap.get(sub.from);
    const toId = ingredientMap.get(sub.to);
    if (!fromId || !toId) continue;
    await prisma.ingredientSubstitute.upsert({
      where: {
        ingredientId_substituteId: {
          ingredientId: fromId,
          substituteId: toId,
        },
      },
      create: {
        ingredientId: fromId,
        substituteId: toId,
        score: sub.score,
        source: KnowledgeSource.MANUAL,
      },
      update: { score: sub.score },
    });
  }
}

async function ensureSubstituteCoverage(ingredientMap: Map<string, string>) {
  const categoryByName = new Map(
    coreIngredients.map((i) => [i.name, i.category] as const),
  );
  const byCategory = new Map<IngredientCategory, string[]>();
  for (const name of ingredientMap.keys()) {
    const cat = categoryByName.get(name);
    if (!cat) continue;
    const list = byCategory.get(cat) ?? [];
    list.push(name);
    byCategory.set(cat, list);
  }

  for (const [name, fromId] of ingredientMap) {
    const existing = await prisma.ingredientSubstitute.count({
      where: { ingredientId: fromId },
    });
    if (existing >= 2) continue;

    const cat = categoryByName.get(name);
    if (!cat) continue;
    const peers = (byCategory.get(cat) ?? []).filter((p) => p !== name);
    let added = 0;
    for (const peer of peers) {
      if (existing + added >= 2) break;
      const toId = ingredientMap.get(peer);
      if (!toId) continue;
      if (!isSafeIngredientCombination([name, peer])) continue;
      const score = 32 + added * 8;
      await prisma.ingredientSubstitute.upsert({
        where: {
          ingredientId_substituteId: {
            ingredientId: fromId,
            substituteId: toId,
          },
        },
        create: {
          ingredientId: fromId,
          substituteId: toId,
          score,
          source: KnowledgeSource.MANUAL,
        },
        update: {},
      });
      added += 1;
    }
  }
}

async function chunkedCreateMany<T>(
  label: string,
  rows: T[],
  size: number,
  write: (batch: T[]) => Promise<unknown>,
) {
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size);
    await write(batch);
    if ((i / size) % 10 === 0) {
      console.log(`  ${label}: ${Math.min(i + size, rows.length)}/${rows.length}`);
    }
  }
}

async function upsertRecipe(
  recipe: CatalogRecipe,
  ingredientMap: Map<string, string>,
) {
  const names = recipe.materials.map((m) => m.name);
  if (!isSafeIngredientCombination(names)) return;

  const existing = await prisma.recipe.findFirst({
    where: { name: recipe.name, source: RecipeSource.MANUAL },
  });
  const recipeId =
    existing?.id ??
    (
      await prisma.recipe.create({
        data: {
          name: recipe.name,
          source: RecipeSource.MANUAL,
          status: RecipeStatus.PUBLISHED,
          confidence: recipe.name.includes('·') ? 0.75 : 1,
        },
      })
    ).id;

  await prisma.recipeMaterial.deleteMany({ where: { recipeId } });
  for (const material of recipe.materials) {
    const ingredientId = ingredientMap.get(material.name);
    if (!ingredientId) continue;
    await prisma.recipeMaterial.create({
      data: {
        recipeId,
        ingredientId,
        type: material.type,
        required: material.required,
      },
    });
  }
}

async function seedRecipes(
  recipes: CatalogRecipe[],
  ingredientMap: Map<string, string>,
) {
  for (const recipe of recipes) {
    await upsertRecipe(recipe, ingredientMap);
  }
}

async function seedCoreOnly() {
  console.log('Seed mode: MINIMAL (safe catalog)');
  const ingredientMap = new Map<string, string>();

  for (const item of coreIngredients) {
    const row = await prisma.ingredient.upsert({
      where: { name: item.name },
      create: {
        name: item.name,
        category: item.category,
        taste: item.taste ?? null,
      },
      update: {
        category: item.category,
        taste: item.taste ?? null,
      },
    });
    ingredientMap.set(row.name, row.id);
  }

  await seedRecipes(coreRecipes, ingredientMap);
  await upsertCoreSubstitutes(ingredientMap);
  await ensureSubstituteCoverage(ingredientMap);

  const counts = {
    ingredients: await prisma.ingredient.count(),
    recipes: await prisma.recipe.count(),
    materials: await prisma.recipeMaterial.count(),
    substitutes: await prisma.ingredientSubstitute.count(),
  };
  console.log('Seed complete (minimal):', counts);
  return counts;
}

async function main() {
  if (SEED_MINIMAL) {
    return seedCoreOnly();
  }

  console.log(
    `Seed targets: ingredients=${TARGET_INGREDIENTS}, recipes=${TARGET_RECIPES}, substitutes=${TARGET_SUBSTITUTES}`,
  );

  const catalog = buildIngredientCatalog(TARGET_INGREDIENTS);
  console.log(`Upserting ${catalog.length} ingredients...`);
  const ingredientMap = new Map<string, string>();

  for (const item of catalog) {
    const row = await prisma.ingredient.upsert({
      where: { name: item.name },
      create: {
        name: item.name,
        category: item.category,
        taste: item.taste ?? null,
      },
      update: {
        category: item.category,
        taste: item.taste ?? null,
      },
    });
    ingredientMap.set(row.name, row.id);
  }

  const allIngredients = await prisma.ingredient.findMany({
    select: { id: true, name: true, category: true },
  });
  for (const row of allIngredients) ingredientMap.set(row.name, row.id);

  console.log('Seeding curated safe recipes...');
  await seedRecipes(coreRecipes, ingredientMap);

  console.log('Clearing previously generated bulk recipes...');
  await prisma.recipeMaterial.deleteMany({
    where: { recipe: { name: { contains: '·' } } },
  });
  await prisma.recipe.deleteMany({ where: { name: { contains: '·' } } });

  const currentRecipes = await prisma.recipe.count();
  const generatedNeeded = Math.max(0, TARGET_RECIPES - currentRecipes);
  const bulkRecipes = buildSafeBulkRecipes(generatedNeeded);
  console.log(`Upserting ${bulkRecipes.length} safe bulk recipes...`);
  await seedRecipes(bulkRecipes, ingredientMap);

  console.log('Seeding substitutes...');
  await upsertCoreSubstitutes(ingredientMap);
  await ensureSubstituteCoverage(ingredientMap);

  const existingSubs = await prisma.ingredientSubstitute.count();
  const subNeeded = Math.max(0, TARGET_SUBSTITUTES - existingSubs);
  const subRows: {
    ingredientId: string;
    substituteId: string;
    score: number;
    source: KnowledgeSource;
  }[] = [];

  const byCategory = new Map<IngredientCategory, typeof allIngredients>();
  for (const ing of allIngredients) {
    const list = byCategory.get(ing.category) ?? [];
    list.push(ing);
    byCategory.set(ing.category, list);
  }

  outer: for (let i = 0; i < allIngredients.length; i++) {
    const a = allIngredients[i];
    const peers = byCategory.get(a.category) ?? [];
    for (let j = 0; j < peers.length; j++) {
      if (subRows.length >= subNeeded) break outer;
      const b = peers[(i + j + 1) % peers.length];
      if (!b || a.id === b.id) continue;
      if (!isSafeIngredientCombination([a.name, b.name])) continue;
      subRows.push({
        ingredientId: a.id,
        substituteId: b.id,
        score: 30 + ((i + j) % 50),
        source: KnowledgeSource.MANUAL,
      });
    }
  }

  console.log(`Generating ${subRows.length} substitute edges...`);
  await chunkedCreateMany('substitutes', subRows, 500, async (batch) => {
    await prisma.ingredientSubstitute.createMany({
      data: batch,
      skipDuplicates: true,
    });
  });

  const counts = {
    ingredients: await prisma.ingredient.count(),
    recipes: await prisma.recipe.count(),
    materials: await prisma.recipeMaterial.count(),
    substitutes: await prisma.ingredientSubstitute.count(),
  };
  console.log('Seed complete:', counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
