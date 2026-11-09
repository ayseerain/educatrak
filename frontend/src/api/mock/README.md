# Development mock database

`mock-db.json` is the only hand-edited fixture. It contains synthetic raw facts only, including fictional personal details for the four sample students. `seed.ts` resolves relative Manila dates, `store.ts` owns mutable in-memory state and Local Storage persistence, `selectors.ts` derives balances/statuses and exposes student personal fields, and `api.ts` adds development latency and failure switches. Student DOB, gender, and residential address are stored on the existing student record; age is calculated for the current Manila date and is never persisted. When an older saved sample record has missing personal fields, restore fills only those missing values from its matching synthetic seed record; saved personal values, student records, and unrelated data remain intact. Newly created records are not changed.

`MockDatabaseProvider` wraps the app in development mode, so every screen waits for the shared mock database and receives its loading/error behavior. Pages must use feature APIs, selectors, or hooks; they must not import `mock-db.json` or the store.

Development URL switches:

- `?mock=slow` delays reads by about 2.5 seconds.
- `?mock=error` fails mock API reads.
- `?mock=empty` empties every supported mock collection.
- `?mockEmpty=students,payments` empties named collections.
- `?mockLatency=1200` sets read latency in milliseconds.
- MockDB writes persist in browser Local Storage under `educatrak.mock-db.v1`.
- `?mockReset=1` resets the saved state.

Console helpers: `reset()`, `setToday('YYYY-MM-DD')`, `snapshot()`, and `load(state)`.

Development accounts are listed in `mock-db.json` under `frontendOnly.devCredentials`; every password begins with `demo-` and is never available to production builds.
