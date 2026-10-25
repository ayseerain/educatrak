import { defaultMockToday, seedMockDatabase, type SeededMockDatabase } from "./seed";

const STORAGE_KEY = "educatrak.mock-db.v1";

let today = defaultMockToday();
let state = seedMockDatabase(today);

function queryValue(name: string): string | null {
  return typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get(name);
}

function persistenceEnabled(): boolean {
  return queryValue("mockPersist") === "on";
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function persist(): void {
  if (persistenceEnabled() && canUseStorage()) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function restore(): void {
  if (!persistenceEnabled() || !canUseStorage()) return;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const candidate = JSON.parse(saved) as Partial<SeededMockDatabase>;
    if (candidate.meta?.notice && Array.isArray(candidate.students) && Array.isArray(candidate.payments)) {
      state = { ...seedMockDatabase(today), ...candidate } as SeededMockDatabase;
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

restore();

export function getMockState(): SeededMockDatabase {
  return state;
}

export function getMockToday(): string {
  return today;
}

export function replaceMockState(next: SeededMockDatabase): void {
  state = next;
  persist();
}

export function updateMockState(update: (current: SeededMockDatabase) => void): void {
  update(state);
  persist();
}

export function setMockToday(nextToday: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextToday)) throw new Error("Mock today must use YYYY-MM-DD.");
  today = nextToday;
  state = seedMockDatabase(today);
  persist();
}

export function resetMockStore(): void {
  today = defaultMockToday();
  state = seedMockDatabase(today);
  if (canUseStorage()) window.localStorage.removeItem(STORAGE_KEY);
}

export function mockSnapshot(): SeededMockDatabase {
  return JSON.parse(JSON.stringify(state)) as SeededMockDatabase;
}

export function loadMockSnapshot(next: SeededMockDatabase): void {
  replaceMockState(next);
}

if (typeof window !== "undefined") {
  const params = new URLSearchParams(window.location.search);
  if (params.get("mockReset") === "1") resetMockStore();
  Object.assign(window, {
    reset: resetMockStore,
    setToday: setMockToday,
    snapshot: mockSnapshot,
    load: loadMockSnapshot,
  });
}
