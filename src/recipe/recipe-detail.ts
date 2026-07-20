import { MaterialType } from '@prisma/client';

export type RecipeIngredientLine = {
  name: string;
  type: string;
  amount: string;
  required: boolean;
};

const MATERIAL_TYPE_ZH: Record<MaterialType, string> = {
  MAIN: '主料',
  SIDE: '辅料',
  SEASONING: '调味料',
  SPICE: '香料',
  OTHER: '其他',
};

const CORE_AMOUNTS: Record<string, Record<string, string>> = {
  番茄炒蛋: { 番茄: '2个', 鸡蛋: '3个', 盐: '适量', 糖: '少许' },
  土豆青椒炒鸡: {
    鸡肉: '300g',
    土豆: '2个',
    青椒: '2个',
    胡椒粉: '少许',
    盐: '适量',
    生抽: '1勺',
    大蒜: '3瓣',
  },
  番茄牛肉煲: {
    牛肉: '400g',
    番茄: '3个',
    洋葱: '半个',
    盐: '适量',
    黑胡椒: '少许',
  },
  宫保鸡丁: {
    鸡肉: '300g',
    花生: '50g',
    干辣椒: '8个',
    花椒: '1小勺',
    生抽: '2勺',
    糖: '1勺',
    醋: '1勺',
  },
  鱼香肉丝: {
    猪肉: '250g',
    胡萝卜: '半根',
    木耳: '50g',
    豆瓣酱: '1勺',
    生抽: '1勺',
    糖: '1勺',
    醋: '1勺',
  },
  麻婆豆腐: {
    豆腐: '1块',
    猪肉: '100g',
    豆瓣酱: '2勺',
    花椒: '适量',
    生抽: '1勺',
  },
  蒜蓉菠菜: { 菠菜: '300g', 大蒜: '5瓣', 盐: '适量' },
  醋溜白菜: { 白菜: '400g', 醋: '2勺', 干辣椒: '3个', 盐: '适量' },
  红烧排骨: {
    排骨: '500g',
    生姜: '4片',
    大葱: '1段',
    生抽: '2勺',
    老抽: '1勺',
    料酒: '2勺',
    糖: '1勺',
  },
  青椒土豆丝: {
    土豆: '2个',
    青椒: '1个',
    醋: '半勺',
    盐: '适量',
  },
  虾仁炒蛋: { 虾: '200g', 鸡蛋: '3个', 盐: '适量', 料酒: '1勺' },
  西蓝花炒牛肉: {
    牛肉: '250g',
    西蓝花: '1棵',
    生抽: '1勺',
    淀粉: '1勺',
    大蒜: '2瓣',
  },
};

const CORE_STEPS: Record<string, string[]> = {
  番茄炒蛋: [
    '番茄洗净切块，鸡蛋打散加少许盐。',
    '热锅凉油，倒入蛋液炒至凝固盛出。',
    '下番茄翻炒出汁，加盐、糖调味。',
    '倒入鸡蛋翻炒均匀即可出锅。',
  ],
  土豆青椒炒鸡: [
    '鸡肉切丁腌制，土豆、青椒切块。',
    '土豆先煎至微黄盛出。',
    '爆香大蒜，下鸡丁炒至变色。',
    '加入土豆、青椒，调入生抽、盐、胡椒粉炒匀。',
  ],
  番茄牛肉煲: [
    '牛肉切块焯水，番茄、洋葱切块。',
    '炒香洋葱，下牛肉、番茄翻炒。',
    '加热水没过食材，小火炖 40 分钟。',
    '加盐、黑胡椒调味收汁即可。',
  ],
  宫保鸡丁: [
    '鸡丁腌制，调碗汁（生抽、糖、醋）。',
    '炒香干辣椒、花椒，下鸡丁快炒。',
    '倒入碗汁，下花生米翻匀出锅。',
  ],
  鱼香肉丝: [
    '猪肉切丝腌制，胡萝卜、木耳切丝。',
    '炒香豆瓣酱，下肉丝滑炒。',
    '加入配菜，调入生抽、糖、醋炒匀。',
  ],
  麻婆豆腐: [
    '豆腐切块焯水，猪肉末炒香。',
    '下豆瓣酱炒出红油，加水烧开。',
    '放入豆腐小火煮 5 分钟，撒花椒粉即可。',
  ],
  蒜蓉菠菜: [
    '菠菜洗净，大蒜切末。',
    '热油爆香蒜末，下菠菜大火快炒。',
    '加盐调味，炒至塌软出锅。',
  ],
  醋溜白菜: [
    '白菜帮叶分开切块，干辣椒切段。',
    '热油爆香辣椒，下白菜帮炒至变软。',
    '加醋、盐，下菜叶快炒出锅。',
  ],
  红烧排骨: [
    '排骨焯水洗净，生姜、大葱备好。',
    '炒糖色，下排骨上色。',
    '加料酒、生抽、老抽、热水，小火炖 45 分钟收汁。',
  ],
  青椒土豆丝: [
    '土豆、青椒切丝，土豆泡水去淀粉。',
    '热油下土豆丝快炒，加青椒。',
    '调入盐、醋炒匀出锅。',
  ],
  虾仁炒蛋: [
    '虾仁去线腌制，鸡蛋打散。',
    '炒蛋至半熟盛出，炒虾仁至变色。',
    '倒入鸡蛋，加盐、料酒炒匀。',
  ],
  西蓝花炒牛肉: [
    '牛肉切片用淀粉、生抽腌制，西蓝花焯水。',
    '热油滑炒牛肉盛出。',
    '爆香大蒜，下西蓝花、牛肉，调入生抽快炒。',
  ],
};

function defaultAmount(name: string, type: MaterialType): string {
  if (/鸡蛋/.test(name)) return '2–3个';
  if (name === '盐') return '适量';
  if (name === '糖') return '少许';
  if (name === '料酒' || name === '醋' || name === '生抽' || name === '老抽')
    return '1勺';
  if (type === MaterialType.MAIN) return '200g';
  if (type === MaterialType.SIDE) return '100g';
  if (type === MaterialType.SPICE) return '少许';
  return '适量';
}

export function buildDbRecipeDetail(
  recipeName: string,
  materials: {
    required: boolean;
    type: MaterialType;
    ingredient: { name: string };
  }[],
): { ingredients: RecipeIngredientLine[]; steps: string[] } {
  const amounts = CORE_AMOUNTS[recipeName] ?? {};
  const ingredients = materials.map((m) => ({
    name: m.ingredient.name,
    type: MATERIAL_TYPE_ZH[m.type] ?? m.type,
    amount: amounts[m.ingredient.name] ?? defaultAmount(m.ingredient.name, m.type),
    required: m.required,
  }));

  const steps =
    CORE_STEPS[recipeName] ??
    [
      `将${ingredients
        .filter((i) => i.required)
        .map((i) => i.name)
        .slice(0, 3)
        .join('、')}等处理干净备用。`,
      '热锅入油，按食材易熟程度依次下锅翻炒或炖煮。',
      '按口味加盐等调味，收汁装盘即可。',
    ];

  return { ingredients, steps };
}
