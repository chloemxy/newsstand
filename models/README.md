# Bringing in your stand model

The page builds the magazines and newspapers in code (they need hinges to
open), so your model only has to provide the **stands** and a **slot** for
each item. Drop the file here and set `modelUrl` in `src/config.js`.

## Export from Blender

- Units in metres, scale applied (Ctrl+A → All Transforms) on every object.
- File → Export → glTF 2.0, format **glTF Binary (.glb)**, with "+Y Up" on.
- Optional: shrink it with `npx gltfpack -i newsstand.glb -o newsstand.glb -cc`.

## Slots

Add one **Empty** (Arrows display is easiest) per item:

| Name | What goes there |
|---|---|
| `slot_magazine_01`, `slot_magazine_02`, … | magazines, in the order listed in `src/content.js` |
| `slot_newspaper_01`, `slot_newspaper_02`, … | newspapers, same rule |

Place each Empty at the **bottom-centre of the back** of where the item rests,
then rotate it so that, in Blender's axes:

- the Empty's **+Z** runs up the page (toward the top edge of the cover), and
- the Empty's **−Y** points out of the cover, toward the viewer.

For a magazine leaning back on a shelf, that's a small tilt around X. Leave
the Empty's scale at 1.

**Newspapers on the ladder stand** hang over a dowel turned on their side, so
the masthead runs down the right edge. For those, rotate the Empty 90° around
Y so its +Z points **right**, and put it at the paper's **left edge, half way
down** the hanging paper (19 cm below the dowel). Step each lower slot about
8 mm toward the viewer so it overlaps the paper above, as the placeholder
does in `src/stands.js`.

Sizes the code uses: magazine 21 × 28 cm, folded newspaper 38 × 29 cm (the
fold sits at the slot, the masthead half shows). Leave that much room.

## Optional

- A camera named `view` sets the starting viewpoint.
- If you bake lighting into the model, set `defaultLights: false` in
  `src/config.js` so the scene isn't lit twice.
- Slots can also be small mesh planes instead of Empties; they're hidden
  automatically.
