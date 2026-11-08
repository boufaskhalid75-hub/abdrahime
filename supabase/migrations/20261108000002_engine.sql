-- =====================================================================
-- VOLAILLE MANAGER — 0002 : Business engine
-- All critical operations are PL/pgSQL functions executed in a single
-- transaction (atomic). Public RPC functions are SECURITY DEFINER and
-- always scope every statement to auth.uid() explicitly.
-- Errors are raised as 'VM:<code>' so the UI can translate them.
-- Rounding rules:
--   * line totals / money      : round(x, 2)  (half away from zero)
--   * unit costs (valuation)    : round(x, 4)
--   * quantities                : NUMERIC(14,3) KG
-- =====================================================================

-- ---------------------------------------------------------------------
-- Internal helpers (schema app_private is not exposed to the API)
-- ---------------------------------------------------------------------
create or replace function app_private.require_owner()
returns uuid language plpgsql stable as $$
declare v uuid := auth.uid();
begin
  if v is null then
    raise exception 'VM:not_authenticated' using errcode = '28000';
  end if;
  return v;
end $$;

create or replace function app_private.log(p_owner uuid, p_action text, p_entity text, p_entity_id uuid, p_details jsonb default '{}'::jsonb)
returns void language sql as $$
  insert into public.audit_logs (owner_id, action, entity_type, entity_id, details)
  values (p_owner, p_action, p_entity, p_entity_id, coalesce(p_details, '{}'::jsonb));
$$;

create or replace function app_private.method_account(p_method text)
returns text language sql immutable as $$
  select case p_method when 'cash' then 'cash' when 'bank_transfer' then 'bank' else 'other' end
$$;

create or replace function app_private.next_number(p_owner uuid, p_type text, p_date date)
returns text language plpgsql as $$
declare
  v_year   int := extract(year from p_date)::int;
  v_val    int;
  v_prefix text;
begin
  insert into public.document_sequences (owner_id, doc_type, year, last_value)
  values (p_owner, p_type, v_year, 1)
  on conflict (owner_id, doc_type, year)
  do update set last_value = public.document_sequences.last_value + 1
  returning last_value into v_val;

  select case p_type
           when 'invoice'  then invoice_prefix
           when 'order'    then order_prefix
           when 'purchase' then purchase_prefix
           else payment_prefix end
    into v_prefix
    from public.business_settings where owner_id = p_owner;

  return coalesce(v_prefix, upper(left(p_type, 3))) || '-' || v_year || '-' || lpad(v_val::text, 5, '0');
end $$;

create or replace function app_private.valuation_method(p_owner uuid)
returns text language sql stable as $$
  select coalesce((select valuation_method from public.business_settings where owner_id = p_owner), 'CUMP')
$$;

-- ---------------------------------------------------------------------
-- Protective triggers (defence in depth, apply to every role)
-- ---------------------------------------------------------------------
create or replace function app_private.forbid_delete()
returns trigger language plpgsql as $$
begin
  raise exception 'VM:delete_forbidden' using detail = tg_table_name;
end $$;

create or replace function app_private.forbid_update()
returns trigger language plpgsql as $$
begin
  raise exception 'VM:update_forbidden' using detail = tg_table_name;
end $$;

create or replace function app_private.guard_invoice_update()
returns trigger language plpgsql as $$
begin
  if new.invoice_number   is distinct from old.invoice_number
     or new.order_id      is distinct from old.order_id
     or new.customer_id   is distinct from old.customer_id
     or new.invoice_date  is distinct from old.invoice_date
     or new.subtotal      is distinct from old.subtotal
     or new.discount_amount is distinct from old.discount_amount
     or new.total_amount  is distinct from old.total_amount
     or new.customer_snapshot is distinct from old.customer_snapshot
     or new.business_snapshot is distinct from old.business_snapshot
     or new.owner_id      is distinct from old.owner_id then
    raise exception 'VM:invoice_immutable';
  end if;
  if old.status = 'cancelled' then
    raise exception 'VM:invoice_immutable';
  end if;
  if not ((old.status = 'unpaid' and new.status in ('paid', 'cancelled', 'unpaid'))
       or (old.status = 'paid'   and new.status in ('unpaid', 'paid'))) then
    raise exception 'VM:invalid_status_transition';
  end if;
  return new;
end $$;

create or replace function app_private.guard_allocation()
returns trigger language plpgsql as $$
declare v_inv public.invoices;
begin
  select * into v_inv from public.invoices where id = new.invoice_id;
  if v_inv.status <> 'unpaid' then
    raise exception 'VM:invoice_not_payable';
  end if;
  if new.amount <> v_inv.total_amount then
    raise exception 'VM:partial_payment_forbidden';
  end if;
  return new;
end $$;

create trigger trg_invoices_guard before update on public.invoices for each row execute function app_private.guard_invoice_update();
create trigger trg_allocations_guard before insert on public.payment_allocations for each row execute function app_private.guard_allocation();
create trigger trg_invoice_items_noupd before update on public.invoice_items for each row execute function app_private.forbid_update();
create trigger trg_purchase_items_noupd before update on public.purchase_items for each row execute function app_private.forbid_update();
create trigger trg_movements_noupd before update on public.stock_movements for each row execute function app_private.forbid_update();
create trigger trg_cash_noupd before update on public.cash_movements for each row execute function app_private.forbid_update();
create trigger trg_audit_noupd before update on public.audit_logs for each row execute function app_private.forbid_update();

do $$
declare t text;
begin
  foreach t in array array['purchases','purchase_items','stock_lots','stock_movements','stock_lot_allocations',
                           'orders','deliveries','invoices','invoice_items','payments','payment_allocations',
                           'expenses','cash_movements','audit_logs','daily_closings','products','suppliers',
                           'customers','product_price_history','expense_categories','business_settings','profiles']
  loop
    execute format('create trigger trg_%s_nodelete before delete on public.%I for each row execute function app_private.forbid_delete()', t, t);
  end loop;
end $$;

-- Generic audit trigger for master data edited directly by the owner.
create or replace function app_private.audit_row()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_owner uuid;
  v_id    uuid;
  v_diff  jsonb := '{}'::jsonb;
  k       text;
begin
  if tg_op = 'INSERT' then
    v_owner := (to_jsonb(new) ->> 'owner_id')::uuid;
    v_id := coalesce((to_jsonb(new) ->> 'id')::uuid, v_owner);
    v_diff := to_jsonb(new) - 'owner_id' - 'created_at' - 'updated_at';
  else
    v_owner := (to_jsonb(new) ->> 'owner_id')::uuid;
    v_id := coalesce((to_jsonb(new) ->> 'id')::uuid, v_owner);
    for k in select jsonb_object_keys(to_jsonb(new)) loop
      if k not in ('updated_at') and (to_jsonb(new) -> k) is distinct from (to_jsonb(old) -> k) then
        v_diff := v_diff || jsonb_build_object(k, jsonb_build_object('old', to_jsonb(old) -> k, 'new', to_jsonb(new) -> k));
      end if;
    end loop;
    if v_diff = '{}'::jsonb then return new; end if;
  end if;
  insert into public.audit_logs (owner_id, action, entity_type, entity_id, details)
  values (v_owner, lower(tg_op), tg_table_name, v_id, v_diff);
  return new;
end $$;

create trigger trg_products_audit after insert or update on public.products for each row execute function app_private.audit_row();
create trigger trg_suppliers_audit after insert or update on public.suppliers for each row execute function app_private.audit_row();
create trigger trg_customers_audit after insert or update on public.customers for each row execute function app_private.audit_row();
create trigger trg_cpp_audit after insert or update on public.customer_product_prices for each row execute function app_private.audit_row();
create trigger trg_settings_audit after update on public.business_settings for each row execute function app_private.audit_row();
create trigger trg_categories_audit after insert or update on public.expense_categories for each row execute function app_private.audit_row();

-- Price history: every change of the indicative prices is recorded.
create or replace function app_private.track_price_history()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT'
     or new.purchase_price is distinct from old.purchase_price
     or new.sale_price is distinct from old.sale_price then
    insert into public.product_price_history (owner_id, product_id, purchase_price, sale_price)
    values (new.owner_id, new.id, new.purchase_price, new.sale_price);
  end if;
  return new;
end $$;
create trigger trg_products_price_history after insert or update on public.products for each row execute function app_private.track_price_history();

-- ---------------------------------------------------------------------
-- OWNER SETUP (idempotent)
-- ---------------------------------------------------------------------
create or replace function public.ensure_owner_setup()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_owner uuid := app_private.require_owner();
begin
  insert into public.profiles (id) values (v_owner) on conflict (id) do nothing;
  insert into public.business_settings (owner_id) values (v_owner) on conflict (owner_id) do nothing;
  insert into public.expense_categories (owner_id, code, name)
  select v_owner, c.code, c.name
    from (values ('transport', 'Transport'), ('fuel', 'Carburant'), ('salaries', 'Salaires'),
                 ('packaging', 'Emballage'), ('maintenance', 'Entretien'), ('other', 'Autres dépenses')) as c(code, name)
   where not exists (select 1 from public.expense_categories e where e.owner_id = v_owner and e.code = c.code);
end $$;

-- ---------------------------------------------------------------------
-- STOCK ENGINE
-- Invariant: products.stock_kg = sum(stock_lots.remaining_kg) per product.
-- Lots are always consumed physically in FIFO order (traceability).
-- The COST of an outflow depends on the valuation method:
--   CUMP : quantity × current weighted average cost
--   FIFO : sum(quantity × lot unit cost) of the consumed lots
-- ---------------------------------------------------------------------
create or replace function app_private.set_product_stock(p_owner uuid, p_product uuid, p_new_stock numeric, p_value_delta numeric)
returns void language plpgsql as $$
-- p_value_delta : value entering (+) or leaving (-) the stock at a cost that
-- differs from the average (inflows, reversals, purchase cancellations).
-- Pass NULL for outflows valued at the average (CUMP average unchanged).
declare
  v_p   public.products;
  v_avg numeric;
begin
  select * into v_p from public.products where id = p_product and owner_id = p_owner;
  if app_private.valuation_method(p_owner) = 'FIFO' then
    select case when sum(remaining_kg) > 0 then sum(remaining_kg * unit_cost) / sum(remaining_kg) end
      into v_avg from public.stock_lots where product_id = p_product and remaining_kg > 0;
    v_avg := coalesce(v_avg, v_p.avg_cost);
  elsif p_value_delta is null or p_new_stock <= 0 then
    v_avg := v_p.avg_cost;
  else
    v_avg := greatest(0, (v_p.stock_kg * v_p.avg_cost + p_value_delta) / p_new_stock);
  end if;
  update public.products
     set stock_kg = p_new_stock, avg_cost = round(v_avg, 4)
   where id = p_product and owner_id = p_owner;
end $$;

create or replace function app_private.stock_in(
  p_owner uuid, p_product uuid, p_qty numeric, p_unit_cost numeric, p_type text, p_date date,
  p_purchase_id uuid default null, p_purchase_item_id uuid default null, p_notes text default null)
returns uuid language plpgsql as $$
declare
  v_p   public.products;
  v_mov uuid;
  v_qty numeric := round(p_qty, 3);
  v_cost numeric := round(p_unit_cost, 4);
begin
  if v_qty is null or v_qty <= 0 then raise exception 'VM:invalid_quantity'; end if;
  if v_cost is null or v_cost < 0 then raise exception 'VM:invalid_price'; end if;
  select * into v_p from public.products where id = p_product and owner_id = p_owner for update;
  if not found then raise exception 'VM:product_not_found'; end if;

  insert into public.stock_lots (owner_id, product_id, purchase_item_id, source, lot_date, initial_kg, remaining_kg, unit_cost)
  values (p_owner, p_product, p_purchase_item_id,
          case when p_type = 'purchase_in' then 'purchase' else 'adjustment' end,
          p_date, v_qty, v_qty, v_cost);

  insert into public.stock_movements (owner_id, product_id, movement_type, movement_date, quantity_kg, unit_cost,
                                      total_cost, balance_after_kg, purchase_id, notes)
  values (p_owner, p_product, p_type, p_date, v_qty, v_cost, round(v_qty * v_cost, 2),
          v_p.stock_kg + v_qty, p_purchase_id, p_notes)
  returning id into v_mov;

  perform app_private.set_product_stock(p_owner, p_product, v_p.stock_kg + v_qty, v_qty * v_cost);
  return v_mov;
end $$;

create or replace function app_private.stock_out(
  p_owner uuid, p_product uuid, p_qty numeric, p_type text, p_date date,
  p_order_item_id uuid default null, p_delivery_id uuid default null, p_notes text default null,
  out movement_id uuid, out unit_cost numeric, out total_cost numeric)
language plpgsql as $$
declare
  v_p        public.products;
  v_qty      numeric := round(p_qty, 3);
  v_left     numeric;
  v_take     numeric;
  v_fifo     numeric := 0;
  v_lot      record;
  v_lot_ids  uuid[] := '{}';
  v_lot_qty  numeric[] := '{}';
  v_lot_cost numeric[] := '{}';
  i          int;
begin
  if v_qty is null or v_qty <= 0 then raise exception 'VM:invalid_quantity'; end if;
  select * into v_p from public.products where id = p_product and owner_id = p_owner for update;
  if not found then raise exception 'VM:product_not_found'; end if;
  if v_p.stock_kg < v_qty then
    raise exception 'VM:insufficient_stock'
      using detail = json_build_object('product', v_p.name, 'available', v_p.stock_kg, 'requested', v_qty)::text;
  end if;

  v_left := v_qty;
  for v_lot in
    select l.id, l.remaining_kg, l.unit_cost from public.stock_lots l
     where l.product_id = p_product and l.owner_id = p_owner and l.remaining_kg > 0
     order by l.lot_date, l.created_at, l.id
     for update
  loop
    exit when v_left <= 0;
    v_take := least(v_lot.remaining_kg, v_left);
    update public.stock_lots set remaining_kg = remaining_kg - v_take where id = v_lot.id;
    v_lot_ids  := v_lot_ids  || v_lot.id;
    v_lot_qty  := v_lot_qty  || v_take;
    v_lot_cost := v_lot_cost || v_lot.unit_cost;
    v_fifo := v_fifo + v_take * v_lot.unit_cost;
    v_left := v_left - v_take;
  end loop;
  if v_left > 0 then
    raise exception 'VM:stock_inconsistency' using detail = v_p.name;
  end if;

  if app_private.valuation_method(p_owner) = 'FIFO' then
    total_cost := round(v_fifo, 2);
    unit_cost  := round(v_fifo / v_qty, 4);
  else
    unit_cost  := v_p.avg_cost;
    total_cost := round(v_qty * v_p.avg_cost, 2);
  end if;

  insert into public.stock_movements (owner_id, product_id, movement_type, movement_date, quantity_kg, unit_cost,
                                      total_cost, balance_after_kg, order_item_id, delivery_id, notes)
  values (p_owner, p_product, p_type, p_date, -v_qty, unit_cost, -total_cost, v_p.stock_kg - v_qty,
          p_order_item_id, p_delivery_id, p_notes)
  returning id into movement_id;

  for i in 1 .. coalesce(array_length(v_lot_ids, 1), 0) loop
    insert into public.stock_lot_allocations (owner_id, movement_id, lot_id, quantity_kg, unit_cost)
    values (p_owner, movement_id, v_lot_ids[i], v_lot_qty[i], v_lot_cost[i]);
  end loop;

  perform app_private.set_product_stock(p_owner, p_product, v_p.stock_kg - v_qty, null);
end $$;

-- Reverses an outflow exactly once (unique index on reverses_movement_id).
create or replace function app_private.reverse_stock_out(p_owner uuid, p_movement_id uuid, p_type text, p_date date, p_notes text default null)
returns uuid language plpgsql as $$
declare
  v_m   public.stock_movements;
  v_p   public.products;
  v_a   record;
  v_new uuid;
begin
  select * into v_m from public.stock_movements where id = p_movement_id and owner_id = p_owner for update;
  if not found then raise exception 'VM:movement_not_found'; end if;
  if v_m.quantity_kg >= 0 then raise exception 'VM:movement_not_reversible'; end if;
  if exists (select 1 from public.stock_movements where reverses_movement_id = p_movement_id) then
    raise exception 'VM:already_reversed';
  end if;

  select * into v_p from public.products where id = v_m.product_id and owner_id = p_owner for update;

  for v_a in select lot_id, quantity_kg from public.stock_lot_allocations where movement_id = p_movement_id loop
    update public.stock_lots set remaining_kg = remaining_kg + v_a.quantity_kg where id = v_a.lot_id;
  end loop;

  insert into public.stock_movements (owner_id, product_id, movement_type, movement_date, quantity_kg, unit_cost,
                                      total_cost, balance_after_kg, order_item_id, delivery_id, reverses_movement_id, notes)
  values (p_owner, v_m.product_id, p_type, p_date, -v_m.quantity_kg, v_m.unit_cost, -v_m.total_cost,
          v_p.stock_kg - v_m.quantity_kg, v_m.order_item_id, v_m.delivery_id, p_movement_id, p_notes)
  returning id into v_new;

  perform app_private.set_product_stock(p_owner, v_m.product_id, v_p.stock_kg - v_m.quantity_kg, -v_m.total_cost);
  return v_new;
end $$;

-- ---------------------------------------------------------------------
-- PURCHASES
-- p_items : [{ "product_id": uuid, "quantity_kg": number, "unit_price": number }]
-- ---------------------------------------------------------------------
create or replace function public.create_purchase(
  p_supplier_id uuid, p_purchase_date date, p_items jsonb,
  p_notes text default null, p_paid boolean default null, p_payment_method text default null,
  p_update_prices boolean default false, p_idempotency_key text default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_owner  uuid := app_private.require_owner();
  v_id     uuid;
  v_ref    text;
  v_total  numeric;
  v_paid   boolean;
  v_method text;
  v_item   record;
  v_pi     uuid;
begin
  if p_idempotency_key is not null then
    select id into v_id from public.purchases where owner_id = v_owner and idempotency_key = p_idempotency_key;
    if found then return v_id; end if;
  end if;
  if p_purchase_date is null then raise exception 'VM:invalid_date'; end if;
  if not exists (select 1 from public.suppliers where id = p_supplier_id and owner_id = v_owner and is_active) then
    raise exception 'VM:supplier_not_found';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'VM:no_items';
  end if;

  create temp table if not exists _vm_items (product_id uuid, quantity_kg numeric, unit_price numeric, ord int) on commit drop;
  truncate _vm_items;
  insert into _vm_items
  select (e ->> 'product_id')::uuid, round((e ->> 'quantity_kg')::numeric, 3), round((e ->> 'unit_price')::numeric, 2), o::int
    from jsonb_array_elements(p_items) with ordinality as t(e, o);

  if exists (select 1 from _vm_items where quantity_kg is null or quantity_kg <= 0) then raise exception 'VM:invalid_quantity'; end if;
  if exists (select 1 from _vm_items where unit_price is null or unit_price < 0) then raise exception 'VM:invalid_price'; end if;
  if exists (select 1 from _vm_items i where not exists (
               select 1 from public.products p where p.id = i.product_id and p.owner_id = v_owner and p.is_active)) then
    raise exception 'VM:product_not_found';
  end if;

  select sum(round(quantity_kg * unit_price, 2)) into v_total from _vm_items;
  v_paid := coalesce(p_paid, (select default_purchase_paid from public.business_settings where owner_id = v_owner), false);
  v_method := case when v_paid then coalesce(p_payment_method, 'cash') end;
  if v_method is not null and v_method not in ('cash', 'bank_transfer', 'other') then raise exception 'VM:invalid_method'; end if;

  v_ref := app_private.next_number(v_owner, 'purchase', p_purchase_date);
  insert into public.purchases (owner_id, reference, supplier_id, purchase_date, total_amount, payment_status,
                                payment_method, paid_at, notes, idempotency_key)
  values (v_owner, v_ref, p_supplier_id, p_purchase_date, v_total,
          case when v_paid then 'paid' else 'unpaid' end, v_method,
          case when v_paid then p_purchase_date end, nullif(btrim(p_notes), ''), p_idempotency_key)
  returning id into v_id;

  for v_item in select * from _vm_items order by product_id, ord loop
    insert into public.purchase_items (owner_id, purchase_id, product_id, quantity_kg, unit_price, line_total)
    values (v_owner, v_id, v_item.product_id, v_item.quantity_kg, v_item.unit_price, round(v_item.quantity_kg * v_item.unit_price, 2))
    returning id into v_pi;
    perform app_private.stock_in(v_owner, v_item.product_id, v_item.quantity_kg, v_item.unit_price, 'purchase_in',
                                 p_purchase_date, v_id, v_pi, v_ref);
    if p_update_prices then
      update public.products set purchase_price = v_item.unit_price where id = v_item.product_id and owner_id = v_owner;
    end if;
  end loop;

  if v_paid and v_total > 0 then
    insert into public.cash_movements (owner_id, movement_date, account, direction, amount, source_type, purchase_id, description)
    values (v_owner, p_purchase_date, app_private.method_account(v_method), 'out', v_total, 'supplier_payment', v_id, v_ref);
  end if;

  perform app_private.log(v_owner, 'create', 'purchase', v_id, jsonb_build_object('reference', v_ref, 'total', v_total, 'paid', v_paid));
  return v_id;
end $$;

create or replace function public.pay_purchase(p_purchase_id uuid, p_method text, p_date date)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_owner uuid := app_private.require_owner();
  v_p public.purchases;
begin
  select * into v_p from public.purchases where id = p_purchase_id and owner_id = v_owner for update;
  if not found then raise exception 'VM:purchase_not_found'; end if;
  if v_p.status <> 'confirmed' then raise exception 'VM:purchase_cancelled'; end if;
  if v_p.payment_status = 'paid' then raise exception 'VM:purchase_already_paid'; end if;
  if p_method not in ('cash', 'bank_transfer', 'other') then raise exception 'VM:invalid_method'; end if;
  if p_date is null then raise exception 'VM:invalid_date'; end if;

  update public.purchases set payment_status = 'paid', payment_method = p_method, paid_at = p_date where id = v_p.id;
  if v_p.total_amount > 0 then
    insert into public.cash_movements (owner_id, movement_date, account, direction, amount, source_type, purchase_id, description)
    values (v_owner, p_date, app_private.method_account(p_method), 'out', v_p.total_amount, 'supplier_payment', v_p.id, v_p.reference);
  end if;
  perform app_private.log(v_owner, 'pay', 'purchase', v_p.id, jsonb_build_object('method', p_method, 'amount', v_p.total_amount));
end $$;

create or replace function public.cancel_purchase(p_purchase_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_owner uuid := app_private.require_owner();
  v_p     public.purchases;
  v_lot   record;
  v_prod  public.products;
  v_today date := (now() at time zone 'Africa/Casablanca')::date;
begin
  if p_reason is null or btrim(p_reason) = '' then raise exception 'VM:reason_required'; end if;
  select * into v_p from public.purchases where id = p_purchase_id and owner_id = v_owner for update;
  if not found then raise exception 'VM:purchase_not_found'; end if;
  if v_p.status = 'cancelled' then raise exception 'VM:purchase_cancelled'; end if;

  -- Lock products first (consistent order), then lots.
  perform 1 from public.products where id in (select product_id from public.purchase_items where purchase_id = v_p.id)
     order by id for update;

  for v_lot in
    select l.* from public.stock_lots l join public.purchase_items pi on pi.id = l.purchase_item_id
     where pi.purchase_id = v_p.id order by l.product_id for update of l
  loop
    if v_lot.remaining_kg <> v_lot.initial_kg then
      raise exception 'VM:purchase_stock_used';
    end if;
    select * into v_prod from public.products where id = v_lot.product_id;
    update public.stock_lots set remaining_kg = 0 where id = v_lot.id;
    insert into public.stock_movements (owner_id, product_id, movement_type, movement_date, quantity_kg, unit_cost,
                                        total_cost, balance_after_kg, purchase_id, notes)
    values (v_owner, v_lot.product_id, 'purchase_cancel', v_today, -v_lot.initial_kg, v_lot.unit_cost,
            -round(v_lot.initial_kg * v_lot.unit_cost, 2), v_prod.stock_kg - v_lot.initial_kg, v_p.id, btrim(p_reason));
    perform app_private.set_product_stock(v_owner, v_lot.product_id, v_prod.stock_kg - v_lot.initial_kg,
                                          -(v_lot.initial_kg * v_lot.unit_cost));
  end loop;

  if v_p.payment_status = 'paid' and v_p.total_amount > 0 then
    insert into public.cash_movements (owner_id, movement_date, account, direction, amount, source_type, purchase_id, description)
    values (v_owner, v_today, app_private.method_account(v_p.payment_method), 'in', v_p.total_amount,
            'supplier_payment_reversal', v_p.id, v_p.reference);
  end if;

  update public.purchases set status = 'cancelled', cancelled_at = now(), cancel_reason = btrim(p_reason) where id = v_p.id;
  perform app_private.log(v_owner, 'cancel', 'purchase', v_p.id, jsonb_build_object('reason', p_reason));
end $$;

-- ---------------------------------------------------------------------
-- STOCK ADJUSTMENTS  (damage, manual corrections)
-- ---------------------------------------------------------------------
create or replace function public.adjust_stock(
  p_product_id uuid, p_type text, p_quantity_kg numeric, p_date date,
  p_notes text, p_unit_cost numeric default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_owner uuid := app_private.require_owner();
  v_p     public.products;
  v_mov   uuid;
  v_out   record;
begin
  if p_notes is null or btrim(p_notes) = '' then raise exception 'VM:reason_required'; end if;
  if p_date is null then raise exception 'VM:invalid_date'; end if;
  select * into v_p from public.products where id = p_product_id and owner_id = v_owner;
  if not found then raise exception 'VM:product_not_found'; end if;

  if p_type = 'adjustment_in' then
    v_mov := app_private.stock_in(v_owner, p_product_id, p_quantity_kg,
               coalesce(p_unit_cost, nullif(v_p.avg_cost, 0), v_p.purchase_price), 'adjustment_in', p_date, null, null, btrim(p_notes));
  elsif p_type in ('damage_out', 'adjustment_out') then
    select * into v_out from app_private.stock_out(v_owner, p_product_id, p_quantity_kg, p_type, p_date, null, null, btrim(p_notes));
    v_mov := v_out.movement_id;
  else
    raise exception 'VM:invalid_movement_type';
  end if;
  perform app_private.log(v_owner, p_type, 'stock_movement', v_mov,
                          jsonb_build_object('product_id', p_product_id, 'quantity_kg', p_quantity_kg, 'notes', p_notes));
  return v_mov;
end $$;

create or replace function public.set_valuation_method(p_method text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_owner uuid := app_private.require_owner();
  v_prod  record;
begin
  if p_method not in ('CUMP', 'FIFO') then raise exception 'VM:invalid_valuation_method'; end if;
  -- Never change retroactively: once any outflow has been valued, the method is locked.
  if exists (select 1 from public.stock_movements where owner_id = v_owner and quantity_kg < 0) then
    raise exception 'VM:valuation_locked';
  end if;
  update public.business_settings set valuation_method = p_method where owner_id = v_owner;
  for v_prod in select id, stock_kg from public.products where owner_id = v_owner loop
    update public.products p
       set avg_cost = coalesce((select round(sum(remaining_kg * unit_cost) / nullif(sum(remaining_kg), 0), 4)
                                  from public.stock_lots where product_id = v_prod.id and remaining_kg > 0), p.avg_cost)
     where p.id = v_prod.id;
  end loop;
  perform app_private.log(v_owner, 'set_valuation_method', 'business_settings', v_owner, jsonb_build_object('method', p_method));
end $$;

-- ---------------------------------------------------------------------
-- ORDERS / SALES
-- p_items : [{ "product_id": uuid, "quantity_kg": number, "unit_price": number|null }]
-- unit_price null => customer specific price, else product default price.
-- ---------------------------------------------------------------------
create or replace function app_private.load_order_items(p_owner uuid, p_customer uuid, p_items jsonb)
returns numeric language plpgsql as $$
declare v_sub numeric;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'VM:no_items';
  end if;
  create temp table if not exists _vm_oitems (product_id uuid, quantity_kg numeric, unit_price numeric, ord int) on commit drop;
  truncate _vm_oitems;
  insert into _vm_oitems
  select (e ->> 'product_id')::uuid, round((e ->> 'quantity_kg')::numeric, 3),
         round(nullif(e ->> 'unit_price', '')::numeric, 2), o::int
    from jsonb_array_elements(p_items) with ordinality as t(e, o);

  if exists (select 1 from _vm_oitems where quantity_kg is null or quantity_kg <= 0) then raise exception 'VM:invalid_quantity'; end if;
  if exists (select 1 from _vm_oitems i where not exists (
               select 1 from public.products p where p.id = i.product_id and p.owner_id = p_owner and p.is_active)) then
    raise exception 'VM:product_not_found';
  end if;
  update _vm_oitems i
     set unit_price = coalesce(
           (select cpp.sale_price from public.customer_product_prices cpp
             where cpp.customer_id = p_customer and cpp.product_id = i.product_id and cpp.owner_id = p_owner),
           (select p.sale_price from public.products p where p.id = i.product_id))
   where i.unit_price is null;
  if exists (select 1 from _vm_oitems where unit_price is null or unit_price < 0) then raise exception 'VM:invalid_price'; end if;
  select sum(round(quantity_kg * unit_price, 2)) into v_sub from _vm_oitems;
  return v_sub;
end $$;

create or replace function app_private.do_issue_invoice(p_owner uuid, p_order_id uuid)
returns uuid language plpgsql as $$
declare
  v_o   public.orders;
  v_d   public.deliveries;
  v_c   public.customers;
  v_s   public.business_settings;
  v_id  uuid;
  v_num text;
begin
  select * into v_o from public.orders where id = p_order_id and owner_id = p_owner for update;
  if not found then raise exception 'VM:order_not_found'; end if;
  if v_o.status <> 'delivered' then raise exception 'VM:order_not_delivered'; end if;
  if exists (select 1 from public.invoices where order_id = v_o.id and status <> 'cancelled') then
    raise exception 'VM:invoice_exists';
  end if;
  select * into v_d from public.deliveries where order_id = v_o.id and status = 'delivered';
  select * into v_c from public.customers where id = v_o.customer_id;
  select * into v_s from public.business_settings where owner_id = p_owner;

  v_num := app_private.next_number(p_owner, 'invoice', v_d.delivery_date);
  insert into public.invoices (owner_id, invoice_number, order_id, delivery_id, customer_id, invoice_date, subtotal,
                               discount_amount, total_amount, customer_snapshot, business_snapshot)
  values (p_owner, v_num, v_o.id, v_d.id, v_o.customer_id, v_d.delivery_date, v_o.subtotal, v_o.discount_amount, v_o.total_amount,
          jsonb_build_object('name', v_c.name, 'contact_name', v_c.contact_name, 'phone', v_c.phone, 'address', v_c.address),
          jsonb_build_object('business_name', v_s.business_name, 'address', v_s.address, 'city', v_s.city, 'phone', v_s.phone,
                             'email', v_s.email, 'ice', v_s.ice, 'rc', v_s.rc, 'if_number', v_s.if_number,
                             'patente', v_s.patente, 'logo_url', v_s.logo_url, 'invoice_footer', v_s.invoice_footer))
  returning id into v_id;

  insert into public.invoice_items (owner_id, invoice_id, product_id, product_name, quantity_kg, unit_price, line_total)
  select p_owner, v_id, oi.product_id, p.name, oi.quantity_kg, oi.unit_price, oi.line_total
    from public.order_items oi join public.products p on p.id = oi.product_id
   where oi.order_id = v_o.id
   order by p.name;

  perform app_private.log(p_owner, 'issue', 'invoice', v_id, jsonb_build_object('number', v_num, 'total', v_o.total_amount));
  return v_id;
end $$;

create or replace function app_private.do_confirm_delivery(p_owner uuid, p_order_id uuid, p_date date, p_notes text)
returns jsonb language plpgsql as $$
declare
  v_o    public.orders;
  v_del  uuid;
  v_inv  uuid;
  v_item record;
  v_out  record;
  v_cogs numeric := 0;
begin
  if p_date is null then raise exception 'VM:invalid_date'; end if;
  select * into v_o from public.orders where id = p_order_id and owner_id = p_owner for update;
  if not found then raise exception 'VM:order_not_found'; end if;
  if v_o.status <> 'confirmed' then raise exception 'VM:order_not_deliverable'; end if;

  insert into public.deliveries (owner_id, order_id, customer_id, delivery_date, notes)
  values (p_owner, v_o.id, v_o.customer_id, p_date, nullif(btrim(p_notes), ''))
  returning id into v_del;

  for v_item in select * from public.order_items where order_id = v_o.id order by product_id, id loop
    select * into v_out from app_private.stock_out(p_owner, v_item.product_id, v_item.quantity_kg, 'sale_out', p_date,
                                                   v_item.id, v_del, v_o.reference);
    update public.order_items set unit_cost = v_out.unit_cost, cost_total = v_out.total_cost where id = v_item.id;
    v_cogs := v_cogs + v_out.total_cost;
  end loop;

  update public.deliveries set cogs_amount = v_cogs where id = v_del;
  update public.orders set status = 'delivered' where id = v_o.id;
  perform app_private.log(p_owner, 'deliver', 'order', v_o.id, jsonb_build_object('delivery_id', v_del, 'cogs', v_cogs));

  if coalesce((select auto_invoice_on_delivery from public.business_settings where owner_id = p_owner), true) then
    v_inv := app_private.do_issue_invoice(p_owner, v_o.id);
  end if;
  return jsonb_build_object('order_id', v_o.id, 'delivery_id', v_del, 'invoice_id', v_inv);
end $$;

create or replace function public.create_order(
  p_customer_id uuid, p_order_date date, p_items jsonb,
  p_discount numeric default 0, p_notes text default null,
  p_deliver_now boolean default false, p_idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_owner uuid := app_private.require_owner();
  v_id    uuid;
  v_ref   text;
  v_sub   numeric;
  v_disc  numeric := round(coalesce(p_discount, 0), 2);
  v_res   jsonb;
begin
  if p_idempotency_key is not null then
    select id into v_id from public.orders where owner_id = v_owner and idempotency_key = p_idempotency_key;
    if found then
      return jsonb_build_object('order_id', v_id,
        'delivery_id', (select id from public.deliveries where order_id = v_id and status = 'delivered'),
        'invoice_id', (select id from public.invoices where order_id = v_id and status <> 'cancelled'),
        'duplicate', true);
    end if;
  end if;
  if p_order_date is null then raise exception 'VM:invalid_date'; end if;
  if not exists (select 1 from public.customers where id = p_customer_id and owner_id = v_owner and is_active) then
    raise exception 'VM:customer_not_found';
  end if;

  v_sub := app_private.load_order_items(v_owner, p_customer_id, p_items);
  if v_disc < 0 or v_disc > v_sub then raise exception 'VM:invalid_discount'; end if;

  v_ref := app_private.next_number(v_owner, 'order', p_order_date);
  insert into public.orders (owner_id, reference, customer_id, order_date, subtotal, discount_amount, total_amount, notes, idempotency_key)
  values (v_owner, v_ref, p_customer_id, p_order_date, v_sub, v_disc, v_sub - v_disc, nullif(btrim(p_notes), ''), p_idempotency_key)
  returning id into v_id;

  insert into public.order_items (owner_id, order_id, product_id, quantity_kg, unit_price, line_total)
  select v_owner, v_id, product_id, quantity_kg, unit_price, round(quantity_kg * unit_price, 2) from _vm_oitems order by ord;

  perform app_private.log(v_owner, 'create', 'order', v_id, jsonb_build_object('reference', v_ref, 'total', v_sub - v_disc));

  if p_deliver_now then
    v_res := app_private.do_confirm_delivery(v_owner, v_id, p_order_date, null);
  else
    v_res := jsonb_build_object('order_id', v_id, 'delivery_id', null, 'invoice_id', null);
  end if;
  return v_res;
end $$;

-- Editing a not-yet-delivered order. If the order already has stock history
-- (a previous, cancelled delivery), it is replaced by a new order so that the
-- history remains intact; otherwise its lines are replaced in place.
create or replace function public.update_order(
  p_order_id uuid, p_order_date date, p_items jsonb, p_discount numeric default 0, p_notes text default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_owner uuid := app_private.require_owner();
  v_o     public.orders;
  v_sub   numeric;
  v_disc  numeric := round(coalesce(p_discount, 0), 2);
  v_new   uuid;
  v_ref   text;
begin
  select * into v_o from public.orders where id = p_order_id and owner_id = v_owner for update;
  if not found then raise exception 'VM:order_not_found'; end if;
  if v_o.status <> 'confirmed' then raise exception 'VM:order_not_editable'; end if;
  if p_order_date is null then raise exception 'VM:invalid_date'; end if;

  v_sub := app_private.load_order_items(v_owner, v_o.customer_id, p_items);
  if v_disc < 0 or v_disc > v_sub then raise exception 'VM:invalid_discount'; end if;

  if exists (select 1 from public.stock_movements m join public.order_items oi on oi.id = m.order_item_id where oi.order_id = v_o.id) then
    v_ref := app_private.next_number(v_owner, 'order', p_order_date);
    update public.orders set status = 'cancelled', cancelled_at = now(), cancel_reason = 'replaced:' || v_ref where id = v_o.id;
    insert into public.orders (owner_id, reference, customer_id, order_date, subtotal, discount_amount, total_amount, notes)
    values (v_owner, v_ref, v_o.customer_id, p_order_date, v_sub, v_disc, v_sub - v_disc, nullif(btrim(p_notes), ''))
    returning id into v_new;
    insert into public.order_items (owner_id, order_id, product_id, quantity_kg, unit_price, line_total)
    select v_owner, v_new, product_id, quantity_kg, unit_price, round(quantity_kg * unit_price, 2) from _vm_oitems order by ord;
    perform app_private.log(v_owner, 'replace', 'order', v_o.id, jsonb_build_object('replaced_by', v_new, 'reference', v_ref));
    return v_new;
  end if;

  delete from public.order_items where order_id = v_o.id;
  insert into public.order_items (owner_id, order_id, product_id, quantity_kg, unit_price, line_total)
  select v_owner, v_o.id, product_id, quantity_kg, unit_price, round(quantity_kg * unit_price, 2) from _vm_oitems order by ord;
  update public.orders set order_date = p_order_date, subtotal = v_sub, discount_amount = v_disc,
                           total_amount = v_sub - v_disc, notes = nullif(btrim(p_notes), '')
   where id = v_o.id;
  perform app_private.log(v_owner, 'update', 'order', v_o.id, jsonb_build_object('total', v_sub - v_disc));
  return v_o.id;
end $$;

create or replace function public.cancel_order(p_order_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_owner uuid := app_private.require_owner();
  v_o public.orders;
begin
  if p_reason is null or btrim(p_reason) = '' then raise exception 'VM:reason_required'; end if;
  select * into v_o from public.orders where id = p_order_id and owner_id = v_owner for update;
  if not found then raise exception 'VM:order_not_found'; end if;
  if v_o.status = 'delivered' then raise exception 'VM:order_delivered_cancel_delivery_first'; end if;
  if v_o.status = 'cancelled' then raise exception 'VM:order_cancelled'; end if;
  update public.orders set status = 'cancelled', cancelled_at = now(), cancel_reason = btrim(p_reason) where id = v_o.id;
  perform app_private.log(v_owner, 'cancel', 'order', v_o.id, jsonb_build_object('reason', p_reason));
end $$;

create or replace function public.confirm_delivery(p_order_id uuid, p_delivery_date date, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  return app_private.do_confirm_delivery(app_private.require_owner(), p_order_id, p_delivery_date, p_notes);
end $$;

create or replace function public.issue_invoice(p_order_id uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
begin
  return app_private.do_issue_invoice(app_private.require_owner(), p_order_id);
end $$;

-- Controlled reversal of a delivery: stock is restored exactly once,
-- the unpaid invoice is cancelled, the order returns to 'confirmed'.
create or replace function public.cancel_delivery(p_delivery_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_owner uuid := app_private.require_owner();
  v_d     public.deliveries;
  v_inv   public.invoices;
  v_m     record;
  v_today date := (now() at time zone 'Africa/Casablanca')::date;
begin
  if p_reason is null or btrim(p_reason) = '' then raise exception 'VM:reason_required'; end if;
  select * into v_d from public.deliveries where id = p_delivery_id and owner_id = v_owner for update;
  if not found then raise exception 'VM:delivery_not_found'; end if;
  if v_d.status <> 'delivered' then raise exception 'VM:delivery_cancelled'; end if;
  perform 1 from public.orders where id = v_d.order_id for update;

  select * into v_inv from public.invoices where order_id = v_d.order_id and status <> 'cancelled' for update;
  if found then
    if v_inv.status = 'paid' then raise exception 'VM:invoice_paid_reverse_payment_first'; end if;
    update public.invoices set status = 'cancelled', cancelled_at = now(), cancel_reason = btrim(p_reason) where id = v_inv.id;
    perform app_private.log(v_owner, 'cancel', 'invoice', v_inv.id, jsonb_build_object('reason', p_reason, 'number', v_inv.invoice_number));
  end if;

  for v_m in select id from public.stock_movements
              where delivery_id = v_d.id and movement_type = 'sale_out'
                and not exists (select 1 from public.stock_movements r where r.reverses_movement_id = stock_movements.id)
              order by product_id
  loop
    perform app_private.reverse_stock_out(v_owner, v_m.id, 'sale_return', v_today, btrim(p_reason));
  end loop;

  update public.order_items set unit_cost = null, cost_total = null where order_id = v_d.order_id;
  update public.orders set status = 'confirmed' where id = v_d.order_id;
  update public.deliveries set status = 'cancelled', cancelled_at = now(), cancel_reason = btrim(p_reason) where id = v_d.id;
  perform app_private.log(v_owner, 'cancel', 'delivery', v_d.id, jsonb_build_object('reason', p_reason));
end $$;

-- Cancelling an invoice = controlled correction: the delivery is reversed
-- (stock restored), the order returns to 'confirmed' so it can be corrected
-- and delivered/invoiced again under a NEW invoice number.
create or replace function public.cancel_invoice(p_invoice_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_owner uuid := app_private.require_owner();
  v_inv public.invoices;
begin
  select * into v_inv from public.invoices where id = p_invoice_id and owner_id = v_owner for update;
  if not found then raise exception 'VM:invoice_not_found'; end if;
  if v_inv.status = 'cancelled' then raise exception 'VM:invoice_cancelled'; end if;
  if v_inv.status = 'paid' then raise exception 'VM:invoice_paid_reverse_payment_first'; end if;
  perform public.cancel_delivery(v_inv.delivery_id, p_reason);
end $$;

-- ---------------------------------------------------------------------
-- PAYMENTS : one payment settles one or several COMPLETE invoices.
-- ---------------------------------------------------------------------
create or replace function public.record_payment(
  p_customer_id uuid, p_invoice_ids uuid[], p_amount numeric, p_method text, p_payment_date date,
  p_external_reference text default null, p_notes text default null, p_idempotency_key text default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_owner uuid := app_private.require_owner();
  v_id    uuid;
  v_ref   text;
  v_count int;
  v_total numeric;
  v_inv   record;
begin
  if p_idempotency_key is not null then
    select id into v_id from public.payments where owner_id = v_owner and idempotency_key = p_idempotency_key;
    if found then return v_id; end if;
  end if;
  if p_payment_date is null then raise exception 'VM:invalid_date'; end if;
  if p_method is null or p_method not in ('cash', 'bank_transfer', 'other') then raise exception 'VM:invalid_method'; end if;
  if p_invoice_ids is null or coalesce(array_length(p_invoice_ids, 1), 0) = 0 then raise exception 'VM:no_invoices'; end if;
  if (select count(distinct x) from unnest(p_invoice_ids) x) <> array_length(p_invoice_ids, 1) then
    raise exception 'VM:duplicate_invoice_in_payment';
  end if;
  if not exists (select 1 from public.customers where id = p_customer_id and owner_id = v_owner) then
    raise exception 'VM:customer_not_found';
  end if;

  -- Lock the invoices (ordered => no deadlocks; concurrent double submit waits then fails).
  perform 1 from public.invoices where id = any(p_invoice_ids) and owner_id = v_owner order by id for update;

  select count(*), sum(total_amount) into v_count, v_total
    from public.invoices where id = any(p_invoice_ids) and owner_id = v_owner;
  if v_count <> array_length(p_invoice_ids, 1) then raise exception 'VM:invoice_not_found'; end if;
  if exists (select 1 from public.invoices where id = any(p_invoice_ids) and customer_id <> p_customer_id) then
    raise exception 'VM:invoice_other_customer';
  end if;
  if exists (select 1 from public.invoices where id = any(p_invoice_ids) and status <> 'unpaid') then
    raise exception 'VM:invoice_not_payable';
  end if;
  if round(p_amount, 2) <> v_total then
    raise exception 'VM:amount_mismatch' using detail = json_build_object('expected', v_total, 'received', p_amount)::text;
  end if;

  v_ref := app_private.next_number(v_owner, 'payment', p_payment_date);
  insert into public.payments (owner_id, reference, customer_id, payment_date, amount, method, external_reference, notes, idempotency_key)
  values (v_owner, v_ref, p_customer_id, p_payment_date, v_total, p_method,
          nullif(btrim(p_external_reference), ''), nullif(btrim(p_notes), ''), p_idempotency_key)
  returning id into v_id;

  for v_inv in select id, total_amount from public.invoices where id = any(p_invoice_ids) order by invoice_date, invoice_number loop
    insert into public.payment_allocations (owner_id, payment_id, invoice_id, amount) values (v_owner, v_id, v_inv.id, v_inv.total_amount);
    update public.invoices set status = 'paid', paid_at = now() where id = v_inv.id;
  end loop;

  insert into public.cash_movements (owner_id, movement_date, account, direction, amount, source_type, payment_id, description)
  values (v_owner, p_payment_date, app_private.method_account(p_method), 'in', v_total, 'customer_payment', v_id, v_ref);

  perform app_private.log(v_owner, 'create', 'payment', v_id,
                          jsonb_build_object('reference', v_ref, 'amount', v_total, 'invoices', to_jsonb(p_invoice_ids)));
  return v_id;
end $$;

create or replace function public.reverse_payment(p_payment_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_owner uuid := app_private.require_owner();
  v_p     public.payments;
  v_today date := (now() at time zone 'Africa/Casablanca')::date;
begin
  if p_reason is null or btrim(p_reason) = '' then raise exception 'VM:reason_required'; end if;
  select * into v_p from public.payments where id = p_payment_id and owner_id = v_owner for update;
  if not found then raise exception 'VM:payment_not_found'; end if;
  if v_p.status = 'reversed' then raise exception 'VM:payment_already_reversed'; end if;

  perform 1 from public.invoices where id in (select invoice_id from public.payment_allocations where payment_id = v_p.id)
    order by id for update;
  update public.invoices set status = 'unpaid', paid_at = null
   where id in (select invoice_id from public.payment_allocations where payment_id = v_p.id and is_active);
  update public.payment_allocations set is_active = false, reversed_at = now() where payment_id = v_p.id and is_active;
  update public.payments set status = 'reversed', reversed_at = now(), reversal_reason = btrim(p_reason) where id = v_p.id;

  insert into public.cash_movements (owner_id, movement_date, account, direction, amount, source_type, payment_id, description)
  values (v_owner, v_today, app_private.method_account(v_p.method), 'out', v_p.amount, 'customer_payment_reversal', v_p.id,
          v_p.reference || ' — ' || btrim(p_reason));
  perform app_private.log(v_owner, 'reverse', 'payment', v_p.id, jsonb_build_object('reason', p_reason, 'amount', v_p.amount));
end $$;

-- ---------------------------------------------------------------------
-- EXPENSES & CASH
-- ---------------------------------------------------------------------
create or replace function public.create_expense(
  p_category_id uuid, p_expense_date date, p_amount numeric, p_payment_method text,
  p_description text, p_notes text default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_owner uuid := app_private.require_owner();
  v_id uuid;
  v_amt numeric := round(p_amount, 2);
begin
  if not exists (select 1 from public.expense_categories where id = p_category_id and owner_id = v_owner) then
    raise exception 'VM:category_not_found';
  end if;
  if v_amt is null or v_amt <= 0 then raise exception 'VM:invalid_amount'; end if;
  if p_payment_method not in ('cash', 'bank_transfer', 'other') then raise exception 'VM:invalid_method'; end if;
  if p_expense_date is null then raise exception 'VM:invalid_date'; end if;
  if p_description is null or btrim(p_description) = '' then raise exception 'VM:description_required'; end if;

  insert into public.expenses (owner_id, category_id, expense_date, amount, payment_method, description, notes)
  values (v_owner, p_category_id, p_expense_date, v_amt, p_payment_method, btrim(p_description), nullif(btrim(p_notes), ''))
  returning id into v_id;
  insert into public.cash_movements (owner_id, movement_date, account, direction, amount, source_type, expense_id, description)
  values (v_owner, p_expense_date, app_private.method_account(p_payment_method), 'out', v_amt, 'expense', v_id, btrim(p_description));
  perform app_private.log(v_owner, 'create', 'expense', v_id, jsonb_build_object('amount', v_amt));
  return v_id;
end $$;

create or replace function public.cancel_expense(p_expense_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_owner uuid := app_private.require_owner();
  v_e public.expenses;
begin
  if p_reason is null or btrim(p_reason) = '' then raise exception 'VM:reason_required'; end if;
  select * into v_e from public.expenses where id = p_expense_id and owner_id = v_owner for update;
  if not found then raise exception 'VM:expense_not_found'; end if;
  if v_e.status = 'cancelled' then raise exception 'VM:expense_cancelled'; end if;
  update public.expenses set status = 'cancelled', cancelled_at = now(), cancel_reason = btrim(p_reason) where id = v_e.id;
  insert into public.cash_movements (owner_id, movement_date, account, direction, amount, source_type, expense_id, description)
  values (v_owner, (now() at time zone 'Africa/Casablanca')::date, app_private.method_account(v_e.payment_method), 'in',
          v_e.amount, 'expense_cancellation', v_e.id, v_e.description || ' — ' || btrim(p_reason));
  perform app_private.log(v_owner, 'cancel', 'expense', v_e.id, jsonb_build_object('reason', p_reason));
end $$;

create or replace function public.record_cash_movement(
  p_date date, p_account text, p_direction text, p_amount numeric, p_kind text, p_description text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_owner uuid := app_private.require_owner();
  v_id uuid;
  v_amt numeric := round(p_amount, 2);
  v_src text;
begin
  if p_account not in ('cash', 'bank', 'other') then raise exception 'VM:invalid_account'; end if;
  if p_direction not in ('in', 'out') then raise exception 'VM:invalid_direction'; end if;
  if v_amt is null or v_amt <= 0 then raise exception 'VM:invalid_amount'; end if;
  if p_date is null then raise exception 'VM:invalid_date'; end if;
  if p_description is null or btrim(p_description) = '' then raise exception 'VM:description_required'; end if;
  v_src := case
             when p_kind = 'opening_balance' and p_direction = 'in' then 'opening_balance'
             when p_kind = 'manual' then case p_direction when 'in' then 'manual_in' else 'manual_out' end
           end;
  if v_src is null then raise exception 'VM:invalid_movement_type'; end if;
  insert into public.cash_movements (owner_id, movement_date, account, direction, amount, source_type, description)
  values (v_owner, p_date, p_account, p_direction, v_amt, v_src, btrim(p_description))
  returning id into v_id;
  perform app_private.log(v_owner, 'create', 'cash_movement', v_id, jsonb_build_object('amount', v_amt, 'direction', p_direction, 'account', p_account));
  return v_id;
end $$;
