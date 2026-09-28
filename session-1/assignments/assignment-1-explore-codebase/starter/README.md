# Option B — Architecture Doc


## Before You Start

Create a branch for your work so resets don't affect it:

```bash
git checkout -b my-solution
```

When you want to start fresh, run reset from the cohort repo root. It rewrites the working tree from `origin/main`, but your committed work on your branch is safe:

```bash
# From the course repo root
./reset.sh
```

A small bookings app (think: room reservations for a coworking space). Cleanly separated into routes, services, repositories, db, and middleware. Your job is to discover the architecture without reading every file yourself.

## Your job

Use Claude Code to:

1. Map every layer (routes → services → repositories → db).
2. Identify the cross-cutting concerns (auth, logging, errors).
3. Find the seams — where would you add a new feature?
4. Produce a one-page architecture document with a diagram (ASCII or mermaid is fine).

## Deliverable

`ARCHITECTURE.md` containing:
- A short prose overview (3–5 sentences)
- A layered diagram
- A list of the main entry points and what they do
- A "how to add a new endpoint" walkthrough specific to this codebase

## Suggested prompts

- "Don't read every file. Skim the directory tree and tell me the layers."
- "Pick one endpoint and trace it from route to db. Show me the call stack."
- "What are the cross-cutting concerns?"
- "If I wanted to add a `GET /bookings/:id/history` endpoint, where would each piece live?"

## Starting point

```
src/
  index.ts                       app entry, wires the layers
  routes/
    bookings.routes.ts
    rooms.routes.ts
    users.routes.ts
  services/
    bookings.service.ts
    rooms.service.ts
    users.service.ts
  repositories/
    bookings.repo.ts
    rooms.repo.ts
    users.repo.ts
  db/
    client.ts                    fake in-memory client
    schema.ts                    type definitions
  middleware/
    auth.ts
    errors.ts
    logging.ts
package.json
tsconfig.json
```
