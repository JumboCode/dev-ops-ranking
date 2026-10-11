# DevOps Project Ranking

A static site where developers rank the semester's projects and see the resulting teams.

- `index.html`: enter your name and drag the projects into order.
- `results.html`: shows the computed teams and everyone's submitted rankings.
- `config.js`: **the only file to edit each semester** (round name, projects, backend URL).

## How teams are assigned

- Team sizes are spread as evenly as possible across the number of people who submitted
  (10 people / 3 projects gives 4, 3, 3). Whichever project gets the extra member is the
  one that best satisfies preferences. You can force sizes with `fixedTeamSizes` in `config.js`.
- Assignment gives as many people as possible their 1st choice, then as many as possible
  their 2nd choice, and so on. It's an optimal assignment, not first-come-first-served.
- If someone submits twice with the same name, only their latest ranking counts.

## One-time backend setup (Google Sheets)

GitHub Pages can't store data, so submissions go to a Google Sheet:

1. Create a new Google Sheet.
2. **Extensions → Apps Script**, replace the contents with [`apps-script/Code.gs`](apps-script/Code.gs), and save.
3. **Deploy → New deployment →** type **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Authorize it, then copy the web app URL (ends in `/exec`) into `apiUrl` in `config.js`.

Responses show up in the `Rankings` tab of the sheet. To remove someone, delete their row.

If you change `Code.gs` later, use **Deploy → Manage deployments → Edit → New version**
so the URL stays the same.

## Hosting on GitHub Pages

Push to GitHub, then **Settings → Pages → Deploy from a branch → `main` / root**.

## New semester

In `config.js`:
1. Change `round` (e.g. `"spring-2027"`). Old submissions stay in the sheet but are ignored.
2. Replace the `projects` list. You can have any number of projects.

## Local testing

Leave `apiUrl` empty and open `index.html` in a browser. Rankings are then saved in
that browser's localStorage only.
