// 防御塔和升级配置：调整平衡性时优先修改此文件。
const TYPES = [
  { name: '速射塔', cost: 45, range: 110, damage: 12, interval: 0.42, projectileSpeed: 360, color: '#61e5c0', description: '追踪弹 · 快速击杀单个敌人' },
  { name: '爆破塔', cost: 65, range: 145, damage: 32, interval: 1.8, flightTime: 0.65, blastRadius: 52, color: '#ffb86b', description: '抛射炮弹 · 落点范围爆炸' },
  { name: '冰霜塔', cost: 55, range: 95, damage: 3, interval: 1.5, slowDuration: 2, slowFactor: 0.45, color: '#80bdff', description: '冰霜脉冲 · 范围减速控场' }
];
const UPGRADES = [
  { name: '火力强化', description: '所有防御塔伤害 +25%', apply: g => { g.damage *= 1.25; } },
  { name: '紧急补给', description: '立即获得 70 金币', apply: g => { g.coins += 70; } },
  { name: '基地维修', description: '恢复 5 点生命，最多 20', apply: g => { g.hp = Math.min(20, g.hp + 5); } },
  { name: '射程扩展', description: '所有防御塔射程 +15%', apply: g => { g.range *= 1.15; } },
  { name: '快速装填', description: '所有防御塔攻击间隔 -15%', apply: g => { g.rate *= 0.85; } }
];

module.exports = { TYPES, UPGRADES };
