import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getDashboardData, getAnalyticsData, getSettings, saveSettings,
} from "../app/services/adminService";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
beforeEach(() => { mockFetch.mockClear(); localStorage.setItem("token", "admin-token"); });

const ok = (data: unknown) => Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as Response);
const fail = (error: string) => Promise.resolve({ ok: false, json: () => Promise.resolve({ error }) } as Response);

const FAKE_DASHBOARD = {
  stats: { students: 10, courses: 3, revenue: 5700, completionRate: 80 },
  enrollmentData: [{ month: "Jan", students: 2 }, { month: "Feb", students: 4 }],
};
const FAKE_ANALYTICS = {
  monthlyGrowth:   [{ month: "Jan", users: 2 }],
  userEngagement:  [{ day: "Mon", active: 1 }],
  courseRatings:   [{ name: "React", rating: 4.8, students: 10 }],
  completionRates: [{ name: "Graded", value: 5 }],
  trafficSources:  [{ source: "Direct", visits: 4 }],
  kpiMetrics:      [{ label: "Total Users", value: 10 }],
};
const FAKE_SETTINGS = {
  general:       { platformName: "Learnix", supportEmail: "", logoUrl: "" },
  notifications: { emailUpdates: true, productUpdates: false, billingAlerts: true },
  security:      { enforceTwoFactor: false, allowGoogleLogin: true, sessionTimeout: "30" },
  localization:  { language: "en", timezone: "UTC", dateFormat: "MM/DD/YYYY" },
  emailConfig:   { smtpHost: "", smtpPort: "587", smtpUser: "", fromName: "", fromEmail: "", footer: "" },
  backup:        { autoBackup: true, retentionDays: "30", backupWindow: "02:00-04:00" },
};

describe("getDashboardData", () => {
  it("returns stats and enrollmentData", async () => {
    mockFetch.mockResolvedValueOnce(ok(FAKE_DASHBOARD));
    const data = await getDashboardData();
    expect(data.stats.students).toBe(10);
    expect(data.enrollmentData).toHaveLength(2);
  });

  it("calls /api/admin/dashboard", async () => {
    mockFetch.mockResolvedValueOnce(ok(FAKE_DASHBOARD));
    await getDashboardData();
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain("/api/admin/dashboard");
  });

  it("throws on 403", async () => {
    mockFetch.mockResolvedValueOnce(fail("Forbidden"));
    await expect(getDashboardData()).rejects.toThrow("Forbidden");
  });
});

describe("getAnalyticsData", () => {
  it("returns all analytics sections", async () => {
    mockFetch.mockResolvedValueOnce(ok(FAKE_ANALYTICS));
    const data = await getAnalyticsData();
    expect(data.kpiMetrics).toHaveLength(1);
    expect(data.completionRates[0].name).toBe("Graded");
  });
});

describe("getSettings / saveSettings", () => {
  it("getSettings returns settings object", async () => {
    mockFetch.mockResolvedValueOnce(ok(FAKE_SETTINGS));
    const s = await getSettings();
    expect(s.general.platformName).toBe("Learnix");
  });

  it("saveSettings sends POST with payload", async () => {
    mockFetch.mockResolvedValueOnce(ok(FAKE_SETTINGS));
    await saveSettings(FAKE_SETTINGS);
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/admin/settings");
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body as string);
    expect(body.general.platformName).toBe("Learnix");
  });
});