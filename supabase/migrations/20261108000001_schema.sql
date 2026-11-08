-- =====================================================================
-- VOLAILLE MANAGER — 0001 : Core schema
-- All monetary values use NUMERIC. Quantities are in KG, NUMERIC(14,3).
-- Every business row belongs to an owner (auth.users.id) and is
-- protected by Row Level Security (see 0002_security).
-- Historical financial records are never cascaded on delete.
-- =====================================================================

create extension if not exists pgcrypto;

create schema if not exists app_private;

-- ---------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------
create or replace function app_private.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- PROFILES & SETTINGS
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete restrict,
  full_name   text check (char_length(full_name) <= 120),
  phone       text check (char_length(phone) <= 40),
  locale      text not null default 'fr' check (locale in ('fr', 'ar')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.business_settings (
  owner_id                 uuid primary key references auth.users(id) on delete restrict,
  business_name            text not null default 'Volaille Manager' check (char_length(business_name) between 1 and 160),
  address                  text check (char_length(address) <= 300),
  city                     text check (char_length(city) <= 80),
  phone                    text check (char_length(phone) <= 40),
  email                    text check (char_length(email) <= 160),
  -- Moroccan identifiers: optional, entered by the owner, never fabricated.
  ice                      text check (char_length(ice) <= 40),
  rc                       text check (char_length(rc) <= 40),
  if_number                text check (char_length(if_number) <= 40),
  patente                  text check (char_length(patente) <= 40),
  logo_url                 text check (char_length(logo_url) <= 500),
  invoice_footer           text check (char_length(invoice_footer) <= 500),
  invoice_prefix           text not null default 'FAC' check (invoice_prefix ~ '^[A-Z0-9]{1,8}$'),
  order_prefix             text not null default 'VTE' check (order_prefix ~ '^[A-Z0-9]{1,8}$'),
  purchase_prefix          text not null default 'ACH' check (purchase_prefix ~ '^[A-Z0-9]{1,8}$'),
  payment_prefix           text not null default 'ENC' check (payment_prefix ~ '^[A-Z0-9]{1,8}$'),
  valuation_method         text not null default 'CUMP' check (valuation_method in ('CUMP', 'FIFO')),
  auto_invoice_on_delivery boolean not null default true,
  default_purchase_paid    boolean not null default false,
  low_stock_alerts         boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create table public.document_sequences (
  owner_id   uuid not null references auth.users(id) on delete restrict,
  doc_type   text not null check (doc_type in ('invoice', 'order', 'purchase', 'payment')),
  year       int  not null,
  last_value int  not null default 0 check (last_value >= 0),
  primary key (owner_id, doc_type, year)
);

-- ---------------------------------------------------------------------
-- PRODUCTS
-- stock_kg / avg_cost are a cache maintained exclusively by the stock
-- engine (SECURITY DEFINER functions). Clients cannot write them.
-- ---------------------------------------------------------------------
create table public.products (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users(id) on delete restrict,
  name            text not null check (char_length(btrim(name)) between 1 and 120),
  reference       text check (char_length(reference) <= 40),
  category        text check (char_length(category) <= 80),
  unit            text not null default 'KG' check (unit = 'KG'),
  purchase_price  numeric(12,2) not null default 0 check (purchase_price >= 0),
  sale_price      numeric(12,2) not null default 0 check (sale_price >= 0),
  min_stock_kg    numeric(14,3) not null default 0 check (min_stock_kg >= 0),
  description     text check (char_length(description) <= 1000),
  is_active       boolean not null default true,
  stock_kg        numeric(14,3) not null default 0 check (stock_kg >= 0),
  avg_cost        numeric(14,4) not null default 0 check (avg_cost >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index products_owner_name_uq on public.products (owner_id, lower(btrim(name)));
create unique index products_owner_ref_uq on public.products (owner_id, lower(reference)) where reference is not null and reference <> '';
create index products_owner_active_idx on public.products (owner_id, is_active);

create table public.product_price_history (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete restrict,
  product_id      uuid not null references public.products(id) on delete restrict,
  purchase_price  numeric(12,2) not null,
  sale_price      numeric(12,2) not null,
  changed_at      timestamptz not null default now()
);
create index product_price_history_product_idx on public.product_price_history (product_id, changed_at desc);

-- ---------------------------------------------------------------------
-- SUPPLIERS & CUSTOMERS
-- ---------------------------------------------------------------------
create table public.suppliers (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete restrict,
  name          text not null check (char_length(btrim(name)) between 1 and 160),
  contact_name  text check (char_length(contact_name) <= 120),
  phone         text check (char_length(phone) <= 40),
  address       text check (char_length(address) <= 300),
  email         text check (char_length(email) <= 160),
  notes         text check (char_length(notes) <= 1000),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index suppliers_owner_name_uq on public.suppliers (owner_id, lower(btrim(name)));

create table public.customers (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete restrict,
  name          text not null check (char_length(btrim(name)) between 1 and 160),
  contact_name  text check (char_length(contact_name) <= 120),
  phone         text check (char_length(phone) <= 40),
  address       text check (char_length(address) <= 300),
  notes         text check (char_length(notes) <= 1000),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index customers_owner_name_uq on public.customers (owner_id, lower(btrim(name)));

create table public.customer_product_prices (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users(id) on delete restrict,
  customer_id  uuid not null references public.customers(id) on delete restrict,
  product_id   uuid not null references public.products(id) on delete restrict,
  sale_price   numeric(12,2) not null check (sale_price >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (customer_id, product_id)
);

-- ---------------------------------------------------------------------
-- PURCHASES
-- ---------------------------------------------------------------------
create table public.purchases (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users(id) on delete restrict,
  reference        text not null,
  supplier_id      uuid not null references public.suppliers(id) on delete restrict,
  purchase_date    date not null,
  status           text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  total_amount     numeric(14,2) not null check (total_amount >= 0),
  payment_status   text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  payment_method   text check (payment_method in ('cash', 'bank_transfer', 'other')),
  paid_at          date,
  notes            text check (char_length(notes) <= 1000),
  idempotency_key  text,
  cancelled_at     timestamptz,
  cancel_reason    text,
  created_at       timestamptz not null default now(),
  unique (owner_id, reference),
  check ((payment_status = 'paid') = (paid_at is not null and payment_method is not null))
);
create unique index purchases_idem_uq on public.purchases (owner_id, idempotency_key) where idempotency_key is not null;
create index purchases_owner_date_idx on public.purchases (owner_id, purchase_date desc);
create index purchases_supplier_idx on public.purchases (supplier_id);

create table public.purchase_items (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete restrict,
  purchase_id  uuid not null references public.purchases(id) on delete restrict,
  product_id   uuid not null references public.products(id) on delete restrict,
  quantity_kg  numeric(14,3) not null check (quantity_kg > 0),
  unit_price   numeric(12,2) not null check (unit_price >= 0),
  line_total   numeric(14,2) not null check (line_total >= 0),
  check (line_total = round(quantity_kg * unit_price, 2))
);
create index purchase_items_purchase_idx on public.purchase_items (purchase_id);
create index purchase_items_product_idx on public.purchase_items (product_id);

-- ---------------------------------------------------------------------
-- INVENTORY
-- ---------------------------------------------------------------------
create table public.stock_lots (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users(id) on delete restrict,
  product_id        uuid not null references public.products(id) on delete restrict,
  purchase_item_id  uuid references public.purchase_items(id) on delete restrict,
  source            text not null check (source in ('purchase', 'adjustment')),
  lot_date          date not null,
  initial_kg        numeric(14,3) not null check (initial_kg > 0),
  remaining_kg      numeric(14,3) not null check (remaining_kg >= 0),
  unit_cost         numeric(14,4) not null check (unit_cost >= 0),
  created_at        timestamptz not null default now(),
  check (remaining_kg <= initial_kg)
);
create index stock_lots_fifo_idx on public.stock_lots (product_id, lot_date, created_at) where remaining_kg > 0;

create table public.stock_movements (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null references auth.users(id) on delete restrict,
  product_id            uuid not null references public.products(id) on delete restrict,
  movement_type         text not null check (movement_type in (
                          'purchase_in', 'purchase_cancel', 'sale_out', 'sale_return',
                          'damage_out', 'adjustment_in', 'adjustment_out')),
  movement_date         date not null,
  quantity_kg           numeric(14,3) not null check (quantity_kg <> 0),   -- signed: + in, - out
  unit_cost             numeric(14,4) not null check (unit_cost >= 0),
  total_cost            numeric(14,2) not null,                             -- signed like quantity
  balance_after_kg      numeric(14,3) not null check (balance_after_kg >= 0),
  purchase_id           uuid references public.purchases(id) on delete restrict,
  order_item_id         uuid,
  delivery_id           uuid,
  reverses_movement_id  uuid references public.stock_movements(id) on delete restrict,
  notes                 text check (char_length(notes) <= 500),
  created_at            timestamptz not null default now(),
  check ((movement_type in ('purchase_in', 'sale_return', 'adjustment_in')) = (quantity_kg > 0))
);
-- A movement can be reversed at most once.
create unique index stock_movements_reversal_uq on public.stock_movements (reverses_movement_id) where reverses_movement_id is not null;
create index stock_movements_product_idx on public.stock_movements (product_id, created_at desc);
create index stock_movements_owner_date_idx on public.stock_movements (owner_id, movement_date desc);

create table public.stock_lot_allocations (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete restrict,
  movement_id  uuid not null references public.stock_movements(id) on delete restrict,
  lot_id       uuid not null references public.stock_lots(id) on delete restrict,
  quantity_kg  numeric(14,3) not null check (quantity_kg > 0),
  unit_cost    numeric(14,4) not null check (unit_cost >= 0)
);
create index stock_lot_allocations_movement_idx on public.stock_lot_allocations (movement_id);

-- ---------------------------------------------------------------------
-- ORDERS / SALES
-- ---------------------------------------------------------------------
create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users(id) on delete restrict,
  reference        text not null,
  customer_id      uuid not null references public.customers(id) on delete restrict,
  order_date       date not null,
  status           text not null default 'confirmed' check (status in ('confirmed', 'delivered', 'cancelled')),
  subtotal         numeric(14,2) not null check (subtotal >= 0),
  discount_amount  numeric(14,2) not null default 0 check (discount_amount >= 0),
  total_amount     numeric(14,2) not null check (total_amount >= 0),
  notes            text check (char_length(notes) <= 1000),
  idempotency_key  text,
  cancelled_at     timestamptz,
  cancel_reason    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (owner_id, reference),
  check (discount_amount <= subtotal),
  check (total_amount = subtotal - discount_amount)
);
create unique index orders_idem_uq on public.orders (owner_id, idempotency_key) where idempotency_key is not null;
create index orders_owner_date_idx on public.orders (owner_id, order_date desc);
create index orders_customer_idx on public.orders (customer_id);

create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete restrict,
  order_id     uuid not null references public.orders(id) on delete restrict,
  product_id   uuid not null references public.products(id) on delete restrict,
  quantity_kg  numeric(14,3) not null check (quantity_kg > 0),
  unit_price   numeric(12,2) not null check (unit_price >= 0),
  line_total   numeric(14,2) not null check (line_total >= 0),
  -- Cost of goods sold, filled at delivery confirmation from the stock engine.
  unit_cost    numeric(14,4),
  cost_total   numeric(14,2),
  check (line_total = round(quantity_kg * unit_price, 2))
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

alter table public.stock_movements
  add constraint stock_movements_order_item_fk foreign key (order_item_id) references public.order_items(id) on delete restrict;

create table public.deliveries (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete restrict,
  order_id       uuid not null references public.orders(id) on delete restrict,
  customer_id    uuid not null references public.customers(id) on delete restrict,
  delivery_date  date not null,
  status         text not null default 'delivered' check (status in ('delivered', 'cancelled')),
  cogs_amount    numeric(14,2) not null default 0,
  notes          text check (char_length(notes) <= 1000),
  delivered_at   timestamptz not null default now(),
  cancelled_at   timestamptz,
  cancel_reason  text
);
-- Only one active delivery per order => stock deducted exactly once.
create unique index deliveries_active_order_uq on public.deliveries (order_id) where status = 'delivered';
create index deliveries_owner_date_idx on public.deliveries (owner_id, delivery_date desc);

alter table public.stock_movements
  add constraint stock_movements_delivery_fk foreign key (delivery_id) references public.deliveries(id) on delete restrict;

-- ---------------------------------------------------------------------
-- INVOICES
-- ---------------------------------------------------------------------
create table public.invoices (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users(id) on delete restrict,
  invoice_number    text not null,
  order_id          uuid not null references public.orders(id) on delete restrict,
  delivery_id       uuid references public.deliveries(id) on delete restrict,
  customer_id       uuid not null references public.customers(id) on delete restrict,
  invoice_date      date not null,
  status            text not null default 'unpaid' check (status in ('unpaid', 'paid', 'cancelled')),
  subtotal          numeric(14,2) not null check (subtotal >= 0),
  discount_amount   numeric(14,2) not null default 0 check (discount_amount >= 0),
  total_amount      numeric(14,2) not null check (total_amount >= 0),
  customer_snapshot jsonb not null,
  business_snapshot jsonb not null,
  paid_at           timestamptz,
  cancelled_at      timestamptz,
  cancel_reason     text,
  created_at        timestamptz not null default now(),
  unique (owner_id, invoice_number),
  check (total_amount = subtotal - discount_amount),
  check ((status = 'paid') = (paid_at is not null)),
  check ((status = 'cancelled') = (cancelled_at is not null))
);
-- One live invoice per order: prevents duplicate invoice creation.
create unique index invoices_live_order_uq on public.invoices (order_id) where status <> 'cancelled';
create index invoices_owner_date_idx on public.invoices (owner_id, invoice_date desc);
create index invoices_customer_status_idx on public.invoices (customer_id, status);

create table public.invoice_items (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete restrict,
  invoice_id    uuid not null references public.invoices(id) on delete restrict,
  product_id    uuid not null references public.products(id) on delete restrict,
  product_name  text not null,
  quantity_kg   numeric(14,3) not null check (quantity_kg > 0),
  unit_price    numeric(12,2) not null check (unit_price >= 0),
  line_total    numeric(14,2) not null check (line_total >= 0),
  check (line_total = round(quantity_kg * unit_price, 2))
);
create index invoice_items_invoice_idx on public.invoice_items (invoice_id);

-- ---------------------------------------------------------------------
-- PAYMENTS (collections). Full-invoice settlement only.
-- ---------------------------------------------------------------------
create table public.payments (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references auth.users(id) on delete restrict,
  reference          text not null,
  customer_id        uuid not null references public.customers(id) on delete restrict,
  payment_date       date not null,
  paid_at            timestamptz not null default now(),
  amount             numeric(14,2) not null check (amount > 0),
  method             text not null check (method in ('cash', 'bank_transfer', 'other')),
  external_reference text check (char_length(external_reference) <= 120),
  notes              text check (char_length(notes) <= 1000),
  idempotency_key    text,
  status             text not null default 'active' check (status in ('active', 'reversed')),
  reversed_at        timestamptz,
  reversal_reason    text,
  created_at         timestamptz not null default now(),
  unique (owner_id, reference),
  check ((status = 'reversed') = (reversed_at is not null))
);
create unique index payments_idem_uq on public.payments (owner_id, idempotency_key) where idempotency_key is not null;
create index payments_owner_date_idx on public.payments (owner_id, payment_date desc);
create index payments_customer_idx on public.payments (customer_id);

create table public.payment_allocations (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete restrict,
  payment_id   uuid not null references public.payments(id) on delete restrict,
  invoice_id   uuid not null references public.invoices(id) on delete restrict,
  amount       numeric(14,2) not null check (amount > 0),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  reversed_at  timestamptz,
  unique (payment_id, invoice_id)
);
-- An invoice can be settled by at most one active allocation => no double payment.
create unique index payment_allocations_active_invoice_uq on public.payment_allocations (invoice_id) where is_active;
create index payment_allocations_payment_idx on public.payment_allocations (payment_id);

-- ---------------------------------------------------------------------
-- EXPENSES & CASH
-- ---------------------------------------------------------------------
create table public.expense_categories (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete restrict,
  code        text check (code in ('transport', 'fuel', 'salaries', 'packaging', 'maintenance', 'other')),
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index expense_categories_owner_name_uq on public.expense_categories (owner_id, lower(btrim(name)));
create unique index expense_categories_owner_code_uq on public.expense_categories (owner_id, code) where code is not null;

create table public.expenses (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete restrict,
  category_id     uuid not null references public.expense_categories(id) on delete restrict,
  expense_date    date not null,
  amount          numeric(14,2) not null check (amount > 0),
  payment_method  text not null check (payment_method in ('cash', 'bank_transfer', 'other')),
  description     text not null check (char_length(btrim(description)) between 1 and 300),
  notes           text check (char_length(notes) <= 1000),
  status          text not null default 'active' check (status in ('active', 'cancelled')),
  cancelled_at    timestamptz,
  cancel_reason   text,
  created_at      timestamptz not null default now()
);
create index expenses_owner_date_idx on public.expenses (owner_id, expense_date desc);

create table public.cash_movements (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete restrict,
  movement_date  date not null,
  account        text not null check (account in ('cash', 'bank', 'other')),
  direction      text not null check (direction in ('in', 'out')),
  amount         numeric(14,2) not null check (amount > 0),
  source_type    text not null check (source_type in (
                   'customer_payment', 'customer_payment_reversal',
                   'expense', 'expense_cancellation',
                   'supplier_payment', 'supplier_payment_reversal',
                   'opening_balance', 'manual_in', 'manual_out')),
  payment_id     uuid references public.payments(id) on delete restrict,
  expense_id     uuid references public.expenses(id) on delete restrict,
  purchase_id    uuid references public.purchases(id) on delete restrict,
  description    text check (char_length(description) <= 300),
  created_at     timestamptz not null default now()
);
create index cash_movements_owner_date_idx on public.cash_movements (owner_id, movement_date desc);

-- ---------------------------------------------------------------------
-- DAILY CLOSINGS & AUDIT
-- ---------------------------------------------------------------------
create table public.daily_closings (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete restrict,
  closing_date  date not null,
  snapshot      jsonb not null,
  notes         text check (char_length(notes) <= 1000),
  closed_at     timestamptz not null default now(),
  unique (owner_id, closing_date)
);

create table public.audit_logs (
  id           bigint generated always as identity primary key,
  owner_id     uuid not null references auth.users(id) on delete restrict,
  action       text not null,
  entity_type  text not null,
  entity_id    uuid,
  details      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index audit_logs_owner_created_idx on public.audit_logs (owner_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
create trigger trg_profiles_touch before update on public.profiles for each row execute function app_private.touch_updated_at();
create trigger trg_settings_touch before update on public.business_settings for each row execute function app_private.touch_updated_at();
create trigger trg_products_touch before update on public.products for each row execute function app_private.touch_updated_at();
create trigger trg_suppliers_touch before update on public.suppliers for each row execute function app_private.touch_updated_at();
create trigger trg_customers_touch before update on public.customers for each row execute function app_private.touch_updated_at();
create trigger trg_cpp_touch before update on public.customer_product_prices for each row execute function app_private.touch_updated_at();
create trigger trg_orders_touch before update on public.orders for each row execute function app_private.touch_updated_at();
