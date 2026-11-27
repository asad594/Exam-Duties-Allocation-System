#!/usr/bin/env bash
# End-to-end checks. Needs the API at $BASE_URL and MySQL in the edas-mysql container.
set -u
BASE_URL="${BASE_URL:-http://localhost:5080}"
RUN=$(date +%s)
FAILS=0
CODE=""
BODY=""

check() { if eval "$2"; then echo "PASS $1"; else echo "FAIL $1 (code=$CODE body=${BODY:0:200})"; FAILS=$((FAILS + 1)); fi; }
sql() { docker exec edas-mysql mysql -uroot -proot edas -N -e "$1" 2>/dev/null; }
# Use python3 where it runs (Linux/macOS), otherwise python (Windows); a Windows "python3" stub exists but fails.
PY=$(python3 -c "" >/dev/null 2>&1 && echo python3 || echo python)
json() { "$PY" -c "import json,sys; d=json.loads(sys.argv[1]); print($1)" "$BODY"; }

# call METHOD PATH [TOKEN] [JSON_BODY] -> sets CODE and BODY
call() {
  local args=(-s -w $'\n%{http_code}' -X "$1" "$BASE_URL$2" -H "Content-Type: application/json")
  [ -n "${3:-}" ] && args+=(-H "Authorization: Bearer $3")
  [ -n "${4:-}" ] && args+=(-d "$4")
  local out; out=$(curl "${args[@]}")
  CODE="${out##*$'\n'}"
  BODY="${out%$'\n'*}"
}

echo "== Phase 1: schema"
TABLES="SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='edas' AND TABLE_NAME<>'__EFMigrationsHistory'"
constraints() { sql "SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA='edas' AND CONSTRAINT_TYPE='$1'"; }
CASCADES="SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA='edas' AND DELETE_RULE='CASCADE'"
check "all 12 schema tables exist" '[ "$(sql "$TABLES")" = 12 ]'
check "13 CHECK constraints exist" '[ "$(constraints CHECK)" = 13 ]'
check "10 UNIQUE constraints exist" '[ "$(constraints UNIQUE)" = 10 ]'
check "DraftKey generated column exists" 'sql "SHOW CREATE TABLE RosterVersions" | grep -q "DraftKey.*GENERATED ALWAYS.*STORED"'
check "cascade only on owned rows (3 FKs)" '[ "$(sql "$CASCADES")" = 3 ]'

echo "== Phase 2: auth"
call POST /api/auth/login "" '{"email":"admin@edas.test","password":"Admin@123"}'
check "admin login returns tokens" '[ "$CODE" = 200 ] && [ -n "$(json "d[\"accessToken\"]")" ]'
COORD=$(json 'd["accessToken"]'); REFRESH=$(json 'd["refreshToken"]')
call POST /api/auth/login "" '{"email":"admin@edas.test","password":"wrong"}'
check "wrong password returns 401" '[ "$CODE" = 401 ]'
call POST /api/auth/refresh "" "{\"refreshToken\":\"$REFRESH\"}"
check "refresh issues a new pair" '[ "$CODE" = 200 ]'
NEW_REFRESH=$(json 'd["refreshToken"]')
call POST /api/auth/refresh "" "{\"refreshToken\":\"$REFRESH\"}"
check "second use of a refresh token returns 401" '[ "$CODE" = 401 ]'
call POST /api/auth/logout "" "{\"refreshToken\":\"$NEW_REFRESH\"}"
check "logout returns 204" '[ "$CODE" = 204 ]'
call POST /api/auth/refresh "" "{\"refreshToken\":\"$NEW_REFRESH\"}"
check "logged-out refresh token returns 401" '[ "$CODE" = 401 ]'
call GET /api/rooms
check "admin endpoint without token returns 401" '[ "$CODE" = 401 ]'
# Faculty user inserted directly (reuses the admin's hash, so its password is Admin@123); independent of Phase 3.
sql "INSERT INTO Staff (Name, Email, PasswordHash, Role, MaxDuties) SELECT 'Smoke Staff', 'smoke-$RUN@edas.test', PasswordHash, 'Faculty', 0 FROM Staff WHERE Email = 'admin@edas.test'"
SMOKE_STAFF=$(sql "SELECT Id FROM Staff WHERE Email = 'smoke-$RUN@edas.test'")
call POST /api/auth/login "" "{\"email\":\"smoke-$RUN@edas.test\",\"password\":\"Admin@123\"}"
STAFF_TOKEN=$(json 'd["accessToken"]')
call GET /api/rooms "$STAFF_TOKEN"
check "admin endpoint with Faculty token returns 403" '[ "$CODE" = 403 ]'

echo "== Phase 3: CRUD"
# crud NAME PATH CREATE_JSON UPDATE_JSON -> leaves the created id in $ID (deleted at the end)
crud() {
  call POST "$2" "$COORD" "$3"; check "$1 create returns 201" '[ "$CODE" = 201 ]'; ID=$(json 'd["id"]')
  call GET "$2/$ID" "$COORD"; check "$1 read returns 200" '[ "$CODE" = 200 ]'
  call PUT "$2/$ID" "$COORD" "$4"; check "$1 update returns 200" '[ "$CODE" = 200 ]'
}
crud room /api/rooms "{\"name\":\"Smoke Room $RUN\"}" "{\"name\":\"Smoke Room B $RUN\"}"; ROOM=$ID
crud course /api/courses "{\"code\":\"SM$RUN\",\"title\":\"Smoke\"}" "{\"code\":\"SM$RUN\",\"title\":\"Smoke 2\"}"; COURSE=$ID
crud session /api/sessions "{\"courseId\":$COURSE,\"date\":\"2030-01-10\",\"startTime\":\"09:00:00\",\"endTime\":\"12:00:00\"}" \
  "{\"courseId\":$COURSE,\"date\":\"2030-01-10\",\"startTime\":\"09:00:00\",\"endTime\":\"11:00:00\"}"; SESSION=$ID
crud slot /api/slots "{\"examSessionId\":$SESSION,\"roomId\":$ROOM,\"required\":1}" "{\"examSessionId\":$SESSION,\"roomId\":$ROOM,\"required\":2}"; SLOT=$ID
crud unavailability /api/unavailabilities "{\"staffId\":$SMOKE_STAFF,\"date\":\"2030-01-10\",\"startTime\":\"00:00:00\",\"endTime\":\"23:59:59\"}" \
  "{\"staffId\":$SMOKE_STAFF,\"date\":\"2030-01-10\",\"startTime\":\"08:00:00\",\"endTime\":\"10:00:00\"}"; UNAVAILABLE=$ID
crud staff /api/staff "{\"name\":\"Temp\",\"email\":\"temp-$RUN@edas.test\",\"password\":\"Temp@123\",\"role\":\"Faculty\",\"maxDuties\":2}" \
  "{\"name\":\"Temp 2\",\"email\":\"temp-$RUN@edas.test\",\"role\":\"Faculty\",\"maxDuties\":3}"; TEMP_STAFF=$ID
call GET "/api/slots?sessionId=$SESSION" "$COORD"
check "slots filter by sessionId" '[ "$(json "len(d)")" = 1 ]'
call GET "/api/unavailabilities?staffId=$SMOKE_STAFF" "$COORD"
check "unavailabilities filter by staffId" '[ "$(json "len(d)")" = 1 ]'
call POST /api/rooms "$COORD" '{"name":""}'
check "empty room name returns 400" '[ "$CODE" = 400 ]'
call POST /api/sessions "$COORD" "{\"courseId\":$COURSE,\"date\":\"2030-01-10\",\"startTime\":\"12:00:00\",\"endTime\":\"09:00:00\"}"
check "end before start returns 400" '[ "$CODE" = 400 ]'
call POST /api/staff "$COORD" '{"name":"X","email":"not-an-email","password":"Xx@12345","role":"Faculty","maxDuties":1}'
check "invalid email returns 400" '[ "$CODE" = 400 ]'
call POST /api/staff "$COORD" '{"name":"X","email":"nopass@edas.test","role":"Faculty","maxDuties":1}'
check "staff without password returns 400" '[ "$CODE" = 400 ]'
call POST /api/rooms "$COORD" "{\"name\":\"Smoke Room B $RUN\"}"
check "duplicate room name returns 409" '[ "$CODE" = 409 ]'
call POST /api/courses "$COORD" "{\"code\":\"SM$RUN\",\"title\":\"Dup\"}"
check "duplicate course code returns 409" '[ "$CODE" = 409 ]'
call POST /api/staff "$COORD" "{\"name\":\"Dup\",\"email\":\"temp-$RUN@edas.test\",\"password\":\"Temp@123\",\"role\":\"Faculty\",\"maxDuties\":1}"
check "duplicate staff email returns 409" '[ "$CODE" = 409 ]'
call DELETE "/api/courses/$COURSE" "$COORD"
check "deleting an in-use course returns 409" '[ "$CODE" = 409 ]'
call GET /api/staff "$COORD"
check "password hash never returned" '[ "$CODE" = 200 ] && ! echo "$BODY" | grep -qiE "password|AQAAAA"'
call GET /api/rooms/999999 "$COORD"
check "unknown id returns 404" '[ "$CODE" = 404 ]'
for path in "slots/$SLOT" "sessions/$SESSION" "courses/$COURSE" "rooms/$ROOM" "unavailabilities/$UNAVAILABLE" "staff/$TEMP_STAFF"; do
  call DELETE "/api/$path" "$COORD"; check "delete $path returns 204" '[ "$CODE" = 204 ]'
done
call GET "/api/rooms/$ROOM" "$COORD"
check "deleted row returns 404" '[ "$CODE" = 404 ]'

echo "== Phase 5: allocation"
# Without the dev seed data, create a tiny dataset: one fillable slot and one that cannot be filled.
if [ "$(sql "SELECT COUNT(*) FROM Slots")" = 0 ]; then
  for n in 1 2; do call POST /api/staff "$COORD" "{\"name\":\"Alloc $n\",\"email\":\"alloc$n-$RUN@edas.test\",\"password\":\"Alloc@123\",\"role\":\"Faculty\",\"maxDuties\":2}"; done
  call POST /api/courses "$COORD" "{\"code\":\"AL$RUN\",\"title\":\"Allocation\"}"; C=$(json 'd["id"]')
  call POST /api/rooms "$COORD" "{\"name\":\"Alloc Room $RUN\"}"; R=$(json 'd["id"]')
  call POST /api/sessions "$COORD" "{\"courseId\":$C,\"date\":\"2030-02-01\",\"startTime\":\"09:00:00\",\"endTime\":\"12:00:00\"}"; S1=$(json 'd["id"]')
  call POST /api/sessions "$COORD" "{\"courseId\":$C,\"date\":\"2030-02-02\",\"startTime\":\"09:00:00\",\"endTime\":\"12:00:00\"}"; S2=$(json 'd["id"]')
  call POST /api/slots "$COORD" "{\"examSessionId\":$S1,\"roomId\":$R,\"required\":2}"
  call POST /api/slots "$COORD" "{\"examSessionId\":$S2,\"roomId\":$R,\"required\":100}"
fi
call POST /api/rosters/generate "$COORD"
check "generate returns assignments" '[ "$CODE" = 200 ] && [ "$(json "d[\"assignedCount\"]")" -gt 0 ]'
check "generate reports vacancies" '[ "$(json "d[\"vacancyCount\"]")" -gt 0 ]'
check "draft rows match the response" '[ "$(sql "SELECT COUNT(*) FROM Assignments WHERE RosterVersionId=$(json "d[\"draftId\"]")")" = "$(json "d[\"assignedCount\"]")" ]'
call POST /api/rosters/generate "$COORD"
check "generating twice leaves exactly one draft" '[ "$CODE" = 200 ] && [ "$(sql "SELECT COUNT(*) FROM RosterVersions WHERE Status=\"Draft\"")" = 1 ]'
check "staff are never double-booked" '[ "$(sql "SELECT COUNT(*) FROM Assignments a JOIN Assignments b ON a.RosterVersionId=b.RosterVersionId AND a.StaffId=b.StaffId AND a.Id<b.Id JOIN Slots sa ON sa.Id=a.SlotId JOIN Slots sb ON sb.Id=b.SlotId JOIN ExamSessions ea ON ea.Id=sa.ExamSessionId JOIN ExamSessions eb ON eb.Id=sb.ExamSessionId WHERE ea.Date=eb.Date AND ea.StartTime<eb.EndTime AND eb.StartTime<ea.EndTime")" = 0 ]'

echo "== Phase 6: roster changes"
snapshot() { sql "SELECT CONCAT((SELECT CONCAT_WS('|',VersionNo,Status,CreatedById,CreatedAt,PublishedAt) FROM RosterVersions WHERE Id=$1),'#',
  (SELECT IFNULL(GROUP_CONCAT(CONCAT_WS(':',Id,SlotId,StaffId) ORDER BY Id),'') FROM Assignments WHERE RosterVersionId=$1),'#',
  (SELECT IFNULL(GROUP_CONCAT(CONCAT_WS(':',Id,SlotId,Missing,UnavailableCount,BusyCount,AtLimitCount) ORDER BY Id),'') FROM Vacancies WHERE RosterVersionId=$1))"; }
# Test staff are kept away from the seeded Main Hall day so repeated runs cannot fill the scenario-4 vacancy.
new_staff() {
  call POST /api/staff "$COORD" "{\"name\":\"$1\",\"email\":\"$1-$RUN@edas.test\",\"password\":\"Fresh@123\",\"role\":\"Faculty\",\"maxDuties\":5}"
  local id; id=$(json 'd["id"]')
  call POST /api/unavailabilities "$COORD" "{\"staffId\":$id,\"date\":\"2030-03-06\",\"startTime\":\"00:00:00\",\"endTime\":\"23:59:59\"}"
  echo "$id"
}
DRAFT=$(sql "SELECT Id FROM RosterVersions WHERE Status='Draft'")
A=$(sql "SELECT a.Id FROM Assignments a JOIN Slots s ON s.Id=a.SlotId JOIN ExamSessions e ON e.Id=s.ExamSessionId WHERE a.RosterVersionId=$DRAFT AND e.Date<>'2030-03-06' ORDER BY a.Id LIMIT 1")
FRESH=$(new_staff fresh1); FRESH2=$(new_staff fresh2)
call PUT "/api/rosters/$DRAFT/assignments/$A" "$COORD" "{\"newStaffId\":$SMOKE_STAFF}"
check "conflicting replacement returns 422 with a reason" '[ "$CODE" = 422 ] && [ -n "$(json "d[\"reason\"]")" ]'
call PUT "/api/rosters/$DRAFT/assignments/999999" "$COORD" "{\"newStaffId\":$FRESH}"
check "unknown assignment returns 404" '[ "$CODE" = 404 ]'
call PUT "/api/rosters/$DRAFT/assignments/$A" "$COORD" "{\"newStaffId\":$FRESH}"
check "valid draft replacement updates in place" '[ "$CODE" = 200 ] && [ "$(sql "SELECT StaffId FROM Assignments WHERE Id=$A AND RosterVersionId=$DRAFT")" = "$FRESH" ]'
call PUT "/api/rosters/$DRAFT/assignments/$A" "$COORD" "{\"newStaffId\":$FRESH}"
check "staff already in the slot returns 422" '[ "$CODE" = 422 ]'
call POST "/api/rosters/$DRAFT/publish" "$COORD"
check "publish returns version and vacancy warning" '[ "$CODE" = 200 ] && [ "$(sql "SELECT Status FROM RosterVersions WHERE Id=$DRAFT")" = Published ]'
call POST "/api/rosters/$DRAFT/publish" "$COORD"
check "publishing a published version returns 422" '[ "$CODE" = 422 ]'
BEFORE=$(snapshot "$DRAFT")
call PUT "/api/rosters/$DRAFT/assignments/$A" "$COORD" "{\"newStaffId\":$FRESH2}"
NEXT=$(json 'd["rosterVersionId"]')
check "replace after publish creates version N+1" '[ "$CODE" = 200 ] && [ "$NEXT" != "$DRAFT" ] && [ "$(json "d[\"versionNo\"]")" = "$(sql "SELECT MAX(VersionNo) FROM RosterVersions")" ]'
check "version N+1 holds the swap" '[ "$(sql "SELECT COUNT(*) FROM Assignments WHERE RosterVersionId=$NEXT AND StaffId=$FRESH2")" = 1 ]'
check "version N+1 has a Replace audit row" '[ "$(sql "SELECT COUNT(*) FROM AuditLogs WHERE RosterVersionId=$NEXT AND Action=\"Replace\" AND OldStaffId=$FRESH AND NewStaffId=$FRESH2")" = 1 ]'
check "published version N is byte-for-byte unchanged" '[ "$(snapshot "$DRAFT")" = "$BEFORE" ]'
call PUT "/api/rosters/$DRAFT/assignments/$A" "$COORD" "{\"newStaffId\":$FRESH}"
check "replacing in a non-latest published version returns 422" '[ "$CODE" = 422 ]'
call POST "/hubs/notifications/negotiate?negotiateVersion=1"
check "notification hub rejects anonymous clients" '[ "$CODE" = 401 ]'
call POST "/hubs/notifications/negotiate?negotiateVersion=1&access_token=$COORD"
check "notification hub accepts a JWT in the query string" '[ "$CODE" = 200 ]'

echo "== Phase 7: views"
call GET "/api/rosters/$NEXT?staffId=$FRESH2" "$COORD"
check "staff filter returns only that staff" '[ "$(json "len(d)==1 and all(r[\"staffId\"]==$FRESH2 for r in d)")" = True ]'
DAY=$(sql "SELECT e.Date FROM Assignments a JOIN Slots s ON s.Id=a.SlotId JOIN ExamSessions e ON e.Id=s.ExamSessionId WHERE a.RosterVersionId=$NEXT LIMIT 1")
call GET "/api/rosters/$NEXT?date=$DAY" "$COORD"
check "date filter returns the right rows" '[ "$(json "len(d)")" = "$(sql "SELECT COUNT(*) FROM Assignments a JOIN Slots s ON s.Id=a.SlotId JOIN ExamSessions e ON e.Id=s.ExamSessionId WHERE a.RosterVersionId=$NEXT AND e.Date=\"$DAY\"")" ] && [ "$(json "all(r[\"date\"]==\"$DAY\" for r in d)")" = True ]'
RM=$(sql "SELECT s.RoomId FROM Assignments a JOIN Slots s ON s.Id=a.SlotId WHERE a.RosterVersionId=$NEXT LIMIT 1")
call GET "/api/rosters/$NEXT?roomId=$RM" "$COORD"
check "room filter returns the right rows" '[ "$(json "len(d)")" = "$(sql "SELECT COUNT(*) FROM Assignments a JOIN Slots s ON s.Id=a.SlotId WHERE a.RosterVersionId=$NEXT AND s.RoomId=$RM")" ]'
call GET "/api/rosters/$NEXT/workload" "$COORD"
check "workload includes zero-duty staff" '[ "$(json "[(r[\"duties\"],r[\"totalHours\"]) for r in d if r[\"staffId\"]==$SMOKE_STAFF]==[(0,0)]")" = True ]'
HOURS=$(sql "SELECT ROUND(IFNULL(SUM(TIME_TO_SEC(TIMEDIFF(e.EndTime,e.StartTime)))/3600,0),2) FROM Assignments a JOIN Slots s ON s.Id=a.SlotId JOIN ExamSessions e ON e.Id=s.ExamSessionId WHERE a.RosterVersionId=$NEXT AND a.StaffId=$FRESH2")
check "workload hours are correct" '[ "$(json "[r[\"totalHours\"] for r in d if r[\"staffId\"]==$FRESH2][0]==float(\"$HOURS\")")" = True ]'
call GET "/api/rosters/$NEXT/vacancies" "$COORD"
check "vacancies match the database" '[ "$(json "len(d)")" = "$(sql "SELECT COUNT(*) FROM Vacancies WHERE RosterVersionId=$NEXT")" ]'
call GET "/api/rosters/$NEXT/audit" "$COORD"
check "audit shows the replacement with names" '[ "$(json "d[0][\"action\"]==\"Replace\" and d[0][\"newStaff\"]==\"fresh2\"")" = True ]'
call GET "/api/rosters/$NEXT/export" "$COORD"
check "export returns CSV with a header and one line per row" '[ "$(echo "$BODY" | head -1)" = "Date,Start,End,Course,Room,Staff" ] && [ "$(echo "$BODY" | wc -l)" = "$(sql "SELECT COUNT(*) + 1 FROM Assignments WHERE RosterVersionId=$NEXT")" ]'
call GET /api/rosters/999999/workload "$COORD"
check "unknown roster returns 404" '[ "$CODE" = 404 ]'
call POST /api/auth/login "" "{\"email\":\"fresh2-$RUN@edas.test\",\"password\":\"Fresh@123\"}"
FRESH2_TOKEN=$(json 'd["accessToken"]')
call POST /api/rosters/generate "$COORD"
call GET /api/my-duties "$FRESH2_TOKEN"
check "my-duties shows only own duties" '[ "$CODE" = 200 ] && [ "$(json "len(d)>0 and all(r[\"staffId\"]==$FRESH2 for r in d)")" = True ]'
IDS=$(json '",".join(str(r["assignmentId"]) for r in d)')
check "my-duties never shows a draft" '[ "$(sql "SELECT COUNT(*) FROM Assignments WHERE Id IN ($IDS) AND RosterVersionId<>$NEXT")" = 0 ]'
call GET /api/rosters "$FRESH2_TOKEN"
check "Faculty token gets 403 on /rosters" '[ "$CODE" = 403 ]'

echo "== Phase 8: seeded scenarios"
call POST /api/rosters/generate "$COORD"
V=$(json 'd["draftId"]')
duties_of() { sql "SELECT COUNT(*) FROM Assignments a JOIN Staff s ON s.Id=a.StaffId JOIN Slots sl ON sl.Id=a.SlotId JOIN ExamSessions e ON e.Id=sl.ExamSessionId JOIN Courses c ON c.Id=e.CourseId WHERE a.RosterVersionId=$V AND s.Email='$1' ${2:+AND c.Code='$2'} ${3:+AND e.Date='$3'}"; }
slot_staff() { sql "SELECT a.StaffId FROM Assignments a JOIN Slots sl ON sl.Id=a.SlotId JOIN ExamSessions e ON e.Id=sl.ExamSessionId JOIN Courses c ON c.Id=e.CourseId WHERE a.RosterVersionId=$V AND c.Code='$1' ORDER BY a.StaffId"; }
FILLED="SELECT COUNT(*) FROM Slots s WHERE s.Required=(SELECT COUNT(*) FROM Assignments a WHERE a.SlotId=s.Id AND a.RosterVersionId=$V)"
check "S1 most slots are completely filled" '[ "$(sql "$FILLED")" -ge 10 ]'
check "S2 nobody holds both the 9-12 and the 11-13 exam" '[ -n "$(slot_staff CS102)" ] && [ -z "$(comm -12 <(slot_staff CS101 | sort) <(slot_staff CS102 | sort))" ]'
check "S3 unavailable staff is never assigned on their day off" '[ "$(duties_of usman@edas.test "" 2030-03-05)" = 0 ]'
call GET "/api/rosters/$V/vacancies" "$COORD"
check "S4 Main Hall shortage shows a vacancy with reasons" '[ "$(json "[(v[\"missing\"]>0 and v[\"unavailableCount\"]>=1) for v in d if v[\"courseCode\"]==\"PH101\"]==[True]")" = True ]'
check "S5 staff with MaxDuties=1 gets exactly one duty" '[ "$(duties_of hina@edas.test)" = 1 ]'
call GET "/api/rosters/$V/workload" "$COORD"
check "S6 workload spreads hours across staff" '[ "$(json "len([r for r in d if r[\"totalHours\"]>0])>=10 and len({r[\"totalHours\"] for r in d})>1")" = True ]'
CLASH=$(sql "SELECT a.Id FROM Assignments a JOIN Slots sl ON sl.Id=a.SlotId JOIN ExamSessions e ON e.Id=sl.ExamSessionId JOIN Courses c ON c.Id=e.CourseId WHERE a.RosterVersionId=$V AND c.Code='CS102' LIMIT 1")
BUSY=$(slot_staff CS101 | head -1)
call PUT "/api/rosters/$V/assignments/$CLASH" "$COORD" "{\"newStaffId\":$BUSY}"
check "S7 a replacement that would clash is rejected with 422" '[ "$CODE" = 422 ] && json "d[\"reason\"]" | grep -q overlapping'

echo "== Phase 9: leave requests"
# A seeded faculty member with a duty on 2030-03-07 in draft $V and no leave yet on that day.
LEAVER=$(sql "SELECT s.Email FROM Assignments a JOIN Staff s ON s.Id=a.StaffId JOIN Slots sl ON sl.Id=a.SlotId JOIN ExamSessions e ON e.Id=sl.ExamSessionId WHERE a.RosterVersionId=$V AND e.Date='2030-03-07' AND s.Email NOT LIKE '%-%' AND NOT EXISTS (SELECT 1 FROM LeaveRequests l WHERE l.StaffId=s.Id AND l.Status<>'Rejected' AND l.StartDate<='2030-03-07' AND l.EndDate>='2030-03-07') LIMIT 1")
LEAVER_ID=$(sql "SELECT Id FROM Staff WHERE Email='$LEAVER'")
call POST /api/auth/login "" "{\"email\":\"$LEAVER\",\"password\":\"Faculty@123\"}"; LT=$(json 'd["accessToken"]')
leave() { call POST /api/leave-requests "$LT" "{\"startDate\":\"$1\",\"endDate\":\"$2\",\"reason\":\"${3:-}\"}"; }
leave 2020-01-01 2020-01-02
check "leave starting in the past returns 422" '[ "$CODE" = 422 ] && json "d[\"reason\"]" | grep -q past'
leave 2030-03-08 2030-03-07
check "leave ending before it starts returns 400" '[ "$CODE" = 400 ]'
call POST /api/leave-requests "$COORD" '{"startDate":"2030-03-07","endDate":"2030-03-07"}'
check "admin cannot request leave (403)" '[ "$CODE" = 403 ]'
leave 2030-03-07 2030-03-07 "Family event"
L=$(json 'd["id"]')
check "faculty requests leave (201, Pending)" '[ "$CODE" = 201 ] && [ "$(json "d[\"status\"]")" = Pending ]'
leave 2030-03-06 2030-03-07
check "overlapping leave returns 422" '[ "$CODE" = 422 ]'
call GET /api/leave-requests/mine "$LT"
check "faculty see their own request" '[ "$(json "[r[\"status\"] for r in d if r[\"id\"]==$L]")" = "['"'"'Pending'"'"']" ]'
call GET /api/leave-requests "$LT"
check "faculty cannot list all requests (403)" '[ "$CODE" = 403 ]'
call GET "/api/leave-requests?status=Pending" "$COORD"
check "admin sees the pending request with the staff name" '[ "$(json "[r[\"staffId\"] for r in d if r[\"id\"]==$L]")" = "[$LEAVER_ID]" ] && [ "$(json "all(r[\"status\"]==\"Pending\" for r in d)")" = True ]'
leave 2030-03-20 2030-03-20; L2=$(json 'd["id"]')
call DELETE "/api/leave-requests/$L2" "$LT"
check "faculty cancel a pending request (204)" '[ "$CODE" = 204 ] && [ "$(sql "SELECT COUNT(*) FROM LeaveRequests WHERE Id=$L2")" = 0 ]'
leave 2030-03-21 2030-03-21; L3=$(json 'd["id"]')
call POST "/api/leave-requests/$L3/reject" "$COORD" '{"note":"Exam week"}'
check "admin rejects with a note" '[ "$CODE" = 200 ] && [ "$(json "d[\"status\"]+\"|\"+d[\"decisionNote\"]")" = "Rejected|Exam week" ]'
call DELETE "/api/leave-requests/$L3" "$LT"
check "a decided request cannot be cancelled (422)" '[ "$CODE" = 422 ]'
call POST "/api/leave-requests/$L/approve" "$COORD"
check "approve returns the request and the affected duties" '[ "$CODE" = 200 ] && [ "$(json "d[\"request\"][\"status\"]")" = Approved ] && [ "$(json "any(a[\"rosterVersionId\"]==$V and a[\"date\"]==\"2030-03-07\" for a in d[\"affectedDuties\"])")" = True ]'
check "approval marks the leave day unavailable" '[ "$(sql "SELECT COUNT(*) FROM Unavailabilities WHERE StaffId=$LEAVER_ID AND Date=\"2030-03-07\" AND StartTime=\"00:00:00\"")" = 1 ]'
call POST "/api/leave-requests/$L/approve" "$COORD"
check "approving twice returns 422" '[ "$CODE" = 422 ]'
OTHER=$(sql "SELECT a.Id FROM Assignments a JOIN Slots sl ON sl.Id=a.SlotId JOIN ExamSessions e ON e.Id=sl.ExamSessionId WHERE a.RosterVersionId=$V AND e.Date='2030-03-07' AND a.StaffId<>$LEAVER_ID AND sl.Id NOT IN (SELECT SlotId FROM Assignments WHERE RosterVersionId=$V AND StaffId=$LEAVER_ID) LIMIT 1")
call PUT "/api/rosters/$V/assignments/$OTHER" "$COORD" "{\"newStaffId\":$LEAVER_ID}"
check "staff on approved leave cannot be given a duty that day (422)" '[ "$CODE" = 422 ] && json "d[\"reason\"]" | grep -q unavailable'

echo
if [ "$FAILS" -eq 0 ]; then echo "ALL CHECKS PASSED"; else echo "$FAILS CHECK(S) FAILED"; exit 1; fi
