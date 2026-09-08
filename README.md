# Daily Number

A mobile-first daily puzzle prototype built with Next.js, React, TypeScript, and plain CSS. One shared number from 1–50, five higher/lower guesses, and a midnight America/New_York reset (including daylight saving time).

## Run locally

Node.js 20.9 or newer is required. From this directory:

```sh
npm install
npm run dev
```

Open the local address printed by Next.js, normally http://localhost:3000.

## Checks

```sh
npm run typecheck
npm test
npm run build
```

These checks have been supplied but not run. Dependency installation and terminal commands are left to the project owner.

## Included

- A help dialog, shown on the first visit and available through the question-mark button.
- Attempts saved after each successful guess, with resume until the next daily reset.
- Games played, wins, and a participation streak. One guess counts as playing; a missed Eastern calendar day breaks the streak. Yesterday's streak remains visible until today ends or is played.
- Answer reveal after a win or five guesses, and a countdown to the next puzzle.
- Spoiler-free emoji/text clipboard sharing, the native share sheet when available, and a manual copy fallback.
- Server-generated daily puzzle identity and guess feedback. No answers shipped in the frontend bundle.
- No accounts, database, archive interface, analytics, or social SDKs.

## Before deploying

Set `PUZZLE_SECRET` to a long random value in your hosting provider's environment settings. It must be stable and identical across all server instances. Development uses a fixed fallback; production refuses to evaluate guesses without a secret. Changing the secret changes the answers, including today's. Use a Node-compatible Next.js host; this project uses server endpoints and is not a static export. Clipboard and native sharing work best over HTTPS (localhost is suitable for development).

## Deliberate MVP limits

Progress is device/browser-local and can disappear if browser storage is cleared. The stateless endpoint validates the submitted guess sequence but does not enforce five attempts against someone deliberately forging requests. Server-enforced sessions, abuse protection, accounts, and synchronized history can be added when needed. Concurrent edits in multiple tabs are best-effort; there is no cross-tab transaction or server session yet. The API needs an internet connection to check a guess.

## Structure

- `lib/game.ts`: shared rules, dates, statistics, sharing, and saved-data validation.
- `lib/puzzle-server.ts`: private answer generation and server clock.
- `app/api/`: daily puzzle and guess endpoints.
- `app/page.tsx`: game interface and browser persistence.
- `tests/game.test.ts`: rollover, daylight saving, participation, sharing, storage, and endpoint tests.

The temporary number game can be replaced independently of the persistence, statistics, and sharing concepts.
