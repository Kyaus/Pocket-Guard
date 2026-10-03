const { TYPES, UPGRADES } = require('./config');
const { drawGame } = require('./renderer');
const { ROAD_CELLS, createPath, pathLength, advanceEnemy } = require('./path');

// 纯客户端游戏控制器，不直接调用微信 API；存储由入口注入。
class Game {
  constructor(width, height, storage = {}) {
    this.w = width; this.h = height; this.storage = storage;
    this.best = storage.readBest ? storage.readBest() : 0;
    this.reset();
  }
  reset() {
    this.time = 0;
    this.state = 'ready'; this.coins = 150; this.hp = 20; this.wave = 0;
    this.damage = 1; this.range = 1; this.rate = 1; this.selected = 0;
    this.towers = []; this.enemies = []; this.effects = []; this.projectiles = []; this.pending = 0;
    this.notice = '选择防御塔，再点击空地建造'; this.noticeTime = 5;
    this.top = 140;
    // 限制格子高度，避免长屏设备把道路拉到短射程塔的攻击范围之外。
    this.bottom = Math.min(this.h - 205, this.top + 450);
    this.cellH = (this.bottom - this.top) / 5;
    this.roadCells = ROAD_CELLS;
    this.path = createPath(this.top, this.bottom, this.cellH);
    this.pathLength = pathLength(this.path);
  }
  message(text) { this.notice = text; this.noticeTime = 2.5; }
  startWave() {
    if (this.state !== 'ready') return;
    this.wave++; this.pending = 6 + this.wave * 2; this.spawnTimer = 0;
    this.state = 'battle'; this.message('第 ' + this.wave + ' 波来袭');
  }
  spawn() {
    const index = 6 + this.wave * 2 - this.pending;
    const kind = index % 5 === 4 ? 2 : index % 3 === 2 ? 1 : 0;
    const hp = (kind === 2 ? 90 : kind === 1 ? 30 : 45) * (1 + (this.wave - 1) * 0.23);
    this.enemies.push({ x: this.path[0].x, y: this.path[0].y, hp, maxHp: hp,
      segment: 0, progress: 0, speed: kind === 1 ? 85 : kind === 2 ? 43 : 58,
      kind, slow: 0, slowFactor: 1, dead: false });
    this.pending--;
  }
  finishWave() {
    this.coins += 30; this.best = Math.max(this.best, this.wave);
    if (this.storage.saveBest) this.storage.saveBest(this.best);
    if (this.wave >= 10) { this.state = 'win'; return; }
    // Fisher–Yates 洗牌，避免随机比较排序带来的分布偏差。
    const shuffled = UPGRADES.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    this.choices = shuffled.slice(0, 3);
    this.state = 'upgrade';
  }
  update(dt) {
    this.time += dt;
    this.noticeTime = Math.max(0, this.noticeTime - dt);
    this.effects.forEach(e => { e.life -= dt; });
    this.effects = this.effects.filter(e => e.life > 0);
    this.towers.forEach(tower => { tower.attackAge = (tower.attackAge ?? Infinity) + dt; });
    if (this.state !== 'battle') return;
    this.spawnTimer -= dt;
    if (this.pending > 0 && this.spawnTimer <= 0) { this.spawn(); this.spawnTimer = 0.85; }
    for (const e of this.enemies) {
      const slowedTime = Math.min(e.slow, dt);
      const distance = e.speed * (slowedTime * e.slowFactor + dt - slowedTime);
      e.slow = Math.max(0, e.slow - dt);
      if (advanceEnemy(e, this.path, distance)) { e.dead = true; this.hp -= e.kind === 2 ? 2 : 1; }
    }
    if (this.hp <= 0) { this.hp = 0; this.state = 'lose'; return; }
    for (const tower of this.towers) {
      tower.cooldown -= dt;
      if (tower.cooldown > 0) continue;
      const type = TYPES[tower.type];
      const target = this.enemies.filter(e => !e.dead && Math.hypot(e.x - tower.x, e.y - tower.y) <= type.range * this.range)
        .sort((a, b) => b.progress - a.progress)[0];
      if (!target) continue;
      tower.cooldown = type.interval * this.rate;
      tower.attackAge = 0;
      tower.aimAngle = Math.atan2(target.y - tower.y, target.x - tower.x);
      if (tower.type === 2) {
        const radius = type.range * this.range;
        this.enemies.filter(e => !e.dead && Math.hypot(e.x - tower.x, e.y - tower.y) <= radius).forEach(e => {
          e.slow = Math.max(e.slow, type.slowDuration);
          e.slowFactor = type.slowFactor;
          this.hit(e, type.damage * this.damage);
        });
        this.effects.push({ kind: 'frost', x: tower.x, y: tower.y, radius, life: 0.5, duration: 0.5 });
      } else {
        this.projectiles.push({ kind: tower.type === 0 ? 'bullet' : 'shell',
          x: tower.x, y: tower.y - 18, sx: tower.x, sy: tower.y - 18,
          tx: target.x, ty: target.y, target, age: 0, damage: type.damage * this.damage,
          speed: type.projectileSpeed, duration: type.flightTime, radius: type.blastRadius });
      }
    }
    this.updateProjectiles(dt);
    this.enemies = this.enemies.filter(e => !e.dead);
    if (this.pending === 0 && this.enemies.length === 0) {
      this.projectiles = [];
      this.finishWave();
    }
  }
  hit(enemy, damage) {
    if (enemy.dead) return;
    enemy.hp -= damage;
    if (enemy.hp <= 0) {
      enemy.dead = true;
      this.coins += enemy.kind === 2 ? 12 : 7;
    }
  }
  updateProjectiles(dt) {
    this.projectiles = this.projectiles.filter(projectile => {
      if (projectile.kind === 'bullet') {
        if (projectile.target.dead) return false;
        const dx = projectile.target.x - projectile.x;
        const dy = projectile.target.y - projectile.y;
        const distance = Math.hypot(dx, dy);
        if (distance <= projectile.speed * dt) {
          this.hit(projectile.target, projectile.damage);
          return false;
        }
        projectile.x += dx / distance * projectile.speed * dt;
        projectile.y += dy / distance * projectile.speed * dt;
      } else {
        // 炮弹锁定发射时的地面落点，快怪可能逃出爆炸范围。
        projectile.age += dt;
        const progress = Math.min(1, projectile.age / projectile.duration);
        projectile.x = projectile.sx + (projectile.tx - projectile.sx) * progress;
        projectile.y = projectile.sy + (projectile.ty - projectile.sy) * progress - Math.sin(progress * Math.PI) * 55;
        if (progress >= 1) {
          this.enemies.filter(e => !e.dead && Math.hypot(e.x - projectile.tx, e.y - projectile.ty) <= projectile.radius)
            .forEach(e => this.hit(e, projectile.damage));
          this.effects.push({ kind: 'explosion', x: projectile.tx, y: projectile.ty,
            radius: projectile.radius, life: 0.4, duration: 0.4 });
          return false;
        }
      }
      return true;
    });
  }
  touch(x, y) {
    if (this.state === 'win' || this.state === 'lose') { if (x >= 65 && x <= 325 && y > this.h / 2 + 40 && y < this.h / 2 + 100) this.reset(); return; }
    if (this.state === 'upgrade') {
      const start = this.h / 2 - 95;
      this.choices.forEach((choice, i) => {
        if (x >= 35 && x <= 355 && y >= start + i * 80 && y <= start + i * 80 + 65) {
          choice.apply(this); this.state = 'ready'; this.message('升级完成，可以继续建造');
        }
      }); return;
    }
    if (y >= this.h - 155 && y <= this.h - 87) {
      const i = Math.floor((x - 15) / 120);
      if (i >= 0 && i < 3) this.selected = i;
      return;
    }
    if (y >= this.h - 72 && y <= this.h - 22 && x >= 20 && x <= 370) { this.startWave(); return; }
    if (y < this.top || y >= this.bottom || x < 20 || x >= 370) return;
    const col = Math.floor((x - 20) / 70), row = Math.floor((y - this.top) / this.cellH);
    if (this.roadCells.some(([c, r]) => c === col && r === row)) { this.message('道路上不能建造'); return; }
    if (this.towers.some(t => t.col === col && t.row === row)) { this.message('这里已经有防御塔'); return; }
    const type = TYPES[this.selected];
    if (this.coins < type.cost) { this.message('金币不足，击败敌人可获得金币'); return; }
    this.coins -= type.cost;
    this.towers.push({ col, row, x: 55 + col * 70, y: this.top + (row + 0.5) * this.cellH, type: this.selected, cooldown: 0 });
  }
  draw(ctx) {
    drawGame(ctx, this);
  }
}
module.exports = { Game, TYPES };
