// Generates components/icon-*/ from remocn's registry/remocn-icons/icon-*/index.tsx.
// Run with bun (it strips the TypeScript and compiles the JSX with a string factory),
// pointing REMOCN_SRC at a checkout of github.com/Remocn/remocn at the commit below:
//   REMOCN_SRC=../remocn bun scripts/gen-icons.mjs [icon-name ...]
import fs from "node:fs";
import path from "node:path";

const SRC = process.env.REMOCN_SRC;
if (!SRC) throw new Error("Set REMOCN_SRC to a checkout of github.com/Remocn/remocn");
const COMMIT = "126221ae00ba86eb40b65731b125ff398687d3b7";
const ROOT = path.resolve(import.meta.dirname, "..");
const iconsDir = path.join(SRC, "registry/remocn-icons");

const THIRD = fs.readFileSync(path.join(ROOT, "THIRD_PARTY.md"), "utf8");
function block(after) {
  const i = THIRD.indexOf(after);
  const s = THIRD.indexOf("```\n", i) + 4;
  return THIRD.slice(s, THIRD.indexOf("\n```", s));
}
const MIT = block("## remocn");
const ISC = block("## Lucide");
const indent = (t) => t.split("\n").map((l) => (l ? "  " + l : l)).join("\n");

// Per-icon overrides: { name: (code) => code } applied to the transpiled function source.
const overrides = {};

const transpiler = new Bun.Transpiler({
  loader: "tsx",
  tsconfig: { compilerOptions: { jsx: "react", jsxFactory: "__h", jsxFragmentFactory: "__Frag" } },
});

const HELPERS = `
            // ---- Small helpers written for this block (frame-based, 30 fps) ----
            var FPS = 30;
            var currentFrame = 0;
            var opts = { animation: "both", loop: undefined, speed: 1 };
            function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
            var Easing = {
              linear: function (t) { return t; },
              quad: function (t) { return t * t; },
              cubic: function (t) { return t * t * t; },
              sin: function (t) { return 1 - Math.cos((t * Math.PI) / 2); },
              in: function (f) { return f; },
              out: function (f) { return function (t) { return 1 - f(1 - t); }; },
              inOut: function (f) {
                return function (t) { return t < 0.5 ? f(2 * t) / 2 : 1 - f(2 * (1 - t)) / 2; };
              },
              back: function (s) {
                var k = s === undefined ? 1.70158 : s;
                return function (t) { return t * t * ((k + 1) * t - k); };
              },
              bezier: function (x1, y1, x2, y2) {
                function sx(t) { var u = 1 - t; return 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t; }
                function sy(t) { var u = 1 - t; return 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t; }
                return function (x) {
                  if (x <= 0) return 0;
                  if (x >= 1) return 1;
                  var lo = 0, hi = 1, t = x;
                  for (var i = 0; i < 40; i++) {
                    t = (lo + hi) / 2;
                    if (sx(t) < x) lo = t; else hi = t;
                  }
                  return sy(t);
                };
              }
            };
            // interpolate(input, inputRange, outputRange, { easing, extrapolateLeft, extrapolateRight })
            function interpolate(input, inR, outR, o) {
              o = o || {};
              var ease = o.easing || Easing.linear;
              var n = inR.length - 1;
              var i = 0;
              while (i < n - 1 && input > inR[i + 1]) i++;
              var a = inR[i], b = inR[i + 1];
              var t = (input - a) / (b - a);
              if (t < 0 && o.extrapolateLeft === "clamp") t = 0;
              if (t > 1 && o.extrapolateRight === "clamp") t = 1;
              if (t >= 0 && t <= 1) t = ease(t);
              return outR[i] + (outR[i + 1] - outR[i]) * t;
            }
            // Damped spring from rest to 1 (closed form). With durationInFrames the motion is
            // stretched so it has settled by that many frames.
            function springAt(t, cfg) {
              var k = cfg.stiffness, c = cfg.damping, m = cfg.mass;
              var w0 = Math.sqrt(k / m), z = c / (2 * Math.sqrt(k * m));
              function x(s) {
                if (s <= 0) return 0;
                if (z < 1) {
                  var wd = w0 * Math.sqrt(1 - z * z);
                  return 1 - Math.exp(-z * w0 * s) * (Math.cos(wd * s) + ((z * w0) / wd) * Math.sin(wd * s));
                }
                return 1 - Math.exp(-w0 * s) * (1 + w0 * s);
              }
              return x(t);
            }
            var settleCache = {};
            function settleTime(cfg) {
              var key = cfg.stiffness + "/" + cfg.damping + "/" + cfg.mass;
              if (settleCache[key] === undefined) {
                var last = 0;
                for (var s = 0; s < 10; s += 1 / 600) {
                  if (Math.abs(1 - springAt(s, cfg)) > 0.005) last = s;
                }
                settleCache[key] = Math.max(last, 1 / 30);
              }
              return settleCache[key];
            }
            function spring(o) {
              var cfg = o.config;
              var t = o.frame / (o.fps || FPS);
              if (o.durationInFrames) t = t * (settleTime(cfg) / (o.durationInFrames / (o.fps || FPS)));
              return springAt(t, cfg);
            }
            function useVideoConfig() { return { fps: FPS }; }
            function easeOut3(t) { return 1 - Math.pow(1 - t, 3); }
            // The icon timeline: draw progress, scale-in spring, action progress (looping or one-shot).
            function useIconAnimation(props, timings) {
              var frame = currentFrame * (props.speed === undefined ? 1 : props.speed);
              var animation = props.animation || "both";
              var loop = props.loop === undefined ? !!timings.loop : props.loop;
              var drawDur = timings.drawDurationInFrames === undefined ? 14 : timings.drawDurationInFrames;
              var delay = timings.actionDelayInFrames === undefined ? 2 : timings.actionDelayInFrames;
              var actDur = timings.actionDurationInFrames === undefined ? 20 : timings.actionDurationInFrames;
              var drawProgress = animation === "action" ? 1 : easeOut3(clamp01(drawDur > 0 ? frame / drawDur : 1));
              var scaleIn = clamp01(spring({ frame: frame, fps: FPS, config: { damping: 18, stiffness: 220, mass: 0.7 }, durationInFrames: Math.max(1, drawDur) }));
              var actionStart = animation === "action" ? 0 : drawDur + delay;
              var since = frame - actionStart;
              if (animation === "draw" || since < 0) return { drawProgress: drawProgress, scaleIn: scaleIn, actionFrame: since, actionProgress: 0, cycleIndex: 0 };
              if (actDur <= 0) return { drawProgress: drawProgress, scaleIn: scaleIn, actionFrame: since, actionProgress: 1, cycleIndex: 0 };
              if (loop) {
                var ci = Math.floor(since / actDur);
                var local = since - ci * actDur;
                return { drawProgress: drawProgress, scaleIn: scaleIn, actionFrame: local, actionProgress: local / actDur, cycleIndex: ci };
              }
              return { drawProgress: drawProgress, scaleIn: scaleIn, actionFrame: since, actionProgress: clamp01(since / actDur), cycleIndex: 0 };
            }
            // Stroke drawing with pathLength="1": dash 1, gap 1, offset 1 - progress.
            function drawnPathProps(_d, progress) {
              return { strokeDasharray: "1 1", strokeDashoffset: 1 - clamp01(progress) };
            }
            // Tiny JSX factory: builds SVG markup strings.
            var ATTR = { className: "class", viewBox: "viewBox", pathLength: "pathLength" };
            function kebab(k) { return ATTR[k] || k.replace(/[A-Z]/g, function (m) { return "-" + m.toLowerCase(); }); }
            function __Frag(props) { return flat(props.children).join(""); }
            function flat(c) {
              var out = [];
              (function walk(x) {
                if (Array.isArray(x)) x.forEach(walk);
                else if (x !== null && x !== undefined && x !== false && x !== true) out.push(String(x));
              })(c);
              return out;
            }
            function __h(tag, props) {
              var kids = Array.prototype.slice.call(arguments, 2);
              if (typeof tag === "function") return tag(Object.assign({}, props, { children: kids }));
              var attrs = "";
              props = props || {};
              Object.keys(props).forEach(function (k) {
                var v = props[k];
                if (v === undefined || v === null || v === false) return;
                if (k === "style") {
                  v = Object.keys(v).map(function (s) { return kebab(s) + ":" + v[s]; }).join(";");
                }
                attrs += " " + kebab(k) + '="' + v + '"';
              });
              if (tag === "path" && props.strokeDasharray !== undefined) attrs += ' pathLength="1"';
              var inner = flat(kids).join("");
              return "<" + tag + attrs + ">" + inner + "</" + tag + ">";
            }
`;

function extract(name) {
  const file = path.join(iconsDir, name, "index.tsx");
  let src = fs.readFileSync(file, "utf8");
  // main component only: cut at the Static variant
  const cut = src.search(/export function \w+IconStatic/);
  if (cut > 0) src = src.slice(0, cut);
  let js = transpiler.transformSync(src);
  js = js
    .replace(/^"use client";?\s*$/m, "")
    .replace(/^import[\s\S]*?from\s*["'][^"']+["'];?\s*$/gm, "")
    .replace(/^export\s+/gm, "");
  const fn = js.match(/function (\w+Icon)\(/);
  if (!fn) throw new Error("no component in " + name);
  if (overrides[name]) js = overrides[name](js);
  return { js: js.trim(), fn: fn[1], timings: parseTimings(src) };
}

function parseTimings(src) {
  const m = src.match(/const TIMINGS = \{([\s\S]*?)\}/);
  const o = {};
  for (const l of (m ? m[1] : "").split(",")) {
    const kv = l.split(":").map((s) => s.trim());
    if (kv.length === 2) o[kv[0]] = kv[1] === "true" ? true : kv[1] === "false" ? false : Number(kv[1]);
  }
  return o;
}

const label = (name) =>
  name.replace(/^icon-/, "").split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

function variables(loopDefault) {
  return [
    { id: "animation", type: "enum", role: "motion", label: "Animation", description: "Draw the strokes, play the action, or both.", default: "both", options: [{ value: "draw", label: "Draw" }, { value: "action", label: "Action" }, { value: "both", label: "Both" }] },
    { id: "loop", type: "boolean", role: "motion", label: "Loop", description: "Repeat the action motion.", default: loopDefault },
    { id: "speed", type: "number", role: "motion", label: "Speed", description: "Playback speed multiplier.", default: 1, min: 0.25, max: 4, step: 0.05 },
    { id: "size", type: "number", role: "style", label: "Size", description: "Icon size in pixels.", default: 48, min: 8, max: 1000, step: 1, unit: "px" },
    { id: "color", type: "color", role: "style", label: "Color", description: "Stroke color.", default: "#171717" },
    { id: "stroke_width", type: "number", role: "style", label: "Stroke width", description: "Stroke width in a 24-unit grid.", default: 2, min: 0.5, max: 6, step: 0.25 },
  ];
}

function build(name) {
  const { js, fn, timings } = extract(name);
  const title = label(name) + " Icon";
  const dm = js.match(/\n\s*loop = (true|false)/);
  const loopDefault = dm ? dm[1] === "true" : !!timings.loop;
  const draw = timings.drawDurationInFrames ?? 14;
  const delay = timings.actionDelayInFrames ?? 2;
  const act = timings.actionDurationInFrames ?? 20;
  const dur = loopDefault
    ? Math.min(4, Math.max(3, Math.ceil((draw + delay + 2 * act) / 30)))
    : Math.min(4, Math.max(2, Math.ceil((draw + delay + act) / 30 + 0.7)));
  const vars = variables(loopDefault);
  const varJson = JSON.stringify(vars);
  const p = name + "-";
  const srcPath = `registry/remocn-icons/${name}/index.tsx`;
  const html = `<!doctype html>
<!--
  ${title}

  An animated icon: the strokes draw in, then it plays its signature motion.

  Ported to an HTML + GSAP sub-composition by usemosio/blocks from:
  https://github.com/Remocn/remocn/blob/${COMMIT}/${srcPath}

${indent(MIT)}

  The icon paths are derived from Lucide (https://lucide.dev):

${indent(ISC)}
-->
<html
  lang="en"
  data-composition-id="${name}"
  data-composition-duration="${dur}"
  data-composition-variables='${varJson.replace(/'/g, "&#39;")}'
>
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
  </head>
  <body>
    <template>
      <style>
        #root {
          position: absolute;
          inset: 0;
          overflow: hidden;
          container-type: size;
          pointer-events: none;
        }
        #${p}stage {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        #${p}host { display: flex; line-height: 0; }
      </style>

      <div id="root" data-composition-id="${name}" data-duration="${dur}" data-fps="30">
        <div id="${p}stage" class="clip" data-start="0" data-duration="${dur}" data-track-index="0">
          <div id="${p}host"></div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
        <script>
          (function () {
            "use strict";
            var root = document.getElementById("root");
            var host = document.getElementById("${p}host");
            var vars =
              window.__hyperframes && window.__hyperframes.getVariables
                ? window.__hyperframes.getVariables()
                : {};
            function num(value, fallback, min, max) {
              var n = Number(value);
              return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
            }
${HELPERS}
            // ---- Ported from the source component (TypeScript types removed, JSX built by __h) ----
${indent(indent(indent(indent(indent(indent(js))))))}

            var animation = ["draw", "action", "both"].indexOf(vars.animation) >= 0 ? vars.animation : "both";
            opts.animation = animation;
            opts.loop = typeof vars.loop === "boolean" ? vars.loop : undefined;
            opts.speed = num(vars.speed, 1, 0.25, 4);
            var size = num(vars.size, 48, 8, 1000);
            var color = typeof vars.color === "string" && vars.color ? vars.color : "#171717";
            var strokeWidth = num(vars.stroke_width, 2, 0.5, 6);

            function draw(frame) {
              currentFrame = frame;
              host.innerHTML = ${fn}({ animation: animation, loop: opts.loop, speed: opts.speed, size: size, color: color, strokeWidth: strokeWidth });
            }

            var total = parseFloat(root.dataset.duration || "${dur}");
            var clock = { frame: 0 };
            var tl = gsap.timeline({ paused: true });
            tl.to(clock, { frame: Math.round(total * 30), duration: total, ease: "none", onUpdate: function () { draw(clock.frame); } }, 0);
            draw(0);
            tl.seek(0);
            window.__timelines = window.__timelines || {};
            window.__timelines["${name}"] = tl;
          })();
        </script>
      </div>
    </template>
  </body>
</html>
`;
  const item = {
    $schema: "https://hyperframes.heygen.com/schema/registry-item.json",
    name,
    type: "hyperframes:component",
    title,
    description: `An animated ${label(name).toLowerCase()} icon: the strokes draw in, then it plays its signature motion.`,
    tags: ["icon", "icons", "remocn-port", label(name).toLowerCase().replace(/ /g, "-")],
    category: "icons",
    duration: dur,
    useWhen: [
      `A video needs a ${label(name).toLowerCase()} glyph that draws itself on and then moves.`,
      "A crisp line icon on a UI mockup, a feature list or a callout.",
    ],
    avoidWhen: ["A filled or photographic image is needed.", "The icon must stay perfectly still: use a static SVG."],
    author: "Remocn",
    authorUrl: "https://github.com/Remocn/remocn",
    license: "MIT",
    licenses: "Icon paths are derived from Lucide (https://lucide.dev), ISC License; see THIRD_PARTY.md.",
    source: { repo: "https://github.com/Remocn/remocn", path: srcPath, commit: COMMIT },
    files: [{ path: `${name}.html`, target: `compositions/components/${name}.html`, type: "hyperframes:snippet" }],
    variables: vars,
  };
  // activity: the heartbeat pulse is a brief 7% scale beat, below the stills check's motion threshold.
  if (name === "icon-activity") item.static = true;
  const demo = `<!doctype html>
<!-- ${title} demo: a vertical 1080×1920 frame mounting the component full-frame. -->
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>${title} Demo</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: #ffffff; }
      #root { position: relative; width: 1080px; height: 1920px; overflow: hidden; background: #ffffff; }
      .demo-mount { position: absolute; inset: 0; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="${name}-demo" data-start="0" data-width="1080" data-height="1920" data-duration="${dur}" data-fps="30">
      <div
        id="demo-mount"
        class="demo-mount clip"
        data-composition-id="${name}"
        data-composition-src="./${name}.html"
        data-variable-values='{"size":360,"color":"#171717"}'
        data-start="0"
        data-duration="${dur}"
        data-track-index="1"
        data-width="1080"
        data-height="1920"
      ></div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["${name}-demo"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;
  const dir = path.join(ROOT, "components", name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.html`), html);
  fs.writeFileSync(path.join(dir, "registry-item.json"), JSON.stringify(item, null, 2) + "\n");
  fs.writeFileSync(path.join(dir, "demo.html"), demo);
}

const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(iconsDir).filter((n) => /^icon-/.test(n) && n !== "icons-core").sort();
for (const n of names) {
  try { build(n); } catch (e) { console.error("FAIL", n, e.message); }
}
console.log("generated", names.length);
