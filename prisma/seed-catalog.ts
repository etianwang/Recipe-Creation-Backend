import { IngredientCategory, MaterialType } from '@prisma/client';
import { isSafeIngredientCombination } from '../src/common/food-safety';
import {
  dedupeIngredients,
  EXTENDED_INGREDIENTS_DEDUPED,
} from './seed-ingredients-extended';
import { INTERNATIONAL_RECIPES } from './seed-recipes-international';

export type CatalogIngredient = {
  name: string;
  category: IngredientCategory;
  taste?: string;
};

export type CatalogMaterial = {
  name: string;
  type: MaterialType;
  required: boolean;
};

export type CatalogRecipe = {
  name: string;
  materials: CatalogMaterial[];
};

export type SafeRecipeTemplate = {
  mains: string[];
  sides: string[];
  methods: string[];
  extraSeasonings?: string[];
};

/** 核心家常食材（minimal seed 仅用此列表） */
export const BASE_CATALOG_INGREDIENTS: CatalogIngredient[] = [
  { name: '鸡肉', category: IngredientCategory.MAIN, taste: '鲜' },
  { name: '鸡腿', category: IngredientCategory.MAIN, taste: '鲜' },
  { name: '鸡翅', category: IngredientCategory.MAIN, taste: '鲜' },
  { name: '鸡胸肉', category: IngredientCategory.MAIN, taste: '鲜' },
  { name: '猪肉', category: IngredientCategory.MAIN, taste: '鲜' },
  { name: '五花肉', category: IngredientCategory.MAIN, taste: '香' },
  { name: '里脊', category: IngredientCategory.MAIN, taste: '嫩' },
  { name: '排骨', category: IngredientCategory.MAIN, taste: '鲜' },
  { name: '牛肉', category: IngredientCategory.MAIN, taste: '鲜' },
  { name: '牛腩', category: IngredientCategory.MAIN, taste: '鲜' },
  { name: '牛腱', category: IngredientCategory.MAIN, taste: '鲜' },
  { name: '羊肉', category: IngredientCategory.MAIN, taste: '鲜' },
  { name: '鸭肉', category: IngredientCategory.MAIN, taste: '鲜' },
  { name: '鸡蛋', category: IngredientCategory.MAIN, taste: '香' },
  { name: '鸭蛋', category: IngredientCategory.MAIN, taste: '香' },
  { name: '豆腐', category: IngredientCategory.MAIN, taste: '淡' },
  { name: '嫩豆腐', category: IngredientCategory.MAIN, taste: '嫩' },
  { name: '老豆腐', category: IngredientCategory.MAIN, taste: '实' },
  { name: '豆皮', category: IngredientCategory.MAIN, taste: '豆香' },
  { name: '千张', category: IngredientCategory.MAIN, taste: '豆香' },
  { name: '腐竹', category: IngredientCategory.MAIN, taste: '豆香' },
  { name: '虾', category: IngredientCategory.MAIN, taste: '鲜' },
  { name: '虾仁', category: IngredientCategory.MAIN, taste: '鲜' },
  { name: '鱼', category: IngredientCategory.MAIN, taste: '鲜' },
  { name: '鲈鱼', category: IngredientCategory.MAIN, taste: '鲜' },
  { name: '带鱼', category: IngredientCategory.MAIN, taste: '鲜' },
  { name: '黄鱼', category: IngredientCategory.MAIN, taste: '鲜' },
  { name: '鲫鱼', category: IngredientCategory.MAIN, taste: '鲜' },
  { name: '鱿鱼', category: IngredientCategory.MAIN, taste: '鲜' },
  { name: '蛤蜊', category: IngredientCategory.MAIN, taste: '鲜' },
  { name: '扇贝', category: IngredientCategory.MAIN, taste: '鲜' },
  { name: '土豆', category: IngredientCategory.MAIN, taste: '淡' },
  { name: '红薯', category: IngredientCategory.MAIN, taste: '甜' },
  { name: '茄子', category: IngredientCategory.MAIN, taste: '软' },
  { name: '番茄', category: IngredientCategory.MAIN, taste: '酸甜' },
  { name: '米饭', category: IngredientCategory.MAIN, taste: '淡' },
  { name: '面条', category: IngredientCategory.MAIN, taste: '麦香' },
  { name: '挂面', category: IngredientCategory.MAIN, taste: '麦香' },
  { name: '年糕', category: IngredientCategory.MAIN, taste: '糯' },
  { name: '饺子皮', category: IngredientCategory.MAIN, taste: '麦香' },
  { name: '青椒', category: IngredientCategory.SIDE, taste: '清香' },
  { name: '彩椒', category: IngredientCategory.SIDE, taste: '甜' },
  { name: '洋葱', category: IngredientCategory.SIDE, taste: '辛香' },
  { name: '白菜', category: IngredientCategory.SIDE, taste: '清甜' },
  { name: '娃娃菜', category: IngredientCategory.SIDE, taste: '嫩' },
  { name: '菠菜', category: IngredientCategory.SIDE, taste: '嫩' },
  { name: '生菜', category: IngredientCategory.SIDE, taste: '脆' },
  { name: '油麦菜', category: IngredientCategory.SIDE, taste: '清香' },
  { name: '空心菜', category: IngredientCategory.SIDE, taste: '嫩' },
  { name: '芹菜', category: IngredientCategory.SIDE, taste: '香' },
  { name: '西芹', category: IngredientCategory.SIDE, taste: '脆' },
  { name: '胡萝卜', category: IngredientCategory.SIDE, taste: '甜' },
  { name: '黄瓜', category: IngredientCategory.SIDE, taste: '清' },
  { name: '冬瓜', category: IngredientCategory.SIDE, taste: '淡' },
  { name: '南瓜', category: IngredientCategory.SIDE, taste: '甜' },
  { name: '丝瓜', category: IngredientCategory.SIDE, taste: '嫩' },
  { name: '苦瓜', category: IngredientCategory.SIDE, taste: '苦' },
  { name: '西蓝花', category: IngredientCategory.SIDE, taste: '脆' },
  { name: '花菜', category: IngredientCategory.SIDE, taste: '脆' },
  { name: '蘑菇', category: IngredientCategory.SIDE, taste: '鲜' },
  { name: '香菇', category: IngredientCategory.SIDE, taste: '鲜' },
  { name: '金针菇', category: IngredientCategory.SIDE, taste: '滑' },
  { name: '平菇', category: IngredientCategory.SIDE, taste: '鲜' },
  { name: '杏鲍菇', category: IngredientCategory.SIDE, taste: '肉感' },
  { name: '木耳', category: IngredientCategory.SIDE, taste: '脆' },
  { name: '银耳', category: IngredientCategory.SIDE, taste: '滑' },
  { name: '玉米', category: IngredientCategory.SIDE, taste: '甜' },
  { name: '豌豆', category: IngredientCategory.SIDE, taste: '甜' },
  { name: '毛豆', category: IngredientCategory.SIDE, taste: '香' },
  { name: '豆角', category: IngredientCategory.SIDE, taste: '嫩' },
  { name: '四季豆', category: IngredientCategory.SIDE, taste: '嫩' },
  { name: '荷兰豆', category: IngredientCategory.SIDE, taste: '甜' },
  { name: '豆芽', category: IngredientCategory.SIDE, taste: '脆' },
  { name: '韭菜', category: IngredientCategory.SIDE, taste: '香' },
  { name: '蒜苗', category: IngredientCategory.SIDE, taste: '香' },
  { name: '大葱', category: IngredientCategory.SEASONING, taste: '辛' },
  { name: '小葱', category: IngredientCategory.SEASONING, taste: '香' },
  { name: '大蒜', category: IngredientCategory.SEASONING, taste: '辛' },
  { name: '生姜', category: IngredientCategory.SEASONING, taste: '辛' },
  { name: '莲藕', category: IngredientCategory.SIDE, taste: '脆' },
  { name: '山药', category: IngredientCategory.SIDE, taste: '糯' },
  { name: '芋头', category: IngredientCategory.SIDE, taste: '糯' },
  { name: '萝卜', category: IngredientCategory.SIDE, taste: '甜' },
  { name: '白萝卜', category: IngredientCategory.SIDE, taste: '清' },
  { name: '青萝卜', category: IngredientCategory.SIDE, taste: '辣' },
  { name: '莴笋', category: IngredientCategory.SIDE, taste: '脆' },
  { name: '茭白', category: IngredientCategory.SIDE, taste: '嫩' },
  { name: '芦笋', category: IngredientCategory.SIDE, taste: '嫩' },
  { name: '海带', category: IngredientCategory.SIDE, taste: '鲜' },
  { name: '紫菜', category: IngredientCategory.SIDE, taste: '鲜' },
  { name: '粉丝', category: IngredientCategory.MAIN, taste: '滑' },
  { name: '宽粉', category: IngredientCategory.MAIN, taste: '糯' },
  { name: '花生', category: IngredientCategory.SIDE, taste: '香' },
  { name: '核桃', category: IngredientCategory.SIDE, taste: '香' },
  { name: '腰果', category: IngredientCategory.SIDE, taste: '香' },
  { name: '苹果', category: IngredientCategory.MAIN, taste: '甜' },
  { name: '梨', category: IngredientCategory.MAIN, taste: '甜' },
  { name: '柠檬', category: IngredientCategory.MAIN, taste: '酸' },
  { name: '盐', category: IngredientCategory.SEASONING },
  { name: '糖', category: IngredientCategory.SEASONING },
  { name: '生抽', category: IngredientCategory.SEASONING },
  { name: '老抽', category: IngredientCategory.SEASONING },
  { name: '蚝油', category: IngredientCategory.SEASONING },
  { name: '料酒', category: IngredientCategory.SEASONING },
  { name: '醋', category: IngredientCategory.SEASONING },
  { name: '香醋', category: IngredientCategory.SEASONING },
  { name: '食用油', category: IngredientCategory.SEASONING },
  { name: '香油', category: IngredientCategory.SEASONING },
  { name: '淀粉', category: IngredientCategory.SEASONING },
  { name: '豆瓣酱', category: IngredientCategory.SEASONING },
  { name: '番茄酱', category: IngredientCategory.SEASONING },
  { name: '黄豆酱', category: IngredientCategory.SEASONING },
  { name: '甜面酱', category: IngredientCategory.SEASONING },
  { name: '腐乳', category: IngredientCategory.SEASONING },
  { name: '胡椒粉', category: IngredientCategory.SPICE },
  { name: '白胡椒', category: IngredientCategory.SPICE },
  { name: '黑胡椒', category: IngredientCategory.SPICE },
  { name: '花椒', category: IngredientCategory.SPICE },
  { name: '藤椒', category: IngredientCategory.SPICE },
  { name: '干辣椒', category: IngredientCategory.SPICE },
  { name: '辣椒', category: IngredientCategory.SPICE },
  { name: '八角', category: IngredientCategory.SPICE },
  { name: '桂皮', category: IngredientCategory.SPICE },
  { name: '香叶', category: IngredientCategory.SPICE },
  { name: '孜然', category: IngredientCategory.SPICE },
  { name: '小茴香', category: IngredientCategory.SPICE },
  { name: '咖喱粉', category: IngredientCategory.SPICE },
  { name: '五香粉', category: IngredientCategory.SPICE },
  { name: '牛奶', category: IngredientCategory.DRINK },
  { name: '豆浆', category: IngredientCategory.DRINK },
  { name: '酸奶', category: IngredientCategory.DRINK },
  { name: '绿茶', category: IngredientCategory.DRINK },
  { name: '红茶', category: IngredientCategory.DRINK },
];

/** 核心 + 扩展（500+），full seed 灌库用 */
export const CATALOG_INGREDIENTS = dedupeIngredients([
  ...BASE_CATALOG_INGREDIENTS,
  ...EXTENDED_INGREDIENTS_DEDUPED,
]);

const S = MaterialType.SEASONING;
const M = MaterialType.MAIN;
const D = MaterialType.SIDE;
const P = MaterialType.SPICE;

/** 人工整理的经典家常菜（中式为主） */
const CHINESE_CATALOG_RECIPES: CatalogRecipe[] = [
  {
    name: '土豆青椒炒鸡',
    materials: [
      { name: '鸡肉', type: M, required: true },
      { name: '土豆', type: M, required: true },
      { name: '青椒', type: D, required: true },
      { name: '胡椒粉', type: P, required: true },
      { name: '盐', type: S, required: true },
      { name: '生抽', type: S, required: false },
      { name: '大蒜', type: S, required: false },
    ],
  },
  {
    name: '番茄牛肉煲',
    materials: [
      { name: '牛肉', type: M, required: true },
      { name: '番茄', type: M, required: true },
      { name: '洋葱', type: D, required: true },
      { name: '盐', type: S, required: true },
      { name: '黑胡椒', type: P, required: false },
    ],
  },
  {
    name: '宫保鸡丁',
    materials: [
      { name: '鸡肉', type: M, required: true },
      { name: '花生', type: D, required: false },
      { name: '干辣椒', type: P, required: true },
      { name: '花椒', type: P, required: false },
      { name: '生抽', type: S, required: true },
      { name: '糖', type: S, required: true },
      { name: '醋', type: S, required: true },
    ],
  },
  {
    name: '番茄炒蛋',
    materials: [
      { name: '番茄', type: M, required: true },
      { name: '鸡蛋', type: M, required: true },
      { name: '盐', type: S, required: true },
      { name: '糖', type: S, required: false },
    ],
  },
  {
    name: '鱼香肉丝',
    materials: [
      { name: '猪肉', type: M, required: true },
      { name: '胡萝卜', type: D, required: false },
      { name: '木耳', type: D, required: false },
      { name: '豆瓣酱', type: S, required: true },
      { name: '生抽', type: S, required: true },
      { name: '糖', type: S, required: true },
      { name: '醋', type: S, required: true },
    ],
  },
  {
    name: '麻婆豆腐',
    materials: [
      { name: '豆腐', type: M, required: true },
      { name: '猪肉', type: M, required: false },
      { name: '豆瓣酱', type: S, required: true },
      { name: '花椒', type: P, required: true },
      { name: '生抽', type: S, required: true },
    ],
  },
  {
    name: '蒜蓉菠菜',
    materials: [
      { name: '菠菜', type: M, required: true },
      { name: '大蒜', type: S, required: true },
      { name: '盐', type: S, required: true },
    ],
  },
  {
    name: '醋溜白菜',
    materials: [
      { name: '白菜', type: M, required: true },
      { name: '醋', type: S, required: true },
      { name: '干辣椒', type: P, required: false },
      { name: '盐', type: S, required: true },
    ],
  },
  {
    name: '红烧排骨',
    materials: [
      { name: '排骨', type: M, required: true },
      { name: '生姜', type: S, required: true },
      { name: '大葱', type: S, required: false },
      { name: '生抽', type: S, required: true },
      { name: '老抽', type: S, required: true },
      { name: '料酒', type: S, required: true },
      { name: '糖', type: S, required: true },
    ],
  },
  {
    name: '青椒土豆丝',
    materials: [
      { name: '土豆', type: M, required: true },
      { name: '青椒', type: D, required: true },
      { name: '醋', type: S, required: false },
      { name: '盐', type: S, required: true },
    ],
  },
  {
    name: '虾仁炒蛋',
    materials: [
      { name: '虾', type: M, required: true },
      { name: '鸡蛋', type: M, required: true },
      { name: '盐', type: S, required: true },
      { name: '料酒', type: S, required: false },
    ],
  },
  {
    name: '西蓝花炒牛肉',
    materials: [
      { name: '牛肉', type: M, required: true },
      { name: '西蓝花', type: D, required: true },
      { name: '生抽', type: S, required: true },
      { name: '淀粉', type: S, required: false },
      { name: '大蒜', type: S, required: false },
    ],
  },
  {
    name: '地三鲜',
    materials: [
      { name: '土豆', type: M, required: true },
      { name: '茄子', type: M, required: true },
      { name: '青椒', type: D, required: true },
      { name: '大蒜', type: S, required: true },
      { name: '生抽', type: S, required: true },
      { name: '盐', type: S, required: true },
    ],
  },
  {
    name: '回锅肉',
    materials: [
      { name: '五花肉', type: M, required: true },
      { name: '青椒', type: D, required: true },
      { name: '豆瓣酱', type: S, required: true },
      { name: '生抽', type: S, required: true },
      { name: '大蒜', type: S, required: false },
    ],
  },
  {
    name: '可乐鸡翅',
    materials: [
      { name: '鸡翅', type: M, required: true },
      { name: '生姜', type: S, required: true },
      { name: '生抽', type: S, required: true },
      { name: '料酒', type: S, required: false },
    ],
  },
  {
    name: '黄焖鸡',
    materials: [
      { name: '鸡肉', type: M, required: true },
      { name: '土豆', type: M, required: true },
      { name: '青椒', type: D, required: true },
      { name: '香菇', type: D, required: false },
      { name: '生抽', type: S, required: true },
      { name: '老抽', type: S, required: false },
    ],
  },
  {
    name: '糖醋里脊',
    materials: [
      { name: '里脊', type: M, required: true },
      { name: '鸡蛋', type: M, required: false },
      { name: '糖', type: S, required: true },
      { name: '醋', type: S, required: true },
      { name: '淀粉', type: S, required: true },
    ],
  },
  {
    name: '清炒时蔬',
    materials: [
      { name: '油麦菜', type: M, required: true },
      { name: '大蒜', type: S, required: true },
      { name: '盐', type: S, required: true },
    ],
  },
  {
    name: '干煸四季豆',
    materials: [
      { name: '四季豆', type: M, required: true },
      { name: '猪肉', type: M, required: false },
      { name: '干辣椒', type: P, required: true },
      { name: '花椒', type: P, required: false },
      { name: '盐', type: S, required: true },
    ],
  },
  {
    name: '蚂蚁上树',
    materials: [
      { name: '粉丝', type: M, required: true },
      { name: '猪肉', type: M, required: true },
      { name: '豆瓣酱', type: S, required: true },
      { name: '生抽', type: S, required: true },
      { name: '大蒜', type: S, required: false },
    ],
  },
  {
    name: '木须肉',
    materials: [
      { name: '猪肉', type: M, required: true },
      { name: '鸡蛋', type: M, required: true },
      { name: '黄瓜', type: D, required: true },
      { name: '木耳', type: D, required: false },
      { name: '生抽', type: S, required: true },
    ],
  },
  {
    name: '京酱肉丝',
    materials: [
      { name: '猪肉', type: M, required: true },
      { name: '甜面酱', type: S, required: true },
      { name: '大葱', type: S, required: true },
      { name: '豆腐', type: D, required: false },
    ],
  },
  {
    name: '口水鸡',
    materials: [
      { name: '鸡肉', type: M, required: true },
      { name: '花生', type: D, required: false },
      { name: '花椒', type: P, required: true },
      { name: '干辣椒', type: P, required: false },
      { name: '生抽', type: S, required: true },
    ],
  },
  {
    name: '白切鸡',
    materials: [
      { name: '鸡肉', type: M, required: true },
      { name: '生姜', type: S, required: true },
      { name: '大葱', type: S, required: true },
      { name: '盐', type: S, required: true },
    ],
  },
  {
    name: '葱爆羊肉',
    materials: [
      { name: '羊肉', type: M, required: true },
      { name: '大葱', type: S, required: true },
      { name: '生抽', type: S, required: true },
      { name: '料酒', type: S, required: true },
    ],
  },
  {
    name: '孜然羊肉',
    materials: [
      { name: '羊肉', type: M, required: true },
      { name: '孜然', type: P, required: true },
      { name: '洋葱', type: D, required: true },
      { name: '生抽', type: S, required: true },
    ],
  },
  {
    name: '红烧牛肉',
    materials: [
      { name: '牛腩', type: M, required: true },
      { name: '胡萝卜', type: D, required: true },
      { name: '土豆', type: D, required: false },
      { name: '八角', type: P, required: true },
      { name: '生抽', type: S, required: true },
      { name: '老抽', type: S, required: true },
    ],
  },
  {
    name: '土豆炖牛肉',
    materials: [
      { name: '牛肉', type: M, required: true },
      { name: '土豆', type: M, required: true },
      { name: '胡萝卜', type: D, required: false },
      { name: '洋葱', type: D, required: false },
      { name: '生抽', type: S, required: true },
    ],
  },
  {
    name: '清炖排骨汤',
    materials: [
      { name: '排骨', type: M, required: true },
      { name: '玉米', type: D, required: true },
      { name: '胡萝卜', type: D, required: false },
      { name: '生姜', type: S, required: true },
      { name: '盐', type: S, required: true },
    ],
  },
  {
    name: '莲藕排骨汤',
    materials: [
      { name: '排骨', type: M, required: true },
      { name: '莲藕', type: D, required: true },
      { name: '生姜', type: S, required: true },
      { name: '盐', type: S, required: true },
    ],
  },
  {
    name: '清蒸鲈鱼',
    materials: [
      { name: '鲈鱼', type: M, required: true },
      { name: '生姜', type: S, required: true },
      { name: '大葱', type: S, required: true },
      { name: '生抽', type: S, required: true },
      { name: '料酒', type: S, required: false },
    ],
  },
  {
    name: '红烧带鱼',
    materials: [
      { name: '带鱼', type: M, required: true },
      { name: '生姜', type: S, required: true },
      { name: '大蒜', type: S, required: false },
      { name: '生抽', type: S, required: true },
      { name: '老抽', type: S, required: true },
      { name: '料酒', type: S, required: true },
    ],
  },
  {
    name: '鲫鱼豆腐汤',
    materials: [
      { name: '鲫鱼', type: M, required: true },
      { name: '豆腐', type: M, required: true },
      { name: '生姜', type: S, required: true },
      { name: '盐', type: S, required: true },
    ],
  },
  {
    name: '白灼虾',
    materials: [
      { name: '虾', type: M, required: true },
      { name: '生姜', type: S, required: true },
      { name: '大葱', type: S, required: false },
      { name: '生抽', type: S, required: true },
    ],
  },
  {
    name: '蒜蓉粉丝蒸扇贝',
    materials: [
      { name: '扇贝', type: M, required: true },
      { name: '粉丝', type: D, required: true },
      { name: '大蒜', type: S, required: true },
      { name: '生抽', type: S, required: true },
    ],
  },
  {
    name: '蛤蜊蒸蛋',
    materials: [
      { name: '蛤蜊', type: M, required: true },
      { name: '鸡蛋', type: M, required: true },
      { name: '生抽', type: S, required: true },
      { name: '料酒', type: S, required: false },
    ],
  },
  {
    name: '家常豆腐',
    materials: [
      { name: '豆腐', type: M, required: true },
      { name: '青椒', type: D, required: true },
      { name: '木耳', type: D, required: false },
      { name: '生抽', type: S, required: true },
      { name: '豆瓣酱', type: S, required: false },
    ],
  },
  {
    name: '香菇油菜',
    materials: [
      { name: '香菇', type: M, required: true },
      { name: '油麦菜', type: D, required: true },
      { name: '大蒜', type: S, required: true },
      { name: '蚝油', type: S, required: true },
    ],
  },
  {
    name: '蚝油生菜',
    materials: [
      { name: '生菜', type: M, required: true },
      { name: '蚝油', type: S, required: true },
      { name: '大蒜', type: S, required: true },
    ],
  },
  {
    name: '干锅花菜',
    materials: [
      { name: '花菜', type: M, required: true },
      { name: '五花肉', type: M, required: false },
      { name: '干辣椒', type: P, required: true },
      { name: '大蒜', type: S, required: true },
    ],
  },
  {
    name: '凉拌黄瓜',
    materials: [
      { name: '黄瓜', type: M, required: true },
      { name: '大蒜', type: S, required: true },
      { name: '醋', type: S, required: true },
      { name: '香油', type: S, required: false },
    ],
  },
  {
    name: '拍黄瓜',
    materials: [
      { name: '黄瓜', type: M, required: true },
      { name: '大蒜', type: S, required: true },
      { name: '醋', type: S, required: true },
      { name: '生抽', type: S, required: true },
    ],
  },
  {
    name: '酸辣土豆丝',
    materials: [
      { name: '土豆', type: M, required: true },
      { name: '干辣椒', type: P, required: true },
      { name: '醋', type: S, required: true },
      { name: '盐', type: S, required: true },
    ],
  },
  {
    name: '鱼香茄子',
    materials: [
      { name: '茄子', type: M, required: true },
      { name: '猪肉', type: M, required: false },
      { name: '豆瓣酱', type: S, required: true },
      { name: '糖', type: S, required: true },
      { name: '醋', type: S, required: true },
    ],
  },
  {
    name: '红烧茄子',
    materials: [
      { name: '茄子', type: M, required: true },
      { name: '大蒜', type: S, required: true },
      { name: '生抽', type: S, required: true },
      { name: '老抽', type: S, required: false },
    ],
  },
  {
    name: '冬瓜排骨汤',
    materials: [
      { name: '排骨', type: M, required: true },
      { name: '冬瓜', type: D, required: true },
      { name: '生姜', type: S, required: true },
      { name: '盐', type: S, required: true },
    ],
  },
  {
    name: '山药炒木耳',
    materials: [
      { name: '山药', type: M, required: true },
      { name: '木耳', type: D, required: true },
      { name: '胡萝卜', type: D, required: false },
      { name: '盐', type: S, required: true },
    ],
  },
  {
    name: '芹菜炒百合',
    materials: [
      { name: '芹菜', type: M, required: true },
      { name: '胡萝卜', type: D, required: false },
      { name: '盐', type: S, required: true },
      { name: '大蒜', type: S, required: false },
    ],
  },
  {
    name: '蛋炒饭',
    materials: [
      { name: '米饭', type: M, required: true },
      { name: '鸡蛋', type: M, required: true },
      { name: '大葱', type: S, required: false },
      { name: '盐', type: S, required: true },
      { name: '生抽', type: S, required: false },
    ],
  },
  {
    name: '扬州炒饭',
    materials: [
      { name: '米饭', type: M, required: true },
      { name: '鸡蛋', type: M, required: true },
      { name: '虾仁', type: M, required: false },
      { name: '豌豆', type: D, required: false },
      { name: '胡萝卜', type: D, required: false },
      { name: '盐', type: S, required: true },
    ],
  },
  {
    name: '葱油拌面',
    materials: [
      { name: '面条', type: M, required: true },
      { name: '大葱', type: S, required: true },
      { name: '生抽', type: S, required: true },
      { name: '食用油', type: S, required: true },
    ],
  },
  {
    name: '西红柿鸡蛋面',
    materials: [
      { name: '面条', type: M, required: true },
      { name: '番茄', type: M, required: true },
      { name: '鸡蛋', type: M, required: true },
      { name: '盐', type: S, required: true },
    ],
  },
  {
    name: '牛肉拉面',
    materials: [
      { name: '面条', type: M, required: true },
      { name: '牛肉', type: M, required: true },
      { name: '白萝卜', type: D, required: false },
      { name: '大葱', type: S, required: true },
      { name: '盐', type: S, required: true },
    ],
  },
  {
    name: '韭菜炒鸡蛋',
    materials: [
      { name: '韭菜', type: M, required: true },
      { name: '鸡蛋', type: M, required: true },
      { name: '盐', type: S, required: true },
    ],
  },
  {
    name: '荷兰豆炒腊肠',
    materials: [
      { name: '荷兰豆', type: M, required: true },
      { name: '大蒜', type: S, required: true },
      { name: '盐', type: S, required: true },
    ],
  },
  {
    name: '蒜蓉空心菜',
    materials: [
      { name: '空心菜', type: M, required: true },
      { name: '大蒜', type: S, required: true },
      { name: '盐', type: S, required: true },
    ],
  },
  {
    name: '上汤娃娃菜',
    materials: [
      { name: '娃娃菜', type: M, required: true },
      { name: '五花肉', type: D, required: false },
      { name: '大蒜', type: S, required: true },
      { name: '盐', type: S, required: true },
    ],
  },
];

/** 中式 + 国际/快餐精选菜谱 */
export const CATALOG_RECIPES: CatalogRecipe[] = [
  ...CHINESE_CATALOG_RECIPES,
  ...INTERNATIONAL_RECIPES,
];

// 移除引用不存在或不合规的菜谱
function sanitizeCatalogRecipes(): CatalogRecipe[] {
  const names = new Set(CATALOG_INGREDIENTS.map((i) => i.name));
  return CATALOG_RECIPES.filter((r) => {
    const matNames = r.materials.map((m) => m.name);
    if (!matNames.every((n) => names.has(n))) return false;
    return isSafeIngredientCombination(matNames);
  });
}

export const SAFE_CATALOG_RECIPES = sanitizeCatalogRecipes();

/** 安全模板：仅在这些组合内扩展 bulk 菜谱 */
export const SAFE_RECIPE_TEMPLATES: SafeRecipeTemplate[] = [
  {
    mains: ['鸡肉', '鸡腿', '鸡翅'],
    sides: ['土豆', '青椒', '蘑菇', '胡萝卜', '洋葱', '香菇'],
    methods: ['炒', '炖', '焖', '煲', '烧'],
    extraSeasonings: ['盐', '生抽', '大蒜', '生姜'],
  },
  {
    mains: ['猪肉', '五花肉', '里脊', '排骨'],
    sides: ['白菜', '木耳', '芹菜', '土豆', '胡萝卜', '莲藕'],
    methods: ['炒', '炖', '烧', '焖', '蒸'],
    extraSeasonings: ['盐', '生抽', '料酒', '生姜'],
  },
  {
    mains: ['牛肉', '牛腩', '牛腱'],
    sides: ['土豆', '胡萝卜', '洋葱', '西蓝花', '番茄'],
    methods: ['炖', '烧', '炒', '焖'],
    extraSeasonings: ['盐', '生抽', '黑胡椒'],
  },
  {
    mains: ['羊肉'],
    sides: ['洋葱', '胡萝卜', '土豆', '青椒'],
    methods: ['炒', '炖', '烤'],
    extraSeasonings: ['孜然', '生抽', '料酒'],
  },
  {
    mains: ['豆腐', '嫩豆腐'],
    sides: ['青椒', '蘑菇', '木耳', '番茄'],
    methods: ['烧', '炖', '炒', '蒸'],
    extraSeasonings: ['盐', '生抽', '蚝油'],
  },
  {
    mains: ['虾', '虾仁', '鲈鱼', '带鱼', '黄鱼', '鲫鱼'],
    sides: ['豆腐', '生姜', '大葱', '西芹'],
    methods: ['蒸', '烧', '煮', '炒'],
    extraSeasonings: ['料酒', '生抽', '盐'],
  },
  {
    mains: ['鸡蛋'],
    sides: ['番茄', '韭菜', '青椒', '洋葱'],
    methods: ['炒', '蒸', '煮'],
    extraSeasonings: ['盐', '生抽'],
  },
  {
    mains: ['茄子', '土豆', '西蓝花', '花菜', '黄瓜', '冬瓜'],
    sides: ['大蒜', '青椒', '番茄', '木耳'],
    methods: ['炒', '烧', '凉拌', '蒸'],
    extraSeasonings: ['盐', '生抽', '醋'],
  },
  {
    mains: ['三文鱼', '鳕鱼', '羊排', '牛排', '培根'],
    sides: ['蘑菇', '洋葱', '彩椒', '番茄', '土豆'],
    methods: ['煎', '烤', '焗', '炖'],
    extraSeasonings: ['盐', '黑胡椒', '橄榄油', '黄油'],
  },
  {
    mains: ['意面', '通心粉', '薄饼', '卷饼', '汉堡面包'],
    sides: ['番茄', '洋葱', '彩椒', '蘑菇', '马苏里拉'],
    methods: ['煮', '烤', '焗', '卷'],
    extraSeasonings: ['橄榄油', '大蒜', '罗勒', '帕玛森'],
  },
  {
    mains: ['鹰嘴豆', '鸡肉', '羊肉'],
    sides: ['洋葱', '胡萝卜', '番茄', '彩椒', '黄瓜'],
    methods: ['炖', '烤', '咖喱', '拌'],
    extraSeasonings: ['孜然', '姜黄', '咖喱粉', '酸奶'],
  },
  {
    mains: ['鸡腿', '鸡胸肉', '牛肉'],
    sides: ['生菜', '番茄', '土豆', '面包糠', '芝士片'],
    methods: ['炸', '烤', '夹', '堡'],
    extraSeasonings: ['盐', '番茄酱', '蛋黄酱', '黑胡椒'],
  },
  {
    mains: ['米饭', '寿司米', '河粉', '乌冬面'],
    sides: ['鸡蛋', '虾', '黄瓜', '胡萝卜', '泡菜'],
    methods: ['炒', '卷', '拌', '汤'],
    extraSeasonings: ['鱼露', '韩式辣酱', '芝麻油', '生抽'],
  },
  {
    mains: ['鸭胸', '火鸡腿', '香肠', '火腿'],
    sides: ['彩椒', '洋葱', '蘑菇', '土豆', '西葫芦'],
    methods: ['炒', '煎', '烤', '炖'],
    extraSeasonings: ['盐', '黑胡椒', '橄榄油'],
  },
  {
    mains: ['鱿鱼', '章鱼', '墨鱼', '蛤蜊', '扇贝'],
    sides: ['大蒜', '生姜', '大葱', '西芹', '彩椒'],
    methods: ['炒', '蒸', '烧', '煮'],
    extraSeasonings: ['料酒', '生抽', '盐'],
  },
  {
    mains: ['年糕', '面条', '挂面', '米粉'],
    sides: ['白菜', '菠菜', '番茄', '鸡蛋', '豆芽'],
    methods: ['炒', '煮', '汤', '拌'],
    extraSeasonings: ['盐', '生抽', '香油'],
  },
  {
    mains: ['包菜', '娃娃菜', '油麦菜', '空心菜', '芥蓝'],
    sides: ['大蒜', '生姜', '彩椒', '蘑菇', '胡萝卜'],
    methods: ['炒', '凉拌', '蒸', '灼'],
    extraSeasonings: ['盐', '蚝油', '生抽'],
  },
  {
    mains: ['可颂', '吐司', '法棍', '贝果'],
    sides: ['火腿', '芝士片', '生菜', '番茄', '培根'],
    methods: ['烤', '夹', '配', '热压'],
    extraSeasonings: ['黄油', '蛋黄酱', '黑胡椒'],
  },
];

const DEFAULT_SEASONINGS = ['盐', '生抽', '大蒜', '生姜', '料酒'];

export function buildSafeBulkRecipes(target: number): CatalogRecipe[] {
  const seen = new Set(SAFE_CATALOG_RECIPES.map((r) => r.name));
  const out: CatalogRecipe[] = [];
  let seq = 1;

  outer: for (const tpl of SAFE_RECIPE_TEMPLATES) {
    const seasonings = [
      ...new Set([...(tpl.extraSeasonings ?? []), ...DEFAULT_SEASONINGS]),
    ];
    for (const main of tpl.mains) {
      for (const side of tpl.sides) {
        if (main === side) continue;
        for (const method of tpl.methods) {
          for (const seasoning of seasonings) {
            const baseName = `${main}${side}${method}`;
            let name = baseName;
            if (seen.has(name)) {
              name = `${baseName}·${seq}`;
              seq += 1;
            }
            const materials: CatalogMaterial[] = [
              { name: main, type: M, required: true },
              { name: side, type: D, required: true },
              { name: seasoning, type: S, required: true },
            ];
            const names = materials.map((m) => m.name);
            if (!isSafeIngredientCombination(names)) continue;
            if (seen.has(name)) continue;
            seen.add(name);
            out.push({ name, materials });
            if (out.length >= target) break outer;
          }
          if (out.length >= target) break outer;
        }
      }
    }
  }

  return out;
}

export function buildIngredientCatalog(target: number): CatalogIngredient[] {
  const map = new Map<string, CatalogIngredient>();
  for (const item of CATALOG_INGREDIENTS) {
    map.set(item.name, item);
    if (map.size >= target) break;
  }
  return [...map.values()];
}

/** 校验种子菜谱库自身 */
export function assertCatalogRecipesSafe(): void {
  for (const recipe of SAFE_CATALOG_RECIPES) {
    const names = recipe.materials.map((m) => m.name);
    if (!isSafeIngredientCombination(names)) {
      throw new Error(`Unsafe catalog recipe: ${recipe.name}`);
    }
  }
}

assertCatalogRecipesSafe();
