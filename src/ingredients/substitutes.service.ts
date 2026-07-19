import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppError, ErrorCodes } from '../common/errors';

export type SubstituteView = {
  id: string;
  name: string;
  score: number;
  source: string;
};

@Injectable()
export class SubstitutesService {
  constructor(private readonly prisma: PrismaService) {}

  async listByIngredientId(ingredientId: string): Promise<SubstituteView[]> {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id: ingredientId },
    });
    if (!ingredient) {
      throw new AppError(
        ErrorCodes.NOT_FOUND_INGREDIENT,
        'Ingredient not found',
        404,
      );
    }
    return this.listForIngredient(ingredient.id);
  }

  async listByIngredientName(name: string): Promise<SubstituteView[]> {
    const trimmed = name?.trim();
    if (!trimmed) {
      throw new AppError(
        ErrorCodes.INVALID_PARAM,
        'ingredient name is required',
        400,
      );
    }

    const ingredient = await this.prisma.ingredient.findFirst({
      where: { name: { equals: trimmed } },
    });
    if (!ingredient) {
      throw new AppError(
        ErrorCodes.NOT_FOUND_INGREDIENT,
        `Ingredient not found: ${trimmed}`,
        404,
      );
    }
    return this.listForIngredient(ingredient.id);
  }

  private async listForIngredient(
    ingredientId: string,
  ): Promise<SubstituteView[]> {
    const rows = await this.prisma.ingredientSubstitute.findMany({
      where: { ingredientId },
      include: { substitute: true },
      orderBy: { score: 'desc' },
    });

    return rows.map((row) => ({
      id: row.substitute.id,
      name: row.substitute.name,
      score: row.score,
      source: row.source.toLowerCase(),
    }));
  }
}
