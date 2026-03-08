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

The Angular UI is built and pushed to the **`docs/`** folder so it can be served from GitHub Pages at **https://harsha-sanam.github.io/credit-card-app/**.

1. **Use the `docs` folder as the Pages source**  
   In your repo: **Settings → Pages → Build and deployment → Source**: choose **Deploy from a branch**. Set **Branch** to `main` and **Folder** to **`/docs`**. Save.

2. **Push to `main`**  
   The workflow in `.github/workflows/deploy-pages.yml` runs on push to `main`: it builds the client with base href `/credit-card-app/`, copies the output to `docs/`, and commits and pushes `docs/`. After the first run, the UI will be live at the URL above.

3. **Optional – local build and copy to docs**  
   To build and update docs locally:
   ```bash
   cd client && npm run build:gh-pages
   rm -rf ../docs && mkdir -p ../docs && cp -r dist/client/browser/. ../docs/
   ```
   Then commit and push the `docs/` folder.

**Note:** Only the UI is hosted on GitHub Pages. The API and MongoDB must be hosted elsewhere (e.g. Render, Fly.io, MongoDB Atlas). Set the production API URL and Google Client ID in `client/src/environments/environment.production.ts` (or use build-time env) and ensure your API allows the origin `https://harsha-sanam.github.io`.

## Deploy API to Fly.io

The API can be deployed to [Fly.io](https://fly.io) (free tier available). From the repo root:

1. **Install Fly CLI**  
   See [fly.io/docs/hands-on/install-flyctl](https://fly.io/docs/hands-on/install-flyctl/).

2. **Login and create the app (first time only)**  
   ```bash
   fly auth login
   fly apps create credit-card-tracker-api
   ```
   If the name is taken, use e.g. `credit-card-tracker-api-YourName` and set the same name in `fly.toml` under `app = "..."`.

3. **Set secrets** (do this before the first deploy) (required; these are not in the repo)  
   ```bash
   fly secrets set MongoDb__ConnectionString="mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/"
   fly secrets set Google__ClientId="YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
   fly secrets set Admin__AllowedAdminEmails="your@gmail.com"
   ```
   Use your MongoDB Atlas URI (encode `@` in password as `%40`). The API reads these in production.

4. **Deploy**  
   ```bash
   fly deploy --config fly.toml
   ```

5. **Open the API**  
   ```bash
   fly open
   ```
   Your API will be at `https://credit-card-tracker-api.fly.dev` (or the app name in `fly.toml`). Use this URL as `apiUrl` in the Angular production environment and add `https://harsha-sanam.github.io` to your API CORS config if needed (the default allows all origins).

## Deploy API to Render.com

The repo includes a **root `Dockerfile`** so Render can build the API with Docker. You can also use native .NET (no Docker).

### Option A: Docker (recommended)

1. In [Render](https://render.com): **New → Web Service**, connect the `credit-card-app` repo.
2. **Settings:**
   - **Environment:** Docker (Render will use the root `Dockerfile`).
   - **Instance type:** Free (optional).
3. **Environment variables** (required):
   - `MongoDb__ConnectionString` = your MongoDB Atlas URI (encode `@` in password as `%40`)
   - `Google__ClientId` = your Google OAuth client ID
   - `Admin__AllowedAdminEmails` = e.g. `your@gmail.com`
4. Deploy. Render will run `docker build` from the repo root and start the container. The API listens on port **8080** (Render sets `PORT`; the app uses `ASPNETCORE_URLS=http://0.0.0.0:8080`).

### Option B: Native .NET (no Docker)

1. **New → Web Service**, connect the repo.
2. **Settings:**
   - **Root Directory:** `src/CreditCardTracker.Api`
   - **Build Command:** `dotnet publish -c Release -o out`
   - **Start Command:** `dotnet out/CreditCardTracker.Api.dll`
   - **Environment:** Add the same variables as above.
3. Render will build and run the API without Docker. Set the service port to **8080** if asked (or add env `ASPNETCORE_URLS=http://0.0.0.0:$PORT`).

Use the service URL (e.g. `https://credit-card-tracker-api.onrender.com`) as `apiUrl` in the Angular production environment.
