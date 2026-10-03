const { Game } = require('./src/game');
const canvas = wx.createCanvas();
const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
const ratio = Math.min(info.pixelRatio || 1, 3);
canvas.width = Math.round(info.windowWidth * ratio);
canvas.height = Math.round(info.windowHeight * ratio);
const ctx = canvas.getContext('2d');
const scale = info.windowWidth / 390;
ctx.scale(ratio * scale, ratio * scale);
const game = new Game(390, info.windowHeight / scale, {
  readBest: () => { try { return Number(wx.getStorageSync('guardian-best')) || 0; } catch (_) { return 0; } },
  saveBest: value => { try { wx.setStorageSync('guardian-best', value); } catch (_) {} }
});
wx.onTouchStart(event => {
  const touch = event.touches[0];
  if (touch) game.touch(touch.clientX / scale, touch.clientY / scale);
});
let last = 0;
let visible = true;
wx.onHide(() => { visible = false; last = 0; });
wx.onShow(() => { visible = true; last = 0; });
function frame(time) {
  const now = typeof time === 'number' ? time : Date.now();
  const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
  last = now;
  if (visible) game.update(dt);
  game.draw(ctx);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
