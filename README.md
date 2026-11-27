# Exam Duties Allocation System (EDAS)

Software Construction CEP, Bahria University Karachi Campus (BSE-5B, Fall 2026).
Assigns teachers and staff to exam invigilation duties for an existing exam schedule.

## Repository layout
| Folder | Contents |
|---|---|
| `Backend/` | ASP.NET Core 8 API (C#, MVC controllers returning JSON), EF Core + MySQL, JWT auth, SignalR, xUnit tests |
| `frontend/` | React 18 + Vite + React-Bootstrap web app (admin and faculty screens, leave requests with live notifications), Playwright browser tests |

## Run the back end
Requirements: .NET 8 SDK, Docker Desktop.

```bash
# 1. MySQL 8 for EDAS (first time only; afterwards just: docker start edas-mysql)
docker run -d --name edas-mysql -v edas-mysql-data:/var/lib/mysql \
  -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=edas -p 3307:3306 mysql:8.0

# 2. API (creates the tables and sample data on first start)
cd Backend
dotnet tool restore
dotnet run --project Edas.Api --launch-profile http   # http://localhost:5080
```

Sample logins: `admin@edas.test` / `Admin@123` (admin), `ali@edas.test` / `Faculty@123` (faculty).

## Run the front end
Requirements: Node.js 20+. Keep the API running.

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 (forwards /api and /hubs to the API on port 5080)
```

## Test
- Website, step by step: `frontend/MANUAL-TESTING.txt`.
- API in Postman: import `Backend/postman/EDAS.postman_collection.json`, run **Auth → Login (admin)** first; step by step: `Backend/MANUAL-TESTING.txt`.
- Automatic:
  - `dotnet test` inside `Backend` (unit tests)
  - `bash Backend/scripts/smoke.sh` (API running; end-to-end API checks)
  - `npx playwright test` inside `frontend` (API and dev server running; browser tests in Microsoft Edge)

## API notes
- Base URL `http://localhost:5080/api`; send `Authorization: Bearer <accessToken>`.
- Access token lasts 15 minutes; call `POST /api/auth/refresh` with the refresh token (single use, 7 days).
- Live updates: SignalR hub `/hubs/notifications` (pass `?access_token=<token>`), event `DutiesRevised`.
- Requirement-to-code map and design notes: `Backend/VIVA.md`.

> `Backend/Edas.Api/appsettings.json` contains development-only values (MySQL `root/root`, a placeholder JWT key).
> Replace them with environment variables before any real deployment.
