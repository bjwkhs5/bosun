# Bosun Setup

Four external services need credentials before the `/outreach` feature
works end to end. Nothing will run without these — the app will show a
clear error pointing at whichever one is missing.

## 1. Supabase (contacts + drafts storage)

1. Open your Supabase project (URL already in `.env.local`).
2. SQL Editor → New query → paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql) → Run.
3. Project Settings → API → copy the **service_role** key (not the anon
   key — this one bypasses RLS, keep it server-side only, never commit it).
4. Put it in `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=<paste here>
   ```

## 2. Cerebras (email drafting + extracting contacts from search results)

1. cloud.cerebras.ai → sign up (email works, no GitHub OAuth needed) →
   create an API key. Genuine free tier, no credit card required.
2. `.env.local`:
   ```
   CEREBRAS_API_KEY=<paste here>
   ```

(Earlier versions of this used OpenAI, then Gemini, then Groq — all hit
either billing walls or account-access issues. Cerebras's free tier has
no such gotchas for plain chat completions.)

## 3. Tavily (web search for contact discovery)

1. tavily.com → sign up → API key is on your dashboard. Free tier (1,000
   searches/month), no credit card required.
2. `.env.local`:
   ```
   TAVILY_API_KEY=<paste here>
   ```

Discovery runs a Tavily search, then has Cerebras extract structured
contacts from the results — agency submission pages, brand
partnerships/press inboxes, named literary agents. It generally won't
find a specific individual marketing manager's private email if that
isn't published anywhere; expect a mix of named contacts and generic
team inboxes, and always sanity-check a contact before sending.

## 4. Resend (send mail)

This is what lets the app actually send an email — only after you click
"Approve & Send" on a specific draft. Nothing sends automatically.

(Earlier versions of this used Outlook SMTP with an app password, but
Microsoft disables basic SMTP auth account-wide for many mailboxes now
— "SmtpClientAuthenticationDisabled" — which made that a dead end short
of the full Microsoft Graph OAuth flow. Resend's API sidesteps that.)

1. resend.com → sign up → create an API key. Free tier, no credit card
   required.
2. `.env.local`:
   ```
   RESEND_API_KEY=<paste here>
   ```
3. Without a verified sending domain, mail sends from
   `onboarding@resend.dev`, not your real address — replies go to
   `EMAIL_USER` via the reply-to header instead. To send *from* your own
   domain, verify it in the Resend dashboard (Domains → Add), then set:
   ```
   RESEND_FROM_EMAIL=You <you@yourdomain.com>
   ```

## Running it

```
npm run dev
```

Then visit `/outreach` — start on the **Profile** tab (your bio/book/ask
feeds every drafted email), then **Discover**, then generate + review +
send from a contact's page.
