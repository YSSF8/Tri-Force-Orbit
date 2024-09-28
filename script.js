// Get the canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas dimensions
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Variables
let keys = {};
let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 20,
    speed: 3,
    vx: 0,
    vy: 0,
    grappling: false,
    grapplePoint: null,
    maxHealth: 100,
    health: 100,
    maxStamina: 100,
    stamina: 100,
    staminaRegen: 0.5,
    staminaDrain: 1.0,
    ultimateReady: true,
    ultimateActive: false,
    ultimateDuration: 5000,
    ultimateTimer: 0,
};
let gravity = 1.5;
let friction = 0.9;
let squares = [];
let enemies = [];
let particles = [];
let projectiles = [];
let enemySpawnInterval = 2000;
let lastEnemySpawnTime = 0;
let score = 0;
let canShoot = true;
const SHOOT_COOLDOWN = 100;
const FPS = 60;
const FRAME_DURATION = 1000 / FPS;

const musicBtn = document.getElementById('music');
const music = new Audio('./assets/music.mp3');
music.loop = true;
music.volume = 0.1;
let isMusic = false;

musicBtn.addEventListener('click', () => {
    if (isMusic) {
        music.pause();
        isMusic = false;
        musicBtn.classList.remove('active');
    } else {
        music.play();
        isMusic = true;
        musicBtn.classList.add('active');
    }
});

window.addEventListener('keydown', e => {
    keys[e.key] = true;
});

window.addEventListener('keyup', e => {
    keys[e.key] = false;
});

canvas.addEventListener('mousedown', e => {
    if (e.button === 2) {
        // Right-click (Grapple)
        e.preventDefault();
        const square = getSquareUnderMouse(e.clientX, e.clientY);
        if (square && player.stamina > 0) {
            player.grappling = true;
            player.grapplePoint = { x: square.x, y: square.y }; // Grapple point is the center of the square
        }
    } else if (e.button === 0) {
        // Left-click (Shoot)
        if (!canShoot) {
            return;
        }
    
        // Proceed with shooting
        shootProjectile(e.clientX, e.clientY);
        const fire = new Audio('./assets/fire.wav');
        fire.volume = 0.05;
        fire.play();
    
        // Start cooldown
        canShoot = false;
        setTimeout(() => {
            canShoot = true;
        }, SHOOT_COOLDOWN);
    } else if (e.button === 1) {
        // Middle-click (Ultimate)
        e.preventDefault();
        activateUltimate();
    }
});

canvas.addEventListener('mouseup', e => {
    if (e.button === 2) {
        player.grappling = false;
        player.grapplePoint = null;
    }
});

window.addEventListener('contextmenu', e => {
    e.preventDefault();
});

// Resize handler
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Create squares to grapple on
function createSquares() {
    squares = []; // Clear existing squares
    for (let i = 0; i < 10; i++) {
        squares.push({
            x: Math.random() * (canvas.width - 100) + 50,
            y: Math.random() * (canvas.height / 2 - 100) + 50,
            size: 30,
        });
    }
}

// Get the square under the mouse position
function getSquareUnderMouse(x, y) {
    return squares.find(square =>
        x >= square.x - square.size / 2 &&
        x <= square.x + square.size / 2 &&
        y >= square.y - square.size / 2 &&
        y <= square.y + square.size / 2
    );
}

// Particle effect generator
function createParticles(x, y, color, options = {}) {
    let { vxRange = [-1, 1], vyRange = [-3, -1], count = 10 } = options;
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: Math.random() * (vxRange[1] - vxRange[0]) + vxRange[0],
            vy: Math.random() * (vyRange[1] - vyRange[0]) + vyRange[0],
            alpha: 1,
            color: color,
        });
    }
}

// Shoot projectile
function shootProjectile(targetX, targetY, angleOverride) {
    const angle = angleOverride !== undefined ? angleOverride : Math.atan2(targetY - player.y, targetX - player.x);
    projectiles.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * 10,
        vy: Math.sin(angle) * 10,
        size: 5,
    });
}

// Spawn enemies off-screen
function spawnEnemy() {
    let side = Math.floor(Math.random() * 4);
    let x, y;
    if (side === 0) {
        // Left
        x = -20;
        y = Math.random() * canvas.height;
    } else if (side === 1) {
        // Right
        x = canvas.width + 20;
        y = Math.random() * canvas.height;
    } else if (side === 2) {
        // Top
        x = Math.random() * canvas.width;
        y = -20;
    } else {
        // Bottom
        x = Math.random() * canvas.width;
        y = canvas.height + 20;
    }
    enemies.push({
        x: x,
        y: y,
        size: 20,
        speed: 2 + Math.random() * 1.5,
        maxHealth: 30,
        health: 30,
    });
}

// Activate Ultimate
function activateUltimate() {
    if (player.ultimateReady) {
        player.ultimateActive = true;
        player.ultimateReady = false;
        player.ultimateTimer = player.ultimateDuration;
        player.health = player.maxHealth;
        player.stamina = player.maxStamina;
        new Audio('./assets/ultimate.mp3').play();

        // Add an effect for activation
        createParticles(player.x, player.y, '255,215,0', { count: 50, vyRange: [-5, 0] }); // Gold color particles
    }
}

// Update function
let lastTime = performance.now();
function update(deltaTime) {
    // Player movements
    // Left and right movement only
    if (keys['a'] || keys['ArrowLeft']) {
        player.vx -= player.speed;
    }
    if (keys['d'] || keys['ArrowRight']) {
        player.vx += player.speed;
    }

    // Apply gravity
    player.vy += gravity;

    // Apply velocity
    player.x += player.vx * 0.1;
    player.y += player.vy * 0.1;

    // Apply friction
    player.vx *= friction;
    player.vy *= friction;

    // Update player stamina
    if (player.grappling) {
        if (!player.ultimateActive) {
            player.stamina -= player.staminaDrain;
            if (player.stamina <= 0) {
                player.stamina = 0;
                player.grappling = false;
                player.grapplePoint = null;
            }
        }
    } else {
        if (!player.ultimateActive) {
            player.stamina += player.staminaRegen;
            if (player.stamina > player.maxStamina) {
                player.stamina = player.maxStamina;
            }
        }
    }

    // Prevent player from falling through the lava
    let lavaHeight = canvas.height - 50; // Lava height from the top
    if (player.y + player.size / 2 > lavaHeight) {
        player.y = lavaHeight - player.size / 2;
        player.vy = 0;
        if (!player.ultimateActive) {
            // Damage player over time when in lava
            player.health -= 0.5;
            createParticles(player.x, player.y + player.size / 2, '255,69,0', { vxRange: [0, 0], vyRange: [-1, -0.5] });
        }
    }

    // Grappling physics
    if (player.grappling && player.grapplePoint) {
        const dx = player.grapplePoint.x - player.x;
        const dy = player.grapplePoint.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const force = (dist - 100) * 0.02;
        player.vx += Math.cos(angle) * force;
        player.vy += Math.sin(angle) * force;
    }

    // Update enemies
    enemies.forEach((enemy, eIndex) => {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.x += Math.cos(angle) * enemy.speed;
        enemy.y += Math.sin(angle) * enemy.speed;

        // Check collision with player
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < enemy.size + player.size) {
            if (!player.ultimateActive) {
                // Damage player
                player.health -= 1;
                createParticles(player.x, player.y, '255,0,0'); // Red color
            }
        }
    });

    // Update projectiles
    projectiles.forEach((proj, pIndex) => {
        proj.x += proj.vx;
        proj.y += proj.vy;

        // Remove projectile if off-screen
        if (proj.x < 0 || proj.x > canvas.width || proj.y < 0 || proj.y > canvas.height) {
            projectiles.splice(pIndex, 1);
        }

        // Check collision with enemies
        enemies.forEach((enemy, eIndex) => {
            const dx = proj.x - enemy.x;
            const dy = proj.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < proj.size + enemy.size) {
                // Enemy hit
                enemy.health -= 10; // Damage to enemy
                createParticles(enemy.x, enemy.y, '255,0,0'); // Red color
                projectiles.splice(pIndex, 1);

                // Check if enemy is dead
                if (enemy.health <= 0) {
                    enemies.splice(eIndex, 1);

                    // Increase player's stamina by +20%
                    player.stamina += player.maxStamina * 0.2;
                    if (player.stamina > player.maxStamina) {
                        player.stamina = player.maxStamina;
                    }

                    // Increase score
                    score += 10; // Adjust the value as needed

                    // 30% chance to heal player by +30% health
                    if (Math.random() < 0.3) {
                        player.health += player.maxHealth * 0.3;
                        if (player.health > player.maxHealth) {
                            player.health = player.maxHealth;
                        }
                        createParticles(player.x, player.y, '0,255,0', { count: 20 }); // Green color for healing
                    }

                    new Audio('./assets/kill.mp3').play();
                }
            }
        });
    });

    // Update particles
    particles.forEach((part, index) => {
        part.x += part.vx;
        part.y += part.vy;
        part.alpha -= 0.02;
        if (part.alpha <= 0) {
            particles.splice(index, 1);
        }
    });

    // Spawn enemies at intervals
    if (performance.now() - lastEnemySpawnTime > enemySpawnInterval) {
        spawnEnemy();
        lastEnemySpawnTime = performance.now();
    }

    // Prevent player from moving off-screen
    if (player.x - player.size / 2 < 0) {
        player.x = player.size / 2;
        player.vx = 0;
    } else if (player.x + player.size / 2 > canvas.width) {
        player.x = canvas.width - player.size / 2;
        player.vx = 0;
    }

    // Update Ultimate
    if (player.ultimateActive) {
        player.ultimateTimer -= deltaTime;
        if (player.ultimateTimer <= 0) {
            player.ultimateActive = false;
            player.ultimateTimer = 0;
            // Start cooldown (if you want to add one)
        } else {
            // Automatically shoot at the nearest enemy
            if (enemies.length > 0) {
                const nearestEnemy = enemies.reduce((closest, enemy) => {
                    const dx = enemy.x - player.x;
                    const dy = enemy.y - player.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < closest.dist) {
                        return { enemy, dist };
                    } else {
                        return closest;
                    }
                }, { enemy: null, dist: Infinity });

                if (nearestEnemy.enemy) {
                    const angle = Math.atan2(nearestEnemy.enemy.y - player.y, nearestEnemy.enemy.x - player.x);
                    shootProjectile(null, null, angle);
                }
            }
            // Ensure health and stamina are maxed out
            player.health = player.maxHealth;
            player.stamina = player.maxStamina;
        }
    }

    // If you want to reset the ultimate after some cooldown, you can implement it here
}

// Draw function
let lavaWaveOffset = 0;
function draw() {
    // Clear canvas with bloom effect
    ctx.fillStyle = 'rgba(34,34,34,0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw lava with waves
    let lavaHeight = canvas.height - 50;
    lavaWaveOffset += 0.05;
    ctx.fillStyle = 'orangered';
    ctx.beginPath();
    ctx.moveTo(0, lavaHeight);
    for (let x = 0; x <= canvas.width; x += 10) {
        let y = lavaHeight + Math.sin((x + lavaWaveOffset * 50) * 0.05) * 5;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fill();

    // Draw lava particles
    createParticles(Math.random() * canvas.width, lavaHeight, '255,69,0', { vxRange: [0, 0], vyRange: [-0.5, -0.2] }); // Particles rise straight up slowly

    // Draw squares
    squares.forEach((square) => {
        ctx.fillStyle = 'cyan';
        ctx.fillRect(square.x - square.size / 2, square.y - square.size / 2, square.size, square.size);
    });

    // Draw projectiles
    projectiles.forEach((proj) => {
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw enemies
    enemies.forEach((enemy) => {
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw angry face
        // Eyes
        ctx.fillStyle = 'black';
        ctx.fillRect(enemy.x - 5, enemy.y - 5, 2, 2);
        ctx.fillRect(enemy.x + 3, enemy.y - 5, 2, 2);

        // Eyebrows
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(enemy.x - 6, enemy.y - 8);
        ctx.lineTo(enemy.x - 2, enemy.y - 4);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(enemy.x + 6, enemy.y - 8);
        ctx.lineTo(enemy.x + 2, enemy.y - 4);
        ctx.stroke();

        // Mouth (frown)
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y + 8, 5, 0, Math.PI);
        ctx.stroke();

        // Draw enemy health bar
        ctx.fillStyle = 'black';
        ctx.fillRect(enemy.x - 15, enemy.y - enemy.size - 10, 30, 5);
        ctx.fillStyle = 'lime';
        ctx.fillRect(enemy.x - 15, enemy.y - enemy.size - 10, (enemy.health / enemy.maxHealth) * 30, 5);
        ctx.strokeStyle = 'black';
        ctx.strokeRect(enemy.x - 15, enemy.y - enemy.size - 10, 30, 5);
    });

    // Draw player
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(Math.atan2(player.vy, player.vx) + Math.PI / 2);
    ctx.fillStyle = 'lime';
    ctx.beginPath();
    ctx.moveTo(0, -player.size);
    ctx.lineTo(-player.size / 2, player.size / 2);
    ctx.lineTo(player.size / 2, player.size / 2);
    ctx.closePath();
    ctx.fill();

    // Smiley face
    ctx.fillStyle = 'black';
    ctx.fillRect(-5, -player.size / 2, 2, 2);
    ctx.fillRect(3, -player.size / 2, 2, 2);
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI);
    ctx.stroke();
    ctx.restore();

    // Draw particles
    particles.forEach((part) => {
        ctx.fillStyle = `rgba(${part.color},${part.alpha})`;
        ctx.fillRect(part.x, part.y, 2, 2);
    });

    // Draw grapple line
    if (player.grappling && player.grapplePoint) {
        ctx.strokeStyle = 'white';
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(player.grapplePoint.x, player.grapplePoint.y);
        ctx.stroke();
    }

    // Draw health bar
    ctx.fillStyle = 'gray';
    ctx.fillRect(20, 20, 200, 20);
    ctx.fillStyle = '#0d7a0d';
    ctx.fillRect(20, 20, (player.health / player.maxHealth) * 200, 20);
    ctx.strokeStyle = 'black';
    ctx.strokeRect(20, 20, 200, 20);

    // Draw stamina bar
    ctx.fillStyle = 'gray';
    ctx.fillRect(20, 50, 200, 10);
    ctx.fillStyle = '#0d7aff';
    ctx.fillRect(20, 50, (player.stamina / player.maxStamina) * 200, 10);
    ctx.strokeStyle = 'black';
    ctx.strokeRect(20, 50, 200, 10);

    // Draw score
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score}`, 20, 80);

    // Draw Ultimate indicator
    if (player.ultimateActive) {
        ctx.fillStyle = 'gold';
        ctx.font = '20px Arial';
        ctx.fillText(`Ultimate Active: ${(player.ultimateTimer / 1000).toFixed(1)}s`, canvas.width - 200, 40);
    } else if (player.ultimateReady) {
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText('Ultimate Ready (Middle Click)', 20, canvas.height - 10);
    } else {
        ctx.fillStyle = 'gray';
        ctx.font = '20px Arial';
        ctx.fillText('Ultimate Unavailable', canvas.width - 200, 40);
    }

    // Game Over
    if (player.health <= 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '50px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
        ctx.font = '30px Arial';
        ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 50);
    }
}

let accumulator = 0;

function gameLoop() {
    const now = performance.now();
    let deltaTime = now - lastTime;
    lastTime = now;

    // Cap deltaTime to avoid spiral of death
    if (deltaTime > 1000) deltaTime = FRAME_DURATION;

    accumulator += deltaTime;

    while (accumulator >= FRAME_DURATION) {
        update(FRAME_DURATION);
        accumulator -= FRAME_DURATION;
    }

    draw();

    if (player.health > 0) {
        requestAnimationFrame(gameLoop);
    }
}

// Initialization
createSquares();
spawnEnemy();
gameLoop();