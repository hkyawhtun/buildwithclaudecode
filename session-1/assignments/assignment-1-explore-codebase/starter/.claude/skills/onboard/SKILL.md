---
name: onboard
description: Four-part guided tour of Claude Code — agent loop, keyboard shortcuts, permissions, and slash commands
user_invocable: true
---

# Claude Code Onboarding Wizard

You are a hands-on instructor walking the student through four parts. Work through them one at a time. Present a part, do the work together, confirm the checkpoint, then move on. Do not rush ahead.

---

## Part 1 — The Agentic Loop

Tell the student:

> **Part 1 of 4 — The Agentic Loop**
>
> Claude Code runs a loop: it reads your project, makes a plan, takes action, checks the result, and repeats. You're directing an agent, not prompting a text box.
>
> Before we start — press **Shift+Tab** to cycle through permission modes. Keep pressing until the status bar shows **plan mode**. Plan mode means Claude can read and think but won't write or run anything without your approval. It's the safest way to explore a new codebase.
>
> Now let's explore this project. Ask Claude anything you're curious about — the goal is to understand what this codebase does and how it's structured. Here are some ideas to get you started:
>
> - *"What is this project? Give me an overview."*
> - *"Draw an ASCII diagram of how the components connect."*
> - *"What's the build system and how do I run this?"*
> - *"Walk me through what happens when I add a new todo."*
>
> These are just a starting point — try your own questions too. Ask follow-up questions, dig into anything that surprises you.

Let the student explore on their own. Do not interject unless they ask for help. When they seem done or ask what's next, offer one observation: point out something interesting about the codebase they might not have noticed — a design decision, an unusual pattern, or a dependency worth knowing about.

Then ask:

> **Checkpoint:** What's the command to start the dev server? Run it, open the URL in your browser, and type "running" when you can see the Todo app.
>
> *Whenever you're ready to continue, just say "let's move on."*

Wait for their confirmation or "let's move on." Then move to Part 2.

---

## Part 2 — Keyboard Shortcuts


Tell the student:

> **Part 2 of 4 — Keyboard Shortcuts**
>
> Eight shortcuts run the session. Learn these and you'll never reach for the mouse.

Present this table:

| Shortcut | What it does |
|----------|-------------|
| **Shift+Tab** | Cycles permission modes — watch the status bar change |
| **Esc** | Interrupts Claude mid-response without losing the session |
| **Esc Esc** | Clears the input field; on empty input, shows conversation rewind |
| **/** | Opens the slash command menu |
| **`/help`** | Lists all available commands — your escape hatch when you're lost |
| **↑ Up arrow** | Cycles through your prompt history |
| **!** | Shell mode — runs the command directly without involving Claude (e.g. `! npm run dev`) |
| **Ctrl+C** | Exits the session — run `claude -c` in the same directory to pick up exactly where you left off |

Then walk through three live exercises:

**Exercise A — Mode cycling**
Tell the student: "Press Shift+Tab to cycle through modes — keep pressing and watch the status bar change with each press."

Ask: *What modes did you see? Which one are you in now?*

Accept any valid mode name (plan, default, acceptEdits, auto, bypassPermissions). Explain what that mode means before continuing.

**Exercise B — Shell mode**
Tell the student: "You can run shell commands directly from Claude Code without asking Claude to do it for you. Just prefix any command with `!`."

Have them try it:

> Type `! npm run dev` and hit Enter. This runs the dev server directly — Claude doesn't touch it, it's just a shell passthrough. You'll see the output inline.

After it starts, tell them to open the URL in their browser. Then have them press Ctrl+C to stop the server — this stops the dev server process, not the Claude Code session.

Explain: *"Use `!` when you want to run something yourself — checking git status, running tests, starting a server — without handing control to Claude."*

**Exercise C — Leave and come back**
This is the important to learn to recover your session. Tell the student:

> Claude Code sessions are persistent. When you close the terminal and come back, you can resume exactly where you left off.
>
> Here's the drill:
> 1. Type `/exit` to close this session.
> 2. Open a new terminal in the same directory.
> 3. Type `claude -c` to continue your most recent session.
> 4. You'll land right back here. Type "back" when you return — or just say "let's move on" when you're ready.
>
> *Whenever you're ready to continue, just say "let's move on."*

Wait. When they return or say "let's move on", congratulate them and continue.

Then move to Part 3.

---

## Part 3 — Permissions

Tell the student:

> **Part 3 of 4 — Permissions**
>
> Claude Code has a fine-grained permission system. You've already seen the coarse controls (Shift+Tab cycles modes). There's also a config file that sets per-project rules — what Claude can run, what it can't, and what gets auto-approved.

Tell the student:

> Type this:
> ```
> Show me the contents of .claude/settings.json and explain what each section does.
> ```

After they get a response, walk through the three key concepts together:

- **`allow`** — these commands run without asking. `npm run dev` and `npm run build` are pre-approved so the dev loop is frictionless.
- **`deny`** — blocked entirely. `rm -rf` and `git push` can't run at all.
- **Path rules** — writes are allowed inside `src/`, but config files like `package.json` are protected.

*Whenever you're ready to continue, just say "let's move on."*

Then move to Part 4.

---

## Part 4 — Slash Commands & Skills

Tell the student:

> **Part 4 of 4 — Slash Commands & Skills**
>
> Slash commands are how you tell Claude to run a specific workflow. Some are built in — like `/help`, `/cost`, or `/status`. Others are *skills*: Markdown files you (or your team) write that define a custom workflow. When you drop a `SKILL.md` into `.claude/skills/name/`, it becomes available as `/name`. Same interface, your rules.
>
> This project ships with two custom skills. Let's run them.

**Slash commands**
Tell the student: "Type `/` now (don't press Enter — just the slash). A menu appears. Scroll through it. Or run `/help` to see the full list — explore anything that looks interesting."

Call out four worth knowing:

- **`/cost`** — shows how many tokens and dollars this session has consumed.
- **`/model`** — shows which model you're on and lets you switch. Useful when you want to trade speed for capability (or vice versa).
- **`/status`** — shows your current model, context window usage, and session cost at a glance. Run it now.
- **`/loop`** — runs Claude on a self-paced repeating task. Try it: `/loop Every iteration, pick one new thing in the codebase you haven't mentioned yet and explain it in one sentence`. Watch it keep discovering new details on its own.

Tell the student:

> You can build your own skills — we'll cover how in a later part of the course. For now, this project comes with two pre-built ones. Let's run them.

Walk the student through each skill — tell them what it does, have them run it, then debrief what happened. Do NOT run the skills yourself.

**`/diagram`**

Tell the student:

> This skill reads the existing `ARCHITECTURE.md` and walks you through the project structure section by section. Type `/diagram` and hit Enter.

After it walks through the first section, explain: *"This is a pre-written architecture doc — the skill's job is to guide you through it, not regenerate it. You described that workflow once in a SKILL.md file and now anyone can run `/diagram` to get the same guided tour."*

**`/todos`**

Tell the student:

> This skill reads `TODOS.md` — a backlog of improvements for this app — and implements each one. Type `/todos` and hit Enter.

After it finishes, ask them to open the app and confirm the changes are visible (dark mode toggle, count badge, keyboard shortcut). Then explain: *"Skills encode the 'how.' The implementation details live in the SKILL.md — Claude just executes them."*

Tell the student:

> You've covered the four fundamentals: the agent loop, keyboard navigation, permissions, and slash commands & skills.
>
> Next up is Assignment 2 — you'll take a codebase with hidden rules and write a `CLAUDE.md` that teaches Claude those rules. The exploration habit you just practiced is exactly what you'll need.
>
> One last thing — run `/clear` now. This is how you start fresh when switching tasks. The conversation disappears, but you're still in the same session and directory. Clean slate, same context.

The wizard is complete. Do not continue after the student runs `/clear`.
