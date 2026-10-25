import { defaultMockToday, seedMockDatabase, type SeededMockDatabase } from "./seed";

const STORAGE_KEY = "educatrak.mock-db.v1";
const CHANGE_EVENT = "educatrak:mock-db-change";

let today = defaultMockToday();
let state = seedMockDatabase(today);

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function persist(): void {
  if (canUseStorage()) window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ today, state }));
}

function restore(): void {
  if (!canUseStorage()) return;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const savedState = JSON.parse(saved) as unknown;
    const envelope = typeof savedState === "object" && savedState !== null && "state" in savedState
      ? savedState as { today?: unknown; state?: unknown }
      : undefined;
    const candidate = (envelope?.state ?? savedState) as Partial<SeededMockDatabase>;
    if (typeof envelope?.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(envelope.today)) today = envelope.today;
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
  notify();
}

export function updateMockState(update: (current: SeededMockDatabase) => void): void {
  update(state);
  persist();
  notify();
}

export function setMockToday(nextToday: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextToday)) throw new Error("Mock today must use YYYY-MM-DD.");
  today = nextToday;
  state = seedMockDatabase(today);
  persist();
  notify();
}

export function resetMockStore(): void {
  today = defaultMockToday();
  state = seedMockDatabase(today);
  if (canUseStorage()) window.localStorage.removeItem(STORAGE_KEY);
  notify();
}

export function mockSnapshot(): SeededMockDatabase {
  return JSON.parse(JSON.stringify(state)) as SeededMockDatabase;
}

export function loadMockSnapshot(next: SeededMockDatabase): void {
  replaceMockState(next);
}

export function subscribeToMockState(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function notify(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
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
