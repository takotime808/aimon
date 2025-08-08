# Copyright (c) 2025 takotime808
"""Streamlit implementation of the AI-Mon Defense game."""
import math
import time
from io import BytesIO

import requests
import streamlit as st
from PIL import Image, ImageDraw
from streamlit_autorefresh import st_autorefresh
from streamlit_drawable_canvas import st_canvas

WIDTH, HEIGHT = 800, 600

st.set_page_config(page_title="AI-Mon Defense")
st.title("AI-Mon Defense")
st.write("Click anywhere on the field to place a Pokémon tower.")

pokemon_types = {
    "Bulbasaur": {
        "name": "Bulbasaur",
        "level": 5,
        "attack": 8,
        "range": 120,
        "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png",
    },
    "Charmander": {
        "name": "Charmander",
        "level": 5,
        "attack": 10,
        "range": 120,
        "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png",
    },
    "Squirtle": {
        "name": "Squirtle",
        "level": 5,
        "attack": 9,
        "range": 120,
        "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png",
    },
}


def load_sprite(url: str) -> Image.Image:
    """Fetch a sprite from a URL and return a resized PIL image."""
    response = requests.get(url, timeout=5)
    img = Image.open(BytesIO(response.content)).convert("RGBA")
    return img.resize((32, 32))


if "sprites" not in st.session_state:
    st.session_state.sprites = {
        name: load_sprite(data["sprite"]) for name, data in pokemon_types.items()
    }

# Default session state
state_defaults = {
    "turrets": [],
    "enemies": [],
    "shots": [],
    "last_time": time.time(),
    "last_spawn": 0.0,
    "n_points": 0,
}
for key, value in state_defaults.items():
    st.session_state.setdefault(key, value)

selected = st.sidebar.selectbox("Choose Pokémon", list(pokemon_types.keys()))

# --- Game update ---
now = time.time()
dt = now - st.session_state.last_time
st.session_state.last_time = now

if now - st.session_state.last_spawn > 2:
    st.session_state.enemies.append({"x": 0.0, "y": 300.0, "hp": 100.0, "speed": 40.0})
    st.session_state.last_spawn = now

# Move enemies and remove those that exit
new_enemies = []
for e in st.session_state.enemies:
    e["x"] += e["speed"] * dt
    if e["x"] <= WIDTH:
        new_enemies.append(e)
st.session_state.enemies = new_enemies

# Turret logic
for t in st.session_state.turrets:
    t["cooldown"] -= dt
    if t["cooldown"] <= 0:
        for e in st.session_state.enemies:
            dx = e["x"] - t["x"]
            dy = e["y"] - t["y"]
            if math.hypot(dx, dy) <= t["type"]["range"]:
                damage = t["type"]["level"] * t["type"]["attack"]
                e["hp"] -= damage
                st.session_state.shots.append(
                    {
                        "x1": t["x"],
                        "y1": t["y"],
                        "x2": e["x"],
                        "y2": e["y"],
                        "ttl": 0.1,
                    }
                )
                t["cooldown"] = 0.8
                break

# Remove dead enemies
st.session_state.enemies = [e for e in st.session_state.enemies if e["hp"] > 0]

# Update shots
new_shots = []
for s in st.session_state.shots:
    s["ttl"] -= dt
    if s["ttl"] > 0:
        new_shots.append(s)
st.session_state.shots = new_shots

# --- Drawing ---
board = Image.new("RGB", (WIDTH, HEIGHT), "#ffffff")
draw = ImageDraw.Draw(board)

draw.line((0, 300, WIDTH, 300), fill="#888", width=4)

for t in st.session_state.turrets:
    sprite = st.session_state.sprites[t["type"]["name"]]
    board.paste(sprite, (int(t["x"]) - 16, int(t["y"]) - 16), sprite)

for e in st.session_state.enemies:
    draw.rectangle((e["x"] - 10, e["y"] - 10, e["x"] + 10, e["y"] + 10), fill="red")
    draw.text((e["x"] - 10, e["y"] - 25), str(int(math.ceil(e["hp"]))), fill="black")

for s in st.session_state.shots:
    draw.line((s["x1"], s["y1"], s["x2"], s["y2"]), fill="yellow", width=2)

canvas_result = st_canvas(
    fill_color="rgba(0,0,0,0)",
    stroke_width=0,
    stroke_color="#00000000",
    background_image=board,
    update_streamlit=True,
    height=HEIGHT,
    width=WIDTH,
    drawing_mode="point",
    point_display_radius=0,
    key="canvas",
)

if canvas_result.json_data is not None:
    objects = canvas_result.json_data.get("objects", [])
    if len(objects) > st.session_state.n_points:
        obj = objects[-1]
        x = obj.get("left", 0)
        y = obj.get("top", 0)
        ptype = pokemon_types[selected]
        st.session_state.turrets.append({"x": x, "y": y, "type": ptype, "cooldown": 0.0})
        st.session_state.n_points = len(objects)

st_autorefresh(interval=100, key="refresh")