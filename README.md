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

`.env` is git-ignored. Never commit it.

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

Not required — the Express server already serves `index.html`, `css/style.css`, `js/main.js` and all `/public` assets. If you prefer to serve static files separately, any static server works against the `public/` + `src/` + root `index.html`, but you must also set `CLIENT_ORIGIN` in `.env` to allow the API calls from a different origin.

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

```
portfolio/
├── index.html                # semantic, SEO-ready frontend shell
├── package.json
├── .env.example              # template (copy to .env)
├── .gitignore
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   └── images/profile/profile.jpg
├── src/
│   ├── css/style.css         # design system + components + responsive
│   └── js/main.js            # rendering, fallback data, interactions
└── server/
    ├── server.js             # Express app entry
    ├── config/db.js          # Mongoose connection
    ├── middleware/db.js      # DB-health guard (503s /api when DB is down)
    ├── models/               # Profile, Skill, Project, Experience,
    │                         # Education, Certificate, Message
    ├── controllers/          # one controller per resource
    ├── routes/               # one router per resource
    └── seed/
        ├── seedData.js       # resume-derived seed content (source of truth)
        └── seed.js           # idempotent seeding + CLI (npm run seed)
```

## Client-side resilience

- If `GET /api/*` fails or returns `503`, the frontend swaps in its bundled fallback content — the page always renders.
- The GitHub stat chip is fetched live only when reachable; it stays hidden on failure (graceful fallback).
- The "Download Resume" button points to `public/assets/resume.pdf`. Drop your resume PDF there (create the `public/assets` folder) — until then the button shows a friendly notice instead of a dead link.
- Project GitHub buttons appear **only** when a repository URL exists in the data; fake/live-demo URLs are intentionally omitted.

## Roadmap / admin-ready

The schema and route structure are deliberately modular (one model + controller + router per resource), so a password-protected admin area can be added later without restructuring — new admin routes can reuse the existing models and `isDbConnected` guard. Suggested next step: `POST /api/admin/login` + CRUD routes for `profile/skills/projects/experience/education/certificates`.

## License

MIT — feel free to adapt for your own use, but the personal data belongs to Vinit Niwalkar.