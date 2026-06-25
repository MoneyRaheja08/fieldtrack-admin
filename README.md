# FieldTrack Admin — Web Dashboard

React + Vite dashboard wired to the FieldTrack backend. The manager's
window into everything: live map, attendance logs, fraud alerts, CSV
export, and job-site (geofence) management.

## Run locally

```bash
cd fieldtrack-admin
npm install
cp .env.example .env          # set VITE_API_URL to your backend URL
npm run dev                   # opens http://localhost:5173
```

Log in with an **admin** account from your backend (the one you created
with the `bootstrap_admin.py` snippet — code `ADMIN`, the PIN you set).

## What each tab does

| Tab | Backend endpoint | Shows |
|---|---|---|
| **Live Map** | `GET /admin/live` + `/admin/sites` | Active employees plotted with geofence rings. Auto-refreshes every 10s. Amber = flagged punch. |
| **Attendance** | `GET /admin/report` | Records for a date range. Export to CSV (`/admin/report/export`). |
| **Alerts** | `GET /admin/alerts` | Blocked fraud attempts, flagged punches, absentees, late arrivals — with plain-English labels. |
| **Job Sites** | `GET/POST/DELETE /admin/sites` | Add/remove geofenced sites. Punches outside every site get blocked. |

The top stat cards come from `GET /admin/dashboard`.

## Build for production

```bash
npm run build      # outputs to dist/
npm run preview    # test the production build locally
```

## Deploy

Static SPA — host it anywhere. Configs for the two easiest are included:

**Vercel** (`vercel.json` present)
```bash
npm i -g vercel
vercel            # set VITE_API_URL in the project's env settings
```

**Netlify** (`netlify.toml` present)
```bash
npm i -g netlify-cli
netlify deploy --prod
# set VITE_API_URL under Site settings → Environment variables
```

Either way, set **`VITE_API_URL`** to your deployed backend (e.g. your
Render URL). Vite bakes env vars in at build time, so rebuild after changing it.

## CORS note

Your FastAPI backend currently allows all origins (`allow_origins=["*"]`).
Before going live, tighten it to your dashboard's domain in
`fieldtrack-backend/app/main.py`:

```python
allow_origins=["https://your-dashboard.vercel.app"]
```

## Project layout

```
index.html
vite.config.js
package.json
src/
├── main.jsx                  # entry
├── App.jsx                   # dashboard shell + all tabs
├── services/api.js           # backend client (token in localStorage)
└── components/
    ├── ui.jsx                # tokens, Card, Tag, formatters
    ├── LiveMap.jsx           # canvas map with geofence rings
    └── Login.jsx             # admin auth
```

## The full system

This dashboard is piece 3 of 3:

1. **fieldtrack-backend** — FastAPI + MongoDB, anti-cheat engine
2. **fieldtrack-app** — Expo phone app, employees clock in
3. **fieldtrack-admin** — this dashboard, you monitor

Start the backend, point both the app and this dashboard at it, and the
loop is closed.
