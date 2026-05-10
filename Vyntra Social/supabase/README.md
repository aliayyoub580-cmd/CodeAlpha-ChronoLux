# Supabase Setup

Run these files in the Supabase SQL editor in order:

1. `schema.sql`
2. `storage.sql`

Then enable Google OAuth in Supabase Auth providers and add your local redirect URL:

```text
http://localhost:3000/feed.html
```

Use `.env.example` as the template for the required project keys.

The provided `sb_secret_...` key can verify Auth/Admin access and create storage buckets through:

```bash
npm run setup:supabase
```

Supabase does not expose table creation through the project secret key. To apply the database SQL automatically, use the Supabase CLI with a personal access token plus database password, or run the SQL files in the dashboard SQL editor.
