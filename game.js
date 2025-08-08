// Copyright (c) 2025 takotime808
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const pokemonTypes = {
  bulbasaur: {
    name: 'Bulbasaur',
    level: 5,
    attack: 8,
    range: 120,
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png'
  },
  charmander: {
    name: 'Charmander',
    level: 5,
    attack: 10,
    range: 120,
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png'
  },
  squirtle: {
    name: 'Squirtle',
    level: 5,
    attack: 9,
    range: 120,
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png'
  }
};

// Preload images
for (const key in pokemonTypes) {
  const img = new Image();
  img.src = pokemonTypes[key].sprite;
  pokemonTypes[key].image = img;
}

const turrets = [];
const enemies = [];
const shots = [];

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const choice = prompt(
    'Choose Pokémon: bulbasaur (b) / charmander (c) / squirtle (s)'
  );
  const key = choice?.toLowerCase();
  const selected =
    key?.length === 1
      ? Object.keys(pokemonTypes).find(name => name.startsWith(key))
      : key;
  const type = selected ? pokemonTypes[selected] : undefined;
  if (type) {
    turrets.push({ x, y, type, cooldown: 0 });
  }
});

function spawnEnemy() {
  enemies.push({ x: 0, y: 300, hp: 100, speed: 40 });
}
setInterval(spawnEnemy, 2000);

let last = 0;
function loop(timestamp) {
  const dt = (timestamp - last) / 1000 || 0;
  last = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function update(dt) {
  // Update enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.x += e.speed * dt;
    if (e.x > canvas.width) {
      enemies.splice(i, 1);
    }
  }

  // Turret logic
  turrets.forEach(t => {
    t.cooldown -= dt;
    if (t.cooldown <= 0) {
      const target = enemies.find(e => {
        const dx = e.x - t.x;
        const dy = e.y - t.y;
        return Math.hypot(dx, dy) <= t.type.range;
      });
      if (target) {
        const damage = t.type.level * t.type.attack;
        target.hp -= damage;
        shots.push({ x1: t.x, y1: t.y, x2: target.x, y2: target.y, ttl: 0.1 });
        t.cooldown = 0.8; // fire rate
      }
    }
  });

  // Remove dead enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].hp <= 0) {
      enemies.splice(i, 1);
    }
  }

  // Update shots
  for (let i = shots.length - 1; i >= 0; i--) {
    shots[i].ttl -= dt;
    if (shots[i].ttl <= 0) shots.splice(i, 1);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw path
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 300);
  ctx.lineTo(canvas.width, 300);
  ctx.stroke();

  // Draw turrets
  turrets.forEach(t => {
    const img = t.type.image;
    if (img.complete) {
      ctx.drawImage(img, t.x - 16, t.y - 16, 32, 32);
    } else {
      ctx.fillStyle = 'blue';
      ctx.fillRect(t.x - 16, t.y - 16, 32, 32);
    }
  });

  // Draw enemies
  enemies.forEach(e => {
    ctx.fillStyle = 'red';
    ctx.fillRect(e.x - 10, e.y - 10, 20, 20);
    ctx.fillStyle = 'black';
    ctx.fillText(Math.ceil(e.hp), e.x - 10, e.y - 12);
  });

  // Draw shots
  ctx.strokeStyle = 'yellow';
  ctx.lineWidth = 2;
  shots.forEach(s => {
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  });
}