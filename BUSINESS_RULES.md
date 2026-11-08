# Business rules — Volaille Manager

This document describes the rules the application enforces. Every rule marked **(DB)** is enforced inside PostgreSQL
(functions, constraints, triggers), so it cannot be bypassed by the browser. Rules marked **(UI)** are conveniences.

## 1. Context

- Single user: the owner. Every row belongs to the owner's account (`owner_id`) and is isolated by Row Level Security.
- ~5 products, all bought and sold **by kilogram**. No transformation, cutting or manufacturing.
- 2–3 suppliers, many butcher-shop customers (boucheries).
- The owner configures product, supplier and customer names; nothing is pre-filled.

## 2. Prices

- Each product has an *indicative* purchase price and selling price. They are only **defaults** for new documents. (DB)
- Every change of indicative price is recorded in `product_price_history`. (DB)
- Purchase lines, order lines and invoice lines store their own unit price. Changing a product price never modifies past
  transactions. Invoice lines also store a snapshot of the product name. (DB)
- A customer may have a specific selling price per product (`customer_product_prices`). When a sale line is created
  without a price, the engine uses: customer-specific price → product default price. The owner can always type
  another price on the sale. (DB + UI)
- Optional order-level discount in DH, between 0 and the subtotal. (DB)

## 3. Rounding

| Value | Precision | Rule |
|---|---|---|
| Quantity | 3 decimals (grams) | `numeric(14,3)` |
| Unit prices | 2 decimals | `numeric(12,2)` |
| Line total | 2 decimals | `round(quantity × unit price, 2)` — half away from zero, enforced by a CHECK constraint |
| Document total | 2 decimals | sum of rounded line totals − discount |
| Unit cost (valuation) | 4 decimals | `numeric(14,4)` |
| Cost of an outflow | 2 decimals | `round(qty × cost, 2)` |

The UI preview (`src/lib/finance.ts`) uses integer arithmetic to reproduce exactly the same results; both are pinned by tests.

## 4. Purchases

- A confirmed purchase atomically: saves the purchase and its lines, creates one **stock lot** per line, records a
  `purchase_in` stock movement, updates stock and average cost. Any invalid line aborts the whole purchase. (DB)
- Purchase reference: `ACH-YYYY-00001` (prefix configurable), sequential per year. (DB)
- **Supplier payment is configurable** (the owner's real practice was not specified): a purchase is either paid
  immediately (cash/bank/other → cash outflow) or recorded as *unpaid* and paid later with "Payer le fournisseur".
  The default is set in Paramètres. Supplier balance = sum of unpaid confirmed purchases. (DB)
- A purchase can be cancelled (with mandatory reason) only if none of its stock has been used. Cancellation removes its
  lots from stock and, if it was paid, records a reversing cash entry. (DB)
- Duplicate submissions of the same form (double click, network retry) are ignored using an idempotency key. (DB)

## 5. Inventory & valuation

- Stock increases only through confirmed purchases (or positive adjustments) and decreases only through confirmed
  deliveries (or losses / negative adjustments). (DB)
- **Negative stock is always prevented**: a delivery for more than the available quantity is refused. (DB)
- Invariant, tested: `products.stock_kg = Σ stock_lots.remaining_kg = Σ stock_movements.quantity_kg`.
- Lots are consumed physically in FIFO order (oldest first) for traceability, whatever the valuation method.
- **Valuation method** (Paramètres):
  - **CUMP** (default, recommended): cost of an outflow = quantity × current weighted average cost. Recommended when
    goods from different purchases are mixed and cannot be told apart — the usual situation for chilled poultry.
  - **FIFO**: cost of an outflow = cost of the oldest lots consumed.
  - The method is **locked** as soon as one outflow has been valued; changing it afterwards would rewrite history and
    requires a controlled migration (documented, not automated). (DB)
- Losses (`damage_out`) and manual adjustments require a reason and are valued at the method's cost. (DB)
- *Owner decision to confirm*: which method matches physical practice. CUMP is pre-selected; switch to FIFO in
  Paramètres **before** the first delivery if lots are kept separate.

## 6. Sales, deliveries, invoices

- Sale (order) statuses: `confirmed` (À livrer) → `delivered` (Livrée), or `cancelled`. (DB)
- A sale can be created and delivered in one step ("Livrée maintenant", the default), or delivered later.
- **Stock is deducted exactly once, at delivery confirmation**. A second confirmation is refused; a unique index
  guarantees one active delivery per order. (DB)
- At delivery the cost of goods sold is computed per line and stored on the order line. (DB)
- **One independent invoice per sale**, generated automatically at delivery (configurable). A unique index prevents
  two live invoices for the same sale. Invoice numbers: `FAC-YYYY-00001`, sequential per year, never reused. (DB)
- Invoice date = delivery date. Invoices store a snapshot of the customer and business information. (DB)
- **Invoices are immutable**: amounts, lines, number, date and snapshots cannot be modified (trigger + no UPDATE
  grant). Only the status can change (unpaid ↔ paid via payments, unpaid → cancelled). Invoices cannot be deleted. (DB)
- **Controlled correction**: cancelling an unpaid invoice (reason required) cancels its delivery, restores the stock
  exactly once, and returns the sale to "À livrer" so it can be corrected and invoiced again under a **new** number.
  A paid invoice must first have its payment reversed. (DB)
- Editing a sale is possible only before delivery. If the sale already has stock history (a cancelled delivery), the
  edit creates a replacement sale with a new reference and cancels the old one, so history is never rewritten. (DB)

## 7. Payments (encaissements)

- **Each invoice is paid in full. Partial payments are refused.** (DB)
- One payment may settle one, several or all unpaid invoices **of the same customer**. The payment amount must equal
  exactly the sum of the selected invoices. (DB)
- Each payment has allocations (`payment_allocations`), one per invoice, whose amount must equal the invoice total
  (trigger). A partial unique index allows only one active allocation per invoice → an invoice cannot be paid twice,
  even with concurrent submissions (row locks + test). (DB)
- Payment methods: cash, bank transfer, other. Date and time are recorded. (DB)
- A payment can be reversed (reason required): allocations are deactivated, invoices return to unpaid, and a reversing
  cash entry is recorded on the day of reversal. History is kept. (DB)

## 8. Receivables (créances)

- Outstanding per invoice = invoice total − active allocations; cancelled invoices count 0. Balances are always
  computed from invoices and allocations (`v_invoice_balances`, `v_customer_balances`), never stored. (DB)
- Ageing filters: recent (≤ 3 days), > 3, > 7, > 30 days since invoice date.

## 9. Expenses & cash

- Expense categories: Transport, Carburant, Salaires, Emballage, Entretien, Autres (+ custom). (DB)
- Each expense creates a cash outflow on the matching account. Cancelling an expense creates a reversing entry. (DB)
- Accounts: Caisse (cash), Banque (bank), Autre. Balance = Σ in − Σ out of `cash_movements`. (DB)
- **Revenue is not cash**: unpaid invoices never appear in cash movements. Cash comes only from payments, supplier
  payments, expenses, opening balances and manual movements. (DB)
- Reversals are dated on the day they happen, not retroactively, so closed days stay unchanged.

## 10. Financial engine (single source: `period_summary`)

| Indicator | Definition |
|---|---|
| Chiffre d'affaires | Σ total of non-cancelled invoices, by **invoice date** |
| Encaissements | Σ active payments, by **payment date** |
| Créances | Σ outstanding of non-cancelled invoices (today) |
| Coût des marchandises vendues (CMV) | Σ stored cost of the lines of those invoices (historical valuation, never the current indicative price) |
| Marge brute | CA − CMV |
| Dépenses | Σ active expenses, by expense date |
| Pertes de stock | Σ cost of losses + net manual adjustments |
| Résultat net estimé | Marge brute − Dépenses − Pertes de stock |
| Achats | Σ confirmed purchases, by purchase date (not an expense: purchases become CMV when sold) |

Reports, dashboard, daily closing and exports all use these functions, so figures are consistent everywhere.

## 11. Daily closing

- Shows the day's purchases, sales (invoices), deliveries, collections (by payment date), invoices of the day still
  unpaid, expenses, margin, cash balance at end of day and remaining stock. Printable / PDF.
- Saving a closing stores a snapshot; it can be saved again (latest snapshot kept, audited).

## 12. Documents & language

- The interface is bilingual (French default, Arabic RTL).
- **PDF documents are generated in French** with the standard Helvetica font, which is the usual language of business
  paperwork in Morocco. Arabic PDFs would require embedding an Arabic font with text shaping (future improvement).
- Legal identifiers (ICE, RC, IF, Patente) are printed only if the owner enters them. Nothing is invented.

## 13. Open decisions for the owner

1. Valuation method: CUMP (pre-selected) vs FIFO — decide before the first delivery.
2. Supplier payment practice: immediate vs credit — set the default in Paramètres.
3. Whether invoices must be generated automatically at delivery (default: yes).
4. Legal mentions to print on invoices (ICE, RC, IF, Patente, footer text).
5. VAT: products are treated as sold without VAT breakdown (fresh poultry). If VAT must appear on invoices, it is a
   separate change to the invoice model.
