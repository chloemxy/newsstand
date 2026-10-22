# Corner

An interactive 3D newsstand built with three.js. Click a magazine or newspaper to pick it up. Magazines open to a spread and newspapers unfold, and you can turn pages and put them back. The stands are grey-box placeholders until the real Blender model is added.

The visual style follows [frontoffice.co](https://frontoffice.co): white paper, black ink, hairline rules, a single tracked grotesk. The stands are quiet Japanese joinery: maple uprights and blocks with a clear glass back board, shot like a product photograph on a seamless studio backdrop (or, with `look: 'room'`, in a room at sunset). The newspaper stand is a two-column ladder where each tabloid is folded over its own brass rod; picking one up lifts the rod with it, slides the rod out of the fold, and the paper unfolds in your hands. The render aims for a calm product photograph: a long lens, soft daylight from across the camera, a limewash wall with a slowly drifting bamboo shadow, and a light film grade. See `fonts.css` for the typeface and how to add the licensed original.

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
| `src/reader.js` | Hover, then one continuous pick-up: lift off the rod, travel, straighten, flip open; page turns and put back |
| `src/stands.js` | Placeholder stands in hinoki and smoked oak, and slot lookup |
| `src/materials.js` | Procedural finishes: scanned maple, brass, glass, black sleeves, plaster, stone |
| `src/post.js` | Tone mapping, film grain and vignette |
| `src/backdrop.js` | The zen backdrop: limewash wall and a slowly swaying bamboo shadow |
| `src/contact-shadow.js` | Soft contact shadow under the stand on the studio backdrop |
| `src/model.js` | Loads a `.glb` stand model and finds its slots |
| `src/textures.js` | Paints covers and pages onto canvases |
| `serve.py` | No-cache local server |
| `models/README.md` | How to export the Blender model and name the slots |

## Adding the real model

Export the stands as `models/newsstand.glb` with slot Empties named `slot_magazine_01…` and `slot_newspaper_01…`, then set `modelUrl: './models/newsstand.glb'` in `src/config.js`. Full rules are in [models/README.md](models/README.md).

## Controls

- The view is a fixed camera, set up like a product photo (`shot` in `src/config.js`). Click a paper to pick it up.
- A paper lifts off its rod, comes to you and flips open into a spread. Click its right or left half, use Next / Back, or press → / ← to open and close it.
- Press Esc or click outside the item to put it back.
- "Browse the stand" lists every item for keyboard users.
