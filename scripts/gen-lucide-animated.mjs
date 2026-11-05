// Generates components/icon-*/ from lucide-animated's icons/*.tsx (github.com/pqoqubbw/icons, MIT).
//
//   bun scripts/gen-lucide-animated.mjs [icon-name ...]
//   LUCIDE_ANIMATED_SRC=<checkout> bun scripts/gen-lucide-animated.mjs --dump bell   (prints the resolved tracks)
//
// Each source icon is a React component on motion/react: SVG elements carry `variants`, and a hover
// calls `controls.start("animate")`. The script transpiles the TSX (Bun strips the types and compiles the
// JSX with a recording factory), evaluates the component against a small mock of React and of motion,
// and plays the hover handlers on a virtual clock: every `controls.start(...)` is resolved the way
// Motion resolves it (variant labels, `custom`, inherited variants, stagger, transition defaults,
// springs, keyframe `times`, repeats) into plain tracks: { element, property, keyframes, times, eases,
// duration, delay, repeat }. The block draws the static SVG and plays those tracks as one GSAP timeline.
//
// Icons already in components/ (the remocn set, or any block added before) are never touched: the
// generator skips them and says which block covers them. Icons it cannot express are skipped with a
// reason (`skips` below and the checks in resolve()). Notes go to .port-notes/icons.md.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SRC = process.env.LUCIDE_ANIMATED_SRC || path.join(os.homedir(), ".cache/textlibs/lucide-animated");
const COMMIT = "4662fff2b60fdcf4751b32013606756caf7c4c26";
const REPO = "https://github.com/pqoqubbw/icons";
const ROOT = path.resolve(import.meta.dirname, "..");
const iconsDir = path.join(SRC, "icons");

// ---------------------------------------------------------------------------------------------
// Licence text
// ---------------------------------------------------------------------------------------------
const THIRD = fs.readFileSync(path.join(ROOT, "THIRD_PARTY.md"), "utf8");
function block(after) {
  const i = THIRD.indexOf(after);
  const s = THIRD.indexOf("```\n", i) + 4;
  return THIRD.slice(s, THIRD.indexOf("\n```", s));
}
const ISC = block("## Lucide");
const MIT = fs.readFileSync(path.join(SRC, "LICENSE"), "utf8").trim().replace(/\n\n/g, "\n\n");
const indent = (t) => t.split("\n").map((l) => (l ? "  " + l : l)).join("\n");

// ---------------------------------------------------------------------------------------------
// Per-icon overrides and skips
// ---------------------------------------------------------------------------------------------
// skips: icons the generator does not express. name -> reason.
const skips = {
  volume: "plays by swapping elements in and out with AnimatePresence on React state (no variants to resolve)",
  keyboard: "keys blink with Math.random delays inside a useEffect on React state (no variants to resolve)",
  // Brand logos: blocks carry no product names or logos.
  ...Object.fromEntries(
    ["chrome", "discord", "dribbble", "facebook", "figma", "github", "gitlab", "instagram", "linkedin", "twitch", "twitter", "youtube"].map(
      (n) => [n, "brand logo, left out (blocks carry no brand names or logos)"],
    ),
  ),
};
// overrides: name -> (resolved) => resolved, for icons whose resolved tracks need a hand fix.
const overrides = {};
const lateStills = new Set(["bluetooth", "facebook"]);

// ---------------------------------------------------------------------------------------------
// 1. Evaluate the component against a mock of React and motion
// ---------------------------------------------------------------------------------------------
const transpiler = new Bun.Transpiler({
  loader: "tsx",
  tsconfig: { compilerOptions: { jsx: "react", jsxFactory: "__jsx", jsxFragmentFactory: "__Frag" } },
});

function flat(c, out = []) {
  if (Array.isArray(c)) c.forEach((x) => flat(x, out));
  else if (c !== null && c !== undefined && c !== false && c !== true) out.push(c);
  return out;
}

// Mutable evaluation state, reset per icon.
let ctx;

function jsx(tag, props, ...children) {
  props = props || {};
  if (typeof tag === "function") return tag({ ...props, children: flat(children) });
  const motion = typeof tag === "object" && tag !== null && tag.__motion;
  return { tag: motion ? tag.__motion : tag, motion: !!motion, props, children: flat(children) };
}
const Frag = (p) => flat(p.children);
const motion = new Proxy({}, { get: (_, name) => ({ __motion: String(name) }) });

class Controls {
  constructor(id) {
    this.id = id;
  }
  start(def, override) {
    return ctx.start(this, def, override);
  }
  stop() {}
  set() {}
}

function evaluate(name) {
  const file = path.join(iconsDir, name + ".tsx");
  const src = fs.readFileSync(file, "utf8");
  let js = transpiler.transformSync(src);
  js = js
    .replace(/^"use client";?\s*$/m, "")
    .replace(/^import[\s\S]*?from\s*["'][^"']+["'];?\s*$/gm, "")
    .replace(/^export\s*\{[^}]*\};?\s*$/gm, "")
    .replace(/^export\s+/gm, "");
  const m = js.match(/const (\w+) = forwardRef/);
  if (!m) throw new Error("no forwardRef component");
  ctx = new Sim();
  const factory = new Function(
    "__jsx", "__Frag", "motion", "useAnimation", "forwardRef", "useCallback", "useImperativeHandle", "useRef",
    "useState", "useEffect", "useMemo", "AnimatePresence", "Fragment", "cn", "setTimeout", "clearTimeout",
    "cubicBezier", "easeInOut", "easeOut",
    js + `\nreturn ${m[1]};`,
  );
  const comp = factory(
    jsx, Frag, motion, () => { const c = new Controls(ctx.controls.length); ctx.controls.push(c); return c; },
    (f) => f, (f) => f, (_ref, f) => { ctx.handleFactory = f; }, (v) => ({ current: v }), (v) => [v, () => {}], () => {}, (f) => f(),
    (p) => flat(p.children), Frag, (...a) => a.filter(Boolean).join(" "),
    (fn, ms) => { const t = { at: ctx.vt + ms / 1000, fn, id: ctx.timers.length }; ctx.timers.push(t); return t.id; },
    (id) => { const t = ctx.timers[id]; if (t) t.fn = null; },
    (a, b, c, d) => [a, b, c, d], "easeInOut", "easeOut",
  );
  const tree = comp({}, { current: null });
  const handle = ctx.handleFactory ? ctx.handleFactory() : null;
  return { tree, handle, source: src };
}

// ---------------------------------------------------------------------------------------------
// 2. The simulation: Motion's variant resolution on a virtual clock
// ---------------------------------------------------------------------------------------------
const TRANSFORM = new Set(["x", "y", "z", "translateX", "translateY", "translateZ", "scale", "scaleX", "scaleY", "rotate", "rotateX", "rotateY", "rotateZ", "skew", "skewX", "skewY"]);
const ORCHESTRATION = new Set(["when", "delay", "delayChildren", "staggerChildren", "staggerDirection", "repeat", "repeatType", "repeatDelay", "from", "elapsed"]);
const DEFAULTS = { x: 0, y: 0, translateX: 0, translateY: 0, scale: 1, scaleX: 1, scaleY: 1, rotate: 0, skewX: 0, skewY: 0, opacity: 1, pathLength: 1, pathOffset: 0 };
const num = (v) => (typeof v === "string" && /^-?[\d.]+(deg|px)?$/.test(v) ? parseFloat(v) : v);

class Sim {
  constructor() {
    this.controls = [];
    this.timers = [];
    this.vt = 0; // virtual time of the next call
    this.els = []; // motion elements, document order
    this.vals = new Map(); // element -> { prop: current value }
    this.tracks = []; // resolved tracks of the current phase, times relative to phase start
    this.phaseStart = 0;
    this.problems = new Set();
    this.endOfPhase = 0;
  }

  // --- tree ---
  index(tree) {
    this.root = tree;
    let k = 0;
    const walk = (node, motionParent, parent) => {
      if (!node || typeof node !== "object") return;
      node.parent = parent;
      node.parentMotion = motionParent;
      if (node.motion) {
        node.mk = this.els.length;
        this.els.push(node);
        node.vchildren = [];
        if (motionParent && (node.props.variants || node.props.animate)) motionParent.vchildren.push(node);
      }
      node.id = "k" + k++;
      const next = node.motion ? node : motionParent;
      node.children.forEach((c) => walk(c, next, node));
    };
    walk(tree, null, null);
  }

  customOf(el) {
    for (let e = el; e; e = e.parentMotion) if (e.props.custom !== undefined) return e.props.custom;
    return undefined;
  }
  resolveVariant(el, def) {
    if (def === undefined || def === null || def === false) return undefined;
    let v = def;
    if (typeof v === "string") v = el.props.variants && el.props.variants[v];
    if (typeof v === "function") v = v(this.customOf(el), {}, {});
    return v;
  }
  initialLabelOf(el) {
    for (let e = el; e; e = e.parentMotion) if (e.props.initial !== undefined) return e.props.initial;
    return undefined;
  }
  // The values an element shows before any hover: its `initial` (own or inherited label) or plain attributes.
  initialValues(el) {
    const init = el.props.initial !== undefined ? el.props.initial : typeof this.initialLabelOf(el) === "string" && el.props.variants ? this.initialLabelOf(el) : undefined;
    const t = this.resolveVariant(el, init);
    const out = {};
    if (t && typeof t === "object") {
      for (const [k, v] of Object.entries(t)) {
        if (k === "transition" || k === "transitionEnd") continue;
        out[k] = Array.isArray(v) ? v[0] : v;
      }
      if (t.transitionEnd) Object.assign(out, t.transitionEnd);
    }
    return out;
  }
  initAll() {
    for (const el of this.els) this.vals.set(el, this.initialValues(el));
  }
  current(el, key) {
    const v = this.vals.get(el);
    if (v && v[key] !== undefined) return v[key];
    if (DEFAULTS[key] !== undefined) return DEFAULTS[key];
    const a = el.props[key];
    if (a !== undefined) return a;
    if (key === "fill" || key === "stroke" || key === "strokeWidth") {
      for (let e = el.parent; e; e = e.parent) if (e.props && e.props[key] !== undefined) return num(e.props[key]);
    }
    return undefined;
  }

  // --- controls.start ---
  start(controls, def, override) {
    // Elements that receive it: bound to these controls directly (children first, as React mounts them),
    // then every variant child of those when the definition is a label.
    const jobs = new Map(); // element -> { target, delay }
    const bound = this.els.filter((e) => e.props.animate === controls).reverse();
    const give = (el, def, delay) => {
      const resolved = this.resolveVariant(el, def);
      jobs.set(el, { resolved, delay });
      const tr = override || (resolved && resolved.transition) || el.props.transition || {};
      if (typeof def !== "string") return;
      const { delayChildren = 0, staggerChildren = 0, staggerDirection = 1, when } = tr;
      if (when) this.problems.add("when:" + when);
      const kids = el.vchildren;
      kids.forEach((kid, i) => {
        const st = staggerDirection === 1 ? i * staggerChildren : (kids.length - 1 - i) * staggerChildren;
        give(kid, def, delay + (typeof delayChildren === "number" ? delayChildren : 0) + st);
      });
    };
    for (const el of bound) give(el, def, 0);
    let end = 0;
    for (const [el, job] of jobs) end = Math.max(end, this.animateEl(el, job, override));
    const thenable = {
      then: (res) => {
        this.vt += end;
        res();
        return thenable;
      },
      catch: () => thenable,
      finally: (f) => {
        f();
        return thenable;
      },
    };
    return thenable;
  }

  // Returns the end time (relative to now) of the animations it started.
  animateEl(el, { resolved, delay }, override) {
    if (!resolved || typeof resolved !== "object") return 0;
    let { transition, transitionEnd, ...target } = resolved;
    const def = el.props.transition || {};
    transition = transition ? (transition.inherit ? { ...def, ...transition } : transition) : def;
    if (override) transition = override;
    let end = 0;
    const vals = this.vals.get(el);
    for (const key of Object.keys(target)) {
      let tv = target[key];
      if (tv === undefined) continue;
      if (key === "originX" || key === "originY" || key === "transformOrigin") {
        vals[key] = tv;
        this.tracks.push({ el, prop: "origin", kf: [originOf(el, vals)], instant: true, dur: 0, delay, repeat: 0, total: 0, at: this.vt - this.phaseStart });
        continue;
      }
      const kf = (Array.isArray(tv) ? tv : [null, tv]).map(num);
      const cur = this.current(el, key);
      if (kf[0] === null) kf[0] = cur;
      if (!Array.isArray(tv) && kf[1] === cur) continue; // already there
      if (kf.some((v) => v === undefined || v === null)) {
        this.problems.add("no start value for " + key);
        continue;
      }
      const vt = { delay, ...(transition[key] ?? transition.default ?? transition) };
      const track = this.makeTrack(el, key, kf, vt);
      if (!track) continue;
      track.at = this.vt - this.phaseStart;
      this.addTrack(el, track);
      end = Math.max(end, track.delay + track.total);
      // Final value.
      let final = kf[kf.length - 1];
      if (track.repeat > 0 && track.repeatType !== "loop" && (track.repeat + 1) % 2 === 0) final = kf[0];
      vals[key] = final;
    }
    if (transitionEnd) Object.assign(vals, transitionEnd);
    return end;
  }

  addTrack(el, track) {
    track.el = el;
    this.tracks.push(track);
  }

  makeTrack(el, key, kf, vt) {
    const defined = Object.keys(vt).some((k) => !ORCHESTRATION.has(k));
    let o = { ease: "easeOut", ...vt };
    if (!defined) {
      if (kf.length > 2) o = { ...o, type: "keyframes", duration: 0.8 };
      else if (TRANSFORM.has(key)) {
        o = key.startsWith("scale")
          ? { ...o, type: "spring", stiffness: 550, damping: kf[1] === 0 ? 2 * Math.sqrt(550) : 30, restSpeed: 10 }
          : { ...o, type: "spring", stiffness: 500, damping: 25, restSpeed: 10 };
      } else o = { ...o, type: "keyframes", ease: [0.25, 0.1, 0.35, 1], duration: 0.3 };
    }
    const type = o.type === undefined || o.type === "tween" ? "keyframes" : o.type;
    const repeatRaw = o.repeat || 0;
    const track = {
      prop: key,
      kf,
      delay: o.delay || 0,
      repeat: repeatRaw,
      repeatType: o.repeatType || "loop",
      repeatDelay: o.repeatDelay || 0,
    };
    if (type === "spring") {
      const sp = springParams(o, kf);
      track.dur = sp.duration;
      track.spring = sp.spring;
      if (kf.length > 2) {
        this.problems.add("spring over " + kf.length + " keyframes");
        // Motion's spring takes only two keyframes; play the keyframes evenly over the spring's duration.
        track.spring = undefined;
        track.eases = ["linear"];
      }
    } else if (type === "keyframes") {
      track.dur = o.duration === undefined ? 0.3 : o.duration;
      track.eases = o.ease;
      if (o.times) track.times = o.times;
    } else {
      this.problems.add("transition type " + type);
      return null;
    }
    if (track.dur === 0 && !track.repeatDelay) {
      // Instant: jump to the last keyframe.
      track.kf = [kf[kf.length - 1]];
      track.instant = true;
      track.dur = 0;
    }
    track.total = track.dur * (track.repeat + 1) + track.repeatDelay * track.repeat;
    return track;
  }
}

// Spring parameters the way Motion resolves them: physics (stiffness, damping, mass) win over
// duration/bounce; the settle time follows from the rest thresholds.
function springParams(o, kf) {
  const valid = (v, zero) => (zero ? v >= 0 : v > 0) && v < Infinity;
  const physics = valid(o.stiffness) || valid(o.damping, true) || valid(o.mass);
  let k = valid(o.stiffness) ? o.stiffness : 100;
  let c = valid(o.damping, true) ? o.damping : 10;
  const m = valid(o.mass) ? o.mass : 1;
  const delta = Math.abs(kf[kf.length - 1] - kf[0]);
  if (!physics && (o.duration !== undefined || o.bounce !== undefined)) {
    const bounce = o.bounce === undefined ? 0.3 : o.bounce;
    const zeta = bounce < 0 ? 1 / Math.max(1 + bounce, 0.05) : Math.max(1 - bounce, 0.05);
    if (o.visualDuration) {
      const w = (2 * Math.PI) / (o.visualDuration * 1.2);
      k = w * w;
    } else {
      const d = Math.min(10, Math.max(0.01, o.duration === undefined ? 0.8 : o.duration));
      // Solve the settle envelope (0.001) for the undamped frequency by bisection.
      const env = (w) => {
        if (zeta < 1) {
          const wd = w * Math.sqrt(1 - zeta * zeta);
          return 0.001 - ((zeta * w) / wd) * Math.exp(-zeta * w * d);
        }
        return -0.001 + Math.exp(-w * d) * (w * d + 1);
      };
      let lo = 0.1, hi = 2000;
      for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2;
        if (env(mid) < 0 === zeta < 1) hi = mid; else lo = mid;
      }
      k = ((lo + hi) / 2) ** 2;
    }
    c = 2 * zeta * Math.sqrt(k);
    if (!o.visualDuration) return { duration: Math.min(10, Math.max(0.01, o.duration === undefined ? 0.8 : o.duration)), spring: { k: round(k), c: round(c), m: 1 } };
  }
  const restSpeed = o.restSpeed || (delta < 5 ? 0.01 : 2);
  const restDelta = o.restDelta || (delta < 5 ? 0.005 : 0.5);
  // Settle time: first moment from which position and speed stay inside the rest thresholds.
  const w0 = Math.sqrt(k / m), z = c / (2 * Math.sqrt(k * m));
  const unit = (t) => springUnit(t, w0, z);
  const dt = 1 / 1000;
  let last = 0;
  for (let t = 0; t < 10; t += dt) {
    const x = unit(t), v = (unit(t + dt) - unit(t - dt)) / (2 * dt);
    const dist = Math.abs(1 - x) * (delta || 1);
    if (dist > restDelta || Math.abs(v) * (delta || 1) > restSpeed) last = t;
  }
  return { duration: round(Math.max(last + dt, 1 / 30)), spring: { k: round(k), c: round(c), m: round(m) } };
}
function springUnit(t, w0, z) {
  if (t <= 0) return 0;
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
  }
  if (z === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const r = w0 * Math.sqrt(z * z - 1), s = z * w0 - r, f = z * w0 + r;
  return 1 - (f * Math.exp(-s * t) - s * Math.exp(-f * t)) / (f - s);
}
// transform-origin string of an element from its style and the current originX/originY/transformOrigin values.
const pct = (v) => (typeof v === "number" ? v * 100 + "%" : String(v));
function originOf(el, vals) {
  const st = el.props.style || {};
  const t = vals.transformOrigin ?? st.transformOrigin;
  if (t !== undefined && vals.originX === undefined && vals.originY === undefined) return String(t);
  const x = vals.originX ?? st.originX ?? "50%";
  const y = vals.originY ?? st.originY ?? "50%";
  return pct(x) + " " + pct(y);
}
const round = (v) => Math.round(v * 1e4) / 1e4;

// Runs the hover and leave handlers N times on the virtual clock. Returns cycles of tracks.
async function simulate(name, cycles = 3) {
  const { tree, handle } = evaluate(name);
  const sim = ctx;
  sim.index(tree);
  sim.initAll();
  sim.init = new Map([...sim.vals].map(([el, v]) => [el, { ...v }]));
  const out = [];
  for (let c = 0; c < cycles; c++) {
    const cycle = {};
    for (const phase of ["animate", "leave"]) {
      sim.tracks = [];
      sim.vt = 0;
      sim.phaseStart = 0;
      sim.timers = sim.timers.filter((t) => t.fn);
      const handler = handle ? handle[phase === "animate" ? "startAnimation" : "stopAnimation"] : tree.props[phase === "animate" ? "onMouseEnter" : "onMouseLeave"];
      if (typeof handler !== "function") throw new Error("no " + phase + " handler");
      await handler({});
      await new Promise((r) => setTimeout(r, 0));
      // Timers run in time order.
      for (let guard = 0; guard < 20; guard++) {
        const t = sim.timers.filter((x) => x.fn).sort((a, b) => a.at - b.at)[0];
        if (!t) break;
        sim.vt = Math.max(sim.vt, t.at);
        const fn = t.fn;
        t.fn = null;
        await fn();
        await Promise.resolve();
      }
      await Promise.resolve();
      cycle[phase] = sim.tracks;
      sim.timers = [];
    }
    out.push(cycle);
  }
  return { tree, sim, cycles: out };
}

// ---------------------------------------------------------------------------------------------
// 3. Plan: finite repeats, cycles, timing
// ---------------------------------------------------------------------------------------------
const HOLD = 0.25; // pause after the hover motion before the "leave" motion
const GAP = 0.35; // pause before the next cycle
const WINDOW = 2.2; // how long a never-ending hover loop plays, seconds
const SHAPES = new Set(["path", "line", "circle", "rect", "polyline", "polygon", "ellipse"]);
const ATTR_PROPS = new Set(["d", "cx", "cy", "r", "rx", "ry", "x1", "x2", "y1", "y2", "width", "height", "points"]);
const TRANSFORM_PROPS = new Set(["x", "y", "translateX", "translateY", "scale", "scaleX", "scaleY", "rotate", "rotateX", "skewX", "skewY"]);
const BEZIER = { easeIn: [0.42, 0, 1, 1], easeOut: [0, 0, 0.58, 1], easeInOut: [0.42, 0, 0.58, 1] };

function endOf(tracks) {
  return tracks.reduce((m, t) => Math.max(m, t.at + t.delay + t.total), 0);
}
// Never-ending loops (Motion repeats until the pointer leaves) play for about WINDOW seconds.
function finite(tracks) {
  const win = Math.max(WINDOW, endOf(tracks.filter((t) => t.repeat !== Infinity)));
  for (const t of tracks) {
    if (t.repeat !== Infinity) continue;
    const period = t.dur + t.repeatDelay;
    let n = Math.max(1, Math.round((win - t.delay) / period));
    if (n > 1 && t.repeatType !== "loop" && n % 2) n += 1; // end back on the first keyframe
    t.repeat = n - 1;
    t.total = t.dur * n + t.repeatDelay * (n - 1);
  }
}

const bez = (x1, y1, x2, y2) => (x) => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const sx = (t) => 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t * t * x2 + t ** 3;
  const sy = (t) => 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t * t * y2 + t ** 3;
  let lo = 0, hi = 1, t = x;
  for (let i = 0; i < 40; i++) { t = (lo + hi) / 2; if (sx(t) < x) lo = t; else hi = t; }
  return sy(t);
};
function easeFn(d) {
  if (d === "linear" || d === undefined) return (x) => x;
  const b = typeof d === "string" ? BEZIER[d] : d;
  if (!Array.isArray(b)) throw new Error("ease " + JSON.stringify(d));
  return bez(...b);
}

// rotateX has no SVG equivalent, but without perspective it is a vertical squash: scaleY(cos).
function rotateXToScale(t) {
  const n = 12;
  const [a, b] = [t.kf[0], t.kf[t.kf.length - 1]];
  const f = easeFn(Array.isArray(t.eases) && typeof t.eases[0] !== "number" ? t.eases[0] : t.eases);
  const cos = (deg) => Math.abs(Math.cos((deg * Math.PI) / 180)) < 1e-9 ? 0 : Math.cos((deg * Math.PI) / 180);
  t.prop = "scaleY";
  t.kf = Array.from({ length: n + 1 }, (_, i) => cos(a + (b - a) * f(i / n)));
  t.times = undefined;
  t.eases = "linear";
}

const r4 = (v) => (typeof v === "number" ? Math.round(v * 1e4) / 1e4 : v);
const nums = (s) => (String(s).match(/-?(?:\d+(?:\.\d+)?|\.\d+)/g) || []).length;

// One resolved track -> the data the block carries.
function serialize(t, problems) {
  let { prop, kf } = t;
  let delay = t.delay;
  let instant = !!t.instant;
  if (prop === "fill" || prop === "stroke") instant = true;
  if (prop === "d" && !instant && kf.some((v) => nums(v) !== nums(kf[0]))) {
    problems.add("path morph with different numbers of coordinates (jumps at the end)");
    delay += t.dur;
    instant = true;
  }
  if (instant) kf = [kf[kf.length - 1]];
  const o = { e: t.el.id, p: prop, v: kf.map(r4) };
  if (instant) o.i = 1;
  if (t.times && t.times.length === kf.length) o.t = t.times.map(r4);
  if (!instant) {
    if (t.spring) o.s = { k: t.spring.k, c: t.spring.c, m: t.spring.m, d: r4(t.dur) };
    else {
      const e = t.eases;
      const per = Array.isArray(e) && typeof e[0] !== "number" ? e : null;
      if (per && per.length === kf.length - 1) {
        if (per.every((x) => JSON.stringify(x) === JSON.stringify(per[0]))) o.s = per[0];
        else o.ss = per;
      } else o.s = per ? per[0] : e;
    }
    o.d = r4(t.dur);
  }
  if (delay) o.dl = r4(delay);
  if (t.at) o.at = r4(t.at);
  if (t.repeat > 0) {
    o.r = t.repeat;
    if (t.repeatType !== "loop") o.y = t.repeatType === "mirror" ? 2 : 1;
    if (t.repeatDelay) o.rd = r4(t.repeatDelay);
  }
  if (t.el.tag === "pattern" && (prop === "x" || prop === "translateX")) o.o = 2;
  else if (t.el.tag === "svg" && (prop === "x" || prop === "y" || prop === "translateX" || prop === "translateY")) o.o = 1;
  return o;
}

function plan(name, r) {
  const problems = new Set(r.sim.problems);
  const cyc = r.cycles.map((c) => {
    const out = {};
    for (const ph of ["animate", "leave"]) {
      const tr = c[ph];
      finite(tr);
      for (const t of tr) {
        if (t.prop === "rotateX") rotateXToScale(t);
        if (t.eases !== undefined && !t.spring) {
          const list = Array.isArray(t.eases) && typeof t.eases[0] !== "number" ? t.eases : [t.eases];
          for (const e of list) if (typeof e === "string" ? !(e === "linear" || BEZIER[e]) : !Array.isArray(e)) problems.add("ease " + JSON.stringify(e));
        }
      }
      out[ph === "animate" ? "a" : "n"] = tr.map((t) => serialize(t, problems));
      out[ph === "animate" ? "ad" : "nd"] = r4(endOf(tr));
    }
    return out;
  });
  // Cycles that repeat exactly are stored once.
  const uniq = [];
  for (const c of cyc) if (!uniq.length || JSON.stringify(c) !== JSON.stringify(uniq[uniq.length - 1])) uniq.push(c);
  // Starting state.
  const init = {};
  const origin = {};
  const sim = r.sim;
  const hidden = (el) => {
    for (let e = el; e; e = e.parentMotion) {
      const v = sim.init.get(e) || {};
      if (v.opacity === 0 || v.pathLength === 0 || v.scale === 0 || v.scaleX === 0 || v.scaleY === 0) return true;
    }
    return false;
  };
  const used = new Set();
  for (const c of uniq) for (const t of [...c.a, ...c.n]) used.add(t.e);
  for (const el of sim.els) {
    const v = sim.init.get(el) || {};
    const keep = {};
    for (const [k, val] of Object.entries(v)) {
      if (k === "originX" || k === "originY" || k === "transformOrigin" || ATTR_PROPS.has(k)) continue;
      if (typeof val !== "number" && typeof val !== "string") continue;
      keep[k] = val;
    }
    if (keep.rotateX !== undefined) { keep.scaleY = Math.abs(Math.cos((keep.rotateX * Math.PI) / 180)) < 1e-9 ? 0 : Math.cos((keep.rotateX * Math.PI) / 180); delete keep.rotateX; }
    for (const k of Object.keys(keep)) keep[k] = r4(keep[k]);
    if (el.tag === "pattern") { delete keep.x; delete keep.translateX; }
    if (Object.keys(keep).length) init[el.id] = keep;
    const moves = el.tag !== "pattern" && Object.keys(keep).some((k) => TRANSFORM_PROPS.has(k));
    const trackedTransform = el.tag !== "pattern" && uniq.some((c) => [...c.a, ...c.n].some((t) => t.e === el.id && (TRANSFORM_PROPS.has(t.p) || t.p === "origin")));
    if (moves || trackedTransform) origin[el.id] = originOf(el, { ...v });
  }
  const drawable = [];
  (function walk(n) {
    if (!n || typeof n !== "object") return;
    if (SHAPES.has(n.tag) && !hidden(n.motion ? n : n) && !(n.motion && (sim.init.get(n) || {}).pathLength !== undefined && sim.init.get(n).pathLength !== 1)) drawable.push(n);
    n.children.forEach(walk);
  })(r.tree);
  return { uniq, init, origin, drawable, problems };
}

// ---------------------------------------------------------------------------------------------
// 4. Markup
// ---------------------------------------------------------------------------------------------
const kebab = (k) => (k === "viewBox" || k === "pathLength" || k === "patternUnits" ? k : k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const SKIP = new Set(["animate", "initial", "variants", "transition", "custom", "exit", "key", "style", "children", "ref"]);

function markup(name, tree, pl, sim, ids) {
  const drawables = new Set(pl.drawable);
  // Ids the source gives elements (patterns, gradients) become ids of this block.
  const alias = {};
  (function find(n) {
    if (!n || typeof n !== "object") return;
    if (n.props.id) { alias[n.props.id] = `${name}-${n.id}`; ids.add(n.id); }
    n.children.forEach(find);
  })(tree);
  const fixRef = (v) => String(v).replace(/url\(#([\w-]+)\)/g, (m, id) => (alias[id] ? `url(#${alias[id]})` : m));
  const walk = (n, depth) => {
    if (typeof n === "string" || typeof n === "number") return String(n);
    const pad = "  ".repeat(depth);
    const attrs = [];
    const isRoot = n.tag === "svg";
    const init = n.motion ? sim.init.get(n) || {} : {};
    if (ids.has(n.id) || isRoot) attrs.push(`id="${name}-${n.id}"`);
    for (const [k, v] of Object.entries(n.props)) {
      if (SKIP.has(k) || v === undefined || v === null || v === false || typeof v === "function") continue;
      if (k === "id") continue;
      if (isRoot && (k === "xmlns" || k === "width" || k === "height" || k === "strokeWidth")) continue;
      attrs.push(`${kebab(k)}="${esc(fixRef(init[k] !== undefined && ATTR_PROPS.has(k) ? init[k] : v))}"`);
    }
    for (const k of Object.keys(init)) if (ATTR_PROPS.has(k) && n.props[k] === undefined) attrs.push(`${kebab(k)}="${esc(init[k])}"`);
    if (SHAPES.has(n.tag)) attrs.push('pathLength="1"');
    if (drawables.has(n)) attrs.push(`data-draw="${n.id}"`);
    const st = n.props.style && Object.entries(n.props.style).filter(([k]) => !/^origin|^transformOrigin$|^transformBox$/.test(k));
    if (st && st.length) attrs.push(`style="${st.map(([k, v]) => kebab(k) + ":" + v).join(";")}"`);
    if (isRoot) {
      attrs.push('xmlns="http://www.w3.org/2000/svg"');
      // discord, facebook, flask and syringe come without a viewBox upstream (they render at 1:1 there).
      if (!n.props.viewBox) attrs.push('viewBox="0 0 24 24"');
      attrs.push('width="28"', 'height="28"');
    }
    const kids = n.children.map((c) => walk(c, depth + 1));
    const open = `<${n.tag}${attrs.length ? " " + attrs.join(" ") : ""}`;
    if (!kids.length) return `${pad}${open} />`;
    if (kids.length === 1 && typeof n.children[0] !== "object") return `${pad}${open}>${kids[0]}</${n.tag}>`;
    return `${pad}${open}>\n${kids.join("\n")}\n${pad}</${n.tag}>`;
  };
  const svg = tree.children.find((c) => c && c.tag === "svg");
  if (!svg) throw new Error("no root svg");
  return { svg: walk(svg, 5), svgId: `${name}-${svg.id}` };
}

// ---------------------------------------------------------------------------------------------
// 5. The block
// ---------------------------------------------------------------------------------------------
const label = (name) => name.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

function variables() {
  return [
    { id: "animation", type: "enum", role: "motion", label: "Animation", description: "Draw the strokes, play the hover motion, or both.", default: "both", options: [{ value: "draw", label: "Draw" }, { value: "action", label: "Action" }, { value: "both", label: "Both" }] },
    { id: "loop", type: "boolean", role: "motion", label: "Loop", description: "Repeat the hover motion a few times instead of playing it once.", default: true },
    { id: "speed", type: "number", role: "motion", label: "Speed", description: "Playback speed multiplier.", default: 1, min: 0.25, max: 4, step: 0.05 },
    { id: "size", type: "number", role: "style", label: "Size", description: "Icon size in pixels.", default: 48, min: 8, max: 1000, step: 1, unit: "px" },
    { id: "color", type: "color", role: "style", label: "Color", description: "Stroke color.", default: "#171717" },
    { id: "stroke_width", type: "number", role: "style", label: "Stroke width", description: "Stroke width in a 24-unit grid.", default: 2, min: 0.5, max: 6, step: 0.25 },
  ];
}

// The runtime every block carries: it turns the data above into one GSAP timeline.
const RUNTIME = String.raw`
            // ---- Player: turns the data above into one GSAP timeline ----
            var animation = ["draw", "action", "both"].indexOf(vars.animation) >= 0 ? vars.animation : "both";
            var loop = typeof vars.loop === "boolean" ? vars.loop : true;
            var S = 1 / num(vars.speed, 1, 0.25, 4);
            var size = num(vars.size, 48, 8, 1000);
            var color = typeof vars.color === "string" && vars.color ? vars.color : "#171717";
            var strokeWidth = num(vars.stroke_width, 2, 0.5, 6);
            var K = size / 28; // pixel offsets of the outer svg were drawn for a 28px icon
            var SW = strokeWidth / 2; // stroke widths were drawn for the default 2
            var HOLD = 0.25, GAP = 0.35;

            var svg = document.getElementById(SVG);
            svg.setAttribute("width", size);
            svg.setAttribute("height", size);
            svg.setAttribute("stroke-width", strokeWidth);
            host.style.color = color;
            function $(k) { return document.getElementById(NAME + "-" + k); }

            // Motion's springs: x(t) from rest to 1 with stiffness k, damping c, mass m.
            function springUnit(t, k, c, m) {
              if (t <= 0) return 0;
              var w0 = Math.sqrt(k / m), z = c / (2 * Math.sqrt(k * m));
              if (z < 1) {
                var wd = w0 * Math.sqrt(1 - z * z);
                return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
              }
              if (z === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
              var r = w0 * Math.sqrt(z * z - 1), a = z * w0 - r, b = z * w0 + r;
              return 1 - (b * Math.exp(-a * t) - a * Math.exp(-b * t)) / (b - a);
            }
            var BEZIER = { easeIn: [0.42, 0, 1, 1], easeOut: [0, 0, 0.58, 1], easeInOut: [0.42, 0, 0.58, 1] };
            var eases = {};
            function E(d) {
              if (d === "linear" || d === undefined) return "none";
              if (typeof d === "string") d = BEZIER[d];
              if (Array.isArray(d)) {
                var key = d.join(",");
                return eases[key] || (eases[key] = CustomEase.create(NAME + "-e" + Object.keys(eases).length, key));
              }
              return function (p) { return p >= 1 ? 1 : springUnit(p * d.d, d.k, d.c, d.m); };
            }

            var ATTRS = { d: 1, cx: 1, cy: 1, r: 1, rx: 1, ry: 1, x1: 1, x2: 1, y1: 1, y2: 1, width: 1, height: 1, points: 1 };
            // Motion property -> GSAP vars.
            function V(p, v, outer) {
              var o = {};
              if (outer === 2) o.attr = { patternTransform: "translate(" + v + " 0)" };
              else if (p === "x" || p === "translateX") o.x = outer ? v * K : v;
              else if (p === "y" || p === "translateY") o.y = outer ? v * K : v;
              else if (p === "rotate") o.rotation = v;
              else if (p === "pathLength") o.strokeDasharray = v + " 1";
              else if (p === "pathOffset") o.strokeDashoffset = -v;
              else if (p === "strokeWidth") o.strokeWidth = v * SW;
              else if (p === "origin") o.transformOrigin = v;
              else if (ATTRS[p]) o.attr = (function () { var a = {}; a[p] = v; return a; })();
              else o[p] = v;
              return o;
            }
            function initVars(k) {
              var o = {}, s = INIT[k] || {};
              for (var p in s) { var v = V(p, s[p], $(k) === svg); for (var q in v) o[q] = v[q]; }
              if (ORIGIN[k]) o.transformOrigin = ORIGIN[k];
              return o;
            }
            for (var k in INIT) gsap.set($(k), initVars(k));
            for (var k2 in ORIGIN) if (!INIT[k2]) gsap.set($(k2), { transformOrigin: ORIGIN[k2] });

            var tl = gsap.timeline({ paused: true });

            // One track: keyframes of one property on one element, as a small timeline.
            function track(t, T) {
              var el = $(t.e), D = (t.d || 0) * S, start = T + ((t.at || 0) + (t.dl || 0)) * S;
              if (t.i) { tl.set(el, V(t.p, t.v[0], t.o), start); return; }
              var n = t.v.length, reps = t.r || 0;
              var seg = gsap.timeline({ repeat: t.y === 1 ? reps : 0, yoyo: t.y === 1, repeatDelay: (t.rd || 0) * S });
              // "mirror" plays the keyframes backwards with the easing mirrored too, so each pass is written out.
              var passes = t.y === 2 ? reps + 1 : 1;
              for (var j = 0; j < passes; j++) {
                var back = t.y === 2 && j % 2 === 1;
                var base = j * (D + (t.rd || 0) * S);
                for (var i = 0; i < n - 1; i++) {
                  var a = t.t ? t.t[i] : i / (n - 1), b = t.t ? t.t[i + 1] : (i + 1) / (n - 1);
                  var from = t.v[i], to = t.v[i + 1], e = t.ss ? t.ss[i] : t.s;
                  if (back) {
                    var ra = t.t ? 1 - t.t[n - 1 - i] : i / (n - 1), rb = t.t ? 1 - t.t[n - 2 - i] : (i + 1) / (n - 1);
                    a = ra; b = rb; from = t.v[n - 1 - i]; to = t.v[n - 2 - i]; e = t.ss ? t.ss[n - 2 - i] : t.s;
                  }
                  var vars2 = V(t.p, to, t.o);
                  vars2.duration = Math.max(0.001, (b - a) * D);
                  vars2.ease = E(e);
                  vars2.immediateRender = false;
                  seg.fromTo(el, V(t.p, from, t.o), vars2, base + a * D);
                }
              }
              tl.add(seg, start);
            }

            // Strokes draw in, one after the other.
            var T0 = 0.3 * S;
            if (animation !== "action") {
              var shapes = [].slice.call(svg.querySelectorAll("[data-draw]"));
              var dd = 0.5 * S, st = Math.min(0.12, 0.6 / Math.max(1, shapes.length)) * S;
              shapes.forEach(function (el, i) {
                var rest = initVars(el.getAttribute("data-draw"));
                tl.fromTo(el, { strokeDasharray: "1 1", strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: dd, ease: "power2.out", immediateRender: true }, i * st);
                tl.set(el, { strokeDasharray: rest.strokeDasharray || "none", strokeDashoffset: rest.strokeDashoffset || 0 }, i * st + dd);
              });
              if (shapes.length) T0 = ((shapes.length - 1) * st / S + 0.5 + 0.25) * S;
            }

            // The hover motion, then the leave motion, a few times.
            if (animation !== "draw") {
              var count = loop ? CYCLES_MAX : 1, T = T0;
              for (var c = 0; c < count; c++) {
                var cy = CYCLES[Math.min(c, CYCLES.length - 1)];
                cy.a.forEach(function (t) { track(t, T); });
                var Tn = T + (cy.ad + HOLD) * S;
                cy.n.forEach(function (t) { track(t, Tn); });
                T = Tn + (cy.nd + GAP) * S;
              }
            }

            var total = parseFloat(root.dataset.duration || String(DURATION));
            if (tl.duration() < total) tl.to({}, { duration: total - tl.duration() });
            tl.seek(0);
            window.__timelines = window.__timelines || {};
            window.__timelines[NAME] = tl;
`;

async function build(name) {
  const block = "icon-" + name;
  const dir = path.join(ROOT, "components", block);
  const r = await simulate(name);
  const sim = r.sim;
  const pl = plan(name, r);
  overrides[name]?.(pl, r);
  // Plan the timing of the block.
  const first = pl.uniq[0];
  const nDraw = pl.drawable.length;
  const st = Math.min(0.12, 0.6 / Math.max(1, nDraw));
  const T0 = nDraw ? (nDraw - 1) * st + 0.5 + 0.25 : 0.3;
  const L = first.ad + HOLD + first.nd + GAP;
  const loops = Math.max(1, Math.min(3, Math.floor((4.2 - T0) / L)));
  const duration = Math.min(8, Math.max(2.5, Math.ceil((T0 + loops * L + 0.2) * 2) / 2));
  if (first.a.length === 0 && first.n.length === 0) throw new Error("the hover motion resolves to nothing");
  const ids = new Set([...sim.els.map((e) => e.id)]);
  for (const n of pl.drawable) ids.add(n.id);
  const { svg, svgId } = markup(block, r.tree, pl, sim, ids);
  const vars = variables();
  const title = label(name) + " Icon";
  const srcPath = `icons/${name}.tsx`;
  const cycles = pl.uniq.length;
  const tracksJs = (arr) => "[" + arr.map((t) => "\n                " + JSON.stringify(t)).join(",") + (arr.length ? "\n              " : "") + "]";
  const cyclesJs = "[" + pl.uniq.map((c) => `\n              { ad: ${c.ad}, nd: ${c.nd},\n                a: ${tracksJs(c.a)},\n                n: ${tracksJs(c.n)} }`).join(",") + "\n            ]";
  const p = block + "-";
  const html = `<!doctype html>
<!--
  ${title}

  An animated icon from lucide-animated: the strokes draw in, then it plays its hover animation.

  Ported to an HTML + GSAP sub-composition by usemosio/blocks from:
  ${REPO}/blob/${COMMIT}/${srcPath}

${indent(MIT)}

  The icon paths are derived from Lucide (https://lucide.dev):

${indent(ISC)}
-->
<html
  lang="en"
  data-composition-id="${block}"
  data-composition-duration="${duration}"
  data-composition-variables='${JSON.stringify(vars).replace(/'/g, "&#39;")}'
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

      <div id="root" data-composition-id="${block}" data-duration="${duration}" data-fps="30">
        <div id="${p}stage" class="clip" data-start="0" data-duration="${duration}" data-track-index="0">
          <div id="${p}host">
${svg}
          </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/CustomEase.min.js"></script>
        <script>
          (function () {
            "use strict";
            gsap.registerPlugin(CustomEase);
            var NAME = "${block}", SVG = "${svgId}", DURATION = ${duration};
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

            // ---- The hover animation, resolved from the source component ----
            // Each track is one property of one element: e (element id), p (property), v (keyframes),
            // t (keyframe times 0..1), s / ss (easing: bezier points, name, or spring), d (seconds),
            // dl (delay), at (start inside the phase), r (repeats), y (1 reverse, 2 mirror), rd (repeat
            // delay), i (jump, no tween), o (pixel offset of the outer svg).
            // a = tracks of the hover, n = tracks of the pointer leaving; ad / nd = their lengths.
            var INIT = ${JSON.stringify(pl.init)};
            var ORIGIN = ${JSON.stringify(pl.origin)};
            var CYCLES = ${cyclesJs};
            var CYCLES_MAX = ${loops};
${RUNTIME}          })();
        </script>
      </div>
    </template>
  </body>
</html>
`;
  // Stills inside the hover motion, so the check sees what the icon does.
  // The window is one pass of the shortest repeating track (or the whole motion, if shorter). When the
  // hover itself resolves to nothing the stills sit on the leave motion. `lateStills` names icons whose
  // first moments are invisible (a stroke drawing from nothing), so their stills sit later in the motion.
  const onLeave = first.ad === 0;
  const periods = first.a.filter((t) => t.d && t.r).map((t) => t.d + (t.rd || 0));
  const win = Math.max(0.2, onLeave ? first.nd : Math.min(first.ad, ...periods));
  const base = onLeave ? T0 + HOLD : T0;
  const fr = lateStills.has(name) ? [0.35, 0.55, 0.75, 0.97] : [0.03, 0.3, 0.55, 0.85];
  const checkAt = fr.map((f) => Math.min(Math.round((base + f * win) * 100) / 100, duration - 0.1));
  const item = {
    $schema: "https://hyperframes.heygen.com/schema/registry-item.json",
    name: block,
    type: "hyperframes:component",
    title,
    description: `An animated ${label(name).toLowerCase()} icon: the strokes draw in, then it plays its hover animation.`,
    tags: ["icon", "icons", "lucide-animated-port", name],
    category: "icons",
    duration,
    checkAt,
    useWhen: [
      `A video needs a ${label(name).toLowerCase()} glyph that draws itself on and then moves.`,
      "A crisp line icon on a UI mockup, a feature list or a callout.",
    ],
    avoidWhen: ["A filled or photographic image is needed.", "The icon must stay perfectly still: use a static SVG."],
    author: "pqoqubbw",
    authorUrl: REPO,
    license: "MIT",
    licenses: "Icon paths are derived from Lucide (https://lucide.dev), ISC License; see THIRD_PARTY.md.",
    source: { repo: REPO, path: srcPath, commit: COMMIT },
    files: [{ path: `${block}.html`, target: `compositions/components/${block}.html`, type: "hyperframes:snippet" }],
    variables: vars,
  };
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
    <div id="root" data-composition-id="${block}-demo" data-start="0" data-width="1080" data-height="1920" data-duration="${duration}" data-fps="30">
      <div
        id="demo-mount"
        class="demo-mount clip"
        data-composition-id="${block}"
        data-composition-src="./${block}.html"
        data-variable-values='{"size":360,"color":"#171717"}'
        data-start="0"
        data-duration="${duration}"
        data-track-index="1"
        data-width="1080"
        data-height="1920"
      ></div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["${block}-demo"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${block}.html`), html);
  fs.writeFileSync(path.join(dir, "registry-item.json"), JSON.stringify(item, null, 2) + "\n");
  fs.writeFileSync(path.join(dir, "demo.html"), demo);
  return { cycles, loops, duration, notes: [...pl.problems] };
}

// ---------------------------------------------------------------------------------------------
// 6. Main
// ---------------------------------------------------------------------------------------------
const args = process.argv.slice(2);
if (args[0] === "--dump") {
  const r = await simulate(args[1]);
  const pl = plan(args[1], r);
  console.log(JSON.stringify({ problems: [...pl.problems], init: pl.init, origin: pl.origin, drawable: pl.drawable.map((d) => d.id), cycles: pl.uniq }, null, 1));
} else {
  const all = !args.length;
  const names = all
    ? fs.readdirSync(iconsDir).filter((f) => f.endsWith(".tsx")).map((f) => f.replace(/\.tsx$/, "")).sort()
    : args;
  const generated = [], existing = [], skipped = [], failed = [], noted = [];
  for (const n of names) {
    if (fs.existsSync(path.join(ROOT, "components", "icon-" + n))) {
      // A block of that name exists: the remocn icon (or another port) covers it.
      let by = "icon-" + n;
      try {
        const reg = JSON.parse(fs.readFileSync(path.join(ROOT, "components", by, "registry-item.json"), "utf8"));
        if (reg.tags?.includes("lucide-animated-port")) { by = null; }
      } catch {}
      if (by) { existing.push([n, by]); continue; }
    }
    if (skips[n]) { skipped.push([n, skips[n]]); continue; }
    try {
      const res = await build(n);
      generated.push(n);
      if (res.notes.length) noted.push([n, res.notes]);
    } catch (e) {
      skipped.push([n, e.message]);
    }
  }
  console.log(`generated ${generated.length}, already covered ${existing.length}, skipped ${skipped.length}`);
  for (const [n, why] of skipped) console.log("SKIP", n, why);
  if (all) {
    const notesPath = path.join(ROOT, ".port-notes/icons.md");
    fs.mkdirSync(path.dirname(notesPath), { recursive: true });
    const lines = [
      "# lucide-animated icons",
      "",
      `Source: ${REPO} @ ${COMMIT} (${names.length} files in icons/).`,
      "",
      "Command: `bun scripts/gen-lucide-animated.mjs` (LUCIDE_ANIMATED_SRC defaults to ~/.cache/textlibs/lucide-animated).",
      "",
      `- generated: ${generated.length}`,
      `- already covered by an existing block (not touched): ${existing.length}`,
      `- skipped: ${skipped.length}`,
      "",
      "## Already covered",
      "",
      ...existing.map(([n, by]) => `- ${n}: \`${by}\``),
      "",
      "## Skipped",
      "",
      ...skipped.map(([n, why]) => `- ${n}: ${why}`),
      "",
      "## Generated with a note",
      "",
      ...noted.map(([n, p]) => `- ${n}: ${p.join("; ")}`),
      "",
    ];
    fs.writeFileSync(notesPath, lines.join("\n"));
  }
}
