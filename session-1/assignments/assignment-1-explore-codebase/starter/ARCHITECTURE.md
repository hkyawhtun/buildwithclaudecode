# Architecture

A minimal React + TypeScript single-page todo app built with Vite. It persists tasks in `localStorage` under the key `todo.v1`, requires no backend, and ships with two React components. All state lives in `App`, which passes callbacks down to `TodoItem`. The UI supports filtering (all / active / done), inline editing via `contentEditable`, animated add/remove transitions, a one-level undo on "Clear completed," and full dark-mode via a CSS media query.

---

## UML Class Diagram

```
┌─────────────────────────────────────────┐
│ <<interface>> Todo                      │
├─────────────────────────────────────────┤
│ + id: string                            │
│ + text: string                          │
│ + done: boolean                         │
│ + createdAt: number                     │
└─────────────────────────────────────────┘
          △                    △
          │ creates            │ receives
          │                    │
┌─────────────────────┐   ┌────────────────────────────────┐
│ App                 │   │ TodoItem                       │
├─────────────────────┤   ├────────────────────────────────┤
│ - todos: Todo[]     │   │ - removing: boolean            │
│ - filter: Filter    │   ├────────────────────────────────┤
│ - lastCleared:      │   │ + onToggle(id): void           │
│     Todo[] | null   │   │ + onRemove(id): void           │
│ - toastMsg: string  │   │ + onEdit(id, text): void       │
│ - showToast: boolean│   └────────────────────────────────┘
├─────────────────────┤
│ + add(text): void   │
│ + toggle(id): void  │   ┌────────────────────────────────┐
│ + remove(id): void  │   │ localStorage                   │
│ + edit(id,t): void  │   ├────────────────────────────────┤
│ + clearCompleted()  │◄──│ key: 'todo.v1'                 │
│ + undo(): void      │──►│ value: JSON (Todo[])           │
└─────────────────────┘   └────────────────────────────────┘
          │ 1
          │ renders
          ▼ 0..*
    TodoItem × N
```

---

## Component Tree

```
┌─────────────────────────────────────────────────────────┐
│  App                                                    │
│  state: todos[], filter, lastCleared, toastMsg,         │
│         showToast                                       │
│  refs:  inputRef (composer <input>), toastTimer         │
│                                                         │
│  ├── <header>                                           │
│  │     brand mark · "Todo" · current date               │
│  │                                                      │
│  ├── <section.greeting>                                 │
│  │     h1: time-of-day greeting                         │
│  │     counterText · progress bar (pct%)                │
│  │                                                      │
│  ├── <form.composer>  ──────────────────── add()        │
│  │     inputRef → text input                            │
│  │                                                      │
│  ├── <div.filters>                                      │
│  │     [All | Active | Done] → setFilter()              │
│  │     [Clear completed]     → clearCompleted()         │
│  │                                                      │
│  ├── <ul.list>  (visible todos only)                    │
│  │     └── TodoItem × N                                 │
│  │           props: todo, onToggle, onRemove, onEdit    │
│  │           state: removing (bool)                     │
│  │           ref:   labelRef (contentEditable div)      │
│  │                                                      │
│  ├── <div.empty>  (shown when visible.length === 0)     │
│  │                                                      │
│  ├── <footer>  "saved locally"                          │
│  │                                                      │
│  └── <div.toast>  (fixed, outside .app)                 │
│        message · Undo button → undo()                   │
└─────────────────────────────────────────────────────────┘
```

---

## Data Flow

```
User types + submits form
        │
        ▼
   add(text)
        │
        ▼
  setTodos(prev → [...])          ← new Todo: { id, text, done:false, createdAt }
        │
        ▼
  todos[] state (in App)
        │
        ├──► useEffect → localStorage.setItem('todo.v1', JSON.stringify(todos))
        │
        ├──► derived values recomputed
        │      total, done, active, pct, counterText, visible
        │
        └──► render <ul> → <TodoItem> × N
                    │
                    ├── checkbox onChange → toggle(id) → setTodos(map done)
                    │
                    ├── double-click label → contentEditable='true'
                    │     blur / Enter → onEdit(id, text) → setTodos(map text)
                    │     Escape       → revert, blur
                    │
                    └── delete button → handleRemove()
                          setRemoving(true) → CSS slide-out (220ms)
                          setTimeout → onRemove(id) → setTodos(filter)

On page load:
  loadTodos() reads localStorage → parses JSON → or returns seed() if empty/invalid
```

---

## File Map

```
src/
├── main.tsx          Entry point — mounts <App> inside StrictMode into #root
├── App.tsx           Root component — all todo state, CRUD callbacks, layout
├── components/
│   └── TodoItem.tsx  Single list row — checkbox, editable label, timestamp, delete
└── index.css         All styles — CSS custom properties, dark mode, animations
```

---

## How to Add a Feature

Example: add a **priority** field (low / medium / high) to each todo.

1. **Extend the type** in `src/components/TodoItem.tsx:3`
   Add `priority: 'low' | 'medium' | 'high'` to the `Todo` interface.

2. **Set a default on creation** in `src/App.tsx:81` inside `add()`:
   Include `priority: 'low'` in the new todo object literal.

3. **Update `seed()`** in `src/App.tsx:11` to include `priority` on each seed item so `loadTodos()` returns valid data on first run.

4. **Render the priority** in `src/components/TodoItem.tsx` — add a `<select>` or badge inside the `<li>`, wired to a new `onPriority` callback prop.

5. **Add the callback** in `src/App.tsx` alongside `toggle`/`edit`:
   ```ts
   const setPriority = useCallback((id: string, priority: Todo['priority']) => {
     setTodos(prev => prev.map(t => t.id === id ? { ...t, priority } : t))
   }, [])
   ```
   Pass it to each `<TodoItem onPriority={setPriority} />`.

6. **Style it** in `src/index.css` — the existing CSS custom properties (`--accent`, `--done`, `--danger`) are good candidates for priority color tokens.

localStorage persists automatically — the `useEffect` at `src/App.tsx:52` already serializes the full `todos` array on every state change.
