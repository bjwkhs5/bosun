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

alter table profile enable row level security;
alter table contacts enable row level security;
alter table outreach_emails enable row level security;
