const { TYPES } = require('./config');
const { drawGuardian, drawMonster } = require('./characters');
const { MAX_LEVEL, upgradeCost, sellValue, towerStats } = require('./tower-stats');
const { GRID, LEVELS } = require('./levels');
const { homeButtonLayout } = require('./home');

// 卡通视觉使用 Canvas 路径绘制，图形源码可直接修改，无外部素材依赖。
const PALETTE = {
  ink: '#38513d', cream: '#fff8df', grass: '#b8db85', path: '#eccc90',
  green: '#69b96b', shadow: '#48804c', muted: '#758268'
};

function panel(ctx, x, y, width, height, fill, radius = 12, stroke = PALETTE.ink) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function label(ctx, value, x, y, size = 16, color = PALETTE.ink, align = 'center') {
  ctx.font = `bold ${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}

function circle(ctx, x, y, radius, fill, outline = true) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function battlefield(ctx, game) {
  panel(ctx, 14, game.top - 8, 362, game.bottom - game.top + 44, game.levelConfig.color || PALETTE.grass, 18);
  ctx.save();
  ctx.beginPath();
  ctx.rect(16, game.top - 6, 358, game.bottom - game.top + 39);
  ctx.clip();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const roadOuter = Math.max(24, game.cellW * GRID.roadWidth);
  const roadInner = Math.max(19, roadOuter - 6);
  for (const [width, color] of [[roadOuter, '#bda574'], [roadInner, PALETTE.path]]) {
    ctx.beginPath();
    game.path.forEach((point, index) => {
      const y = Math.max(game.top - 6, Math.min(game.bottom + 20, point.y));
      if (index === 0) ctx.moveTo(point.x, y);
      else ctx.lineTo(point.x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  ctx.restore();
  for (let row = 0; row < GRID.rows; row++) {
    for (let col = 0; col < GRID.cols; col++) {
      const x = GRID.left + (col + 0.5) * game.cellW;
      const y = game.top + (row + 0.5) * game.cellH;
      if (game.roadCells.some(([c, r]) => c === col && r === row)) {
        panel(ctx, x - game.cellW * 0.16, y - 3, game.cellW * 0.32, 6, '#dfbd7e', 3, null);
      } else {
        panel(ctx, x - game.cellW / 2 + 2, y - game.cellH / 2 + 2,
          game.cellW - 4, game.cellH - 4, (row + col) % 2 ? '#a9d078' : '#b4d982', 9, '#90b66b');
        if (!game.towers.some(t => t.col === col && t.row === row)) {
          label(ctx, '+', x, y + Math.min(7, game.cellH * 0.2), Math.min(18, game.cellH * 0.48), '#719752');
        }
        // 花草位置由格子索引决定，避免每帧随机造成闪烁。
        circle(ctx, x + game.cellW * 0.38, y + game.cellH * 0.36, 1.5,
          (row + col) % 3 ? '#f9f1b9' : '#f5a6ab', false);
      }
    }
  }
  const exit = game.path[game.path.length - 1];
  panel(ctx, exit.x - 38, game.bottom + 1, 76, 29, '#fff1c6', 5);
  panel(ctx, exit.x - 42, game.bottom - 4, 84, 10, '#ea977d', 3);
  panel(ctx, exit.x - 8, game.bottom + 12, 16, 18, '#a07d57', 3);
  if (game.selectedTower) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(16, game.top - 6, 358, game.bottom - game.top + 39);
    ctx.clip();
    const tower = game.selectedTower;
    circle(ctx, tower.x, tower.y, towerStats(tower, game).range, 'rgba(255,250,180,0.18)', false);
    ctx.strokeStyle = '#f8f1ac';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
  game.towers.forEach(t => {
    drawGuardian(ctx, t.x, t.y, t.type, false, game.time, t.attackAge, t.aimAngle,
      t.level, game.characterScale);
    label(ctx, '★'.repeat(t.level || 1), t.x, t.y + Math.min(27, game.cellH * 0.55), 8, '#866d2d');
  });
  // 将入口处的怪物和血条限制在战场内，避免遮住顶部状态栏。
  ctx.save();
  ctx.beginPath();
  ctx.rect(16, game.top - 6, 358, game.bottom - game.top + 37);
  ctx.clip();
  game.enemies.forEach(e => drawMonster(ctx, e, game.time, game.characterScale));
  game.projectiles.forEach(projectile => {
    if (projectile.kind === 'bullet') {
      const angle = Math.atan2(projectile.target.y - projectile.y, projectile.target.x - projectile.x);
      ctx.strokeStyle = '#ffd670';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(projectile.x - Math.cos(angle) * 12, projectile.y - Math.sin(angle) * 12);
      ctx.lineTo(projectile.x, projectile.y);
      ctx.stroke();
      circle(ctx, projectile.x, projectile.y, 4, '#fff4a0');
    } else {
      circle(ctx, projectile.tx, projectile.ty, 8, 'rgba(233,145,66,0.2)');
      circle(ctx, projectile.x, projectile.y, 8, '#536474');
      circle(ctx, projectile.x - 2, projectile.y - 3, 2, '#ffffff', false);
      circle(ctx, projectile.x - 5, projectile.y + 8, 4, 'rgba(255,192,110,0.6)', false);
    }
  });
  game.effects.forEach(effect => {
    const progress = 1 - effect.life / effect.duration;
    if (effect.kind === 'damage') {
      ctx.globalAlpha = Math.min(1, effect.life * 3);
      label(ctx, '-' + effect.value, effect.x, effect.y - progress * 28, 14, '#fff9de');
      ctx.globalAlpha = 1;
      return;
    }
    if (effect.kind === 'death') {
      ctx.globalAlpha = 1 - progress;
      for (let i = 0; i < 7; i++) {
        const angle = i * Math.PI * 2 / 7;
        circle(ctx, effect.x + Math.cos(angle) * progress * 30,
          effect.y + Math.sin(angle) * progress * 25, 2 + (1 - progress) * 3, i % 2 ? '#fff1c8' : '#f3b9d5', false);
      }
      ctx.globalAlpha = 1;
      return;
    }
    const frost = effect.kind === 'frost';
    ctx.globalAlpha = Math.max(0, 1 - progress);
    circle(ctx, effect.x, effect.y, effect.radius * (0.25 + progress * 0.75),
      frost ? 'rgba(136,222,255,0.35)' : 'rgba(255,181,77,0.55)', false);
    ctx.strokeStyle = frost ? '#a7efff' : '#ffdf82';
    ctx.lineWidth = frost ? 3 : 5;
    ctx.stroke();
    if (frost) {
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        label(ctx, '✧', effect.x + Math.cos(angle) * effect.radius * progress,
          effect.y + Math.sin(angle) * effect.radius * progress, 18, '#e5fcff');
      }
    }
    ctx.globalAlpha = 1;
  });
  ctx.restore();
}

function drawTowerPanel(ctx, game) {
  const tower = game.selectedTower;
  const stats = towerStats(tower, game);
  const y = game.h - 210;
  const cost = upgradeCost(tower);
  panel(ctx, 15, y, 360, 123, PALETTE.cream, 14);
  label(ctx, stats.name + '  Lv.' + tower.level, 30, y + 25, 18, PALETTE.ink, 'left');
  label(ctx, '×', 352, y + 25, 24);
  label(ctx, `伤害 ${Math.round(stats.damage)} · 射程 ${Math.round(stats.range)} · 间隔 ${stats.interval.toFixed(2)}秒`,
    30, y + 48, 12, PALETTE.muted, 'left');
  const specialty = tower.type === 0 ? '升级强化单体伤害与攻速' : tower.type === 1 ? `爆炸范围 ${stats.blastRadius} · 升级强化范围伤害` :
    `减速 ${Math.round((1 - stats.slowFactor) * 100)}% / ${stats.slowDuration}秒`;
  label(ctx, specialty, 30, y + 64, 12, PALETTE.muted, 'left');
  const maxed = tower.level >= MAX_LEVEL;
  panel(ctx, 25, game.h - 140, 160, 46, maxed || game.coins < cost ? '#d7ddc7' : '#86c784', 10);
  label(ctx, maxed ? '已满级' : '升级 ' + cost + ' 金', 105, game.h - 111, 16);
  panel(ctx, 205, game.h - 140, 160, 46, '#f2c2a1', 10);
  label(ctx, '出售 +' + sellValue(tower) + ' 金', 285, game.h - 111, 16);
}

function drawMainMenu(ctx, game) {
  ctx.fillStyle = '#edf4d9';
  ctx.fillRect(0, 0, game.w, game.h);
  panel(ctx, 14, 14, 362, 96, PALETTE.cream, 18);
  circle(ctx, 58, 62, 31, '#cfe8a7');
  drawGuardian(ctx, 58, 72, game.profile.avatarType || 2, false, game.time, Infinity, -0.55, 3, 0.5);
  label(ctx, game.profile.name || '守卫学徒', 101, 48, 18, PALETTE.ink, 'left');
  label(ctx, 'Lv.' + (game.profile.level || 1) + '  小镇守护者', 101, 72, 12, PALETTE.muted, 'left');
  panel(ctx, 235, 32, 62, 27, '#ffedaf', 10);
  label(ctx, '金币 ' + game.wallet.coins, 266, 51, 11, '#8c6c28');
  panel(ctx, 302, 32, 62, 27, '#d7edf5', 10);
  label(ctx, '钻石 ' + game.wallet.gems, 333, 51, 11, '#547690');
  label(ctx, '今日任务：守住一波敌人', 235, 83, 11, PALETTE.muted, 'left');
  panel(ctx, 14, 126, 362, 194, '#fff8df', 24);
  circle(ctx, 195, 198, 51, '#cfe8a7');
  drawGuardian(ctx, 171, 246, 0, false, game.time, Infinity, -0.55, 2);
  drawGuardian(ctx, 219, 246, 2, false, game.time, Infinity, -0.55, 1);
  label(ctx, '口袋守卫', 195, 283, 24, PALETTE.ink);
  label(ctx, '集结守卫，击退来袭的小怪兽', 195, 304, 12, PALETTE.muted);
  homeButtonLayout(game.h).forEach(button => {
    const selected = button.id === 'guardian';
    panel(ctx, button.x, button.y + 4, button.width, button.height, '#a7b78d', 15, null);
    panel(ctx, button.x, button.y, button.width, button.height, button.color, 15, selected ? PALETTE.ink : '#a0a77f');
    circle(ctx, button.x + 32, button.y + button.height / 2, selected ? 25 : 22, '#fff8df');
    label(ctx, button.icon, button.x + 32, button.y + button.height / 2 + 7, selected ? 24 : 20, PALETTE.ink);
    label(ctx, button.name, button.x + 66, button.y + button.height / 2 - 2, selected ? 18 : 16, PALETTE.ink, 'left');
    label(ctx, button.subtitle, button.x + 66, button.y + button.height / 2 + 19, 11, '#63735b', 'left');
    if (selected) label(ctx, '›', button.x + button.width - 24, button.y + button.height / 2 + 8, 28, PALETTE.ink);
  });
  panel(ctx, 14, game.h - 62, 362, 44, '#d9e6c3', 14);
  label(ctx, '大厅', 195, game.h - 33, 15, PALETTE.ink);
}

function drawFeature(ctx, game) {
  ctx.fillStyle = '#edf4d9';
  ctx.fillRect(0, 0, game.w, game.h);
  panel(ctx, 14, 18, 362, 66, PALETTE.cream, 18);
  label(ctx, '‹', 35, 61, 30, PALETTE.ink);
  label(ctx, '功能预览', 195, 57, 24, PALETTE.ink);
  panel(ctx, 26, 130, 338, 390, '#fff8df', 24);
  circle(ctx, 195, 222, 55, '#cfe8a7');
  const title = { summon: '英雄抽取', expedition: '远征', shop: '商城', warehouse: '仓库' }[game.feature] || '功能';
  const desc = {
    summon: '收集不同职业的英雄，组成你的守卫队伍。',
    expedition: '派遣闲置英雄远征，离线也能带回奖励。',
    shop: '未来可购买外观、资源和限时礼包。',
    warehouse: '查看已获得的英雄、装备和装饰。'
  }[game.feature] || '更多城镇功能正在准备中。';
  label(ctx, title, 195, 315, 28, PALETTE.ink);
  label(ctx, desc, 195, 350, 14, PALETTE.muted);
  label(ctx, '即将开放', 195, 410, 22, '#9e8960');
  label(ctx, '入口和资源结构已经预留，后续可以接入正式内容。', 195, 440, 12, PALETTE.muted);
  panel(ctx, 64, 566, 262, 55, PALETTE.green, 16);
  label(ctx, '返回大厅', 195, 601, 18, '#fffbea');
}

function drawLevelSelect(ctx, game) {
  ctx.fillStyle = '#edf4d9';
  ctx.fillRect(0, 0, game.w, game.h);
  label(ctx, '选择守护地图', 195, 66, 28, PALETTE.ink);
  label(ctx, '完成前一关后解锁下一张地图', 195, 94, 13, PALETTE.muted);
  LEVELS.forEach((level, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 20 + col * 180;
    const y = 130 + row * 124;
    const locked = level.id > game.unlockedLevel;
    panel(ctx, x, y + 3, 165, 108, '#c0c89d', 16, null);
    panel(ctx, x, y, 165, 108, locked ? '#d6d9c7' : '#fff8df', 16, locked ? '#aeb69e' : '#91a86e');
    circle(ctx, x + 31, y + 32, 20, locked ? '#b6bdab' : level.color);
    label(ctx, locked ? '锁' : String(level.id), x + 31, y + 39, 19, locked ? '#f4f5e9' : PALETTE.ink);
    label(ctx, level.name, x + 58, y + 28, 16, locked ? '#8a9380' : PALETTE.ink, 'left');
    label(ctx, level.subtitle, x + 58, y + 49, 11, locked ? '#969e8c' : PALETTE.muted, 'left');
    label(ctx, `${level.waves} 波 · ${locked ? '完成前关卡解锁' : '可挑战'}`, x + 13, y + 88, 11, locked ? '#969e8c' : '#8b9a72', 'left');
  });
  panel(ctx, 52, game.h - 78, 286, 48, '#c9d6b5', 14);
  label(ctx, '返回主页面', 195, game.h - 47, 17, PALETTE.ink);
}

function drawOverlay(ctx, game) {
  const center = game.h / 2;
  ctx.fillStyle = 'rgba(41,65,47,0.65)';
  ctx.fillRect(0, 0, game.w, game.h);
  panel(ctx, 290, 22, 82, 34, '#fff8df', 10);
  label(ctx, '退出副本', 331, 45, 12, PALETTE.ink);
  if (game.state === 'upgrade') {
    panel(ctx, 22, center - 188, 346, 350, PALETTE.cream, 22);
    label(ctx, '防守成功！', 195, center - 148, 27);
    label(ctx, `第 ${game.wave} 波完成 · 补给 +30`, 195, center - 121, 14, PALETTE.muted);
    game.choices.forEach((choice, index) => {
      const y = center - 95 + index * 80;
      panel(ctx, 35, y + 3, 320, 65, '#d6c69a', 13, null);
      panel(ctx, 35, y, 320, 65, ['#e0efba', '#ffe0a8', '#d7edf5'][index], 13);
      label(ctx, choice.name, 54, y + 26, 19, PALETTE.ink, 'left');
      label(ctx, choice.description, 54, y + 49, 13, '#63735b', 'left');
      label(ctx, '›', 335, y + 39, 28);
    });
    return;
  }
  panel(ctx, 30, center - 145, 330, 275, PALETTE.cream, 22);
  label(ctx, game.state === 'win' ? '小镇守住啦！' : '再试一次吧！', 195, center - 70, 28);
  label(ctx, game.state === 'win' ? '你是今天的守卫英雄' : '多种防御塔搭配会更有效', 195, center - 40, 14, PALETTE.muted);
  label(ctx, `完成 ${game.state === 'win' ? 10 : Math.max(0, game.wave - 1)} 波 · 最佳 ${game.best} 波`, 195, center - 5, 17);
  panel(ctx, 45, center + 44, 170, 60, PALETTE.shadow);
  panel(ctx, 45, center + 40, 170, 60, PALETTE.green);
  label(ctx, '再挑战', 130, center + 77, 18, '#fffbea');
  panel(ctx, 225, center + 44, 120, 60, '#978f70');
  panel(ctx, 225, center + 40, 120, 60, '#c6b98c');
  label(ctx, '选地图', 285, center + 77, 17, PALETTE.ink);
}

function drawGame(ctx, game) {
  if (game.state === 'menu') {
    drawMainMenu(ctx, game);
    return;
  }
  if (game.state === 'levelSelect') {
    drawLevelSelect(ctx, game);
    return;
  }
  if (game.state === 'feature') {
    drawFeature(ctx, game);
    return;
  }
  ctx.save();
  ctx.fillStyle = '#edf4d9';
  ctx.fillRect(0, 0, game.w, game.h);
  panel(ctx, 14, 17, 362, 62, PALETTE.cream, 18);
  label(ctx, '口袋守卫', 31, 45, 25, PALETTE.ink, 'left');
  label(ctx, `${game.levelConfig.name} · ${game.levelConfig.subtitle}`, 32, 66, 11, PALETTE.muted, 'left');
  label(ctx, '最佳 ' + game.best + ' 波', 280, 51, 12, '#869155', 'right');
  panel(ctx, 292, 29, 76, 34, '#d9e6c3', 10);
  label(ctx, '退出副本', 330, 51, 11, PALETTE.ink);
  ['生命 ' + game.hp, '金币 ' + game.coins,
    '波次 ' + game.wave + '/' + game.levelConfig.waves].forEach((value, index) => {
    panel(ctx, 16 + index * 122, 91, 114, 33, ['#ffe0d6', '#ffedaf', '#dcebc7'][index], 12);
    label(ctx, value, 73 + index * 122, 113, 15);
  });
  battlefield(ctx, game);
  label(ctx, game.noticeTime > 0 ? game.notice : TYPES[game.selected].description, 195, game.h - 166, 11);
  TYPES.forEach((type, index) => {
    const x = 15 + index * 120;
    panel(ctx, x, game.h - 152, 112, 68, '#c0c89d', 12, null);
    panel(ctx, x, game.h - 155, 112, 68, game.selected === index ? '#fff0b6' : PALETTE.cream, 12, game.selected === index ? '#cb9a43' : '#a0b17d');
    drawGuardian(ctx, x + 24, game.h - 117, index, true);
    label(ctx, type.name, x + 74, game.h - 129, 14);
    label(ctx, type.cost + ' 金', x + 74, game.h - 108, 13, game.coins < type.cost ? '#bd705d' : '#997337');
  });
  if (game.selectedTower) drawTowerPanel(ctx, game);
  const ready = game.state === 'ready';
  panel(ctx, 20, game.h - 68, 350, 50, ready ? PALETTE.shadow : '#9aa88b');
  panel(ctx, 20, game.h - 72, 350, 50, ready ? PALETTE.green : '#c9d6b5');
  label(ctx, ready ? (game.wave === 0 ? '出发！守护小镇' : '迎接下一波') : '守卫中 · 可继续建造', 195, game.h - 40, 18, ready ? '#fffbea' : '#63755b');
  if (['upgrade', 'win', 'lose'].includes(game.state)) drawOverlay(ctx, game);
  ctx.restore();
}

module.exports = { drawGame, PALETTE };
