import "server-only";
import { Document, Page, StyleSheet, Text, View, Image } from "@react-pdf/renderer";

/**
 * PDF documents (A4). PDFs are rendered in French with the built-in Helvetica font,
 * which covers French accents; see BUSINESS_RULES.md for the Arabic note.
 */
const C = { navy: "#17324D", ink: "#172B4D", muted: "#64748B", line: "#E2E8F0", bg: "#F5F7FA", danger: "#DC2626", success: "#16A34A" };

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9.5, fontFamily: "Helvetica", color: C.ink },
  row: { flexDirection: "row" },
  between: { flexDirection: "row", justifyContent: "space-between" },
  h1: { fontSize: 20, fontFamily: "Helvetica-Bold", color: C.navy },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.navy },
  bold: { fontFamily: "Helvetica-Bold" },
  muted: { color: C.muted },
  box: { borderWidth: 1, borderColor: C.line, backgroundColor: C.bg, borderRadius: 4, padding: 10, marginTop: 16 },
  th: { backgroundColor: C.bg, borderBottomWidth: 1, borderColor: C.line, paddingVertical: 6, paddingHorizontal: 6, fontFamily: "Helvetica-Bold", fontSize: 8.5, color: C.muted },
  td: { borderBottomWidth: 1, borderColor: C.line, paddingVertical: 6, paddingHorizontal: 6 },
  right: { textAlign: "right" },
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, fontSize: 8, color: C.muted, textAlign: "center", borderTopWidth: 1, borderColor: C.line, paddingTop: 6 },
  banner: { backgroundColor: "#FEF2F2", color: C.danger, padding: 8, marginBottom: 12, textAlign: "center", fontFamily: "Helvetica-Bold" },
});

export type Biz = { business_name?: string | null; address?: string | null; city?: string | null; phone?: string | null; email?: string | null;
  ice?: string | null; rc?: string | null; if_number?: string | null; patente?: string | null; logo_url?: string | null; invoice_footer?: string | null };

function legal(b: Biz) {
  return [b.ice && `ICE : ${b.ice}`, b.rc && `RC : ${b.rc}`, b.if_number && `IF : ${b.if_number}`, b.patente && `Patente : ${b.patente}`].filter(Boolean).join("  ·  ");
}

function Header({ b, title, meta }: { b: Biz; title: string; meta: string[] }) {
  return (
    <View style={s.between}>
      <View style={{ maxWidth: 300 }}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
        {b.logo_url ? <Image src={b.logo_url} style={{ height: 36, width: 120, objectFit: "contain", marginBottom: 6 }} /> : null}
        <Text style={s.h2}>{b.business_name ?? ""}</Text>
        {b.address ? <Text style={s.muted}>{b.address}{b.city ? `, ${b.city}` : ""}</Text> : null}
        {b.phone ? <Text style={s.muted}>{b.phone}</Text> : null}
        {b.email ? <Text style={s.muted}>{b.email}</Text> : null}
        {legal(b) ? <Text style={[s.muted, { fontSize: 8, marginTop: 2 }]}>{legal(b)}</Text> : null}
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={s.h1}>{title}</Text>
        {meta.map((m) => <Text key={m} style={{ marginTop: 2 }}>{m}</Text>)}
      </View>
    </View>
  );
}

export type Col = { label: string; width: number; align?: "right" };
export function TablePdf({ cols, rows, total }: { cols: Col[]; rows: string[][]; total?: string[] }) {
  return (
    <View style={{ marginTop: 14 }}>
      <View style={s.row} fixed>
        {cols.map((c) => <Text key={c.label} style={[s.th, { width: `${c.width}%` }, c.align === "right" ? s.right : {}]}>{c.label}</Text>)}
      </View>
      {rows.map((r, i) => (
        <View key={i} style={s.row} wrap={false}>
          {r.map((v, j) => <Text key={j} style={[s.td, { width: `${cols[j].width}%` }, cols[j].align === "right" ? s.right : {}]}>{v}</Text>)}
        </View>
      ))}
      {total && (
        <View style={[s.row, { backgroundColor: C.bg }]}>
          {total.map((v, j) => <Text key={j} style={[s.td, s.bold, { width: `${cols[j].width}%` }, cols[j].align === "right" ? s.right : {}]}>{v}</Text>)}
        </View>
      )}
    </View>
  );
}

export function InvoicePdf({ b, number, date, status, customer, items, subtotal, discount, total, paid, due, cancelled, footer }: {
  b: Biz; number: string; date: string; status: string; customer: { name?: string; contact_name?: string; phone?: string; address?: string };
  items: string[][]; subtotal: string; discount: string | null; total: string; paid: string; due: string; cancelled: string | null; footer: string;
}) {
  return (
    <Document title={`Facture ${number}`} author={b.business_name ?? "Volaille Manager"}>
      <Page size="A4" style={s.page}>
        {cancelled ? <Text style={s.banner}>FACTURE ANNULÉE — {cancelled}</Text> : null}
        <Header b={b} title="FACTURE" meta={[`N° ${number}`, `Date : ${date}`, `Statut : ${status}`]} />
        <View style={s.box}>
          <Text style={[s.muted, { fontSize: 8 }]}>FACTURÉ À</Text>
          <Text style={[s.bold, { fontSize: 11, marginTop: 2 }]}>{customer.name ?? ""}</Text>
          {customer.contact_name ? <Text>{customer.contact_name}</Text> : null}
          {customer.address ? <Text>{customer.address}</Text> : null}
          {customer.phone ? <Text>{customer.phone}</Text> : null}
        </View>
        <TablePdf cols={[{ label: "Produit", width: 46 }, { label: "Quantité (kg)", width: 18, align: "right" }, { label: "Prix unitaire (DH/kg)", width: 18, align: "right" }, { label: "Total (DH)", width: 18, align: "right" }]} rows={items} />
        <View style={{ alignSelf: "flex-end", width: 220, marginTop: 12 }}>
          <View style={s.between}><Text style={s.muted}>Sous-total</Text><Text>{subtotal}</Text></View>
          {discount ? <View style={s.between}><Text style={s.muted}>Remise</Text><Text>- {discount}</Text></View> : null}
          <View style={[s.between, { borderTopWidth: 1, borderColor: C.line, marginTop: 4, paddingTop: 4 }]}>
            <Text style={[s.bold, { color: C.navy, fontSize: 11 }]}>Total à payer</Text><Text style={[s.bold, { color: C.navy, fontSize: 11 }]}>{total}</Text>
          </View>
          {!cancelled ? <View style={[s.between, { marginTop: 4 }]}><Text style={s.muted}>Montant payé</Text><Text>{paid}</Text></View> : null}
          {!cancelled ? <View style={s.between}><Text style={s.bold}>Reste à payer</Text><Text style={s.bold}>{due}</Text></View> : null}
        </View>
        <Text style={s.footer} fixed>{footer}</Text>
      </Page>
    </Document>
  );
}

export function ReportPdf({ b, title, subtitle, cols, rows, total, summary }: {
  b: Biz; title: string; subtitle: string; cols: Col[]; rows: string[][]; total?: string[]; summary?: [string, string][];
}) {
  return (
    <Document title={title} author={b.business_name ?? "Volaille Manager"}>
      <Page size="A4" style={s.page} orientation={cols.length > 6 ? "landscape" : "portrait"}>
        <Header b={b} title={title} meta={[subtitle]} />
        {summary && (
          <View style={[s.box, { padding: 0 }]}>
            {summary.map(([k, v]) => (
              <View key={k} style={[s.between, { paddingVertical: 5, paddingHorizontal: 10, borderBottomWidth: 1, borderColor: C.line }]}>
                <Text>{k}</Text><Text style={s.bold}>{v}</Text>
              </View>
            ))}
          </View>
        )}
        {cols.length > 0 && <TablePdf cols={cols} rows={rows} total={total} />}
        <Text style={s.footer} fixed render={({ pageNumber, totalPages }) => `${b.business_name ?? ""} — Volaille Manager — page ${pageNumber}/${totalPages}`} />
      </Page>
    </Document>
  );
}
