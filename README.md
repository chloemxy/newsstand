# Corner Kiosk

An interactive 3D newsstand built with three.js. Click a magazine or newspaper to pick it up. Magazines open to a spread and newspapers unfold, and you can turn pages and put them back. The stands are grey-box placeholders until the real Blender model is added.

The visual style follows [frontoffice.co](https://frontoffice.co): white paper, black ink, hairline rules, a light flared serif and a tracked grotesk. The stands are quiet Japanese joinery: hinoki uprights and dowels on smoked oak boards, lit like a still photograph with shoji-screen light on the wall. The newspaper stand is a ladder where each paper drapes over a rung. See `fonts.css` for the typefaces and how to add the licensed originals.

## Run it locally

There's no build step, but ES modules need a local server. `serve.py` is a tiny one that turns off browser caching, so your edits always show:

```bash
python serve.py
```

Then open http://localhost:4517.

## Files

| File | What it does |
|---|---|
| `src/content.js` | Magazine and newspaper titles, colours and pages. Edit this for your own content. |
| `src/config.js` | Model path, camera, orbit limits, lights |
| `src/items.js` | Magazines and newspapers with hinged covers, folds and page turns |
| `src/reader.js` | Hover, pick up, open, turn pages, put back, reader panel |
| `src/stands.js` | Placeholder stands in hinoki and smoked oak, and slot lookup |
| `src/materials.js` | Procedural finishes: wood grain, steel, frosted sleeves, plaster, stone |
| `src/post.js` | Ambient occlusion, tone mapping, film grain and vignette |
| `src/model.js` | Loads a `.glb` stand model and finds its slots |
| `src/textures.js` | Paints covers and pages onto canvases |
| `serve.py` | No-cache local server |
| `models/README.md` | How to export the Blender model and name the slots |

## Adding the real model

Export the stands as `models/newsstand.glb` with slot Empties named `slot_magazine_01…` and `slot_newspaper_01…`, then set `modelUrl: './models/newsstand.glb'` in `src/config.js`. Full rules are in [models/README.md](models/README.md).

## Controls

- Drag to look around, then click an item to pick it up.
- Click the right or left half of the item, or press → / ←, to turn pages.
- Press Esc or click outside the item to put it back.
- "Browse the stand" lists every item for keyboard users.
