// 动作时间独立于攻击冷却；加速升级不会改变动画播放速度。
const ATTACK_DURATION = [0.32, 0.55, 0.65];

function attackPose(type, age = Infinity, aimAngle = -Math.PI / 4) {
  const duration = ATTACK_DURATION[type];
  const active = age >= 0 && age < duration;
  const progress = active ? age / duration : 1;
  const kick = active ? Math.exp(-progress * 5) * Math.sin((progress * 0.85 + 0.15) * Math.PI) : 0;
  const swing = active ? Math.sin(progress * Math.PI) : 0;
  const facing = Math.cos(aimAngle) < 0 ? -1 : 1;
  const localAngle = facing < 0 ? Math.atan2(Math.sin(aimAngle), -Math.cos(aimAngle)) : aimAngle;
  return {
    active, progress, facing, flash: active && age < (type === 0 ? 0.09 : 0.14),
    lean: active ? (type === 2 ? -swing * 0.14 : -kick * (type === 1 ? 0.2 : 0.12)) : 0,
    crouch: type === 1 ? kick * 4 : type === 2 ? -swing * 3 : kick * 1.5,
    arm: type === 2 ? -swing * 0.8 : localAngle + (type === 0 ? Math.PI / 4 : 0) - kick * 0.12,
    recoil: kick * (type === 1 ? 6 : 3),
    cloak: swing * 6
  };
}

module.exports = { ATTACK_DURATION, attackPose };
