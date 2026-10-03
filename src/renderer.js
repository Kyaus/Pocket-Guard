const { TYPES } = require('./config');
const { drawGuardian, drawMonster } = require('./characters');
const { MAX_LEVEL, upgradeCost, sellValue, towerStats } = require('./tower-stats');
const { GRID, LEVELS } = require('./levels');
const { homeButtonLayout } = require('./home');

// 卡通视觉以 Canvas 路径为主，森林底图和草地/坑位贴片作为可替换的本地资源。
const PALETTE = {
  ink: '#38513d', cream: '#fff8df', grass: '#b8db85', path: '#eccc90',
  green: '#69b96b', shadow: '#48804c', muted: '#758268'
};
const UI = {
  background: '#172331',
  panel: '#293944',
  panelDeep: '#202e39',
  panelGreen: '#355a4c',
  wood: '#825b3c',
  woodDark: '#4e382d',
  gold: '#e9b951',
  text: '#fff1c9',
  muted: '#a9b7b1',
  blue: '#73a9c9',
  red: '#bd735f'
};
let GRASS_IMAGE = null;
let PIT_IMAGE = null;
let MAP_BACKGROUND = null;

function setGrassImage(image) {
  GRASS_IMAGE = image;
}

function setBattleAssets({ grass, pit, background } = {}) {
  if (grass) GRASS_IMAGE = grass;
  if (pit) PIT_IMAGE = pit;
  if (background) MAP_BACKGROUND = background;
}

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

function polygon(ctx, points, fill, stroke = null) {
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function backArrow(ctx, x = 28, y = 48) {
  ctx.save();
  ctx.strokeStyle = UI.gold;
  ctx.fillStyle = UI.gold;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 9, y - 10);
  ctx.lineTo(x - 3, y);
  ctx.lineTo(x + 9, y + 10);
  ctx.stroke();
  ctx.restore();
}

function uiPanel(ctx, x, y, width, height, fill = UI.panel, radius = 14) {
  panel(ctx, x + 2, y + 4, width, height, UI.woodDark, radius, null);
  panel(ctx, x, y, width, height, fill, radius, UI.wood);
}

function drawImageCover(ctx, image, x, y, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function battlefield(ctx, game) {
  panel(ctx, 14, game.top - 8, 362, game.bottom - game.top + 44, game.levelConfig.color || PALETTE.grass, 18);
  ctx.save();
  ctx.beginPath();
  ctx.rect(16, game.top - 6, 358, game.bottom - game.top + 39);
  ctx.clip();
  if (MAP_BACKGROUND) {
    drawImageCover(ctx, MAP_BACKGROUND, 16, game.top - 6, 358, game.bottom - game.top + 39);
  } else {
    const terrain = ctx.createLinearGradient(0, game.top, 0, game.bottom);
    terrain.addColorStop(0, '#6fb878');
    terrain.addColorStop(0.52, '#4f9a68');
    terrain.addColorStop(1, '#2f7155');
    ctx.fillStyle = terrain;
    ctx.fillRect(16, game.top - 6, 358, game.bottom - game.top + 39);
    // 两侧溪流、林缘和岩石让战场从“棋盘格”变成森林场景。
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(27, game.top - 18);
    ctx.bezierCurveTo(53, game.top + 90, 20, game.top + 190, 43, game.bottom + 25);
    ctx.strokeStyle = '#286d79'; ctx.lineWidth = 17; ctx.stroke();
    ctx.strokeStyle = '#64c6b5'; ctx.lineWidth = 9; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(363, game.top - 5);
    ctx.bezierCurveTo(337, game.top + 125, 373, game.top + 245, 350, game.bottom + 15);
    ctx.strokeStyle = '#2c7780'; ctx.lineWidth = 12; ctx.stroke();
    ctx.strokeStyle = '#6bd0b2'; ctx.lineWidth = 5; ctx.stroke();
    const forest = [
      [34, game.top + 33, 0.34], [359, game.top + 42, 0.38],
      [37, game.top + 154, 0.27], [355, game.top + 210, 0.31],
      [32, game.bottom - 20, 0.34], [360, game.bottom - 42, 0.3]
    ];
    forest.forEach(([x, y, scale], index) => drawTree(ctx, x, y, scale, index % 2 ? '#1f5b47' : '#285f4b'));
    for (let i = 0; i < 8; i++) {
      const x = 55 + (i * 43) % 285;
      const y = game.top + 18 + (i * 79) % Math.max(80, game.bottom - game.top - 35);
      circle(ctx, x, y, 4 + (i % 2), i % 2 ? '#d6bc6b' : '#6a9c5a', false);
    }
  }
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
      const road = game.roadCells.some(([c, r]) => c === col && r === row);
      const slot = road ? {
        x: GRID.left + (col + 0.5) * game.cellW,
        y: game.top + (row + 0.5) * game.cellH
      } : game.slotPosition(col, row);
      const x = slot.x;
      const y = slot.y;
      if (road) {
        panel(ctx, x - game.cellW * 0.16, y - 3, game.cellW * 0.32, 6, '#dfbd7e', 3, null);
      } else {
        const unlocked = game.isGrassUnlocked(col, row);
        const selected = game.selectedGrass && game.selectedGrass.col === col && game.selectedGrass.row === row;
        const socketImage = unlocked ? PIT_IMAGE : GRASS_IMAGE;
        if (socketImage) {
          ctx.save();
          ctx.globalAlpha = 0.96;
          ctx.drawImage(socketImage, x - game.cellW * 0.48, y - game.cellH * 0.43,
            game.cellW * 0.96, game.cellH * 0.86);
          ctx.restore();
        } else {
          panel(ctx, x - game.cellW / 2 + 2, y - game.cellH / 2 + 2,
            game.cellW - 4, game.cellH - 4,
            unlocked ? ((row + col) % 2 ? '#83c878' : '#94d181') : '#527f5b',
            9, selected ? '#ffe38d' : unlocked ? '#6eae69' : '#3c6850');
        }
        if (selected) {
          ctx.strokeStyle = '#ffe38d'; ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, y, Math.min(game.cellW, game.cellH) * 0.42, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (!unlocked) {
          uiPanel(ctx, x - 16, y + game.cellH * 0.22, 32, 14, '#315947', 6);
          label(ctx, game.grassUnlockCost + '金', x, y + game.cellH * 0.22 + 10, 8, '#ffe39c');
        } else if (!game.towers.some(t => t.col === col && t.row === row)) {
          circle(ctx, x, y, Math.min(8, game.cellH * 0.18), 'rgba(245,226,144,0.55)', false);
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
  uiPanel(ctx, 15, y, 360, 123, UI.panel, 14);
  label(ctx, stats.name + '  Lv.' + tower.level, 30, y + 25, 18, UI.text, 'left');
  label(ctx, '×', 352, y + 25, 24, UI.gold);
  label(ctx, `伤害 ${Math.round(stats.damage)} · 射程 ${Math.round(stats.range)} · 间隔 ${stats.interval.toFixed(2)}秒`,
    30, y + 48, 12, UI.muted, 'left');
  const specialty = tower.type === 0 ? '升级强化单体伤害与攻速' : tower.type === 1 ? `爆炸范围 ${stats.blastRadius} · 升级强化范围伤害` :
    `减速 ${Math.round((1 - stats.slowFactor) * 100)}% / ${stats.slowDuration}秒`;
  label(ctx, specialty, 30, y + 64, 12, UI.muted, 'left');
  const maxed = tower.level >= MAX_LEVEL;
  uiPanel(ctx, 25, game.h - 140, 160, 46, maxed || game.coins < cost ? '#46504d' : '#477655', 10);
  label(ctx, maxed ? '已满级' : '升级 ' + cost + ' 金', 105, game.h - 111, 16, UI.text);
  uiPanel(ctx, 205, game.h - 140, 160, 46, '#754f43', 10);
  label(ctx, '出售 +' + sellValue(tower) + ' 金', 285, game.h - 111, 16, UI.text);
}

function drawGrassPanel(ctx, game) {
  const y = game.h - 210;
  uiPanel(ctx, 15, y, 360, 123, UI.panel, 14);
  label(ctx, '开垦草坪', 30, y + 28, 19, UI.text, 'left');
  label(ctx, '解锁后才能在这里放置守卫', 30, y + 53, 12, UI.muted, 'left');
  label(ctx, `需要 ${game.grassUnlockCost} 金币`, 30, y + 75, 14, UI.gold, 'left');
  label(ctx, '×', 352, y + 27, 24, UI.gold);
  uiPanel(ctx, 25, game.h - 140, 160, 46,
    game.coins < game.grassUnlockCost ? '#46504d' : '#477655', 10);
  label(ctx, '开垦草坪', 105, game.h - 111, 16, UI.text);
  uiPanel(ctx, 205, game.h - 140, 160, 46, '#46504d', 10);
  label(ctx, '稍后再说', 285, game.h - 111, 16, UI.muted);
}

function resourcePill(ctx, x, y, width, icon, value, color) {
  uiPanel(ctx, x, y, width, 32, UI.panelDeep, 10);
  circle(ctx, x + 17, y + 16, 9, color);
  label(ctx, icon, x + 17, y + 20, 10, UI.woodDark);
  label(ctx, value, x + 31, y + 21, 12, UI.text, 'left');
  label(ctx, '+', x + width - 8, y + 21, 12, UI.gold);
}

function drawTree(ctx, x, y, scale, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#6d4d37';
  ctx.fillRect(-4, 0, 8, 32);
  polygon(ctx, [[0, -56], [-28, -8], [28, -8]], color);
  polygon(ctx, [[0, -36], [-34, 4], [34, 4]], color);
  ctx.restore();
}

function drawChest(ctx, x, y, color) {
  uiPanel(ctx, x - 18, y - 14, 36, 25, color, 7);
  ctx.fillStyle = '#f7d27b';
  ctx.fillRect(x - 18, y - 3, 36, 3);
  circle(ctx, x, y - 1, 3, UI.gold);
}

function drawTownScene(ctx, game) {
  const x = 14; const y = 100; const width = 362; const height = 407;
  uiPanel(ctx, x, y, width, height, '#244b4a', 22);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 2, y + 2, width - 4, height - 4);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, y, 0, y + height);
  sky.addColorStop(0, '#1b3547');
  sky.addColorStop(0.55, '#2f665d');
  sky.addColorStop(1, '#234738');
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, width, height);
  circle(ctx, 294, 157, 38, '#d7cf9a', false);
  circle(ctx, 307, 148, 38, '#1b3547', false);
  for (let i = 0; i < 14; i++) circle(ctx, x + 18 + (i * 47) % 330, y + 20 + (i * 31) % 130, 1.5, '#f5df9b', false);
  drawTree(ctx, 42, 280, 0.92, '#1c3e3d');
  drawTree(ctx, 348, 275, 1.06, '#1b3c3b');
  drawTree(ctx, 83, 230, 0.56, '#2f5b4d');
  drawTree(ctx, 315, 235, 0.64, '#315b4d');
  // 远景山脊与中央传送门，使用叠层和高光制造轻微三维感。
  polygon(ctx, [[65, 300], [133, 210], [195, 267], [255, 201], [337, 300]], '#315d58');
  panel(ctx, 134, 195, 122, 138, '#172b35', 55, '#687c68');
  panel(ctx, 145, 207, 100, 126, '#3d8d82', 45, '#8bbd91');
  const portal = ctx.createRadialGradient(195, 263, 4, 195, 263, 78);
  portal.addColorStop(0, '#fff4ae'); portal.addColorStop(0.35, '#80e0bd'); portal.addColorStop(1, 'rgba(56,164,148,0)');
  ctx.fillStyle = portal; ctx.fillRect(116, 185, 158, 170);
  panel(ctx, 159, 242, 72, 92, '#7be0b0', 34, '#d1f1c1');
  label(ctx, '第 ' + Math.max(1, game.level) + ' 关', 195, 163, 14, UI.text);
  label(ctx, game.levelConfig ? game.levelConfig.name : '晨光草坡', 195, 182, 12, '#c5e2bd');
  // 前景平台和小队，给主界面一个可以承载角色的舞台。
  polygon(ctx, [[42, 390], [194, 346], [350, 390], [350, 439], [42, 439]], '#315444');
  polygon(ctx, [[42, 390], [194, 356], [350, 390], [194, 416]], '#5e7d5a');
  drawChest(ctx, 78, 388, '#7e9bc0');
  drawChest(ctx, 312, 388, '#b27a50');
  drawGuardian(ctx, 160, 370, 0, false, game.time, Infinity, -0.6, 2, 0.58);
  drawGuardian(ctx, 214, 370, 2, false, game.time, Infinity, -0.6, 1, 0.58);
  drawMonster(ctx, { x: 115, y: 384, kind: 0, hp: 100, maxHp: 100, slow: 0, progress: 0 }, game.time, 0.55);
  drawMonster(ctx, { x: 270, y: 384, kind: 1, hp: 100, maxHp: 100, slow: 0, progress: 0 }, game.time, 0.55);
  ctx.restore();
}

function drawMiniMap(ctx, level, x, y, width, height, locked) {
  panel(ctx, x + 2, y + 3, width, height, UI.woodDark, 9, null);
  panel(ctx, x, y, width, height, locked ? '#3a4545' : '#47715a', 9, '#91714c');
  if (!locked) {
    const cellW = width / (GRID.cols + 1);
    const cellH = height / (GRID.rows + 1);
    const points = level.roadCells.map(([col, row]) => [
      x + (col + 1) * cellW,
      y + (row + 1) * cellH
    ]);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach(([px, py], index) => index === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py));
    ctx.strokeStyle = '#745f4a';
    ctx.lineWidth = Math.max(8, width * 0.16);
    ctx.stroke();
    ctx.strokeStyle = '#e7c985';
    ctx.lineWidth = Math.max(4, width * 0.085);
    ctx.stroke();
    ctx.restore();
    circle(ctx, points[0][0], points[0][1], 4, '#d77d66');
    circle(ctx, points[points.length - 1][0], points[points.length - 1][1], 4, '#77c28c');
  } else {
    circle(ctx, x + width / 2, y + height / 2, 13, '#64706b');
    label(ctx, '锁', x + width / 2, y + height / 2 + 6, 14, '#d0d3bd');
  }
}

function drawLevelCard(ctx, level, x, y, width, height, locked) {
  uiPanel(ctx, x, y, width, height, locked ? '#303b40' : UI.panel, 16);
  drawMiniMap(ctx, level, x + 9, y + 11, 55, 86, locked);
  label(ctx, level.name, x + 74, y + 27, 15, locked ? '#8c9690' : UI.text, 'left');
  label(ctx, level.subtitle.split('·')[0], x + 74, y + 47, 10, locked ? '#718078' : UI.muted, 'left');
  label(ctx, `${level.waves} 波`, x + 74, y + 69, 12, locked ? '#718078' : UI.gold, 'left');
  label(ctx, locked ? '完成前关卡解锁' : '可挑战', x + 74, y + 88, 10,
    locked ? '#718078' : '#9bd19b', 'left');
}

function drawLevelMapPreview(ctx, level, x, y, width, height) {
  uiPanel(ctx, x, y, width, height, '#2b5147', 20);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 2, y + 2, width - 4, height - 4);
  ctx.clip();
  const terrain = ctx.createLinearGradient(0, y, 0, y + height);
  terrain.addColorStop(0, level.color);
  terrain.addColorStop(1, '#47745b');
  ctx.fillStyle = terrain;
  ctx.fillRect(x, y, width, height);
  for (let i = 0; i < 8; i++) {
    drawTree(ctx, x + 24 + (i * 57) % (width - 40), y + 92 + (i * 41) % Math.max(80, height - 100),
      0.34 + (i % 3) * 0.06, i % 2 ? '#2d5a4b' : '#396b51');
  }
  const points = level.roadCells.map(([col, row]) => [
    x + 28 + (col / (GRID.cols - 1)) * (width - 56),
    y + 45 + (row / (GRID.rows - 1)) * (height - 70)
  ]);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  points.forEach(([px, py], index) => index === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py));
  ctx.strokeStyle = '#806346';
  ctx.lineWidth = 24;
  ctx.stroke();
  ctx.strokeStyle = '#e9ca87';
  ctx.lineWidth = 17;
  ctx.stroke();
  circle(ctx, points[0][0], points[0][1], 10, '#c66e61');
  circle(ctx, points[points.length - 1][0], points[points.length - 1][1], 11, '#6dbf8b');
  for (let i = 2; i < points.length - 2; i += Math.max(5, Math.floor(points.length / 5))) {
    circle(ctx, points[i][0] + 9, points[i][1] - 8, 5, '#f5e5a4');
    ctx.strokeStyle = '#7e6747';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  uiPanel(ctx, x + 14, y + 13, 154, 35, '#315144', 11);
  label(ctx, level.name, x + 25, y + 36, 16, UI.text, 'left');
  label(ctx, `${level.waves} 波 · ${level.subtitle.split('·')[0]}`, x + width - 18, y + 36, 11, '#fff0bf', 'right');
  ctx.restore();
}

function drawMainMenu(ctx, game) {
  const gradient = ctx.createLinearGradient(0, 0, 0, game.h);
  gradient.addColorStop(0, '#111c2d');
  gradient.addColorStop(0.65, UI.background);
  gradient.addColorStop(1, '#101923');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, game.w, game.h);
  // 顶部头像与资源条，采用参考图里的横向木牌布局。
  uiPanel(ctx, 10, 10, 370, 76, UI.panel, 16);
  circle(ctx, 45, 48, 27, '#304f4e');
  ctx.strokeStyle = UI.gold; ctx.lineWidth = 3; ctx.stroke();
  drawGuardian(ctx, 45, 58, game.profile.avatarType || 2, false, game.time, Infinity, -0.55, 3, 0.44);
  circle(ctx, 66, 27, 6, UI.red);
  label(ctx, '!', 66, 31, 9, '#fff6d1');
  label(ctx, game.profile.name || '守卫学徒', 80, 37, 16, UI.text, 'left');
  label(ctx, 'Lv.' + (game.profile.level || 1) + '  小镇守护者', 80, 61, 11, UI.muted, 'left');
  resourcePill(ctx, 164, 18, 69, '金', game.wallet.coins, UI.gold);
  resourcePill(ctx, 239, 18, 69, '钻', game.wallet.gems, UI.blue);
  resourcePill(ctx, 314, 18, 59, '能', '100', '#8bd19a');
  label(ctx, '今日任务：守住一波敌人', 164, 73, 10, UI.muted, 'left');
  drawTownScene(ctx, game);
  uiPanel(ctx, 92, 111, 206, 36, UI.wood, 12);
  label(ctx, '守护小镇', 195, 136, 19, UI.text);
  const sceneButtons = homeButtonLayout(game.h).filter(button => button.featured);
  const challenge = sceneButtons[0];
  const expedition = sceneButtons[1];
  uiPanel(ctx, challenge.x, challenge.y, challenge.width, challenge.height, '#b86e3d', 16);
  label(ctx, '⚔', challenge.x + 26, challenge.y + 40, 24, '#fff1b0');
  label(ctx, '挑战', challenge.x + 92, challenge.y + 28, 20, UI.text);
  label(ctx, '守护小镇', challenge.x + 92, challenge.y + 49, 11, '#ffe3a1');
  uiPanel(ctx, expedition.x, expedition.y, expedition.width, expedition.height, '#3b6370', 16);
  label(ctx, '✦', expedition.x + expedition.width / 2, expedition.y + 27, 19, '#d4f2ff');
  label(ctx, '合作', expedition.x + expedition.width / 2, expedition.y + 49, 13, UI.text);
  const navButtons = homeButtonLayout(game.h).filter(button => button.nav);
  uiPanel(ctx, 6, game.h - 73, 378, 67, UI.panelDeep, 12);
  navButtons.forEach(button => {
    const active = button.navLabel === '主线';
    circle(ctx, button.x + button.width / 2, button.y + 19, active ? 16 : 13, active ? '#657a4e' : '#334653');
    ctx.strokeStyle = active ? UI.gold : '#637d78'; ctx.lineWidth = 1.5; ctx.stroke();
    label(ctx, button.icon, button.x + button.width / 2, button.y + 24, active ? 14 : 11, active ? UI.gold : UI.muted);
    label(ctx, button.navLabel, button.x + button.width / 2, button.y + 47, 10, active ? UI.gold : UI.muted);
  });
  uiPanel(ctx, 20, 466, 102, 30, '#335849', 10);
  drawChest(ctx, 39, 481, '#7e9bc0');
  label(ctx, '挂机奖励', 79, 486, 11, '#ffe29a');
  circle(ctx, 113, 469, 5, '#d66c58');
}

function drawFeature(ctx, game) {
  ctx.fillStyle = UI.background;
  ctx.fillRect(0, 0, game.w, game.h);
  uiPanel(ctx, 14, 18, 362, 66, UI.panel, 18);
  backArrow(ctx, 35, 51);
  label(ctx, '功能预览', 195, 57, 24, UI.text);
  uiPanel(ctx, 26, 130, 338, 390, UI.panel, 24);
  circle(ctx, 195, 222, 55, UI.panelGreen);
  ctx.strokeStyle = UI.gold; ctx.lineWidth = 2; ctx.stroke();
  const title = { summon: '英雄抽取', expedition: '远征', shop: '商城', warehouse: '仓库' }[game.feature] || '功能';
  const desc = {
    summon: '收集不同职业的英雄，组成你的守卫队伍。',
    expedition: '派遣闲置英雄远征，离线也能带回奖励。',
    shop: '未来可购买外观、资源和限时礼包。',
    warehouse: '查看已获得的英雄、装备和装饰。'
  }[game.feature] || '更多城镇功能正在准备中。';
  label(ctx, title, 195, 315, 28, UI.text);
  label(ctx, desc, 195, 350, 14, UI.muted);
  label(ctx, '即将开放', 195, 410, 22, UI.gold);
  label(ctx, '入口和资源结构已经预留，后续可以接入正式内容。', 195, 440, 12, UI.muted);
  uiPanel(ctx, 64, 566, 262, 55, UI.panelGreen, 16);
  label(ctx, '返回大厅', 195, 601, 18, UI.text);
}

function drawLevelSelect(ctx, game) {
  const gradient = ctx.createLinearGradient(0, 0, 0, game.h);
  gradient.addColorStop(0, '#142334');
  gradient.addColorStop(1, '#24352f');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, game.w, game.h);
  uiPanel(ctx, 14, 16, 362, 70, UI.panel, 18);
  backArrow(ctx, 35, 51);
  label(ctx, '选择守护地图', 63, 48, 22, UI.text, 'left');
  label(ctx, '完成前一关后解锁下一张地图', 63, 68, 11, UI.muted, 'left');
  resourcePill(ctx, 256, 23, 55, '金', game.wallet.coins, UI.gold);
  resourcePill(ctx, 317, 23, 51, '钻', game.wallet.gems, UI.blue);
  uiPanel(ctx, 14, 102, 362, 27, '#385b4d', 10);
  label(ctx, `已解锁 ${game.unlockedLevel}/${LEVELS.length} 张地图`, 195, 121, 12, '#d7edc0');
  LEVELS.forEach((level, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 20 + col * 180;
    const y = 143 + row * 124;
    const locked = level.id > game.unlockedLevel;
    drawLevelCard(ctx, level, x, y, 165, 108, locked);
  });
  const preview = LEVELS[Math.min(Math.max(0, game.level - 1), LEVELS.length - 1)];
  drawLevelMapPreview(ctx, preview, 14, 402, 362, Math.max(185, Math.min(300, game.h - 420)));
}

function drawOverlay(ctx, game) {
  const center = game.h / 2;
  ctx.fillStyle = 'rgba(41,65,47,0.65)';
  ctx.fillRect(0, 0, game.w, game.h);
  backArrow(ctx, 28, 50);
  label(ctx, '退出副本', 52, 55, 12, UI.text, 'left');
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

function drawWaveProgress(ctx, game) {
  const x = 18; const y = 127; const width = 354; const height = 11;
  const total = Math.max(1, game.waveTotal || 1);
  const spawned = Math.max(0, total - (game.pending || 0));
  panel(ctx, x, y, width, height, '#1d3038', 6, null);
  panel(ctx, x + 2, y + 2, Math.max(3, (width - 4) * Math.min(1, spawned / total)), height - 4,
    game.wave === game.levelConfig.waves ? '#d78862' : '#77bc7e', 5, null);
  (game.waveMarkers || []).forEach(marker => {
    const markerX = x + (marker.index / total) * width;
    const reached = spawned > marker.index;
    circle(ctx, markerX, y + height / 2, 9, reached ? '#d4a54d' : '#314d53');
    ctx.strokeStyle = reached ? '#fff0a5' : '#9cae8e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    label(ctx, marker.kind === 'boss' ? '王' : '精', markerX, y + 15, 8, reached ? '#fff8d1' : '#d7e3ba');
  });
  label(ctx, game.wave ? `${spawned}/${total}` : '准备', 195, 137, 9, UI.text);
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
  uiPanel(ctx, 14, 17, 362, 62, UI.panel, 18);
  backArrow(ctx, 30, 48);
  label(ctx, '口袋守卫', 57, 45, 23, UI.text, 'left');
  label(ctx, `${game.levelConfig.name} · ${game.levelConfig.subtitle}`, 57, 66, 11, UI.muted, 'left');
  label(ctx, '最佳 ' + game.best + ' 波', 356, 45, 11, UI.gold, 'right');
  ['生命 ' + game.hp, '金币 ' + game.coins,
    '波次 ' + game.wave + '/' + game.levelConfig.waves].forEach((value, index) => {
    uiPanel(ctx, 16 + index * 122, 91, 114, 33, [UI.red, '#806a32', '#356174'][index], 12);
    label(ctx, value, 73 + index * 122, 113, 15, UI.text);
  });
  drawWaveProgress(ctx, game);
  battlefield(ctx, game);
  label(ctx, game.noticeTime > 0 ? game.notice : TYPES[game.selected].description, 195, game.h - 166, 11);
  TYPES.forEach((type, index) => {
    const x = 15 + index * 120;
    uiPanel(ctx, x, game.h - 155, 112, 68, game.selected === index ? '#5e6747' : UI.panel, 12);
    drawGuardian(ctx, x + 24, game.h - 117, index, true);
    label(ctx, type.name, x + 74, game.h - 129, 14, UI.text);
    label(ctx, type.cost + ' 金', x + 74, game.h - 108, 13, game.coins < type.cost ? '#e58b78' : UI.gold);
  });
  if (game.selectedGrass) drawGrassPanel(ctx, game);
  else if (game.selectedTower) drawTowerPanel(ctx, game);
  const ready = game.state === 'ready';
  uiPanel(ctx, 20, game.h - 72, 350, 50, ready ? '#477655' : UI.panelDeep, 14);
  label(ctx, ready ? (game.wave === 0 ? '出发！守护小镇' : '迎接下一波') : '守卫中 · 可继续建造',
    195, game.h - 40, 18, ready ? UI.text : UI.muted);
  if (['upgrade', 'win', 'lose'].includes(game.state)) drawOverlay(ctx, game);
  ctx.restore();
}

module.exports = { drawGame, setGrassImage, setBattleAssets, PALETTE };
