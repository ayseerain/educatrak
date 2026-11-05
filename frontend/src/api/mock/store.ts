import { defaultMockToday, seedMockDatabase, type SeededMockDatabase } from "./seed";

const STORAGE_KEY = "educatrak.mock-db.v1";
const CHANGE_EVENT = "educatrak:mock-db-change";

let mockTodayOverride: string | null = null;
let state = seedMockDatabase(defaultMockToday());
let simulatedDateTime: string | null = null;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function persist(): void {
  if (canUseStorage()) window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ mockTodayOverride, simulatedDateTime, state }));
}

function restore(): void {
  if (!canUseStorage()) return;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const savedState = JSON.parse(saved) as unknown;
    const envelope = typeof savedState === "object" && savedState !== null && "state" in savedState
      ? savedState as { mockTodayOverride?: unknown; simulatedDateTime?: unknown; state?: unknown }
      : undefined;
    const candidate = (envelope?.state ?? savedState) as Partial<SeededMockDatabase>;
    if (typeof envelope?.mockTodayOverride === "string" && /^\d{4}-\d{2}-\d{2}$/.test(envelope.mockTodayOverride)) mockTodayOverride = envelope.mockTodayOverride;
    if (typeof envelope?.simulatedDateTime === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/.test(envelope.simulatedDateTime)) simulatedDateTime = envelope.simulatedDateTime;
    if (candidate.meta?.notice && Array.isArray(candidate.students) && Array.isArray(candidate.payments)) {
      state = { ...seedMockDatabase(getMockToday()), ...candidate } as SeededMockDatabase;
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
  return simulatedDateTime?.slice(0, 10) ?? mockTodayOverride ?? actualManilaDateTime().slice(0, 10);
}

function actualManilaDateTime(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}+08:00`;
}

export function getMockBusinessDateTime(): string {
  return simulatedDateTime ?? (mockTodayOverride ? `${mockTodayOverride}T12:00:00+08:00` : actualManilaDateTime());
}

export function getMockSimulatedDateTime(): string | null {
  return simulatedDateTime;
}

export function simulateMockBusinessDateTime(nextDateTime: string): void {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(nextDateTime)) throw new Error("Test date and time must use the date-time picker.");
  simulatedDateTime = `${nextDateTime}:00+08:00`;
  persist();
  notify();
}

export function restoreMockBusinessDateTime(): void {
  simulatedDateTime = null;
  persist();
  notify();
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
  mockTodayOverride = nextToday;
  simulatedDateTime = null;
  state = seedMockDatabase(mockTodayOverride);
  persist();
  notify();
}

export function resetMockStore(): void {
  mockTodayOverride = null;
  simulatedDateTime = null;
  state = seedMockDatabase(defaultMockToday());
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
