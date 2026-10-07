# Supabase

The schema contract is [docs/06-database.md](../docs/06-database.md). The **Platform & Main** session owns this folder.

## Files

| File | Purpose |
|---|---|
| `migrations/20261007000000_init.sql` | Full initial schema: enums, tables, indexes, triggers, RLS, column privileges, realtime publication |
| `seed/demo.sql` | Optional demo chats and holdings for one existing user (looked up by email) |

## One-time project setup (owner, about 15 minutes)

1. **Create the project**: [supabase.com](https://supabase.com) → New project → name `aura-prod`. Pick the **EU (Frankfurt)** region and save the database password.
2. **Apply the schema**: SQL Editor → paste the whole `migrations/20261007000000_init.sql` → Run. Or use the CLI: `supabase link --project-ref <ref>` then `supabase db push`.
3. **Auth settings** (Authentication → Sign In / Providers, and URL Configuration):
   - Email provider: enabled. **Allow new users to sign up: off.** The app is invite-only.
   - Site URL: the Vercel production URL, for example `https://aura-invest.vercel.app`.
   - Redirect URLs: add `https://*.vercel.app/**` for previews and `http://localhost:3000/**` for local development.
4. **Create the user**: Authentication → Users → Add user, using the friend's email. Optionally set `display_name` in user metadata. The trigger creates their profile and the pinned "My Live Portfolio" chat.
5. **Optional demo data**: edit the email in `seed/demo.sql` and run it in the SQL Editor.
6. **Check Realtime**: Database → Publications → `supabase_realtime` should list `messages`, `chats` and `agent_runs`.
7. **Hand over the keys**:
   - Project Settings → API Keys: copy the **publishable** key (or legacy anon) to Vercel as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and the project URL as `NEXT_PUBLIC_SUPABASE_URL`.
   - In n8n, create the credential **"Aura Supabase"** (type Supabase API): Host = project URL, Service Role Secret = the **secret** key. Use the legacy `service_role` key if n8n rejects the new format.
   - In n8n, create the credential **"Aura Postgres"** (type Postgres) using the **Session pooler** connection (Project → Connect → Session pooler):
     - host `aws-0-<region>.pooler.supabase.com`;
     - port `5432`;
     - database `postgres`;
     - user `postgres.<project-ref>`;
     - your DB password;
     - SSL `require`.

     The direct connection is IPv6-only and may not be reachable from n8n Cloud.

## Rules

- Never edit an applied migration. Add `supabase/migrations/<UTC timestamp>_<change>.sql` and update `docs/06-database.md` and `docs/CHANGELOG.md` in the same PR.
- Keep RLS on for every new table. Add policies explicitly, and add column privileges when users may update only some columns.
- n8n bypasses RLS (secret key or table owner), so n8n workflows must always filter by `user_id` themselves.
