# Assignment 1 — Guided Onboarding Wizard

A hands-on wizard that walks you through the core Claude Code features using a real project as the playground.

## How to start

```bash
cd assignments/assignment-1-explore-codebase/starter
claude
```

Then type `/onboard` to launch the wizard.

## What the wizard covers

The wizard guides you through four areas — it will tell you exactly what to run and what to observe at each step:

1. **The agentic loop** — ask Claude to map the project, explain the build system, and get the app running in your browser
2. **Keyboard shortcuts** — mode cycling, slash commands, and the leave-and-return flow with `claude -c`
3. **Skills** — run three pre-built skills (`/diagram`, `/feature`, `/roast`) and see how they're structured
4. **Permissions** — read the project's `.claude/settings.json` and understand what it allows, blocks, and auto-approves

## The project

The `starter/` folder is a minimal Todo app — React + TypeScript frontend, clean enough to explore quickly, interesting enough to generate real output from each wizard station.

```
starter/
├── client/          React + Vite frontend (the Todo app)
├── src/             Express API layer
├── designs/         Original design files for reference
└── .claude/
    ├── settings.json
    └── skills/
        ├── onboard/   The wizard itself
        ├── diagram/   Generates ARCHITECTURE.md
        ├── feature/   Adds due date support
        └── roast/     Produces a code quality report
```
