-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Campaigns Table
create table if not exists public.campaigns (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'finished')),
  slot_images text[] not null default '{}',
  winning_image text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Prizes Table
create table if not exists public.prizes (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  name text not null,
  total_quantity integer not null default 0,
  remaining_quantity integer not null default 0,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Participants Table
create table if not exists public.participants (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Plays (Results) Table
create table if not exists public.plays (
  id uuid default uuid_generate_v4() primary key,
  participant_id uuid references public.participants(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  won boolean not null default false,
  prize_id uuid references public.prizes(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Function to handle prize decrement atomically
create or replace function public.decrement_prize_quantity(prize_id_param uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_remaining integer;
begin
  update public.prizes
  set remaining_quantity = remaining_quantity - 1
  where id = prize_id_param and remaining_quantity > 0
  returning remaining_quantity into v_remaining;
  
  if found then
    return true;
  else
    return false;
  end if;
end;
$$;

-- RLS Setup (Assuming simple RLS where public can insert participant and play, but not create campaigns)
alter table public.campaigns enable row level security;
alter table public.prizes enable row level security;
alter table public.participants enable row level security;
alter table public.plays enable row level security;

-- NOTE: The actual RLS policies might require specific tuning 
-- (e.g., allow authenticated admins to read/write everything via Next.js server actions using Service Role key).
-- For now, allow public read-only for active campaigns and their prizes:
create policy "Allow public read-only access to active campaigns" on public.campaigns
  for select using (status = 'active');

create policy "Allow public read-only access to prizes of active campaigns" on public.prizes
  for select using (
    campaign_id in (select id from public.campaigns where status = 'active')
  );

-- Participants can insert their own record
create policy "Allow public insert on participants" on public.participants
  for insert with check (true);

-- Plays are typically inserted via edge functions or secure server actions to prevent cheating
create policy "Allow public insert on plays" on public.plays
  for insert with check (true);

-- For admin operations, you should use the Service Role Key in Next.js Server Actions 
-- which bypasses RLS, so no "admin" policies are strictly required if using that pattern.
