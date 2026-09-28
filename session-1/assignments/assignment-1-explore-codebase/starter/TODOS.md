# Project Todos

Backlog of improvements for this Todo app. Implement in order.

---

## 1. Dark mode toggle

Add a toggle button in the header that switches between light and dark mode. Persist the preference in `localStorage` so it survives a page refresh. The app already has a full dark mode via `prefers-color-scheme` in `src/index.css` — wire that same set of CSS variables to a `data-theme` attribute on `<html>` so the toggle can override the system setting.

## 2. Todo count badge

Show a live count of remaining active (uncompleted) todos next to the "Active" filter tab — e.g. **Active 3**. Update it as todos are completed or added. No count needed on the All or Completed tabs.

## 3. Keyboard shortcut to focus composer

Pressing `/` anywhere on the page (when not already typing) should focus the new-todo input. Add a small hint label below the composer — "Press / to start" — that disappears once the user has added their first todo.
