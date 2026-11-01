-- ============================================================================
-- ONE-TIME multi-tenant migration. Run this by hand, once, in the Supabase
-- SQL editor — it is NOT part of the idempotent supabase/schema.sql and is
-- not safe to re-run blindly (the backfill section in particular).
--
-- BEFORE RUNNING:
--   1. Make sure supabase/schema.sql has already been re-run at least once
--      since the "Multi-tenant migration, phase 1" section was added to it
--      (adds the nullable user_id columns this script depends on).
--   2. Sign up for a real account at /signup in the app.
--   3. Find your new user id:  select id, email from auth.users;
--   4. Paste that id into TARGET_USER_ID below, replacing the placeholder.
--   5. Take a backup first (Supabase Dashboard -> Database -> Backups, or
--      a quick pg_dump of the 5 tables below) — this UPDATEs real
--      production rows and there's no undo button.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1: Backfill every existing row (currently owned by nobody) onto your
-- new account.
-- ---------------------------------------------------------------------------
do $$
declare
  target_user_id uuid := '00000000-0000-0000-0000-000000000000'; -- <-- REPLACE THIS
begin
  if target_user_id = '00000000-0000-0000-0000-000000000000' then
    raise exception 'Replace the placeholder TARGET_USER_ID before running this script.';
  end if;

  update profile set user_id = target_user_id where user_id is null;
  update contacts set user_id = target_user_id where user_id is null;
  update saved_searches set user_id = target_user_id where user_id is null;
  update media_assets set user_id = target_user_id where user_id is null;
end $$;

-- ---------------------------------------------------------------------------
-- STEP 2: Lock the columns down now that every row has an owner, and rebuild
-- profile's primary key (singleton id=1 -> one row per user).
-- ---------------------------------------------------------------------------
alter table contacts alter column user_id set not null;
alter table saved_searches alter column user_id set not null;
alter table media_assets alter column user_id set not null;
alter table profile alter column user_id set not null;

alter table profile drop constraint if exists profile_singleton;
alter table profile drop constraint if exists profile_pkey;
alter table profile drop column if exists id;
alter table profile add constraint profile_pkey primary key (user_id);

-- ---------------------------------------------------------------------------
-- STEP 3: RLS policies. Only now — adding these before every row had an
-- owner would have hidden them from everyone, since auth.uid() = user_id is
-- never true against a null user_id.
--
-- outreach_emails and outreach_email_attachments have no user_id column of
-- their own; ownership is derived through their foreign keys instead (see
-- the comment in schema.sql for why).
-- ---------------------------------------------------------------------------
drop policy if exists "own rows" on profile;
create policy "own rows" on profile
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows" on contacts;
create policy "own rows" on contacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows" on saved_searches;
create policy "own rows" on saved_searches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows" on media_assets;
create policy "own rows" on media_assets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows" on outreach_emails;
create policy "own rows" on outreach_emails
  for all
  using (exists (
    select 1 from contacts c where c.id = contact_id and c.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from contacts c where c.id = contact_id and c.user_id = auth.uid()
  ));

drop policy if exists "own rows" on outreach_email_attachments;
create policy "own rows" on outreach_email_attachments
  for all
  using (
    exists (
      select 1 from outreach_emails e
      join contacts c on c.id = e.contact_id
      where e.id = email_id and c.user_id = auth.uid()
    )
    and exists (
      select 1 from media_assets m where m.id = media_asset_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from outreach_emails e
      join contacts c on c.id = e.contact_id
      where e.id = email_id and c.user_id = auth.uid()
    )
    and exists (
      select 1 from media_assets m where m.id = media_asset_id and m.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- STEP 4: Auto-create an empty profile row for every future signup.
-- security definer set search_path = public: without pinning search_path,
-- a security definer function is a known privilege-escalation vector.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profile (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
