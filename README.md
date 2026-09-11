# Movie Discovery

A full-stack movie discovery application. Browse by genre, search, sort, page through large
result sets, and keep a wishlist that survives closing the app.

| | |
|---|---|
| **Live app** | https://movie-discovery-tau.vercel.app |
| **API** | https://movie-discovery-1uga.onrender.com/api/health |
| **Repository** | https://github.com/Sandeepkrish8/movie-discovery |

> The API runs on Render's free tier, which sleeps after 15 minutes of inactivity. The first
> request after a period of idleness can take up to a minute while the instance wakes.

---

## Contents

- [Stack](#stack)
- [Setup](#setup)
- [Approach](#approach)
- [Architecture](#architecture)
- [API reference](#api-reference)
- [Technical decisions](#technical-decisions)
- [Assumptions](#assumptions)
- [Known limitations](#known-limitations)
- [AI tools used](#ai-tools-used)
- [What I would improve with more time](#what-i-would-improve-with-more-time)

---

## Stack

**Frontend** — React 19, TypeScript, Vite, Tailwind CSS v4, React Router, TanStack Query
**Backend** — Node.js, Express, TypeScript, `lru-cache`, axios, Zod
**Database** — MongoDB Atlas via Mongoose
**Hosting** — Vercel (client), Render (API), MongoDB Atlas (data)
**External data** — [TMDB](https://www.themoviedb.org/) API v3

---

## Setup

### Prerequisites

- Node.js 20 or later
- A free TMDB API key — themoviedb.org → Settings → API → request a **v3 auth** key
- A MongoDB connection string (Atlas free tier is fine)

### 1. Clone and install

```bash
git clone https://github.com/Sandeepkrish8/movie-discovery.git
cd movie-discovery

cd server && npm install
cd ../client && npm install
```

### 2. Configure the server

```bash
cd server
cp .env.example .env
```

Fill in `.env`:

```ini
PORT=4000
TMDB_API_KEY=your_tmdb_v3_key
TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/moviediscovery
CLIENT_ORIGIN=http://localhost:5173

# Optional. Only needed if your network's DNS resolver refuses SRV lookups,
# which makes mongodb+srv:// fail with "querySrv ECONNREFUSED".
DNS_SERVERS=
```

The server validates its configuration with Zod at boot and exits with a readable message if
anything required is missing, rather than failing later with an opaque 401 from upstream.

### 3. Configure the client

```bash
cd client
cp .env.example .env
```

Leave `VITE_API_BASE_URL` **empty** for local development — Vite proxies `/api` to
`localhost:4000`, which avoids CORS entirely in dev. In production it points at the deployed API.

### 4. Run

Two terminals:

```bash
cd server && npm run dev     # http://localhost:4000
cd client && npm run dev     # http://localhost:5173
```

Verify the API independently at `http://localhost:4000/api/health` — it reports uptime,
database connectivity, and cache size.

### Production builds

```bash
cd server && npm run build && npm start
cd client && npm run build
```

---

## Approach

I treated the brief's sections 3 and 5 as the specification rather than as background. Each
scenario listed there maps to a specific mechanism in the code:

| Requirement from the brief | Where it lives |
|---|---|
| "the same information is requested repeatedly" | `server/src/lib/cache.ts` — tiered TTL cache |
| "multiple searches or changes filters quickly" | `useDebounce` + TanStack Query request cancellation |
| "the external service is slow or temporarily unavailable" | `server/src/lib/tmdb.ts` — timeout, retry with backoff, stale-cache fallback |
| "returns incomplete or unexpected information" | `server/src/lib/normalize.ts` — normalization with explicit nulls |
| "limitations on how frequently it can be accessed" | 429 handling that honours `Retry-After` |
| "continue exploring when there are many results" | `useInfiniteQuery` + IntersectionObserver |
| "without losing their context" | URL as the single source of truth for all query state |

The frontend never talks to TMDB. It talks to an API that exposes *this application's* data
model, which is what makes the upstream provider replaceable and keeps the API key server-side.

---

## Architecture

```
Browser
   │  GET /api/movies?q=&genre=&sort=&page=
   ▼
Express API  ──►  LRU cache  ──►  (miss)  ──►  axios client  ──►  TMDB
   │                 ▲                            │
   │                 └──── stale copy on failure ──┘
   │
   │  wishlist reads/writes
   ▼
MongoDB Atlas
```

```
server/src
├── config/env.ts          Zod-validated configuration, fails fast at boot
├── lib/
│   ├── tmdb.ts            the only outbound client: auth, timeout, retry, backoff
│   ├── cache.ts           tiered TTL cache, in-flight dedup, stale-on-error
│   └── normalize.ts       TMDB shapes → our own DTOs
├── models/WishlistItem.ts Mongoose schema, compound unique index
├── routes/                movies, genres, wishlist
├── middleware/            single error handler → consistent { error: { code, message } }
└── db/connect.ts          non-fatal Mongo connection

client/src
├── lib/api.ts             axios instance, device-id interceptor, error normalizer
├── lib/deviceId.ts        anonymous identity in localStorage
├── hooks/                 useMovies, useGenres, useWishlist, useDebounce
├── components/            MovieCard, MovieGrid, FilterBar, SkeletonCard, StateMessage
└── pages/                 BrowsePage, MovieDetailPage, WishlistPage
```

---

## API reference

All responses use this application's own shape, never TMDB's.

| Method | Endpoint | Notes |
|---|---|---|
| `GET` | `/api/health` | Uptime, database state, cache size |
| `GET` | `/api/genres` | Cached 7 days |
| `GET` | `/api/movies` | `q`, `genre`, `sort`, `page`. Cached 5 minutes |
| `GET` | `/api/movies/:id` | Cached 24 hours |
| `GET` | `/api/wishlist` | Requires `x-device-id` header |
| `POST` | `/api/wishlist` | Idempotent upsert |
| `DELETE` | `/api/wishlist/:movieId` | Idempotent |

Errors are always `{ "error": { "code": "...", "message": "..." } }`, so the client can render a
retry state without inspecting HTTP status codes.

**List response:**

```json
{
  "items": [
    { "id": 155, "title": "The Dark Knight", "posterUrl": "https://...",
      "year": 2008, "rating": 8.5, "voteCount": 33481, "overview": "..." }
  ],
  "page": 1,
  "totalPages": 500,
  "totalResults": 10000,
  "hasMore": true,
  "meta": { "mode": "discover", "sortScope": "global" }
}
```

---

## Technical decisions

### TMDB over OMDb

The brief requires genre-based browsing and configurable sort ordering. TMDB's
`/discover/movie` endpoint supports `with_genres`, `sort_by` and `page` natively. OMDb offers
title search only, which would have meant faking two required features by sorting client-side
over an incomplete result set.

### A normalization layer, not pass-through

TMDB returns `poster_path` as a fragment (`/abc.jpg`), `release_date` as an empty string for
unreleased films, and `vote_average: 0` when nothing has been rated. Passing that through would
push provider quirks into every component. Instead the server emits a stable DTO:

- image paths become absolute URLs — if the CDN or size changes, one function changes
- an unparseable date becomes `year: null`, so the UI shows "Year unknown" rather than `NaN`
- an unrated film gets `rating: null`, so the UI shows "NR" rather than a misleading `0.0`
- a missing title falls back through `title → original_title → "Untitled"`

### Three cache tiers, not one

Genres have effectively never changed; movie details change rarely; search rankings shift daily.
A single TTL would either waste upstream calls or serve stale search results, so TTLs are 7 days,
24 hours and 5 minutes respectively.

### In-flight request de-duplication

A plain cache does not help with concurrency: ten requests for "batman" arriving in the same
second all miss, because none has finished writing yet. An `inFlight` map keyed identically to
the cache means the first request is shared and the other nine await the same promise.

### Stale-while-error

When an upstream call fails and an expired copy exists, the expired copy is served rather than an
error. A slightly out-of-date list is a better outcome for the user than an empty screen. The
happy path explicitly passes `allowStale: false`, so stale data is only ever a failure fallback.

### Retry policy that discriminates

Retries apply to timeouts, dropped connections, 5xx and 429 — all transient. They never apply to
401 or 404, which fail identically every time; retrying those only triples the latency of a
guaranteed error. On a 429, TMDB's `Retry-After` header is honoured instead of guessing.

### URL as the single source of truth

Search text, genre, sort and page live in the query string, not in React state. This makes the
browser back button work, makes any filtered view shareable as a link, and lets the detail page
return the user to exactly the results they left. Keystrokes use `replace` rather than `push`, so
one search doesn't create twelve history entries.

### Device-scoped wishlist without authentication

The brief requires persistence across sessions but never asks for accounts. A UUID generated once
in the browser and sent as `x-device-id` gives per-device persistence with no passwords, no
sessions and no personal data stored. Swapping it for a real user id later would not change the
schema.

### Wishlist rows store a snapshot

Storing only `{ deviceId, movieId }` would mean one TMDB call per saved movie to render the
wishlist — 30 saved films would be 30 upstream requests per visit. Storing the five fields the
wishlist card actually displays makes that page a single database read with zero upstream calls.
A compound unique index on `(deviceId, movieId)` enforces no duplicates at the database level, so
a double-clicked save button cannot create two rows regardless of what the handler does.

### Sorting is honest about what it can do

TMDB's `/search/movie` endpoint ignores `sort_by` entirely — only `/discover` can sort globally.
Rather than pretend the control worked, the response reports `meta.sortScope`: `"global"` in
discover mode, `"page"` while searching, where results are sorted in memory. The UI shows
"Sorting applies within search results" in that case.

### A vote floor when sorting by rating

Sorting by `vote_average` without a vote threshold surfaces obscure films with a single 10/10
vote. `vote_count.gte=200` is applied when the sort is rating-based so that "highest rated"
means something.

### CORS as an allowlist with narrow wildcards

`CLIENT_ORIGIN` is a comma-separated list, because the same API serves the local dev server and
the deployed frontend. Entries may contain `*`, which expands to `[a-z0-9-]+` — one hostname
label, not "any characters" — so Vercel's per-deployment preview URLs are admitted without a
loose pattern that `https://evil.com/?x=-my-team.vercel.app` could satisfy.

### Two environment-specific fixes worth documenting

Both were diagnosed during development and both are in the code with comments:

- **`dns.setDefaultResultOrder('ipv4first')`** — Node 17+ tries IPv6 before IPv4. On networks
  with non-routing IPv6, every outbound request stalls on a dead AAAA record until it times out,
  while the same URL loads instantly in a browser.
- **`DNS_SERVERS`** — some resolvers answer A records but refuse SRV queries, which breaks
  `mongodb+srv://` with `querySrv ECONNREFUSED`. Configurable rather than hardcoded, and left
  empty in production where the platform resolver works correctly.

---

## Assumptions

- **TMDB personal tier.** Integrated under a personal, non-commercial API key, as permitted for a
  learning and assessment project. A commercial production deployment would require separate
  approval from TMDB.
- **No authentication in scope.** The brief asks for persistence, not accounts, so the wishlist is
  device-scoped rather than user-scoped.
- **English content.** All upstream requests use `language=en-US`. Localisation was out of scope.
- **Adult content excluded.** `include_adult=false` on every discovery request.
- **Single API instance.** The cache is in-process, which is correct for one instance and would
  need revisiting behind a load balancer (see limitations).

---

## Known limitations

- **The wishlist does not follow the user across devices or browsers.** It is keyed to a
  localStorage UUID; clearing site data starts a fresh list. This is the cost of not building
  authentication.
- **Wishlist snapshots can go stale.** If a film's title or poster changes upstream, the saved row
  keeps the values captured at save time until it is re-saved. Acceptable for a wishlist card;
  it would not be acceptable for anything transactional.
- **Sorting is page-scoped during search**, because TMDB's search endpoint cannot sort. Surfaced
  in the UI rather than hidden.
- **The cache is in-memory and per-instance.** It is lost on restart and would not be shared
  across horizontally scaled instances. Redis is the correct answer at that point.
- **MongoDB network access is `0.0.0.0/0`.** Render's free tier uses rotating outbound IPs, so an
  IP allowlist cannot work. The database is still protected by credentials, but a paid tier with
  static egress IPs would let this be locked down properly.
- **Render free tier cold starts.** Up to a minute after 15 minutes of inactivity.
- **TMDB caps pagination at 500 pages**, so very broad result sets are not fully reachable.
  The API clamps `totalPages` accordingly rather than advertising pages that would 422.
- **No automated tests.** The most significant gap; see below.

---

## AI tools used

AI assistance (Claude) was used substantially throughout this project, in line with the brief's
allowance for it:

- exploring the TMDB API surface and deciding which endpoints could satisfy the requirements
- scaffolding both projects and generating boilerplate and repetitive UI
- writing much of the implementation, including the cache, normalizer, retry and CORS layers
- diagnosing the two environment-specific failures described above — the IPv6 resolution stall
  and the SRV lookup refusal — neither of which was obvious from the error messages alone
- reviewing code for edge cases that had been missed

The rationale behind each significant decision is documented in inline comments next to the code
it explains, and this README reflects those decisions rather than restating what the code does.

---

## What I would improve with more time

1. **Tests, first priority.** Vitest unit tests for the normalizer (empty dates, missing posters,
   zero-vote ratings, null entries in `results`) and for the cache (TTL expiry, in-flight
   de-duplication, stale-on-error). A Playwright test for the browse → detail → back flow, since
   URL state restoration is easy to break silently.
2. **Redis for the cache**, so it survives restarts and can be shared across instances.
3. **Accounts**, so the wishlist follows the user rather than the browser. The schema already
   supports it — `deviceId` becomes `userId`.
4. **Rate limiting on our own API.** Upstream limits are handled; nothing currently stops a client
   from hammering this service.
5. **A virtualized grid.** Beyond a few hundred cards the DOM node count starts to matter more
   than the network does.
6. **Blur-up image placeholders** using TMDB's smallest size, so posters resolve rather than pop.
7. **Structured logging with request IDs**, so a single user's failing request can be traced
   through cache, retry and upstream layers.
8. **A keep-warm ping** on `/api/health` to mask Render's cold starts.
