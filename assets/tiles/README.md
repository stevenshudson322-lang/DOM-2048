# Tile images

Drop image files in this folder to replace the plain colored tiles — no code
changes needed. Each tile value is wired up in `style.css` to look for a file
named after its value:

```
assets/tiles/2.png
assets/tiles/4.png
assets/tiles/8.png
assets/tiles/16.png
assets/tiles/32.png
assets/tiles/64.png
assets/tiles/128.png
assets/tiles/256.png
assets/tiles/512.png
assets/tiles/1024.png
assets/tiles/2048.png
assets/tiles/super.png   (used for any tile above 2048)
```

Any image format works as long as the extension matches (`.png` by default —
change the extension in the `.tile-*` rules in `style.css` if you use `.jpg`
or `.svg` instead). Square images work best since tiles are rendered as
squares; `background-size: cover` will crop non-square images to fit.

Until a file exists at a given path, that tile just falls back to its plain
color, so the game works fine with none of these images present.
