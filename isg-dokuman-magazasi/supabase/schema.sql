-- İSG Doküman Marketi - başlangıç şeması
-- Supabase SQL Editor içinde çalıştırılmak üzere hazırlanmıştır.
-- Bu şema tek başına ödeme entegrasyonu kurmaz; iyzico doğrulaması Edge Function/server tarafında yapılmalıdır.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  slug text not null unique,
  title text not null,
  description text not null default '',
  format text not null check (format in ('Word','Excel','PDF','Word + Excel','Word + Excel + PDF')),
  price_kurus integer not null check (price_kurus >= 0),
  preview_pages jsonb not null default '[]'::jsonb,
  storage_path text not null,
  file_name text not null,
  is_published boolean not null default false,
  version_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded','cancelled')),
  total_kurus integer not null check (total_kurus >= 0),
  currency text not null default 'TRY',
  iyzico_payment_id text unique,
  iyzico_conversation_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_title_snapshot text not null,
  unit_price_kurus integer not null check (unit_price_kurus >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.download_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  downloaded_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.download_events enable row level security;

-- Katalog: ziyaretçiler yalnızca yayımlanmış ürünleri ve aktif kategorileri görebilir.
create policy "Public can read active categories"
on public.categories for select
using (is_active = true);

create policy "Public can read published products"
on public.products for select
using (is_published = true);

-- Kullanıcı kendi profilini görebilir ve güncelleyebilir.
create policy "Users read own profile"
on public.profiles for select to authenticated
using (auth.uid() = id);

create policy "Users update own profile"
on public.profiles for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Kullanıcılar yalnızca kendi siparişlerini görebilir. Sipariş oluşturma ve ödeme durumu
-- değişiklikleri sunucu/Edge Function tarafından yapılmalıdır; client INSERT/UPDATE policy yoktur.
create policy "Users read own orders"
on public.orders for select to authenticated
using (auth.uid() = user_id);

create policy "Users read own order items"
on public.order_items for select to authenticated
using (exists (
  select 1 from public.orders o
  where o.id = order_items.order_id and o.user_id = auth.uid()
));

create policy "Users read own download events"
on public.download_events for select to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-files', 'product-files', false, 52428800,
   array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('product-previews', 'product-previews', true, 5242880,
   array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

-- product-files private tutulur. Dosya indirme için client'a genel storage SELECT izni vermeyin.
-- Güvenli indirme: sunucu, siparişin paid olduğunu doğrular ve kısa ömürlü signed URL üretir.
-- Yönetici politikaları sonraki aşamada güvenilir admin rolü/claim veya ayrı admin tablosuyla eklenmelidir.
-- service_role anahtarını asla tarayıcı koduna koymayın.

insert into public.categories (name, slug, sort_order) values
 ('Risk değerlendirmesi','risk-degerlendirmesi',1),
 ('Saha denetimi','saha-denetimi',2),
 ('Eğitim','egitim',3),
 ('Takip tabloları','takip-tablolari',4)
on conflict (slug) do nothing;
