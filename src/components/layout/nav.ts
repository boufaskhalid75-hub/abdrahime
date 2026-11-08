import {
  LayoutDashboard, Package, Truck, ShoppingCart, Users, Receipt, PackageCheck, FileText, Wallet, HandCoins,
  Boxes, CreditCard, Landmark, BarChart3, Settings, UserCircle,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function navigation(t: Dictionary) {
  return [
    { title: t.nav.main, items: [{ href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard }] },
    {
      title: t.nav.business,
      items: [
        { href: "/products", label: t.nav.products, icon: Package },
        { href: "/suppliers", label: t.nav.suppliers, icon: Truck },
        { href: "/purchases", label: t.nav.purchases, icon: ShoppingCart },
        { href: "/customers", label: t.nav.customers, icon: Users },
        { href: "/sales", label: t.nav.sales, icon: Receipt },
        { href: "/deliveries", label: t.nav.deliveries, icon: PackageCheck },
        { href: "/invoices", label: t.nav.invoices, icon: FileText },
      ],
    },
    {
      title: t.nav.finance,
      items: [
        { href: "/payments", label: t.nav.payments, icon: Wallet },
        { href: "/receivables", label: t.nav.receivables, icon: HandCoins },
        { href: "/stock", label: t.nav.stock, icon: Boxes },
        { href: "/expenses", label: t.nav.expenses, icon: CreditCard },
        { href: "/cash", label: t.nav.cash, icon: Landmark },
      ],
    },
    { title: t.nav.analytics, items: [{ href: "/reports", label: t.nav.reports, icon: BarChart3 }] },
    {
      title: t.nav.config,
      items: [
        { href: "/settings", label: t.nav.settings, icon: Settings },
        { href: "/profile", label: t.nav.profile, icon: UserCircle },
      ],
    },
  ];
}
