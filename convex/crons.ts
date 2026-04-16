import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// ─── Weekly Profit Alerts — Every Sunday 8:00am IST (2:30am UTC) ──────────────
crons.weekly(
  "profit-alerts",
  { dayOfWeek: "sunday", hourUTC: 2, minuteUTC: 30 },
  internal.analytics.checkProfitAlerts
);

// ─── Weekly Email Digest — Every Sunday 8:30am IST (3:00am UTC) ───────────────
crons.weekly(
  "weekly-digest-email",
  { dayOfWeek: "sunday", hourUTC: 3, minuteUTC: 0 },
  internal.analytics.sendWeeklyDigestEmail
);

export default crons;

