import { BALL_SPEED, SLOWMO_FACTOR, SLOWMO_SECONDS, EXTEND_SECONDS,
         MAGNET_SECONDS, FASTER_BALL_FACTOR, FASTER_BALL_SECONDS } from './config.js';

export function createPowerupState() {
  return { extend: 0, slowmo: 0, magnet: 0, faster: 0 };
}

export function activatePowerup(puState, type) {
  if (type === 'EXTEND')      puState.extend = EXTEND_SECONDS;
  if (type === 'SLOWMO')      puState.slowmo = SLOWMO_SECONDS;
  if (type === 'MAGNET')      puState.magnet = MAGNET_SECONDS;
  if (type === 'FASTER_BALL') puState.faster = FASTER_BALL_SECONDS;
}

export function tickPowerups(puState, dt) {
  if (puState.extend > 0) puState.extend = Math.max(0, puState.extend - dt);
  if (puState.slowmo > 0) puState.slowmo = Math.max(0, puState.slowmo - dt);
  if (puState.magnet > 0) puState.magnet = Math.max(0, puState.magnet - dt);
  if (puState.faster > 0) puState.faster = Math.max(0, puState.faster - dt);
}

export function resetPowerups(puState) {
  puState.extend = 0;
  puState.slowmo = 0;
  puState.magnet = 0;
  puState.faster = 0;
}

export function getCurrentSpeed(puState) {
  let speed = BALL_SPEED;
  if (puState.slowmo > 0) speed *= SLOWMO_FACTOR;
  if (puState.faster > 0) speed *= FASTER_BALL_FACTOR;
  return speed;
}

export function isMagnetActive(puState) { return puState.magnet > 0; }
export function isExtendActive(puState) { return puState.extend > 0; }
