export const ALLOWED_INGREDIENT_TYPES = [
  '主料',
  '辅料',
  '调料',
  '香料',
  '饮品',
] as const;

export type AllowedIngredientType = (typeof ALLOWED_INGREDIENT_TYPES)[number];

export const RECIPE_JSON_SCHEMA_HINT = `{
  "recipes": [{
    "name": string,
    "ingredients": [{ "name": string, "amount": string, "type": "主料"|"辅料"|"调料"|"香料"|"饮品", "required": boolean }],
    "steps": string[],
    "substitutes": [{ "from": string, "to": [{ "name": string, "score": number }] }],
    "confidence": number
  }]
}`;

export function buildRecipeSystemPrompt(): string {
  return [
    'You are a structured culinary knowledge extractor.',
    'Return ONLY a single JSON object. No markdown. No prose outside JSON.',
    `Schema: ${RECIPE_JSON_SCHEMA_HINT}`,
    'confidence must be between 0 and 1.',
    'Do not invent that the user already has ingredients they did not list; missing seasonings may appear in ingredients with required=true.',
    `Each ingredient.type MUST be exactly one of: ${ALLOWED_INGREDIENT_TYPES.map((t) => `"${t}"`).join('|')}. Never use "其他", "other", or any other type label.`,
    'Prefer canonical Chinese ingredient names (e.g. 番茄 not 西红柿, 西蓝花 not 西兰花, 生姜 not 姜, 大葱 not 葱).',
  ].join('\n');
}

export function buildRecipeUserPrompt(
  ingredients: string[],
  recipeCount = 1,
): string {
  const list = ingredients.join(', ');
  const n = Math.min(5, Math.max(1, recipeCount));
  return [
    `Available ingredients (normalized): ${list}`,
    `Task: propose ${n} distinct cookable recipes as JSON matching the schema (recipes array).`,
    'Each recipe must include ingredient amounts (e.g. "200g", "2个", "适量") and at least 3 steps.',
    `ingredient.type must be one of: ${ALLOWED_INGREDIENT_TYPES.join(' / ')}.`,
    'Sort recipes by confidence descending.',
  ].join('\n');
}
