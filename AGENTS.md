# AGENTS.md

## Scope
This repository is a small static web app for planning weekly meals. Prefer lightweight, browser-only changes and preserve the existing French UI and content style.

## Key files to know
- [README.md](README.md) — app overview and how to open it locally.
- [index.html](index.html) — app structure, views, and main UI sections.
- [styles.css](styles.css) — theme tokens, typography, responsive layout, and component styling.
- [app.js](app.js) — state management, localStorage persistence, and UI rendering logic.

## Project conventions
- No build toolchain or package manager is required. The app is meant to be opened directly with [index.html](index.html) (or a simple static web server if needed).
- Data is stored in browser localStorage under the key `mijote-state`; keep edits compatible with the existing state schema.
- Preserve the current visual identity unless a task explicitly asks for a redesign.
- Prefer existing CSS custom properties in [styles.css](styles.css) for colors, spacing, and shadows instead of hardcoded values.
- Keep the app responsive and accessible: maintain contrast, use semantic button labels, and preserve the mobile navigation behavior.

## Theme-specific guidance
- The visual theme is warm, soft, and food-oriented with a forest/cream palette.
- Maintain the existing font pairing: `Playfair Display` for headings and `DM Sans` for body text.
- If changing colors, update the `:root` variables in [styles.css](styles.css) first and keep the palette cohesive across cards, badges, buttons, and modals.
- For layout changes, respect the existing responsive breakpoints in [styles.css](styles.css) and avoid breaking the desktop and mobile experiences.

## Expected behavior
- Keep interactions predictable: planning, filtering, drag-and-drop, shopping list, and fridge views should remain intuitive.
- When adding features, prefer small, focused changes that fit the current architecture rather than introducing frameworks or dependencies.
- If a change affects stored data, make it backward-compatible when possible.

## Verification
- There is no automated test suite in this project, so verify changes by opening the app in a browser and checking the affected flow manually.
- After theme or layout edits, confirm that key screens still look correct at desktop and mobile widths.
