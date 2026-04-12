import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSubmissions, gradeSubmission } from "../app/services/submissionService";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
beforeEach(() => { mockFetch.mockClear(); localStorage.setItem("token", "fake-token"); });

const ok   = (data: unknown) => Promise.resolve({ ok: true,  json: () => Promise.resolve(data) } as Response);
const fail = (e: string)      => Promise.resolve({ ok: false, json: () => Promise.resolve({ error: e }) } as Response);

const FAKE_SUB = {
  _id: "sub1", assignmentId: "asgn1", assignmentTitle: "React Todo App",
  course: "React Fundamentals", studentId: "student1", studentName: "Test Student",
  title: "My submission", description: "", text: "", files: [],
  grade: null, feedback: "", gradedAt: null,
  status: "submitted" as const, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("getSubmissions", () => {
  it("returns array of submissions", async () => {
    mockFetch.mockResolvedValueOnce(ok([FAKE_SUB]));
    const subs = await getSubmissions();
    expect(subs).toHaveLength(1);
    expect(subs[0].assignmentTitle).toBe("React Todo App");
  });

  it("handles wrapped response", async () => {
    mockFetch.mockResolvedValueOnce(ok({ submissions: [FAKE_SUB] }));
    const subs = await getSubmissions();
    expect(subs).toHaveLength(1);
  });

  it("sends Authorization header", async () => {
    mockFetch.mockResolvedValueOnce(ok([]));
    await getSubmissions();
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>).Authorization).toBe("Bearer fake-token");
  });

  it("throws on server error", async () => {
    mockFetch.mockResolvedValueOnce(fail("Forbidden"));
    await expect(getSubmissions()).rejects.toThrow("Forbidden");
  });

  it("passes query params", async () => {
    mockFetch.mockResolvedValueOnce(ok([]));
    await getSubmissions({ status: "submitted", assignmentId: "asgn1" });
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain("status=submitted");
    expect(url).toContain("assignmentId=asgn1");
  });
});

describe("gradeSubmission", () => {
  it("sends PATCH with grade and feedback", async () => {
    mockFetch.mockResolvedValueOnce(ok({ ...FAKE_SUB, grade: "85/100", status: "graded" }));
    const result = await gradeSubmission("sub1", { grade: "85/100", feedback: "Good work!" });
    expect(result.grade).toBe("85/100");
    expect(result.status).toBe("graded");
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/submissions/sub1/grade");
    expect(opts.method).toBe("PATCH");
    const body = JSON.parse(opts.body as string);
    expect(body.grade).toBe("85/100");
    expect(body.feedback).toBe("Good work!");
  });

  it("throws when grade rejected", async () => {
    mockFetch.mockResolvedValueOnce(fail("grade is required"));
    await expect(gradeSubmission("sub1", { grade: "" })).rejects.toThrow("grade is required");
  });
});