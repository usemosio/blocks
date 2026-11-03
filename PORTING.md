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
