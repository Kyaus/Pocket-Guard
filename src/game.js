const { TYPES, UPGRADES } = require('./config');

// 纯客户端游戏控制器，不直接调用微信 API；存储由入口注入。
class Game {
  constructor(width, height, storage = {}) {
    this.w = width; this.h = height; this.storage = storage;
    this.best = storage.readBest ? storage.readBest() : 0;
    this.reset();
  }
  reset() {
    this.state = 'ready'; this.coins = 150; this.hp = 20; this.wave = 0;
    this.damage = 1; this.range = 1; this.rate = 1; this.selected = 0;
    this.towers = []; this.enemies = []; this.effects = []; this.pending = 0;
    this.notice = '选择防御塔，再点击空地建造'; this.noticeTime = 5;
    this.top = 140; this.bottom = this.h - 205;
    this.cellH = (this.bottom - this.top) / 5;
    this.path = [{ x: 195, y: this.top - 18 }, { x: 195, y: this.bottom + 20 }];
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
    this.enemies.push({ x: 195, y: this.path[0].y, hp, maxHp: hp,
      speed: kind === 1 ? 52 : kind === 2 ? 24 : 33, kind, slow: 0, dead: false });
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
    this.noticeTime = Math.max(0, this.noticeTime - dt);
    this.effects.forEach(e => { e.life -= dt; });
    this.effects = this.effects.filter(e => e.life > 0);
    if (this.state !== 'battle') return;
    this.spawnTimer -= dt;
    if (this.pending > 0 && this.spawnTimer <= 0) { this.spawn(); this.spawnTimer = 0.85; }
    for (const e of this.enemies) {
      e.slow = Math.max(0, e.slow - dt);
      e.y += e.speed * (e.slow > 0 ? 0.45 : 1) * dt;
      if (e.y >= this.path[1].y) { e.dead = true; this.hp -= e.kind === 2 ? 2 : 1; }
    }
    if (this.hp <= 0) { this.hp = 0; this.state = 'lose'; return; }
    for (const tower of this.towers) {
      tower.cooldown -= dt;
      if (tower.cooldown > 0) continue;
      const type = TYPES[tower.type];
      const target = this.enemies.filter(e => !e.dead && Math.hypot(e.x - tower.x, e.y - tower.y) <= type.range * this.range)
        .sort((a, b) => b.y - a.y)[0];
      if (!target) continue;
      tower.cooldown = type.interval * this.rate;
      const victims = tower.type === 1 ? this.enemies.filter(e => !e.dead && Math.hypot(e.x - target.x, e.y - target.y) < 44) : [target];
      victims.forEach(e => {
        e.hp -= type.damage * this.damage;
        if (tower.type === 2) e.slow = 2;
        if (e.hp <= 0 && !e.dead) { e.dead = true; this.coins += e.kind === 2 ? 12 : 7; }
      });
      this.effects.push({ x: tower.x, y: tower.y, tx: target.x, ty: target.y, color: type.color, life: 0.13 });
    }
    this.enemies = this.enemies.filter(e => !e.dead);
    if (this.pending === 0 && this.enemies.length === 0) this.finishWave();
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
    if (col === 2) { this.message('道路上不能建造'); return; }
    if (this.towers.some(t => t.col === col && t.row === row)) { this.message('这里已经有防御塔'); return; }
    const type = TYPES[this.selected];
    if (this.coins < type.cost) { this.message('金币不足，击败敌人可获得金币'); return; }
    this.coins -= type.cost;
    this.towers.push({ col, row, x: 55 + col * 70, y: this.top + (row + 0.5) * this.cellH, type: this.selected, cooldown: 0 });
  }
  draw(ctx) {
    const box = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
    const text = (label, x, y, size = 16, color = '#e8f0fa', align = 'left') => {
      ctx.fillStyle = color; ctx.font = size + 'px sans-serif'; ctx.textAlign = align; ctx.fillText(label, x, y);
    };
    box(0, 0, this.w, this.h, '#101a2b');
    text('口袋守卫', 20, 47, 26); text('单人防线 · 守住十波', 20, 74, 13, '#96abc2');
    text('生命 ' + this.hp, 20, 112, 17, '#ff929a');
    text('金币 ' + this.coins, 145, 112, 17, '#ffd479');
    text('波次 ' + this.wave + '/10', 270, 112, 17);
    for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) {
      box(21 + col * 70, this.top + row * this.cellH + 1, 68, this.cellH - 2, col === 2 ? '#344356' : '#1c2d42');
      if (col !== 2) text('+', 55 + col * 70, this.top + (row + 0.5) * this.cellH + 6, 22, '#3c526c', 'center');
    }
    text('↓', 195, this.top + 20, 22, '#72869c', 'center');
    box(158, this.bottom + 3, 74, 24, '#557bac'); text('基地', 195, this.bottom + 21, 14, '#ffffff', 'center');
    this.towers.forEach(t => {
      const type = TYPES[t.type];
      ctx.fillStyle = type.color; ctx.beginPath(); ctx.arc(t.x, t.y, 17, 0, Math.PI * 2); ctx.fill();
      box(t.x - 4, t.y - 25, 8, 22, type.color);
      text(['速', '爆', '冰'][t.type], t.x, t.y + 5, 13, '#102237', 'center');
    });
    this.enemies.forEach(e => {
      const radius = e.kind === 2 ? 15 : 11;
      ctx.fillStyle = e.slow > 0 ? '#8acbff' : ['#ff7b83', '#ffd479', '#b395f1'][e.kind];
      ctx.beginPath(); ctx.arc(e.x, e.y, radius, 0, Math.PI * 2); ctx.fill();
      box(e.x - 16, e.y - radius - 9, 32, 4, '#0a101b');
      box(e.x - 16, e.y - radius - 9, 32 * Math.max(0, e.hp / e.maxHp), 4, '#6be2ac');
    });
    this.effects.forEach(e => { ctx.strokeStyle = e.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.tx, e.ty); ctx.stroke(); });
    if (this.noticeTime > 0) text(this.notice, 195, this.h - 174, 13, '#ffd479', 'center');
    TYPES.forEach((t, i) => {
      box(15 + i * 120, this.h - 155, 112, 68, this.selected === i ? '#36516e' : '#213147');
      text(t.name, 71 + i * 120, this.h - 129, 17, t.color, 'center');
      text(t.cost + ' 金币', 71 + i * 120, this.h - 105, 14, '#c6d3e2', 'center');
    });
    box(20, this.h - 72, 350, 50, this.state === 'ready' ? '#53d4ad' : '#2b4058');
    text(this.state === 'ready' ? (this.wave === 0 ? '开始守卫' : '开始下一波') : '战斗中 · 可以继续建造', 195, this.h - 40, 18, this.state === 'ready' ? '#112c28' : '#bcccdc', 'center');
    if (this.state === 'upgrade') {
      box(0, 0, this.w, this.h, 'rgba(5,12,22,0.9)');
      text('第 ' + this.wave + ' 波完成', 195, this.h / 2 - 150, 27, '#6be2ac', 'center');
      text('获得 30 金币 · 选择一项升级', 195, this.h / 2 - 120, 15, '#bdcfe2', 'center');
      this.choices.forEach((c, i) => {
        const y = this.h / 2 - 95 + i * 80; box(35, y, 320, 65, '#253d58');
        text(c.name, 55, y + 26, 19); text(c.description, 55, y + 49, 14, '#b7cadd');
      });
    }
    if (this.state === 'win' || this.state === 'lose') {
      box(0, 0, this.w, this.h, 'rgba(5,12,22,0.9)');
      text(this.state === 'win' ? '防线守住了！' : '基地失守', 195, this.h / 2 - 55, 30, this.state === 'win' ? '#6be2ac' : '#ff929a', 'center');
      text('完成 ' + (this.state === 'win' ? 10 : Math.max(0, this.wave - 1)) + ' 波 · 最佳 ' + this.best + ' 波', 195, this.h / 2 - 15, 17, '#bdcfe2', 'center');
      box(65, this.h / 2 + 40, 260, 60, '#53d4ad'); text('再挑战一次', 195, this.h / 2 + 77, 20, '#112c28', 'center');
    }
  }
}
module.exports = { Game, TYPES };
