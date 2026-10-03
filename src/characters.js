// 原创 Q 版角色：纯 Canvas 矢量绘制，颜色与造型可直接修改。
const OUTLINE = '#394252';
const { attackPose } = require('./animation');
const GUARDIANS = [
  { hair: '#885441', outfit: '#65bc91', accent: '#e9cf81' },
  { hair: '#d58d4f', outfit: '#e49a65', accent: '#5e7185' },
  { hair: '#a9c3ee', outfit: '#819ddc', accent: '#e0f7ff' }
];

function shape(ctx, points, fill) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

function oval(ctx, x, y, rx, ry, fill, outline = true) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

function face(ctx, eyeColor) {
  for (const x of [-6, 6]) {
    oval(ctx, x, -12, 3.4, 4.6, '#ffffff', false);
    oval(ctx, x, -11, 2.2, 3.4, eyeColor, false);
    oval(ctx, x - 0.7, -13, 0.9, 1.2, '#ffffff', false);
    oval(ctx, x * 1.6, -5, 3, 1.7, '#f4b5ac', false);
  }
  ctx.beginPath();
  ctx.moveTo(-2, -4);
  ctx.quadraticCurveTo(0, -1, 3, -4);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function drawGuardian(ctx, x, y, type, small = false, time = 0, attackAge = Infinity, aimAngle = -Math.PI / 4) {
  const colors = GUARDIANS[type];
  const pose = attackPose(type, small ? Infinity : attackAge, aimAngle);
  ctx.save();
  ctx.translate(x, y);
  if (small) ctx.scale(0.62, 0.62);
  oval(ctx, 0, 22, 21, 5, 'rgba(48,75,57,0.2)', false);
  const bob = small ? 0 : Math.sin(time * 3 + type) * 0.7;
  ctx.translate(0, bob);
  // 两头身比例、靴子、外套与腰带。
  oval(ctx, -7, 18, 6, 5, '#5c5865');
  oval(ctx, 7, 18, 6, 5, '#5c5865');
  // 脚固定，上身绕腰旋转，形成后坐、下蹲和施法前倾。
  ctx.translate(0, 13 + pose.crouch);
  ctx.scale(pose.facing, 1);
  ctx.rotate(pose.lean);
  ctx.translate(0, -13);
  shape(ctx, [[-10, -1], [10, -1], [14, 16], [-14, 16]], colors.outfit);
  shape(ctx, [[-8, 1], [0, 7], [8, 1], [4, -2], [-4, -2]], '#fff1db');
  shape(ctx, [[-12, 10], [12, 10], [12, 13], [-12, 13]], '#80634e');
  oval(ctx, 0, 11, 2, 2, colors.accent, false);
  oval(ctx, 0, -16, 18, 19, colors.hair);
  oval(ctx, 0, -12, 15, 15, '#ffe2cb');
  // 不对称刘海，让角色更接近动漫人物。
  shape(ctx, [[-16, -23], [-9, -31], [8, -29], [16, -21], [10, -13],
    [6, -23], [0, -15], [-3, -24], [-10, -15], [-10, -23]], colors.hair);
  face(ctx, type === 2 ? '#627bc0' : '#65594e');
  if (type === 0) {
    shape(ctx, [[-18, -26], [-13, -35], [6, -35], [15, -27]], colors.outfit);
    shape(ctx, [[-18, -26], [18, -26], [13, -22], [-17, -22]], '#4a896a');
    // 长枪与围巾。
    shape(ctx, [[-7, 1], [5, 4], [13 + pose.cloak, 17], [5, 14]], '#e1b454');
    ctx.save();
    ctx.translate(0, 4);
    ctx.rotate(pose.arm);
    ctx.translate(-pose.recoil, -4);
    oval(ctx, -3, 6, 5, 5, '#ffdcc3');
    oval(ctx, 13, 0, 5, 5, '#ffdcc3');
    shape(ctx, [[5, 7], [21, -8], [25, -4], [10, 11]], '#657985');
    shape(ctx, [[17, -6], [23, -12], [28, -7], [23, -2]], '#d4e2df');
    if (pose.flash) {
      shape(ctx, [[25, -12], [28, -25], [32, -17], [42, -22], [35, -11], [39, -6], [29, -8]], '#ffe69a');
      oval(ctx, 29, -12, 3, 3, '#ffffff', false);
    }
    ctx.restore();
  } else if (type === 1) {
    // 工程护目镜、手持短炮与背包。
    oval(ctx, -7, -29, 7, 5, '#5e7185');
    oval(ctx, 7, -29, 7, 5, '#5e7185');
    oval(ctx, -7, -29, 4, 3, '#c2e8f3', false);
    oval(ctx, 7, -29, 4, 3, '#c2e8f3', false);
    ctx.save();
    ctx.translate(-2, 4);
    ctx.rotate(pose.arm);
    ctx.translate(-pose.recoil + 2, -4);
    oval(ctx, -10, 9, 5, 5, '#ffdcc3');
    oval(ctx, 5, 11, 5, 5, '#ffdcc3');
    shape(ctx, [[-17, 3], [9, -1], [12, 11], [-16, 15]], '#657789');
    oval(ctx, 11, 4, 8, 9, '#8196a6');
    oval(ctx, 12, 4, 5, 6, '#2e3d50');
    if (pose.flash) {
      shape(ctx, [[18, -3], [28, -8], [25, 0], [38, 4], [25, 9], [28, 16], [18, 11]], '#ffbd68');
      oval(ctx, 23, 4, 6, 5, '#fff0b6', false);
    }
    if (pose.active) {
      const drift = pose.progress * 17;
      oval(ctx, 22 + drift, -2 - drift, 3 + pose.progress * 5, 3 + pose.progress * 5,
        `rgba(200,207,211,${(1 - pose.progress) * 0.55})`, false);
    }
    ctx.restore();
  } else {
    // 星月尖帽、披风与冰晶法杖。
    shape(ctx, [[-16, -30], [3, -48], [14, -28]], colors.outfit);
    oval(ctx, 0, -28, 22, 5, '#9ebbed');
    shape(ctx, [[0, -40], [2, -36], [6, -35], [2, -33], [1, -29], [-1, -33], [-4, -35], [-1, -36]], '#fff4bd');
    shape(ctx, [[-9, 3], [-20 - pose.cloak, 17], [-12, 16], [-3, 5]], '#b6c9f0');
    oval(ctx, -14, pose.active ? -2 : 5, 5, 5, '#ffdcc3');
    ctx.save();
    ctx.translate(12, 6);
    ctx.rotate(pose.arm);
    ctx.translate(-12, -6);
    oval(ctx, 17, 5, 5, 5, '#ffdcc3');
    shape(ctx, [[19, -15], [22, -15], [22, 20], [19, 20]], '#a18468');
    shape(ctx, [[21, -32], [28, -22], [21, -12], [14, -22]], pose.active ? '#ffffff' : '#b5f0ff');
    oval(ctx, 20, -24, 2, 4, '#ffffff', false);
    if (pose.active) {
      const radius = 9 + Math.sin(pose.progress * Math.PI) * 10;
      oval(ctx, 21, -22, radius, radius, 'rgba(156,231,255,0.3)', false);
      ctx.strokeStyle = '#d9faff';
      ctx.lineWidth = 2;
      ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const angle = i * Math.PI * 2 / 5 + pose.progress * 3;
        oval(ctx, 21 + Math.cos(angle) * radius, -22 + Math.sin(angle) * radius, 2, 2, '#ffffff', false);
      }
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawMonster(ctx, enemy, time) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  const bounce = Math.sin(time * (enemy.kind === 1 ? 12 : 7) + enemy.progress / 25);
  oval(ctx, 0, 16, enemy.kind === 2 ? 19 : 14, 4, 'rgba(83,68,55,0.18)', false);
  ctx.translate(0, bounce * 1.7);
  const color = enemy.slow > 0 ? '#a9e6f6' : ['#d891c0', '#f1bc6b', '#8caf97'][enemy.kind];
  if (enemy.kind === 0) {
    // 软软的史莱姆：水滴头顶、圆润底部和小触角。
    ctx.beginPath();
    ctx.moveTo(-16, 10);
    ctx.bezierCurveTo(-20, -1, -8, -13, -3, -18);
    ctx.quadraticCurveTo(1, -25, 6, -18);
    ctx.bezierCurveTo(12, -13, 22, 1, 16, 11);
    ctx.quadraticCurveTo(0, 19, -16, 10);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    oval(ctx, -6, -8, 4, 2, '#fce7f4', false);
  } else if (enemy.kind === 1) {
    // 疾跑小兽：尖耳、尾巴、爪子。
    shape(ctx, [[12, 6], [23, -1], [21, 10], [12, 13]], '#d99654');
    shape(ctx, [[-14, -6], [-15, -25], [-4, -13]], color);
    shape(ctx, [[4, -13], [15, -25], [14, -6]], color);
    shape(ctx, [[-12, -12], [-12, -21], [-7, -13]], '#f8d5b9');
    shape(ctx, [[7, -13], [12, -21], [12, -12]], '#f8d5b9');
    oval(ctx, -7, 13 + bounce, 5, 4, '#ac7550');
    oval(ctx, 7, 13 - bounce, 5, 4, '#ac7550');
    oval(ctx, 0, 0, 15, 14, color);
    oval(ctx, 0, 6, 8, 6, '#fff0cd', false);
  } else {
    // 重甲独角怪：壮实体型、獠牙和腹部装甲。
    oval(ctx, -10, 16, 7, 5, '#587761');
    oval(ctx, 10, 16, 7, 5, '#587761');
    oval(ctx, -19, 5, 6, 9, color);
    oval(ctx, 19, 5, 6, 9, color);
    oval(ctx, 0, 1, 21, 19, color);
    shape(ctx, [[-6, -14], [0, -29], [7, -13]], '#fff0cc');
    shape(ctx, [[-13, 7], [13, 7], [10, 18], [-10, 18]], '#8b9fab');
    oval(ctx, 0, 12, 3, 3, '#d2dde0', false);
  }
  const eyeY = enemy.kind === 0 ? 1 : -3;
  for (const x of [-6, 6]) {
    oval(ctx, x, eyeY, 4, 5, '#fffdf1', false);
    oval(ctx, x, eyeY + 1, 2, 3, '#3c4657', false);
    oval(ctx, x - 0.6, eyeY - 1, 0.8, 1, '#ffffff', false);
  }
  oval(ctx, 0, eyeY + 9, 5, 3, '#6e4558', false);
  if (enemy.kind === 2) {
    shape(ctx, [[-5, 4], [-2, 9], [0, 4]], '#fff8e2');
    shape(ctx, [[1, 4], [3, 9], [6, 4]], '#fff8e2');
  }
  if (enemy.slow > 0) {
    shape(ctx, [[-18, 6], [-22, 12], [-18, 18], [-14, 12]], '#d7faff');
  }
  const barY = enemy.kind === 2 ? -36 : enemy.kind === 1 ? -32 : -29;
  shape(ctx, [[-18, barY], [18, barY], [18, barY + 5], [-18, barY + 5]], '#fff4df');
  const health = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
  ctx.fillStyle = '#76be80';
  ctx.fillRect(-17, barY + 1, 34 * health, 3);
  ctx.restore();
}

module.exports = { drawGuardian, drawMonster };
