const required = [
  "GEMINI_API_KEY",
  "HF_API_KEY",
  "ADMIN_PASSWORD",
  "INTERNAL_API_TOKEN",
];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(
    `Missing required env vars for Vercel deploy: ${missing.join(", ")}`
  );
  process.exit(1);
}

if (process.env.ENABLE_SERVER_RENDER === "false") {
  const externalRequired = ["EXTERNAL_RENDER_WEBHOOK_URL", "RENDER_CALLBACK_SECRET"];
  const externalMissing = externalRequired.filter((name) => !process.env[name]);
  if (externalMissing.length > 0) {
    console.error(
      `Missing external-render env vars: ${externalMissing.join(", ")}`
    );
    process.exit(1);
  }
}

if (process.env.VERCEL && process.env.ENABLE_SERVER_RENDER !== "false") {
  console.warn(
    "ENABLE_SERVER_RENDER is not false. On Vercel free plan, server MP4 rendering may timeout."
  );
}

console.log("Vercel smoke check passed.");
