import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMyFees, markFeePaid, getAllFees } from "../app/services/feeService";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
beforeEach(() => { mockFetch.mockClear(); localStorage.setItem("token", "fake-token"); });

const ok   = (data: unknown) => Promise.resolve({ ok: true,  json: () => Promise.resolve(data) } as Response);
const fail = (e: string, s = 401) => Promise.resolve({ ok: false, status: s, json: () => Promise.resolve({ error: e }) } as Response);

const FAKE_FEE = {
  _id: "fee1", description: "Tuition Fee", amount: 2850, status: "pending" as const,
  dueDate: "2026-06-15T00:00:00.000Z", paidAt: null,
  invoice: "INV-2026-0001", semester: "Summer 2026", category: "tuition" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("getMyFees", () => {
  it("returns fees with totals", async () => {
    mockFetch.mockResolvedValueOnce(ok({ fees: [FAKE_FEE], totalPaid: 3100, totalPending: 2850, nextFee: FAKE_FEE }));
    const result = await getMyFees();
    expect(result.fees).toHaveLength(1);
    expect(result.totalPaid).toBe(3100);
    expect(result.nextFee?._id).toBe("fee1");
  });

  it("calls /api/fees/my", async () => {
    mockFetch.mockResolvedValueOnce(ok({ fees: [], totalPaid: 0, totalPending: 0, nextFee: null }));
    await getMyFees();
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain("/api/fees/my");
  });

  it("throws on 401", async () => {
    mockFetch.mockResolvedValueOnce(fail("Unauthorized"));
    await expect(getMyFees()).rejects.toThrow("Unauthorized");
  });
});

describe("markFeePaid", () => {
  it("sends PATCH to correct URL and returns updated fee", async () => {
    mockFetch.mockResolvedValueOnce(ok({ ...FAKE_FEE, status: "paid" }));
    const result = await markFeePaid("fee1");
    expect(result.status).toBe("paid");
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/fees/fee1/pay");
    expect(opts.method).toBe("PATCH");
  });
});

describe("getAllFees", () => {
  it("returns revenue and fees list", async () => {
    mockFetch.mockResolvedValueOnce(ok({ fees: [FAKE_FEE], totalRevenue: 3100, pendingPayments: 2850, total: 1, page: 1 }));
    const result = await getAllFees();
    expect(result.totalRevenue).toBe(3100);
    expect(result.fees).toHaveLength(1);
  });

  it("sends query params when provided", async () => {
    mockFetch.mockResolvedValueOnce(ok({ fees: [], totalRevenue: 0, pendingPayments: 0, total: 0, page: 1 }));
    await getAllFees({ status: "pending", page: 2 });
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain("status=pending");
    expect(url).toContain("page=2");
  });
});