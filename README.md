# Natural Healer

An evidence-led reference for household Ayurvedic remedies, with an AI guide. Browse common conditions, see what to make from an Indian kitchen and when a condition needs a doctor, take a prakriti (constitution) self-assessment, and ask Vanya, the AI guide, follow-up questions.

Natural Healer offers general wellness information, not medical advice.

## Features

- **Remedy library:** 12 everyday conditions and 60 kitchen remedies. Each condition has severity, typical duration, doshas and prevention, and serious ones are flagged for a doctor.
- **Materia medica:** each category is anchored to a herb, shown as a botanical plate with its species, the plant part used and the compounds researchers study.
- **Knowledge base:** 27 herb and kitchen-substance entries with classical properties, typical adult amounts, cautions, medicine interactions and an honest evidence rating. They're drafts awaiting practitioner review, and the site says so. See [KNOWLEDGE_BASE.md](KNOWLEDGE_BASE.md).
- **AI guide (Vanya):** answers stream in from Google Gemini on the server, grounded in the knowledge base with numbered citations, and personalised by your prakriti. Conversations are saved to your account.
- **Safety triage:** emergency signs (for example chest pain, trouble breathing or thoughts of self-harm) get an immediate "seek care now" reply instead of a remedy.
- **Prakriti assessment:** 12 questions scored on the server, with balancing guidance.
- **Accounts:** email/password and Google sign-in through Firebase. Favorites and history sync across devices.

## Tech stack

| Part | Built with |
| --- | --- |
| Frontend | React 18, Vite, React Router |
| API | Vercel serverless functions (Node 22) in `api/` |
| Auth and data | Firebase Authentication, Firestore (written only by the API) |
| AI | Google Gemini via `@google/generative-ai`, with model fallback |

## Project structure

```
api/            HTTP endpoints (one file per route, deployed as Vercel functions)
server/lib/     auth, data store, rate limits, safety triage, prompt, Gemini, prakriti
server/test/    server tests (node:test)
server/dev.js   local API server that mirrors Vercel's routing
scripts/        one-off maintenance scripts (legacy chat migration)
server/lib/knowledge/  corpus building and retrieval for the knowledge base
src/            React app: components/, styles/, services/, data/ (incl. data/knowledge/), hooks/
firestore.rules browsers may read their own data and never write
vercel.json     function limits and SPA rewrites
```

Further reading: [BACKEND.md](BACKEND.md) (API, data model, deployment), [KNOWLEDGE_BASE.md](KNOWLEDGE_BASE.md) (content schema, editorial rules, retrieval), [KNOWLEDGE_SOURCES.md](KNOWLEDGE_SOURCES.md) (outside sources, licences, unification plan), [DESIGN.md](DESIGN.md) (design system), [PRODUCT.md](PRODUCT.md) (who it is for and why).

## Getting started

Requires Node 22.12 or newer.

```bash
npm install
cp .env.example .env        # then fill in the server keys
```

Run the API and the site in two terminals:

```bash
npm run dev:api:memory      # API on :3001, in-memory data, fake signed-in user (no keys needed except Gemini)
npm run dev                 # site on :5173, proxies /api to the API
```

Use `npm run dev:api` instead to run against real Firestore and Firebase Auth.

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run dev:api` | Local API using Firestore and Firebase Auth |
| `npm run dev:api:memory` | Local API with in-memory data and a fake user |
| `npm test` | Server tests |
| `npm run build` | Production build of the site |
| `npm run kb:enrich` | Refresh botanical names and Indian-language names from Kew and Wikidata |
| `npm run migrate:chats` | Copy chats from the old layout (dry run; add `-- --write`) |

## Environment variables

These are server-only, and none may start with `VITE_`, because Vite puts `VITE_` variables into the public bundle. See `.env.example`.

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Google AI Studio key for the AI guide |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin service account JSON (one line, or base64) |
| `GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS` | Optional model overrides |

## Deployment

The project deploys to Vercel from the repository root: the site builds with Vite, and `api/` becomes serverless functions. Set the environment variables in the Vercel project, and publish `firestore.rules` to Firebase. [BACKEND.md](BACKEND.md) has the step-by-step setup.

## License

MIT

Made by #AbdullahSlash
