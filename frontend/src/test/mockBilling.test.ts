import { describe, expect, it } from "vitest";
import {
  getCurrentBillingAccount,
  getMockPayment,
  recordMockBillingPayment,
} from "@/api/mock";
import { students } from "@/api/mock";

describe("mock billing database", () => {
  it("allocates a payment to the oldest outstanding installment and synchronizes the account", () => {
    const payment = recordMockBillingPayment({
      studentNumber: "S-1001",
      amount: 125_000,
      paidOn: "2026-10-22",
    });

    const account = getCurrentBillingAccount("sample-1001");

    expect(payment.receiptNo).toBe("OR-2026-001011");
    expect(payment.allocations).toEqual([
      { installmentId: "installment-1001-5", amount: 125_000 },
    ]);
    expect(payment.balanceAfter).toBe(0);
    expect(getMockPayment(payment.id)).toEqual(payment);
    expect(account?.balance).toBe(0);
    expect(account?.schedule[4]?.status).toBe("paid");
    expect(students[0]?.balance).toBe(0);
    expect(students[0]?.clearanceStatus).toBe("Cleared");
  });

  it("rejects an amount over the live mock balance", () => {
    expect(() => recordMockBillingPayment({
      studentNumber: "S-1002",
      amount: 420_001,
      paidOn: "2026-10-22",
    })).toThrow(/cannot exceed/i);
  });
});
