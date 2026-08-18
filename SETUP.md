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

## 2. Groq (email drafting + extracting contacts from search results)

1. console.groq.com/keys → Create API key. Genuine free tier, no credit
   card required.
2. `.env.local`:
   ```
   GROQ_API_KEY=<paste here>
   ```

(Earlier versions of this used OpenAI, then Google Gemini, for this —
both ran into billing walls. Groq's free tier has no such gotchas for
plain chat completions.)

## 3. Tavily (web search for contact discovery)

1. tavily.com → sign up → API key is on your dashboard. Free tier (1,000
   searches/month), no credit card required.
2. `.env.local`:
   ```
   TAVILY_API_KEY=<paste here>
   ```

Discovery runs a Tavily search, then has Groq extract structured
contacts from the results — agency submission pages, brand
partnerships/press inboxes, named literary agents. It generally won't
find a specific individual marketing manager's private email if that
isn't published anywhere; expect a mix of named contacts and generic
team inboxes, and always sanity-check a contact before sending.

## 4. Outlook SMTP (send mail as you)

This is what lets the app send an email through your real Outlook account
— and only after you click "Approve & Send" on a specific draft. Nothing
sends automatically.

1. Sign in at https://account.microsoft.com/security with the account you
   want to send from.
2. Turn on two-step verification if it isn't already on (required for app
   passwords) under **Advanced security options**.
3. Under **Advanced security options** → **App passwords** → **Create a
   new app password** → copy it (shown only once).
4. `.env.local`:
   ```
   EMAIL_USER=<your outlook.com address>
   EMAIL_APP_PASSWORD=<paste the app password here>
   ```

## Running it

```
npm run dev
```

Then visit `/outreach` — start on the **Profile** tab (your bio/book/ask
feeds every drafted email), then **Discover**, then generate + review +
send from a contact's page.
