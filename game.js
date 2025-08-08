const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const POKEMON_LIST = [
  { name: 'pikachu', move: 'thunder-shock' },
  { name: 'charmander', move: 'ember' },
  { name: 'squirtle', move: 'water-gun' }
];

const pokemonsData = {};
let selectedPokemon = null;
const turrets = [];
const enemies = [];

async function loadPokemonData() {
  for (const p of POKEMON_LIST) {
    const pokeRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${p.name}`);
    const pokeJson = await pokeRes.json();
    const img = new Image();
    img.src = pokeJson.sprites.front_default;
    const moveRes = await fetch(`https://pokeapi.co/api/v2/move/${p.move}`);
    const moveJson = await moveRes.json();
    const movePower = moveJson.power || 10;
    pokemonsData[p.name] = { img, movePower };
    addPokemonButton(p.name, img);
  }
}

function addPokemonButton(name, img) {
  const div = document.getElementById('pokemon-select');
  const btn = document.createElement('button');
  if (img) {
    img.width = 32;
    img.height = 32;
    btn.appendChild(img);
  }
  btn.appendChild(document.createTextNode(name));
  btn.onclick = () => {
    selectedPokemon = name;
  };
  div.appendChild(btn);
}

canvas.addEventListener('click', e => {
  if (!selectedPokemon) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const level = parseInt(prompt('Enter level (1-10)', '5')) || 1;
  const pData = pokemonsData[selectedPokemon];
  turrets.push({
    x,
    y,
    name: selectedPokemon,
    level,
    movePower: pData.movePower,
    img: pData.img,
    range: 80,
    fireRate: 1000,
    lastShot: 0
  });
});

function spawnEnemy() {
  enemies.push({ x: 0, y: canvas.height / 2, hp: 100, speed: 1 });
}
setInterval(spawnEnemy, 2000);

function update() {
  enemies.forEach(en => {
    en.x += en.speed;
  });
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].x > canvas.width) enemies.splice(i, 1);
  }

  turrets.forEach(t => {
    if (Date.now() - t.lastShot < t.fireRate) return;
    const target = enemies.find(en => distance(t, en) <= t.range);
    if (target) {
      target.hp -= t.level * t.movePower;
      t.lastShot = Date.now();
      if (target.hp <= 0) enemies.splice(enemies.indexOf(target), 1);
    }
  });
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ccc';
  ctx.fillRect(0, canvas.height / 2 - 20, canvas.width, 40);

  enemies.forEach(en => {
    ctx.fillStyle = 'red';
    ctx.fillRect(en.x, en.y - 10, 20, 20);
    ctx.fillStyle = 'black';
    ctx.fillText(en.hp, en.x, en.y - 12);
  });

  turrets.forEach(t => {
    if (t.img && t.img.complete) {
      ctx.drawImage(t.img, t.x - 20, t.y - 20, 40, 40);
    } else {
      ctx.fillStyle = 'blue';
      ctx.fillRect(t.x - 20, t.y - 20, 40, 40);
    }
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.stroke();
  });
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loadPokemonData();
requestAnimationFrame(loop);