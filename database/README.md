# Database

Everything MongoDB-specific for the portfolio. **No database files, dumps or
credentials live in this repository** — the database itself is external
(MongoDB Atlas in production, a local `mongod` in development).

```
database/
└── seeds/
    ├── seed.js       # idempotent seeding engine + CLI entry
    └── seedData.js   # seed content — the source of truth for the site's data
```

## Why there is no `schemas/` or `migrations/` folder

Both were considered and deliberately left out rather than duplicated:

- **Schemas** are the Mongoose models in [`backend/models/`](../backend/models).
  They are `require()`d directly by controllers, so a copy here would be a
  second, divergent definition. [`backend/models/`](../backend/models) is the
  single source of truth; the collection each model maps to is listed below.
- **Migrations** — there is no migration layer, by design. MongoDB is
  schemaless, and the app evolves through **idempotent seeding**: `seed.js`
  inserts what is missing and additively patches existing documents
  (`projects:additive-patch`, `certificates:additive`). Introducing a migration
  framework would add a second mechanism for the same job. If a destructive or
  non-backward-compatible change is ever needed, that decision should be made
  deliberately and documented here.

## Collections

All in the **`portfolio`** database, created automatically by MongoDB on first
insert.

| Collection     | Mongoose model                              | Purpose                                        |
| -------------- | ------------------------------------------- | ---------------------------------------------- |
| `profiles`     | [`Profile.js`](../backend/models/Profile.js)     | Name, titles, tagline, email, socials, photo |
| `skills`       | [`Skill.js`](../backend/models/Skill.js)         | Categorized tech-stack items                  |
| `projects`     | [`Project.js`](../backend/models/Project.js)     | Featured projects + case-study data           |
| `experiences`  | [`Experience.js`](../backend/models/Experience.js) | Internships / virtual internships          |
| `educations`   | [`Education.js`](../backend/models/Education.js)   | B.Tech, HSC, SSC                            |
| `certificates` | [`Certificate.js`](../backend/models/Certificate.js) | Certifications with provider + category   |
| `resumes`      | [`Resume.js`](../backend/models/Resume.js)       | Resume revision history (CMS storage)         |
| `messages`     | [`Message.js`](../backend/models/Message.js)     | Contact-form submissions                      |
| `admins`       | [`Admin.js`](../backend/models/Admin.js)         | CMS login credentials (bcrypt hash)            |

`messages` is never touched by seeding — it only holds contact submissions.

## Connection

Configured by a single environment variable; see [`.env.example`](../.env.example).

| Variable      | Notes                                                                     |
| ------------- | ------------------------------------------------------------------------- |
| `MONGODB_URI` | Connection string. Local: `mongodb://localhost:27017/portfolio`. Production is a MongoDB Atlas `mongodb+srv://` URL stored **only** in Vercel environment variables. |

The connection logic — including the cold-start retry that serverless
invocations depend on — is in [`backend/config/db.js`](../backend/config/db.js).
Requests that need the database are gated by
[`backend/middleware/db.js`](../backend/middleware/db.js), which returns `503`
while MongoDB is unreachable.

## Seeding

Seeding runs automatically on every start (see the boot sequence in
[`backend/server.js`](../backend/server.js)) and is safe to re-run: it only
inserts what is missing.

```bash
npm run seed          # insert missing data + additive patches
npm run seed:force    # wipe and re-seed the six content collections
```

`npm run seed:force` is destructive to the six **content** collections. It never
touches `messages`, `resumes` or `admins`.

> **Deployment note.** `backend/server.js` reaches the seeds across folders with
> `require('../database/seeds/seed')`. That path only resolves in the Vercel
> function bundle because `vercel.json` lists `database/seeds/**` in the
> builder's `includeFiles`. Removing that entry would silently stop the
> production cold-start seed, because the call sits inside a `try/catch`.

## Backups

`mongo-backup/` holds a local `mongodump` of the `portfolio` database. It is a
developer convenience only: it is listed in `.gitignore` and `.vercelignore`, is
never committed, and is unrelated to `database/` (which contains only code).
