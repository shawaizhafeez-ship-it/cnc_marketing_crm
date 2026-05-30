# Auth Setup — @cncservices.net Only

This app enforces **four layers** of domain restriction:

| Layer | Where | What it does |
|-------|--------|--------------|
| 1 | Edge Function `auth-before-user-created` | Blocks signup before user is created |
| 2 | Postgres trigger `handle_new_user` | Rejects profile insert for wrong domain |
| 3 | `profiles_email_domain` CHECK | DB constraint on profiles.email |
| 4 | Next.js middleware + server actions | Validates domain on login and every request |

---

## 1. Apply database migrations

Run migrations **002** and **013** in Supabase SQL Editor (or `supabase db push`):

- `20260530100002_profiles.sql` — profiles table + trigger
- `20260530100013_auth_domain_enforcement.sql` — idempotent re-apply

Verify:

```sql
SELECT conname FROM pg_constraint WHERE conname = 'profiles_email_domain';
SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';
```

---

## 2. Deploy Edge Function

### Option A — Supabase CLI (recommended)

```bash
# From project root
cd /path/to/cnc_marketing_crm

# Login and link
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function (verify_jwt=false is set in supabase/config.toml)
supabase functions deploy auth-before-user-created
```

### Option B — Supabase Dashboard

1. Go to **Edge Functions** → **Create function**
2. Name: `auth-before-user-created`
3. Paste code from `supabase/functions/auth-before-user-created/index.ts`
4. **Disable “Enforce JWT Verification”** (Verify JWT = off)
5. Deploy

---

## 3. Configure Auth Hook

1. Open **Authentication** → **Auth Hooks** (or **Hooks** under Auth settings)
2. Click **Add hook** → **Before User Created**
3. Type: **HTTPS**
4. URL: your function URL, e.g.
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/auth-before-user-created
   ```
5. Copy the generated **Hook Secret** (format: `v1,whsec_...`)

### Set the hook secret on the Edge Function

```bash
# Create supabase/.env (do not commit)
echo 'BEFORE_USER_CREATED_HOOK_SECRET="v1,whsec_YOUR_SECRET"' > supabase/.env

supabase secrets set --env-file supabase/.env
```

Or in Dashboard: **Edge Functions** → `auth-before-user-created` → **Secrets** → add:

```
BEFORE_USER_CREATED_HOOK_SECRET = v1,whsec_...
```

---

## 4. Disable public signup (invite-only — recommended)

1. **Authentication** → **Providers** → **Email**
2. Turn **OFF** “Enable sign up” (or disable “Allow new users to sign up”)
3. Save

With signup disabled:
- Only admins can add users via **Authentication → Users → Invite user**
- Invited users receive an email to set their password
- The `before-user-created` hook still runs for invites and OAuth

### Invite a user

1. **Authentication** → **Users** → **Invite user**
2. Email must be `@cncservices.net` (e.g. `colleague@cncservices.net`)
3. After they accept, promote to admin if needed:

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'colleague@cncservices.net';
```

---

## 5. Enable public signup (optional)

If you prefer self-service signup (still @cncservices.net only):

1. Keep **Enable sign up** ON in Email provider settings
2. Users can use `/signup` in the app
3. Edge Function + DB trigger still block non-CNC domains

---

## 6. Test the hook

### Should ALLOW

```bash
# Sign up or invite with:
you@cncservices.net
```

### Should REJECT (403 / error message)

```
someone@gmail.com
user@cncservices.net.evil.com   # blocked by regex
```

Check Edge Function logs: **Edge Functions** → `auth-before-user-created` → **Logs**

---

## 7. Next.js auth files

| File | Purpose |
|------|---------|
| `lib/auth/validation.ts` | Regex + `validateEmailForAuth()` |
| `app/(auth)/actions.ts` | `signInWithEmail`, `signUpWithEmail`, `signOut` |
| `components/auth/login-form.tsx` | Client-side validation before submit |
| `components/auth/signup-form.tsx` | Signup with domain check (if enabled) |
| `middleware.ts` | Session refresh + route protection |
| `lib/supabase/middleware.ts` | `getUser()` + sign out invalid domains |

---

## 8. Environment variables

Add to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
ALLOWED_EMAIL_DOMAIN=cncservices.net
```

Hook secret lives **only** in Supabase Edge Function secrets — not in Next.js.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Hook returns 401 | Verify JWT is **disabled** on the function |
| “Invalid payload sent to hook” | Ensure rejection returns status **200** with `{ error: { message, http_code: 403 } }` in body |
| User created but no profile | Check trigger on `auth.users`; run migration 013 |
| Login works but wrong domain | Clear cookies; middleware should sign out non-CNC users |
| Profile query fails | Run all migrations; ensure RLS + user invited with CNC email |

---

## Security checklist

- [ ] Migrations 002 + 013 applied
- [ ] Edge Function deployed with Verify JWT **off**
- [ ] Before User Created hook wired to function URL
- [ ] `BEFORE_USER_CREATED_HOOK_SECRET` set on function
- [ ] Public signup disabled (if invite-only)
- [ ] First admin invited and role updated in `profiles`
- [ ] Service role key never exposed to client
