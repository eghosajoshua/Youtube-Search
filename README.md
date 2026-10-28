# YouTube Search

A small YouTube video discovery app built to demonstrate the YouTube Data API, a React interface, and a PHP backend. Search results include video thumbnails, channel names, publication dates, and view counts.

## Features

- Search YouTube videos by keyword
- Sort results by relevance, date, views, or rating
- Filter by publication date
- Paginate through search results
- View video metadata and open a result on YouTube
- Add and verify personal YouTube API keys
- Rotate between multiple saved keys when a request encounters a retryable YouTube API error
- Authenticate users and manage accounts as an administrator

The interface also displays channel and view-count filter controls, but the current PHP search endpoint does not apply those values yet.

## Tech Stack

- React 19 and Vite
- Tailwind CSS
- PHP
- SQLite
- YouTube Data API v3

## Requirements

- Node.js and npm
- PHP with PDO SQLite and cURL support
- A Google API key with the YouTube Data API v3 enabled

## Local Setup

1. Install frontend dependencies:

   ```sh
   npm install
   ```

2. Start the PHP API server from the project root:

   ```sh
   cd server
   php -S 127.0.0.1:8080
   ```

   The SQLite database is created from `server/db/schema.sql` when the backend first connects.

3. In a second terminal, start Vite from the project root:

   ```sh
   npm run dev
   ```

4. Open the local URL printed by Vite, usually `http://localhost:5173/`.

Vite proxies `/api` requests to the PHP server at `127.0.0.1:8080`. Hot Module Replacement is disabled in `vite.config.ts`, so manually refresh the browser after frontend edits.

## Demo Login

- Username: `admin`
- Password: `admin123`

The default account is created on first successful login if it does not already exist. These public demo credentials are for local evaluation only; do not use them in a deployed or production environment.

After signing in, add a YouTube Data API key under **Settings** before searching. API keys are stored per user in the local SQLite database. Do not commit real API keys or database files to a public repository.

## Scripts

```sh
npm run dev    # Start the Vite development server
npm run build  # Build the frontend for production
npm run preview # Preview the production build
npm run lint   # Run ESLint
```

## Notes

- User creation and password-changing controls are currently disabled in the interface and backend.
- Search requests require authentication and at least one valid YouTube API key saved for the user.
- YouTube API quota and key restrictions apply to searches and key verification.
