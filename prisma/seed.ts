import {
  IngredientCategory,
  KnowledgeSource,
  MaterialType,
  PrismaClient,
  RecipeSource,
  RecipeStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_INGREDIENTS = Number(process.env.SEED_INGREDIENTS ?? 1000);
const TARGET_RECIPES = Number(process.env.SEED_RECIPES ?? 5000);
const TARGET_SUBSTITUTES = Number(process.env.SEED_SUBSTITUTES ?? 5000);
/** 仅灌 core 列表，几秒内完成，适合云托管 HTTP 触发 */
const SEED_MINIMAL = process.env.SEED_MINIMAL === '1';

type SeedIngredient = {
  name: string;
  category: IngredientCategory;
  taste?: string;
};

type SeedRecipe = {
  name: string;
  materials: { name: string; type: MaterialType; required: boolean }[];
};

const coreIngredients: SeedIngredient[] = [
  { name: '鸡肉', category: IngredientCategory.MAIN, taste: '鲜' },
  { name: '土豆', category: IngredientCategory.MAIN, taste: '淡' },
  { name: '青椒', category: IngredientCategory.SIDE, taste: '清香' },
  { name: '牛肉', category: IngredientCategory.MAIN, taste: '鲜' },
  { name: '番茄', category: IngredientCategory.MAIN, taste: '酸甜' },
  { name: '洋葱', category: IngredientCategory.SIDE, taste: '辛香' },
  { name: '猪肉', category: IngredientCategory.MAIN },
  { name: '排骨', category: IngredientCategory.MAIN },
  { name: '鸡蛋', category: IngredientCategory.MAIN },
  { name: '豆腐', category: IngredientCategory.MAIN },
  { name: '白菜', category: IngredientCategory.SIDE },
  { name: '菠菜', category: IngredientCategory.SIDE },
  { name: '胡萝卜', category: IngredientCategory.SIDE },
  { name: '芹菜', category: IngredientCategory.SIDE },
  { name: '茄子', category: IngredientCategory.MAIN },
  { name: '黄瓜', category: IngredientCategory.SIDE },
  { name: '冬瓜', category: IngredientCategory.SIDE },
  { name: '蘑菇', category: IngredientCategory.SIDE },
  { name: '木耳', category: IngredientCategory.SIDE },
  { name: '粉丝', category: IngredientCategory.SIDE },
  { name: '米饭', category: IngredientCategory.MAIN },
  { name: '面条', category: IngredientCategory.MAIN },
  { name: '花生', category: IngredientCategory.SIDE },
  { name: '大蒜', category: IngredientCategory.SEASONING },
  { name: '生姜', category: IngredientCategory.SEASONING },
  { name: '大葱', category: IngredientCategory.SEASONING },
  { name: '盐', category: IngredientCategory.SEASONING },
  { name: '糖', category: IngredientCategory.SEASONING },
  { name: '生抽', category: IngredientCategory.SEASONING },
  { name: '老抽', category: IngredientCategory.SEASONING },
  { name: '料酒', category: IngredientCategory.SEASONING },
  { name: '醋', category: IngredientCategory.SEASONING },
  { name: '食用油', category: IngredientCategory.SEASONING },
  { name: '胡椒粉', category: IngredientCategory.SPICE },
  { name: '白胡椒', category: IngredientCategory.SPICE },
  { name: '黑胡椒', category: IngredientCategory.SPICE },
  { name: '花椒', category: IngredientCategory.SPICE },
  { name: '藤椒', category: IngredientCategory.SPICE },
  { name: '干辣椒', category: IngredientCategory.SPICE },
  { name: '辣椒', category: IngredientCategory.SPICE },
  { name: '八角', category: IngredientCategory.SPICE },
  { name: '桂皮', category: IngredientCategory.SPICE },
  { name: '香叶', category: IngredientCategory.SPICE },
  { name: '孜然', category: IngredientCategory.SPICE },
  { name: '豆瓣酱', category: IngredientCategory.SEASONING },
  { name: '番茄酱', category: IngredientCategory.SEASONING },
  { name: '淀粉', category: IngredientCategory.SEASONING },
  { name: '红薯', category: IngredientCategory.MAIN },
  { name: '玉米', category: IngredientCategory.SIDE },
  { name: '西蓝花', category: IngredientCategory.SIDE },
  { name: '虾', category: IngredientCategory.MAIN },
  { name: '鱼', category: IngredientCategory.MAIN },
  { name: '牛奶', category: IngredientCategory.DRINK },
  { name: '豆浆', category: IngredientCategory.DRINK },
];

const coreRecipes: SeedRecipe[] = [
  {
    name: '土豆青椒炒鸡',
    materials: [
      { name: '鸡肉', type: MaterialType.MAIN, required: true },
      { name: '土豆', type: MaterialType.MAIN, required: true },
      { name: '青椒', type: MaterialType.SIDE, required: true },
      { name: '胡椒粉', type: MaterialType.SEASONING, required: true },
      { name: '盐', type: MaterialType.SEASONING, required: true },
      { name: '生抽', type: MaterialType.SEASONING, required: false },
      { name: '大蒜', type: MaterialType.SEASONING, required: false },
    ],
  },
  {
    name: '番茄牛肉煲',
    materials: [
      { name: '牛肉', type: MaterialType.MAIN, required: true },
      { name: '番茄', type: MaterialType.MAIN, required: true },
      { name: '洋葱', type: MaterialType.SIDE, required: true },
      { name: '盐', type: MaterialType.SEASONING, required: true },
      { name: '黑胡椒', type: MaterialType.SPICE, required: false },
    ],
  },
  {
    name: '宫保鸡丁',
    materials: [
      { name: '鸡肉', type: MaterialType.MAIN, required: true },
      { name: '花生', type: MaterialType.SIDE, required: false },
      { name: '干辣椒', type: MaterialType.SPICE, required: true },
      { name: '花椒', type: MaterialType.SPICE, required: false },
      { name: '生抽', type: MaterialType.SEASONING, required: true },
      { name: '糖', type: MaterialType.SEASONING, required: true },
      { name: '醋', type: MaterialType.SEASONING, required: true },
    ],
  },
  {
    name: '番茄炒蛋',
    materials: [
      { name: '番茄', type: MaterialType.MAIN, required: true },
      { name: '鸡蛋', type: MaterialType.MAIN, required: true },
      { name: '盐', type: MaterialType.SEASONING, required: true },
      { name: '糖', type: MaterialType.SEASONING, required: false },
    ],
  },
  {
    name: '鱼香肉丝',
    materials: [
      { name: '猪肉', type: MaterialType.MAIN, required: true },
      { name: '胡萝卜', type: MaterialType.SIDE, required: false },
      { name: '木耳', type: MaterialType.SIDE, required: false },
      { name: '豆瓣酱', type: MaterialType.SEASONING, required: true },
      { name: '生抽', type: MaterialType.SEASONING, required: true },
      { name: '糖', type: MaterialType.SEASONING, required: true },
      { name: '醋', type: MaterialType.SEASONING, required: true },
    ],
  },
  {
    name: '麻婆豆腐',
    materials: [
      { name: '豆腐', type: MaterialType.MAIN, required: true },
      { name: '猪肉', type: MaterialType.MAIN, required: false },
      { name: '豆瓣酱', type: MaterialType.SEASONING, required: true },
      { name: '花椒', type: MaterialType.SPICE, required: true },
      { name: '生抽', type: MaterialType.SEASONING, required: true },
    ],
  },
  {
    name: '蒜蓉菠菜',
    materials: [
      { name: '菠菜', type: MaterialType.MAIN, required: true },
      { name: '大蒜', type: MaterialType.SEASONING, required: true },
      { name: '盐', type: MaterialType.SEASONING, required: true },
    ],
  },
  {
    name: '醋溜白菜',
    materials: [
      { name: '白菜', type: MaterialType.MAIN, required: true },
      { name: '醋', type: MaterialType.SEASONING, required: true },
      { name: '干辣椒', type: MaterialType.SPICE, required: false },
      { name: '盐', type: MaterialType.SEASONING, required: true },
    ],
  },
  {
    name: '红烧排骨',
    materials: [
      { name: '排骨', type: MaterialType.MAIN, required: true },
      { name: '生姜', type: MaterialType.SEASONING, required: true },
      { name: '大葱', type: MaterialType.SEASONING, required: false },
      { name: '生抽', type: MaterialType.SEASONING, required: true },
      { name: '老抽', type: MaterialType.SEASONING, required: true },
      { name: '料酒', type: MaterialType.SEASONING, required: true },
      { name: '糖', type: MaterialType.SEASONING, required: true },
    ],
  },
  {
    name: '青椒土豆丝',
    materials: [
      { name: '土豆', type: MaterialType.MAIN, required: true },
      { name: '青椒', type: MaterialType.SIDE, required: true },
      { name: '醋', type: MaterialType.SEASONING, required: false },
      { name: '盐', type: MaterialType.SEASONING, required: true },
    ],
  },
  {
    name: '虾仁炒蛋',
    materials: [
      { name: '虾', type: MaterialType.MAIN, required: true },
      { name: '鸡蛋', type: MaterialType.MAIN, required: true },
      { name: '盐', type: MaterialType.SEASONING, required: true },
      { name: '料酒', type: MaterialType.SEASONING, required: false },
    ],
  },
  {
    name: '西蓝花炒牛肉',
    materials: [
      { name: '牛肉', type: MaterialType.MAIN, required: true },
      { name: '西蓝花', type: MaterialType.SIDE, required: true },
      { name: '生抽', type: MaterialType.SEASONING, required: true },
      { name: '淀粉', type: MaterialType.SEASONING, required: false },
      { name: '大蒜', type: MaterialType.SEASONING, required: false },
    ],
  },
];

const coreSubstitutes: { from: string; to: string; score: number }[] = [
  { from: '胡椒粉', to: '白胡椒', score: 95 },
  { from: '胡椒粉', to: '黑胡椒', score: 80 },
  { from: '胡椒粉', to: '花椒', score: 60 },
  { from: '胡椒粉', to: '藤椒', score: 55 },
  { from: '黑胡椒', to: '白胡椒', score: 90 },
  { from: '白胡椒', to: '黑胡椒', score: 85 },
  { from: '花椒', to: '藤椒', score: 88 },
  { from: '藤椒', to: '花椒', score: 88 },
  { from: '干辣椒', to: '辣椒', score: 85 },
  { from: '辣椒', to: '干辣椒', score: 80 },
  { from: '生抽', to: '盐', score: 40 },
  { from: '老抽', to: '生抽', score: 55 },
  { from: '料酒', to: '醋', score: 30 },
  { from: '豆瓣酱', to: '辣椒', score: 45 },
  { from: '番茄酱', to: '番茄', score: 50 },
  { from: '猪肉', to: '鸡肉', score: 55 },
  { from: '鸡肉', to: '猪肉', score: 50 },
  { from: '牛肉', to: '猪肉', score: 45 },
  { from: '菠菜', to: '白菜', score: 40 },
  { from: '白菜', to: '菠菜', score: 40 },
];

const baseNames = [
  '韭菜', '豆芽', '莲藕', '山药', '南瓜', '丝瓜', '苦瓜', '生菜', '油麦菜', '空心菜',
  '豆角', '四季豆', '荷兰豆', '莴笋', '萝卜', '白萝卜', '青萝卜', '茭白', '芋头', '山芋',
  '鸡翅', '鸡腿', '鸭肉', '羊肉', '五花肉', '里脊', '牛腩', '牛腱', '鲈鱼', '带鱼',
  '黄鱼', '鲫鱼', '蟹', '鱿鱼', '蛤蜊', '海带', '紫菜', '银耳', '香菇', '金针菇',
  '杏鲍菇', '平菇', '草菇', '腐竹', '千张', '豆皮', '豆浆皮', '年糕', '粽子叶', '春卷皮',
];

const cookMethods = ['炒', '爆', '炖', '烧', '蒸', '煮', '焖', '烤', '凉拌', '煲'];
const seasoningsPool = ['盐', '生抽', '老抽', '糖', '醋', '料酒', '大蒜', '生姜', '胡椒粉', '花椒'];

function buildIngredientCatalog(): SeedIngredient[] {
  const map = new Map<string, SeedIngredient>();
  for (const item of coreIngredients) map.set(item.name, item);

  let i = 0;
  while (map.size < TARGET_INGREDIENTS) {
    const base = baseNames[i % baseNames.length];
    const batch = Math.floor(i / baseNames.length);
    const name = batch === 0 ? base : `${base}${batch + 1}号`;
    if (!map.has(name)) {
      const category =
        i % 5 === 0
          ? IngredientCategory.SPICE
          : i % 4 === 0
            ? IngredientCategory.SEASONING
            : i % 3 === 0
              ? IngredientCategory.SIDE
              : IngredientCategory.MAIN;
      map.set(name, { name, category });
    }
    i += 1;
    if (i > TARGET_INGREDIENTS * 5) break;
  }
  return [...map.values()];
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

async function seedCoreOnly() {
  console.log('Seed mode: MINIMAL (core only)');
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

  for (const recipe of coreRecipes) {
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
            confidence: 1,
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

  const catalog = buildIngredientCatalog();
  console.log(`Upserting ${catalog.length} ingredients...`);
  const ingredientMap = new Map<string, string>();

  await chunkedCreateMany('ingredients', catalog, 100, async (batch) => {
    await prisma.ingredient.createMany({
      data: batch.map((item) => ({
        name: item.name,
        category: item.category,
        taste: item.taste ?? null,
      })),
      skipDuplicates: true,
    });
  });

  const allIngredients = await prisma.ingredient.findMany({
    select: { id: true, name: true, category: true },
  });
  for (const row of allIngredients) ingredientMap.set(row.name, row.id);

  // Ensure core still updated
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

  console.log('Seeding core recipes...');
  for (const recipe of coreRecipes) {
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
            confidence: 1,
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

  const mains = allIngredients.filter((i) => i.category === IngredientCategory.MAIN);
  const sides = allIngredients.filter((i) => i.category === IngredientCategory.SIDE);

  console.log('Clearing previously generated bulk recipes...');
  await prisma.recipeMaterial.deleteMany({
    where: { recipe: { name: { contains: '·' } } },
  });
  await prisma.recipe.deleteMany({ where: { name: { contains: '·' } } });

  const currentRecipes = await prisma.recipe.count();
  const generatedNeeded = Math.max(0, TARGET_RECIPES - currentRecipes);
  console.log(`Generating ${generatedNeeded} bulk recipes...`);

  const recipeRows: { name: string; source: RecipeSource; status: RecipeStatus; confidence: number }[] = [];
  for (let i = 0; i < generatedNeeded; i++) {
    const main = mains[i % Math.max(mains.length, 1)] ?? allIngredients[i % allIngredients.length];
    const side = sides[(i * 3) % Math.max(sides.length, 1)] ?? allIngredients[(i + 1) % allIngredients.length];
    const method = cookMethods[i % cookMethods.length];
    recipeRows.push({
      name: `${main.name}${side?.name ?? ''}${method}·${i + 1}`,
      source: RecipeSource.MANUAL,
      status: RecipeStatus.PUBLISHED,
      confidence: 0.7,
    });
  }

  await chunkedCreateMany('recipes', recipeRows, 200, async (batch) => {
    await prisma.recipe.createMany({ data: batch, skipDuplicates: true });
  });

  const generatedRecipes = await prisma.recipe.findMany({
    where: { name: { contains: '·' } },
    select: { id: true, name: true },
    take: generatedNeeded + 100,
  });

  console.log(`Linking materials for ${generatedRecipes.length} generated recipes...`);
  const materialRows: {
    recipeId: string;
    ingredientId: string;
    type: MaterialType;
    required: boolean;
  }[] = [];

  for (let i = 0; i < generatedRecipes.length; i++) {
    const recipe = generatedRecipes[i];
    const main = mains[i % Math.max(mains.length, 1)] ?? allIngredients[0];
    const side = sides[(i * 3) % Math.max(sides.length, 1)];
    const seasoningName = seasoningsPool[i % seasoningsPool.length];
    const seasoningId = ingredientMap.get(seasoningName);

    materialRows.push({
      recipeId: recipe.id,
      ingredientId: main.id,
      type: MaterialType.MAIN,
      required: true,
    });
    if (side) {
      materialRows.push({
        recipeId: recipe.id,
        ingredientId: side.id,
        type: MaterialType.SIDE,
        required: true,
      });
    }
    if (seasoningId) {
      materialRows.push({
        recipeId: recipe.id,
        ingredientId: seasoningId,
        type: MaterialType.SEASONING,
        required: i % 2 === 0,
      });
    }
  }

  await chunkedCreateMany('materials', materialRows, 500, async (batch) => {
    await prisma.recipeMaterial.createMany({ data: batch, skipDuplicates: true });
  });

  console.log('Seeding substitutes...');
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

  const existingSubs = await prisma.ingredientSubstitute.count();
  const subNeeded = Math.max(0, TARGET_SUBSTITUTES - existingSubs);
  const subRows: {
    ingredientId: string;
    substituteId: string;
    score: number;
    source: KnowledgeSource;
  }[] = [];

  outer: for (let i = 0; i < allIngredients.length; i++) {
    for (let offset = 1; offset < allIngredients.length; offset++) {
      if (subRows.length >= subNeeded) break outer;
      const a = allIngredients[i];
      const b = allIngredients[(i + offset) % allIngredients.length];
      if (!a || !b || a.id === b.id) continue;
      subRows.push({
        ingredientId: a.id,
        substituteId: b.id,
        score: 30 + ((i + offset) % 70),
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
