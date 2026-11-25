// Checks the plan for mistakes that are easy to make by hand. Run: node tools/check.mjs
// It can't tell whether a fact is true (opening hours, prices); it only checks the plan is consistent.
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildIcs } from "./build.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const T = createRequire(import.meta.url)(join(root, "trip-data.js"));
const errors = [], warnings = [];
const err = m => errors.push(m), warn = m => warnings.push(m);
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + "T12:00:00Z"));
const addDays = (s, n) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// --- days
T.DAYS.forEach((d, i) => {
  if (d.n !== i + 1) err(`Day ${d.n}: days must be numbered 1, 2, 3… in order`);
  if (!isDate(d.date)) err(`Day ${d.n}: bad date "${d.date}"`);
  if (i && d.date !== addDays(T.DAYS[i - 1].date, 1)) err(`Day ${d.n}: date ${d.date} doesn't follow Day ${d.n - 1}`);
  if (!T.CITY[d.city]) err(`Day ${d.n}: unknown city "${d.city}"`);
  if (!d.title || !Array.isArray(d.stops) || !d.stops.length) err(`Day ${d.n}: needs a title and at least one stop`);
  let last = "";
  for (const s of d.stops || []) {
    if (typeof s === "string") { if (!s.startsWith("→")) err(`Day ${d.n}: travel leg should start with "→": ${s.slice(0, 40)}`); continue; }
    if (!Array.isArray(s) || s.length < 2 || !s[1]) { err(`Day ${d.n}: a stop needs a time and a title`); continue; }
    if (/^\d{2}:\d{2}$/.test(s[0])) {
      const [h, m] = s[0].split(":").map(Number);
      if (h > 23 || m > 59) err(`Day ${d.n}: impossible time ${s[0]} (${s[1]})`);
      if (last && s[0] < last) err(`Day ${d.n}: "${s[1]}" at ${s[0]} comes after a stop at ${last}`);
      last = s[0];
    } else if (/\d/.test(s[0]) && !/^\d{2}:\d{2}$/.test(s[0])) err(`Day ${d.n}: time "${s[0]}" should look like 09:30 (${s[1]})`);
  }
});

// --- pins
const used = new Set(T.DAYS.flatMap(d => d.stops.filter(s => typeof s !== "string" && s[3]).map(s => s[3])));
const inBox = (p, b) => p[0] >= b[0] && p[0] <= b[2] && p[1] >= b[1] && p[1] <= b[3];
for (const [name, p] of Object.entries(T.PLACES)) {
  if (!used.has(name)) err(`Pin "${name}" isn't used by any stop (renamed or removed stop?)`);
  if (!Array.isArray(p) || p.length !== 2 || p[0] < 24 || p[0] > 46 || p[1] < 123 || p[1] > 146) err(`Pin "${name}": coordinates aren't in Japan`);
  else if (T.REGIONS.filter(r => inBox(p, r.box)).length !== 1) err(`Pin "${name}" should fall inside exactly one map area`);
}
const noPin = [...used].filter(q => !T.PLACES[q]);
if (noPin.length) warn(`Stops with a map link but no pin (they won't appear on a map): ${noPin.join("; ")}`);
T.REGIONS.forEach(r => { if (!Object.values(T.PLACES).some(p => inBox(p, r.box))) err(`Map "${r.name}" has no pins`); });

// --- stays and money
let prevTo = null, nights = 0;
for (const s of T.STAYS) {
  if (!T.CITY[s.city]) err(`Stay "${s.name}": unknown city`);
  if (!isDate(s.from) || !isDate(s.to) || s.to <= s.from) err(`Stay "${s.name}": bad dates`);
  const n = Math.round((new Date(s.to) - new Date(s.from)) / 864e5);
  if (n !== s.nights) err(`Stay "${s.name}": says ${s.nights} nights but the dates make ${n}`);
  if (prevTo && s.from !== prevTo) err(`Stay "${s.name}": starts ${s.from} but the previous stay ends ${prevTo}`);
  prevTo = s.to; nights += n;
  if (!T.BOOKED.some(b => b[2] === "stay" && b[1] === s.price && b[3] === s.nights)) err(`Stay "${s.name}": price £${s.price} isn't in the BOOKED list`);
  if (s.pin && !T.REGIONS.some(r => r.id === s.city && inBox(s.pin, r.box))) err(`Stay "${s.name}": pin is outside its map`);
}
if (T.STAYS.length && T.STAYS[0].from !== T.DAYS[1].date) err("First stay should start on Day 2");
if (prevTo && prevTo !== T.DAYS[T.DAYS.length - 1].date) err("Last stay should end on the final day in Japan");
T.BUDGET.forEach(b => { if (typeof b[2] !== "number" || b[2] < 0) err(`Budget row "${b[0]}": amount must be a number`); });

// --- to-book list
const start = T.DAYS[0].date;
T.BOOK.forEach(b => {
  if (!b[1]) err("A to-book item has no title");
  if (b[4] && (!isDate(b[4]) || b[4] >= start)) err(`To book "${b[1]}": calendar date ${b[4]} must be a real date before the trip`);
});
if (new Set(T.BOOK.filter(b => b[4]).map(b => b[1])).size !== T.BOOK.filter(b => b[4]).length) err("Two to-book items with calendar dates share a title");
const slug = t => t.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const slugs = T.BOOK.map(b => slug(b[1]));
slugs.forEach((s, i) => { if (!s || slugs.indexOf(s) !== i) err(`To book "${T.BOOK[i][1]}": its title must be unique (the shared ticks are filed under it)`); });
if (!Array.isArray(T.PEOPLE) || T.PEOPLE.length !== 2 || T.PEOPLE.some(p => !/^[a-z]+$/.test(p[0]) || !p[1])) err("PEOPLE should be two entries like [\"dave\",\"Dave\"]");
if (T.SYNC_URL && !/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.(firebasedatabase\.app|firebaseio\.com)\/?$/.test(T.SYNC_URL)) err("SYNC_URL should be the database address only, e.g. https://name-default-rtdb.europe-west1.firebasedatabase.app");
const ics = join(root, "booking-reminders.ics");
if (!existsSync(ics) || readFileSync(ics, "utf8") !== buildIcs()) err("booking-reminders.ics is out of date. Run: node tools/build.mjs");

// --- files and links
if (!/^\d{4}-\d{2}-\d{2}[a-z]?$/.test(T.DATA_VERSION)) err("DATA_VERSION should look like 2026-11-25a");
if (!T.CHANGES.length) err("CHANGES is empty");
const pages = ["index.html", "map.html"].map(f => [f, readFileSync(join(root, f), "utf8")]);
const texts = [...pages, ["trip-data.js", readFileSync(join(root, "trip-data.js"), "utf8")]];
for (const [f, text] of texts) {
  for (const m of text.matchAll(/(?:href|src)="([^"#$]+?)(?:[?#][^"]*)?"/g)) {
    const u = m[1];
    if (/^(https?:|data:|mailto:|\.\/?$)/.test(u) || u.includes("${")) continue;
    if (!existsSync(join(root, u))) err(`${f}: link to "${u}", which doesn't exist`);
  }
}
for (const [f, text] of pages) {
  const scripts = [...text.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  for (const js of scripts) { try { new Function(js); } catch (e) { err(`${f}: script error: ${e.message}`); } }
}
const sw = readFileSync(join(root, "sw.js"), "utf8");
try { new Function(sw); } catch (e) { err(`sw.js: ${e.message}`); }
for (const m of sw.slice(sw.indexOf("const CORE"), sw.indexOf("const TILE_HOSTS")).matchAll(/"([^"]+)"/g)) {
  if (!/^https?:|^\.\/$/.test(m[1]) && !existsSync(join(root, m[1]))) err(`sw.js: saves "${m[1]}" for offline use, but it doesn't exist`);
}
for (const m of pages[0][1].matchAll(/map\.html\?city=([a-z]+)/g)) if (!T.REGIONS.some(r => r.id === m[1])) err(`index.html: map "${m[1]}" doesn't exist`);
for (const c of Object.values(T.CITY)) { const m = /city=([a-z]+)/.exec(c.map || ""); if (c.map && (!m || !T.REGIONS.some(r => r.id === m[1]))) err(`City "${c.name}": bad map link`); }

warnings.forEach(w => console.log("note: " + w));
if (errors.length) { console.error(`\n${errors.length} problem${errors.length > 1 ? "s" : ""} found:`); errors.forEach(e => console.error(" ✗ " + e)); process.exit(1); }
console.log(`\nAll checks passed: ${T.DAYS.length} days, ${T.DAYS.reduce((a, d) => a + d.stops.filter(s => typeof s !== "string").length, 0)} stops, ${Object.keys(T.PLACES).length} pins on ${T.REGIONS.length} maps, ${T.BOOK.length} to-book items.`);
