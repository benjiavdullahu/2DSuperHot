export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;
export const PLAYER_SPEED = 400; // pixels per second
export const ENEMY_SPEED = 200;
export const PROJECTILE_SPEED = 600;
export const TIME_SCALE_MOVING = 1.0;
export const TIME_SCALE_STOPPED = 0.05; // 5% speed when stopped

// Simplified projectile types - just visual differences
export const projectileTypes = {
  stapler: { color: '#4444FF', radius: 8 },
  pencil: { color: '#FFAA00', radius: 5 },
  keyboard: { color: '#AA00FF', radius: 10 }
};

// Enemy types with different speeds
export const enemyTypes = {
  intern: { color: '#FF0000', speed: 200, radius: 20 },
  manager: { color: '#CC0000', speed: 150, radius: 25 },
  security: { color: '#990000', speed: 180, radius: 22 },
  janitor: { color: '#FF6600', speed: 250, radius: 18 }
}; 