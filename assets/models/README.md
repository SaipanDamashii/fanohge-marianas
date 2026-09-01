# 3D Models (optional)

Drop real `.glb` models here to replace built-in procedural geometry.

## Coconut palm

`coconut-palm.glb` — a realistic coconut palm tree. Auto-loaded at launch and
used to replace the built-in procedural palms in groves and plantations.
Normalized to ~1 unit tall, then scaled per island.

Recommended generation: Sorceress `sorceress_generate_model` (meshy-6), prompt:
_"A single realistic coconut palm tree, gently curved slender brown trunk, a
crown of 8–10 long drooping green fronds, a few coconuts clustered under the
fronds, tropical island coconut palm, realistic, PBR textured, feet on y=0"_

## People — realistic male & female villagers

The game replaces the blocky procedural villagers with realistic 3D people the
moment these two files exist. The game re-uses one male and one female model for
every villager (mixed by index), so both files are optional — provide whichever
you have; a single one is used for everyone.

```
assets/models/person_male.glb
assets/models/person_female.glb
```

Both are normalized to ~1 unit tall (feet on y=0), then scaled per island and
grounded on the real terrain (downward raycaster + Box3 foot correction).

**For moving limbs:** the GLB should be **skinned/rigged with the animation
clips EMBEDDED** (e.g. a Mixamo-rigged export with walk + idle clips baked in the
same file). The game detects `walk`/`move`/`run` and `idle`/`stand` clips by name
and drives each villager's skeleton so they actually stride and idle. If the clips
are separate files, export them combined into the same `.glb` (Mixamo's "Download
with `Skin` + animation" or a combined FBX→GLB conversion includes the clips).

Recommended prompts (Sorceress `sorceress_generate_model`, meshy-6):

- Male: _"A realistic Polynesian villager man in a simple island loincloth, bare
  chest, tan skin, standing straight arms relaxed at sides in a neutral T-pose,
  open A-pose so arms are clearly separate from the body, feet flat on the ground
  at y=0, realistic PBR textured human, low-poly realistic style"_

- Female: _"A realistic Polynesian villager woman in a simple island dress,
  shoulder-length dark hair, tan skin, standing straight arms relaxed at sides in
  a neutral A-pose, open pose so arms are clearly separate from the body, feet
  flat on the ground at y=0, realistic PBR textured human, low-poly realistic
  style"_

Use an **open A-pose** (arms slightly out, clear gap at the armpits, legs apart)
with nothing in the hands and no base/pedestal — required so the skeleton/pose
stays clean and so no clothing fuses to the legs.
