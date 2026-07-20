import { Test, TestingModule } from '@nestjs/testing';
import { RecipeFavoritesService } from './recipe-favorites.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RecipeFavoritesService', () => {
  let service: RecipeFavoritesService;
  const prisma = {
    recipe: { findUnique: jest.fn() },
    recipeFavorite: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipeFavoritesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(RecipeFavoritesService);
  });

  it('adds favorite idempotently (TR-FAV-001)', async () => {
    prisma.recipe.findUnique.mockResolvedValue({ id: 'r1', name: '番茄炒蛋' });
    const result = await service.add('u1', 'r1');
    expect(prisma.recipeFavorite.upsert).toHaveBeenCalledWith({
      where: { userId_recipeId: { userId: 'u1', recipeId: 'r1' } },
      create: { userId: 'u1', recipeId: 'r1' },
      update: {},
    });
    expect(result.favorited).toBe(true);
  });

  it('lists only current user favorites (TR-FAV-002)', async () => {
    prisma.recipeFavorite.findMany.mockResolvedValue([
      {
        userId: 'u1',
        recipeId: 'r1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        recipe: { id: 'r1', name: '番茄炒蛋' },
      },
    ]);
    const result = await service.list('u1');
    expect(prisma.recipeFavorite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' } }),
    );
    expect(result[0]).toMatchObject({ recipeId: 'r1', recipe: '番茄炒蛋' });
  });
});
