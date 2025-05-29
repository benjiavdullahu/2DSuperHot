"use client";

import React, { useEffect, useRef, useState } from "react";
import { GameData, Player, Enemy, Projectile, Particle } from "./types";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  TIME_SCALE_MOVING,
  TIME_SCALE_STOPPED,
  PLAYER_SPEED,
  projectileTypes,
  enemyTypes,
  PROJECTILE_SPEED,
} from "./constants";
import {
  getDistance,
  checkWallCollision,
  checkWallCollisionSeparate,
  generateOfficeLayout,
} from "./utils";

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<
    "menu" | "playing" | "gameOver" | "levelComplete" | "dying"
  >("menu");
  const [score, setScore] = useState(0);
  const [timeScale, setTimeScale] = useState(1);
  const [level, setLevel] = useState(1);
  const [enemiesKilled, setEnemiesKilled] = useState(0);

  const gameDataRef = useRef<GameData>({
    player: null,
    enemies: [],
    projectiles: [],
    walls: [],
    particles: [],
    camera: { x: 0, y: 0 },
    keys: {},
    mouse: { x: 0, y: 0, isDown: false },
    lastTime: 0,
    gameStartTime: 0,
    shootTimeBurst: 0,
    levelStarted: false,
    currentTimeScale: 1,
  });

  // Initialize game
  const initGame = () => {
    const data = gameDataRef.current;

    // Reset level started flag
    data.levelStarted = false;

    // Create player
    data.player = {
      id: "player",
      position: { x: 0, y: 300 },
      velocity: { x: 0, y: 0 },
      moveDirection: { x: 0, y: 0 },
      radius: 20,
      color: "#000000",
      health: 100,
      maxHealth: 100,
      isMoving: false,
      shootCooldown: 0,
    };

    // Generate layout
    const layout = generateOfficeLayout();
    data.walls = layout.walls;

    // Ensure player isn't stuck
    let safeSpawn = false;
    let attempts = 0;
    while (!safeSpawn && attempts < 50) {
      if (
        !checkWallCollision(data.player.position, data.player.radius + 10, data)
      ) {
        safeSpawn = true;
      } else {
        data.player.position.x = -200 + Math.random() * 400;
        data.player.position.y = -200 + Math.random() * 400;
      }
      attempts++;
    }

    // Spawn enemies for current level
    spawnLevelEnemies(level);
    data.gameStartTime = Date.now();
    data.lastTime = Date.now();
  };

  // Spawn enemies for level
  const spawnLevelEnemies = (currentLevel: number) => {
    const baseCount = 3;
    const enemyCount = baseCount + currentLevel * 2;

    // For level 4, ensure first 5 enemies are shotgunners
    if (currentLevel === 4) {
      // Spawn 5 shotgun enemies first
      for (let i = 0; i < 5; i++) {
        setTimeout(() => spawnEnemy(currentLevel, true), i * 200);
      }
      // Then spawn the remaining regular enemies
      for (let i = 5; i < enemyCount; i++) {
        setTimeout(() => spawnEnemy(currentLevel, false), i * 200);
      }
    } else {
      // Normal spawning for other levels
      for (let i = 0; i < enemyCount; i++) {
        setTimeout(() => spawnEnemy(currentLevel), i * 200);
      }
    }
  };

  // Spawn enemy
  const spawnEnemy = (currentLevel: number, forceShotgunner?: boolean) => {
    const data = gameDataRef.current;
    if (!data.player) return;

    // Mark that enemies have been spawned for this level
    data.levelStarted = true;

    // Level-based enemy variety
    let types: (keyof typeof enemyTypes)[] = ["intern"];
    if (currentLevel >= 2) types.push("manager");
    if (currentLevel >= 3) types.push("security");
    if (currentLevel >= 4) types.push("janitor");

    const type = types[Math.floor(Math.random() * types.length)];
    const enemyData = enemyTypes[type];

    // Map boundaries (from generateOfficeLayout)
    const mapBoundary = 800 - 50; // 800 is half of mapSize, subtract 50 for safety margin

    // Try multiple times to find a valid spawn position
    let validPosition = null;
    let attempts = 0;
    const maxAttempts = 50;

    while (!validPosition && attempts < maxAttempts) {
      const angle = Math.random() * Math.PI * 2;
      // Reduce spawn distance for higher levels to avoid going outside bounds
      const minDistance = Math.max(200, 300 - currentLevel * 20);
      const maxDistance = Math.max(300, 400 - currentLevel * 20);
      const distance =
        minDistance + Math.random() * (maxDistance - minDistance);

      const testPosition = {
        x: data.player.position.x + Math.cos(angle) * distance,
        y: data.player.position.y + Math.sin(angle) * distance,
      };

      // Check map boundaries
      if (
        Math.abs(testPosition.x) > mapBoundary ||
        Math.abs(testPosition.y) > mapBoundary
      ) {
        attempts++;
        continue;
      }

      // Check if position is clear of walls
      if (!checkWallCollision(testPosition, enemyData.radius + 10, data)) {
        validPosition = testPosition;
      }

      attempts++;
    }

    // If no valid position found, try spawning at a safe position within bounds
    if (!validPosition) {
      // Try spawning at cardinal directions within safe bounds
      const safePositions = [
        {
          x: Math.min(
            Math.max(data.player.position.x + 300, -mapBoundary),
            mapBoundary
          ),
          y: data.player.position.y,
        },
        {
          x: Math.min(
            Math.max(data.player.position.x - 300, -mapBoundary),
            mapBoundary
          ),
          y: data.player.position.y,
        },
        {
          x: data.player.position.x,
          y: Math.min(
            Math.max(data.player.position.y + 300, -mapBoundary),
            mapBoundary
          ),
        },
        {
          x: data.player.position.x,
          y: Math.min(
            Math.max(data.player.position.y - 300, -mapBoundary),
            mapBoundary
          ),
        },
      ];

      for (const pos of safePositions) {
        if (!checkWallCollision(pos, enemyData.radius + 10, data)) {
          validPosition = pos;
          break;
        }
      }

      // Last resort: spawn at center of map
      if (!validPosition) {
        validPosition = { x: 0, y: 0 };
      }
    }

    const enemy: Enemy = {
      id: `enemy_${Date.now()}_${Math.random()}`,
      position: validPosition,
      velocity: { x: 0, y: 0 },
      radius: enemyData.radius,
      color: enemyData.color,
      health: 1, // One-shot enemies
      maxHealth: 1,
      target: { x: 0, y: 0 },
      shootCooldown: 0,
      aiState: "idle",
      type: type,
      // Shotgunner enemies: forced in level 4 (first 5), 30% chance in level 5
      shotgunner:
        forceShotgunner !== undefined
          ? forceShotgunner
          : currentLevel >= 5 && Math.random() < 0.3,
    };

    data.enemies.push(enemy);
  };

  // Create particle effect
  const createParticles = (
    position: { x: number; y: number },
    color: string,
    count: number = 5
  ) => {
    const data = gameDataRef.current;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 100 + Math.random() * 200;

      data.particles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color: color,
        size: 3 + Math.random() * 5,
      });
    }
  };

  // Create shatter effect for player death
  const createShatterEffect = (position: { x: number; y: number }) => {
    const data = gameDataRef.current;
    // Create many particles in a circle
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30;
      const speed = 200 + Math.random() * 300;

      data.particles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color: "#000000",
        size: 5 + Math.random() * 10,
      });
    }

    // Create inner particles
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 150;

      data.particles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color: "#666666",
        size: 3 + Math.random() * 7,
      });
    }
  };

  // Handle input
  useEffect(() => {
    if (gameState !== "playing") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      gameDataRef.current.keys[e.key.toLowerCase()] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      e.preventDefault();
      gameDataRef.current.keys[e.key.toLowerCase()] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      gameDataRef.current.mouse.x = e.clientX - rect.left;
      gameDataRef.current.mouse.y = e.clientY - rect.top;
    };

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      gameDataRef.current.mouse.isDown = true;
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      gameDataRef.current.mouse.isDown = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [gameState]);

  // Update game
  const updateGame = (deltaTime: number) => {
    const data = gameDataRef.current;

    // Continue updating particles even during death animation
    if (gameState === "dying") {
      // Only update particles during death
      data.particles.forEach((particle, index) => {
        particle.x += particle.vx * deltaTime;
        particle.y += particle.vy * deltaTime;
        particle.vx *= 0.95;
        particle.vy *= 0.95;
        particle.life -= deltaTime * 1.5; // Slower fade during death

        if (particle.life <= 0) {
          data.particles.splice(index, 1);
        }
      });
      return;
    }

    if (!data.player) return;

    // Limit delta time
    deltaTime = Math.min(deltaTime, 0.1);

    // Check player movement BEFORE applying time scale
    const keys = data.keys;
    const moveX = (keys["d"] ? 1 : 0) - (keys["a"] ? 1 : 0);
    const moveY = (keys["s"] ? 1 : 0) - (keys["w"] ? 1 : 0);

    data.player.moveDirection = { x: moveX, y: moveY };
    const isMoving = moveX !== 0 || moveY !== 0;
    data.player.isMoving = isMoving;

    // Handle shoot time burst
    if (data.shootTimeBurst && data.shootTimeBurst > 0) {
      data.shootTimeBurst -= deltaTime;
      if (data.shootTimeBurst < 0) data.shootTimeBurst = 0;
    }

    // Calculate time scale locally
    const targetTimeScale =
      isMoving || (data.shootTimeBurst ?? 0) > 0
        ? TIME_SCALE_MOVING
        : TIME_SCALE_STOPPED;
    const timeScaleSpeed = 0.15;

    // Get the current time scale from gameDataRef (or initialize it)
    if (data.currentTimeScale === undefined) {
      data.currentTimeScale = 1;
    }

    // Calculate new time scale
    const diff = targetTimeScale - data.currentTimeScale;
    const newTimeScale = data.currentTimeScale + diff * timeScaleSpeed;
    data.currentTimeScale = newTimeScale;

    // Update React state for UI
    setTimeScale(newTimeScale);

    // Player always moves at normal speed
    const playerDelta = deltaTime;

    // Everything else uses scaled time with the locally calculated time scale
    const scaledDelta = deltaTime * newTimeScale;

    // Update player velocity
    const length = Math.sqrt(moveX * moveX + moveY * moveY);
    if (length > 0) {
      data.player.velocity.x = (moveX / length) * PLAYER_SPEED;
      data.player.velocity.y = (moveY / length) * PLAYER_SPEED;
    } else {
      data.player.velocity.x *= 0.9;
      data.player.velocity.y *= 0.9;
    }

    // Update player position
    const newPlayerX =
      data.player.position.x + data.player.velocity.x * playerDelta;
    const newPlayerY =
      data.player.position.y + data.player.velocity.y * playerDelta;

    const collision = checkWallCollisionSeparate(
      { x: newPlayerX, y: newPlayerY },
      data.player.radius,
      data
    );

    if (!collision.x) {
      data.player.position.x = newPlayerX;
    }
    if (!collision.y) {
      data.player.position.y = newPlayerY;
    }

    // Update camera
    const targetCameraX = data.player.position.x - CANVAS_WIDTH / 2;
    const targetCameraY = data.player.position.y - CANVAS_HEIGHT / 2;
    data.camera.x += (targetCameraX - data.camera.x) * 0.1;
    data.camera.y += (targetCameraY - data.camera.y) * 0.1;

    // Player shooting
    if (data.mouse.isDown) {
      playerShoot();
    }

    // Update enemies with scaled time
    data.enemies.forEach((enemy, index) => {
      updateEnemyAI(enemy, scaledDelta);

      // Enemy-enemy collision avoidance
      data.enemies.forEach((other, otherIndex) => {
        if (index !== otherIndex) {
          const dist = getDistance(enemy.position, other.position);
          const minDist = enemy.radius + other.radius;

          if (dist < minDist && dist > 0) {
            const dx = enemy.position.x - other.position.x;
            const dy = enemy.position.y - other.position.y;
            const pushForce = ((minDist - dist) / dist) * 0.5;

            // Check if the new position would be in a wall before applying
            const newX = enemy.position.x + dx * pushForce;
            const newY = enemy.position.y + dy * pushForce;

            if (
              !checkWallCollision(
                { x: newX, y: enemy.position.y },
                enemy.radius,
                data
              )
            ) {
              enemy.position.x = newX;
            }
            if (
              !checkWallCollision(
                { x: enemy.position.x, y: newY },
                enemy.radius,
                data
              )
            ) {
              enemy.position.y = newY;
            }
          }
        }
      });

      if (
        data.player &&
        getDistance(enemy.position, data.player.position) <
          enemy.radius + data.player.radius
      ) {
        // Create shatter effect and start dying state
        createShatterEffect(data.player.position);
        setGameState("dying");
        data.player = null; // Remove player
        return;
      }

      if (enemy.health !== undefined && enemy.health <= 0) {
        createParticles(enemy.position, "#FF0000", 8);
        data.enemies.splice(index, 1);
        setScore((prev) => prev + 100);
        setEnemiesKilled((prev) => prev + 1);
      }
    });

    // Update projectiles with scaled time
    data.projectiles = data.projectiles.filter((projectile) => {
      projectile.position.x += projectile.velocity.x * scaledDelta;
      projectile.position.y += projectile.velocity.y * scaledDelta;

      if (checkWallCollision(projectile.position, projectile.radius, data)) {
        createParticles(projectile.position, projectile.color, 3);
        return false; // Remove projectile
      }

      // Check collisions
      if (projectile.owner === "player") {
        for (const enemy of data.enemies) {
          if (
            getDistance(projectile.position, enemy.position) <
            projectile.radius + enemy.radius
          ) {
            enemy.health! -= projectile.damage;
            createParticles(projectile.position, "#FF4444", 5);
            return false; // Remove projectile
          }
        }
      } else if (data.player) {
        if (
          getDistance(projectile.position, data.player.position) <
          projectile.radius + data.player.radius
        ) {
          // Create shatter effect and start dying state
          createShatterEffect(data.player.position);
          setGameState("dying");
          data.player = null; // Remove player
          return false; // Remove projectile
        }
      }

      // Remove projectiles that are too far away
      if (
        data.player &&
        getDistance(projectile.position, data.player.position) > 1000
      ) {
        return false;
      }

      return true; // Keep projectile
    });

    // Update particles with scaled time
    data.particles.forEach((particle, index) => {
      particle.x += particle.vx * scaledDelta;
      particle.y += particle.vy * scaledDelta;
      particle.vx *= 0.95;
      particle.vy *= 0.95;
      particle.life -= scaledDelta * 2;

      if (particle.life <= 0) {
        data.particles.splice(index, 1);
      }
    });

    // Check level completion
    if (
      data.enemies.length === 0 &&
      gameState === "playing" &&
      data.levelStarted
    ) {
      if (level < 5) {
        setGameState("levelComplete");
      } else {
        // Game won!
        setGameState("gameOver");
      }
    }
  };

  // Enemy AI
  const updateEnemyAI = (enemy: Enemy, deltaTime: number) => {
    const data = gameDataRef.current;
    if (!data.player) return;

    const distToPlayer = getDistance(enemy.position, data.player.position);
    const enemyData =
      enemyTypes[enemy.type as keyof typeof enemyTypes] || enemyTypes.intern;

    // Always chase the player, regardless of line of sight
    enemy.aiState = distToPlayer < 250 ? "attacking" : "chasing";

    const dx = data.player.position.x - enemy.position.x;
    const dy = data.player.position.y - enemy.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      enemy.velocity.x = (dx / dist) * enemyData.speed;
      enemy.velocity.y = (dy / dist) * enemyData.speed;
    }

    // Only shoot if close enough and have line of sight (check wall collision)
    enemy.shootCooldown -= deltaTime;
    if (
      enemy.aiState === "attacking" &&
      enemy.shootCooldown <= 0 &&
      dist < 400
    ) {
      // Simple line of sight check - cast a ray from enemy to player
      let hasLineOfSight = true;
      const steps = 10;
      for (let i = 1; i < steps; i++) {
        const checkX = enemy.position.x + (dx / dist) * ((dist * i) / steps);
        const checkY = enemy.position.y + (dy / dist) * ((dist * i) / steps);
        if (checkWallCollision({ x: checkX, y: checkY }, 5, data)) {
          hasLineOfSight = false;
          break;
        }
      }

      if (hasLineOfSight) {
        enemyShoot(enemy);
        enemy.shootCooldown = 2;
      }
    }

    const newPos = {
      x: enemy.position.x + enemy.velocity.x * deltaTime,
      y: enemy.position.y + enemy.velocity.y * deltaTime,
    };

    if (!checkWallCollision(newPos, enemy.radius, data)) {
      enemy.position = newPos;
    } else {
      // Try sliding along walls
      const newPosX = { x: newPos.x, y: enemy.position.y };
      const newPosY = { x: enemy.position.x, y: newPos.y };

      if (!checkWallCollision(newPosX, enemy.radius, data)) {
        enemy.position.x = newPosX.x;
      }
      if (!checkWallCollision(newPosY, enemy.radius, data)) {
        enemy.position.y = newPosY.y;
      }
    }
  };

  // Player shoot
  const playerShoot = () => {
    const data = gameDataRef.current;
    if (!data.player) return;

    const now = Date.now();
    if (data.player.shootCooldown && now - data.player.shootCooldown < 300)
      return;
    data.player.shootCooldown = now;

    // Add time burst when shooting (0.15 seconds)
    data.shootTimeBurst = 0.15;

    const mouseWorld = {
      x: data.mouse.x + data.camera.x,
      y: data.mouse.y + data.camera.y,
    };

    const dx = mouseWorld.x - data.player.position.x;
    const dy = mouseWorld.y - data.player.position.y;
    const angle = Math.atan2(dy, dx);

    const types = Object.keys(projectileTypes) as Array<
      keyof typeof projectileTypes
    >;
    const type = types[Math.floor(Math.random() * types.length)];
    const projData = projectileTypes[type];

    const projectile: Projectile = {
      id: `proj_${Date.now()}`,
      position: {
        x: data.player.position.x + Math.cos(angle) * 30,
        y: data.player.position.y + Math.sin(angle) * 30,
      },
      velocity: {
        x: Math.cos(angle) * PROJECTILE_SPEED,
        y: Math.sin(angle) * PROJECTILE_SPEED,
      },
      radius: projData.radius,
      color: projData.color,
      damage: 1, // Always 1 for one-shot mechanics
      owner: "player",
      type,
    };

    data.projectiles.push(projectile);

    // Add muzzle flash particle
    createParticles(projectile.position, "#FFFF00", 3);
  };

  // Enemy shoot
  const enemyShoot = (enemy: Enemy) => {
    const data = gameDataRef.current;
    if (!data.player) return;

    const dx = data.player.position.x - enemy.position.x;
    const dy = data.player.position.y - enemy.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.01) return;

    if (enemy.shotgunner) {
      // Shotgun spread shot
      const baseAngle = Math.atan2(dy, dx);
      const spread = 0.3; // Spread angle

      for (let i = -1; i <= 1; i++) {
        const angle = baseAngle + i * spread;
        const projectile: Projectile = {
          id: `proj_${Date.now()}_${Math.random()}`,
          position: {
            x: enemy.position.x + Math.cos(angle) * 25,
            y: enemy.position.y + Math.sin(angle) * 25,
          },
          velocity: {
            x: Math.cos(angle) * PROJECTILE_SPEED * 0.6,
            y: Math.sin(angle) * PROJECTILE_SPEED * 0.6,
          },
          radius: 4,
          color: "#FF6600",
          damage: 100, // One-shot damage (though we now set health to 0 directly)
          owner: enemy.id,
          type: "stapler",
        };
        data.projectiles.push(projectile);
      }

      createParticles(enemy.position, "#FF6600", 5);
    } else {
      // Normal single shot
      const projectile: Projectile = {
        id: `proj_${Date.now()}_${Math.random()}`,
        position: { ...enemy.position },
        velocity: {
          x: (dx / dist) * PROJECTILE_SPEED * 0.7,
          y: (dy / dist) * PROJECTILE_SPEED * 0.7,
        },
        radius: 6,
        color: "#FF0000",
        damage: 100, // One-shot damage (though we now set health to 0 directly)
        owner: enemy.id,
        type: "pencil",
      };

      data.projectiles.push(projectile);
    }
  };

  // Render
  const render = (ctx: CanvasRenderingContext2D) => {
    const data = gameDataRef.current;

    // Clear
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    ctx.translate(-data.camera.x, -data.camera.y);

    // Grid
    const gridSize = 100;
    const startX = Math.floor(data.camera.x / gridSize) * gridSize;
    const startY = Math.floor(data.camera.y / gridSize) * gridSize;

    ctx.strokeStyle = "#F0F0F0";
    ctx.lineWidth = 1;
    for (let x = startX; x < startX + CANVAS_WIDTH + gridSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, startY + CANVAS_HEIGHT + gridSize);
      ctx.stroke();
    }
    for (let y = startY; y < startY + CANVAS_HEIGHT + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + CANVAS_WIDTH + gridSize, y);
      ctx.stroke();
    }

    // Walls
    data.walls.forEach((wall) => {
      ctx.fillStyle = "#333333";
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    });

    // Draw boundary warning (red outline for outer walls)
    ctx.strokeStyle = "#FF0000";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.strokeRect(-800, -800, 1600, 1600);
    ctx.setLineDash([]); // Reset line dash

    // Projectiles
    data.projectiles.forEach((proj) => {
      ctx.save();
      ctx.translate(proj.position.x, proj.position.y);

      // Add rotation animation
      const rotation = Date.now() * 0.01;
      ctx.rotate(rotation);

      ctx.fillStyle = proj.color;
      ctx.fillRect(
        -proj.radius / 2,
        -proj.radius / 2,
        proj.radius,
        proj.radius
      );
      ctx.restore();
    });

    // Particles
    data.particles.forEach((particle) => {
      ctx.globalAlpha = particle.life * 0.8;
      ctx.fillStyle = particle.color;
      ctx.fillRect(
        particle.x - (particle.size / 2) * particle.life,
        particle.y - (particle.size / 2) * particle.life,
        particle.size * particle.life,
        particle.size * particle.life
      );
    });
    ctx.globalAlpha = 1;

    // Enemies
    data.enemies.forEach((enemy) => {
      ctx.save();
      ctx.translate(enemy.position.x, enemy.position.y);

      // Different colors for enemy types
      let enemyColor = "#FF0000";
      if (enemy.shotgunner) {
        enemyColor = "#FF6600";
        // Draw slightly larger
        ctx.scale(1.2, 1.2);
      }

      ctx.fillStyle = enemyColor;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();

      // Add inner circle for variation
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // Player
    if (data.player) {
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(
        data.player.position.x,
        data.player.position.y,
        data.player.radius,
        0,
        Math.PI * 2
      );
      ctx.fill();

      const mouseWorld = {
        x: data.mouse.x + data.camera.x,
        y: data.mouse.y + data.camera.y,
      };
      const dx = mouseWorld.x - data.player.position.x;
      const dy = mouseWorld.y - data.player.position.y;
      const angle = Math.atan2(dy, dx);

      ctx.strokeStyle = "#666666";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(data.player.position.x, data.player.position.y);
      ctx.lineTo(
        data.player.position.x + Math.cos(angle) * data.player.radius * 0.8,
        data.player.position.y + Math.sin(angle) * data.player.radius * 0.8
      );
      ctx.stroke();
    }

    ctx.restore();

    // UI
    drawUI(ctx);
  };

  // Draw UI
  const drawUI = (ctx: CanvasRenderingContext2D) => {
    const data = gameDataRef.current;

    // Level indicator
    ctx.fillStyle = "#000000";
    ctx.font = "bold 24px Arial";
    ctx.fillText(`LEVEL ${level}`, 20, 30);

    // Enemy count
    ctx.font = "bold 16px Arial";
    ctx.fillText(`ENEMIES: ${data.enemies.length}`, 20, 55);

    // Score
    ctx.fillStyle = "#000000";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "right";
    ctx.fillText(`${score}`, CANVAS_WIDTH - 20, 30);
    ctx.textAlign = "left";

    // Instructions
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.font = "12px Arial";
    ctx.fillText(
      "WASD: Move | Mouse: Aim | Click: Shoot",
      10,
      CANVAS_HEIGHT - 10
    );

    // Level-specific hints
    if (data.enemies.length > 0) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.font = "14px Arial";
      ctx.textAlign = "center";
      if (level === 1) {
        ctx.fillText(
          "TIME MOVES ONLY WHEN YOU MOVE",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT - 70
        );
      } else if (level === 4) {
        ctx.fillText(
          "WARNING: SHOTGUN ENEMIES INCOMING",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT - 70
        );
      }
      ctx.fillText("ONE SHOT - ONE KILL", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 50);
      ctx.textAlign = "left";
    }
  };

  // Game loop
  useEffect(() => {
    if (gameState !== "playing" && gameState !== "dying") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let initialized = false;
    let dyingTimer = 0;

    const gameLoop = (timestamp: number) => {
      if (!initialized) {
        if (gameState === "playing") {
          initGame();
        }
        gameDataRef.current.lastTime = timestamp;
        initialized = true;
      }

      const deltaTime = (timestamp - gameDataRef.current.lastTime) / 1000;
      gameDataRef.current.lastTime = timestamp;

      if (gameState === "dying") {
        dyingTimer += deltaTime;
        if (dyingTimer > 1.0) {
          // Wait 1 second
          setGameState("gameOver");
          return;
        }
      }

      updateGame(deltaTime);
      render(ctx);

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      gameDataRef.current.keys = {};
    };
  }, [gameState, level]);

  const startGame = () => {
    setGameState("playing");
    setScore(0);
    gameDataRef.current = {
      player: null,
      enemies: [],
      projectiles: [],
      walls: [],
      particles: [],
      camera: { x: 0, y: 0 },
      keys: {},
      mouse: { x: 0, y: 0, isDown: false },
      lastTime: 0,
      gameStartTime: 0,
      shootTimeBurst: 0,
      currentTimeScale: 1,
      levelStarted: false,
    };
  };

  if (gameState === "menu") {
    return (
      <div
        className="flex flex-col items-center justify-center text-black bg-white"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      >
        <h1 className="text-8xl font-bold mb-8">9-to-DIE</h1>
        <p className="text-2xl mb-12">TIME MOVES ONLY WHEN YOU MOVE</p>
        <button
          onClick={startGame}
          className="px-12 py-6 bg-black text-white font-bold text-2xl hover:bg-red-600 transition-colors"
        >
          START
        </button>
      </div>
    );
  }

  if (gameState === "levelComplete") {
    return (
      <div
        className="flex flex-col items-center justify-center text-black bg-white"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      >
        <h1 className="text-6xl font-bold mb-4">LEVEL {level} COMPLETE</h1>
        <p className="text-2xl mb-2">{score} POINTS</p>
        <p className="text-xl mb-8">ENEMIES KILLED: {enemiesKilled}</p>
        {level === 3 && (
          <p className="text-2xl mb-4 text-red-600 font-bold">
            WARNING: SHOTGUN ENEMIES AHEAD!
          </p>
        )}
        <button
          onClick={() => {
            setLevel((prev) => prev + 1);
            setGameState("playing");
            initGame();
          }}
          className="px-12 py-6 bg-black text-white font-bold text-2xl hover:bg-red-600 transition-colors"
        >
          NEXT LEVEL
        </button>
      </div>
    );
  }

  if (gameState === "gameOver") {
    return (
      <div
        className="flex flex-col items-center justify-center text-black bg-white"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      >
        <h1 className="text-8xl font-bold mb-8 text-red-600">
          {level === 5 && enemiesKilled > 0 ? "YOU WIN!" : "GAME OVER"}
        </h1>
        <p className="text-3xl mb-4">{score} POINTS</p>
        <p className="text-xl mb-2">LEVEL {level}</p>
        <p className="text-xl mb-12">TOTAL KILLS: {enemiesKilled}</p>
        <button
          onClick={() => {
            startGame();
            setLevel(1);
            setEnemiesKilled(0);
          }}
          className="px-12 py-6 bg-black text-white font-bold text-2xl hover:bg-red-600 transition-colors"
        >
          RESTART
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-2 border-black"
      />
    </div>
  );
}
