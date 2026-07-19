export type ParsedIngredient = {
  name: string;
  type: string;
  required: boolean;
};

export type ParsedSubstitute = {
  from: string;
  to: { name: string; score: number }[];
};

export type ParsedRecipe = {
  name: string;
  ingredients: ParsedIngredient[];
  steps: string[];
  substitutes: ParsedSubstitute[];
  confidence: number;
};

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return JSON.parse(trimmed);
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    return JSON.parse(fence[1].trim());
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }
  throw new Error('No JSON object found');
}

export function parseRecipeJson(raw: string): ParsedRecipe {
  let data: unknown;
  try {
    data = extractJsonObject(raw);
  } catch {
    throw new Error('INVALID_JSON');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('INVALID_SHAPE');
  }

  const obj = data as Record<string, unknown>;
  const name = asString(obj.name);
  if (!name) throw new Error('MISSING_NAME');

  const ingredientsRaw = Array.isArray(obj.ingredients) ? obj.ingredients : [];
  if (ingredientsRaw.length === 0) throw new Error('EMPTY_INGREDIENTS');

  const ingredients: ParsedIngredient[] = ingredientsRaw.map((item) => {
    if (typeof item === 'string') {
      return { name: item.trim(), type: '主料', required: true };
    }
    const row = item as Record<string, unknown>;
    const n = asString(row.name);
    if (!n) throw new Error('INVALID_INGREDIENT');
    return {
      name: n,
      type: asString(row.type, '主料') || '主料',
      required: row.required === undefined ? true : Boolean(row.required),
    };
  });

  const steps = Array.isArray(obj.steps)
    ? obj.steps.map((s) => asString(s)).filter(Boolean)
    : [];

  const substitutesRaw = Array.isArray(obj.substitutes) ? obj.substitutes : [];
  const substitutes: ParsedSubstitute[] = substitutesRaw.map((item) => {
    const row = item as Record<string, unknown>;
    const from = asString(row.from);
    const toRaw = Array.isArray(row.to) ? row.to : [];
    const to = toRaw
      .map((t) => {
        if (typeof t === 'string') return { name: t.trim(), score: 50 };
        const tr = t as Record<string, unknown>;
        return {
          name: asString(tr.name),
          score: Number(tr.score ?? 50),
        };
      })
      .filter((t) => t.name);
    return { from, to };
  }).filter((s) => s.from && s.to.length);

  let confidence = Number(obj.confidence);
  if (Number.isNaN(confidence)) confidence = 0.5;
  if (confidence > 1) confidence = confidence / 100;
  confidence = Math.min(1, Math.max(0, confidence));

  return { name, ingredients, steps, substitutes, confidence };
}
