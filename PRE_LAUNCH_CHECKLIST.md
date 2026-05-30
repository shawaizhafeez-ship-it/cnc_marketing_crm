# Pre-launch checklist — CNC Marketing CRM

Complete before pointing production users at the app.

## Infrastructure

- [ ] Supabase project created (production)
- [ ] All migrations 001–014 applied without errors
- [ ] Vercel project connected to repo
- [ ] Production domain configured (if custom)
- [ ] `NEXT_PUBLIC_APP_URL` set to production URL

## Environment variables (Vercel)

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `SMTP_RENEWAL_HOST`, `SMTP_RENEWAL_PORT`, `SMTP_RENEWAL_USER`, `SMTP_RENEWAL_PASSWORD`
- [ ] `SMTP_MARKETING_HOST`, `SMTP_MARKETING_PORT`, `SMTP_MARKETING_USER`, `SMTP_MARKETING_PASSWORD`
- [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- [ ] `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- [ ] `GOOGLE_SHEET_ID`
- [ ] `CRON_SECRET` (generate: `openssl rand -hex 32`)
- [ ] `ALLOWED_EMAIL_DOMAIN=cncservices.net`

## Google Sheets

- [ ] Service account email shared on Renewals spreadsheet (Viewer)
- [ ] Worksheet `List Cleaned` has required columns (see Settings page)
- [ ] Manual sync from Settings succeeds
- [ ] Certificate count on Dashboard > 0 after sync

## SMTP

- [ ] Renewal SMTP test send works (create manual email or renewal campaign)
- [ ] Marketing SMTP test send works (marketing campaign or cron)
- [ ] CC to `admin@cncservices.net` received when enabled

## Auth & users

- [ ] First admin invited and promoted (`UPDATE profiles SET role = 'admin'`)
- [ ] Admin can access manual cron triggers on Settings
- [ ] Non-admin user can access app but not admin-only actions
- [ ] Non-`@cncservices.net` signup blocked

## Cron jobs (Vercel)

- [ ] `sync-sheets` — `*/30 * * * *` — last run successful in logs
- [ ] `send-renewals` — `*/5 * * * *` — pending renewal emails decrease when due
- [ ] `send-marketing` — `*/10 * * * *` — respects 100/day limit

## Functional smoke test

- [ ] Dashboard loads with stats, sync status, campaign progress
- [ ] Create renewal campaign for a test month
- [ ] Create marketing campaign with template + filters
- [ ] Send manual email → appears in Email Logs
- [ ] Pause / resume / cancel campaign actions work
- [ ] CSV export from Email Logs downloads correctly

## Code quality

- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run build` passes

## Security (see SECURITY.md)

- [ ] Service role key not exposed to client
- [ ] Cron routes reject unauthenticated requests
- [ ] RLS enabled on all tables
- [ ] SMTP passwords never in client bundle

## Post-launch

- [ ] Monitor Vercel cron execution logs for first 24 hours
- [ ] Monitor `sheet_sync_logs` and `email_logs` for failures
- [ ] Document admin contact for user invites and deactivations
