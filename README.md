# HIIPS360
An officer support/guidance tool.

> **Read this first.** HIIPS360 is a prototype built to learn whether officers would use a digitized version of the HIIPS sheets. It does not connect to WorkSafeBC systems, it does not write the inspection report, and everything it shows is a suggestion the officer confirms, edits or sets aside. It supports the officer's judgement. It does not replace it, and it does not change the inspection process, the officer's authority or the regulation.

---

## Table of contents

1. [The problem](#the-problem)
2. [What HIIPS360 does](#what-hiips360-does)
3. [A walk through a site visit](#a-walk-through-a-site-visit)
4. [How it fits with the inspection report](#how-it-fits-with-the-inspection-report)
5. [Scope: MVP and what comes later](#scope-mvp-and-what-comes-later)
6. [Project status](#project-status)
7. [Who it is for](#who-it-is-for)
8. [Design principles](#design-principles)
9. [Technical overview](#technical-overview)
10. [Getting started](#getting-started)
11. [Deploying](#deploying)
12. [Working on the code](#working-on-the-code)
13. [Content and ownership](#content-and-ownership)
14. [How we will know whether it worked](#how-we-will-know-whether-it-worked)
15. [Risks and known limitations](#risks-and-known-limitations)
16. [Project documents](#project-documents)

---



## The problem

Prevention Field Services officers produce roughly 50,000 inspection reports a year, about a quarter of them in construction. On every visit the officer has to establish two things: what hazards the work carries, and whether the employer has identified and controlled them.

WorkSafeBC already has the answers written down.

- The **Hazard Identification Inspection Protocol Sheets (HIIPS)** are organized by classification unit. Each one pairs a hazard with the control expected and the regulation that governs it, and sets out the officer's own protective equipment and on-site practices.
- The **OHS Regulation app** searches the law by keyword.

Neither is reachable in the way an inspection needs:

- Each sheet is a PDF of twenty pages or more.
- The library cannot be searched as a set.
- The sheets are not linked to the regulation text they cite.
- The OHS Regulation app knows nothing about the hazards of a particular site.

So the officer bridges the two from memory. That works for familiar work and less well for everything else. A newer officer, or one assigned outside their usual area, has no accumulated pattern to draw on. Hazards that cross into other parts of the regulation are the hardest to catch. A wood framing site brings machine and equipment lockout through saw blade changes and temporary power, and an officer would not think to look for that under framing.

**The cost shows up as uneven inspection quality, not as a visible failure.** A hazard that is passed is a control the employer is never asked about.

## What HIIPS360 does

HIIPS360 makes what the sheets already contain available at the moment it is needed. It connects four things the officer currently holds together from memory:

```
  Type of work  ──▶  Hazards  ──▶  Controls expected  ──▶  Governing regulation
  (from a photo)     (incl. those      (with questions        (Act, OHS Regulation,
                     crossing in        to ask and the         policies, guidelines,
                     from other         order to consider      standards)
                     parts of the       them)
                     regulation)
```

| Capability | What the officer gets |
|---|---|
| **Identify the work** | Photograph the site and be offered the protocol sheet that applies. Confirm it or change it. |
| **Hazard guidance** | A list of the hazards for that work to walk the site against, including cross-over hazards that are easy to walk past. Detail stays out of the way until a hazard is opened. |
| **Controls and risk** | For an opened hazard: questions for the employer and workers, the controls that should be present, the order controls should be considered in, and what raises or lowers the risk. |
| **Regulation reference** | Move from a hazard directly to the wording of the requirement that governs it, without searching the law separately. |
| **Evidence and summary** | Attach photos to a hazard, or mark it not applicable to this site. Review a summary showing every hazard on the sheet was addressed before leaving. |

The hierarchy is where the value sits. Recognizing that a ladder carries a fall risk is the easy part. What follows is the order of consideration (aerial lift, then scaffold or work platform, then ladder) with the requirements for inspection, training and safe access. The sheets hold that reasoning. HIIPS360 delivers it at the site, so a hazard the officer can name becomes an inspection they can defend.

## A walk through a site visit

An officer pulls up to a residential construction site. It was booked as framing, but the crew is also forming concrete and there is a scaffold up the side of the building.

1. **Arrive and photograph.** HIIPS360 offers the protocol sheet for framing or residential forming and flags scaffolds as related work. The officer accepts both.
2. **Glance at the plan.** The sheet lists the protective equipment for this kind of site, which the officer already has, and raises questions about engineered drawings and fall protection.
3. **Walk the site.** Perimeter fall protection is in place, so the officer records a photo showing it was reviewed.
4. **Open a hazard that looks wrong.** A ladder to the second floor is not secured and sits at the wrong angle. The sheet shows the questions to ask, the controls that should be there, the angle and extension requirements, and the regulation behind them. The officer photographs it from two angles.
5. **Mark what does not apply.** Confined space does not arise, so the officer marks it not applicable.
6. **Catch the hazard that crosses in.** Table saws are running without guarding. The sheet raised this under lockout and safeguarding even though the site was booked as framing. The officer would not have looked for it. Another photo goes against that hazard.
7. **Review before leaving.** In the truck, the summary shows every hazard on the sheet is either reviewed with evidence attached or marked not applicable. Nothing was missed.
8. **Write the report as usual.** The officer moves on and writes the inspection report in the usual way, outside HIIPS360.

## How it fits with the inspection report

HIIPS360 sits *before and alongside* the report, not in it. The sample inspection report in this project (a fall protection stop-work inspection at a two-storey townhouse under construction with roofing underway) shows the chain of reasoning HIIPS360 is meant to support:

| Officer's observation | Governing requirement cited |
|---|---|
| Workers on a 5:12 sloped roof with no fall protection, exposed to a 24 ft fall onto hard ground | OHS Regulation 11.2(1)(a): a fall protection system is required when a fall of 3 m (10 ft) or more may occur |
| Damaged or untagged equipment, workers unable to inspect a harness, a supervisor who did not correct unsafe conditions | Workers Compensation Act 21(2)(e): instruction, training and supervision |
| High risk of serious injury or death | Workers Compensation Act 90(1)(a): stop-work order |

That hazard-to-control-to-requirement reasoning is what HIIPS360 makes reachable on site. The observations, the judgement and the orders remain entirely the officer's, and the report is still written in the usual way.

## Scope: MVP and what comes later

The MVP is the smallest version worth using. It runs from arrival to leaving the site, and an officer can start an inspection, work through it and finish it without leaving the tool.

**First release (MVP)**

- Identify the work from a photo taken on site, and confirm or change the sheet offered
- Show the hazards for that work, including those that cross in from other parts of the regulation
- Show the controls expected for each hazard, and the regulation that governs it
- Attach one or more photos to a hazard, or mark it not applicable
- Review the summary before leaving the site

See [Project status](#project-status) for how much of this is built.

**Left for later**

- Inspection preparation before the officer leaves: the plan, the protective equipment and site practices, and describing a job in words (typed or spoken) instead of photographing it
- Wider legal search across the Act, the Regulation, policies and guidelines together
- Employer conversation features: plain-language explanations of requirements, showing the employer a photo, and pointing to where a requirement is published

Each is useful, and none is needed to prove the concept holds.

## Project status

The prototype covers the whole MVP flow, from picking a job site to a findings PDF. It is a student prototype (Fall 2026), not a WorkSafeBC system, and it says so in the app.

**Built**

| Area | What exists |
|---|---|
| Landing, sign-in, register (`/`, `/login`, `/register`) | Says plainly that this is a prototype and offers to install the app. Accounts are stored in MongoDB; sessions are an httpOnly cookie. |
| Job sites (`/jobs`) | Each officer has their own list of job sites. Opening one makes it the current job, shown in the header. |
| Pick the protocol sheet (Home, `/home`) | Browse or search the sheets by name, or describe the work (or take a site photo) and ask Gemini to suggest up to three. A job can have up to 5 sheets. Every suggestion can be accepted, changed or ignored. |
| Planning (`/planning`) | The chosen sheets' checklist for before and during the visit (Before you go, On arrival, Walking the site), each item marked ready or not applicable, plus visit notes. |
| Hazards (`/hazard`) | The job's hazards from its sheets, in Unaddressed / Reviewed / Not applicable tabs. This page is also the summary, and **Download PDF** exports the findings (hazards, comments, photos). It records findings only and never says whether a site complies. |
| Hazard detail (`/hazard/:id`) | The sheet's guidance for that hazard (stage, controls, legislation), a comment, photos, and Not applicable. |
| Log hazard (`/hazard/new`) | Add a hazard the sheet doesn't list: a photo and/or description, a Gemini suggestion for its name that the officer edits, and a check for a similar hazard already on the job. |
| Sheet PDFs (`/pdfs`) | The original HIIPS PDFs. |
| Install | Installable PWA. The last signed-in officer stays signed in with no signal; saving needs a connection. |

**Not built, or deferred**

| Piece | State |
|---|---|
| Working offline (saving on the device, then syncing) | Deferred by the team. Saving needs a connection; unsaved comments stay on screen and are retried. |
| Regulation text | A hazard shows what its sheet says about the legislation and the sections it cites. It doesn't open or quote the regulation itself. |
| Voice input on Log hazard | Deferred. Officers can type a description or attach a photo. |
| Only 4 sheets | Log Transport, Long-term Care, Motion Picture / TV Production and Performing Arts. Adding a sheet is described under [Working on the code](#working-on-the-code). |

Known bugs and test results are in the team's Testing Log (Google Sheet, IDs `TC-nn` for tests and `B-nn` for bugs).

## Who it is for

**Prevention officer.** Inspects workplaces across the range of work their region covers. Some of it they see constantly and know without thinking. Some they meet a few times a year, or for the first time. On any inspection they need the hazards that belong to the work in front of them, the controls that should be there, and the regulation behind both. The tool most helps a newer officer or one working outside their usual area, and it narrows the distance between an officer's strongest area and their least familiar one.

**Employers benefit indirectly.** Employers carry no written hazard assessment requirement, so the officer's ability to discuss hazards, controls and requirements is what moves their practice. An officer holding the hazard, the control and the requirement together can explain why something matters, not just cite the rule. That supports consult, educate and enforce.

## Design principles

- **Suggestion, not decision.** Every result can be confirmed, edited or set aside by the officer.
- **Reachable without the photo.** Identifying work from a photograph is the least certain part of the technology, so the guidance must be reachable by browsing the sheet library even when photo matching fails.
- **The site is the context.** Detail stays out of the way until the officer opens a hazard, and the officer should never be searching while standing in front of the work.
- **Works where the work is (deferred).** Field sites have poor or no connectivity, so a production tool would store inspection state on the device first and treat the network as optional. The team has deferred this for the prototype: inspections are saved to MongoDB through the API, and device-first storage and sync come later.
- **Follows the WorkSafeBC design system.** See [UI and design system](#ui-and-design-system).
- **Says what it is.** The prototype states plainly, at every showing, that it is a prototype and not a product.
## Technical overview

| Layer | Choice | Notes |
|---|---|---|
| Front end | React 19 + Vite, `react-router-dom` v7, plain JSX (no TypeScript) | Mobile first. All routes are in `src/App.jsx`. |
| Install shell | `vite-plugin-pwa` (Workbox service worker, web manifest) | Precaches only `js`, `css` and `html`. |
| API | Express 5 + Mongoose (ESM) in `server/` | In production the same service also serves the built front end, so the browser talks to one origin. |
| Database | MongoDB 8.0 | Local per developer; a hosted MongoDB in production. |
| AI | Google Gemini through `@google/genai`, server side only | Suggests sheets and hazard names. The key never reaches the browser. |
| Protocol sheets | JSON in `src/data/sheets/`, bundled with the app | Never stored in the database. The server reads the same files. |
| Styling | `wsbc.css` from WorkSafeBC's CDN, plus `src/styles/tokens.css` | See [UI and design system](#ui-and-design-system). |

### What is stored where

| Data | Where |
|---|---|
| Accounts | MongoDB `users` (bcrypt password hash), plus the 3 most recently viewed sheets |
| Sessions | MongoDB `sessions`, cookie `hiips360.sid` (httpOnly, `SameSite=Lax`, `Secure` in production, 30 days) |
| Job sites, with their sheets, checklist, visit notes and **hazards** | MongoDB `jobs`, one document per job site per officer; hazards are embedded in it |
| Photos | MongoDB `photos`, one document per photo; the hazard keeps their ids |
| Protocol sheets | `src/data/sheets/*.json` in the app |
| On the device | The last signed-in officer (so a reload with no signal stays signed in) and the app shell |

Not stored, always worked out: a hazard's status (not applicable wins, then any photo counts as reviewed), its guidance (read from the sheet), the findings PDF, and AI suggestions.

### Project structure

```
server/
  index.js              Connects to MongoDB, applies validators and indexes, starts the API
  app.js                Middleware, session, JSON error handler; serves dist/ in production
  config.js             Reads and checks the environment
  db/                   limits.js (every size limit), validators.js, setup.js
  middleware/requireAuth.js
  models/               User, Job (with embedded hazards), Photo
  routes/               auth, jobs, photos, me, ai (route list at the top of each file)
  services/gemini.js    The only file that talks to Gemini
  services/sheetCatalog.js  The sheet list Gemini picks from
src/
  App.jsx               Every route
  components/           Layout (header, bottom nav), PublicLayout, RequireAuth, ...
  context/              JobContext (jobs, current job, saving), HazardContext (hazards, photos)
  data/api.js           The only file that calls /api/jobs, /api/photos and /api/me
  data/sheets/          The sheet JSON, the catalogue, and sheetContent.js (hazards and checklist from a sheet)
  data/syncSheetHazards.js  What happens to a job's hazards when its sheets change (runs on the server)
  auth/                 authService.js (the only file that calls /api/auth), validation.js (shared with the server)
  pages/<Name>/         <Name>.jsx + <Name>.css, one folder per page
  styles/tokens.css     WorkSafeBC design tokens (--wsbc-*, --font-*, --fs-*)
scripts/                db-setup, ai-smoke (live Gemini check), extract_sheets.py (PDF to sheet JSON)
tests/                  node:test suites; tests/db/ needs a real MongoDB
```

### API

Every route except sign-in needs a signed-in officer, and every query is limited to that officer's data: another officer's job, hazard or photo answers 404. Errors are always `{ error }` with a message that is safe to show. Each route file lists its routes at the top.

| Area | Routes |
|---|---|
| Auth (`server/routes/auth.js`) | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Jobs (`server/routes/jobs.js`) | List, create, open and delete job sites; set their sheets, checklist and visit notes; add, change and delete hazards and their photos. Changes answer with the whole updated job. |
| Photos (`server/routes/photos.js`) | `GET /api/photos/:photoId` |
| Me (`server/routes/me.js`) | `GET` and `POST /api/me/recent-sheets` |
| AI (`server/routes/ai.js`) | `POST /api/ai/suggest-hazard`, `POST /api/ai/match-sheet` |
| Health | `GET /api/health` answers `{ ok, db }`; the host uses it to check the service is up |

Limits: failed sign-in or register attempts, 20 per 15 minutes; AI requests, 30 per 15 minutes per IP; 200 hazards per job, 20 photos per hazard, 10 MB per photo (`server/db/limits.js`). The app shrinks photos to 1600 px before uploading.

### Where content comes from

All hazard, control, and regulation content comes from the existing HIIPS sheets and the published Act, Regulation, policies and guidelines. HIIPS360 does not author safety guidance.

### UI and design system

Built against the [WorkSafeBC UX/UI Design System](https://ux-static.online.dv.worksafebc.com/) (`wsbc.css` and Font Awesome 4.7).

- **Templates:** use one of the three provided (fixed, fluid or mixed). A mobile-first inspection flow will lean on the MobileSafe component set (action and tab bars, sliding cards, half and full modals, collapse lists, snackbars).
- **Typography and colour:** Halis headings with Noto Sans or Verdana body text, and the warm grey palette. Do not change fonts or colours. In code, use the variables in `src/styles/tokens.css` rather than hard-coded colours.
- **Buttons:** one primary per page, secondary buttons outlined, sentence-case action labels.
- **Feedback:** the autosave snackbar for save confirmation, and alerts at the top of the page with the alert icon.
- **Accessibility:** target WCAG 2.1 AA. Some default palette pairings fall short of AA contrast, for example white text on the standard blue button, white on orange, and orange text on white. The landing page uses black on orange (8.3:1) and a body-copy outline button (10.4:1) instead. Review these pairings with the UX team before release.
- **Touch targets:** at least 44px, and press feedback respects reduced motion.
## Getting started

Running it on your own computer needs Node.js, MongoDB and a Gemini API key. Each developer has their own database and their own key, so test accounts aren't shared. [AUTH_BACKEND_SETUP.md](AUTH_BACKEND_SETUP.md) has a step-by-step MongoDB guide for Windows, with what the terminal should print.

**Prerequisites**

- Node.js 22.12 or newer
- MongoDB Community Server 8.0 (no replica set needed)
- A Gemini API key: sign in at [Google AI Studio](https://aistudio.google.com/), then **Get API key**. The free tier is enough to try it (see **Gemini free tier** below). Without a key the app runs, but sheet and hazard suggestions fail.

**1. Start MongoDB**

| On | Start it with |
|---|---|
| Windows (installed as the `MongoDB` service) | `Start-Service MongoDB` in an admin PowerShell |
| macOS (Homebrew) | `brew services start mongodb-community@8.0` |
| Linux | `sudo systemctl start mongod` |
| Anywhere with Docker | `docker run -d --name hiips-mongo -p 27017:27017 mongo:8.0` |

**2. Install and configure**

```bash
git clone https://github.com/anthonyherradura/comp_4800_g09_worksafebc_HIIPS360.git
cd comp_4800_g09_worksafebc_HIIPS360
npm install

cp .env.example .env
# Make a session secret and paste it into .env as SESSION_SECRET=
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Paste your Gemini key into .env as GEMINI_API_KEY=
```

**3. Run it**

```bash
npm run dev:all
```

Wait for `HIIPS360 API on http://localhost:3001 (MongoDB connected)`, open http://localhost:5173 and choose **Create an account**. The API creates the database's collections, rules and indexes itself when it starts.

**Scripts**

| Command | Runs |
|---|---|
| `npm run dev:all` | API and Vite together (normal use) |
| `npm run dev:phone` | Same as `dev:all`, but Vite also listens on your network so a phone can open it. See **Trying it on a phone** below |
| `npm run dev` | Vite dev server only; proxies `/api` to `localhost:3001` |
| `npm run dev:api` | API only, restarts when files change |
| `npm run api` | API only, no restart on change |
| `npm run build` | Production build to `dist/` |
| `npm start` | The production server: API plus the built app from `dist/` (needs `NODE_ENV=production`; used by the host) |
| `npm run preview` | Serves the build with Vite (also proxies `/api`). Use this to test install and offline behaviour |
| `npm run lint` | ESLint |
| `npm test` | Automated tests in `tests/`. Gemini, the network and the database are mocked, so they need no API, database or key, and use no quota |
| `npm run test:db` | The jobs and photos API against a real MongoDB. Set `MONGODB_TEST_URI` first; it creates and drops its own database |
| `npm run db:setup` | Applies the database validators and indexes by hand and lists collections left from older designs (the API also does this when it starts) |
| `npm run test:ai-live` | Sends about 10 real requests through the running API to Gemini and prints a results table. Start the API first. Uses your Gemini quota |

GitHub Actions runs lint, build, `npm test` and `npm run test:db` on Linux for every push to `main` and every pull request (`.github/workflows/ci.yml`).

**Environment (`.env`)**

| Variable | Needed | Value |
|---|---|---|
| `MONGODB_URI` | Yes | Locally `mongodb://127.0.0.1:27017/hiips360`. Use `127.0.0.1`, not `localhost`: Node tries IPv6 first and the Windows MongoDB only listens on IPv4. On a host, the hosted database's URI. |
| `SESSION_SECRET` | Yes | A random 64-character hex string (the command above). Use a different one for each developer and for production. |
| `PORT` | No | `3001` locally; `vite.config.js` proxies `/api` here. Hosts set it themselves. |
| `NODE_ENV` | On a host | `production`. Leave it unset locally. In production the API serves the built app, marks the cookie Secure, trusts the host's proxy and hides Gemini's raw errors. Without it a deployed site has no front end. |
| `GEMINI_API_KEY` | For AI | Your key from Google AI Studio. The API starts without it; only `/api/ai` fails. |
| `GEMINI_MODEL` | No | The main model (default `gemma-4-26b-a4b-it`). Check names against Google's models list if you get model-not-found errors. |
| `GEMINI_FALLBACK_MODEL` | No | Started when the main model fails or takes more than 2.5 s (default `gemini-3.1-flash-lite`). Set it empty to turn it off. |
| `GEMINI_SECOND_FALLBACK_MODEL` | No | Third model, started after another 2.5 s (default `gemini-3.5-flash-lite`). Set it empty to turn it off. |
| `GEMINI_HEDGE_MS` | No | How long to wait for a slow model before starting the next one too (default `2500`). Lower answers sooner but uses quota on two models. |
| `MONGODB_TEST_URI` | For `test:db` | For example `mongodb://127.0.0.1:27017`. |

`.env` is git-ignored. Never commit it, and don't share your secret or your key.

**Gemini free tier.** A free key allows about 5 requests a minute and 20 a day per model (Nov 2026). Each fallback model has its own allowance, but a slow answer uses quota on two models. Once every model's allowance is used up, the officer sees "The AI is busy right now. Wait a minute and try again." (per-minute limit) or "The AI has reached today's limit." (daily limit, which resets at midnight Pacific time). Both are a 503 from `/api/ai`. For a demo or real use, turn on billing for the key's Google Cloud project, or keep a separate key, and don't spend the quota on `npm run test:ai-live` beforehand.

**Testing**

`npm test` runs the automated tests (Node's built-in test runner, so there is nothing extra to install). Each test name starts with an ID (`AI-`, `GEM-`, `CLI-`, `CON-`, `SYNC-` ...) that the Testing Log refers to. Write a known bug as a `{ todo }` test: it shows without failing the run, and starts passing once the bug is fixed.

`npm run test:ai-live` signs in as a local test account (`ai-smoke@hiips360.test`, created on the first run) and checks real Gemini answers against the reference scenario. It waits 13 s between requests to stay under the free-tier limit; set `AI_SMOKE_DELAY_MS=0` to turn the wait off. Pass a folder to also send your own photos: `npm run test:ai-live -- path/to/photos`. Only run it against your own local API: its default password is in this repository.

**Trying it on a phone**

1. Put the phone and the laptop on the same Wi-Fi. Campus Wi-Fi usually stops devices from reaching each other; if the phone can't load the page, turn on the phone's hotspot and connect the laptop to it.
2. On Windows, set that network to **Private** (Settings > Network & internet > your connection > Network profile type). If Windows Firewall asks about Node.js, allow it on private networks.
3. Run `npm run dev:phone` and open the `Network:` address that Vite prints (for example `http://192.168.1.68:5173`) on the phone. Only port 5173 needs to be reachable; Vite passes `/api` on to the API.
4. Sign in and use the app. The camera works through the photo boxes on Home and Log hazard. Installing to the home screen needs HTTPS, so test that on a deployed build instead.

**Common problems**

| You see | Fix |
|---|---|
| `http proxy error ... ECONNREFUSED` in Vite, or a 502 | The API isn't running, or was still connecting (`npm run dev:api` also restarts right after `npm install`). Use `npm run dev:all` and wait for "MongoDB connected". |
| `Could not connect to MongoDB` | MongoDB isn't running. See step 1. On Windows, check `Get-Service MongoDB`. |
| `Missing MONGODB_URI, SESSION_SECRET` | `.env` is missing or those lines are empty. See step 2. |
| Still signed in after stopping the API | Intended. The device remembers the last signed-in officer for when there's no signal. |
| `EADDRINUSE` on port 3001 or 5173 | An old server is still running, sometimes with no terminal open. On Windows, find it with `Get-NetTCPConnection -LocalPort 3001 -State Listen` and stop it with `Stop-Process -Id <OwningProcess>`. |
| Suggestions say the AI is busy or has reached today's limit | The Gemini allowance is used up (see **Gemini free tier**). The API terminal shows `Gemini quota:` with Gemini's `429 RESOURCE_EXHAUSTED`. |
| Every suggestion fails with another message | Look at the API terminal. It is usually the key, or a model name Google has retired. |
| The phone can't open the page | Check that both devices are on the same network, that the network is Private, and that you used `npm run dev:phone`. |

**Demo scenario:** create a job site, describe the work ("film shoot on a sound stage, crew rigging lights from a scaffold") and ask AI, accept the suggested sheets, open Planning to tick the checklist, open a hazard on Hazards and attach a photo, mark another one not applicable, log a hazard the sheet doesn't list, then download the findings PDF.

## Deploying

The prototype runs on Railway today. One Node service serves both the API and the built app, and it needs a hosted MongoDB and a Gemini key. Whoever takes the project over needs their own Railway (or Vercel) account, MongoDB and Gemini key: the ones the student team used belong to students and should be replaced at handoff, with a new `SESSION_SECRET` and a new Gemini key.

### Railway (current)

`railway.json` already holds the build and start settings: build with `npm run build`, run `node scripts/db-setup.mjs` before each deploy, start with `npm start`, and check `/api/health`.

1. **A database.** Either add a MongoDB service to the Railway project (**+ New > Database > MongoDB**) and use its connection URL, or create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas), add a database user, allow access from anywhere (`0.0.0.0/0`) under Network Access because Railway's outgoing address isn't fixed by default, and copy its `mongodb+srv://` URI with `/hiips360` as the database name.
2. **The service.** In Railway, **New project > Deploy from GitHub repo**, and pick this repository. Railway reads `railway.json` and the Node version from `package.json` (`engines`).
3. **Variables** (the service's **Variables** tab):

   | Variable | Value |
   |---|---|
   | `NODE_ENV` | `production` (required: without it the site has no front end and the cookie isn't Secure) |
   | `MONGODB_URI` | The URI from step 1 |
   | `SESSION_SECRET` | A new random 64-character hex string, never one used locally |
   | `GEMINI_API_KEY` | The production Gemini key (with billing on, if officers will use it) |
   | `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `GEMINI_SECOND_FALLBACK_MODEL` | Optional; the defaults are the tested models |

   Don't set `PORT`; Railway sets it.
4. **A web address.** **Settings > Networking > Generate Domain**, or add your own domain there. HTTPS is automatic, and the app needs it to install to a phone's home screen.
5. **Check it.** Open `https://<your-domain>/api/health`. It should answer `{"ok":true,"db":"connected"}`. Then create an account and walk through the demo scenario.

Every push to the connected branch deploys again. The API applies the database validators and indexes on every start, so there is nothing to run by hand after a deploy.

### Vercel (possible later, not set up yet)

The client may host it on Vercel later. This hasn't been tried, and it needs a code change first: Vercel runs an Express app as a single function, and this repository is laid out for a long-running server. What the move involves:

1. **A hosted MongoDB.** Vercel doesn't run MongoDB itself, so use [MongoDB Atlas](https://www.mongodb.com/atlas) (Vercel's Marketplace has an Atlas integration that sets `MONGODB_URI` for you). Atlas must accept connections from anywhere (`0.0.0.0/0`), because Vercel's functions have no fixed addresses.
2. **An entry file.** Vercel looks for an Express app in a file named `app`, `index` or `server` at the project root or in `src/`, exported as the module's default ([Express on Vercel](https://vercel.com/docs/frameworks/backend/express)). This repository has none: `server/index.js` connects to MongoDB and calls `listen()`. Add a root `server.js` that connects to MongoDB once (reusing the connection between requests) and does `export default createApp()`.
3. **The front end.** The Vite build in `dist/` has to be served by Vercel itself, with every unknown path falling back to `index.html` for the app's routes. `express.static` in `server/app.js` only runs on a normal server. Check Vercel's Express guide for how it serves static files, and confirm `/api/*` still reaches Express.
4. **Variables.** The same as Railway (step 3 above), in **Project > Settings > Environment Variables**.
5. **Limits to plan for:**
   - Vercel functions accept at most 4.5 MB per request on every plan ([Functions limits](https://vercel.com/docs/functions/limitations)). The app shrinks each photo to about 0.3 to 1 MB, but adding several photos at once sends them in one request, so either upload them one at a time or send photos straight to storage (Vercel Blob) instead of MongoDB.
   - The sign-in and AI rate limits are counted in memory, so on Vercel each running copy of the function counts separately and a restart resets them. A shared store would be needed for them to hold.
6. **Test it on a preview deployment** before pointing the real address at it.

### A password before the landing page

The client asked for a single shared password in front of the whole site, so bots can't reach the sign-up page.

- **On Vercel:** Vercel has this built in as [Password Protection](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/password-protection) under Deployment Protection. It is a paid feature (not on the free Hobby plan; an add-on per project on Pro), and nothing in the code changes.
- **On Railway:** Railway has no password option, so it would have to be added to the app: for example a `SITE_PASSWORD` variable and a small page that asks for it before anything else loads. This isn't built yet.

Either way, the app's own accounts stay as they are behind it.

## Working on the code

- **Adding a page.** Create `src/pages/<Name>/<Name>.jsx` and `<Name>.css`, with `<div className="page-content">` as the root element. Don't use `content`: `wsbc.css` defines it for its tab panels (absolutely positioned, grey border), and it covers the header. Check a new generic class name against `wsbc.css` before using it. Add its route in `src/App.jsx`, and if it belongs in the bottom nav, an entry and an inline SVG icon in `NAV_ITEMS` in `src/components/Layout.jsx`. A fixed path under `/hazard/` must be declared before `/hazard/:id`.
- **Talking to the API.** `src/data/api.js` makes every call to `/api/jobs`, `/api/photos` and `/api/me`, and `src/auth/authService.js` every call to `/api/auth`. Only `suggestHazard.js` and `matchSheets.js` call `/api/ai`. Each throws an Error whose message is safe to show.
- **Saving.** Changes go through `JobContext` and `HazardContext`. Comments and visit notes wait for typing to pause, share one save queue, and are retried every 15 seconds if a save fails.
- **New server route.** Put `requireAuth` on it and include `req.userId` in every query, so an officer only ever reaches their own data. Size limits live in `server/db/limits.js`.
- **Gemini.** Only `server/services/gemini.js` talks to Gemini. Never import the key into `src/`: anything there ends up in the public bundle.
- **Shared files.** `src/auth/validation.js`, `src/data/sheets/catalog.js`, `src/data/sheets/sheetContent.js` and `src/data/syncSheetHazards.js` are also imported by the server and the tests, so keep them plain JavaScript with no browser or Vite features.
- **Match filename casing in imports.** Windows ignores case but Linux doesn't, so `./HomePage.css` breaks the Linux build (and CI) if the file is `Homepage.css`.
- **Check `package.json` before assuming a dependency exists.** `wsbc.css` comes from WorkSafeBC's CDN in `index.html`; Bootstrap and Dexie aren't installed.
- **Adding a protocol sheet.** Run `python scripts/extract_sheets.py sheets-pdf src/data/sheets` (needs `pdfplumber`; it copies the PDF's text word for word) and put the PDF in `public/sheets-pdf/<sheetId>.pdf`. Every JSON file in `src/data/sheets/` is loaded automatically, by the app, the Gemini sheet matching and the tests. Check its hazards and checklist on Home, Planning and Hazards: `sheetContent.js` reads the two sheet layouts we have, and a new layout may need a change there.
- **Keep the product rules in the code.** Anything the tool proposes must be editable or dismissible, sheets must be reachable without a photo, and the UI should say it is a prototype. The Hazards page records findings only and never says whether a site complies.

## Content and ownership

- **The content is WorkSafeBC's.** The tool makes existing HIIPS guidance reachable. It does not create or change it.
- **Named owner needed.** A production tool needs a business area to run it and a named owner and maintenance cycle for the content. Guidance that is quietly out of date is worse than a PDF an officer knows to check.
- **Every sheet names the type of work it covers.** That is what makes matching a photo or description to a sheet possible.

| Role | Name |
|---|---|
| Sponsor | _To be confirmed_ |
| Content owner | _To be confirmed_ |
| Prototype author | Stewart Rogers, Innovation Strategy & Services |
| Build team | BCIT Industry Sponsored Student Projects, Fall 2026 |

## How we will know whether it worked

The prototype exists to prompt a decision, not to prove a hypothesis. Three signals tell us whether it worked:

1. **The idea reads without explanation.** Officers follow the flow from work type to hazard to control to regulation unprompted. A demonstration that needs a preamble has not shown anything.
2. **Officers recognize their own work in it.** The signal that the concept holds is an officer naming a hazard they would otherwise have passed. Hearing that it only shows them what they already know is the signal that it does not.
3. **It attracts an owner.** A named sponsor or a request for a pilot is the outcome worth having. Polite enthusiasm that goes nowhere is a finding too.

## Risks and known limitations

- **The uncertainty is need, not technology.** Officers manage without this tool today, and the sheets are already written. Whether they would use a digitized version often enough, in the moments that matter, cannot be answered from a desk.
- **Most likely failure:** a tool that is useful in principle and unused in practice. If officers say it only shows them what they know, the value is in the content, not the delivery. That is worth learning early and cheaply.
- **Photo identification is uncertain.** Guidance must remain reachable without it.
- **A prototype can be mistaken for a product.** Say so plainly at every showing.
- **A convincing wrong answer would undermine the idea** in front of the people whose support it needs, so officers should review the demonstration scenarios first.
- **Cost beyond the prototype is unknown.** The student program carries the build. What a production version would cost and save cannot be estimated until the shape of the thing is known.
- **Ownership is unresolved.** See [Content and ownership](#content-and-ownership).

## Project documents

| Document | Purpose |
|---|---|
| Innovation Intake: HIIPS360 (September 2026) | The problem, value proposition, validation plan, risks and recommendation |
| Product Requirements Document (V11) | Personas, the site-visit scenario, MVP scope, and user stories by capability |
| Sample inspection report: fall protection stop-work | Example of the reasoning (observation, control, requirement) HIIPS360 supports |
| WorkSafeBC UX/UI Design System | Components, tokens and usage rules the UI must follow |
| [AUTH_BACKEND_SETUP.md](AUTH_BACKEND_SETUP.md) | Installing MongoDB, creating `.env`, running the API, and troubleshooting |

---

*HIIPS360 supports the officer's judgement and does not replace it. Prevention officers enforce the Workers Compensation Act and the OHS Regulation. This tool helps them connect what they see to the rule that governs it, and does not make that connection for them.*
