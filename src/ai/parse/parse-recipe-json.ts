import { ALLOWED_INGREDIENT_TYPES } from '../prompt/recipe-prompt';
import { canonicalizeIngredientName } from '../../ingredients/ingredient-resolve';

export type ParsedIngredient = {
  name: string;
  type: string;
  required: boolean;
  amount?: string;
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

const ALLOWED_TYPE_SET = new Set<string>(ALLOWED_INGREDIENT_TYPES);

/** 名称末尾粘连的用量，如 八角1颗 / 桂皮1小段 / 生抽2勺 */
const TRAILING_AMOUNT_RE =
  /^(.+?)(\d+(?:\.\d+)?\s*(?:g|kg|ml|l|克|千克|毫升|升)?(?:颗|粒|个|只|片|根|段|小段|大段|条|块|勺|茶匙|汤匙|杯)?|适量|少许|若干)$/u;

/** 将「八角1颗」拆成 name + amount */
export function peelIngredientNameAndAmount(
  rawName: string,
  givenAmount?: string,
): { name: string; amount: string } {
  const trimmed = rawName.trim();
  const given = givenAmount?.trim();
  if (!trimmed) {
    return { name: '', amount: given || '适量' };
  }

  const m = trimmed.match(TRAILING_AMOUNT_RE);
  if (m?.[1] && m[2] && !/[+＋]/.test(m[1])) {
    const namePart = m[1].trim();
    const amountFromName = m[2].trim();
    if (namePart.length >= 1) {
      return {
        name: namePart,
        amount:
          given && given !== '适量' && given !== amountFromName
            ? given
            : amountFromName,
      };
    }
  }

  return { name: trimmed, amount: given || '适量' };
}

/**
 * 拆开「八角1颗+桂皮1小段」这类错误合并；用量归入 amount，name 只保留单一食材名。
 */
export function expandIngredientRow(item: {
  name: string;
  type: string;
  required: boolean;
  amount?: string;
}): ParsedIngredient[] {
  const type = item.type;
  const required = item.required;
  const chunks = item.name
    .split(/\s*[+＋]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const parts = chunks.length > 1 ? chunks : [item.name.trim()];

  return parts
    .map((part) => {
      const peeled = peelIngredientNameAndAmount(
        part,
        parts.length === 1 ? item.amount : undefined,
      );
      const name = canonicalizeIngredientName(peeled.name);
      if (!name) return null;
      return {
        name,
        type,
        required,
        amount: peeled.amount || '适量',
      };
    })
    .filter((row): row is ParsedIngredient => row !== null);
}

/** 将 AI 输出的 type 收敛到允许的分类；非法值回落为「辅料」 */
export function normalizeIngredientType(raw: string): string {
  const t = raw.trim();
  if (!t) return '主料';
  if (t === '调味料') return '调料';
  if (ALLOWED_TYPE_SET.has(t)) return t;
  if (/^other$/i.test(t) || t === '其他' || t === '其它') return '辅料';
  return '辅料';
}

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

export function parseRecipeObject(data: unknown): ParsedRecipe {
  if (!data || typeof data !== 'object') {
    throw new Error('INVALID_SHAPE');
  }

  const obj = data as Record<string, unknown>;
  const name = asString(obj.name);
  if (!name) throw new Error('MISSING_NAME');

  const ingredientsRaw = Array.isArray(obj.ingredients) ? obj.ingredients : [];
  if (ingredientsRaw.length === 0) throw new Error('EMPTY_INGREDIENTS');

  const ingredients: ParsedIngredient[] = ingredientsRaw.flatMap((item) => {
    if (typeof item === 'string') {
      return expandIngredientRow({
        name: item,
        type: '主料',
        required: true,
        amount: '适量',
      });
    }
    const row = item as Record<string, unknown>;
    const n = asString(row.name);
    if (!n) throw new Error('INVALID_INGREDIENT');
    const amountRaw = asString(row.amount);
    return expandIngredientRow({
      name: n,
      type: normalizeIngredientType(asString(row.type, '主料') || '主料'),
      required: row.required === undefined ? true : Boolean(row.required),
      amount: amountRaw || '适量',
    });
  });
  if (ingredients.length === 0) throw new Error('EMPTY_INGREDIENTS');

  const steps = Array.isArray(obj.steps)
    ? obj.steps.map((s) => asString(s)).filter(Boolean)
    : [];

  const substitutesRaw = Array.isArray(obj.substitutes) ? obj.substitutes : [];
  const substitutes: ParsedSubstitute[] = substitutesRaw
    .map((item) => {
      const row = item as Record<string, unknown>;
      const from = canonicalizeIngredientName(asString(row.from));
      const toRaw = Array.isArray(row.to) ? row.to : [];
      const to = toRaw
        .map((t) => {
          if (typeof t === 'string')
            return { name: canonicalizeIngredientName(t), score: 50 };
          const tr = t as Record<string, unknown>;
          return {
            name: canonicalizeIngredientName(asString(tr.name)),
            score: Number(tr.score ?? 50),
          };
        })
        .filter((t) => t.name);
      return { from, to };
    })
    .filter((s) => s.from && s.to.length);

  let confidence = Number(obj.confidence);
  if (Number.isNaN(confidence)) confidence = 0.5;
  if (confidence > 1) confidence = confidence / 100;
  confidence = Math.min(1, Math.max(0, confidence));

  return { name, ingredients, steps, substitutes, confidence };
}

export function parseRecipePayload(raw: string | unknown): ParsedRecipe[] {
  let data: unknown;
  if (typeof raw === 'string') {
    try {
      data = extractJsonObject(raw);
    } catch {
      throw new Error('INVALID_JSON');
    }
  } else {
    data = raw;
  }

  if (!data || typeof data !== 'object') {
    throw new Error('INVALID_SHAPE');
  }

  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.recipes)) {
    return obj.recipes.map((row) => parseRecipeObject(row));
  }
  return [parseRecipeObject(obj)];
}

export function parseRecipeJson(raw: string): ParsedRecipe {
  return parseRecipePayload(raw)[0];
}
