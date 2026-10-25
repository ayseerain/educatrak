import { assertMockIntegrity } from "./integrity";
import { getMockState } from "./store";
import { selectBillingAccounts, selectPayments, selectStudents } from "./selectors";

assertMockIntegrity();

function liveArray<T>(read: () => T[]): T[] {
  return new Proxy([] as T[], {
    get(_target, property) {
      const current = read();
      const value = Reflect.get(current, property);
      return typeof value === "function" ? value.bind(current) : value;
    },
  });
}

export const students = liveArray(selectStudents);
export const billingAccounts = liveArray(selectBillingAccounts);
export const payments = liveArray(selectPayments);
export const CURRENT_MOCK_SCHOOL_YEAR = getMockState().schoolYears.find((year) => year.id === getMockState().config.currentSchoolYearId)?.label ?? "";

export * from "./api";
export * from "./integrity";
export * from "./seed";
export * from "./selectors";
export * from "./store";
