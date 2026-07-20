import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppError, ErrorCodes } from '../common/errors';

@Injectable()
export class RecipeFavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const rows = await this.prisma.recipeFavorite.findMany({
      where: { userId },
      include: { recipe: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((row) => ({
      recipeId: row.recipeId,
      recipe: row.recipe.name,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async add(userId: string, recipeId: string) {
    const recipe = await this.prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) {
      throw new AppError(ErrorCodes.INVALID_PARAM, 'Recipe not found', 404);
    }
    await this.prisma.recipeFavorite.upsert({
      where: { userId_recipeId: { userId, recipeId } },
      create: { userId, recipeId },
      update: {},
    });
    return { recipeId, recipe: recipe.name, favorited: true };
  }

  async remove(userId: string, recipeId: string) {
    await this.prisma.recipeFavorite.deleteMany({ where: { userId, recipeId } });
    return { recipeId, favorited: false };
  }
}
