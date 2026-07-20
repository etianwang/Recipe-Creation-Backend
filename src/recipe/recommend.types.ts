import type { RecipeIngredientLine } from './recipe-detail';

export const RECOMMEND_TOP_N = 5;
/** 库内命中计入「足够」的最低匹配分（不含等于） */
export const RECOMMEND_DB_QUALIFY_SCORE = 30;
/** 扫描库内候选上限，用于统计 score>30% 的数量 */
export const RECOMMEND_DB_SCAN_LIMIT = 20;

export type RecommendItem = {
  recipeId: string | null;
  recipe: string;
  score: number;
  missing: string[];
  source: 'database' | 'cache' | 'ai';
  /** 前端展示：AI 来源为 true */
  isAiSuggestion: boolean;
  sourceLabel: string;
  ingredients: RecipeIngredientLine[];
  steps: string[];
};

export type RecommendResponse = {
  queryHash: string;
  normalizedIngredients: string[];
  items: RecommendItem[];
  source: 'database' | 'cache' | 'ai' | 'mixed';
  /** callContainer 异步补 AI 时尚未完成 */
  aiPending?: boolean;
};
