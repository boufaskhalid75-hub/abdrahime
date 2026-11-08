# Database schema — Volaille Manager

PostgreSQL (Supabase). Migrations live in `supabase/migrations/` and must be applied in order:

| File | Content |
|---|---|
| `20261108000001_schema.sql` | Tables, constraints, indexes, `updated_at` triggers |
| `20261108000002_engine.sql` | Business engine (stock, purchases, orders, deliveries, invoices, payments, expenses, cash), protective & audit triggers |
| `20261108000003_reports.sql` | Views and reporting functions |
| `20261108000004_security.sql` | Grants, Row Level Security policies |

Conventions: UUID primary keys (`gen_random_uuid()`), `owner_id → auth.users(id) ON DELETE RESTRICT` on every
business table, `NUMERIC` for all money and quantities, no cascading deletes, `timestamptz` timestamps.

## Tables

| Table | Purpose | Key constraints |
|---|---|---|
| `profiles` | Owner profile (name, phone, locale) | PK = auth user id |
| `business_settings` | Business info, document prefixes, rules, valuation method | PK = owner_id; prefixes `^[A-Z0-9]{1,8}$`; method ∈ CUMP/FIFO |
| `document_sequences` | Per-year counters for invoice/order/purchase/payment numbers | PK (owner, type, year) |
| `products` | Catalogue (KG only); `stock_kg`, `avg_cost` = engine cache | unique name / reference per owner; stock ≥ 0 |
| `product_price_history` | Every indicative price change | — |
| `suppliers` | Suppliers | unique name per owner |
| `customers` | Boucheries | unique name per owner |
| `customer_product_prices` | Customer-specific selling price | unique (customer, product) |
| `purchases` | Supplier purchases + payment status | unique (owner, reference); idempotency key |
| `purchase_items` | Purchase lines | qty > 0; `line_total = round(qty × price, 2)` |
| `stock_lots` | One lot per purchase line / positive adjustment | 0 ≤ remaining ≤ initial |
| `stock_movements` | Signed inventory journal (+ in / − out) with cost | sign matches type; balance ≥ 0; unique `reverses_movement_id` |
| `stock_lot_allocations` | Which lots an outflow consumed | — |
| `orders` | Sales | `total = subtotal − discount`; 0 ≤ discount ≤ subtotal; idempotency key |
| `order_items` | Sale lines + cost of goods sold (filled at delivery) | `line_total = round(qty × price, 2)` |
| `deliveries` | Delivery events | **unique active delivery per order** |
| `invoices` | Immutable invoices with customer/business snapshots | unique number; **one live invoice per order**; status checks |
| `invoice_items` | Invoice lines (product name snapshot) | no UPDATE/DELETE (trigger) |
| `payments` | Collections | unique reference; idempotency key; status active/reversed |
| `payment_allocations` | Payment ↔ invoice | amount = invoice total (trigger); **one active allocation per invoice** |
| `expense_categories` | Categories (system codes + custom) | unique name per owner |
| `expenses` | Operating expenses | amount > 0 |
| `cash_movements` | Cash/bank journal | amount > 0; direction in/out; source type |
| `daily_closings` | Day snapshots | unique (owner, date) |
| `audit_logs` | Append-only audit trail | no UPDATE/DELETE |

Delete protection: a `BEFORE DELETE` trigger raises `VM:delete_forbidden` on all financial and master tables
(except `order_items` of not-yet-delivered orders and `customer_product_prices`). Records are archived (`is_active`)
or cancelled with a reason instead.

## Views (`security_invoker = true`)

- `v_invoice_balances` — invoice + paid amount + outstanding + age in days.
- `v_customer_balances` — per customer: invoiced, paid, outstanding, unpaid count, oldest unpaid, last invoice/payment.
- `v_product_stock` — per product: stock, value (per valuation method), purchased/sold/damaged/adjusted KG, low-stock flag.

## RPC functions (callable by the authenticated owner)

All are `SECURITY DEFINER` with `search_path` pinned, scope every statement to `auth.uid()`, and run in one transaction.

| Function | Effect |
|---|---|
| `ensure_owner_setup()` | Idempotent: profile, settings, default expense categories |
| `create_purchase(supplier, date, items, notes, paid, method, update_prices, idem_key)` | Purchase + lots + stock + optional cash out |
| `pay_purchase(id, method, date)` / `cancel_purchase(id, reason)` | Supplier payment / reversal |
| `adjust_stock(product, type, qty, date, notes, unit_cost)` | Loss or manual adjustment |
| `set_valuation_method(method)` | Only before any valued outflow |
| `create_order(customer, date, items, discount, notes, deliver_now, idem_key)` | Sale (+ delivery + invoice) |
| `update_order(id, date, items, discount, notes)` | Edit undelivered sale (or replace it) |
| `cancel_order(id, reason)` | Cancel undelivered sale |
| `confirm_delivery(order, date, notes)` | Deduct stock once, compute COGS, auto-invoice |
| `issue_invoice(order)` | Invoice a delivered sale (if auto-invoice is off) |
| `cancel_delivery(id, reason)` / `cancel_invoice(id, reason)` | Controlled reversal |
| `record_payment(customer, invoice_ids[], amount, method, date, ext_ref, notes, idem_key)` | Full-invoice settlement |
| `reverse_payment(id, reason)` | Auditable reversal |
| `create_expense(...)` / `cancel_expense(id, reason)` | Expense + cash movement |
| `record_cash_movement(date, account, direction, amount, kind, description)` | Opening balance / manual movement |
| `save_daily_closing(date, notes)` | Snapshot of `period_summary(date, date)` |

Reporting (`SECURITY INVOKER`, RLS applies): `period_summary(from, to)`, `sales_series(from, to, granularity)`,
`product_performance`, `customer_performance`, `supplier_performance`.

Internal helpers are in schema `app_private`, which is not exposed by the API and not usable by `anon`/`authenticated`.

## Security model

- `anon`: no privileges on any table, view or function.
- `authenticated`: `SELECT` on own rows (RLS `owner_id = auth.uid()`); column-restricted `INSERT/UPDATE` on master data
  (products — except `stock_kg`/`avg_cost`, suppliers, customers, customer prices, expense categories, settings — except
  `valuation_method`, profile); everything financial goes through the RPC functions above.
- Tested in `tests/db/engine.test.ts` ("security" block).

## Error codes

Engine errors are raised as `VM:<code>` (e.g. `VM:insufficient_stock`, `VM:amount_mismatch`) and translated in the UI
(`src/lib/errors.ts`, `errors.*` in the dictionaries).
