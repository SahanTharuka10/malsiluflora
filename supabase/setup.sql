-- ==========================================================
-- Malsilu Flora · Supabase setup
-- Run this once in Supabase: SQL Editor → New query → paste → Run.
-- Before running, change the email at the bottom to your own.
-- Safe to run again; it won't delete your bouquets.
-- ==========================================================

-- Bouquets ---------------------------------------------------
create table if not exists public.bouquets (
  code        text primary key,                       -- e.g. ML-01
  name        text not null,
  description text not null default '',
  tags        text not null default '',                -- "Bridal bouquets / Wedding day"
  price       text not null default 'On request',      -- "25,000", "40,000 per set of 4" or "On request"
  category    text not null,                           -- an id from categories.js, e.g. cascade, car, stage
  image_path  text,                                    -- file name in the "bouquets" storage bucket
  sort_order  integer not null default 0,
  active      boolean not null default true,           -- false = hidden from the website
  updated_at  timestamptz not null default now()
);

-- categories are listed in categories.js; remove the old fixed list if an earlier setup added it
alter table public.bouquets drop constraint if exists bouquets_category_check;

create index if not exists bouquets_order_idx on public.bouquets (sort_order, code);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists bouquets_touch on public.bouquets;
create trigger bouquets_touch before update on public.bouquets
  for each row execute function public.touch_updated_at();

-- Admins (only these emails can change anything) -------------
create table if not exists public.admins (
  email text primary key
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

-- Row level security ----------------------------------------
alter table public.bouquets enable row level security;
alter table public.admins   enable row level security;

drop policy if exists "Anyone can see active bouquets" on public.bouquets;
create policy "Anyone can see active bouquets" on public.bouquets
  for select using (active or public.is_admin());

drop policy if exists "Admins can add bouquets" on public.bouquets;
create policy "Admins can add bouquets" on public.bouquets
  for insert with check (public.is_admin());

drop policy if exists "Admins can edit bouquets" on public.bouquets;
create policy "Admins can edit bouquets" on public.bouquets
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete bouquets" on public.bouquets;
create policy "Admins can delete bouquets" on public.bouquets
  for delete using (public.is_admin());

drop policy if exists "Admins can see admins" on public.admins;
create policy "Admins can see admins" on public.admins
  for select using (public.is_admin());

-- Photo storage (public to view, admins to change) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bouquets', 'bouquets', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true;

drop policy if exists "Admins can upload bouquet photos" on storage.objects;
create policy "Admins can upload bouquet photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'bouquets' and public.is_admin());

drop policy if exists "Admins can replace bouquet photos" on storage.objects;
create policy "Admins can replace bouquet photos" on storage.objects
  for update to authenticated using (bucket_id = 'bouquets' and public.is_admin());

drop policy if exists "Admins can delete bouquet photos" on storage.objects;
create policy "Admins can delete bouquet photos" on storage.objects
  for delete to authenticated using (bucket_id = 'bouquets' and public.is_admin());

drop policy if exists "Admins can list bouquet photos" on storage.objects;
create policy "Admins can list bouquet photos" on storage.objects
  for select to authenticated using (bucket_id = 'bouquets' and public.is_admin());

-- ↓↓↓ CHANGE THIS to the email you will log in to the admin page with ↓↓↓
insert into public.admins (email) values ('your-email@example.com')
on conflict do nothing;
