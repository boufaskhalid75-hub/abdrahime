"use client";
import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormDialog } from "@/components/shared/form-dialog";
import { useI18n } from "@/lib/i18n/client";
import { customerSchema, productSchema, supplierSchema } from "@/lib/schemas";
import { saveCustomer, saveProduct, saveSupplier } from "@/lib/actions";

type Row = Record<string, unknown> & { id?: string };
const v = (r: Row | undefined, k: string, d: unknown = "") => (r && r[k] !== null && r[k] !== undefined ? r[k] : d);

export function ProductFormDialog({ product }: { product?: Row }) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <FormDialog
      trigger={product ? t.common.edit : t.products.new}
      icon={product ? <Pencil /> : <Plus />}
      triggerVariant={product ? "secondary" : "primary"}
      title={product ? t.products.edit : t.products.new}
      description={t.products.indicativeNotice}
      schema={productSchema}
      defaultValues={{
        name: v(product, "name"), reference: v(product, "reference"), category: v(product, "category"),
        purchase_price: v(product, "purchase_price", 0), sale_price: v(product, "sale_price", 0),
        min_stock_kg: v(product, "min_stock_kg", 0), description: v(product, "description"),
      }}
      fields={[
        { name: "name", label: t.products.name, required: true, full: true },
        { name: "reference", label: t.products.reference, dir: "ltr" },
        { name: "category", label: t.products.category },
        { name: "purchase_price", label: `${t.products.purchasePrice} (${t.common.currency}${t.common.perKg})`, type: "number", step: "0.01" },
        { name: "sale_price", label: `${t.products.salePrice} (${t.common.currency}${t.common.perKg})`, type: "number", step: "0.01" },
        { name: "min_stock_kg", label: t.products.minStock, type: "number", step: "0.001" },
        { name: "description", label: t.common.description, type: "textarea" },
      ]}
      submit={(values) => saveProduct(product?.id ?? null, values)}
      onSuccess={(d) => { if (!product && d && typeof d === "object" && "id" in d) router.push(`/products/${(d as { id: string }).id}`); }}
    />
  );
}

export function SupplierFormDialog({ supplier }: { supplier?: Row }) {
  const { t } = useI18n();
  return (
    <FormDialog
      trigger={supplier ? t.common.edit : t.suppliers.new}
      icon={supplier ? <Pencil /> : <Plus />}
      triggerVariant={supplier ? "secondary" : "primary"}
      title={supplier ? t.suppliers.edit : t.suppliers.new}
      schema={supplierSchema}
      defaultValues={{
        name: v(supplier, "name"), contact_name: v(supplier, "contact_name"), phone: v(supplier, "phone"),
        address: v(supplier, "address"), email: v(supplier, "email"), notes: v(supplier, "notes"),
      }}
      fields={[
        { name: "name", label: t.suppliers.name, required: true, full: true },
        { name: "contact_name", label: t.suppliers.contactName },
        { name: "phone", label: t.common.phone, type: "tel", dir: "ltr" },
        { name: "email", label: `${t.common.email} (${t.common.optional})`, type: "email", dir: "ltr", full: true },
        { name: "address", label: t.common.address, full: true },
        { name: "notes", label: t.common.notes, type: "textarea" },
      ]}
      submit={(values) => saveSupplier(supplier?.id ?? null, values)}
    />
  );
}

export function CustomerFormDialog({ customer }: { customer?: Row }) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <FormDialog
      trigger={customer ? t.common.edit : t.customers.new}
      icon={customer ? <Pencil /> : <Plus />}
      triggerVariant={customer ? "secondary" : "primary"}
      title={customer ? t.customers.edit : t.customers.new}
      schema={customerSchema}
      defaultValues={{
        name: v(customer, "name"), contact_name: v(customer, "contact_name"), phone: v(customer, "phone"),
        address: v(customer, "address"), notes: v(customer, "notes"),
      }}
      fields={[
        { name: "name", label: t.customers.name, required: true, full: true },
        { name: "contact_name", label: t.customers.contactName },
        { name: "phone", label: t.common.phone, type: "tel", dir: "ltr" },
        { name: "address", label: t.common.address, full: true },
        { name: "notes", label: t.common.notes, type: "textarea" },
      ]}
      submit={(values) => saveCustomer(customer?.id ?? null, values)}
      onSuccess={(d) => { if (!customer && d && typeof d === "object" && "id" in d) router.push(`/customers/${(d as { id: string }).id}`); }}
    />
  );
}
