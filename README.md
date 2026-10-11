# IVXray - Pokémon IV & Stat Tools

Static website (Astro 5, zero client framework) with four Pokémon tools for Gen 3–9:
**IV Calculator**, **Stat Calculator**, **IV Judge phrase interpreter**, and **Hidden Power calculator**,
plus a searchable base-stat browser for all 1,025 base-form species.

- **Domain:** `https://ivforge.top` · **Output:** fully static `dist/` for Cloudflare Pages
- **Data:** base stats baked at build time from [PokéAPI](https://pokeapi.co) (snapshot `2026-10-11`, 1,025 species)
- **Everything runs client-side.** No tracking scripts, no server, nothing a visitor types ever leaves the browser.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:4321
npm test           # vitest - 59 unit tests (stat formula, IV solver, judge tiers, hidden power, dex data)
npm run build      # fetches PokéAPI data if missing, then builds dist/ (12 pages + sitemap)
npm run preview    # serve the built dist/ locally
```

Useful extras:

```bash
npm run fetch:pokedex   # force re-fetch species data (writes src/data + public/data pokedex.json)
powershell -File scripts/make-icons.ps1   # regenerate og.png + PWA/apple icons (System.Drawing)
```

## Deploy to Cloudflare Pages

The repo already contains `wrangler.toml` (`pages_build_output_dir = "dist"`) and `public/_headers`.

**Dashboard (recommended):**

1. Push this folder to a Git repository (GitHub/GitLab).
2. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick the repo.
3. Build settings:
 - **Framework preset:** Astro (or none - the values below are what matter)
 - **Build command:** `npm run build`
 - **Build output directory:** `dist`
4. Deploy. Then **Custom domains → Set up a custom domain → `ivforge.top`** (the zone must be on this Cloudflare account; Pages handles the certificate).

**CLI alternative:** `npx wrangler pages deploy dist --project-name ivxray`, then attach the domain in the dashboard.

> `npm run build` calls `scripts/fetch-pokedex.mjs --if-missing` first. The JSON is committed, so builds work even if PokéAPI is down; delete `src/data/pokedex.json` to force a refresh (and update `snapshot` in `scripts/fetch-pokedex.mjs` + `src/lib/seo.ts` `LAST_UPDATED`).

## Project structure

```
scripts/fetch-pokedex.mjs      GraphQL+REST fetch, validation, bakes pokedex.json (src/data + public/data)
src/lib/core/                  pure game math - unit-tested, no DOM
  stats.ts                     Gen 3–9 stat formula (HP + other, nature multiplier)
  solve.ts                     IV solving: brute force 0–31, judge-tier ∩, characteristic constraint,
                               spread counting, conflict attribution
  judge.ts                     phrase tables: Gen 7+/Let's Go/Gen 6/Gen 4–5/Gen 3 + total potential
  characteristics.ts           30 characteristics → stat + IV mod 5
  hidden-power.ts              type/power from IV bits (Gen 3–5 power, Gen 6–7 fixed 60), breeding spreads
  natures.ts dex.ts types.ts type-colors.ts
src/lib/client/                vanilla TS per-tool controllers (bundled by Astro <script>)
src/lib/seo.ts                 site constants, JSON-LD builders (WebApplication, BreadcrumbList, @graph)
src/lib/icons.ts               inline SVG icon set (Lucide geometry) - shared by Icon.astro and client chips
src/components/                BaseLayout, Header/Footer, Icon, Logo, ToolHead, Breadcrumbs, TrustBlock, Faq…
src/pages/                     index, 4 tools, pokedex, about, privacy, terms, changelog, sitemap, 404
src/styles/global.css          design system (scanner-light theme, readout panels, iv-bars, breakpoints)
public/_headers                security headers + immutable asset caching (Cloudflare Pages)
```

## Math notes (all verified against Bulbapedia)

- `HP = ⌊(2·Base + IV + ⌊EV/4⌋)·L/100⌋ + L + 10`, other stats `⌊(⌊(2·Base + IV + ⌊EV/4⌋)·L/100⌋ + 5)·N⌋` with N = 1.1/0.9/1.
- IVs are solved by substituting 0–31 per stat and keeping every match - ambiguous results are **kept and counted**, never silently discarded.
- Characteristic constraint: named stat has `IV ≡ k (mod 5)` **and** `IV ≥ every other stat` (ties allowed - the in-game tie-break uses the encryption constant, which is unobservable, so both orders stay possible).
- Shedinja: HP is always 1 and is excluded from solving.
- Hidden Power: `type = ⌊Σ(bit·weight)·15/63⌋` with weights HP1/Atk2/Def4/Spe8/SpA16/SpD32; power `⌊Σ(2nd bit·weight)·40/63⌋+30` in Gen 3–5, fixed 60 in Gen 6–7.

## Analytics

No third-party tracker is loaded. Tools dispatch DOM CustomEvents (`ivxray:tool_start`, `tool_complete`,
`example_load`, `result_copy`, `tool_error`) and mirror them into `window.dataLayer` - attach any
privacy-friendly collector (e.g. self-hosted Plausible/GoatCounter) later without touching tool code.

## Data & credits

- Base stats: [PokéAPI](https://pokeapi.co) (open data), snapshot **2026-10-11**, 1,025 base forms (national dex ids ≤ 1025).
- Formula and phrase references: Bulbapedia (stat formula, characteristics, judge phrases, Hidden Power).
- Pokémon and Pokémon character names are trademarks of Nintendo, Game Freak, and The Pokémon Company.
  This fan tool is **not affiliated** with them - see the footer and `/about/` for the full disclaimer.

---

## PROJECT STATE

### Keyword → URL map (no cannibalization)

| Target query | URL | Title (≤60 chars, keyword-first) |
| --- | --- | --- |
| pokemon iv calculator | `/iv-calculator/` | Pokémon IV Calculator - Check Exact IVs, Gen 3–9 \| IVXray |
| pokemon stat calculator | `/stat-calculator/` | Pokémon Stat Calculator - Stats at Any Level \| IVXray |
| iv judge / iv checker phrases | `/iv-judge/` | Pokémon IV Judge Phrases to IV Ranges (Gen 3–9) \| IVXray |
| hidden power calculator | `/hidden-power/` | Hidden Power Calculator - Type from IVs (Gen 3–7) \| IVXray |
| pokemon base stats list | `/pokedex/` | Pokémon Base Stats List - All 1,025 Species \| IVXray |
| brand + head terms | `/` | IVXray - Pokémon IV & Stat Tools for Gen 3–9 (home targets none of the above) |

### Assumption register

| Assumption | Where | Change it |
| --- | --- | --- |
| `[ASSUMPTION]` contact `hello@ivforge.top` is a placeholder mailbox | `src/lib/seo.ts` (`CONTACT_EMAIL`), privacy/terms pages | Point at a mailbox you actually read before launch |
| PokéAPI stays open/no-key | `scripts/fetch-pokedex.mjs` | Data is committed; builds don't need the API |
| Gen 10+ doesn't change the formula before the next snapshot | solver scope Gen 3–9 | Revisit when a new gen ships |

### Pre-launch checklist

- [x] 59/59 unit tests green; `npx tsc --noEmit` clean
- [x] Browser-verified: all 4 tools end-to-end (examples, judge narrowing, conflicts, EV warnings, HP gens, dex search/sort), 404, canonicals, JSON-LD, breadcrumbs
- [x] Titles ≤60 chars, meta descriptions ≤160, one h1/page, FAQPage schema intentionally omitted (rich result retired)
- [x] `robots.txt` + `sitemap-index.xml` (404 excluded), real 404 page, `_headers` security + caching
- [x] OG image 1200×630, icons 512/192/180, manifest
- [ ] Set real contact mailbox (assumption above)
- [ ] Cloudflare Pages project + custom domain `ivforge.top`
- [ ] Optional: attach privacy-friendly analytics to `window.dataLayer` events
- [ ] After deploy: Google Search Console verify + submit `https://ivforge.top/sitemap-index.xml`
