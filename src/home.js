// 城镇大厅的入口配置。功能先统一挂到这里，后续接入抽卡、商城或支付时不必改主页面布局。
const HOME_FEATURES = [
  { id: 'guardian', name: '守护小镇', subtitle: '进入副本', color: '#79bd72', icon: '盾', featured: true },
  { id: 'summon', name: '英雄抽取', subtitle: '招募新守卫', color: '#d9a3d0', icon: '召' },
  { id: 'expedition', name: '远征', subtitle: '派遣队伍', color: '#e5bc75', icon: '远' },
  { id: 'shop', name: '商城', subtitle: '道具与礼包', color: '#e79882', icon: '商' },
  { id: 'warehouse', name: '仓库', subtitle: '查看收藏', color: '#8bb5d7', icon: '库' }
];

function homeButtonLayout(height) {
  const navY = height - 66;
  return [
    { ...HOME_FEATURES[0], x: 55, y: 516, width: 170, height: 62, featured: true },
    { ...HOME_FEATURES[2], x: 232, y: 516, width: 103, height: 62, featured: true },
    { ...HOME_FEATURES[4], x: 8, y: navY, width: 72, height: 56, nav: true, navLabel: '主角' },
    { ...HOME_FEATURES[1], x: 84, y: navY, width: 72, height: 56, nav: true, navLabel: '英雄' },
    { ...HOME_FEATURES[0], x: 160, y: navY, width: 72, height: 56, nav: true, navLabel: '主线' },
    { ...HOME_FEATURES[3], x: 236, y: navY, width: 72, height: 56, nav: true, navLabel: '城市' },
    { ...HOME_FEATURES[2], x: 312, y: navY, width: 72, height: 56, nav: true, navLabel: '公会' }
  ];
}

function hitHomeButton(x, y, height) {
  return homeButtonLayout(height).find(button =>
    x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height);
}

module.exports = { HOME_FEATURES, homeButtonLayout, hitHomeButton };
