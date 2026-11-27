# EDAS Front End

React 18 + Vite + React-Bootstrap. Talks to the ASP.NET Core API in `../Backend`.

```bash
npm install
npm run dev        # http://localhost:5173 (forwards /api and /hubs to http://localhost:5080)
```

The back end must be running (`dotnet run --project Edas.Api --launch-profile http` inside `Backend`).

## Checks
```bash
npm run lint
npm run build
npx playwright test   # end-to-end tests in Microsoft Edge; API and dev server must be running
```
