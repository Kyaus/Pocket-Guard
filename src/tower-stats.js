const { TYPES } = require('./config');

const MAX_LEVEL = 3;
const SELL_RATIO = 0.7;

// 升级费用和职业成长集中管理，显示与伤害结算共享同一组属性。
function upgradeCost(tower) {
  return (tower.level || 1) >= MAX_LEVEL ? 0 : Math.round(TYPES[tower.type].cost * (tower.level || 1) * 1.2);
}

function sellValue(tower) {
  return Math.floor((tower.invested ?? TYPES[tower.type].cost) * SELL_RATIO);
}

function towerStats(tower, game) {
  const base = TYPES[tower.type];
  const rank = (tower.level || 1) - 1;
  return {
    ...base,
    damage: base.damage * (1 + rank * (tower.type === 1 ? 0.65 : 0.45)) * game.damage,
    range: (base.range + rank * 8) * game.range,
    interval: base.interval * (tower.type === 0 ? Math.pow(0.85, rank) : 1) * game.rate,
    blastRadius: base.blastRadius ? base.blastRadius + rank * 10 : undefined,
    slowDuration: base.slowDuration ? base.slowDuration + rank * 0.5 : undefined,
    slowFactor: base.slowFactor ? base.slowFactor - rank * 0.08 : undefined
  };
}

module.exports = { MAX_LEVEL, SELL_RATIO, upgradeCost, sellValue, towerStats };
