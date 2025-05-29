export interface Vector2D {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  moveDirection: Vector2D;
  radius: number;
  color: string;
  health: number;
  maxHealth: number;
  isMoving: boolean;
  shootCooldown?: number;
}

export interface Enemy {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  color: string;
  health?: number;
  maxHealth?: number;
  target: Vector2D;
  shootCooldown: number;
  aiState: 'idle' | 'chasing' | 'attacking';
  type?: string;
  shotgunner?: boolean;
}

export interface Projectile {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  color: string;
  damage: number;
  owner: string;
  type?: string;
}

export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameData {
  player: Player | null;
  enemies: Enemy[];
  projectiles: Projectile[];
  walls: Wall[];
  particles: Particle[];
  camera: { x: number; y: number };
  keys: { [key: string]: boolean };
  mouse: { x: number; y: number; isDown: boolean };
  lastTime: number;
  gameStartTime: number;
  shootTimeBurst?: number;
  currentTimeScale?: number;
  levelStarted?: boolean;
} 