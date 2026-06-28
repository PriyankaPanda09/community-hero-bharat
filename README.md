# Community Hero — Bharat Civic Hub

A full-stack civic issue reporting and tracking platform that lets citizens report local problems — potholes, broken streetlights, garbage, water leaks — with a photo, get them automatically categorized by AI, and track them through to verified resolution.

Built for the **Vibe2Ship Hackathon** (Problem Statement 2: Community Hero — Hyperlocal Problem Solver), using **Google AI Studio** as the core build and deploy tool.

**Live app:** https://community-hero-149727530776.us-west1.run.app

---

## The problem

Reporting a pothole or a broken streetlight today is fragmented and goes nowhere. There's no easy way to confirm an issue is real, no tracking once it's reported, and no way to know if it ever actually got fixed. Citizens lose trust, and small problems stay unresolved indefinitely.

## What this does differently

Most civic reporting tools stop at "log the issue." Community Hero goes further:

- **AI-verified reporting** — Gemini checks that an uploaded photo is a real photograph (not a cartoon, illustration, or stock image) before accepting a report, and automatically fills in category, severity, and a clean description.
- **Duplicate detection with reasoning** — before creating a new report, Gemini compares it against nearby existing reports and decides if it's likely the same real-world issue, with a stated reason for its decision.
- **Independent verification** — only the *original reporter* (never the admin who resolved it) can mark an issue as truly fixed, and only after seeing AI-checked photo proof. This keeps resolution honest.
- **Autonomous civic review agent** — a periodic review scans every open report and flags any that meet strict urgency criteria (5+ confirmations, high severity, open more than 7 days), automatically rewriting that report's official complaint letter with firmer, specific language — without a human asking for it each time.
- **Auto-drafted complaint letters** — every issue gets a formal letter addressed to the correct civic authority based on category (Roads, Electricity, Sanitation, Water Supply), ready to copy, download, or email.

## Tech stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Vite
- **Backend:** Node.js / Express (server-side, via Vite + esbuild)
- **AI:** Google Gemini API (`@google/genai`) — multimodal image understanding, structured JSON output, text generation
- **Database & Auth:** Firebase (Firestore + Firebase Authentication, Google Sign-In)
- **Maps:** Leaflet with OpenStreetMap (no billing/API key required)
- **Build & Deploy:** Google AI Studio Build Mode → Cloud Run
- **Animation:** Motion (Framer Motion)

## Google technologies used

- Google AI Studio (core build and deployment tool)
- Gemini API (image categorization, duplicate-detection reasoning, complaint letter generation, photo-realism and resolution-proof verification)
- Firebase Authentication (Google Sign-In)
- Firestore (database, with custom security rules enforcing role-based write permissions)
- Google Cloud Run (deployment target)

## Key features

- Photo-based issue reporting with AI auto-categorization
- Duplicate detection and co-reporter confirmation system
- Admin-only resolution workflow requiring AI-validated photo proof
- Reporter-only final verification (admin cannot self-verify their own work)
- Autonomous "Civic Review" escalation agent with auto-regenerated complaint letters
- Interactive map view (Leaflet/OpenStreetMap) with status-coded pins
- Multi-language support (11 Indian languages)
- Light, Dark, and Neon themes
- Leaderboard and gamification (points, badges, certificates)
- Auto-logout after extended inactivity
- Real-time Firestore sync across browser tabs

## Status lifecycle

Issues move strictly forward through a fixed sequence enforced in code, not just the UI:

```
Open → In Progress → Resolved → Verified
```

- Only the admin can move an issue to **In Progress** or **Resolved** (resolution requires AI-checked photo proof).
- Only the original reporter or a confirmed co-reporter can mark an issue **Verified** — and only after it's **Resolved**.
- The admin is explicitly blocked from setting Verified status under any circumstance.
- Status can never skip a step or move backward.

## Project structure

```
src/
  components/        # React components (Dashboard, BrowseIssues, MapView, ReportIssueForm, etc.)
  translations/       # 11-language translation files
  data/               # Static India states/districts data
  FirebaseContext.tsx # Core data layer: Firestore reads/writes, status logic, escalation logic
  firebase.ts         # Firebase app initialization
  types.ts            # Shared TypeScript types
server.ts             # Express server, Gemini API endpoints
firestore.rules       # Firestore security rules
firebase-blueprint.json
security_spec.md      # Security design notes
```

## Running locally

**Prerequisites:** Node.js

```bash
npm install
```

Set `GEMINI_API_KEY` in a `.env.local` file (see `.env.example` for the expected format).

```bash
npm run dev
```

## Deployment

This app is built and deployed directly from **Google AI Studio Build Mode** to **Google Cloud Run**. The `GEMINI_API_KEY` is automatically managed as a server-side secret by AI Studio — it is never exposed to the browser.

## Submission links

- **Live app:** https://community-hero-149727530776.us-west1.run.app
- **GitHub repository:** *(this repo)*
- **Project description document:** *(link to be added)*

## License

Built for the Vibe2Ship Hackathon (Google AI Studio / BlockseBlock, June 2026).
