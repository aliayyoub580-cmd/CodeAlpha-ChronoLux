# Vyntra Social

Live site: https://vyntra-socila.vercel.app

## Overview

Vyntra Social is a lightweight social media web application built with Node.js and Supabase for authentication, storage, and database features. It includes feed, profile, post creation, likes, comments, follows, reposts, and sharing functionality.

## Features

- User registration and login (Supabase auth)
- Create, edit, and delete posts
- Like and comment on posts
- Follow/unfollow users
- Repost and share posts
- Image upload and storage (Supabase Storage)
- Server-side rendering for SEO (helpers in `utils/seoRenderer.js`)
- Daily News page with 10 keyless Hacker News stories stored in Supabase

## Daily news automation

Run `supabase/schema.sql` in the Supabase SQL editor after deploying this change. Set a long random `CRON_SECRET` in Vercel's environment variables. The Vercel cron job calls `/api/news/refresh` every day at 05:00 UTC, fetches ten stories from the keyless Hacker News Algolia API, and atomically replaces the previous day's rows.

## Project Structure (key files)

- `server/` — Express backend and API controllers
- `public/` — Static frontend HTML, CSS, JS, and assets
- `server/controllers/` — Route handlers (auth, post, profile, comment, like, follow, repost, share)
- `server/middleware/` — Auth and upload middleware
- `server/routes/` — API route definitions
- `utils/` — Helpers and Supabase client wrapper

## Tech Stack

- Node.js + Express
- Supabase (Auth, Postgres, Storage)
- Vanilla JS frontend served from `public/`

## Local Setup

Prerequisites:

- Node.js (v16+)
- npm
- A Supabase project (for production or local testing)

Quick start:

1. Install dependencies at project root and in `server/` if needed:

```bash
npm install
cd server && npm install
```

2. Create a `.env` file (in `server/` or root depending on your setup) with the required environment variables. Typical variables used by this project include:

- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_KEY` — service or anon key
- `PORT` — server port (default: 3000)

3. Initialize any database/storage using the provided scripts if you use Supabase locally or your project scripts:

```bash
node scripts/setup-supabase.js
```

4. Start the server (from root or `server/`, depending on how you run it):

```bash
node server/server.js
# or, if `server/package.json` defines scripts:
cd server && npm start
```

5. Open the site at `http://localhost:3000` (or the `PORT` you set).

Notes:

- If your project uses a different start command, check `package.json` at the project root and inside `server/` for `scripts` entries.
- The repo includes `scripts/setup-supabase.js` to help create tables and policies for Supabase; review and run it with caution.

## Deployment

The app is deployed on Vercel at: https://vyntra-socila.vercel.app

To deploy yourself:

1. Ensure environment variables are set in your Vercel (or chosen host) project settings.
2. Deploy the `public/` static site and the `server/` API as needed — Vercel supports both static and serverless functions; adapt `server/` to serverless functions if required, or deploy the backend to a platform that supports Node servers (e.g., Render, Heroku).

## Contributing

Contributions are welcome. Suggested workflow:

1. Fork the repo
2. Create a feature branch
3. Open a pull request with a clear description of changes

## Credit & License

Created by the Vyntra Social team. Please add a license file (`LICENSE`) if you intend to publish under a specific license.

## Contact

For questions or help, open an issue in the repository or contact the maintainer.

## Demo


https://github.com/user-attachments/assets/753fbcd5-c608-4756-bcd7-1f83907e4946



### Direct Download
<a href="https://raw.githubusercontent.com/aliayyoub580-cmd/CodeAlpha-ChronoLux/main/Vyntra%20Social/public/assets/Vyntra%20social.mp4" download>
  Download Video
</a>
