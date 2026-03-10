# Branching Conversations — Claude Feature Concept

A concept demo for two proposed Claude features:

1. **Branching Conversations** — Fork context-aware branches from any point in a conversation. Each branch inherits only the messages up to its fork point, keeping context windows clean and focused.

2. **Claude Code Bridge** — Bidirectional context sync between Claude AI (conceptual/architectural) and Claude Code (implementation). No more copy-pasting between the two.

## Run locally

```bash
npm install
npm run dev
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repo — Vite is auto-detected
4. Deploy

## How the demo works

- Click **chat nodes** (left) to see context ancestry and window usage
- Click **code nodes** (right) to see linked conversations and data syncs
- Click **sync lines** between chat and code to see what's being passed
- Dimmed nodes are outside the current context — they don't consume tokens
