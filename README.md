# blocks

Animated text, captions, transitions, price and sale moments, shaders, motion graphics, UI and icons for
[Hyperframes](https://github.com/heygen-com/hyperframes) videos: plain HTML, CSS and GSAP, one file per
block. No React, no build step, no runtime to install. A person or an AI agent reads the file and edits any
line of it.

Most blocks are ports of [remocn](https://github.com/Remocn/remocn) (MIT), the shadcn-style registry of
Remotion components: the same motion (timings, easing, order, look), rewritten so it runs in a Hyperframes
composition. Every remocn component is here except one helper module; components that copied a real
product's look are here under generic names with a generic look. Both are listed in [SKIPPED.md](SKIPPED.md).
101 more text effects are ported from ten other MIT libraries: Magic UI, fancy, motion-primitives, Eldora UI,
Cult UI, RemotionUI, remotion-scenes, Kokonut UI, Onda and animata (word rollers, letter swaps, text along a
path, handwriting, variable-font morphs, SRT and two-language captions…).

86 come from the [Hyperframes registry](https://github.com/heygen-com/hyperframes/tree/main/registry/blocks)
(Apache-2.0): shader transitions, raw-WebGL scenes (three.js ones rewritten), carousels, maps (world, US,
Indonesia), hand-drawn titles, notification and post cards, made to fill any frame and with their bundled
images and fonts replaced. 396 animated icons come from [lucide-animated](https://github.com/pqoqubbw/icons)
(MIT), generated from its source by `scripts/gen-lucide-animated.mjs`. 18 are ports of public
[CodePen](https://codepen.io) pens made with GSAP (MIT under CodePen's terms), credited to their authors.

31 are made for small shops, with Rupiah sample text: seven from the video recipes of [Mosio](https://mosio.me)
(price drop, flash sale, menu board, typed review, countdown, stat count-up, shop end card) and 24 originals
drawn from what recurs in popular motion videos: a printed receipt, a stamp card, an order tracker, a voucher,
a QR payment, an open sign, a store pin, a bundle builder, a variant picker, a rating summary, review cards,
payment methods, before/after, product callouts, a product grid, a glass price card, a phone menu scroll, a
comparison, beat-cut title cards, a camera viewfinder, stats, steps and a focus pull.

## What's inside

1,059 blocks:

| | |
|---|---|
| Typography | 171: reveals, kinetic type, typewriter, highlights, glitch, vector type (outline trace, glyph anatomy, path ride), 19 word rollers (drum, slot, split-flap, 3D carousel…), letter swaps, text along a path, handwriting and write-on titles, variable-font and liquid morphs |
| Captions | 35: word-timed captions (karaoke, highlight box, scramble, split-flap, teleprompter…) from a `captions` variable, SRT/VTT tracks, two-language subtitles, speaker labels |
| Transitions | 48: dissolves, wipes, zooms, whip pan, light leak, page turn, pixel sort, hyperspace, iris, burn, warp, lens and liquid-edge wipes, between built-in A/B panels a host swaps for its scenes |
| Shop moments | 29: price drop, flash sale, menu board, receipt, stamp card, order tracker, voucher, QR payment, open sign, store pin, bundle, variant picker, ratings and reviews, payment methods, before/after, product callouts and grid, glass price card, countdown, stats, shop end card (Rupiah sample text) |
| Shaders | 80: animated WebGL backdrops (mesh, grain and warp gradients, swirls, god rays, liquid metal, caustics, metaballs, voronoi, aurora, nebula, thin film…), 36 of them ready-made palettes |
| Motion graphics, looks, filters and scenes | 129: cursors, bursts, generative patterns, CRT, VHS, ASCII, halftone and security-cam looks, cloth reveal, camera moves, logo stings, carousels, maps, charts and gauges, code, chat, notification and terminal scenes, routes and paths |
| Templates | 5: multi-scene launch, brand and product films |
| UI | 66: buttons, inputs, menus, dialogs, toasts, sliders, steppers, notification stacks, post and player cards, and short app flows, each acting out its interaction |
| Icons | 496: Lucide-based icons that draw themselves and act (bell rings, heart beats, rocket lifts) |

Each one reads its text, colours, sizes and timing from composition variables, so it can carry a brand without
editing the file.

115 blocks draw with WebGL (`"webgl": true` in their `registry-item.json`). A render machine without a GPU
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
PORTING.md               how a block is ported or made
```

## Check

```bash
export PRODUCER_HEADLESS_SHELL_PATH=/path/to/chrome-headless-shell
python3 scripts/check.py <name>                    # the vertical demo
python3 scripts/check.py --size 1920x1080 <name>   # mounted landscape
```

`out/<name>.jpg` holds the four stills. Needs Node (it runs `npx hyperframes@0.8.174`), Python 3 and Pillow.

## Licence

MIT, see [LICENSE](LICENSE). Every ported block keeps its source's notice in its header: remocn's and the other
libraries' MIT notices, lucide-animated's MIT and Lucide's ISC notice on the icons, the pen author's MIT notice on
CodePen ports, the Apache-2.0 notice on Hyperframes ports and on the shader blocks built on Paper Shaders (two of
the recipe blocks keep lemo-opuscar's). Third-party notices are in [THIRD_PARTY.md](THIRD_PARTY.md). "Hyperframes", "HeyGen", "Remotion", "remocn", "Paper", "Lucide", "CodePen" and "GSAP" are the names
of their owners' projects; this library is not affiliated with them.
