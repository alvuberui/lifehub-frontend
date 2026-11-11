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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function trendRate(values: number[]) {
  if (values.length < 4) return 0;
  const split = Math.floor(values.length / 2);
  const first = robustAverage(values.slice(0, split));
  const second = robustAverage(values.slice(split));
  if (first === 0) return 0;
  return clamp((second - first) / Math.abs(first) / values.length, -0.03, 0.03);
}

type ForecastMonth = {
  monthIndex: number;
  ingresos: number;
  gastos: number;
  inversiones: number;
  recurringIngresos: number;
  recurringGastos: number;
  recurringInversiones: number;
};

type ForecastCategory = "ingresos" | "gastos" | "inversiones";

type RecurringItem = {
  label: string;
  category: ForecastCategory;
  amount: number;
  months: number;
};

type RecurringDetection = {
  totals: Record<ForecastCategory, number>;
  byMonth: Map<string, Record<ForecastCategory, number>>;
  items: RecurringItem[];
};

function recurringCategory(movement: InsightMovement): ForecastCategory | null {
  if (movement.type === "beneficio") return "ingresos";
  if (movement.type === "gasto_necesario" || movement.type === "gasto_innecesario") return "gastos";
  if (movement.type === "inversion") return "inversiones";
  return null;
}

function normalizeRecurringText(value: string) {
  return value
    .toLocaleLowerCase("es-ES")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\d+/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function detectRecurringMovements(movements: InsightMovement[], activeMonthCount: number): RecurringDetection {
  const groups = new Map<string, { label: string; category: ForecastCategory; months: Map<string, number> }>();

  movements.filter((movement) => movement.includeInForecast !== false).forEach((movement) => {
    const category = recurringCategory(movement);
    if (!category) return;
    const description = normalizeRecurringText(movement.description ?? "");
    const tag = normalizeRecurringText(movement.tagName ?? "");
    const identity = description || tag;
    if (!identity) return;

    const key = `${category}|${identity}|${tag}`;
    const group = groups.get(key) ?? {
      label: movement.description?.trim() || movement.tagName?.trim() || "Movimiento recurrente",
      category,
      months: new Map<string, number>(),
    };
    group.months.set(movement.date.slice(0, 7), (group.months.get(movement.date.slice(0, 7)) ?? 0) + movement.amount);
    groups.set(key, group);
  });

  const totals: Record<ForecastCategory, number> = { ingresos: 0, gastos: 0, inversiones: 0 };
  const byMonth = new Map<string, Record<ForecastCategory, number>>();
  const items: RecurringItem[] = [];

  groups.forEach((group) => {
    const values = [...group.months.values()];
    const coverage = group.months.size / Math.max(activeMonthCount, 1);
    // Tres apariciones y presencia en al menos la mitad del historial reducen
    // el riesgo de clasificar una compra puntual como una cuota recurrente.
    if (values.length < 3 || coverage < 0.5) return;

    const amount = median(values);
    totals[group.category] += amount;
    items.push({ label: group.label, category: group.category, amount: round(amount), months: values.length });
    group.months.forEach((value, month) => {
      const row = byMonth.get(month) ?? { ingresos: 0, gastos: 0, inversiones: 0 };
      row[group.category] += value;
      byMonth.set(month, row);
    });
  });

  return {
    totals: {
      ingresos: round(totals.ingresos),
      gastos: round(totals.gastos),
      inversiones: round(totals.inversiones),
    },
    byMonth,
    items: items.sort((a, b) => b.amount - a.amount),
  };
}

function estimateVariableMonthlyValue(
  history: ForecastMonth[],
  field: ForecastCategory,
  recurringField: "recurringIngresos" | "recurringGastos" | "recurringInversiones",
  monthIndex: number,
  futureIndex: number,
  fallback: number,
) {
  const values = history.map((month) => Math.max(0, month[field] - month[recurringField]));
  const seasonalValues = history
    .filter((month) => month.monthIndex === monthIndex)
    .map((month) => Math.max(0, month[field] - month[recurringField]));
  const seasonal = seasonalValues.length > 0 ? robustAverage(seasonalValues) : fallback;
  const rate = trendRate(values);
  const trend = fallback * (1 + clamp(rate * (futureIndex + 1), -0.25, 0.25));
  return Math.max(0, seasonalValues.length > 0 ? seasonal * 0.75 + trend * 0.25 : trend);
}

type ForecastScope = "mine" | "theirs" | "combined";

type SharedNetWorthSummary = {
  personalNetWorth?: number;
  members?: Array<{ email: string; netWorth: number }>;
};

type ScenarioKey = "conservative" | "base" | "optimistic";

type ForecastRow = {
  monthKey: string;
  month: string;
  ingresos: number;
  gastos: number;
  plannedIngresos: number;
  plannedGastos: number;
  ahorroMensual: number;
  inversiones: number;
  balance: number;
  ahorroAcumulado: number;
  balanceAcumulado: number;
  patrimonioConInversiones: number;
  patrimonioSinInversiones: number;
};

type ForecastEvent = {
  id: number;
  name: string;
  month: string;
  amount: number;
  type: "expense" | "income";
};

const scenarioLabels: Record<ScenarioKey, string> = {
  conservative: "Conservador",
  base: "Más probable",
  optimistic: "Optimista",
};

const scenarioDescriptions: Record<ScenarioKey, string> = {
  conservative: "Ingresos -5% y gastos +8%",
  base: "Histórico recurrente y estacionalidad",
  optimistic: "Ingresos +5% y gastos -5%",
};

function projectScenario(
  monthlyRows: Array<Omit<ForecastRow, "ahorroAcumulado" | "balanceAcumulado" | "patrimonioConInversiones" | "patrimonioSinInversiones">>,
  scenario: ScenarioKey,
  currentNetWorth: number,
) {
  const incomeFactor = scenario === "conservative" ? 0.95 : scenario === "optimistic" ? 1.05 : 1;
  const expenseFactor = scenario === "conservative" ? 1.08 : scenario === "optimistic" ? 0.95 : 1;

  return monthlyRows.reduce<ForecastRow[]>((rows, row) => {
    // Los eventos manuales son importes conocidos y no se distorsionan con
    // el margen del escenario; el margen solo afecta al comportamiento normal.
    const ingresos = round((row.ingresos - row.plannedIngresos) * incomeFactor + row.plannedIngresos);
    const gastos = round((row.gastos - row.plannedGastos) * expenseFactor + row.plannedGastos);
    const ahorroMensual = round(ingresos - gastos);
    const inversiones = row.inversiones;
    const balance = round(ahorroMensual - inversiones);
    const ahorroAcumulado = round((rows.at(-1)?.ahorroAcumulado ?? 0) + ahorroMensual);
    const balanceAcumulado = round((rows.at(-1)?.balanceAcumulado ?? 0) + balance);
    rows.push({
      ...row,
      ingresos,
      gastos,
      ahorroMensual,
      inversiones,
      balance,
      ahorroAcumulado,
      balanceAcumulado,
      patrimonioConInversiones: round(currentNetWorth + ahorroAcumulado),
      patrimonioSinInversiones: round(currentNetWorth + balanceAcumulado),
    });
    return rows;
  }, []);
}

export function ForecastPanel({
  movements,
  scope = "mine",
  selectedOwnerEmail = "",
  sharedOwners = [],
}: {
  movements: InsightMovement[];
  scope?: ForecastScope;
  selectedOwnerEmail?: string;
  sharedOwners?: string[];
}) {
  const [horizon, setHorizon] = useState(12);
  const [scenario, setScenario] = useState<ScenarioKey>("base");
  const [currentNetWorth, setCurrentNetWorth] = useState<number | null>(null);
  const [plannedEvents, setPlannedEvents] = useState<ForecastEvent[]>([]);
  const [eventDraft, setEventDraft] = useState({ name: "", month: monthKey(shiftMonth(new Date(), 1)), amount: "", type: "expense" as ForecastEvent["type"] });
  const [eventBusy, setEventBusy] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const endpoint = scope === "mine" ? "/api/movements?netWorth=1" : "/api/movements?sharedSummary=1";
    fetch(endpoint, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok) throw new Error("No se pudo cargar el patrimonio actual");
        if (scope === "mine") {
          const value = Number(payload.data);
          if (!cancelled) setCurrentNetWorth(Number.isFinite(value) ? value : 0);
          return;
        }

        const summary = payload.data as SharedNetWorthSummary;
        const members = summary.members ?? [];
        const wantedOwners = scope === "theirs"
          ? (selectedOwnerEmail ? [selectedOwnerEmail] : [])
          : sharedOwners;
        const sharedNetWorth = members
          .filter((member) => wantedOwners.some((owner) => owner.toLowerCase() === member.email.toLowerCase()))
          .reduce((total, member) => total + Number(member.netWorth ?? 0), 0);
        const value = scope === "combined" ? Number(summary.personalNetWorth ?? 0) + sharedNetWorth : sharedNetWorth;
        if (!cancelled) setCurrentNetWorth(Number.isFinite(value) ? value : 0);
      })
      .catch(() => {
        if (!cancelled) setCurrentNetWorth(0);
      });
    return () => { cancelled = true; };
  }, [scope, selectedOwnerEmail, sharedOwners]);

  useEffect(() => {
    if (scope === "theirs") {
      return;
    }
    let cancelled = false;
    fetch("/api/forecast-events", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok) throw new Error("No se pudieron cargar los eventos planificados");
        if (!cancelled) setPlannedEvents((payload.data ?? []) as ForecastEvent[]);
      })
      .catch(() => {
        if (!cancelled) setPlannedEvents([]);
      });
    return () => { cancelled = true; };
  }, [scope]);

  const visiblePlannedEvents = useMemo(() => scope === "theirs" ? [] : plannedEvents, [scope, plannedEvents]);

  async function createPlannedEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(eventDraft.amount);
    if (!eventDraft.name.trim() || !eventDraft.month || !Number.isFinite(amount) || amount <= 0) {
      setEventError("Indica un nombre, un mes y un importe válido.");
      return;
    }
    setEventBusy(true);
    setEventError(null);
    try {
      const response = await fetch("/api/forecast-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: eventDraft.name.trim(), month: eventDraft.month, amount, type: eventDraft.type }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error?.message ?? "No se pudo guardar el evento");
      setPlannedEvents((current) => [...current, payload.data as ForecastEvent].sort((a, b) => a.month.localeCompare(b.month)));
      setEventDraft((current) => ({ ...current, name: "", amount: "" }));
    } catch (error) {
      setEventError(error instanceof Error ? error.message : "No se pudo guardar el evento");
    } finally {
      setEventBusy(false);
    }
  }

  async function deletePlannedEvent(id: number) {
    setEventBusy(true);
    setEventError(null);
    try {
      const response = await fetch(`/api/forecast-events/${id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error?.message ?? "No se pudo eliminar el evento");
      setPlannedEvents((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      setEventError(error instanceof Error ? error.message : "No se pudo eliminar el evento");
    } finally {
      setEventBusy(false);
    }
  }

  const baseline = useMemo(() => {
    const buckets = new Map<string, { ingresos: number; gastos: number; inversiones: number; active: boolean }>();
    const today = new Date();
    for (let index = 12; index >= 1; index -= 1) buckets.set(monthKey(shiftMonth(today, -index)), { ingresos: 0, gastos: 0, inversiones: 0, active: false });
    movements.filter((movement) => movement.includeInForecast !== false).forEach((movement) => {
      const bucket = buckets.get(movement.date.slice(0, 7));
      if (!bucket) return;
      bucket.active = true;
      if (movement.type === "beneficio") bucket.ingresos += movement.amount;
      if (movement.type === "gasto_necesario" || movement.type === "gasto_innecesario") bucket.gastos += movement.amount;
      if (movement.type === "inversion") bucket.inversiones += movement.amount;
    });
    const activeMonthCount = [...buckets.values()].filter((value) => value.active).length;
    const recurrence = detectRecurringMovements(movements, activeMonthCount);
    const history: ForecastMonth[] = [...buckets.entries()].filter(([, values]) => values.active).map(([key, values]) => {
      const recurring = recurrence.byMonth.get(key) ?? { ingresos: 0, gastos: 0, inversiones: 0 };
      return {
        monthIndex: Number(key.slice(5, 7)) - 1,
        ingresos: values.ingresos,
        gastos: values.gastos,
        inversiones: values.inversiones,
        recurringIngresos: recurring.ingresos,
        recurringGastos: recurring.gastos,
        recurringInversiones: recurring.inversiones,
      };
    });
    return {
      ingresos: robustAverage(history.map((value) => value.ingresos)),
      gastos: robustAverage(history.map((value) => value.gastos)),
      inversiones: robustAverage(history.map((value) => value.inversiones)),
      recurring: recurrence,
      history,
      months: history.length,
    };
  }, [movements]);

  const monthlyForecast = useMemo(() => Array.from({ length: horizon }, (_, index) => {
      const date = shiftMonth(new Date(), index + 1);
      const ingresosVariables = estimateVariableMonthlyValue(baseline.history, "ingresos", "recurringIngresos", date.getMonth(), index, Math.max(0, baseline.ingresos - baseline.recurring.totals.ingresos));
      const gastosVariables = estimateVariableMonthlyValue(baseline.history, "gastos", "recurringGastos", date.getMonth(), index, Math.max(0, baseline.gastos - baseline.recurring.totals.gastos));
      const inversionesVariables = estimateVariableMonthlyValue(baseline.history, "inversiones", "recurringInversiones", date.getMonth(), index, Math.max(0, baseline.inversiones - baseline.recurring.totals.inversiones));
      return {
        monthKey: monthKey(date),
        month: date.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }),
        ingresos: round(baseline.recurring.totals.ingresos + ingresosVariables),
        gastos: round(baseline.recurring.totals.gastos + gastosVariables),
        plannedIngresos: 0,
        plannedGastos: 0,
        ahorroMensual: 0,
        inversiones: round(baseline.recurring.totals.inversiones + inversionesVariables),
        balance: 0,
      };
    }).map((row) => {
      const eventsForMonth = visiblePlannedEvents.filter((event) => event.month === row.monthKey);
      const planned = eventsForMonth.reduce((result, event) => ({
        ...result,
        ingresos: event.type === "income" ? round(result.ingresos + event.amount) : result.ingresos,
        gastos: event.type === "expense" ? round(result.gastos + event.amount) : result.gastos,
        plannedIngresos: event.type === "income" ? round(result.plannedIngresos + event.amount) : result.plannedIngresos,
        plannedGastos: event.type === "expense" ? round(result.plannedGastos + event.amount) : result.plannedGastos,
      }), row);
      return planned;
    }), [baseline, horizon, visiblePlannedEvents]);

  const projections = useMemo(() => ({
    conservative: projectScenario(monthlyForecast, "conservative", currentNetWorth ?? 0),
    base: projectScenario(monthlyForecast, "base", currentNetWorth ?? 0),
    optimistic: projectScenario(monthlyForecast, "optimistic", currentNetWorth ?? 0),
  }), [monthlyForecast, currentNetWorth]);

  const forecast = projections[scenario];
  const averageMonthly = useMemo(() => ({
    ingresos: forecast.length ? round(forecast.reduce((sum, row) => sum + row.ingresos, 0) / forecast.length) : 0,
    gastos: forecast.length ? round(forecast.reduce((sum, row) => sum + row.gastos, 0) / forecast.length) : 0,
    inversiones: forecast.length ? round(forecast.reduce((sum, row) => sum + row.inversiones, 0) / forecast.length) : 0,
    ahorro: forecast.length ? round(forecast.reduce((sum, row) => sum + row.ahorroMensual, 0) / forecast.length) : 0,
    balance: forecast.length ? round(forecast.reduce((sum, row) => sum + row.balance, 0) / forecast.length) : 0,
  }), [forecast]);

  return (
    <section className="space-y-5">
      <article className={`${cardClass} border border-white/[0.08] p-5 md:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Escenarios de previsión</p>
            <h2 className="mt-1 text-2xl font-black text-white">Elige cómo quieres estimarlo</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">La base detecta ingresos, cuotas y gastos que se repiten. Los escenarios añaden un margen prudente para no presentar una falsa certeza.</p>
          </div>
          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">{baseline.recurring.items.length} recurrentes detectados</span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {(Object.keys(scenarioLabels) as ScenarioKey[]).map((key) => {
            const projection = projections[key];
            const finalRow = projection.at(-1);
            return <button key={key} type="button" onClick={() => setScenario(key)} className={`rounded-2xl border p-4 text-left transition ${scenario === key ? "border-cyan-300/50 bg-cyan-300/10" : "border-white/[0.08] bg-black/10 hover:border-white/20"}`}>
              <div className="flex items-center justify-between gap-3"><span className="font-black text-white">{scenarioLabels[key]}</span><span className={`h-2.5 w-2.5 rounded-full ${key === "conservative" ? "bg-rose-300" : key === "optimistic" ? "bg-emerald-300" : "bg-cyan-300"}`} /></div>
              <p className="mt-2 text-xs leading-5 text-slate-400">{scenarioDescriptions[key]}</p>
              <p className="mt-3 text-sm font-bold text-white">Patrimonio final: {formatEUR(finalRow?.patrimonioConInversiones ?? currentNetWorth ?? 0)}</p>
            </button>;
          })}
        </div>
      </article>
      {scope !== "theirs" ? <article className={`${cardClass} border border-white/[0.08] p-5 md:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Ajustes manuales</p><h2 className="mt-1 text-xl font-black text-white">Eventos que ya conoces</h2><p className="mt-2 text-sm leading-6 text-slate-400">Añade una boda, vacaciones, una paga extra o una compra grande. Afectará solo a la previsión, no creará un movimiento real.</p></div><span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-xs font-semibold text-violet-100">Solo previsión</span></div>
        <form onSubmit={createPlannedEvent} className="mt-5 grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_auto]">
          <input required value={eventDraft.name} onChange={(event) => setEventDraft((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-[#081525] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/50" placeholder="Ej. Vacaciones" />
          <input required type="month" value={eventDraft.month} onChange={(event) => setEventDraft((current) => ({ ...current, month: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-[#081525] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/50" />
          <input required min="0.01" step="0.01" type="number" value={eventDraft.amount} onChange={(event) => setEventDraft((current) => ({ ...current, amount: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-[#081525] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/50" placeholder="Importe €" />
          <select value={eventDraft.type} onChange={(event) => setEventDraft((current) => ({ ...current, type: event.target.value as ForecastEvent["type"] }))} className="rounded-xl border border-white/10 bg-[#081525] px-3 py-2.5 text-sm text-white outline-none"><option value="expense">Gasto</option><option value="income">Ingreso</option></select>
          <button type="submit" disabled={eventBusy} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-50">Añadir</button>
        </form>
        {eventError ? <p className="mt-3 text-xs text-rose-200">{eventError}</p> : null}
        {visiblePlannedEvents.length > 0 ? <div className="mt-4 flex flex-wrap gap-2">{visiblePlannedEvents.map((event) => <span key={event.id} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-1.5 text-xs text-slate-300">{event.name} · {event.month} · {event.type === "expense" ? "−" : "+"}{formatEUR(event.amount)}<button type="button" disabled={eventBusy} onClick={() => void deletePlannedEvent(event.id)} className="text-rose-200 hover:text-white" aria-label={`Eliminar ${event.name}`}>×</button></span>)}</div> : null}
      </article> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Ingreso mensual estimado" value={formatEUR(averageMonthly.ingresos)} hint={`${scenarioLabels[scenario]} · media del horizonte`} tone="bg-emerald-300" />
        <SummaryCard label="Gasto mensual estimado" value={formatEUR(averageMonthly.gastos)} hint={`${scenarioLabels[scenario]} · incluye recurrentes`} tone="bg-rose-300" />
        <SummaryCard label="Inversiones mensuales estimadas" value={formatEUR(averageMonthly.inversiones)} hint={`${scenarioLabels[scenario]} · media del horizonte`} tone="bg-violet-300" />
        <SummaryCard label="Ahorro mensual previsto" value={formatEUR(averageMonthly.ahorro)} hint="Ingresos menos gastos" tone="bg-amber-300" />
        <SummaryCard label="Balance mensual previsto" value={formatEUR(averageMonthly.balance)} hint="Ahorro menos inversiones" tone="bg-cyan-300" />
        <SummaryCard label="Ahorro acumulado previsto" value={formatEUR(forecast.at(-1)?.ahorroAcumulado ?? 0)} hint={`${horizon} meses · sin restar inversiones`} tone="bg-amber-300" />
        <SummaryCard label="Balance acumulado previsto" value={formatEUR(forecast.at(-1)?.balanceAcumulado ?? 0)} hint={`${horizon} meses · después de inversiones`} tone="bg-cyan-300" />
        <SummaryCard label="Patrimonio futuro con inversiones" value={currentNetWorth === null ? "Cargando…" : formatEUR(forecast.at(-1)?.patrimonioConInversiones ?? currentNetWorth)} hint={`Patrimonio actual ${currentNetWorth === null ? "—" : formatEUR(currentNetWorth)} + ahorro acumulado`} tone="bg-emerald-300" />
        <SummaryCard label="Patrimonio futuro sin inversiones" value={currentNetWorth === null ? "Cargando…" : formatEUR(forecast.at(-1)?.patrimonioSinInversiones ?? currentNetWorth)} hint="Patrimonio actual + balance acumulado" tone="bg-slate-300" />
      </div>
      <article className={`${cardClass} border border-white/[0.08] p-5 md:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Previsión estimada · {scenarioLabels[scenario]}</p><h2 className="mt-1 text-2xl font-black text-white">Próximos meses</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Cada mes combina el patrón histórico de ese periodo, movimientos recurrentes y la tendencia reciente. El horizonte no inventa movimientos reales.</p></div><label className="text-sm font-semibold text-slate-300">Horizonte<select className="ml-2 rounded-xl border border-white/10 bg-[#081525] px-3 py-2 text-white" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}><option value={6}>6 meses</option><option value={12}>12 meses</option><option value={24}>24 meses</option></select></label></div>
        {baseline.recurring.items.length > 0 ? <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/10 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-white">Patrones recurrentes incluidos</p><p className="text-xs text-slate-500">Mínimo 3 apariciones y presencia en la mitad del historial</p></div><div className="mt-3 flex flex-wrap gap-2">{baseline.recurring.items.slice(0, 6).map((item) => <span key={`${item.category}-${item.label}`} className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1.5 text-xs text-cyan-100">{item.label} · {formatEUR(item.amount)}/mes</span>)}</div></div> : <div className="mt-5 rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-4 text-xs leading-5 text-amber-100">Todavía no hay suficientes repeticiones para identificar cuotas automáticamente. La previsión usa estacionalidad y tendencia del historial disponible.</div>}
        <div className="mt-6 h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={forecast}><CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fill: "#94A3B8", fontSize: 12 }} /><YAxis tick={{ fill: "#94A3B8", fontSize: 12 }} /><Tooltip formatter={(value: unknown) => formatEUR(Number(value))} contentStyle={chartTooltipStyle} /><Line type="monotone" dataKey="ingresos" name="Ingresos previstos" stroke="#34D399" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="gastos" name="Gastos previstos" stroke="#FB7185" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="inversiones" name="Inversiones previstas" stroke="#A78BFA" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="ahorroAcumulado" name="Ahorro acumulado" stroke="#FBBF24" strokeWidth={2} dot /><Line type="monotone" dataKey="balanceAcumulado" name="Balance acumulado" stroke="#22D3EE" strokeWidth={2} dot /><Line type="monotone" dataKey="patrimonioConInversiones" name="Patrimonio con inversiones" stroke="#10B981" strokeWidth={3} dot /><Line type="monotone" dataKey="patrimonioSinInversiones" name="Patrimonio sin inversiones" stroke="#CBD5E1" strokeWidth={3} dot /></LineChart></ResponsiveContainer></div>
      </article>
    </section>
  );
}
