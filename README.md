# Japan, March 2027

Interactive day-by-day trip plan: Tokyo → Hakone → Kyoto → Osaka, 7–25 March 2027.

**Live site:** https://totalcontrol123.github.io/japan-trip-2027/

No build step. Commit a change and GitHub Pages updates within a minute or two.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole site: itinerary, maps tab, flights, Airbnbs, to-book list, budget, spending log, guide, packing |
| `tokyo-map.html`, `hakone-map.html`, `kyoto-map.html`, `osaka-map.html` | Satellite maps. Edit the `DAYS`, `STOPS` and `ZONES` lists in each |
| `booking-reminders.ics` | Calendar file of booking dates, linked from the To book tab |
| `sw.js`, `manifest.webmanifest`, `icon-*.png` | Offline support and the home-screen icon |

## Editing `index.html`

The content lives in lists near the bottom of the file:

- `DAYS`: the day-by-day plan. A stop is `[time, title, detail, map search]`; a line starting with `→` is a travel leg.
- `BOOK`: the to-book checklist. `PACK`: the packing list. `GUIDE`: the guide sections.
- `STAYS`: the Airbnbs tab. `BOOKED`: what has actually been paid. `BUDGET`: the per-person estimate.

If you add or rename a file, add it to `CORE` in `sw.js` and bump `VERSION` there so phones pick it up.

## Privacy

The site is public to anyone with the link. Booking references, door codes and exact addresses are deliberately not on it.
