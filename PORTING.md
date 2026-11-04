# Porting a component

Every block here is a Hyperframes sub-composition: one HTML file of HTML, CSS and GSAP that a host video
loads with `data-composition-src`. Most are ports of [remocn](https://github.com/Remocn/remocn) (MIT), which
are React components for Remotion. A port keeps the motion (timings, easing, order, look) and rewrites the
code as plain HTML. No React, no build step, no runtime of ours: an agent or a person can read and edit
every line.

Source commit for all ports: `Remocn/remocn@126221ae00ba86eb40b65731b125ff398687d3b7`.
Template to copy: `components/per-character-rise/`.

## Files

`components/<name>/` (the remocn name, kebab-case):

- `<name>.html`: the component.
- `registry-item.json`: metadata (same `variables` as the HTML).
- `demo.html`: a vertical 1080×1920 host that mounts it full-frame.

## The component file

- A doc comment first: title, one-line description, `Ported to an HTML + GSAP sub-composition by
  usemosio/blocks from:` and the source URL at the commit, then remocn's full MIT licence text.
- `<html data-composition-id="<name>" data-composition-duration="<s>" data-composition-variables='[…]'>`.
  Everything the runtime needs sits inside `<body><template>…</template></body>`.
- `#root` is styled by id: `position: absolute; inset: 0; overflow: hidden; container-type: size;`.
  It fills whatever the host gives it, so the same file works at 1080×1920 and 1920×1080.
  `<div id="root" data-composition-id="<name>" data-duration="<s>" data-fps="30">` with one clip child
  (`class="… clip" data-start="0" data-duration="<s>" data-track-index="0"`).
- Prefix every id and class with a short tag of the name (`pcr-` for per-character-rise) so two blocks
  can mount in one video.
- Scripts: GSAP 3.14.2 from `https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/…` (core and its official
  plugins only). One IIFE: read variables with `window.__hyperframes.getVariables()` (guard when absent,
  clamp numbers, fall back to the defaults), build DOM, build one `gsap.timeline({ paused: true })`,
  pad it to the duration, `tl.seek(0)`, then `window.__timelines["<name>"] = tl`.
- Fonts: a Google Fonts `<link>` inside the template, or system fonts. No font files, images, video,
  audio, or URLs other than the GSAP CDN and Google Fonts. Inline SVG and CSS gradients are fine.

## Motion must be a function of time

The renderer seeks the timeline to each frame, out of order. So:

- No `Date`, `performance.now()`, `requestAnimationFrame`, `setTimeout`/`setInterval`, CSS
  `@keyframes`/`transition`, or `Math.random()` (use a seeded generator, e.g. mulberry32 with a fixed seed).
- Anything computed per frame (scrambled characters, counters, noise, canvas 2D drawing) is set from a
  tween's `onUpdate` that reads the tween's own progress or `tl.time()`, so seeking to the same time always
  draws the same thing.
- No WebGL or 3D canvas. Canvas 2D is fine when deterministic.

## Translating Remotion

- Frames are 30 fps: `frames / 30` seconds. `useCurrentFrame() * speed` becomes a `speed` variable that
  scales durations, when remocn exposes it.
- `interpolate(frame, [a, b], [from, to], { easing: Easing.bezier(x1, y1, x2, y2) })` becomes a tween from
  `a/30` lasting `(b-a)/30` with `CustomEase.create("<tag>-<n>", "M0,0 C x1,y1 x2,y2 1,1")`.
  `Easing.linear` is `ease: "none"`; Remotion's named easings map to the same cubic-bezier.
- `spring({ frame, fps, config })`: sample a damped spring yourself (mass, stiffness, damping, 30 samples
  per second until it settles) into a `CustomEase` path, or drive the property from `onUpdate`. Write the
  spring math in the file; do not copy Remotion's source.
- `Sequence from={f} durationInFrames={d}`: position the tweens at `f/30` and hide outside the window.
- `@remotion/transitions` presentations (wipe, slide, fade, custom): the block plays the transition between
  two built-in placeholder panels ("A" and "B", styled after remocn's preview), so it previews on its own;
  say in the description how a host swaps its own scenes in.
- `@remotion/captions` (`createTikTokStyleCaptions`, `Caption`): take a `captions` variable, a JSON string of
  `[{"text","startMs","endMs"}]` (the Remotion caption shape), with a short default, and page them the way
  remocn does (`combineTokensWithinMilliseconds`). Mosio transcripts give words as `{text, start, end}` in
  seconds; accept that shape too.
- `@remotion/google-fonts/<Font>`: a Google Fonts link for that family.
- remocn props become `variables` (same names in snake_case, same defaults, sensible min/max). Keep the
  remocn defaults, including the sample text.

## A frame function, when tweens do not fit

When a component computes its look from the frame number in many places (icons, generative patterns,
UI states), port that function instead of rewriting it as tweens: write small helpers in the file
(`interpolate(input, inputRange, outputRange, { easing, extrapolateLeft, extrapolateRight })`, cubic-bezier
easing, `Easing.quad/cubic/sin/in/out/inOut`, a damped-spring sampler), translate the render body into a
`draw(frame)` that sets attributes and styles on the DOM built once, and drive it from the timeline:

```js
var clock = { frame: 0 };
tl.to(clock, { frame: totalFrames, duration: totalFrames / 30, ease: "none",
  onUpdate: function () { draw(clock.frame); } }, 0);
draw(0);
```

Write these helpers yourself from their definitions; never paste code from Remotion's source (its licence
is not MIT).

## WebGL shaders and filters

remocn's shader backdrops, filters and some transitions draw with WebGL. Port them as WebGL too, so
the look stays the shader's own. Template to copy: `components/shader-mesh-gradient/`.

- One WebGL2 `<canvas>` filling `#root`, sized at `resolution` × the host frame and stretched to fill it
  with CSS. `resolution` is a variable (`"role": "quality"`, 0.25 to 1). Default it to the lowest of
  0.5, 0.75 or 1 at which the stills look the same as at 1: soft gradients and noise hold at 0.5, fine
  dots, dithering, scanlines, ASCII and sharp edges need 0.75 or 1. Render machines have no GPU, so the
  shader runs in software: at 0.5 a 1080×1920 frame costs about what a text block costs, at 1 about 2.5×.
- Context `{ antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true }`. Compile,
  link, set the fixed uniforms once, then `draw(frame)` sets the time uniform and draws a full-screen
  quad. Drive `draw` from a clock tween (the frame function pattern above). Time is a pure function of the
  frame: remocn passes `frame / fps * speed` (seconds) or the frame number itself; keep whichever it uses.
- Without WebGL (`getContext` returns null or a shader fails to compile), hide the canvas and leave a CSS
  fallback that shows the palette or the content plainly; log one `console.warn`, never throw.
- Shaders from Paper Shaders (remocn's `shader-*` components that import `@paper-design/shaders-react`):
  copy the GLSL from `@paper-design/shaders` **0.0.82** (Apache-2.0; a local copy is at
  `~/.cache/paper-shaders/v082/package/dist/`): the fragment shader in `shaders/<name>.js`, the vertex
  shader in `vertex-shader.js` (keep only the outputs the fragment shader reads), the helpers it imports
  from `shader-utils.js` inlined. Never take code from 0.0.76 or older, which are under the PolyForm
  Shield licence, not Apache. Copy the props remocn passes (and the Paper defaults it relies on) into
  uniforms, including the sizing uniforms (`u_fit` is 2, cover, as remocn sets it). The header carries the
  Paper notice, NOTICE text and a "Changes by usemosio/blocks" line, as in the template.
- remocn presets (`shader-<base>-<preset>`) are blocks of their own: the base block with the preset's
  values as defaults, its own title, description and `useWhen`/`avoidWhen` from its docs page.
- Filters and transitions that run a shader over a scene (`u_scene`, `makeCanvasFilter`,
  `makeCanvasPresentation`): remocn captures its React children with the experimental HTML-in-Canvas API,
  which a render machine does not have. Draw the scene the remocn preview shows (sample text, panels A and
  B) on a 2D canvas, upload it as the texture each frame it changes, and say in the description that the
  block applies the look to its own content (text and colours from variables), not to the host's video.
- Images a shader needs (a shape mask, a logo): draw an equivalent with Canvas 2D (text, a glyph, a
  circle) by default. Never bundle image files.
- `registry-item.json`: `"webgl": true` and the tag `webgl`.

## Ports from other MIT libraries

Text effects also come from other MIT libraries: React UI kits built on Motion (Framer Motion) and
Remotion component kits. Local copies of the sources are in `~/.cache/textlibs/<library>/` (the commit of
each is in its `.git`). The same rules hold, plus:

- Header: title, description, "Ported to an HTML + GSAP sub-composition by usemosio/blocks from:" with the
  source URL at the commit (`https://github.com/<owner>/<repo>/blob/<commit>/<path>`), then that library's
  full licence text with its own copyright line, copied from its LICENSE file.
- `registry-item.json`: `tags` has `<library>-port` (for example `fancy-port`) instead of `remocn-port`;
  `author`, `authorUrl`, `license` and `source` (`repo`, `path`, `commit`) name that library.
- A web effect that waits for hover, scroll, a click or the element coming into view becomes a timed
  sequence: it plays as if triggered at a moment on the timeline (usually near the start), and a loop or
  an effect that repeats on hover repeats a fixed number of times within the block's duration. Choose a
  duration that shows the effect well, usually 2 to 6 seconds.
- Motion's springs and keyframes become GSAP tweens (sample a spring into a `CustomEase` or drive it from
  `onUpdate`); `Math.random()` becomes a seeded generator.
- Third-party runtime libraries a component imports (rough-notation, matter-js, number-flow, three, …) are
  not loaded: write the effect with GSAP, SVG, CSS or Canvas 2D, or skip the component.
- Keep the upstream name when it is free. When the name is taken in `components/` or the Hyperframes
  registry by a different effect, choose a descriptive name that is free. Names and sample text never
  carry product names (no "instagram", "imessage", …).
- When a component does the same as a block that already exists, skip it and say which block covers it.

## Blocks from Mosio recipes

Some blocks are taken from Mosio's own video recipes (a recipe is a whole look: `recipes/<id>/example.html`
and `STYLE.md` in the Mosio repository). Such a block keeps the recipe's motion and look for one component,
turns the recipe's brand tokens into colour variables with the recipe's colours as defaults, uses Indonesian
sample text with Rupiah prices, and carries `"tags": [..., "mosio-recipe"]`, `"category": "commerce"`,
`"author": "Mosio"` and `"source": {"recipe": "<id>"}`. A recipe adapted from someone else's work passes its
licence notice on to the block.

## Components that copy a real product

A remocn component that recreates a real product's interface (a chat app, a code host, a social network)
is adapted, not copied: keep its motion and kind of scene, drop the product's name, logo, icons, signature
colours, fonts and layout, give colours and labels variables with generic defaults, and give the block a
generic name that says what the scene is. List it in SKIPPED.md under "Adapted under another name".

## registry-item.json

Copy `components/per-character-rise/registry-item.json` and change: `name`, `title`, `description`,
`tags` (keep `remocn-port`), `category` (the remocn docs category), `duration` (the remocn docs
`length` / 30, or what the motion needs), `useWhen` / `avoidWhen` (from the docs front matter,
`content/docs/<category>/<name>.mdx`, shortened), `source.path`, `files`, `variables`. Add
`"static": true` only for a block that is meant to hold still, and `"checkAt": [seconds]` when its motion
sits in a window the default stills (10/35/65/95 %) would miss.

## demo.html

Copy `components/per-character-rise/demo.html`: a 1080×1920 root with a background that suits the block
(remocn's preview background), mounting the component full-frame with `data-variable-values` that read well
in a vertical frame (often a larger `font_size`).

## Check

```bash
python3 scripts/check.py <name>                     # vertical demo
python3 scripts/check.py --size 1920x1080 <name>    # landscape
```

Both must print `"ok": true`. Then look at `out/<name>.jpg` and `out/<name>-1920x1080.jpg` (four stills at
10/35/65/95 % of the duration): the motion and the look should match remocn's description, nothing may
spill off-frame, and text must stay readable at both sizes.
