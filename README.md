# Japan, March 2027

Interactive day-by-day trip plan: Tokyo → Hakone → Kyoto → Osaka, 7–25 March 2027.

**Live site:** https://totalcontrol123.github.io/japan-trip-2027/

No build step. Commit a change and GitHub Pages updates within a minute or two.

## Files

| File | What it is |
|---|---|
| `trip-data.js` | **The whole plan.** Every page reads this one file, so this is the only place the plan is edited |
| `index.html` | The site: itinerary, maps tab, flights, Airbnbs, to-book list, budget, spending log, guide, packing |
| `map.html` | The satellite maps (`map.html?city=tokyo`, `fuji`, `hakone`, `kyoto`, `hiroshima`, `nara`, `osaka`, `himeji`). Pins are drawn from the itinerary |
| `booking-reminders.ics` | Calendar file of booking dates. Built from the To book list; don't edit it by hand |
| `tools/check.mjs` | Checks the plan is consistent |
| `tools/build.mjs` | Rebuilds the calendar file |
| `sw.js`, `manifest.webmanifest`, `icon-*.png` | Offline support and the home-screen icon |
| `tokyo-map.html` etc. | Old map addresses; they just redirect to `map.html` |

## Changing the plan

Everything is in `trip-data.js`:

- `DAYS`: the day-by-day plan. A stop is `[time, title, detail, map search]`; a line starting with `→` is a travel leg. `need` lists what's booked or needed that day (shown on the Today card).
- `PLACES`: map pins. To put a stop on a map, add its map-search text here with its coordinates.
- `BOOK`: the to-book list: `[when, what, detail, done?, calendar date]`. Items with a calendar date go into the calendar file.
- `STAYS`, `BOOKED`, `BUDGET`: the Airbnbs tab, what has been paid, and the per-person estimate.
- `GUIDE`, `PACK`, `TICKETS`: the guide sections, packing list and the list of confirmations.
- `CHANGES` and `DATA_VERSION`: add a line to `CHANGES` and change `DATA_VERSION` with every edit. That is what makes open phones show "The plan has been updated".

Then:

```
node tools/build.mjs   # rebuild the calendar file
node tools/check.mjs   # check for mistakes
```

GitHub runs both on every push (the "Check the plan" action) and saves the rebuilt calendar file itself. A red cross on a commit means the check found a problem; click it to read which.

The check catches slips like times out of order, a pin with no stop, stays whose dates don't join up, and broken links between the site's own files. It can't tell whether a fact is still true (opening hours, prices), and it doesn't test links to other websites.

## Shared ticks on the To book list

Each item has a box for each person in `PEOPLE`. With `SYNC_URL` empty, ticks stay on each phone. To share them, `SYNC_URL` points at a free Firebase Realtime Database:

1. https://console.firebase.google.com → create a project → Build → Realtime Database → Create database (start in locked mode).
2. On the Rules tab, paste this and Publish:

```json
{
  "rules": {
    "jp27": {
      ".read": true,
      "ticks": {
        "$item": {
          "$who": {
            ".write": true,
            ".validate": "newData.isBoolean() && ($who === 'dave' || $who === 'alan') && $item.length < 60"
          }
        }
      }
    }
  }
}
```

3. Copy the database address from the Data tab (it looks like `https://name-default-rtdb.europe-west1.firebasedatabase.app`) into `SYNC_URL` in `trip-data.js`.

Anyone with the site link can tick or untick boxes; the rules stop them doing anything else to the database.

## Previewing a day

Add a date and time (Japan time) to the address to see the Today card as it will look on the trip:
`…/japan-trip-2027/?date=2027-03-10&time=14:00`

## Privacy

The site is public to anyone with the link. Booking references, door codes and exact addresses are deliberately not on it.
