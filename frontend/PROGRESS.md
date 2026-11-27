# EDAS Front End - Progress

| Step | Scope | Gate |
|---|---|---|
| 1 | Vite setup, login, token refresh, role routing, dashboard, my duties | PASS |
| 2 | Generic CrudPage: Faculty, Rooms, Courses | PASS |
| 3 | Exam sessions with room slots, unavailability | PASS |
| 4-5 | Roster: generate, filters, workload, vacancies, audit, CSV, replace, publish, versions; live duties | PASS |
| 6 | Manual testing guide, README | PASS |
| L1 | Shared SignalR connection + toasts (`RealtimeProvider`, `useHubEvent`, `LiveNotifications`) | PASS |
| L2 | Faculty Leave page: request form with inline checks, own requests, status badges, cancel | PASS |
| L3 | Admin Leave requests: pending badge, tabs, approve / reject (note), affected duties dialog, roster deep link | PASS |
| L4 | Playwright leave tests (4) and demo script; full suite 20/20 on a fresh database | PASS |

Gate for each step: `npm run build`, `npx eslint src`, and a check that every field the screens read exists in the API responses.

## Notes
- The leave API did not exist; it was added to `Backend` first (see `Backend/PROGRESS.md`).
- Roles are Admin / Faculty (the leave brief's "Coordinator" / "Staff").
- `/admin/roster?version=<id>&staffId=<id>` opens a version already filtered to one faculty member.
- SignalR payloads use enum names (`AddJsonProtocol` with `JsonStringEnumConverter` in the API); found when the faculty toast failed on a numeric status.
- `ProtectedRoute` forwards the outlet context, so pages inside role routes can use `refreshPending`.
- The demo test removes the unavailability its approval created, so the suite stays repeatable.
