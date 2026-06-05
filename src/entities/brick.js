export const POWERUP_MAP = {
  '1': 'EXTRA_BALL',
  '2': 'EXTEND',
  '3': 'SLOWMO',
  '4': 'MAGNET',
  '5': 'FASTER_BALL',
};

export function isBreakable(type) {
  return type !== 'R';
}

export function getPowerup(type) {
  return POWERUP_MAP[type] ?? null;
}
