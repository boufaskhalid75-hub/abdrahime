/**
 * Browser tests against a running build (E2E_BASE_URL, e.g. http://localhost:3000).
 * They verify route protection, the bilingual login page (LTR/RTL) and responsive layout.
 * Authenticated screens need a Supabase backend and are covered by the DB tests + manual QA.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";

// Playwright is pre-installed globally in CI/dev images; we load it at runtime and type the subset we use.
type Page = {
  goto(url: string): Promise<unknown>; getAttribute(sel: string, name: string): Promise<string | null>;
  getByLabel(l: string): { isVisible(): Promise<boolean>; fill(v: string): Promise<void> };
  getByRole(r: string, o?: { name?: string }): { isVisible(): Promise<boolean>; click(): Promise<void>; filter(o: { hasText: RegExp }): { first(): { waitFor(o: { timeout: number }): Promise<void> } } };
  waitForFunction(fn: () => boolean): Promise<unknown>; evaluate<T>(fn: () => T): Promise<T>;
  screenshot(o: { path: string }): Promise<unknown>; close(): Promise<void>;
};
type Context = { newPage(): Promise<Page>; addCookies(c: { name: string; value: string; url: string }[]): Promise<void>; close(): Promise<void> };
type Browser = { newContext(o?: { viewport?: { width: number; height: number } }): Promise<Context>; newPage(): Promise<Page>; close(): Promise<void> };

const BASE = process.env.E2E_BASE_URL ?? "";
const SHOTS = process.env.E2E_SCREENSHOT_DIR;
const require = createRequire(import.meta.url);

const PROTECTED = [
  "/dashboard", "/products", "/suppliers", "/purchases", "/purchases/new", "/customers", "/sales", "/sales/new",
  "/deliveries", "/invoices", "/payments", "/payments/new", "/receivables", "/stock", "/expenses", "/cash",
  "/cash/closing", "/reports", "/settings", "/profile",
];

describe.skipIf(!BASE)("UI (browser)", () => {
  let browser: Browser;
  beforeAll(async () => {
    const { chromium } = require("playwright");
    browser = await chromium.launch();
  });
  afterAll(async () => browser?.close());

  it("redirects every protected page to the login page", async () => {
    for (const path of PROTECTED) {
      const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
      expect(res.status, path).toBe(307);
      expect(res.headers.get("location"), path).toContain(`/login?next=${encodeURIComponent(path)}`);
    }
  });

  it("rejects unauthenticated document exports", async () => {
    for (const path of ["/api/pdf/invoice/00000000-0000-0000-0000-000000000000", "/api/export/backup", "/api/export/report?tab=sales&from=2026-01-01&to=2026-01-31"]) {
      const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
      expect([307, 401]).toContain(res.status);
    }
  });

  it("sends security headers", async () => {
    const res = await fetch(`${BASE}/login`);
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-powered-by")).toBeNull();
  });

  it("renders the login page in French (LTR) and Arabic (RTL)", async () => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`);
    expect(await page.getAttribute("html", "lang")).toBe("fr");
    expect(await page.getAttribute("html", "dir")).toBe("ltr");
    await expect(page.getByLabel("Adresse e-mail").isVisible()).resolves.toBe(true);
    await expect(page.getByRole("button", { name: "Se connecter" }).isVisible()).resolves.toBe(true);
    await page.getByRole("button", { name: "Langue" }).click();
    await page.waitForFunction(() => document.documentElement.dir === "rtl");
    expect(await page.getAttribute("html", "lang")).toBe("ar");
    await expect(page.getByRole("button", { name: "دخول" }).isVisible()).resolves.toBe(true);
    await ctx.close();
  });

  it("shows a translated error on failed sign-in", async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE}/login`);
    await page.getByLabel("Adresse e-mail").fill("owner@example.com");
    await page.getByLabel("Mot de passe").fill("wrong-password");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.getByRole("alert").filter({ hasText: /incorrect|configurée/ }).first().waitFor({ timeout: 15000 });
    await page.close();
  });

  for (const [name, viewport] of [["mobile", { width: 375, height: 800 }], ["tablet", { width: 768, height: 1024 }], ["desktop", { width: 1366, height: 900 }]] as const) {
    it(`has no horizontal overflow on ${name}`, async () => {
      for (const locale of ["fr", "ar"]) {
        const ctx = await browser.newContext({ viewport });
        await ctx.addCookies([{ name: "vm_locale", value: locale, url: BASE }]);
        const page = await ctx.newPage();
        await page.goto(`${BASE}/login`);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${name}/${locale}`).toBeLessThanOrEqual(0);
        if (SHOTS) await page.screenshot({ path: `${SHOTS}/login-${name}-${locale}.png` });
        await ctx.close();
      }
    });
  }
});
