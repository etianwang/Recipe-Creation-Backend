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

/** 括号内若是用量（少许/适量/1勺…），从 name 剥离；否则整段括号作备注删除 */
const PAREN_CHUNK_RE = /[（(]([^）)]+)[）)]/g;
const AMOUNT_LIKE_RE =
  /^(少许|适量|若干|一点|一些|(?:\d+\s*\/\s*\d+|\d+(?:\.\d+)?)\s*(?:g|kg|ml|l|克|千克|毫升|升|颗|粒|个|只|片|根|段|小段|大段|条|块|勺|茶匙|汤匙|杯)?)$/u;

/** 去掉名称里的做法备注：糙米（需延长浸泡…）→ 糙米；蚝油（少许）→ 见 peel */
export function stripIngredientNameNotes(raw: string): string {
  return raw
    .replace(/（[^）]*）/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 名称末尾粘连用量：八角1颗 / 肉桂粉1/4茶匙 / 生抽2勺 */
const TRAILING_AMOUNT_RE =
  /^(.+?)((?:\d+\s*\/\s*\d+|\d+(?:\.\d+)?)\s*(?:g|kg|ml|l|克|千克|毫升|升)?(?:颗|粒|个|只|片|根|段|小段|大段|条|块|勺|茶匙|汤匙|杯)?|适量|少许|若干)$/u;

/** 名称前缀用量：少许蚝油 */
const LEADING_AMOUNT_RE = /^(少许|适量|若干|一点|一些)\s*(.+)$/u;

function extractParenAmounts(raw: string): { text: string; amountFromParen?: string } {
  let amountFromParen: string | undefined;
  const text = raw
    .replace(PAREN_CHUNK_RE, (_full, inner: string) => {
      const tip = String(inner).trim();
      if (AMOUNT_LIKE_RE.test(tip)) {
        amountFromParen = tip.replace(/\s+/g, '');
        return ' ';
      }
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
  return { text, amountFromParen };
}

/** 将「八角1颗」「少许蚝油」「蚝油（少许）」拆成纯食材名 + amount */
export function peelIngredientNameAndAmount(
  rawName: string,
  givenAmount?: string,
): { name: string; amount: string } {
  const given = givenAmount?.trim();
  const { text: withoutParen, amountFromParen } = extractParenAmounts(rawName);
  let trimmed = withoutParen || stripIngredientNameNotes(rawName);
  if (!trimmed) {
    return { name: '', amount: given || amountFromParen || '适量' };
  }

  const preferAmount = (fromName: string) => {
    if (given && given !== '适量' && given !== fromName) return given;
    return fromName;
  };

  const leading = trimmed.match(LEADING_AMOUNT_RE);
  if (leading?.[1] && leading[2]) {
    const rest = leading[2].trim();
    const further = peelIngredientNameAndAmount(
      rest,
      preferAmount(amountFromParen || leading[1]),
    );
    return {
      name: further.name,
      amount: further.amount || preferAmount(amountFromParen || leading[1]),
    };
  }

  const m = trimmed.match(TRAILING_AMOUNT_RE);
  if (m?.[1] && m[2] && !/[+＋]/.test(m[1])) {
    const namePart = m[1].trim();
    const amountFromName = m[2].replace(/\s+/g, '').trim();
    if (namePart.length >= 1) {
      return {
        name: namePart,
        amount: preferAmount(amountFromName || amountFromParen || '适量'),
      };
    }
  }

  return {
    name: trimmed,
    amount: preferAmount(amountFromParen || given || '适量'),
  };
}

/** 入库/展示用的干净食材名（不含用量、备注） */
export function sanitizeIngredientName(raw: string): string {
  const peeled = peelIngredientNameAndAmount(raw);
  return canonicalizeIngredientName(peeled.name);
}

/**
 * 拆开「八角1颗+桂皮1小段」「生抽+糖+少许蚝油」；用量归入 amount；去掉括号备注。
 */
export function expandIngredientRow(item: {
  name: string;
  type: string;
  required: boolean;
  amount?: string;
}): ParsedIngredient[] {
  const type = item.type;
  const required = item.required;
  // 先按 + 拆，再在每段 peel（含括号用量）；不要先全局剥括号以免丢掉「少许」
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
