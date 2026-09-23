# Harsh-Boss UI

[![Angular](https://img.shields.io/badge/Angular-19-red)](https://angular.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-cyan)](https://tailwindcss.com/)

Angular 19 frontend for the Harsh-Boss AI Productivity Workspace.

> **Backend repo:** `atlas-backend` (contains `atlas-mcp-server` + `atlas-api`)
> This UI calls the REST API at `http://localhost:8080` (configured in `proxy.conf.json`).

## Quick start

```bash
npm install
npm start
# → http://localhost:4200
```

## Features

- **Dashboard** — stat cards, AI daily brief, quick links
- **Inbox** — AI email triage, semantic search, buried-in-spam detection
- **Calendar** — unified view (Teams/Google/Zoom/Personal), propose meeting with conflict detection
- **Approvals** — approve/decline meeting proposals, auto-reply emails
- **Ask Harsh-Boss** — conversational AI agent chat (calls Spring AI ChatClient)
- **Profile** — create/edit user, connect Google OAuth2, sync real emails

## Configuration

`src/proxy.conf.json`:
```json
{
  "/api": {
    "target": "http://localhost:8080",
    "secure": false
  }
}
```

All `/api/*` requests are proxied to the Harsh-Boss API (Spring Boot, port 8080).

## Tech stack

- **Angular** 19 (standalone components, signals, `@if`/`@for` control flow)
- **Tailwind CSS** 3.4 (slate + emerald palette)
- **TypeScript** 5.5 (strict mode)
- **RxJS** 7

## Build

```bash
npm run build     # production build → dist/
npm run watch     # dev build with watch
```

## Git

```bash
git init
git add .
git commit -m "Initial commit: Harsh-Boss UI"
git remote add origin <your-repo-url>
git push -u origin main
```
