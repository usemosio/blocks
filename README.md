# blocks

Animated text, captions, transitions, shop promos, shaders, motion graphics, UI and icons for
[Hyperframes](https://github.com/heygen-com/hyperframes) videos: plain HTML, CSS and GSAP, one file per
block. No React, no build step, no runtime to install. A person or an AI agent reads the file and edits any
line of it.

Most blocks are ports of [remocn](https://github.com/Remocn/remocn) (MIT), the shadcn-style registry of
Remotion components: the same motion (timings, easing, order, look), rewritten so it runs in a Hyperframes
composition. Every remocn component is here except one helper module; components that copied a real
product's look are here under generic names with a generic look. Both are listed in [SKIPPED.md](SKIPPED.md).
Twelve more are taken from the video recipes of [Mosio](https://mosio.me): prices, sales, menus, reviews,
countdowns, stats, a phone showcase and a shop end card, written for small shops.

## What's inside

439 blocks:

| | |
|---|---|
| Typography | 70: reveals, kinetic type, typewriter, highlights, glitch, vector type (outline trace, glyph anatomy, path ride) |
| Captions | 31: word-timed captions (karaoke, highlight box, scramble, split-flap, teleprompter…) from a `captions` variable |
| Transitions | 31: dissolves, wipes, zooms, whip pan, light leak, page turn, pixel sort, hyperspace, between built-in A/B panels a host swaps for its scenes |
| Shop and promo | 12: struck-through prices that count down, flash sale burst, menu price board, typed review with stars, event countdown, stat count-up, phone showcase, request-to-products, ads dashboard, news caption, sticker pop, shop end card (Rupiah sample text) |
| Shaders | 61: animated WebGL backdrops (mesh, grain and warp gradients, swirls, god rays, liquid metal, caustics, metaballs, voronoi…), 36 of them ready-made palettes |
| Motion graphics, looks, filters and scenes | 75: cursors, bursts, generative patterns, CRT, VHS, ASCII, halftone and security-cam looks, cloth reveal, camera moves, logo stings, code, chart, chat and terminal scenes |
| Templates | 5: multi-scene launch, brand and product films |
| UI | 54: buttons, inputs, menus, dialogs, toasts, sliders, steppers, and short app flows, each acting out its interaction |
| Icons | 100: Lucide-based icons that draw themselves and act (bell rings, heart beats, rocket lifts) |

Each one reads its text, colours, sizes and timing from composition variables, so it can carry a brand without
editing the file.

78 blocks draw with WebGL (`"webgl": true` in their `registry-item.json`). A render machine without a GPU
runs WebGL in software, so these draw their canvas at a reduced size set by their `resolution` variable: at
0.5 a 1080×1920 frame costs about what a text block costs, at 1 about 2.5 times that. The filter looks
(CRT, VHS, ASCII…) apply to a scene the block draws itself from its variables, not to the host's video.

## Use one

Each block is a sub-composition that fills the element it is mounted in, so the same file works in a
vertical 1080×1920 video and a landscape 1920×1080 one.

1. Copy `components/<name>/<name>.html` into your project at `compositions/components/<name>.html`.
2. Mount it in your composition and set its variables:

```html
<div
  id="headline"
  data-composition-id="per-character-rise"
  data-composition-src="compositions/components/per-character-rise.html"
  data-variable-values='{"text":"Kopi susu, Rp18.000","font_size":120,"color":"#1d1d1f"}'
  data-start="0.5"
  data-duration="2"
  data-track-index="2"
  data-width="1080"
  data-height="1920"
></div>
```

The variables of each block (text, colours, sizes, motion) are listed in its `registry-item.json` with their
defaults and ranges. `components/<name>/demo.html` is a working host for each one.

With [Mosio](https://mosio.me), the assistant finds these blocks through the `search_registry` tool of the
Mosio connector and Mosio supplies the files when a video is rendered.

## Layout

```
components/<name>/
  <name>.html            the block
  registry-item.json     title, description, when to use it, variables, source
  demo.html              a 1080×1920 host that mounts it
registry.json            every block (node scripts/build-registry.mjs)
scripts/check.py         lint, stills at four moments, flat-frame and motion checks
PORTING.md               how a remocn component is ported
```

## Check

```bash
export PRODUCER_HEADLESS_SHELL_PATH=/path/to/chrome-headless-shell
python3 scripts/check.py <name>                    # the vertical demo
python3 scripts/check.py --size 1920x1080 <name>   # mounted landscape
```

`out/<name>.jpg` holds the four stills. Needs Node (it runs `npx hyperframes@0.8.174`), Python 3 and Pillow.

## Licence

MIT, see [LICENSE](LICENSE). Ported blocks keep remocn's MIT notice in their header (two of the recipe blocks
keep lemo-opuscar's); the shader blocks built on
Paper Shaders also carry its Apache-2.0 notice. Third-party notices are in [THIRD_PARTY.md](THIRD_PARTY.md). "Hyperframes", "HeyGen", "Remotion", "remocn", "Paper" and "GSAP" are the names
of their owners' projects; this library is not affiliated with them.
