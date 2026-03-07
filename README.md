# Credit Card Benefit Tracker

Full-stack web app to track periodic credit card benefits (Amex, Chase, etc.) with Angular, .NET 8, and MongoDB.

## Prerequisites

- **.NET 8 SDK** – [Download](https://dotnet.microsoft.com/download)
- **Node.js** (LTS, e.g. 20.x) and **npm**
- **MongoDB** – local install or [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier)
- **Google Cloud** – project with OAuth 2.0 Client ID (Web application) for Google Sign-In

## Quick start

### 1. MongoDB

- **Local:** Start MongoDB (e.g. `brew services start mongodb-community` on macOS).
- **Atlas:** Create a cluster and copy the connection string. Use it in `appsettings.json` (see below).

### 2. Backend

```bash
cd src/CreditCardTracker.Api
dotnet restore
dotnet run
```

API runs at `http://localhost:5000`. Set in `appsettings.json` (or `appsettings.Development.json`):

- `MongoDb:ConnectionString` – e.g. `mongodb://localhost:27017` or your Atlas URI
- `MongoDb:DatabaseName` – e.g. `CreditCardTracker`
- `Google:ClientId` – your Google OAuth 2.0 Web client ID (e.g. `xxxx.apps.googleusercontent.com`)
- `Admin:AllowedAdminEmails` – comma-separated emails that can manage master cards (e.g. `you@gmail.com`)

### 3. Frontend

```bash
cd client
npm install
```

Set `googleClientId` in `src/environments/environment.ts` (same as backend `Google:ClientId`).

```bash
npm start
```

App runs at `http://localhost:4200`. Use “Sign in with Google”; then add cards to your wallet and track benefit usage.

### 4. Admin

Only users whose email is in `Admin:AllowedAdminEmails` see “Admin: Cards” and can create/edit/delete master cards and their benefits.

## Project layout

- **Backend:** `src/CreditCardTracker.Api/` – .NET 8 Web API, MongoDB.Driver, JWT Bearer (Google).
- **Frontend:** `client/` – Angular 19, Tailwind CSS, Google Sign-In, lazy-loaded routes.

## API (summary)

- `POST /api/auth/google` – body `{ "idToken": "..." }` – validate Google ID token, upsert user, return profile + `isAdmin`.
- `GET/POST/PUT/DELETE /api/mastercards` – CRUD master cards (GET list/card for all authenticated; create/update/delete for admins).
- `GET /api/usercards` – current user’s wallet (with master card details).
- `POST /api/usercards` – body `{ "masterCardId": "..." }` – add card to wallet.
- `GET /api/usercards/:id` – one user card with benefits.
- `POST /api/usercards/:id/benefits/:benefitId/claim` – record benefit usage for the current period (month/quarter/year).

Benefits use a period key (e.g. `2024-05`, `2024-Q1`, `2024`) so “Available” vs “Used” resets correctly by frequency.

## GitHub Pages (UI only)

The Angular UI can be deployed to GitHub Pages so it's available at **https://harsha-sanam.github.io/credit-card-app/**.

1. **Enable Pages from Actions**  
   In your repo: **Settings → Pages → Build and deployment → Source**: choose **GitHub Actions**.

2. **Push to `main`**  
   Pushing to `main` runs the workflow in `.github/workflows/deploy-pages.yml`: it builds the client with base href `/credit-card-app/` and deploys the output to GitHub Pages.

3. **Optional – local build**  
   To build the same artifact locally:
   ```bash
   cd client && npm run build:gh-pages
   ```
   Output is in `client/dist/client/browser`.

**Note:** Only the UI is hosted on GitHub Pages. The API and MongoDB must be hosted elsewhere (e.g. Render, Fly.io, MongoDB Atlas). Set the production API URL and Google Client ID in `client/src/environments/environment.production.ts` (or use build-time env) and ensure your API allows the origin `https://harsha-sanam.github.io`.
