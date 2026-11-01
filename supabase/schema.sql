-- Outreach assistant schema.
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Uses the service role key server-side, so no RLS policies are required for
-- this single-user tool; RLS stays enabled with no policies, which blocks all
-- anon/public access by default and only the service role key can read/write.

create table if not exists profile (
  id int primary key default 1,
  bio text not null default '',
  book_title text not null default '',
  book_details text not null default '',
  links text not null default '',
  ask text not null default '',
  updated_at timestamptz not null default now(),
  constraint profile_singleton check (id = 1)
);

insert into profile (id) values (1) on conflict (id) do nothing;

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  title text not null default '',
  organization text not null default '',
  category text not null check (category in ('brand_marketing', 'literary_agent', 'grants_partnerships')),
  email text,
  source_url text,
  notes text not null default '',
  status text not null default 'new' check (status in ('new', 'drafted', 'approved', 'sent', 'replied', 'rejected')),
  reply_notes text not null default '',
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

-- Re-running this file on a database that already has the table (e.g. after
-- this feature was added) applies the new columns/status in place:
alter table contacts add column if not exists reply_notes text not null default '';
alter table contacts add column if not exists replied_at timestamptz;
alter table contacts drop constraint if exists contacts_status_check;
alter table contacts add constraint contacts_status_check
  check (status in ('new', 'drafted', 'approved', 'sent', 'replied', 'rejected'));
alter table contacts drop constraint if exists contacts_category_check;
alter table contacts add constraint contacts_category_check
  check (category in ('brand_marketing', 'literary_agent', 'grants_partnerships'));

create table if not exists outreach_emails (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  subject text not null default '',
  body text not null default '',
  status text not null default 'draft' check (status in ('draft', 'approved', 'sent', 'failed')),
  graph_message_id text,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists saved_searches (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('brand_marketing', 'literary_agent', 'grants_partnerships')),
  query text not null,
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_path text not null,
  content_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now()
);

create table if not exists outreach_email_attachments (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null references outreach_emails(id) on delete cascade,
  media_asset_id uuid not null references media_assets(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (email_id, media_asset_id)
);

-- Private storage bucket for uploaded attachments (headshots, book covers,
-- one-pagers). Created directly via SQL so there's no separate dashboard
-- step; only the service role key can read/write since it's not public.
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

alter table profile enable row level security;
alter table contacts enable row level security;
alter table outreach_emails enable row level security;
alter table saved_searches enable row level security;
alter table media_assets enable row level security;
alter table outreach_email_attachments enable row level security;

-- Multi-tenant migration, phase 1: nullable user_id columns.
-- Safe to re-run — this is deliberately NOT the full migration. Do not add
-- NOT NULL constraints or RLS policies here: doing that before every
-- existing row has been backfilled with a user_id would either fail (NOT
-- NULL on rows that are still null) or silently hide those rows from
-- everyone (an RLS policy of auth.uid() = user_id is never true against a
-- null). The backfill, NOT NULL lock-down, profile primary-key rebuild,
-- and RLS policies all live in supabase/migrate_to_multitenant.sql, run
-- by hand, once, after signing up for a real account.
--
-- outreach_emails and outreach_email_attachments deliberately do NOT get
-- their own user_id column — ownership is derived through their foreign
-- keys (contact_id -> contacts.user_id, and email_id/media_asset_id ->
-- their respective owners) in the RLS policies instead. A denormalized
-- user_id column on those tables could drift out of sync with the row it
-- actually points at, since a foreign key check runs with elevated
-- privilege and bypasses RLS — deriving ownership from the join removes
-- that gap entirely.
alter table profile add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table profile add column if not exists reply_to_email text;
alter table contacts add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table saved_searches add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table media_assets add column if not exists user_id uuid references auth.users(id) on delete cascade;
