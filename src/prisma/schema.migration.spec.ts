import { PrismaClient } from '@prisma/client';

const EXPECTED_TABLES = [
  'users',
  'ingredients',
  'recipes',
  'recipe_materials',
  'ingredient_substitutes',
  'ai_query_logs',
  'ai_query_cache',
  'ai_generated_recipes',
  'knowledge_review',
];

describe('T-BE-02 database migration', () => {
  const prisma = new PrismaClient();
  let reachable = false;

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      reachable = true;
    } catch {
      reachable = false;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('applies expected public tables when DATABASE_URL is reachable', async () => {
    if (!reachable) {
      console.warn('Skipping: PostgreSQL not reachable (set DATABASE_URL / docker compose up)');
      return;
    }

    const rows = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `;
    const names = rows.map((r) => r.tablename);
    for (const table of EXPECTED_TABLES) {
      expect(names).toContain(table);
    }
  });
});
