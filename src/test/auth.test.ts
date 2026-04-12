import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loginUser, registerUser, getToken, logoutUser, getCurrentUser,
} from "../app/services/authService";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const FAKE_USER  = { _id: "abc123", email: "test@test.com", username: "testuser", role: "student" as const };
const FAKE_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImFiYzEyMyJ9.fake";

const ok  = (data: unknown, status = 200) => Promise.resolve({ ok: true,  status, json: () => Promise.resolve(data) } as Response);
const err = (error: string, status = 400) => Promise.resolve({ ok: false, status, json: () => Promise.resolve({ error }) } as Response);

beforeEach(() => { mockFetch.mockClear(); localStorage.clear(); });

describe("registerUser", () => {
  it("returns user and token on success", async () => {
    mockFetch.mockResolvedValueOnce(ok({ user: FAKE_USER, token: FAKE_TOKEN }, 201));
    const result = await registerUser("test@test.com", "password123", "testuser");
    expect(result.user.email).toBe("test@test.com");
    expect(result.token).toBe(FAKE_TOKEN);
    expect(localStorage.getItem("token")).toBe(FAKE_TOKEN);
  });

  it("throws on duplicate email (409)", async () => {
    mockFetch.mockResolvedValueOnce(err("Email already registered", 409));
    await expect(registerUser("dup@test.com", "pass123", "user")).rejects.toThrow("Email already registered");
  });

  it("throws on short password from server", async () => {
    mockFetch.mockResolvedValueOnce(err("Password must be at least 6 characters", 400));
    await expect(registerUser("x@x.com", "abc", "user")).rejects.toThrow("Password must be at least 6 characters");
  });
});

describe("loginUser", () => {
  it("stores token in localStorage on success", async () => {
    mockFetch.mockResolvedValueOnce(ok({ user: FAKE_USER, token: FAKE_TOKEN }));
    await loginUser("test@test.com", "password123");
    expect(localStorage.getItem("token")).toBe(FAKE_TOKEN);
    expect(localStorage.getItem("user")).toContain("testuser");
  });

  it("throws on wrong credentials", async () => {
    mockFetch.mockResolvedValueOnce(err("Invalid credentials", 401));
    await expect(loginUser("bad@test.com", "wrongpass")).rejects.toThrow("Invalid credentials");
  });

  it("throws on server error", async () => {
    mockFetch.mockResolvedValueOnce(err("Server error", 500));
    await expect(loginUser("a@b.com", "pass")).rejects.toThrow("Server error");
  });

  it("sends correct Content-Type header", async () => {
    mockFetch.mockResolvedValueOnce(ok({ user: FAKE_USER, token: FAKE_TOKEN }));
    await loginUser("test@test.com", "password123");
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });
});

describe("token helpers", () => {
  it("getToken returns null when not logged in", () => {
    expect(getToken()).toBeNull();
  });

  it("getCurrentUser returns null when not logged in", () => {
    expect(getCurrentUser()).toBeNull();
  });

  it("logoutUser clears localStorage", () => {
    localStorage.setItem("token", FAKE_TOKEN);
    localStorage.setItem("user",  JSON.stringify(FAKE_USER));
    logoutUser();
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });

  it("getCurrentUser returns parsed user", () => {
    localStorage.setItem("user", JSON.stringify(FAKE_USER));
    const user = getCurrentUser();
    expect(user?.email).toBe("test@test.com");
    expect(user?.role).toBe("student");
  });

  it("getCurrentUser returns null on corrupt localStorage", () => {
    localStorage.setItem("user", "not-valid-json{{{");
    expect(getCurrentUser()).toBeNull();
  });
});