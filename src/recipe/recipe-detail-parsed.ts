import type { ParsedRecipe } from '../ai/parse/parse-recipe-json';
import { peelIngredientNameAndAmount } from '../ai/parse/parse-recipe-json';
import { canonicalizeIngredientName } from '../ingredients/ingredient-resolve';
import type { RecipeIngredientLine } from './recipe-detail';

export function buildDetailFromParsed(recipe: ParsedRecipe): {
  ingredients: RecipeIngredientLine[];
  steps: string[];
} {
  return {
    ingredients: recipe.ingredients.map((i) => {
      const peeled = peelIngredientNameAndAmount(i.name, i.amount);
      return {
        name: canonicalizeIngredientName(peeled.name),
        type: i.type || '主料',
        amount: peeled.amount || i.amount || '适量',
        required: i.required !== false,
      };
    }),
    steps: recipe.steps.length
      ? recipe.steps
      : ['准备食材', '按家常做法烹炒', '调味装盘'],
  };
}
