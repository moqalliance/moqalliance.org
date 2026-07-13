# moqalliance.org

Website for the [MoQ Alliance](https://moqalliance.org): an industry
organization dedicated to making Media over QUIC (MoQ) a successful, open,
and interoperable protocol.

Built with [Astro](https://astro.build), deployed on Cloudflare Workers.
Auto-deploys from `main` via Cloudflare Builds.

## Layout

- `src/pages/` — page routes (`/`, `/get-started`, `/api/subscribe`)
- `src/components/` — shared Astro components
- `src/data/` — content data (members, talks, faqs, use cases, etc.)
- `src/styles/global.css` — shared CSS
- `public/logos/` — member logos
- `public/thumbnails/` — talk thumbnails
- `migrations/` — D1 schema for the email signup table
- `workers/email/` — separate Worker that forwards inbound email to Discord

## Development

```sh
npm install
npm run dev        # local dev server
npm run build      # production build
npm run preview    # build + wrangler dev
```

## Deployment

Main site auto-deploys from `main`. Manual deploys:

```sh
npm run deploy         # main site
npm run deploy:email   # email-to-Discord worker
```
