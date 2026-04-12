import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const server = spawn("npm --prefix server run start", {
  stdio: ["ignore", "pipe", "pipe"],
  shell: true,
  windowsHide: true,
});

let logs = "";
server.stdout.on("data", (d) => {
  logs += d.toString();
});
server.stderr.on("data", (d) => {
  logs += d.toString();
});

const waitForHealth = async () => {
  for (let i = 0; i < 45; i += 1) {
    try {
      const res = await fetch("http://localhost:5000/health");
      if (res.ok) return true;
    } catch {}
    await delay(1000);
  }
  return false;
};

const cleanup = async () => {
  if (!server.killed) {
    server.kill("SIGTERM");
    await delay(1000);
  }
};

try {
  const healthy = await waitForHealth();
  if (!healthy) {
    throw new Error("Server did not become healthy in time");
  }

  const email = `smoke_${Math.random().toString(36).slice(2, 10)}@test.local`;
  const password = "SmokePass123";

  const registerRes = await fetch("http://localhost:5000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, username: "smokeuser" }),
  });
  const register = await registerRes.json();
  if (!registerRes.ok) {
    throw new Error(`Register failed: ${register.error || registerRes.status}`);
  }

  const loginRes = await fetch("http://localhost:5000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const login = await loginRes.json();
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${login.error || loginRes.status}`);
  }

  const coursesRes = await fetch("http://localhost:5000/api/courses", {
    headers: { Authorization: `Bearer ${login.token}` },
  });
  const courses = await coursesRes.json();
  if (!coursesRes.ok) {
    throw new Error(`Courses failed: ${courses.error || coursesRes.status}`);
  }

  console.log(
    JSON.stringify(
      {
        smoke_ok: true,
        health_ok: true,
        register_user_id: register?.user?._id || null,
        login_role: login?.user?.role || null,
        courses_count: Array.isArray(courses) ? courses.length : null,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.log(
    JSON.stringify(
      {
        smoke_ok: false,
        error: error instanceof Error ? error.message : String(error),
        logs_tail: logs.slice(-1200),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  await cleanup();
}
