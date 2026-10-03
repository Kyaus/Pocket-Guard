// 城镇大厅的入口配置。功能先统一挂到这里，后续接入抽卡、商城或支付时不必改主页面布局。
const HOME_FEATURES = [
  { id: 'guardian', name: '守护小镇', subtitle: '进入副本', color: '#79bd72', icon: '盾', featured: true },
  { id: 'summon', name: '英雄抽取', subtitle: '招募新守卫', color: '#d9a3d0', icon: '召' },
  { id: 'expedition', name: '远征', subtitle: '派遣队伍', color: '#e5bc75', icon: '远' },
  { id: 'shop', name: '商城', subtitle: '道具与礼包', color: '#e79882', icon: '商' },
  { id: 'warehouse', name: '仓库', subtitle: '查看收藏', color: '#8bb5d7', icon: '库' }
];

function homeButtonLayout(height) {
  const top = 340;
  const cardWidth = 172;
  const cardHeight = 78;
  const gapX = 18;
  const gapY = 12;
  return HOME_FEATURES.map((feature, index) => {
    if (index === 0) {
      return { ...feature, x: 18, y: top, width: 354, height: 96 };
    }
    const col = index % 2;
    const row = Math.floor((index - 1) / 2);
    return { ...feature, x: 18 + (index % 2 === 1 ? 0 : cardWidth + gapX),
      y: top + 96 + gapY + row * (cardHeight + gapY), width: cardWidth, height: cardHeight };
  });
}

function hitHomeButton(x, y, height) {
  return homeButtonLayout(height).find(button =>
    x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height);
}

module.exports = { HOME_FEATURES, homeButtonLayout, hitHomeButton };
