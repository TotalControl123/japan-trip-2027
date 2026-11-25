// Builds booking-reminders.ics from the To book list in trip-data.js.
// Run: node tools/build.mjs        (writes the file)
//      node tools/build.mjs --check (fails if the file is out of date)
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { BOOK } = createRequire(import.meta.url)(join(root, "trip-data.js"));

const esc = t => t.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\;");
const slug = t => t.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const nextDay = d => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10).replace(/-/g, ""); };

export function buildIcs() {
  const out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//japan-trip-2027//booking reminders//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Japan 2027 bookings"];
  for (const [when, what, detail, done, cal] of BOOK) {
    if (!cal || done) continue;
    const d = cal.replace(/-/g, "");
    out.push("BEGIN:VEVENT", `UID:jp27-${slug(what)}@japan-trip-2027`, `DTSTAMP:${d}T000000Z`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${nextDay(cal)}`,
      `SUMMARY:${esc("Japan: " + what)}`, `DESCRIPTION:${esc((when ? when + ". " : "") + (detail || ""))}`, "TRANSP:TRANSPARENT",
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc("Japan: " + what)}`, "TRIGGER:PT9H", "END:VALARM", "END:VEVENT");
  }
  out.push("END:VCALENDAR");
  return out.join("\r\n") + "\r\n";
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = join(root, "booking-reminders.ics"), fresh = buildIcs();
  if (process.argv.includes("--check")) {
    if (!existsSync(file) || readFileSync(file, "utf8") !== fresh) { console.error("booking-reminders.ics is out of date. Run: node tools/build.mjs"); process.exit(1); }
    console.log("booking-reminders.ics is up to date");
  } else { writeFileSync(file, fresh); console.log("wrote booking-reminders.ics"); }
}
