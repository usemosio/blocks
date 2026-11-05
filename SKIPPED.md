# Not ported, and adapted

Source components this library does not carry as they are, and why. First remocn, at `126221ae`.

## Not ported

- `remocn/brush`: a helper module (brush-stroke geometry and grain filter used by other components), not a
  component of its own; the blocks that use it draw their strokes themselves.

## Adapted under another name

These copy a real product's interface or brand. Their motion is here with a generic look (no product names,
logos, signature colours or layouts), under a name that says what the scene is.

| remocn | Block |
|---|---|
| `remocn/chat-gpt`, `remocn/claude-chat`, `remocn/v0` | `ai-prompt-composer` |
| `remocn/claude-code`, `remocn/opencode` | `agent-terminal` (`layout`: panel or launcher) |
| `remocn/github-sponsors` | `supporter-grid` |
| `remocn/github-stars` | `milestone-counter-list` |
| `remocn/x-followers-overview` | `followers-overview` |
| `remocn/x-follow-card` | `profile-follow-card` |
| `remocn-ui/imessage-chat-flow`, `remocn-ui/telegram-chat-flow` | `messenger-chat-flow` (`style`: ticks or receipt) |

## Hyperframes registry

Blocks of https://github.com/heygen-com/hyperframes at `bd6cff8` (`registry/blocks/`) that Mosio had left out
(they bundle files, draw with WebGL, load d3, or show HyperFrames/HeyGen) and this library does not carry as
they are. The other Hyperframes blocks are served by Mosio from the registry itself.

### Adapted under another name

| Hyperframes | Block |
|---|---|
| `apple-money-count` | `money-count-burst` |
| `instagram-follow`, `yt-lower-third` | `follow-lower-third` |
| `slack-notification-ad` | `notification-flood-lockscreen` |
| `code-snippet-dark-modern`, `code-snippet-dark-2026` | `code-editor-typing` |
| `liquid-glass-notification` | `glass-notification-aurora` |
| `lower-third-bild` | `offset-shadow-lower-third` |
| `nyc-paris-flight` | `flight-route-map` |
| `notification-cascade` | `notification-stack` |
| `macos-notification` | `system-notification` |
| `reddit-post` | `forum-post-card` |
| `spotify-card` | `music-player-card` |
| `x-post` | `social-post-card` |
| `spain-map` | `indonesia-map` (Natural Earth, public domain; the Spanish data is CC BY 4.0) |

`notes-reveal`, `share-sheet-carousel`, `ui-3d-reveal`, `vfx-text-cursor`, `vfx-portal`, `vfx-shatter` and
`vfx-liquid-background` keep their names with generic text, marks and pages instead of real products.

### Not ported

- Covered by a block here: `glitch` (`glitch-cut`), `light-leak`, `whip-pan` (same names), `godrays` and
  `sun-burst` (`shader-god-rays`), `water` (`shader-water`), `swirl` (`shader-swirl`), `mesh-gradient`
  (`shader-mesh-gradient`), `flowing-gradient` (`shader-warp`), `plasma` (`shader-warp`, `shader-neuro-noise`),
  `chrome-orb` and `liquid-metal` (`shader-liquid-metal`), `fractal-noise` (`shader-perlin-noise`,
  `shader-simplex-noise`), `color-wheel` (`shader-mesh-gradient`), `voronoi` and `worley-noise`
  (`shader-voronoi`), `spiral` (`shader-spiral`), `marble` (`shader-warp-marble`), `blob` (`shader-metaballs`),
  `weight-wave` (`variable-font-morph`), `tiktok-follow` (`profile-follow-card`), `ai-chat-reveal`
  (`ai-prompt-flow`, `chat-review-typed`), `carousel-circle-2` and `carousel-text-circle-2` (the `-1` blocks with
  `path_stretch` 1.24), `carousel-vision-4` (`carousel-vision-2` with `tilt` and `fan`).
- A 3D model or a three.js scene with no small raw-WebGL version: `product-turntable`, `vfx-liquid-glass`,
  `macos-tahoe-liquid-glass`, `vfx-iphone-device`, `cuboid-carousel`, `extruded-logo`, `ios26-liquid-glass`,
  `frost-sequence-camera-orbit`, `orbit-card`, `glass-shard-title`, `canopy-part-title`, `wireframe-portal-title`,
  `liquid-glass-widgets`; `lottie-character-walk` needs the lottie runtime.
- WebGPU-only, from a minified shader bundle with no readable source: `hologram`, `strands`, `ripples`,
  `light-edge`, `gabor-noise`, `prism`, `obsidian`, `lens-flare`, `heatmap`, `frost`, `falling-lines`.
- Built around a real product, person or news event, nothing generic left: `claude-exchange`, `chatgpt-exchange`,
  `vpn-youtube-spot`, `heygen-avatar-promo-card`, `north-korea-locked-down`, `blue-sweater-intro-video`.

## lucide-animated

Icons of https://github.com/pqoqubbw/icons at `4662fff` that `scripts/gen-lucide-animated.mjs` does not generate:

- Already a remocn icon block of the same name (58): `activity`, `arrow-down`, `arrow-left`, `arrow-right`, `arrow-up`, `at-sign`, `bell`, `bookmark`, `check`, `chevron-down`, `chevron-left`, `chevron-right`, `chevron-up`, `clock`, `copy`, `credit-card`, `dollar-sign`, `download`, `external-link`, `eye`, `eye-off`, `file-text`, `flame`, `heart`, `home`, `key`, `layout-grid`, `link`, `loader`, `lock`, `maximize`, `menu`, `message-circle`, `mic`, `moon`, `party-popper`, `pause`, `phone`, `play`, `plus`, `refresh-cw`, `rocket`, `search`, `send`, `settings`, `sparkles`, `sun`, `terminal`, `timer`, `trending-down`, `trending-up`, `upload`, `user`, `user-plus`, `users`, `wallet`, `x`, `zap`.
- Driven by React state rather than variants: `keyboard`, `volume`.
- Brand logos: `chrome`, `discord`, `dribbble`, `facebook`, `figma`, `github`, `gitlab`, `instagram`, `linkedin`,
  `twitch`, `twitter`, `youtube`.
