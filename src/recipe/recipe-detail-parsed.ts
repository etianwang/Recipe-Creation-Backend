import type { ParsedRecipe } from '../ai/parse/parse-recipe-json';
import type { RecipeIngredientLine } from './recipe-detail';

export function buildDetailFromParsed(recipe: ParsedRecipe): {
  ingredients: RecipeIngredientLine[];
  steps: string[];
} {
  return {
    ingredients: recipe.ingredients.map((i) => ({
      name: i.name,
      type: i.type || '主料',
      amount: i.amount ?? '适量',
      required: i.required !== false,
    })),
    steps: recipe.steps.length
      ? recipe.steps
      : ['准备食材', '按家常做法烹炒', '调味装盘'],
  };
}
