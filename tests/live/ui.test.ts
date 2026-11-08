/**
 * LIVE browser test: the real app (E2E_BASE_URL) connected to the real Supabase project,
 * driven through the UI with a dedicated QA account (LIVE_USER_A / LIVE_PASS_A).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";

const BASE = process.env.E2E_BASE_URL ?? "";
const USER = process.env.LIVE_USER_A ?? "";
const PASS = process.env.LIVE_PASS_A ?? "";
const SHOTS = process.env.E2E_SCREENSHOT_DIR;
const enabled = Boolean(BASE && USER && PASS);
const require = createRequire(import.meta.url);
const tag = randomUUID().slice(0, 5);

/* eslint-disable @typescript-eslint/no-explicit-any -- Playwright is loaded at runtime (pre-installed) */
let browser: any, ctx: any, page: any;
const errors: string[] = [];

async function visit(path: string) {
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  expect(res.status(), path).toBeLessThan(400);
  expect(page.url(), path).not.toContain("/login");
  const body = await page.locator("body").innerText();
  expect(body, path).not.toContain("Une erreur est survenue");
  expect(body, path).not.toContain("Page introuvable");
  return body as string;
}
async function pick(combo: any, text: string) {
  await combo.click();
  await page.getByRole("textbox", { name: "Rechercher…" }).last().fill(text);
  await page.getByRole("option", { name: new RegExp(text) }).first().click();
}
/** Wait for a client navigation to finish rendering (URL + streamed content). */
async function land(url: RegExp) {
  await page.waitForURL(url, { timeout: 30_000 });
  await page.waitForLoadState("networkidle");
  await page.locator("main h1").first().waitFor({ timeout: 30_000 });
}
async function shot(name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

describe.skipIf(!enabled)("LIVE UI on the real backend", () => {
  beforeAll(async () => {
    const { chromium } = require("playwright");
    browser = await chromium.launch();
    ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
    page = await ctx.newPage();
    page.on("pageerror", (e: Error) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m: any) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  }, 60_000);
  afterAll(async () => browser?.close());

  it("signs in through the login form", async () => {
    await page.goto(`${BASE}/login`);
    await page.getByLabel("Adresse e-mail").fill(USER);
    await page.getByLabel("Mot de passe").fill(PASS);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL("**/dashboard", { timeout: 30_000 });
    expect(await page.locator("h1").innerText()).toBe("Tableau de bord");
  });

  it("opens every navigation page and the daily closing without errors", async () => {
    const pages = ["/dashboard", "/products", "/suppliers", "/purchases", "/customers", "/sales", "/deliveries",
      "/invoices", "/payments", "/receivables", "/stock", "/expenses", "/cash", "/reports", "/settings", "/profile",
      "/cash/closing", "/purchases/new", "/sales/new", "/payments/new",
      "/dashboard?period=last30", "/deliveries?tab=done", "/receivables?filter=d3"];
    for (const p of pages) await visit(p);
    for (const tab of ["sales", "profitability", "products", "customers", "suppliers", "inventory", "receivables", "payments", "expenses"]) {
      await visit(`/reports?tab=${tab}&period=last30`);
    }
  }, 180_000);

  it("runs the workflow: product → supplier → purchase → stock → customer → sale → invoice → payment → closing", async () => {
    // Product
    await visit("/products");
    await page.getByRole("button", { name: "Nouveau produit" }).first().click();
    await page.getByLabel("Nom du produit").fill(`Poulet UI ${tag}`);
    await page.getByLabel(/Prix d'achat indicatif/).fill("20");
    await page.getByLabel(/Prix de vente indicatif/).fill("27");
    await page.getByLabel(/Stock minimum/).fill("5");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await land(/\/products\/[0-9a-f-]{36}$/);
    expect(await page.locator("h1").innerText()).toBe(`Poulet UI ${tag}`);

    // Supplier
    await visit("/suppliers");
    await page.getByRole("button", { name: "Nouveau fournisseur" }).first().click();
    await page.getByLabel("Raison sociale").fill(`Fournisseur UI ${tag}`);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.getByRole("link", { name: `Fournisseur UI ${tag}` }).waitFor({ timeout: 30_000 });

    // Purchase: 50 kg × 20 DH, paid in cash
    await visit("/purchases/new");
    await pick(page.locator("#supplier"), `Fournisseur UI ${tag}`);
    await pick(page.getByRole("combobox").nth(1), `Poulet UI ${tag}`);
    await page.getByRole("spinbutton", { name: "Quantité" }).fill("50");
    await page.getByRole("spinbutton", { name: "Prix unitaire" }).fill("20");
    await page.getByRole("checkbox", { name: /Payé immédiatement/ }).check();
    expect(await page.locator("text=1.000,00 DH").count()).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Confirmer l'achat" }).click();
    await land(/\/purchases\/[0-9a-f-]{36}$/);
    expect(await page.locator("body").innerText()).toContain("Payé");

    // Stock
    const stock = await visit("/stock");
    expect(stock).toContain(`Poulet UI ${tag}`);

    // Customer
    await visit("/customers");
    await page.getByRole("button", { name: "Nouveau client" }).first().click();
    await page.getByLabel("Nom de la boucherie").fill(`Boucherie UI ${tag}`);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await land(/\/customers\/[0-9a-f-]{36}$/);
    const customerUrl = page.url();
    const customerId = customerUrl.split("/").pop();

    // Two sales delivered now → two invoices (12 kg and 8 kg at 27 DH)
    const invoiceUrls: string[] = [];
    for (const kg of ["12", "8"]) {
      await visit(`/sales/new?customer=${customerId}`);
      await page.getByRole("spinbutton", { name: `Quantité Poulet UI ${tag}` }).fill(kg);
      await page.getByRole("button", { name: "Confirmer la vente" }).click();
      await land(/\/invoices\/[0-9a-f-]{36}$/);
      invoiceUrls.push(page.url());
    }
    await page.locator("main h1", { hasText: "FACTURE" }).waitFor({ timeout: 30_000 });
    const inv1 = await page.locator("body").innerText();
    expect(inv1).toMatch(/FAC-\d{4}-\d{5}/);
    expect(inv1).toContain("216,00 DH"); // 8 kg × 27
    await shot("live-invoice");

    // Over-stock sale is refused in the UI (stock left: 30 kg)
    await visit(`/sales/new?customer=${customerId}`);
    await page.getByRole("spinbutton", { name: `Quantité Poulet UI ${tag}` }).fill("31");
    expect(await page.locator("text=Stock insuffisant").count()).toBeGreaterThan(0);

    // Payment of both invoices together (324 + 216 = 540 DH)
    await visit(`/payments/new?customer=${customerId}`);
    await page.getByRole("checkbox", { name: "Tout sélectionner" }).check();
    expect(await page.locator("text=540,00 DH").count()).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Confirmer l'encaissement" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirmer" }).click();
    await land(/\/payments\/[0-9a-f-]{36}$/);
    expect(await page.locator("body").innerText()).toContain("540,00 DH");

    // Customer balance is zero, invoices paid
    const cust = await visit(customerUrl.replace(BASE, ""));
    expect(cust).toContain("Payée");
    await page.goto(invoiceUrls[0], { waitUntil: "networkidle" });
    expect(await page.locator("body").innerText()).toContain("Payée");

    // Daily closing
    await visit("/cash/closing");
    await page.getByLabel("Notes").fill(`QA UI ${tag}`);
    await page.getByRole("button", { name: "Enregistrer la clôture" }).click();
    await page.locator("text=Dernière clôture enregistrée").waitFor({ timeout: 30_000 });
    await shot("live-closing");

    // Exports (authenticated downloads)
    const invoiceId = invoiceUrls[0].split("/").pop();
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Casablanca" }).format(new Date());
    const checks: [string, string][] = [
      [`/api/pdf/invoice/${invoiceId}`, "application/pdf"],
      [`/api/pdf/statement/${customerId}`, "application/pdf"],
      [`/api/pdf/daily/${today}`, "application/pdf"],
      [`/api/export/report?tab=sales&g=day&from=${today}&to=${today}&format=pdf`, "application/pdf"],
      [`/api/export/report?tab=products&g=day&from=${today}&to=${today}&format=xlsx`, "spreadsheetml"],
      ["/api/export/backup", "spreadsheetml"],
    ];
    for (const [url, type] of checks) {
      const r = await ctx.request.get(`${BASE}${url}`);
      expect(r.status(), url).toBe(200);
      expect(r.headers()["content-type"], url).toContain(type);
      const body = await r.body();
      expect(body.length, url).toBeGreaterThan(1000);
      if (type === "application/pdf") expect(body.subarray(0, 5).toString(), url).toBe("%PDF-");
      else expect(body.subarray(0, 2).toString(), url).toBe("PK");
    }
  }, 300_000);

  it("Arabic interface works (RTL) on desktop and mobile", async () => {
    await ctx.addCookies([{ name: "vm_locale", value: "ar", url: BASE }]);
    for (const vp of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(vp);
      for (const p of ["/dashboard", "/sales/new", "/payments", "/stock"]) {
        await page.goto(`${BASE}${p}`, { waitUntil: "networkidle" });
        expect(await page.getAttribute("html", "dir")).toBe("rtl");
        expect(await page.locator("body").innerText()).not.toContain("حدث خطأ");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${p} ${vp.width}`).toBeLessThanOrEqual(0);
      }
      await shot(`live-ar-dashboard-${vp.width}`);
    }
    expect(await page.locator("h1").innerText()).toBe("المخزون");
    await ctx.addCookies([{ name: "vm_locale", value: "fr", url: BASE }]);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const p of ["/dashboard", "/sales/new", "/payments/new", "/invoices", "/cash/closing"]) {
      await page.goto(`${BASE}${p}`, { waitUntil: "networkidle" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `fr mobile ${p}`).toBeLessThanOrEqual(0);
    }
    await shot("live-fr-mobile-closing");
  }, 180_000);

  it("produced no browser errors", () => {
    expect(errors).toEqual([]);
  });
});
