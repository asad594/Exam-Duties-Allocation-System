# EDAS Back End - Progress

| Phase | Scope | Gate |
|---|---|---|
| 1 | Foundation: solution, entities, DbContext, migration | PASS |
| 2 | Auth: JWT 15 min + rotating refresh 7 days, roles, error middleware | PASS |
| 3 | CRUD: generic base controller, 6 resources, DTO validation | PASS |
| 4 | Rules: EligibilityService + unit tests (8 tests) | PASS |
| 5 | Allocation: pure greedy core + one-transaction save (6 tests) | PASS |
| 6 | Roster changes: replace, publish, versioning, audit, SignalR hub | PASS |
| 7 | Views: roster filters, workload, vacancies, audit, CSV, my-duties | PASS |
| 8 | Seed, 7 scenarios, Postman (44 requests), VIVA.md, final audit | PASS |

## Environment
- .NET SDK pinned to 8.0.416 (`global.json`); dotnet-ef 8.0.11 as a local tool (`.config/dotnet-tools.json`).
- MySQL 8.0 in container `edas-mysql`, host port 3307, volume `edas-mysql-data`.
- API: `dotnet run --project Edas.Api --launch-profile http` on http://localhost:5080.

## Notes
- The schema defines 11 tables (the prompt's "10 tables" is a miscount); the gate checks all 11.
- Phase 2 Staff-token (403) check inserts its staff user with SQL (reusing the admin hash), so the Phase 2 gate does not depend on Phase 3.
- Generate reuses the single draft row (clears its assignments/vacancies) so audit rows pointing at the draft stay valid.
- Publishing gives the draft the next VersionNo, so the newest published roster always has the highest number.

## Final results (fresh database)
- `dotnet build`: 0 errors, 0 warnings. `dotnet test`: 14/14 passed. `scripts/smoke.sh`: 87/87 checks passed.
- Large dataset (`SEED_LARGE=1`, 60 staff, 120 slots, 240 duties): generate took 835 ms cold, 240-340 ms warm (target 5 s).
- Only EF-generated migration files contain `///` comments; no TODOs or regions in hand-written code.
