import { MaterialType } from '@prisma/client';
import type { CatalogRecipe } from './seed-catalog';

const M = MaterialType.MAIN;
const D = MaterialType.SIDE;
const S = MaterialType.SEASONING;
const P = MaterialType.SPICE;

/** 国际/快餐/融合菜（食材均须在 CATALOG 内且通过安全校验） */
export const INTERNATIONAL_RECIPES: CatalogRecipe[] = [
  // —— 法式 / 欧陆 ——
  {
    name: '黄油香煎三文鱼',
    materials: [
      { name: '三文鱼', type: M, required: true },
      { name: '黄油', type: S, required: true },
      { name: '柠檬', type: D, required: true },
      { name: '盐', type: S, required: true },
      { name: '黑胡椒', type: P, required: true },
      { name: '欧芹', type: P, required: false },
    ],
  },
  {
    name: '奶油蘑菇汤',
    materials: [
      { name: '蘑菇', type: M, required: true },
      { name: '淡奶油', type: S, required: true },
      { name: '洋葱', type: D, required: true },
      { name: '黄油', type: S, required: true },
      { name: '盐', type: S, required: true },
      { name: '黑胡椒', type: P, required: false },
    ],
  },
  {
    name: '芝士焗意面',
    materials: [
      { name: '意面', type: M, required: true },
      { name: '马苏里拉', type: M, required: true },
      { name: '培根', type: M, required: false },
      { name: '番茄', type: D, required: true },
      { name: '大蒜', type: S, required: true },
      { name: '橄榄油', type: S, required: true },
    ],
  },
  {
    name: '罗勒番茄意面',
    materials: [
      { name: '意面', type: M, required: true },
      { name: '番茄', type: M, required: true },
      { name: '罗勒', type: P, required: true },
      { name: '大蒜', type: S, required: true },
      { name: '橄榄油', type: S, required: true },
      { name: '帕玛森', type: S, required: false },
    ],
  },
  {
    name: '法式洋葱汤',
    materials: [
      { name: '洋葱', type: M, required: true },
      { name: '牛肉汤', type: S, required: true },
      { name: '黄油', type: S, required: true },
      { name: '吐司', type: D, required: false },
      { name: '芝士', type: S, required: false },
    ],
  },
  {
    name: '迷迭香烤羊排',
    materials: [
      { name: '羊排', type: M, required: true },
      { name: '迷迭香', type: P, required: true },
      { name: '大蒜', type: S, required: true },
      { name: '橄榄油', type: S, required: true },
      { name: '盐', type: S, required: true },
      { name: '黑胡椒', type: P, required: true },
    ],
  },
  {
    name: '可颂三明治',
    materials: [
      { name: '可颂', type: M, required: true },
      { name: '火腿', type: M, required: true },
      { name: '芝士片', type: M, required: true },
      { name: '生菜', type: D, required: true },
      { name: '番茄', type: D, required: false },
    ],
  },
  // —— 中东 / 地中海 ——
  {
    name: '鹰嘴豆泥配薄饼',
    materials: [
      { name: '鹰嘴豆', type: M, required: true },
      { name: '薄饼', type: M, required: true },
      { name: '芝麻酱', type: S, required: true },
      { name: '橄榄油', type: S, required: true },
      { name: '柠檬', type: D, required: true },
      { name: '大蒜', type: S, required: false },
    ],
  },
  {
    name: '中东烤羊肉',
    materials: [
      { name: '羊肉', type: M, required: true },
      { name: '酸奶', type: S, required: true },
      { name: '孜然', type: P, required: true },
      { name: '洋葱', type: D, required: true },
      { name: '彩椒', type: D, required: true },
      { name: '盐', type: S, required: true },
    ],
  },
  {
    name: '以色列沙拉碗',
    materials: [
      { name: '番茄', type: M, required: true },
      { name: '黄瓜', type: M, required: true },
      { name: '鹰嘴豆', type: M, required: true },
      { name: '橄榄油', type: S, required: true },
      { name: '柠檬', type: D, required: true },
      { name: '欧芹', type: P, required: false },
    ],
  },
  {
    name: '摩洛哥咖喱羊肉',
    materials: [
      { name: '羊肉', type: M, required: true },
      { name: '胡萝卜', type: D, required: true },
      { name: '洋葱', type: D, required: true },
      { name: '姜黄', type: P, required: true },
      { name: '孜然', type: P, required: true },
      { name: '番茄', type: D, required: false },
    ],
  },
  {
    name: '黎巴嫩烤鸡',
    materials: [
      { name: '鸡肉', type: M, required: true },
      { name: '酸奶', type: S, required: true },
      { name: '柠檬', type: D, required: true },
      { name: '大蒜', type: S, required: true },
      { name: '橄榄油', type: S, required: true },
      { name: '孜然', type: P, required: true },
    ],
  },
  // —— 美式快餐 / 轻食 ——
  {
    name: '经典牛肉汉堡',
    materials: [
      { name: '汉堡面包', type: M, required: true },
      { name: '牛肉', type: M, required: true },
      { name: '生菜', type: D, required: true },
      { name: '番茄', type: D, required: true },
      { name: '芝士片', type: M, required: false },
      { name: '番茄酱', type: S, required: true },
    ],
  },
  {
    name: '炸鸡块',
    materials: [
      { name: '鸡腿', type: M, required: true },
      { name: '面包糠', type: S, required: true },
      { name: '鸡蛋', type: M, required: true },
      { name: '淀粉', type: S, required: true },
      { name: '盐', type: S, required: true },
      { name: '黑胡椒', type: P, required: true },
    ],
  },
  {
    name: '薯条',
    materials: [
      { name: '土豆', type: M, required: true },
      { name: '食用油', type: S, required: true },
      { name: '盐', type: S, required: true },
      { name: '番茄酱', type: S, required: false },
    ],
  },
  {
    name: '培根芝士三明治',
    materials: [
      { name: '吐司', type: M, required: true },
      { name: '培根', type: M, required: true },
      { name: '芝士片', type: M, required: true },
      { name: '生菜', type: D, required: false },
      { name: '蛋黄酱', type: S, required: false },
    ],
  },
  {
    name: '凯撒沙拉',
    materials: [
      { name: '罗马生菜', type: M, required: true },
      { name: '鸡胸肉', type: M, required: true },
      { name: '帕玛森', type: S, required: true },
      { name: '面包糠', type: D, required: false },
      { name: '橄榄油', type: S, required: true },
      { name: '柠檬汁', type: S, required: false },
    ],
  },
  {
    name: '墨西哥卷饼',
    materials: [
      { name: '卷饼', type: M, required: true },
      { name: '鸡胸肉', type: M, required: true },
      { name: '彩椒', type: D, required: true },
      { name: '洋葱', type: D, required: true },
      { name: '酸奶', type: S, required: false },
      { name: '孜然', type: P, required: true },
    ],
  },
  // —— 日式 ——
  {
    name: '照烧鸡腿饭',
    materials: [
      { name: '鸡腿', type: M, required: true },
      { name: '米饭', type: M, required: true },
      { name: '西蓝花', type: D, required: true },
      { name: '生抽', type: S, required: true },
      { name: '料酒', type: S, required: true },
      { name: '蜂蜜', type: S, required: true },
    ],
  },
  {
    name: '日式咖喱饭',
    materials: [
      { name: '米饭', type: M, required: true },
      { name: '土豆', type: M, required: true },
      { name: '胡萝卜', type: D, required: true },
      { name: '洋葱', type: D, required: true },
      { name: '咖喱块', type: S, required: true },
      { name: '鸡肉', type: M, required: false },
    ],
  },
  {
    name: '味噌汤',
    materials: [
      { name: '味噌', type: S, required: true },
      { name: '豆腐', type: M, required: true },
      { name: '海带', type: D, required: true },
      { name: '葱花', type: S, required: false },
    ],
  },
  {
    name: '三文鱼寿司卷',
    materials: [
      { name: '寿司米', type: M, required: true },
      { name: '三文鱼', type: M, required: true },
      { name: '海苔', type: D, required: true },
      { name: '醋', type: S, required: true },
      { name: '生抽', type: S, required: false },
    ],
  },
  // —— 韩式 ——
  {
    name: '韩式石锅拌饭',
    materials: [
      { name: '米饭', type: M, required: true },
      { name: '菠菜', type: D, required: true },
      { name: '胡萝卜', type: D, required: true },
      { name: '鸡蛋', type: M, required: true },
      { name: '韩式辣酱', type: S, required: true },
      { name: '芝麻油', type: S, required: true },
    ],
  },
  {
    name: '韩式泡菜炒五花肉',
    materials: [
      { name: '五花肉', type: M, required: true },
      { name: '泡菜', type: M, required: true },
      { name: '洋葱', type: D, required: true },
      { name: '韩式辣酱', type: S, required: true },
      { name: '大蒜', type: S, required: true },
      { name: '生抽', type: S, required: false },
    ],
  },
  {
    name: '部队锅',
    materials: [
      { name: '午餐肉', type: M, required: true },
      { name: '泡菜', type: M, required: true },
      { name: '豆腐', type: M, required: true },
      { name: '年糕', type: D, required: true },
      { name: '韩式辣酱', type: S, required: true },
      { name: '芝士', type: S, required: false },
    ],
  },
  // —— 泰式 / 东南亚 ——
  {
    name: '泰式冬阴功',
    materials: [
      { name: '虾', type: M, required: true },
      { name: '蘑菇', type: D, required: true },
      { name: '香茅', type: P, required: true },
      { name: '柠檬叶', type: P, required: true },
      { name: '鱼露', type: S, required: true },
      { name: '椰浆', type: S, required: true },
    ],
  },
  {
    name: '泰式青木瓜沙拉',
    materials: [
      { name: '青木瓜', type: M, required: true },
      { name: '花生', type: D, required: true },
      { name: '青柠', type: D, required: true },
      { name: '鱼露', type: S, required: true },
      { name: '泰式甜辣酱', type: S, required: false },
      { name: '番茄', type: D, required: false },
    ],
  },
  {
    name: '新加坡海南鸡饭',
    materials: [
      { name: '鸡肉', type: M, required: true },
      { name: '米饭', type: M, required: true },
      { name: '黄瓜', type: D, required: true },
      { name: '生姜', type: S, required: true },
      { name: '大蒜', type: S, required: true },
      { name: '生抽', type: S, required: true },
    ],
  },
  {
    name: '马来沙爹',
    materials: [
      { name: '鸡肉', type: M, required: true },
      { name: '花生酱', type: S, required: true },
      { name: '椰浆', type: S, required: true },
      { name: '柠檬', type: D, required: true },
      { name: '姜黄', type: P, required: true },
      { name: '孜然', type: P, required: true },
    ],
  },
  // —— 印度 / 南亚 ——
  {
    name: '印度黄油咖喱鸡',
    materials: [
      { name: '鸡肉', type: M, required: true },
      { name: '番茄', type: M, required: true },
      { name: '洋葱', type: D, required: true },
      { name: '黄油', type: S, required: true },
      { name: '姜黄', type: P, required: true },
      { name: '咖喱粉', type: P, required: true },
    ],
  },
  {
    name: '印度鹰嘴豆咖喱',
    materials: [
      { name: '鹰嘴豆', type: M, required: true },
      { name: '番茄', type: M, required: true },
      { name: '洋葱', type: D, required: true },
      { name: '姜黄', type: P, required: true },
      { name: '孜然', type: P, required: true },
      { name: '椰浆', type: S, required: false },
    ],
  },
  {
    name: '印度烤饼配豆泥',
    materials: [
      { name: '薄饼', type: M, required: true },
      { name: '鹰嘴豆', type: M, required: true },
      { name: '大蒜', type: S, required: true },
      { name: '姜黄', type: P, required: true },
      { name: '盐', type: S, required: true },
    ],
  },
  // —— 更多融合 ——
  {
    name: '芝士披萨',
    materials: [
      { name: '高筋面粉', type: M, required: true },
      { name: '马苏里拉', type: M, required: true },
      { name: '番茄', type: M, required: true },
      { name: '橄榄油', type: S, required: true },
      { name: '酵母', type: S, required: true },
      { name: '罗勒', type: P, required: false },
    ],
  },
  {
    name: '西班牙海鲜饭',
    materials: [
      { name: '米饭', type: M, required: true },
      { name: '虾', type: M, required: true },
      { name: '青口贝', type: M, required: true },
      { name: '彩椒', type: D, required: true },
      { name: '番茄', type: D, required: true },
      { name: '藏红花', type: P, required: false },
    ],
  },
  {
    name: '希腊沙拉',
    materials: [
      { name: '番茄', type: M, required: true },
      { name: '黄瓜', type: M, required: true },
      { name: '彩椒', type: D, required: true },
      { name: '芝士', type: M, required: true },
      { name: '橄榄', type: D, required: true },
      { name: '橄榄油', type: S, required: true },
    ],
  },
  {
    name: '越南河粉',
    materials: [
      { name: '河粉', type: M, required: true },
      { name: '牛肉', type: M, required: true },
      { name: '豆芽', type: D, required: true },
      { name: '九层塔', type: P, required: true },
      { name: '鱼露', type: S, required: true },
      { name: '青柠', type: D, required: true },
    ],
  },
  {
    name: '印尼炒饭',
    materials: [
      { name: '米饭', type: M, required: true },
      { name: '鸡蛋', type: M, required: true },
      { name: '虾', type: M, required: false },
      { name: '洋葱', type: D, required: true },
      { name: '甜酱油', type: S, required: true },
      { name: '大蒜', type: S, required: true },
    ],
  },
];
