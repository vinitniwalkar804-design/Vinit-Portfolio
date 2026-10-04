# Vinit Niwalkar — Full Stack Developer Portfolio

A premium, full-stack personal portfolio for **Vinit Niwalkar** (Full Stack Developer & AI / Data Science Engineer).

Built with plain **HTML5 · CSS3 · Vanilla JavaScript** on the frontend and **Node.js · Express.js · MongoDB (Mongoose)** on the backend.

> The portfolio content is **database-driven where practical**, with a built-in **graceful fallback** — the site always renders even if the database is down, and contact submissions clearly report failures.

---

## ✨ Highlights

- Dark-first, premium developer aesthetic (Apple/Vercel-level clean) with an optional **light theme toggle** (persisted via `localStorage`)
- Subtle animated background, glassmorphism cards, scroll-reveal and micro-interactions
- Fully responsive — mobile-first, no horizontal scroll (320px → 1440px+)
- Accessibility: semantic HTML, keyboard navigation, visible focus, `prefers-reduced-motion` support
- **FindLink** presented as the major project with an in-page **case-study modal** (Overview / Problem / Solution / Key Features / Tech Stack / Role)
- Contact form → `POST /api/contact` → MongoDB `messages` collection with validation and loading/success/error states
- No fabricated metrics, companies, results or statistics

---

## 🧰 Tech Stack

| Layer      | Technology                                   |
| ---------- | -------------------------------------------- |
| Frontend   | HTML5, CSS3, Vanilla JavaScript              |
| Backend    | Node.js, Express.js (v5)                     |
| Database   | MongoDB, Mongoose ODM                        |
| Tooling    | dotenv, cors (optional), nodemon (dev)       |

---

## 1. Prerequisites

- **Node.js 18+** (built/tested on Node 24)
- **npm**
- **MongoDB running locally** on the default port `27017`
  - A running local MongoDB instance is required for full functionality (contact form, DB-driven content).
  - Verify with: `mongosh "mongodb://localhost:27017" --quiet --eval "db.runCommand({ ping: 1 })"`

## 2. MongoDB requirement

- The app connects to exactly **one** database: **`portfolio`**
- If the database does not exist, MongoDB **creates it automatically** on first insert
- No existing databases or collections are ever touched

## 3. Installation

```bash
npm install
```

## 4. Environment variables

Copy `.env.example` to `.env` and adjust if needed:

```ini
MONGODB_URI=mongodb://localhost:27017/portfolio
PORT=5500
CLIENT_ORIGIN=
```

| Variable        | Description                                                                        |
| --------------- | ---------------------------------------------------------------------------------- |
| `MONGODB_URI`   | MongoDB connection string (defaults to `mongodb://localhost:27017/portfolio`)       |
| `PORT`          | Port for the Express server (default `5500` — the commonly-used `5000` can conflict with other local apps) |
| `CLIENT_ORIGIN` | Optional. Leave empty for the default same-origin setup. Set it only if you serve the frontend separately (e.g. `http://localhost:5173`). |
| `BLOB_READ_WRITE_TOKEN` | **Required in production.** Vercel Blob read-write token used for resume and certificate uploads (see below). |
| `BLOB_RESUME_PREFIX` | Optional. Object-name prefix for resume objects inside the blob store (default `resumes`). Certificates always use `certificates/`. |

`.env` is git-ignored. Never commit it.

### File storage (required on Vercel)

A Vercel function's filesystem is **read-only** and thrown away when the instance
is recycled, so uploaded files cannot be written into `frontend/public/`.
`backend/config/storage.js` picks a provider automatically for **both** CMS
uploads (resume and certificate PDFs):

| Provider        | When                              | Behaviour                                                                       |
| --------------- | --------------------------------- | ------------------------------------------------------------------------------- |
| `vercel-blob`   | `BLOB_READ_WRITE_TOKEN` is set    | Uploads go to durable Blob storage.                                              |
| `local`         | Token unset and not on Vercel     | Uploads go to `frontend/public/...`; the replaced resume is copied to `_archive/`. |

On Vercel without a token, uploads are **rejected with 503** instead of silently
writing to a filesystem that will be discarded — that silent failure is what
previously made the admin panel report "success" while the public resume never
changed (and while certificate uploads failed outright).

Setup: Vercel dashboard → **Storage** → create a **Blob** store with public
access → connect it to the project (or create a read-write token) → set
`BLOB_READ_WRITE_TOKEN` in the project's environment variables and redeploy.

**Resume.** The public link `/assets/Vinit-Niwalkar-Resume.pdf` never changes. It
is served by `backend/routes/resume.routes.js`, which streams whichever revision
is active from blob storage and falls back to the copy bundled with the
deployment if storage is unreachable. Every upload gets a new object name, so
replaced resumes stay downloadable from their own URL and are listed under
**Previous versions** in the dashboard.

**Certificates.** Each certificate document keeps its own file URL, which already
changed on every upload, so there is no stable-path contract to honour. On blob
storage the document stores the CDN URL directly and the public page downloads
from the CDN without invoking a function; on the local provider it stores
`/certificates/<name>.pdf` as before. Replacing or removing a certificate file
deletes the superseded object, and existing rows pointing at `frontend/public/certificates/…`
keep working.

Verify the whole flow — including a cold start, which is what a redeploy does:

```bash
npm run verify:cms               # all scenarios
npm run verify:cms -- E          # certificate-storage scenario only
```

The harness boots real child processes against the configured `MONGODB_URI`,
restores the `resumes` collection afterwards, and only ever touches throwaway
certificate documents it creates itself.

## 4b. Deployment (Vercel)

The whole app ships as **one** serverless function. `vercel.json` points the
`@vercel/node` builder at `backend/server.js` and routes **every** request to it:

```jsonc
"builds":  [{ "src": "backend/server.js", "use": "@vercel/node", "config": { "includeFiles": [...] } }],
"routes":  [{ "src": "/(.*)", "dest": "backend/server.js" }]
```

That single function serves the API, the admin CMS *and* the static frontend, so
the project root stays the Vercel root directory — there is no separate
"frontend build" step, and no build command to configure.

`includeFiles` is what puts the non-JavaScript frontend into the bundle, because
the static mounts are resolved with `path.join()` at runtime and file tracing
cannot see them. **All four entries are load-bearing:**

| Entry                     | Needed because                                                    |
| ------------------------- | ----------------------------------------------------------------- |
| `frontend/public/**`      | `express.static` — favicon, images, certificates, admin CMS, bundled resume |
| `frontend/src/**`         | the `/css` and `/js` mounts — stylesheets, `main.js`, ThreeUI modules |
| `frontend/index.html`     | served at `/`                                                     |
| `database/seeds/**`       | `require('../database/seeds/seed')` for the cold-start seed        |

> If `database/seeds/**` is dropped from `includeFiles`, the app still deploys
> and still serves — but seeding silently stops, because the call sits inside a
> `try/catch`. Keep it.

Environment variables (`MONGODB_URI`, `JWT_SECRET`, `BLOB_READ_WRITE_TOKEN`,
`EMAIL_*`, …) are set in the Vercel dashboard. No `.env` file is uploaded —
`.vercelignore` excludes it.

## 5. Start the backend (+ frontend)

The Express server serves **both** the API and the static frontend, so one command runs the whole app:

```bash
npm start
# or, for live-reload during development
npm run dev
```

Then open **http://localhost:5500**.

### Seeding the database

Data is seeded automatically on first start. To seed manually:

```bash
npm run seed          # only inserts missing data
npm run seed:force    # wipes & re-seeds the six content collections
```

> `messages` is never touched by seeding — it only holds contact submissions.

## 6. Start the frontend on its own

Not required — the Express server already serves `index.html`, `css/style.css`, `js/main.js` and everything under `frontend/public`. If you prefer to serve static files separately, any static server works against `frontend/` (serving `index.html` at `/` with `src/` and `public/` beneath it), but you must also set `CLIENT_ORIGIN` in `.env` to allow the API calls from a different origin.

Note that `index.html` references its assets **relatively** (`css/style.css`,
`js/main.js`, `images/...`) because the server mounts `frontend/src/css` at `/css`
and `frontend/src/js` at `/js`. Serving `frontend/` from a static host therefore
needs those two directory mappings mirrored — serving `frontend/public` alone is
not enough.

## 7. MongoDB — database & collections

**Database:** `portfolio`

**Collections (auto-created by Mongoose):**

| Collection     | Purpose                                       |
| -------------- | --------------------------------------------- |
| `profiles`     | Name, titles, tagline, email, socials, photo  |
| `skills`       | Categorized tech-stack items                  |
| `projects`     | Featured projects + full case-study data      |
| `experiences`  | Internships / virtual internships             |
| `educations`   | B.Tech, HSC, SSC                              |
| `certificates` | Certifications with provider + category       |
| `messages`     | Contact-form submissions (name, email, message, createdAt) |

## 8. API endpoints

| Method | Endpoint              | Description                                                        |
| ------ | --------------------- | ------------------------------------------------------------------ |
| GET    | `/api/health`         | Server + database status                                           |
| GET    | `/api/profile`        | Portfolio profile                                                  |
| GET    | `/api/skills`         | All skill entries                                                  |
| GET    | `/api/projects`       | Projects incl. case-study fields                                   |
| GET    | `/api/experience`     | Internships / experience timeline                                  |
| GET    | `/api/education`      | Education records                                                  |
| GET    | `/api/certificates`   | Certifications                                                     |
| POST   | `/api/contact`        | Validates + saves a message → `messages`                           |
| *any*  | `/api/*`              | 404 `{ success: false }` for unknown routes                        |

Status codes: `200` success · `201` message saved · `400` validation error · `503` database unavailable.

Security notes: JSON body limited to 100 KB, `x-powered-by` disabled, CORS disabled by default, no secrets in frontend code, error handler returns generic messages to clients.

## 9. Project structure

One repository, three concerns. `frontend/` is static and is served *by* the
backend, so a single `npm start` runs the whole app.

```
portfolio/
├── frontend/                    # everything the browser loads
│   ├── index.html               # semantic, SEO-ready frontend shell
│   ├── public/
│   │   ├── admin/               # admin CMS pages + css/js (unlinked from the public site)
│   │   ├── assets/              # bundled resume copy (+ local _archive/, git-ignored)
│   │   ├── certificates/        # bundled certificate PDFs
│   │   ├── images/profile/profile.jpg
│   │   ├── favicon.svg
│   │   └── robots.txt
│   └── src/
│       ├── css/style.css        # design system + components + responsive
│       ├── css/effects.css      # animation / effect layer
│       └── js/
│           ├── main.js          # rendering, fallback data, interactions
│           └── threeui/         # WebGL hero field + skills constellation
│
├── backend/                     # Express API + CMS + static file server
│   ├── server.js                # Express app entry (also the Vercel function entry)
│   ├── config/
│   │   ├── db.js                # Mongoose connection + cold-start retry
│   │   ├── storage.js           # file-storage provider (Vercel Blob | local)
│   │   ├── auth.js              # JWT + allowed-admin-email config
│   │   └── email.js             # SMTP transport + diagnostics
│   ├── middleware/              # adminAuth, db health guard, rate limiting
│   ├── models/                  # Mongoose schemas — Profile, Skill, Project,
│   │                            #   Experience, Education, Certificate, Resume,
│   │                            #   Message, Admin
│   ├── controllers/             # one controller per resource (+ admin/)
│   ├── routes/                  # one router per resource (+ admin/)
│   │   ├── resume.routes.js     # stable public resume URL
│   │   └── admin/               # protected admin routers
│   ├── services/                # email + admin-email delivery
│   ├── utils/                   # asyncHandler, input validation
│   └── scripts/admin-init.js    # create/reset the CMS admin (npm run admin:init)
│
├── database/                    # MongoDB tooling only — no data, no credentials
│   ├── README.md                # collections, connection, seeding, backup policy
│   └── seeds/
│       ├── seedData.js          # seed content (source of truth)
│       └── seed.js              # idempotent seeding + CLI (npm run seed)
│
├── scripts/
│   └── verification/verify-cms-storage.js   # npm run verify:cms
│
├── package.json                 # single package: serves frontend + backend
├── vercel.json                  # single serverless function + included frontend files
├── .env.example                 # template (copy to .env)
└── .gitignore
```

There is intentionally no `frontend/package.json`: the frontend is plain
HTML/CSS/vanilla JS with no build step and no client-side dependencies, so it
shares the root `package.json` (which only installs backend packages).

## Client-side resilience

- If `GET /api/*` fails or returns `503`, the frontend swaps in its bundled fallback content — the page always renders.
- The GitHub stat chip is fetched live only when reachable; it stays hidden on failure (graceful fallback).
- The "Download Resume" button always points to `/assets/Vinit-Niwalkar-Resume.pdf`. That path is served by the app (see **File storage** above): the active CMS revision when one is stored, otherwise the copy bundled at `frontend/public/assets/Vinit-Niwalkar-Resume.pdf`. Uploading from the admin dashboard replaces what visitors get without changing the link.
- Project GitHub buttons appear **only** when a repository URL exists in the data; fake/live-demo URLs are intentionally omitted.

## Roadmap / admin-ready

The schema and route structure are deliberately modular (one model + controller + router per resource), so a password-protected admin area can be added later without restructuring — new admin routes can reuse the existing models and `isDbConnected` guard. Suggested next step: `POST /api/admin/login` + CRUD routes for `profile/skills/projects/experience/education/certificates`.

## License

MIT — feel free to adapt for your own use, but the personal data belongs to Vinit Niwalkar.