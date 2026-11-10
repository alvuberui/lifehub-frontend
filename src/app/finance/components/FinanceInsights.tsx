"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type InsightMovement = {
  id: string;
  date: string;
  description: string;
  tagName?: string;
  tagColor?: string;
  type: "beneficio" | "gasto_necesario" | "gasto_innecesario" | "inversion";
  amount: number;
  includeInForecast?: boolean;
};

type Totals = {
  ingresos: number;
  gastosNecesarios: number;
  gastosDiscrecionales: number;
  gastos: number;
  inversiones: number;
  ahorro: number;
  balance: number;
  tasaAhorro: number;
};

const cardClass = "surface rounded-[1.75rem]";
const chartTooltipStyle = {
  background: "rgba(15, 23, 42, 0.97)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  color: "#E5E7EB",
};
const pieTooltipStyle = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #CBD5E1",
  borderRadius: 12,
  color: "#0F172A",
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.18)",
};
const pieColors = ["#22D3EE", "#A78BFA", "#34D399", "#FBBF24", "#FB7185", "#94A3B8", "#60A5FA"];
const formatEUR = (value: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(value);

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function calculateTotals(movements: InsightMovement[]): Totals {
  const ingresos = movements.filter((m) => m.type === "beneficio").reduce((sum, m) => sum + m.amount, 0);
  const gastosNecesarios = movements.filter((m) => m.type === "gasto_necesario").reduce((sum, m) => sum + m.amount, 0);
  const gastosDiscrecionales = movements.filter((m) => m.type === "gasto_innecesario").reduce((sum, m) => sum + m.amount, 0);
  const gastos = gastosNecesarios + gastosDiscrecionales;
  const inversiones = movements.filter((m) => m.type === "inversion").reduce((sum, m) => sum + m.amount, 0);
  const ahorro = ingresos - gastos;
  const balance = ahorro - inversiones;

  return {
    ingresos: round(ingresos),
    gastosNecesarios: round(gastosNecesarios),
    gastosDiscrecionales: round(gastosDiscrecionales),
    gastos: round(gastos),
    inversiones: round(inversiones),
    ahorro: round(ahorro),
    balance: round(balance),
    tasaAhorro: ingresos > 0 ? round((ahorro / ingresos) * 100) : 0,
  };
}

function comparison(current: number, previous: number) {
  if (previous === 0) return null;
  return round(((current - previous) / Math.abs(previous)) * 100);
}

function Comparison({ value, inverse = false, label = "mes anterior" }: { value: number | null; inverse?: boolean; label?: string }) {
  if (value === null) return <span className="text-xs text-slate-500">Sin referencia</span>;
  const positive = inverse ? value <= 0 : value >= 0;
  return <span className={`text-xs font-semibold ${positive ? "text-emerald-300" : "text-rose-300"}`}>{value >= 0 ? "↑" : "↓"} {Math.abs(value).toFixed(1)}% vs. {label}</span>;
}

function SummaryCard({ label, value, hint, tone, comparisonValue, inverse, comparisonLabel }: { label: string; value: string; hint?: string; tone: string; comparisonValue?: number | null; inverse?: boolean; comparisonLabel?: string }) {
  return (
    <article className={`${cardClass} border border-white/[0.08] p-5`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <span className={`h-2.5 w-2.5 rounded-full ${tone}`} />
      </div>
      <p className="mt-4 text-2xl font-black tracking-tight text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      {comparisonValue !== undefined ? <div className="mt-3"><Comparison value={comparisonValue} inverse={inverse} label={comparisonLabel} /></div> : null}
    </article>
  );
}

export function FinanceSummary({ movements, previousMovements, periodLabel, showComparison = true, comparisonLabel = "mes anterior" }: { movements: InsightMovement[]; previousMovements?: InsightMovement[]; periodLabel: string; showComparison?: boolean; comparisonLabel?: string }) {
  const totals = useMemo(() => calculateTotals(movements), [movements]);
  const previous = useMemo(() => calculateTotals(previousMovements ?? []), [previousMovements]);
  const compare = (key: keyof Totals) => showComparison && previousMovements ? comparison(totals[key] as number, previous[key] as number) : undefined;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Resumen financiero</p>
          <h2 className="mt-1 text-2xl font-black text-white">{periodLabel}</h2>
        </div>
        <p className="text-xs text-slate-500">El ahorro es después de gastos; el balance descuenta también las inversiones.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Ingresos" value={formatEUR(totals.ingresos)} tone="bg-emerald-300" comparisonValue={compare("ingresos")} comparisonLabel={comparisonLabel} />
        <SummaryCard label="Gastos necesarios" value={formatEUR(totals.gastosNecesarios)} tone="bg-sky-300" comparisonValue={compare("gastosNecesarios")} inverse comparisonLabel={comparisonLabel} />
        <SummaryCard label="Gastos discrecionales" value={formatEUR(totals.gastosDiscrecionales)} tone="bg-amber-300" comparisonValue={compare("gastosDiscrecionales")} inverse comparisonLabel={comparisonLabel} />
        <SummaryCard label="Inversiones" value={formatEUR(totals.inversiones)} tone="bg-violet-300" comparisonValue={compare("inversiones")} comparisonLabel={comparisonLabel} />
        <SummaryCard label="Ahorro real" value={formatEUR(totals.ahorro)} hint={`${totals.tasaAhorro.toFixed(1)}% de tus ingresos`} tone="bg-cyan-300" comparisonValue={compare("ahorro")} comparisonLabel={comparisonLabel} />
        <SummaryCard label="Tasa de ahorro" value={`${totals.tasaAhorro.toFixed(1)}%`} hint="Ahorro / ingresos" tone="bg-cyan-300" comparisonValue={compare("tasaAhorro")} comparisonLabel={comparisonLabel} />
        <SummaryCard label="Balance" value={formatEUR(totals.balance)} hint={totals.balance >= 0 ? "Balance positivo" : "Balance negativo"} tone={totals.balance >= 0 ? "bg-emerald-300" : "bg-rose-300"} comparisonValue={compare("balance")} comparisonLabel={comparisonLabel} />
        <SummaryCard label="Gastos totales" value={formatEUR(totals.gastos)} tone="bg-rose-300" comparisonValue={compare("gastos")} inverse comparisonLabel={comparisonLabel} />
      </div>
    </section>
  );
}

function DailyCashflowChart({ movements, label }: { movements: InsightMovement[]; label: string }) {
  const data = useMemo(() => {
    const byDay = new Map<string, { ingresos: number; gastos: number; inversiones: number }>();
    movements.forEach((movement) => {
      const day = byDay.get(movement.date) ?? { ingresos: 0, gastos: 0, inversiones: 0 };
      if (movement.type === "beneficio") day.ingresos += movement.amount;
      if (movement.type === "gasto_necesario" || movement.type === "gasto_innecesario") day.gastos += movement.amount;
      if (movement.type === "inversion") day.inversiones += movement.amount;
      byDay.set(movement.date, day);
    });
    return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).reduce<Array<{ date: string; ingresos: number; gastos: number; ahorro: number; inversiones: number; balance: number }>>((rows, [date, values]) => {
      const previous = rows.at(-1)?.balance ?? 0;
      rows.push({ date: date.slice(8), ingresos: round(values.ingresos), gastos: round(values.gastos), inversiones: round(values.inversiones), ahorro: round(values.ingresos - values.gastos), balance: round(previous + values.ingresos - values.gastos - values.inversiones) });
      return rows;
    }, []);
  }, [movements]);

  return (
    <article className={`${cardClass} min-w-0 border border-white/[0.08] p-5 md:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="text-lg font-black text-white">Flujo de dinero</h3><p className="mt-1 text-xs text-slate-500">Ingresos, gastos, inversiones y balance acumulado · {label}</p></div>
        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-200">Por día</span>
      </div>
      {data.length === 0 ? <p className="py-16 text-center text-sm text-slate-500">Todavía no hay movimientos en este periodo.</p> : <div className="mt-5 h-80"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><defs><linearGradient id="financeBalance" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#22D3EE" stopOpacity={0.35} /><stop offset="100%" stopColor="#22D3EE" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: 12 }} /><YAxis tick={{ fill: "#94A3B8", fontSize: 12 }} /><Tooltip formatter={(value: unknown) => formatEUR(Number(value))} contentStyle={chartTooltipStyle} /><Area type="monotone" dataKey="balance" name="Balance acumulado" stroke="#22D3EE" fill="url(#financeBalance)" strokeWidth={3} /><Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#34D399" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="gastos" name="Gastos" stroke="#FB7185" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="ahorro" name="Ahorros" stroke="#FBBF24" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="inversiones" name="Inversiones" stroke="#A78BFA" strokeWidth={2} dot={false} /></AreaChart></ResponsiveContainer></div>}
    </article>
  );
}

function TagDistribution({ movements, label }: { movements: InsightMovement[]; label: string }) {
  const data = useMemo(() => {
    const totals = new Map<string, { value: number; color?: string }>();
    movements.filter((movement) => movement.type === "gasto_necesario" || movement.type === "gasto_innecesario").forEach((movement) => {
      const name = movement.tagName?.trim() || "Sin etiqueta";
      const current = totals.get(name) ?? { value: 0, color: movement.tagColor };
      current.value += movement.amount;
      totals.set(name, current);
    });
    return [...totals.entries()].sort(([, a], [, b]) => b.value - a.value).map(([name, value], index) => ({ name, value: round(value.value), color: value.color || pieColors[index % pieColors.length] }));
  }, [movements]);

  return (
    <article className={`${cardClass} min-w-0 border border-white/[0.08] p-5 md:p-6`}>
      <div><h3 className="text-lg font-black text-white">Gastos por etiqueta</h3><p className="mt-1 text-xs text-slate-500">Distribución real · {label}</p></div>
      {data.length === 0 ? <p className="py-16 text-center text-sm text-slate-500">Añade etiquetas a tus gastos para ver esta distribución.</p> : <div className="mt-4 grid items-center gap-5 md:grid-cols-[1fr_1fr]"><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>{data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip formatter={(value: unknown) => formatEUR(Number(value))} contentStyle={pieTooltipStyle} labelStyle={{ color: "#0F172A", fontWeight: 700 }} itemStyle={{ color: "#0F172A", fontWeight: 600 }} /></PieChart></ResponsiveContainer></div><div className="space-y-3">{data.map((entry) => <div key={entry.name} className="flex items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2 text-slate-300"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} /> <span className="truncate">{entry.name}</span></span><span className="font-bold text-white">{formatEUR(entry.value)}</span></div>)}</div></div>}
    </article>
  );
}

export function PeriodAnalytics({ movements, label, showDaily = false }: { movements: InsightMovement[]; label: string; showDaily?: boolean }) {
  return <section className="grid gap-5 xl:grid-cols-2">{showDaily ? <DailyCashflowChart movements={movements} label={label} /> : <YearCashflowChart movements={movements} label={label} />}<TagDistribution movements={movements} label={label} /></section>;
}

function YearCashflowChart({ movements, label }: { movements: InsightMovement[]; label: string }) {
  const data = useMemo(() => {
    const result = Array.from({ length: 12 }, (_, index) => ({ month: new Intl.DateTimeFormat("es-ES", { month: "short" }).format(new Date(2024, index, 1)), ingresos: 0, gastos: 0, ahorro: 0, inversiones: 0, balance: 0 }));
    movements.forEach((movement) => { const month = Number(movement.date.slice(5, 7)) - 1; if (month < 0 || month > 11) return; if (movement.type === "beneficio") result[month].ingresos += movement.amount; if (movement.type === "gasto_necesario" || movement.type === "gasto_innecesario") result[month].gastos += movement.amount; if (movement.type === "inversion") result[month].inversiones += movement.amount; });
    let accumulated = 0;
    return result.map((row) => { row.ahorro = row.ingresos - row.gastos; accumulated += row.ahorro - row.inversiones; return { ...row, ingresos: round(row.ingresos), gastos: round(row.gastos), ahorro: round(row.ahorro), inversiones: round(row.inversiones), balance: round(accumulated) }; });
  }, [movements]);
  return <article className={`${cardClass} border border-white/[0.08] p-5 md:p-6`}><div><h3 className="text-lg font-black text-white">Evolución del flujo</h3><p className="mt-1 text-xs text-slate-500">Resumen mensual con balance acumulado · {label}</p></div><div className="mt-5 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fill: "#94A3B8", fontSize: 12 }} /><YAxis tick={{ fill: "#94A3B8", fontSize: 12 }} /><Tooltip formatter={(value: unknown) => formatEUR(Number(value))} contentStyle={chartTooltipStyle} /><Bar dataKey="ingresos" name="Ingresos" fill="#34D399" radius={[6, 6, 0, 0]} /><Bar dataKey="gastos" name="Gastos" fill="#FB7185" radius={[6, 6, 0, 0]} /><Bar dataKey="ahorro" name="Ahorros" fill="#FBBF24" radius={[6, 6, 0, 0]} /><Bar dataKey="inversiones" name="Inversiones" fill="#A78BFA" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></article>;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function robustAverage(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const trim = sorted.length >= 6 ? Math.floor(sorted.length * 0.15) : 0;
  const selected = sorted.slice(trim, sorted.length - trim || undefined);
  return selected.reduce((sum, value) => sum + value, 0) / selected.length;
}

export function ForecastPanel({ movements }: { movements: InsightMovement[] }) {
  const [horizon, setHorizon] = useState(12);
  const [currentNetWorth, setCurrentNetWorth] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/movements?netWorth=1", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok) throw new Error("No se pudo cargar el patrimonio actual");
        const value = Number(payload.data);
        if (!cancelled) setCurrentNetWorth(Number.isFinite(value) ? value : 0);
      })
      .catch(() => {
        if (!cancelled) setCurrentNetWorth(0);
      });
    return () => { cancelled = true; };
  }, []);

  const baseline = useMemo(() => {
    const buckets = new Map<string, { ingresos: number; gastos: number; inversiones: number }>();
    const today = new Date();
    for (let index = 12; index >= 1; index -= 1) buckets.set(monthKey(shiftMonth(today, -index)), { ingresos: 0, gastos: 0, inversiones: 0 });
    movements.filter((movement) => movement.includeInForecast !== false).forEach((movement) => {
      const bucket = buckets.get(movement.date.slice(0, 7));
      if (!bucket) return;
      if (movement.type === "beneficio") bucket.ingresos += movement.amount;
      if (movement.type === "gasto_necesario" || movement.type === "gasto_innecesario") bucket.gastos += movement.amount;
      if (movement.type === "inversion") bucket.inversiones += movement.amount;
    });
    return {
      ingresos: robustAverage([...buckets.values()].map((value) => value.ingresos)),
      gastos: robustAverage([...buckets.values()].map((value) => value.gastos)),
      inversiones: robustAverage([...buckets.values()].map((value) => value.inversiones)),
      months: buckets.size,
    };
  }, [movements]);

  const forecast = useMemo(() => {
    return Array.from({ length: horizon }, (_, index) => {
      const date = shiftMonth(new Date(), index + 1);
      const ingresos = baseline.ingresos;
      const gastos = baseline.gastos;
      const balance = ingresos - gastos - baseline.inversiones;
      return { month: date.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }), ingresos: round(ingresos), gastos: round(gastos), ahorroMensual: round(ingresos - gastos), inversiones: round(baseline.inversiones), balance: round(balance), ahorroAcumulado: 0, balanceAcumulado: 0 };
    }).reduce<Array<{ month: string; ingresos: number; gastos: number; ahorroMensual: number; inversiones: number; balance: number; ahorroAcumulado: number; balanceAcumulado: number; patrimonioConInversiones: number; patrimonioSinInversiones: number }>>((rows, row) => {
      const ahorroAcumulado = (rows.at(-1)?.ahorroAcumulado ?? 0) + row.ahorroMensual;
      const balanceAcumulado = (rows.at(-1)?.balanceAcumulado ?? 0) + row.balance;
      const patrimonioConInversiones = (currentNetWorth ?? 0) + ahorroAcumulado;
      const patrimonioSinInversiones = (currentNetWorth ?? 0) + balanceAcumulado;
      rows.push({
        ...row,
        ahorroAcumulado: round(ahorroAcumulado),
        balanceAcumulado: round(balanceAcumulado),
        patrimonioConInversiones: round(patrimonioConInversiones),
        patrimonioSinInversiones: round(patrimonioSinInversiones),
      });
      return rows;
    }, []);
  }, [baseline, horizon, currentNetWorth]);

  return (
    <section className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Ingreso mensual estimado" value={formatEUR(baseline.ingresos)} hint={`Media robusta de ${baseline.months} meses`} tone="bg-emerald-300" />
        <SummaryCard label="Gasto mensual estimado" value={formatEUR(baseline.gastos)} hint="Se reducen los atípicos para no sobrerreaccionar" tone="bg-rose-300" />
        <SummaryCard label="Inversiones mensuales estimadas" value={formatEUR(baseline.inversiones)} hint="Media robusta de los últimos meses" tone="bg-violet-300" />
        <SummaryCard label="Ahorro mensual previsto" value={formatEUR(baseline.ingresos - baseline.gastos)} hint="Ingresos menos gastos" tone="bg-amber-300" />
        <SummaryCard label="Balance mensual previsto" value={formatEUR(baseline.ingresos - baseline.gastos - baseline.inversiones)} hint="Ahorro menos inversiones" tone="bg-cyan-300" />
        <SummaryCard label="Ahorro acumulado previsto" value={formatEUR(forecast.at(-1)?.ahorroAcumulado ?? 0)} hint={`${horizon} meses · sin restar inversiones`} tone="bg-amber-300" />
        <SummaryCard label="Balance acumulado previsto" value={formatEUR(forecast.at(-1)?.balanceAcumulado ?? 0)} hint={`${horizon} meses · después de inversiones`} tone="bg-cyan-300" />
        <SummaryCard label="Patrimonio futuro con inversiones" value={currentNetWorth === null ? "Cargando…" : formatEUR(forecast.at(-1)?.patrimonioConInversiones ?? currentNetWorth)} hint={`Patrimonio actual ${currentNetWorth === null ? "—" : formatEUR(currentNetWorth)} + ahorro acumulado`} tone="bg-emerald-300" />
        <SummaryCard label="Patrimonio futuro sin inversiones" value={currentNetWorth === null ? "Cargando…" : formatEUR(forecast.at(-1)?.patrimonioSinInversiones ?? currentNetWorth)} hint="Patrimonio actual + balance acumulado" tone="bg-slate-300" />
      </div>
      <article className={`${cardClass} border border-white/[0.08] p-5 md:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Previsión estimada</p><h2 className="mt-1 text-2xl font-black text-white">Próximos meses</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">La línea base usa los últimos 12 meses y una media recortada para que un movimiento marcado como extraordinario no distorsione tus hábitos habituales.</p></div><label className="text-sm font-semibold text-slate-300">Horizonte<select className="ml-2 rounded-xl border border-white/10 bg-[#081525] px-3 py-2 text-white" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}><option value={6}>6 meses</option><option value={12}>12 meses</option><option value={24}>24 meses</option></select></label></div>
        <div className="mt-6 h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={forecast}><CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fill: "#94A3B8", fontSize: 12 }} /><YAxis tick={{ fill: "#94A3B8", fontSize: 12 }} /><Tooltip formatter={(value: unknown) => formatEUR(Number(value))} contentStyle={chartTooltipStyle} /><Line type="monotone" dataKey="ingresos" name="Ingresos previstos" stroke="#34D399" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="gastos" name="Gastos previstos" stroke="#FB7185" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="inversiones" name="Inversiones previstas" stroke="#A78BFA" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="ahorroAcumulado" name="Ahorro acumulado" stroke="#FBBF24" strokeWidth={2} dot /><Line type="monotone" dataKey="balanceAcumulado" name="Balance acumulado" stroke="#22D3EE" strokeWidth={2} dot /><Line type="monotone" dataKey="patrimonioConInversiones" name="Patrimonio con inversiones" stroke="#10B981" strokeWidth={3} dot /><Line type="monotone" dataKey="patrimonioSinInversiones" name="Patrimonio sin inversiones" stroke="#CBD5E1" strokeWidth={3} dot /></LineChart></ResponsiveContainer></div>
      </article>
    </section>
  );
}
