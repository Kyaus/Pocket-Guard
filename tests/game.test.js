const test = require('node:test');
const assert = require('node:assert/strict');
const { Game } = require('../src/game');
const { advanceEnemy } = require('../src/path');
const { attackPose, ATTACK_DURATION } = require('../src/animation');

test('攻击事件触发动作，无目标不触发，动作结束恢复待机', () => {
  const game = new Game(390, 844);
  game.state = 'battle';
  const tower = { x: 100, y: 270, type: 0, cooldown: 0 };
  game.towers = [tower];
  game.pending = 1;
  game.spawnTimer = 100;
  game.update(0.05);
  assert.equal(attackPose(0, tower.attackAge).active, false);
  game.enemies = [enemy(110, 250)];
  game.update(0);
  assert.equal(tower.attackAge, 0);
  assert.equal(attackPose(0, tower.attackAge).flash, true);
  game.state = 'ready';
  game.update(1);
  assert.equal(attackPose(0, tower.attackAge).active, false);
});

test('三个职业都有身体和手臂动作，结束时恢复默认姿态', () => {
  for (let type = 0; type < 3; type++) {
    const moving = attackPose(type, ATTACK_DURATION[type] * 0.3);
    assert.notEqual(moving.lean, 0);
    assert.notEqual(moving.crouch, 0);
    assert.equal(attackPose(type, ATTACK_DURATION[type]).active, false);
    assert.equal(attackPose(type, Infinity).lean, 0);
    assert.equal(attackPose(type, 0, Math.PI).facing, -1);
  }
});

function enemy(x, y, extra = {}) {
  return { x, y, hp: 100, maxHp: 100, speed: 0, segment: 0, progress: 0,
    slow: 0, slowFactor: 1, kind: 0, dead: false, ...extra };
}

test('移动距离跨越转弯，严格沿路径抵达终点', () => {
  const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
  const unit = enemy(0, 0);
  assert.equal(advanceEnemy(unit, points, 15), false);
  assert.deepEqual([unit.x, unit.y, unit.progress, unit.segment], [10, 5, 15, 1]);
  assert.equal(advanceEnemy(unit, points, 10), true);
  assert.equal(unit.progress, 20);
});

test('速射塔发射追踪弹，按路径进度选择敌人且不造成范围伤害', () => {
  const game = new Game(390, 844);
  game.state = 'battle';
  const lead = enemy(110, 250, { progress: 200 });
  const behind = enemy(112, 290, { progress: 100 });
  game.enemies = [lead, behind];
  game.towers = [{ x: 100, y: 270, type: 0, cooldown: 0 }];
  game.update(0);
  assert.equal(game.projectiles[0].target, lead);
  assert.equal(lead.hp, 100);
  game.updateProjectiles(1);
  assert.equal(lead.hp, 88);
  assert.equal(behind.hp, 100);
});

test('爆破炮弹延迟落地，对落点附近多个敌人造成伤害', () => {
  const game = new Game(390, 844);
  game.state = 'battle';
  game.enemies = [enemy(110, 250), enemy(130, 250), enemy(300, 250)];
  game.towers = [{ x: 100, y: 270, type: 1, cooldown: 0 }];
  game.update(0);
  assert.equal(game.projectiles[0].kind, 'shell');
  game.updateProjectiles(0.3);
  assert.equal(game.enemies[0].hp, 100);
  game.updateProjectiles(0.4);
  assert.deepEqual(game.enemies.map(e => e.hp), [68, 68, 100]);
  assert.equal(game.effects[0].kind, 'explosion');
});

test('冰霜脉冲减速范围内所有敌人，不发射单体弹', () => {
  const game = new Game(390, 844);
  game.state = 'battle';
  game.enemies = [enemy(110, 250), enemy(130, 250), enemy(300, 250)];
  game.towers = [{ x: 100, y: 270, type: 2, cooldown: 0 }];
  game.update(0);
  assert.deepEqual(game.enemies.map(e => e.slow), [2, 2, 0]);
  assert.equal(game.projectiles.length, 0);
  assert.equal(game.effects[0].kind, 'frost');
});

test('长屏幕上每个可建造格子的冰霜塔都能攻击相邻道路', () => {
  for (const height of [640, 844, 932, 1100]) {
    const layout = new Game(390, height);
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        if (layout.roadCells.some(([c, r]) => c === col && r === row)) continue;
        const game = new Game(390, height);
        game.selected = 2;
        game.touch(55 + col * 70, game.top + (row + 0.5) * game.cellH);
        const tower = game.towers[0];
        const nearest = game.path.slice(1, -1).reduce((best, point) =>
          Math.hypot(point.x - tower.x, point.y - tower.y) < Math.hypot(best.x - tower.x, best.y - tower.y) ? point : best);
        const unit = enemy(nearest.x, nearest.y);
        game.enemies = [unit];
        game.state = 'battle';
        game.update(0);
        assert.equal(unit.slow, 2, `屏幕 ${height}，格子 ${col},${row} 应触发冰霜攻击`);
        assert.equal(unit.hp, 97);
      }
    }
  }
});

test('建造扣费，禁止在道路和重复格子建造', () => {
  const game = new Game(390, 844);
  game.touch(195, 170);
  assert.equal(game.towers.length, 0);
  game.touch(55, game.top + game.cellH * 1.5);
  assert.equal(game.coins, 105);
  game.touch(55, game.top + game.cellH * 1.5);
  assert.equal(game.towers.length, 1);
  assert.equal(game.coins, 105);
});

test('成功清空波次后进入升级，保存最佳波次', () => {
  let best = 0;
  const game = new Game(390, 844, { saveBest: value => { best = value; } });
  game.startWave();
  game.pending = 0;
  game.enemies = [];
  game.update(0);
  assert.equal(game.state, 'upgrade');
  assert.equal(best, 1);
  assert.equal(new Set(game.choices).size, 3);
  game.touch(100, game.h / 2 - 70);
  assert.equal(game.state, 'ready');
});

test('敌人突破基地导致失败', () => {
  const game = new Game(390, 844);
  game.startWave();
  game.pending = 0;
  game.hp = 1;
  const end = game.path[game.path.length - 1];
  game.enemies = [{ x: end.x, y: end.y - 1, segment: game.path.length - 2, progress: game.pathLength - 1, speed: 100, kind: 0, slow: 0, slowFactor: 1 }];
  game.update(0.05);
  assert.equal(game.state, 'lose');
  assert.equal(game.hp, 0);
});

test('第十波清空后获胜，再开始保留历史成绩', () => {
  const game = new Game(390, 844);
  game.wave = 9;
  game.startWave();
  game.pending = 0;
  game.update(0);
  assert.equal(game.state, 'win');
  game.touch(195, game.h / 2 + 70);
  assert.equal(game.state, 'ready');
  assert.equal(game.best, 10);
  assert.equal(game.wave, 0);
});
