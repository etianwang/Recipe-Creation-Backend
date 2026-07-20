/**
 * 人工整理的食材替代关系（上线必备）。
 * 方向：from 缺货时可用 to 替代；score 越高越合适。
 */
export type CoreSubstitute = { from: string; to: string; score: number };

const pairs: CoreSubstitute[] = [
  // —— 盐 / 基础调味 ——
  { from: '盐', to: '生抽', score: 38 },
  { from: '盐', to: '豆瓣酱', score: 32 },
  { from: '盐', to: '老抽', score: 26 },
  { from: '盐', to: '料酒', score: 18 },
  { from: '糖', to: '番茄酱', score: 42 },
  { from: '糖', to: '醋', score: 22 },
  { from: '糖', to: '生抽', score: 20 },
  { from: '生抽', to: '盐', score: 40 },
  { from: '生抽', to: '老抽', score: 55 },
  { from: '生抽', to: '豆瓣酱', score: 50 },
  { from: '生抽', to: '料酒', score: 35 },
  { from: '生抽', to: '醋', score: 28 },
  { from: '老抽', to: '生抽', score: 55 },
  { from: '老抽', to: '豆瓣酱', score: 45 },
  { from: '老抽', to: '盐', score: 30 },
  { from: '料酒', to: '醋', score: 30 },
  { from: '料酒', to: '生抽', score: 32 },
  { from: '料酒', to: '生姜', score: 28 },
  { from: '醋', to: '料酒', score: 30 },
  { from: '醋', to: '番茄酱', score: 28 },
  { from: '醋', to: '生抽', score: 25 },
  { from: '醋', to: '糖', score: 22 },
  { from: '食用油', to: '豆瓣酱', score: 25 },
  { from: '淀粉', to: '生抽', score: 15 },
  { from: '豆瓣酱', to: '辣椒', score: 45 },
  { from: '豆瓣酱', to: '干辣椒', score: 42 },
  { from: '豆瓣酱', to: '生抽', score: 48 },
  { from: '豆瓣酱', to: '盐', score: 30 },
  { from: '番茄酱', to: '番茄', score: 50 },
  { from: '番茄酱', to: '糖', score: 40 },
  { from: '番茄酱', to: '醋', score: 28 },
  { from: '大蒜', to: '大葱', score: 45 },
  { from: '大蒜', to: '生姜', score: 40 },
  { from: '大蒜', to: '洋葱', score: 35 },
  { from: '生姜', to: '大蒜', score: 40 },
  { from: '生姜', to: '大葱', score: 42 },
  { from: '生姜', to: '料酒', score: 30 },
  { from: '大葱', to: '洋葱', score: 50 },
  { from: '大葱', to: '大蒜', score: 45 },
  { from: '大葱', to: '生姜', score: 38 },

  // —— 香料 ——
  { from: '胡椒粉', to: '白胡椒', score: 95 },
  { from: '胡椒粉', to: '黑胡椒', score: 80 },
  { from: '胡椒粉', to: '花椒', score: 60 },
  { from: '胡椒粉', to: '藤椒', score: 55 },
  { from: '黑胡椒', to: '白胡椒', score: 90 },
  { from: '白胡椒', to: '黑胡椒', score: 85 },
  { from: '花椒', to: '藤椒', score: 88 },
  { from: '藤椒', to: '花椒', score: 88 },
  { from: '花椒', to: '干辣椒', score: 55 },
  { from: '干辣椒', to: '辣椒', score: 85 },
  { from: '辣椒', to: '干辣椒', score: 80 },
  { from: '辣椒', to: '豆瓣酱', score: 50 },
  { from: '八角', to: '桂皮', score: 55 },
  { from: '八角', to: '香叶', score: 50 },
  { from: '桂皮', to: '八角', score: 55 },
  { from: '桂皮', to: '香叶', score: 48 },
  { from: '香叶', to: '八角', score: 50 },
  { from: '孜然', to: '胡椒粉', score: 45 },
  { from: '孜然', to: '花椒', score: 40 },

  // —— 肉类 / 蛋白 ——
  { from: '猪肉', to: '鸡肉', score: 55 },
  { from: '猪肉', to: '牛肉', score: 45 },
  { from: '猪肉', to: '排骨', score: 50 },
  { from: '鸡肉', to: '猪肉', score: 50 },
  { from: '鸡肉', to: '虾', score: 42 },
  { from: '鸡肉', to: '鸡蛋', score: 35 },
  { from: '牛肉', to: '猪肉', score: 45 },
  { from: '牛肉', to: '鸡肉', score: 40 },
  { from: '排骨', to: '猪肉', score: 55 },
  { from: '排骨', to: '鸡肉', score: 40 },
  { from: '虾', to: '鱼', score: 45 },
  { from: '虾', to: '鸡肉', score: 40 },
  { from: '虾', to: '鸡蛋', score: 30 },
  { from: '鱼', to: '虾', score: 45 },
  { from: '鱼', to: '鸡肉', score: 38 },
  { from: '鸡蛋', to: '豆腐', score: 45 },
  { from: '鸡蛋', to: '虾', score: 35 },
  { from: '豆腐', to: '鸡蛋', score: 40 },
  { from: '豆腐', to: '蘑菇', score: 35 },

  // —— 蔬菜 ——
  { from: '土豆', to: '红薯', score: 55 },
  { from: '土豆', to: '胡萝卜', score: 40 },
  { from: '红薯', to: '土豆', score: 55 },
  { from: '番茄', to: '番茄酱', score: 48 },
  { from: '番茄', to: '青椒', score: 35 },
  { from: '青椒', to: '辣椒', score: 50 },
  { from: '青椒', to: '芹菜', score: 42 },
  { from: '洋葱', to: '大葱', score: 50 },
  { from: '洋葱', to: '大蒜', score: 35 },
  { from: '白菜', to: '菠菜', score: 40 },
  { from: '菠菜', to: '白菜', score: 40 },
  { from: '菠菜', to: '西蓝花', score: 35 },
  { from: '白菜', to: '冬瓜', score: 38 },
  { from: '胡萝卜', to: '芹菜', score: 42 },
  { from: '胡萝卜', to: '青椒', score: 38 },
  { from: '芹菜', to: '胡萝卜', score: 42 },
  { from: '芹菜', to: '大葱', score: 40 },
  { from: '黄瓜', to: '冬瓜', score: 45 },
  { from: '黄瓜', to: '西蓝花', score: 35 },
  { from: '冬瓜', to: '黄瓜', score: 45 },
  { from: '茄子', to: '蘑菇', score: 40 },
  { from: '茄子', to: '豆腐', score: 38 },
  { from: '蘑菇', to: '木耳', score: 50 },
  { from: '蘑菇', to: '豆腐', score: 42 },
  { from: '木耳', to: '蘑菇', score: 50 },
  { from: '木耳', to: '粉丝', score: 35 },
  { from: '西蓝花', to: '菠菜', score: 38 },
  { from: '西蓝花', to: '青椒', score: 36 },
  { from: '玉米', to: '胡萝卜', score: 35 },
  { from: '花生', to: '豆腐', score: 30 },

  // —— 主食 ——
  { from: '米饭', to: '面条', score: 55 },
  { from: '面条', to: '米饭', score: 55 },
  { from: '面条', to: '粉丝', score: 45 },
  { from: '粉丝', to: '面条', score: 45 },

  // —— 饮品（弱替代） ——
  { from: '牛奶', to: '豆浆', score: 50 },
  { from: '豆浆', to: '牛奶', score: 50 },
];

/** 去掉引用不存在的食材名、score<=0 的边 */
export function buildCoreSubstitutes(validNames: ReadonlySet<string>): CoreSubstitute[] {
  const seen = new Set<string>();
  const out: CoreSubstitute[] = [];
  for (const p of pairs) {
    if (p.score <= 0) continue;
    if (!validNames.has(p.from) || !validNames.has(p.to)) continue;
    if (p.from === p.to) continue;
    const key = `${p.from}\0${p.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}
