import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCourses } from "../app/services/courseService";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
beforeEach(() => { mockFetch.mockClear(); localStorage.setItem("token", "fake-token"); });

const ok   = (data: unknown) => Promise.resolve({ ok: true,  json: () => Promise.resolve(data) } as Response);
const fail = ()               => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }  as Response);

const RAW_COURSE = {
  _id: "course1", title: "React Fundamentals",
  instructor: { _id: "i1", username: "Dr Smith", email: "s@s.com" },
  duration: "6 weeks", enrolledStudents: ["s1", "s2"],
  rating: 4.8, progress: 60, status: "active", image: "",
};

describe("getCourses", () => {
  it("maps paginated response correctly", async () => {
    mockFetch.mockResolvedValueOnce(ok({ courses: [RAW_COURSE], total: 1, page: 1, pages: 1 }));
    const courses = await getCourses();
    expect(courses).toHaveLength(1);
    expect(courses[0]._id).toBe("course1");
    expect(courses[0].instructor).toBe("Dr Smith");
    expect(courses[0].students).toBe(2);
  });

  it("maps plain array response correctly", async () => {
    mockFetch.mockResolvedValueOnce(ok([RAW_COURSE]));
    const courses = await getCourses();
    expect(courses[0].rating).toBe(4.8);
    expect(courses[0].duration).toBe("6 weeks");
  });

  it("defaults instructor to empty string when missing", async () => {
    const noInstructor = { ...RAW_COURSE, instructor: null };
    mockFetch.mockResolvedValueOnce(ok([noInstructor]));
    const courses = await getCourses();
    expect(courses[0].instructor).toBe("");
  });

  it("throws on network error", async () => {
    mockFetch.mockResolvedValueOnce(fail());
    await expect(getCourses()).rejects.toThrow();
  });

  it("sends Authorization header", async () => {
    mockFetch.mockResolvedValueOnce(ok([]));
    await getCourses();
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>).Authorization).toBe("Bearer fake-token");
  });
});