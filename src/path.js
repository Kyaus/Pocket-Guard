// 地图道路使用格子坐标，绘制、建造约束和敌人移动共享同一份数据。
const { GRID } = require('./levels');

function createPath(roadCells, layout = GRID, top = layout.top, cellHeight = layout.maxHeight / layout.rows) {
  const cellWidth = layout.width / layout.cols;
  const center = ([col, row]) => ({
    x: layout.left + (col + 0.5) * cellWidth,
    y: top + (row + 0.5) * cellHeight
  });
  const points = roadCells.map(center);
  return [{ x: points[0].x, y: top - 18 }, ...points,
    { x: points[points.length - 1].x, y: top + layout.rows * cellHeight + 20 }];
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
