# Media Key Bindings

Media Key Bindings is a Firefox extension that adds keyboard controls and
popup controls for HTML5 videos. It is intended to work across video sites
such as YouTube and Reddit, including players hosted in supported frames.

## Features

- Play and pause with `Space` or `K`
- Mute and unmute with `M`
- Seek backward or forward with `J`, `L`, and the Left and Right arrow keys
- Adjust volume with the Up and Down arrows
- Seek to a percentage of the video with `0` through `9`
- Toggle fullscreen with `F`
- Step by one 30 FPS frame with `,` and `.`
- Adjust playback speed with `-`, `=`, and `` ` `` to return to normal
- View the current video time in the popup
- Enable looping and select independent loop start and end points with wrap around

Open the extension popup to:

- See the current video time.
- Turn looping on or off.
- Set the loop start and end positions with the sliders.
- Trigger any of the supported media controls by clicking its key.


## Project structure

- `manifest.json` — Firefox extension metadata and content-script registration.
- `content.js` — Video discovery, keyboard handling, looping, and runtime
  message handling.
- `popup.html` — Popup structure and control labels.
- `popup.js` — Popup messaging, video information updates, and control events.
- `popup.css` — Popup layout, controls, and light/dark theme styling.
- `dial_icon.png` — Extension toolbar icon.

## Contributing

Before making a change:

1. Read the relevant files and follow the existing patterns.
2. Keep the change focused on one behavior or fix.
3. Consider YouTube, Reddit, embedded players, iframes, live streams, paused
   videos, and pages containing multiple videos, and pages containing video ads.
4. Update this README when user-visible behavior or development workflow
   changes.

### Clean code guidelines

- Use clear, descriptive names and small functions with one responsibility.
- Prefer existing helpers and patterns over duplicated logic.
- Preserve type and input safety; validate values received from popup messages.
- Handle expected failures explicitly and log actionable diagnostics.
- Avoid broad exception handling, silent fallbacks, and unrelated refactors.
- Keep formatting consistent with the surrounding JavaScript and CSS.
- Prefer semantic HTML, accessible labels, keyboard support, and visible focus
  states for popup controls.
- Avoid unnecessary comments; document non-obvious behavior instead.
- Do not add dependencies unless they are necessary and documented.
- Test behavior manually in at least one standard video page and one embedded
  or iframe-based player when changing media discovery or messaging.

## Guidance for AI coding assistants

AI coding assistants working on this project should:

1. Inspect the relevant implementation and related popup/content-script
   message paths before editing.
2. Make precise, minimal changes and preserve existing behavior.
3. Treat content scripts as untrusted-page integrations: validate message
   inputs and account for missing, unavailable, or non-finite media values.
4. Consider frame boundaries, shadow DOM, restricted Firefox pages, autoplay
   policies, and pages with multiple video elements.
5. Keep popup and content-script message names and response shapes in sync.
6. Update directly related documentation and test the smallest relevant
   surface after changes.
7. Never commit secrets, generated artifacts, or unrelated formatting changes.

