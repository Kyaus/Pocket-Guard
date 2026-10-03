const { TYPES } = require('./config');
const { drawGuardian, drawMonster } = require('./characters');

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
  panel(ctx, 14, game.top - 8, 362, game.bottom - game.top + 44, PALETTE.grass, 18);
  ctx.save();
  ctx.beginPath();
  ctx.rect(16, game.top - 6, 358, game.bottom - game.top + 39);
  ctx.clip();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [width, color] of [[48, '#bda574'], [42, PALETTE.path]]) {
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
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const x = 55 + col * 70;
      const y = game.top + (row + 0.5) * game.cellH;
      if (game.roadCells.some(([c, r]) => c === col && r === row)) {
        panel(ctx, x - 11, y - 5, 22, 9, '#dfbd7e', 4, null);
      } else {
        panel(ctx, x - 27, y - 22, 54, 44, (row + col) % 2 ? '#a9d078' : '#b4d982', 12, '#90b66b');
        if (!game.towers.some(t => t.col === col && t.row === row)) {
          label(ctx, '+', x, y + 7, 23, '#719752');
        }
        // 花草位置由格子索引决定，避免每帧随机造成闪烁。
        circle(ctx, x + 24, y + 24, 2, (row + col) % 3 ? '#f9f1b9' : '#f5a6ab', false);
      }
    }
  }
  panel(ctx, 297, game.bottom + 1, 76, 29, '#fff1c6', 5);
  panel(ctx, 293, game.bottom - 4, 84, 10, '#ea977d', 3);
  panel(ctx, 327, game.bottom + 12, 16, 18, '#a07d57', 3);
  game.towers.forEach(t => {
    drawGuardian(ctx, t.x, t.y, t.type, false, game.time, t.attackAge, t.aimAngle);
  });
  // 将入口处的怪物和血条限制在战场内，避免遮住顶部状态栏。
  ctx.save();
  ctx.beginPath();
  ctx.rect(16, game.top - 6, 358, game.bottom - game.top + 37);
  ctx.clip();
  game.enemies.forEach(e => drawMonster(ctx, e, game.time));
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

function drawOverlay(ctx, game) {
  const center = game.h / 2;
  ctx.fillStyle = 'rgba(41,65,47,0.65)';
  ctx.fillRect(0, 0, game.w, game.h);
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
  panel(ctx, 65, center + 44, 260, 60, PALETTE.shadow);
  panel(ctx, 65, center + 40, 260, 60, PALETTE.green);
  label(ctx, '再挑战一次', 195, center + 77, 20, '#fffbea');
}

function drawGame(ctx, game) {
  ctx.save();
  ctx.fillStyle = '#edf4d9';
  ctx.fillRect(0, 0, game.w, game.h);
  panel(ctx, 14, 17, 362, 62, PALETTE.cream, 18);
  label(ctx, '口袋守卫', 31, 45, 25, PALETTE.ink, 'left');
  label(ctx, '森林小镇 · 塔防冒险', 32, 66, 12, PALETTE.muted, 'left');
  label(ctx, '最佳 ' + game.best + ' 波', 356, 51, 13, '#869155', 'right');
  ['生命 ' + game.hp, '金币 ' + game.coins, '波次 ' + game.wave + '/10'].forEach((value, index) => {
    panel(ctx, 16 + index * 122, 91, 114, 33, ['#ffe0d6', '#ffedaf', '#dcebc7'][index], 12);
    label(ctx, value, 73 + index * 122, 113, 15);
  });
  battlefield(ctx, game);
  label(ctx, game.noticeTime > 0 ? game.notice : TYPES[game.selected].description, 195, game.h - 166, 12);
  TYPES.forEach((type, index) => {
    const x = 15 + index * 120;
    panel(ctx, x, game.h - 152, 112, 68, '#c0c89d', 12, null);
    panel(ctx, x, game.h - 155, 112, 68, game.selected === index ? '#fff0b6' : PALETTE.cream, 12, game.selected === index ? '#cb9a43' : '#a0b17d');
    drawGuardian(ctx, x + 24, game.h - 117, index, true);
    label(ctx, type.name, x + 74, game.h - 129, 14);
    label(ctx, type.cost + ' 金', x + 74, game.h - 108, 13, game.coins < type.cost ? '#bd705d' : '#997337');
  });
  const ready = game.state === 'ready';
  panel(ctx, 20, game.h - 68, 350, 50, ready ? PALETTE.shadow : '#9aa88b');
  panel(ctx, 20, game.h - 72, 350, 50, ready ? PALETTE.green : '#c9d6b5');
  label(ctx, ready ? (game.wave === 0 ? '出发！守护小镇' : '迎接下一波') : '守卫中 · 可继续建造', 195, game.h - 40, 18, ready ? '#fffbea' : '#63755b');
  if (['upgrade', 'win', 'lose'].includes(game.state)) drawOverlay(ctx, game);
  ctx.restore();
}

module.exports = { drawGame, PALETTE };
