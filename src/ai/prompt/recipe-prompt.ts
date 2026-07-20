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
    'Prefer canonical Chinese ingredient names (e.g. 番茄 not 西红柿, 奶油奶酪 not cream cheese, 马斯卡彭 not mascarpone). Do not use English ingredient names when a common Chinese name exists.',
    'ingredient.name MUST be exactly one ingredient — never join multiple with +/＋/和. Put quantities only in amount. Never put cooking tips or amounts in name parentheses. Wrong: 「八角1颗+桂皮1小段」, 「糙米（需延长浸泡和煮制时间）」, 「肉桂粉1/4茶匙」, 「生抽+糖+少许蚝油」, 「蚝油（少许）」. Right: name「蚝油」 with amount「少许」.',
    'Set required=true only for core 主料 that define the dish; 辅料/调料/香料/饮品 should use required=false so match score reflects real coverage.',
    'For each recipe, include substitutes for any ingredients the user may lack (from → alternative list with score).',
    'Prefer common home-cookable dishes: Chinese, Western, Japanese, Korean, Southeast Asian, Middle Eastern, and other everyday cuisines are all welcome. Across the batch, mix cuisines when the pantry fits — do NOT force Chinese-only.',
    'CRITICAL: Only recommend real, well-known existing dishes (classic home recipes people actually cook and recognize by name). Do NOT invent novel/fusion dishes just to use the listed ingredients. Do NOT mash unrelated ingredients into one plate (e.g. never invent names like 「香料蒸蟹配千张午餐肉饼」). If some user ingredients do not fit a real dish, leave them unused — matching pantry is secondary to dish authenticity.',
    'Every recipe ingredient list must include clear type labels and realistic amounts.',
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
    'One ingredient per list entry; Chinese names only; never name like 「八角1颗+桂皮1小段」 or 「糙米（需延长…）」.',
    `ingredient.type must be one of: ${ALLOWED_INGREDIENT_TYPES.join(' / ')}.`,
    'Include home classics from any cuisine that fit these ingredients (not Chinese-only).',
    'Only real existing dish names; do not invent weird mash-up recipes to use every ingredient.',
    'Sort recipes by confidence descending.',
  ].join('\n');
}
