import { selectBillingAccounts, selectPayments, selectStudents } from "./selectors";

function params(): URLSearchParams {
  return typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
}

function latency(): number {
  const configured = Number(params().get("mockLatency"));
  if (Number.isFinite(configured) && configured >= 0) return configured;
  return params().get("mock") === "slow" ? 2500 : 450;
}

function empty(collection: string): boolean {
  const query = params();
  return query.get("mock") === "empty" || (query.get("mockEmpty")?.split(",").map((item) => item.trim()).includes(collection) ?? false);
}

export async function mockApiDelay(): Promise<void> {
  await new Promise<void>((resolve) => window.setTimeout(resolve, latency()));
  if (params().get("mock") === "error") throw new Error("Mock API error requested by URL switch.");
}

async function read<T>(collection: string, value: () => T): Promise<T> {
  await mockApiDelay();
  return empty(collection) ? ([] as T) : value();
}

export function listMockStudents() {
  return read("students", selectStudents);
}

export function listMockBillingAccounts() {
  return read("billingAccounts", selectBillingAccounts);
}

export function listMockPayments() {
  return read("payments", selectPayments);
}
