-- MYHD IPTV MANDO - initial schema
-- Apply ONLY to the dedicated MYHD Supabase project, never to MANDO SPORT.
create extension if not exists pgcrypto;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('admin','customer')),
  created_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(12,2) not null check (price >= 0),
  old_price numeric(12,2) check (old_price is null or old_price >= 0),
  duration text,
  image_url text,
  featured boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_email text not null,
  plan_id uuid references public.plans(id) on delete set null,
  plan_name text not null,
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected','completed','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Invoker rights: authorization is evaluated under the signed-in user's RLS.
create or replace function public.is_myhd_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function public.is_myhd_admin() from public;
grant execute on function public.is_myhd_admin() to authenticated;

alter table public.user_roles enable row level security;
alter table public.plans enable row level security;
alter table public.subscription_orders enable row level security;

create policy "Users can read their own role"
on public.user_roles for select to authenticated
using (user_id = (select auth.uid()));

create policy "Public can read active plans"
on public.plans for select to anon, authenticated
using (active = true);

create policy "Admins manage plans"
on public.plans for all to authenticated
using ((select public.is_myhd_admin()))
with check ((select public.is_myhd_admin()));

create policy "Customers read their own orders"
on public.subscription_orders for select to authenticated
using (user_id = (select auth.uid()));

create policy "Customers create their own orders"
on public.subscription_orders for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Admins manage orders"
on public.subscription_orders for all to authenticated
using ((select public.is_myhd_admin()))
with check ((select public.is_myhd_admin()));

grant select on public.plans to anon, authenticated;
grant insert, update, delete on public.plans to authenticated;
grant select, insert on public.subscription_orders to authenticated;
grant update, delete on public.subscription_orders to authenticated;
grant select on public.user_roles to authenticated;

-- IMPORTANT: after creating your own account, promote its UUID to admin
-- from the Supabase SQL editor (replace the UUID):
-- insert into public.user_roles(user_id, role)
-- values ('YOUR_AUTH_USER_UUID', 'admin')
-- on conflict (user_id) do update set role = 'admin';
