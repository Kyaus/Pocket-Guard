const test = require('node:test');
const assert = require('node:assert/strict');
const { Game } = require('../src/game');

test('建造扣费，禁止在道路和重复格子建造', () => {
  const game = new Game(390, 844);
  game.touch(195, 170);
  assert.equal(game.towers.length, 0);
  game.touch(55, 170);
  assert.equal(game.coins, 105);
  game.touch(55, 170);
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
  game.enemies = [{ x: 195, y: game.bottom + 19, speed: 100, kind: 0, slow: 0 }];
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
