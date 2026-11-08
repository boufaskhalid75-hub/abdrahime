"use client";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useI18n } from "@/lib/i18n/client";

/** Validated categorical slots (CVD-safe adjacent pairs), assigned in fixed order. */
export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a"] as const;
const GRID = "#E2E8F0";
const AXIS = { fontSize: 11, fill: "#64748B" };

type Point = Record<string, string | number>;
type Series = { key: string; label: string };

function useAxisFormat() {
  const { f, locale } = useI18n();
  const compact = new Intl.NumberFormat(locale === "ar" ? "ar-MA-u-nu-latn" : "fr-MA", { notation: "compact", maximumFractionDigits: 1 });
  return { f, tick: (v: number) => compact.format(v) };
}

function Empty() {
  const { t } = useI18n();
  return <div className="flex h-full items-center justify-center text-sm text-muted">{t.dashboard.noData}</div>;
}

export function TrendChart({ data, series, xKey, xFormat = "short", height = 260, kind = "area" }: {
  data: Point[]; series: Series[]; xKey: string; xFormat?: "short" | "month"; height?: number; kind?: "area" | "line";
}) {
  const { f, tick } = useAxisFormat();
  const { t } = useI18n();
  const hasData = data.some((d) => series.some((s) => Number(d[s.key]) !== 0));
  const fmtX = (v: string) => (xFormat === "month" ? f.month(v) : f.short(v));
  const tooltip = (
    <Tooltip
      cursor={{ stroke: "#94A3B8", strokeDasharray: "3 3" }}
      labelFormatter={(v) => fmtX(String(v))}
      formatter={(v, name) => [f.money(v), name]}
      contentStyle={{ borderRadius: 8, border: `1px solid ${GRID}`, fontSize: 12 }}
    />
  );
  return (
    <div style={{ height }} dir="ltr" role="img" aria-label={series.map((s) => s.label).join(", ")}>
      {!hasData ? <Empty /> : (
        <ResponsiveContainer width="100%" height="100%">
          {kind === "area" ? (
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey={xKey} tickFormatter={fmtX} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={16} />
              <YAxis tickFormatter={tick} tick={AXIS} tickLine={false} axisLine={false} width={48} />
              {tooltip}
              {series.length > 1 && <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: "#172B4D" }} />}
              {series.map((s, i) => (
                <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={SERIES[i]} strokeWidth={2}
                  fill={SERIES[i]} fillOpacity={0.08} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
              ))}
            </AreaChart>
          ) : (
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey={xKey} tickFormatter={fmtX} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={16} />
              <YAxis tickFormatter={tick} tick={AXIS} tickLine={false} axisLine={false} width={48} />
              {tooltip}
              {series.length > 1 && <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: "#172B4D" }} />}
              {series.map((s, i) => (
                <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={SERIES[i]} strokeWidth={2}
                  dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      )}
      <span className="sr-only">{t.dashboard.noData}</span>
    </div>
  );
}

export function ColumnChart({ data, xKey, yKey, label, xFormat, height = 260 }: {
  data: Point[]; xKey: string; yKey: string; label: string; xFormat?: "month" | "short"; height?: number;
}) {
  const { f, tick } = useAxisFormat();
  const fmtX = (v: string) => (xFormat === "month" ? f.month(v) : xFormat === "short" ? f.short(v) : v);
  if (!data.some((d) => Number(d[yKey]) !== 0)) return <div style={{ height }}><Empty /></div>;
  return (
    <div style={{ height }} dir="ltr" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%">
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey={xKey} tickFormatter={fmtX} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis tickFormatter={tick} tick={AXIS} tickLine={false} axisLine={false} width={48} />
          <Tooltip cursor={{ fill: "#F5F7FA" }} labelFormatter={(v) => fmtX(String(v))} formatter={(v) => [f.money(v), label]}
            contentStyle={{ borderRadius: 8, border: `1px solid ${GRID}`, fontSize: 12 }} />
          <Bar dataKey={yKey} name={label} fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal ranked bars (products, customers) — one measure, one hue. */
export function RankedBars({ data, labelKey, valueKey, label, valueFormat = "money" }: {
  data: Point[]; labelKey: string; valueKey: string; label: string; valueFormat?: "money" | "kg";
}) {
  const { f } = useI18n();
  const rows = data.filter((d) => Number(d[valueKey]) > 0);
  if (!rows.length) return <div className="h-40"><Empty /></div>;
  const max = Math.max(...rows.map((d) => Number(d[valueKey])));
  const fmt = valueFormat === "kg" ? f.kg : f.money;
  return (
    <ul className="space-y-3" aria-label={label}>
      {rows.map((d) => (
        <li key={String(d[labelKey])} title={`${d[labelKey]}: ${fmt(d[valueKey])}`}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="truncate">{d[labelKey]}</span>
            <span className="num ltr shrink-0 text-muted">{fmt(d[valueKey])}</span>
          </div>
          <div className="h-2 rounded-full bg-bg">
            <div className="h-2 rounded-full" style={{ width: `${(Number(d[valueKey]) / max) * 100}%`, background: SERIES[0] }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
