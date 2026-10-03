const { TYPES, UPGRADES } = require('./config');
const { drawGame } = require('./renderer');
const { createPath, createPathFromPoints, pathLength, advanceEnemy } = require('./path');
const { MAX_LEVEL, upgradeCost, sellValue, towerStats } = require('./tower-stats');
const { GRID, LEVELS, getLevel } = require('./levels');
const { hitHomeButton } = require('./home');

// 纯客户端游戏控制器，不直接调用微信 API；存储由入口注入。
class Game {
  constructor(width, height, storage = {}) {
    this.w = width; this.h = height; this.storage = storage;
    this.best = storage.readBest ? storage.readBest() : 0;
    this.unlockedLevel = Math.max(1, Math.min(LEVELS.length,
      Number(storage.readUnlockedLevel ? storage.readUnlockedLevel() : 1) || 1));
    this.profile = storage.readProfile ? storage.readProfile() : { name: '守卫学徒', level: 1, avatarType: 2 };
    this.wallet = storage.readWallet ? storage.readWallet() : { coins: 1200, gems: 20 };
    this.grassByLevel = storage.readGrass ? (storage.readGrass() || Object.create(null)) : Object.create(null);
    this.level = 1;
    this.reset();
  }
  reset() {
    this.time = 0;
    this.state = 'menu'; this.coins = 150; this.hp = 20; this.wave = 0;
    this.damage = 1; this.range = 1; this.rate = 1; this.selected = 0;
    this.selectedTower = null; this.selectedGrass = null;
    this.towers = []; this.enemies = []; this.effects = []; this.projectiles = []; this.pending = 0;
    this.spawned = 0; this.waveMarkers = [];
    this.notice = '选择守卫，点击草地格子建造'; this.noticeTime = 5;
    this.configureLayout(getLevel(this.level));
  }
  configureLayout(level) {
    this.levelConfig = level;
    this.top = GRID.top;
    this.bottom = Math.min(this.h - 205, this.top + GRID.maxHeight);
    this.cellH = (this.bottom - this.top) / GRID.rows;
    this.cellW = GRID.width / GRID.cols;
    this.characterScale = Math.min(GRID.characterScale, this.cellH / 52);
    this.roadCells = level.roadCells;
    this.buildSlots = level.buildSlots ? new Set(level.buildSlots.map(([col, row]) => `${col},${row}`)) : null;
    this.grassUnlockCost = level.grassUnlockCost || 40;
    const initialGrass = (level.initialGrass || []).map(([col, row]) => `${col},${row}`);
    if (this.grassByLevel[level.id] instanceof Set) {
      // 直接从同一局实例继续游戏时复用已开垦草坪。
    } else if (Array.isArray(this.grassByLevel[level.id])) {
      this.grassByLevel[level.id] = new Set(this.grassByLevel[level.id]);
    } else {
      this.grassByLevel[level.id] = new Set(initialGrass);
    }
    this.unlockedGrass = this.grassByLevel[level.id];
    if (level.pathPoints) {
      const mapWidth = 358;
      const mapHeight = this.bottom - this.top + 39;
      const mapPoints = level.pathPoints.map(([x, y]) => [16 + x * mapWidth, this.top - 6 + y * mapHeight]);
      this.path = createPathFromPoints(mapPoints);
    } else {
      this.path = createPath(this.roadCells, GRID, this.top, this.cellH);
    }
    this.pathLength = pathLength(this.path);
  }
  slotPosition(col, row) {
    const mapped = this.levelConfig.socketLayout && this.levelConfig.socketLayout[`${col},${row}`];
    if (mapped) {
      return {
        x: 16 + mapped[0] * 358,
        y: this.top - 6 + mapped[1] * (this.bottom - this.top + 39)
      };
    }
    const offsetX = (((col * 7 + row * 11 + this.level * 5) % 9) - 4) * 1.35;
    const offsetY = (((col * 13 + row * 3 + this.level * 7) % 9) - 4) * 1.5;
    return {
      x: GRID.left + (col + 0.5) * this.cellW + offsetX,
      y: this.top + (row + 0.5) * this.cellH + offsetY
    };
  }
  startLevel(levelId) {
    const id = Math.max(1, Math.min(LEVELS.length, Number(levelId) || 1));
    if (id > this.unlockedLevel) {
      this.message('先完成前面的关卡');
      return;
    }
    this.level = id;
    this.time = 0;
    this.state = 'ready';
    this.coins = 150 + (id - 1) * 10;
    this.hp = 20;
    this.wave = 0;
    this.damage = 1;
    this.range = 1;
    this.rate = 1;
    this.selected = 0;
    this.selectedTower = null;
    this.selectedGrass = null;
    this.towers = [];
    this.enemies = [];
    this.effects = [];
    this.projectiles = [];
    this.pending = 0;
    this.spawned = 0;
    this.waveMarkers = [];
    this.notice = '选择守卫，点击草地格子建造';
    this.noticeTime = 5;
    this.configureLayout(getLevel(id));
  }
  returnToMenu() {
    this.state = 'menu';
    this.selectedTower = null;
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
    this.selectedGrass = null;
  }
  enterLevelSelect() {
    this.state = 'levelSelect';
    this.selectedTower = null;
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
    this.pending = 0;
    this.selectedGrass = null;
  }
  openHomeFeature(feature) {
    this.feature = feature;
    this.state = 'feature';
    this.selectedTower = null;
  }
  message(text) { this.notice = text; this.noticeTime = 2.5; }
  startWave() {
    if (this.state !== 'ready') return;
    this.selectedTower = null;
    this.selectedGrass = null;
    this.wave++;
    this.waveTotal = 5 + this.level + this.wave * 2;
    this.pending = this.waveTotal;
    this.spawned = 0;
    const eliteAt = Math.max(1, Math.floor(this.waveTotal * 0.48));
    this.waveMarkers = this.wave >= 2 ? [{ kind: 'elite', index: eliteAt }] : [];
    if (this.wave === this.levelConfig.waves) {
      this.waveMarkers.push({ kind: 'boss', index: this.waveTotal - 1 });
    } else if (this.wave >= 5) {
      this.waveMarkers.push({ kind: 'elite', index: Math.max(eliteAt + 1, Math.floor(this.waveTotal * 0.78)) });
    }
    this.spawnTimer = 0;
    this.state = 'battle'; this.message('第 ' + this.wave + ' 波来袭');
  }
  spawn() {
    const index = this.waveTotal - this.pending;
    const marker = this.waveMarkers.find(item => item.index === index);
    const kind = marker ? (marker.kind === 'boss' ? 3 : 2) : index % 3 === 2 ? 1 : 0;
    const hp = (kind === 3 ? 420 : kind === 2 ? 150 : kind === 1 ? 30 : 45) *
      (1 + (this.wave - 1) * 0.23) * this.levelConfig.enemyHpMultiplier;
    this.enemies.push({ x: this.path[0].x, y: this.path[0].y, hp, maxHp: hp,
      segment: 0, progress: 0,
      speed: (kind === 1 ? 85 : kind === 3 ? 30 : kind === 2 ? 43 : 58) * this.levelConfig.enemySpeedMultiplier,
      kind, slow: 0, slowFactor: 1, dead: false });
    this.pending--;
    this.spawned++;
  }
  finishWave() {
    this.coins += 30; this.best = Math.max(this.best, this.wave);
    if (this.storage.saveBest) this.storage.saveBest(this.best);
    if (this.wave >= this.levelConfig.waves) {
      this.state = 'win';
      if (this.level >= this.unlockedLevel && this.level < LEVELS.length) {
        this.unlockedLevel = this.level + 1;
        if (this.storage.saveUnlockedLevel) this.storage.saveUnlockedLevel(this.unlockedLevel);
      }
      return;
    }
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
    if (this.pending > 0 && this.spawnTimer <= 0) {
      this.spawn();
      this.spawnTimer = this.levelConfig.spawnInterval;
    }
    for (const e of this.enemies) {
      e.hitFlash = Math.max(0, (e.hitFlash || 0) - dt);
      const slowedTime = Math.min(e.slow, dt);
      const distance = e.speed * (slowedTime * e.slowFactor + dt - slowedTime);
      e.slow = Math.max(0, e.slow - dt);
      if (advanceEnemy(e, this.path, distance)) {
        e.dead = true;
        this.hp -= e.kind === 3 ? 5 : e.kind === 2 ? 2 : 1;
      }
    }
    if (this.hp <= 0) { this.hp = 0; this.state = 'lose'; return; }
    for (const tower of this.towers) {
      tower.cooldown -= dt;
      if (tower.cooldown > 0) continue;
      const type = towerStats(tower, this);
      const target = this.enemies.filter(e => !e.dead && Math.hypot(e.x - tower.x, e.y - tower.y) <= type.range)
        .sort((a, b) => b.progress - a.progress)[0];
      if (!target) continue;
      tower.cooldown = type.interval;
      tower.attackAge = 0;
      tower.aimAngle = Math.atan2(target.y - tower.y, target.x - tower.x);
      if (tower.type === 2) {
        const radius = type.range;
        this.enemies.filter(e => !e.dead && Math.hypot(e.x - tower.x, e.y - tower.y) <= radius).forEach(e => {
          e.slow = Math.max(e.slow, type.slowDuration);
          e.slowFactor = type.slowFactor;
          this.hit(e, type.damage);
        });
        this.effects.push({ kind: 'frost', x: tower.x, y: tower.y, radius, life: 0.5, duration: 0.5 });
      } else {
        this.projectiles.push({ kind: tower.type === 0 ? 'bullet' : 'shell',
          x: tower.x, y: tower.y - 18, sx: tower.x, sy: tower.y - 18,
          tx: target.x, ty: target.y, target, age: 0, damage: type.damage,
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
    enemy.hitFlash = 0.12;
    this.effects.push({ kind: 'damage', x: enemy.x, y: enemy.y - 18,
      value: Math.round(damage), life: 0.65, duration: 0.65 });
    if (enemy.hp <= 0) {
      enemy.dead = true;
      this.coins += enemy.kind === 3 ? 80 : enemy.kind === 2 ? 20 : 7;
      this.effects.push({ kind: 'death', x: enemy.x, y: enemy.y, life: 0.45, duration: 0.45 });
    }
  }
  grassKey(col, row) { return `${col},${row}`; }
  isBuildSlot(col, row) {
    if (this.roadCells.some(([c, r]) => c === col && r === row)) return false;
    return !this.buildSlots || this.buildSlots.has(this.grassKey(col, row));
  }
  isGrassUnlocked(col, row) {
    return this.unlockedGrass && this.unlockedGrass.has(this.grassKey(col, row));
  }
  unlockGrass() {
    if (!this.selectedGrass) return;
    const { col, row } = this.selectedGrass;
    if (this.isGrassUnlocked(col, row)) { this.selectedGrass = null; return; }
    if (this.coins < this.grassUnlockCost) { this.message('金币不足，无法开垦草坪'); return; }
    this.coins -= this.grassUnlockCost;
    this.unlockedGrass.add(this.grassKey(col, row));
    if (this.storage.saveGrass) {
      const saved = Object.fromEntries(Object.entries(this.grassByLevel).map(([id, cells]) => [id, Array.from(cells)]));
      this.storage.saveGrass(saved);
    }
    this.selectedGrass = null;
    this.message('草坪已开垦，可以放置守卫');
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
  upgradeTower() {
    const tower = this.selectedTower;
    if (!tower || !this.towers.includes(tower)) return;
    if (tower.level >= MAX_LEVEL) { this.message('已经达到最高等级'); return; }
    const cost = upgradeCost(tower);
    if (this.coins < cost) { this.message('升级金币不足'); return; }
    this.coins -= cost;
    tower.invested += cost;
    tower.level++;
    this.message('守卫升级到 Lv.' + tower.level);
  }
  sellTower() {
    const tower = this.selectedTower;
    if (!tower || !this.towers.includes(tower)) return;
    const refund = sellValue(tower);
    this.coins += refund;
    this.towers = this.towers.filter(t => t !== tower);
    this.selectedTower = null;
    this.message('出售守卫，回收 ' + refund + ' 金币');
  }
  touch(x, y) {
    if (this.state === 'menu') {
      const button = hitHomeButton(x, y, this.h);
      if (button) {
        if (button.id === 'guardian') this.enterLevelSelect();
        else this.openHomeFeature(button.id);
        return;
      }
      if (y >= this.h - 70) this.returnToMenu();
      return;
    }
    if (this.state === 'feature') {
      if (y >= 540 || (x <= 75 && y >= 20 && y <= 82) || (x >= 300 && y >= 20 && y <= 82)) this.reset();
      return;
    }
    if (this.state === 'levelSelect') {
      if (x <= 65 && y >= 20 && y <= 82) { this.returnToMenu(); return; }
      const cardWidth = 165;
      const cardHeight = 108;
      const startY = 143;
      const col = x < 195 ? 0 : 1;
      const row = Math.floor((y - startY) / 124);
      const id = row * 2 + col + 1;
      if (x >= 20 + col * 180 && x <= 20 + col * 180 + cardWidth &&
        y >= startY + row * 124 && y <= startY + row * 124 + cardHeight && id <= LEVELS.length) {
        this.startLevel(id);
      }
      return;
    }
    if ((this.state === 'ready' || this.state === 'battle' || this.state === 'upgrade') &&
      x <= 65 && y >= 20 && y <= 82) {
      this.enterLevelSelect();
      return;
    }
    if (this.state === 'win' || this.state === 'lose') {
      if (x <= 65 && y >= 20 && y <= 82) this.enterLevelSelect();
      else if (x >= 45 && x <= 220 && y > this.h / 2 + 40 && y < this.h / 2 + 100) this.startLevel(this.level);
      else if (x >= 230 && x <= 345 && y > this.h / 2 + 40 && y < this.h / 2 + 100) this.enterLevelSelect();
      return;
    }
    if (this.state === 'upgrade') {
      const start = this.h / 2 - 95;
      this.choices.forEach((choice, i) => {
        if (x >= 35 && x <= 355 && y >= start + i * 80 && y <= start + i * 80 + 65) {
          choice.apply(this); this.state = 'ready'; this.message('升级完成，可以继续建造');
        }
      }); return;
    }
    if (this.selectedGrass && y >= this.h - 140 && y <= this.h - 94) {
      if (x >= 25 && x <= 185) this.unlockGrass();
      else if (x >= 330 && x <= 375) this.selectedGrass = null;
      return;
    }
    if (this.selectedGrass && x >= 330 && x <= 375 && y >= this.h - 210 && y <= this.h - 168) {
      this.selectedGrass = null;
      return;
    }
    if (this.selectedGrass && y >= this.h - 210 && y <= this.h - 87) return;
    if (this.selectedTower && y >= this.h - 140 && y <= this.h - 94) {
      if (x >= 25 && x <= 185) this.upgradeTower();
      else if (x >= 205 && x <= 365) this.sellTower();
      return;
    }
    if (this.selectedTower && x >= 330 && x <= 375 && y >= this.h - 210 && y <= this.h - 168) {
      this.selectedTower = null;
      return;
    }
    if (this.selectedTower && y >= this.h - 210 && y <= this.h - 87) return;
    if (y >= this.h - 155 && y <= this.h - 87) {
      const i = Math.floor((x - 15) / 120);
      if (i >= 0 && i < 3) this.selected = i;
      return;
    }
    if (y >= this.h - 72 && y <= this.h - 22 && x >= 20 && x <= 370) { this.startWave(); return; }
    if (y < this.top || y >= this.bottom || x < 20 || x >= 370) return;
    let col = Math.floor((x - GRID.left) / this.cellW), row = Math.floor((y - this.top) / this.cellH);
    if (this.buildSlots) {
      const nearest = Array.from(this.buildSlots).map(key => {
        const [slotCol, slotRow] = key.split(',').map(Number);
        const slot = this.slotPosition(slotCol, slotRow);
        return { col: slotCol, row: slotRow, distance: Math.hypot(slot.x - x, slot.y - y) };
      }).sort((a, b) => a.distance - b.distance)[0];
      // 坑位的可点击半径略大于美术坑本身，避免把旁边的道路误吸附到坑位。
      if (nearest && nearest.distance <= Math.max(26, Math.min(this.cellW, this.cellH) * 0.56)) {
        col = nearest.col; row = nearest.row;
      }
    }
    if (this.roadCells.some(([c, r]) => c === col && r === row)) { this.message('道路上不能建造'); return; }
    if (!this.isBuildSlot(col, row)) { this.message('这里是森林装饰区'); return; }
    const existing = this.towers.find(t => t.col === col && t.row === row);
    if (existing) { this.selectedTower = existing; return; }
    if (!this.isGrassUnlocked(col, row)) {
      this.selectedTower = null;
      this.selectedGrass = { col, row };
      this.message(`开垦这块草坪需要 ${this.grassUnlockCost} 金币`);
      return;
    }
    this.selectedGrass = null;
    this.selectedTower = null;
    const type = TYPES[this.selected];
    if (this.coins < type.cost) { this.message('金币不足，击败敌人可获得金币'); return; }
    this.coins -= type.cost;
    const slot = this.slotPosition(col, row);
    this.towers.push({ col, row, x: slot.x,
      y: slot.y,
      type: this.selected, level: 1, invested: type.cost, cooldown: 0 });
  }
  draw(ctx) {
    drawGame(ctx, this);
  }
}
module.exports = { Game, TYPES };
