// 地图道路使用格子坐标，绘制、建造约束和敌人移动共享同一份数据。
const { GRID } = require('./levels');

function createPath(roadCells, layout = GRID, top = layout.top, cellHeight = layout.maxHeight / layout.rows) {
  const cellWidth = layout.width / layout.cols;
  const center = ([col, row]) => ({
    x: layout.left + (col + 0.5) * cellWidth,
    y: top + (row + 0.5) * cellHeight
  });
  const anchors = roadCells.map(center);
  const first = { x: anchors[0].x, y: top - 24 };
  const last = { x: anchors[anchors.length - 1].x, y: top + layout.rows * cellHeight + 24 };
  const controlPoints = [first, ...anchors, last];
  const points = [];
  const sampleCount = 6;
  // Catmull-Rom 采样把直角路口变成圆润的连续道路，同时保留每个地图的原始路径顺序。
  for (let i = 0; i < controlPoints.length - 1; i++) {
    const p0 = controlPoints[Math.max(0, i - 1)];
    const p1 = controlPoints[i];
    const p2 = controlPoints[i + 1];
    const p3 = controlPoints[Math.min(controlPoints.length - 1, i + 2)];
    for (let step = 0; step < sampleCount; step++) {
      const t = step / sampleCount;
      const t2 = t * t;
      const t3 = t2 * t;
      points.push({
        x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
      });
    }
  }
  points.push(last);
  return points;
}

function pathLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

// 消耗完整移动距离，即使一帧跨过多个拐点也不会切角或停顿。
function advanceEnemy(enemy, points, distance) {
  while (distance > 0 && enemy.segment < points.length - 1) {
    const next = points[enemy.segment + 1];
    const dx = next.x - enemy.x;
    const dy = next.y - enemy.y;
    const remaining = Math.hypot(dx, dy);
    if (remaining <= distance) {
      enemy.x = next.x;
      enemy.y = next.y;
      enemy.progress += remaining;
      enemy.segment++;
      distance -= remaining;
    } else {
      enemy.x += dx / remaining * distance;
      enemy.y += dy / remaining * distance;
      enemy.progress += distance;
      distance = 0;
    }
  }
  return enemy.segment === points.length - 1;
}

module.exports = { createPath, pathLength, advanceEnemy };
