# MockDB LRN identity transition

- **Timestamp:** Wednesday, November 11, 2026 — 21:14:18 Asia/Manila
- **Agent:** Codex
- **Decision:** MockDB uses unique 12-digit text LRNs and synthetic fixture values. Student Number is removed from MockDB UI and data after legacy normalization. Live API/backend contracts remain unchanged.
- **Implementation:** Updated MockDB seed, type, validation, search, forms, profile/list display, billing/payment lookup, and receipts. Existing browser records are normalized and persisted while preserving internal IDs and billing/payment references. No values are inferred from legacy Student Numbers.
- **Skill change:** .agents/skills/educatrak-combobox-patterns/SKILL.md now says student lookup results show full unmasked LRN; previous rule showed the student number.
- **Validation:** Focused suites: 90 tests passed across four files; final MockDB migration suite: 22 tests passed. Production build passed. git diff --check passed. Browser visual review not run.
- **Open scope:** Import parsing, row review, and apply remain separately approved phases. Live API/backend LRN migration is not part of this frontend MockDB task.
