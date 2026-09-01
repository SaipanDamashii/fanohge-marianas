# Real Texture Assets (optional upgrade)

Drop seamless, tileable PBR textures here to replace the procedural (canvas)
textures that the 3D board generates at runtime.

## How it works

`js/gameboard.js` probes this folder for a matching material key and, if the
files exist, uses them instead of the built-in pattern. Anything missing
silently falls back to the procedural texture — the game always renders.

## Real coconut-palm model (optional)

To replace the built-in (improved) procedural palms with a real 3D palm model,
drop a neutral, PBR-textured coconut-palm GLB at:

```
assets/models/coconut-palm.glb
```

The game auto-detects it at launch and swaps it into the palm groves and coconut
plantations. Suggested generation (Sorceress model tool, if you have credits):
`sorceress_generate_model` → `meshy-6`, prompt *"A single realistic coconut palm
tree, gently curved slender brown trunk, a crown of 8–10 long drooping green
fronds, a few coconuts clustered under the fronds, tropical island coconut palm,
realistic, PBR textured, feet on y=0"* — save the result as `coconut-palm.glb`.
The game normalizes it to ~1 unit tall and scales it per island automatically.

## File naming

For each material KEY (see the list below), create:

```
assets/textures/<KEY>.base.jpg     (or .png / .webp)  — base color (albedo)
assets/textures/<KEY>.normal.jpg   (or .png / .webp)  — normal/bump map (optional)
```

Accepted formats: `.jpg`, `.png`, `.webp`. Either extension works — the loader
tries all three.

## Recommended size & quality

- 1024×1024 (512 is acceptable if you can't upscale).
- **Seamlessly tileable** — edges must wrap without a visible seam.
- Flat, even, shadow-free lighting on the base color (the game adds its own
  sun + environment light).
- Normal maps: relief/bump only, gray/blue-toned, in linear color space.

## Material keys (highest-impact first)

### Structures / buildings
| Priority | KEY | Surface |
|---|---|---|
| ⭐ | `thatch` | tropical thatch roof |
| ⭐ | `tile` | terracotta/clay roof tiles |
| ⭐ | `stone` | pale stone / limestone blocks |
| ⭐ | `wood` | aged timber planks |
| ⭐ | `adobe` | sun-bleached stucco wall |
| ⭐ | `sand` | beach sand |
| 2nd | `grass`, `grassDark`, `volcanoGreen` | island grassland |
| 2nd | `limestone`, `ash`, `crater` | coastal / volcanic rock |
| 2nd | `brick` | red brick wall |
| 2nd | `darkWood` | dark hardwood planks |
| 2nd | `concrete`, `cement` | grey concrete |
| 3rd | `plank`, `cobble`, `stoneLight`, `darkStone`, `redRoof`, `soil`, `sandDark`, `roofGrey`, `white`, `clay`, `iron`, `steel`, `metal`, … | misc surfaces |

### Environment (land / sea / sky)
| Priority | KEY | Surface |
|---|---|---|
| ⭐ | `grass` | island grassland plateau (limestone tops) |
| ⭐ | `sand` | beaches / shore skirts |
| ⭐ | `limestone` | cliff / coastal rock faces |
| ⭐ | `volcanoGreen` | vegetated volcano flanks |
| 2nd | `ash` | volcano shoreline slab |
| 2nd | `crater` | crater tops |
| 2nd | `soil` | packed dirt stretches |
| 2nd | `ocean` (or `water`) | open sea — base + normal (normal makes waves real) |
| 3rd | `sky` | **360° equirectangular sky panorama** (2:1 image) as the whole skybox |

Notes on the environment:
- Terrain textures are tiled at world scale automatically (repeat controls density).
- Sea: drop `ocean_basecolor.jpg` + `ocean_normal.jpg` (a real water normal map brings the biggest jump — visible ripples/sun glint).
- Sky: drop a seamless **2:1 equirectangular panorama** as `sky.jpg` (or `sky_basecolor.jpg`). It replaces the procedural gradient+clouds and also lights/reflects the whole scene. The image must be a proper 360° panorama that wraps left-to-right.

## Notes

- The base color map is applied full-strength (material tint cleared to white)
  so your albedo shows through accurately.
- The optional normal map adds surface relief (roof ridges, stone joints,
  wood grain) that reacts to light — the biggest single realism boost.
- No code changes needed after adding files — just refresh / press Play.
