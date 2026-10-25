# Development mock database

`mock-db.json` is the only hand-edited fixture. It contains synthetic raw facts only. `seed.ts` resolves relative Manila dates, `store.ts` owns mutable in-memory state, `selectors.ts` derives balances and statuses, and `api.ts` adds development latency and failure switches.

`MockDatabaseProvider` wraps the app in development mode, so every screen waits for the shared mock database and receives its loading/error behavior. Pages must use feature APIs, selectors, or hooks; they must not import `mock-db.json` or the store.

Development URL switches:

- `?mock=slow` delays reads by about 2.5 seconds.
- `?mock=error` fails mock API reads.
- `?mock=empty` empties every supported mock collection.
- `?mockEmpty=students,payments` empties named collections.
- `?mockLatency=1200` sets read latency in milliseconds.
- `?mockPersist=on` retains in-memory writes in local storage.
- `?mockReset=1` resets the saved state.

Console helpers: `reset()`, `setToday('YYYY-MM-DD')`, `snapshot()`, and `load(state)`.

Development accounts are listed in `mock-db.json` under `frontendOnly.devCredentials`; every password begins with `demo-` and is never available to production builds.
