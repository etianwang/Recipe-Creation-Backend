export const RECIPE_JSON_SCHEMA_HINT = `{
  "recipes": [{
    "name": string,
    "ingredients": [{ "name": string, "amount": string, "type": "主料"|"辅料"|"调料"|"香料"|"其他", "required": boolean }],
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
    'Sort recipes by confidence descending.',
  ].join('\n');
}
