# EDAS Back End - Viva Sheet

| Req | File -> method |
|---|---|
| FR-01 role login & permissions | `AuthService.Login`, `TokenService.CreateAccessToken`; `[Authorize(Roles="Coordinator")]` on `CrudController`, `RostersController` |
| FR-02 staff & availability | `StaffController`, `UnavailabilitiesController` -> `CrudService` + `StaffMap` / `UnavailabilityMap` |
| FR-03 duty limits | `StaffMap.Update` (MaxDuties) -> `EligibilityService.Check` (AtLimit) |
| FR-04 exam sessions | `SessionsController` -> `SessionMap` |
| FR-05 invigilators per room | `SlotsController` -> `SlotMap` (Slot.Required) |
| FR-06 automatic allocation | `AllocationService.Generate` -> `Allocate` |
| FR-07 fair hours | `AllocationService.Fill` (rank by total hours, then count, then id) |
| FR-08 unfilled duties | `AllocationService.Fill` (VacancyInfo) -> `RosterQueryService.Vacancies` |
| FR-09 validated replacement | `RosterService.Replace` -> `Validate` |
| FR-10 roster views & workload | `RosterQueryService.View`, `Workload` |
| FR-11 draft, publish, export | `RosterService.SaveDraft`, `Publish`; `RosterQueryService.Csv` |
| FR-12 versions & change log | `RosterService.ReplaceInNewVersion`, `ReplaceAudit`; `RosterQueryService.Audit` |
| BR-01 no overlap | `EligibilityService.Overlap` / `Check` |
| BR-02 unavailable staff | `EligibilityService.Check` (Unavailable) |
| BR-03 max duties | `EligibilityService.Check` (AtLimit) |
| BR-04 vacancies visible | `AllocationService.Fill` -> Vacancies table -> `GET /rosters/{id}/vacancies` |
| BR-05 balancing is an objective | `AllocationService.Fill` ranks only staff whose Check is None |
| BR-06 same rules for replacement | `RosterService.Validate` calls `EligibilityService.Check` |

**Allocation algorithm.** Load staff, slots and unavailabilities once. Sort slots by how many staff are eligible when nobody has a duty (fewest first), then date, start, id.
For each slot, run `Check` for every Staff user against the running duties; keep those with `Block.None`.
Rank them by total hours, then duty count, then staff id (deterministic), and take `Required` people.
If too few, record a vacancy with the missing count and how many staff were blocked as Unavailable, Overlap or AtLimit.
Rules are never broken to fill a slot; the draft, assignments and vacancies are saved in one transaction.

**How BR-06 is guaranteed.** There is exactly one rule method, `EligibilityService.Check`, a pure function with no DB access.
Allocation calls it in `Fill`; replacement calls it in `RosterService.Validate` with the version's other duties of the new staff.
Both paths therefore apply the same order: unavailable, overlapping duty, duty limit.
Replacement only adds checks that do not exist in allocation (role must be Staff, not already in the slot).
Unit tests cover `Check`; smoke scenario 7 proves a clashing replacement gets 422.

**Mutable draft vs immutable published snapshot.** Only one draft can exist (unique index on the generated `DraftKey` column).
Draft rows are edited only after `EnsureDraft` confirms the status; publishing sets `Status` and `PublishedAt` (DB CHECK ties them).
A published version is never updated or deleted: a change copies all its assignments and vacancies into version N+1 with the swap applied.
Copy, swap and audit row are one transaction; only the latest published version may be changed.
The smoke test compares version N before and after and finds it byte-for-byte identical.

**Token rotation.** Login returns a 15-minute JWT (claims sub, role) and a random 64-byte refresh token valid for 7 days.
Only the SHA-256 hash of the refresh token is stored. Each refresh marks the old token revoked and issues a new pair.
A revoked, expired or unknown token returns 401, so a stolen token works at most once. Logout revokes the supplied token.
Clock skew is zero, so access tokens expire exactly on time; SignalR reads the JWT from `access_token` on `/hubs` requests.

**Assumptions**
- The schema lists 11 tables; the prompt's "10 tables" is a miscount.
- Password hashing lives in `StaffMap` (service layer), so `StaffController` needs no overrides; on update a missing password keeps the old one.
- Generate reuses the existing draft row (clears its rows) because audit rows reference it with a restricting FK.
- Publishing gives the draft the next VersionNo so the newest published roster always has the highest number.
- An unknown or non-Staff `newStaffId` is a business-rule rejection (422).
- Logout with an unknown token returns 204; refresh tokens travel in the JSON body as the spec states.
- Pomelo created the `DraftKey` generated column, so no service-level fallback was needed.
- Dev MySQL runs in container `edas-mysql` on port 3307; `Jwt:Key` in appsettings is a development placeholder.
- Large dataset: 60 staff, 10 days x 3 sessions x 4 rooms = 120 slots needing 2 each.
