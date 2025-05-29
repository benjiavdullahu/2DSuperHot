import { Vector2D, Wall, GameData } from './types';

export const getDistance = (a: Vector2D, b: Vector2D): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const checkWallCollision = (pos: Vector2D, radius: number, gameData: GameData): boolean => {
  // Check walls
  for (const wall of gameData.walls) {
    if (pos.x + radius > wall.x && 
        pos.x - radius < wall.x + wall.width &&
        pos.y + radius > wall.y && 
        pos.y - radius < wall.y + wall.height) {
      return true;
    }
  }
  
  return false;
};

export const checkWallCollisionSeparate = (pos: Vector2D, radius: number, gameData: GameData): { x: boolean, y: boolean } => {
  let collisionX = false;
  let collisionY = false;
  
  for (const wall of gameData.walls) {
    // Check X collision
    if (pos.x + radius > wall.x && pos.x - radius < wall.x + wall.width) {
      if (gameData.player && 
          gameData.player.position.y + radius > wall.y && 
          gameData.player.position.y - radius < wall.y + wall.height) {
        collisionX = true;
      }
    }
    
    // Check Y collision
    if (pos.y + radius > wall.y && pos.y - radius < wall.y + wall.height) {
      if (gameData.player && 
          gameData.player.position.x + radius > wall.x && 
          gameData.player.position.x - radius < wall.x + wall.width) {
        collisionY = true;
      }
    }
  }
  
  return { x: collisionX, y: collisionY };
};

export const generateOfficeLayout = () => {
  const walls: Wall[] = [];
  
  // Outer walls only
  const mapSize = 1600;
  walls.push(
    { x: -mapSize/2, y: -mapSize/2, width: mapSize, height: 20 },
    { x: -mapSize/2, y: mapSize/2 - 20, width: mapSize, height: 20 },
    { x: -mapSize/2, y: -mapSize/2, width: 20, height: mapSize },
    { x: mapSize/2 - 20, y: -mapSize/2, width: 20, height: mapSize }
  );
  
  // Strategic pillars and walls for cover
  const pillars = [
    { x: -200, y: -200, width: 60, height: 60 },
    { x: 200, y: -200, width: 60, height: 60 },
    { x: -200, y: 200, width: 60, height: 60 },
    { x: 200, y: 200, width: 60, height: 60 },
    { x: 0, y: 0, width: 80, height: 80 },
    
    // Some walls for cover
    { x: -400, y: -50, width: 200, height: 20 },
    { x: 400, y: -50, width: 200, height: 20 },
    { x: -50, y: -400, width: 20, height: 200 },
    { x: -50, y: 400, width: 20, height: 200 },
  ];
  
  walls.push(...pillars);
  
  return { walls };
}; 