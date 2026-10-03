// 关卡配置：地图路径按敌人行进顺序排列，坐标范围为 7 列 × 9 行。
// 新增关卡时只需添加一项，不需要修改战斗逻辑。
const GRID = {
  cols: 7,
  rows: 9,
  left: 18,
  width: 354,
  top: 140,
  maxHeight: 468,
  roadWidth: 0.66,
  characterScale: 0.78
};

const LEVELS = [
  {
    id: 1,
    name: '晨光草坡',
    subtitle: '基础路线 · 熟悉三种守卫',
    color: '#b8db85',
    waves: 6,
    grassUnlockCost: 35,
    initialGrass: [[0, 1], [1, 1], [2, 1], [1, 2], [3, 3], [3, 5]],
    enemyHpMultiplier: 1,
    enemySpeedMultiplier: 1,
    spawnInterval: 0.85,
    roadCells: [
      [0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [4, 1], [5, 1], [5, 0], [6, 0],
      [6, 1], [6, 2], [5, 2], [4, 2], [4, 3], [5, 3], [6, 3], [6, 4], [5, 4],
      [4, 4], [3, 4], [2, 4], [2, 3], [1, 3], [0, 3], [0, 4], [0, 5], [1, 5],
      [2, 5], [2, 6], [3, 6], [4, 6], [4, 5], [5, 5], [6, 5], [6, 6], [5, 6],
      [4, 7], [5, 7], [6, 7], [6, 8]
    ]
  },
  {
    id: 2,
    name: '风车谷地',
    subtitle: '折返路线 · 敌人更快',
    color: '#a8d7bc',
    waves: 7,
    grassUnlockCost: 45,
    initialGrass: [[2, 0], [4, 2], [2, 4], [4, 6]],
    enemyHpMultiplier: 1.18,
    enemySpeedMultiplier: 1.08,
    spawnInterval: 0.78,
    roadCells: [
      [3, 0], [3, 1], [4, 1], [5, 1], [6, 1], [6, 2], [6, 3],
      [5, 3], [4, 3], [3, 3], [2, 3], [1, 3], [0, 3], [0, 4], [0, 5],
      [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [5, 6], [5, 7], [4, 7],
      [3, 7], [2, 7], [1, 7], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8]
    ]
  },
  {
    id: 3,
    name: '月影森林',
    subtitle: '多段路线 · 重甲怪增加',
    color: '#b7c5e5',
    waves: 8,
    grassUnlockCost: 55,
    initialGrass: [[3, 0], [3, 1], [2, 3], [4, 5]],
    enemyHpMultiplier: 1.4,
    enemySpeedMultiplier: 1.12,
    spawnInterval: 0.72,
    roadCells: [
      [1, 0], [1, 1], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [5, 3],
      [5, 4], [4, 4], [3, 4], [2, 4], [1, 4], [1, 5], [1, 6], [2, 6],
      [3, 6], [4, 6], [5, 6], [5, 7], [5, 8], [6, 8]
    ]
  },
  {
    id: 4,
    name: '星陨高原',
    subtitle: '极限路线 · 大规模来袭',
    color: '#e2b7a4',
    waves: 10,
    grassUnlockCost: 70,
    initialGrass: [[4, 0], [2, 2], [4, 4], [3, 6]],
    enemyHpMultiplier: 1.72,
    enemySpeedMultiplier: 1.18,
    spawnInterval: 0.62,
    roadCells: [
      [5, 0], [5, 1], [4, 1], [3, 1], [2, 1], [1, 1], [1, 2], [1, 3],
      [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [6, 4], [6, 5], [5, 5],
      [4, 5], [3, 5], [2, 5], [2, 6], [2, 7], [3, 7], [4, 7], [5, 7],
      [5, 8], [6, 8]
    ]
  }
];

function getLevel(id) {
  return LEVELS.find(level => level.id === id) || LEVELS[0];
}

module.exports = { GRID, LEVELS, getLevel };
