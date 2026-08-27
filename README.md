# 2048

A vanilla HTML/CSS/JS implementation of 2048 on a 4x4 grid, structured so
tile images can be dropped in later with no code changes.

## Running it in VS Code

No build step or dependencies — it's plain HTML/CSS/JS.

1. Open this folder in VS Code.
2. Open `index.html` and use the **Live Server** extension ("Open with Live
   Server"), or just double-click `index.html` to open it in a browser.

## Controls

- Arrow keys or WASD to slide tiles.
- Swipe on touch screens.
- **New Game** button to reset, **Try Again** after a win/loss.

## Project structure

```
index.html          Page structure / board markup
style.css            Layout, colors, and per-value tile styling
script.js            Game logic (grid state, moves, merging, win/lose)
assets/tiles/        Drop tile images here later (see assets/tiles/README.md)
```

## Adding your own tile images later

See `assets/tiles/README.md` — each tile value (2, 4, 8, ... 2048, and a
`super` tile for anything beyond) maps to an image file name that `style.css`
already references. Adding the file is enough; nothing else needs to change.
