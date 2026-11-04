# Not ported, and adapted

remocn components at `126221ae` that this library does not carry as they are, and why.

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
