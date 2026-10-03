// 防御塔和升级配置：调整平衡性时优先修改此文件。
const TYPES = [
  { name: '速射塔', cost: 45, range: 125, damage: 12, interval: 0.48, color: '#61e5c0', description: '快速攻击单个敌人' },
  { name: '爆破塔', cost: 65, range: 115, damage: 22, interval: 1.3, color: '#ffb86b', description: '命中后造成范围伤害' },
  { name: '冰霜塔', cost: 55, range: 120, damage: 5, interval: 0.8, color: '#80bdff', description: '减速敌人两秒' }
];
const UPGRADES = [
  { name: '火力强化', description: '所有防御塔伤害 +25%', apply: g => { g.damage *= 1.25; } },
  { name: '紧急补给', description: '立即获得 70 金币', apply: g => { g.coins += 70; } },
  { name: '基地维修', description: '恢复 5 点生命，最多 20', apply: g => { g.hp = Math.min(20, g.hp + 5); } },
  { name: '射程扩展', description: '所有防御塔射程 +15%', apply: g => { g.range *= 1.15; } },
  { name: '快速装填', description: '所有防御塔攻击间隔 -15%', apply: g => { g.rate *= 0.85; } }
];

module.exports = { TYPES, UPGRADES };
