import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

/* ================= ENV SCHEMA ================= */

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(5000),

  MONGO_URI: z
    .string()
    .min(1, "MONGO_URI is required — set it in server/.env"),

  JWT_SECRET: z
    .string()
    .min(16, "JWT_SECRET must be at least 16 characters — set it in server/.env"),

  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  PUBLIC_BASE_URL: z.string().optional(),

  // AI Options — at least one should be set for AI chat to work
  // Option 1: Google Gemini (FREE — 1500 requests/day)
  // Get key at: https://aistudio.google.com/app/apikey
  GEMINI_API_KEY: z.string().optional(),

  // Option 2: Anthropic Claude (paid but higher quality)
  // If both set, Anthropic takes priority
  ANTHROPIC_API_KEY: z.string().optional(),
});

/* ================= VALIDATE ================= */

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errors = parsed.error.flatten().fieldErrors;
  console.error("\n❌  Invalid environment variables:");
  for (const [key, msgs] of Object.entries(errors)) {
    console.error(`   ${key}: ${msgs.join(", ")}`);
  }
  console.error("\n   Copy server/.env.example → server/.env and fill in the required values.\n");
  process.exit(1);
}

/* ================= EXPORT ================= */

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGIN.split(",")
  .map((o) => o.trim())
  .filter(Boolean);