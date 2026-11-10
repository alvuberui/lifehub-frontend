// app/(tu-ruta)/dashboard/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { percentageMoney, subtractMoney, sumMoney } from "@/app/lib/money";
import { getErrorMessage } from "@/app/lib/api/errors";
import { normalizeHexColor } from "@/app/lib/color";
import { InlineLoading } from "@/app/components/LoadingUI";
import { ConfirmDialog, Toast } from "@/app/components/FeedbackUI";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import {
  FinanceSummary,
  ForecastPanel,
  PeriodAnalytics,
  type InsightMovement,
} from "@/app/finance/components/FinanceInsights";

type ViewMode = "monthly" | "yearly" | "historic" | "forecast";
type DashboardScope = "mine" | "theirs" | "combined";

type MovementType =
  | "beneficio"
  | "gasto_necesario"
  | "gasto_innecesario"
  | "inversion";

type Movement = {
  id: string;
  ownerEmail?: string;
  weekday: string;
  date: string; // YYYY-MM-DD
  description: string;

  // ✅ etiqueta enriquecida
  tagName?: string;
  tagColor?: string;
  tagId?: string;
  includeInForecast?: boolean;

  type: MovementType;
  amount: number;
};

type BackendMovement = {
  id: number;
  userEmail: string;
  movementType: string;
  amount: number;
  date: string;

  tagId?: number | null;
  tagName?: string | null;
  tagColor?: string | null;

  description: string;
  includeInForecast?: boolean;
};

type SharedFinanceDetails = {
  members: string[];
  editableMembers: string[];
  adminMembers: string[];
  movements: BackendMovement[];
};

type IdealPercentageResponse = {
  monthlySavingPercentage: number;
  monthlyNecessaryExpensesPercentage: number;
  monthlyDiscretionaryExpensesPercentage: number;
  monthlyInvestmentPercentage: number;
};

type AnnualMetricBackend =
  | "BENEFIT"
  | "TOTAL_EXPENSES"
  | "NECESSARY_EXPENSES"
  | "DISCRETIONARY_EXPENSES"
  | "INVESTMENTS"
  | "SAVINGS";

type AnnualResponse = {
  movementType: string | null;
  year: number;
  series: Array<{
    month: number;
    monthName: string;
    idealAmount: number;
    realAmount: number;
  }>;
};

type HistoricalResponse = {
  metric: AnnualMetricBackend;
  series: Array<{
    year: number;
    idealAmount: number;
    realAmount: number;
  }>;
};

const monthNames = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const typeLabel: Record<MovementType, string> = {
  beneficio: "Beneficio",
  gasto_necesario: "Gasto necesario",
  gasto_innecesario: "Gasto innecesario",
  inversion: "Inversión",
};

const metricOptions = [
  { key: "beneficios", label: "Beneficios" },
  { key: "gastos_necesarios", label: "Gastos necesarios" },
  { key: "gastos_innecesarios", label: "Gastos innecesarios" },
  { key: "gastos_totales", label: "Gastos totales" },
  { key: "inversion", label: "Inversión" },
  { key: "ahorros", label: "Ahorros" },
] as const;

type MetricKey = (typeof metricOptions)[number]["key"];

function isMetricKey(value: string): value is MetricKey {
  return metricOptions.some((option) => option.key === value);
}

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-[#081525]/80 px-4 py-3 text-slate-100 shadow-inner shadow-black/10 outline-none placeholder:text-slate-600 transition focus:border-cyan-300/50 focus:bg-[#0b1b31] focus:ring-4 focus:ring-cyan-300/10";
const cardClass =
  "surface rounded-[1.75rem]";

function formatEUR(n: number) {
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} €`;
  }
}

function chipType(type: MovementType) {
  const base =
    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold";
  switch (type) {
    case "beneficio":
      return `${base} border-emerald-400/30 bg-emerald-500/10 text-emerald-200`;
    case "gasto_necesario":
      return `${base} border-sky-400/30 bg-sky-500/10 text-sky-200`;
    case "gasto_innecesario":
      return `${base} border-amber-400/30 bg-amber-500/10 text-amber-100`;
    case "inversion":
      return `${base} border-violet-400/30 bg-violet-500/10 text-violet-200`;
  }
}

function IconButton({
  children,
  onClick,
  title,
  variant = "ghost",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  variant?: "ghost" | "danger";
  disabled?: boolean;
}) {
  const cls =
    variant === "danger"
      ? "rounded-xl border border-red-400/30 bg-red-500/10 text-red-200 px-3 py-2 text-sm hover:bg-red-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
      : "rounded-xl border border-white/10 bg-black/20 text-gray-200 px-3 py-2 text-sm hover:bg-black/30 transition disabled:opacity-50 disabled:cursor-not-allowed";
  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function mapBackendType(t: string): MovementType {
  switch (t) {
    case "BENEFIT":
      return "beneficio";
    case "ESSENTIAL_EXPENSE":
      return "gasto_necesario";
    case "DISCRETIONARY_EXPENSE":
    case "NOT_ESSENTIAL_EXPENSE":
      return "gasto_innecesario";
    case "INVESTMENT":
      return "inversion";
    default:
      return "gasto_necesario";
  }
}

function mapBackendMovement(m: BackendMovement): Movement {
  return {
    id: String(m.id),
    ownerEmail: m.userEmail,
    weekday: weekdayEs(m.date),
    date: m.date,
    description: m.description,
    tagName: m.tagName ?? undefined,
    tagColor: m.tagColor ?? undefined,
    tagId: m.tagId == null ? undefined : String(m.tagId),
    includeInForecast: m.includeInForecast !== false,
    type: mapBackendType(m.movementType),
    amount: Number(m.amount ?? 0),
  };
}

function movementAmountForMetric(movements: Movement[], metric: MetricKey) {
  const benefit = sumMoney(movements.filter((m) => m.type === "beneficio").map((m) => m.amount));
  const necessary = sumMoney(movements.filter((m) => m.type === "gasto_necesario").map((m) => m.amount));
  const discretionary = sumMoney(movements.filter((m) => m.type === "gasto_innecesario").map((m) => m.amount));
  const investment = sumMoney(movements.filter((m) => m.type === "inversion").map((m) => m.amount));

  switch (metric) {
    case "beneficios": return benefit;
    case "gastos_necesarios": return necessary;
    case "gastos_innecesarios": return discretionary;
    case "gastos_totales": return sumMoney([necessary, discretionary]);
    case "inversion": return investment;
    case "ahorros": return subtractMoney(benefit, sumMoney([necessary, discretionary, investment]));
  }
}

function buildAnnualChartData(
  movements: Movement[],
  year: number,
  metric: MetricKey,
  ideal: { ahorro: number; gasto_necesario: number; gasto_innecesario: number; inversion: number }
) {
  return Array.from({ length: 12 }, (_, index) => {
    const monthMovements = movements.filter((movement) => {
      const date = new Date(`${movement.date}T00:00:00`);
      return date.getFullYear() === year && date.getMonth() === index;
    });
    const income = movementAmountForMetric(monthMovements, "beneficios");
    const idealPercent = metric === "beneficios"
      ? 100
      : metric === "gastos_necesarios"
        ? ideal.gasto_necesario
        : metric === "gastos_innecesarios"
          ? ideal.gasto_innecesario
          : metric === "inversion"
            ? ideal.inversion
            : metric === "ahorros"
              ? ideal.ahorro
              : ideal.gasto_necesario + ideal.gasto_innecesario;

    return {
      mes: monthNames[index].slice(0, 3),
      ideal: percentageMoney(income, idealPercent),
      real: movementAmountForMetric(monthMovements, metric),
    };
  });
}

function buildHistoricalChartData(
  movements: Movement[],
  metric: MetricKey,
  ideal: { ahorro: number; gasto_necesario: number; gasto_innecesario: number; inversion: number }
) {
  const years = [...new Set(movements.map((movement) => Number(movement.date.slice(0, 4))))].sort((a, b) => a - b);
  return years.map((year) => {
    const yearMovements = movements.filter((movement) => Number(movement.date.slice(0, 4)) === year);
    const income = movementAmountForMetric(yearMovements, "beneficios");
    const idealPercent = metric === "beneficios"
      ? 100
      : metric === "gastos_necesarios"
        ? ideal.gasto_necesario
        : metric === "gastos_innecesarios"
          ? ideal.gasto_innecesario
          : metric === "inversion"
            ? ideal.inversion
            : metric === "ahorros"
              ? ideal.ahorro
              : ideal.gasto_necesario + ideal.gasto_innecesario;
    return {
      year: String(year),
      ideal: percentageMoney(income, idealPercent),
      real: movementAmountForMetric(yearMovements, metric),
    };
  });
}

function toInsightMovements(movements: Movement[]): InsightMovement[] {
  return movements.map(({ id, date, description, tagName, tagColor, type, amount, includeInForecast }) => ({ id, date, description, tagName, tagColor, type, amount, includeInForecast }));
}

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthBounds(year: number, monthIndex: number) {
  return {
    from: isoDate(new Date(year, monthIndex, 1)),
    to: isoDate(new Date(year, monthIndex + 1, 0)),
  };
}

function shiftMonth(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, date.getDate());
}

function weekdayEs(date: string) {
  const d = new Date(`${date}T00:00:00`);
  const w = d.toLocaleDateString("es-ES", { weekday: "long" });
  return w.charAt(0).toUpperCase() + w.slice(1);
}

function normalizeIdeal(d: IdealPercentageResponse) {
  return {
    ahorro: d.monthlySavingPercentage,
    gasto_necesario: d.monthlyNecessaryExpensesPercentage,
    gasto_innecesario: d.monthlyDiscretionaryExpensesPercentage,
    inversion: d.monthlyInvestmentPercentage,
  };
}

function metricKeyToBackend(metric: MetricKey): AnnualMetricBackend {
  switch (metric) {
    case "beneficios":
      return "BENEFIT";
    case "gastos_necesarios":
      return "NECESSARY_EXPENSES";
    case "gastos_innecesarios":
      return "DISCRETIONARY_EXPENSES";
    case "gastos_totales":
      return "TOTAL_EXPENSES";
    case "inversion":
      return "INVESTMENTS";
    case "ahorros":
      return "SAVINGS";
  }
}

function TagChip({ name, color }: { name?: string; color?: string }) {
  if (!name) return <span className="text-gray-500">—</span>;

  const hex = normalizeHexColor(color) ?? "#64748B"; // fallback gris

  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
      style={{
        borderColor: hex,
        backgroundColor: `${hex}22`,
        color: hex,
      }}
      title={name}
    >
      {name}
    </span>
  );
}

function SharedTagAdmin({ ownerEmail }: { ownerEmail: string }) {
  const [tags, setTags] = useState<Array<{ id: number; name: string; color: string }>>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#22C55E");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await fetch(`/api/tags/shared/${encodeURIComponent(ownerEmail)}`, { cache: "no-store" });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new Error(payload?.error?.message ?? "No se pudieron cargar las etiquetas.");
    setTags(payload.data ?? []);
  }

  useEffect(() => {
    // La carga asíncrona sincroniza el estado con las etiquetas del propietario.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((reason) => setError(reason instanceof Error ? reason.message : "Error cargando etiquetas."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerEmail]);

  async function createTag(event: React.FormEvent) {
    event.preventDefault();
    try {
      setError(null);
      const response = await fetch(`/api/tags/shared/${encodeURIComponent(ownerEmail)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, color }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error?.message ?? "No se pudo crear la etiqueta.");
      setName("");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Error creando la etiqueta."); }
  }

  async function removeTag(id: number, tagName: string) {
    if (!window.confirm(`¿Eliminar la etiqueta «${tagName}» de ${ownerEmail}?`)) return;
    try {
      setError(null);
      const response = await fetch(`/api/tags/shared/${encodeURIComponent(ownerEmail)}/${id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error?.message ?? "No se pudo eliminar la etiqueta.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Error eliminando la etiqueta."); }
  }

  return <article className="rounded-2xl border border-violet-300/20 bg-violet-300/[0.04] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-bold text-violet-100">Etiquetas de {ownerEmail}</p><p className="mt-1 text-xs text-violet-200/70">Puedes administrar también sus movimientos.</p></div><div className="flex flex-wrap items-center gap-2"><Link href={`/finance/movements/create?ownerEmail=${encodeURIComponent(ownerEmail)}`} className="rounded-xl bg-violet-300 px-3 py-2 text-xs font-black text-slate-950">Crear movimiento</Link><span className="rounded-full border border-violet-300/20 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wider text-violet-200">Administración</span></div></div>{error ? <p className="mt-2 text-xs text-rose-200">{error}</p> : null}<div className="mt-3 flex flex-wrap gap-2">{tags.map((tag) => <span key={tag.id} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />{tag.name}<button type="button" onClick={() => void removeTag(tag.id, tag.name)} className="text-rose-200">×</button></span>)}</div><form onSubmit={createTag} className="mt-4 flex flex-col gap-2 sm:flex-row"><input required maxLength={40} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nueva etiqueta" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#081525] px-3 py-2 text-sm text-white outline-none" /><input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-10 w-12 rounded-lg border border-white/10 bg-transparent p-1" /><button type="submit" className="rounded-xl bg-violet-300 px-4 py-2 text-xs font-black text-slate-950">Crear etiqueta</button></form></article>;
}

function SharedFinanceSection({
  details,
  scope,
  selectedOwnerEmail,
  showMovementsTable,
  onEdit,
  onDelete,
  deletingId,
}: {
  details: SharedFinanceDetails | null;
  scope: DashboardScope;
  selectedOwnerEmail: string;
  showMovementsTable: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  if (!details || scope === "mine") return null;
  const owners = scope === "theirs"
    ? (selectedOwnerEmail ? [selectedOwnerEmail] : [])
    : details.members;
  const editableOwners = owners.filter((ownerEmail) => details.editableMembers.includes(ownerEmail));
  const manageableMovements = details.movements
    .filter((movement) => editableOwners.includes(movement.userEmail))
    .map(mapBackendMovement);
  const adminOwners = owners.filter((ownerEmail) => details.adminMembers.includes(ownerEmail));

  return (
    <section className="space-y-4 border-t border-white/10 pt-8">
      <div>
        <p className="eyebrow">Permisos compartidos</p>
        <h2 className="mt-1 text-2xl font-black text-white">Gestión compartida</h2>
        <p className="mt-2 text-sm text-slate-400">
          {scope === "theirs" ? `Cuenta seleccionada: ${selectedOwnerEmail}` : "Cuentas seleccionadas: " + details.members.join(", ")}
        </p>
        <p className="mt-1 text-xs text-slate-500">Los movimientos solo se muestran cuando tienes permiso de edición o administración.</p>
      </div>
      {showMovementsTable && editableOwners.length > 0 ? (
        <article className={`${cardClass} overflow-hidden border border-amber-300/20 p-5 md:p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-white">Movimientos compartidos</h3>
              <p className="mt-1 text-xs text-slate-500">Puedes editar, eliminar y revisar los movimientos de: {editableOwners.join(", ")}</p>
            </div>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-200">Permiso de edición</span>
          </div>
          <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-white/10 md:block">
            <table className="w-full min-w-[820px] table-fixed text-sm">
              <thead className="bg-black/30 text-gray-300"><tr><th className="px-4 py-3 text-left">Usuario</th><th className="px-4 py-3 text-left">Fecha</th><th className="px-4 py-3 text-left">Descripción</th><th className="px-4 py-3 text-left">Tipo</th><th className="px-4 py-3 text-right">Importe</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead>
              <tbody className="divide-y divide-white/10">
                {manageableMovements.map((mapped) => {
                  const movement = details.movements.find((item) => String(item.id) === mapped.id && item.userEmail === mapped.ownerEmail);
                  if (!movement) return null;
                  return <tr key={`${movement.userEmail}-${movement.id}`} className="hover:bg-white/5"><td className="px-4 py-3 text-slate-300">{movement.userEmail}</td><td className="px-4 py-3 text-slate-300">{movement.date}</td><td className="px-4 py-3 font-medium text-white">{movement.description}</td><td className="px-4 py-3"><span className={chipType(mapped.type)}>{typeLabel[mapped.type]}</span></td><td className="px-4 py-3 text-right font-semibold text-white">{formatEUR(mapped.amount)}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><IconButton onClick={() => onEdit(String(movement.id))} disabled={!!deletingId}>Editar</IconButton><IconButton onClick={() => onDelete(String(movement.id))} variant="danger" disabled={!!deletingId}>{deletingId === String(movement.id) ? "Eliminando…" : "Eliminar"}</IconButton></div></td></tr>;
                })}
                {manageableMovements.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">No hay movimientos gestionables en este periodo.</td></tr> : null}
              </tbody>
            </table>
          </div>
          <div className="mt-5 space-y-3 md:hidden">
            {manageableMovements.map((mapped) => {
              const movement = details.movements.find((item) => String(item.id) === mapped.id && item.userEmail === mapped.ownerEmail);
              if (!movement) return null;
              return <article key={`${movement.userEmail}-${movement.id}`} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-white" title={movement.description}>{movement.description}</p><p className="mt-1 text-xs text-slate-400">{movement.userEmail} · {movement.date}</p></div><p className="shrink-0 font-bold text-white">{formatEUR(mapped.amount)}</p></div><div className="mt-3 flex flex-wrap items-center gap-2"><span className={chipType(mapped.type)}>{typeLabel[mapped.type]}</span><TagChip name={mapped.tagName} color={mapped.tagColor} /></div><div className="mt-4 grid grid-cols-2 gap-2"><IconButton onClick={() => onEdit(String(movement.id))} disabled={!!deletingId}>Editar</IconButton><IconButton onClick={() => onDelete(String(movement.id))} variant="danger" disabled={!!deletingId}>{deletingId === String(movement.id) ? "Eliminando…" : "Eliminar"}</IconButton></div></article>;
            })}
            {manageableMovements.length === 0 ? <p className="px-3 py-8 text-center text-sm text-slate-400">No hay movimientos gestionables en este periodo.</p> : null}
          </div>
        </article>
      ) : null}
      {showMovementsTable && editableOwners.length === 0 ? <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">No tienes permiso de edición o administración para ver los movimientos de esta selección.</p> : null}
      {adminOwners.length > 0 ? <div className="space-y-3"><p className="text-sm font-bold text-white">Administración de etiquetas y movimientos</p>{adminOwners.map((ownerEmail) => <SharedTagAdmin key={ownerEmail} ownerEmail={ownerEmail} />)}</div> : null}
    </section>
  );
}

export default function AppDashboardPage() {
  const router = useRouter();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const [mode, setMode] = useState<ViewMode>("monthly");

  // Mensual
  const [year, setYear] = useState<number>(currentYear);
  const [month, setMonth] = useState<number>(currentMonth);
  const [showMonthlyChart, setShowMonthlyChart] = useState<boolean>(false);

  // Anual
  const [annualYear, setAnnualYear] = useState<number>(currentYear);
  const [annualMetric, setAnnualMetric] = useState<MetricKey>("beneficios");

  // Histórico
  const [historicMetric, setHistoricMetric] = useState<MetricKey>("beneficios");
  const [historicFromYear, setHistoricFromYear] = useState<number>(currentYear - 4);
  const [historicToYear, setHistoricToYear] = useState<number>(currentYear);

  // Años disponibles
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loadingYears, setLoadingYears] = useState(false);
  const [yearsError, setYearsError] = useState<string | null>(null);

  // Feedback global (acciones: delete)
  const [actionMsg, setActionMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [confirmMovementId, setConfirmMovementId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const cancelled = false;

    async function loadYears() {
      try {
        setLoadingYears(true);
        setYearsError(null);

        const res = await fetch("/api/movements?years=1", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error?.message ?? `Error cargando años (${res.status})`);
        }

        const years = (json.data ?? []) as number[];
        years.sort((a: number, b: number) => a - b);

        if (!cancelled) {
          setAvailableYears(years);

          if (years.length > 0) {
            const first = years[0];
            const last = years[years.length - 1];

            if (!years.includes(year)) setYear(last);
            if (!years.includes(annualYear)) setAnnualYear(last);

            setHistoricFromYear(first);
            setHistoricToYear(last);
          }
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setYearsError(getErrorMessage(e, "Error"));
          setAvailableYears([]);
        }
      } finally {
        if (!cancelled) setLoadingYears(false);
      }
    }

    loadYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ideal percentages
  const [monthlyIdealPercent, setMonthlyIdealPercent] = useState({
    ahorro: 20,
    gasto_necesario: 50,
    gasto_innecesario: 20,
    inversion: 10,
  });
  const [loadingIdeal, setLoadingIdeal] = useState(false);
  const [idealError, setIdealError] = useState<string | null>(null);

  useEffect(() => {
    const cancelled = false;

    async function loadIdeal() {
      try {
        setLoadingIdeal(true);
        setIdealError(null);

        const res = await fetch("/api/ideal-percentage", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          throw new Error(
            json?.error?.message ?? `No se pudo cargar idealPercentage (${res.status})`
          );
        }

        const d = json.data as IdealPercentageResponse;
        if (!cancelled) setMonthlyIdealPercent(normalizeIdeal(d));
      } catch (e: unknown) {
        if (!cancelled) setIdealError(getErrorMessage(e, "Error"));
      } finally {
        if (!cancelled) setLoadingIdeal(false);
      }
    }

    loadIdeal();
  }, []);

  // Movimientos mensual
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [movementsError, setMovementsError] = useState<string | null>(null);
  const [previousMovements, setPreviousMovements] = useState<Movement[]>([]);
  const [previousYearMovements, setPreviousYearMovements] = useState<Movement[]>([]);
  const [periodMovements, setPeriodMovements] = useState<Movement[]>([]);
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [loadingPeriod, setLoadingPeriod] = useState(false);
  const [sharedDetails, setSharedDetails] = useState<SharedFinanceDetails | null>(null);
  const [sharedDetailsError, setSharedDetailsError] = useState<string | null>(null);
  const [loadingSharedDetails, setLoadingSharedDetails] = useState(false);
  const [sharedRefresh, setSharedRefresh] = useState(0);
  const [dashboardScope, setDashboardScope] = useState<DashboardScope>("mine");
  const [selectedSharedOwner, setSelectedSharedOwner] = useState("");
  const [sharedComparisonDetails, setSharedComparisonDetails] = useState<SharedFinanceDetails | null>(null);

  async function loadMovements() {
    const res = await fetch(`/api/movements?year=${year}&month=${month}`, {
      method: "GET",
      cache: "no-store",
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.ok) {
      throw new Error(json?.error?.message ?? `Error cargando movimientos (${res.status})`);
    }

    const backendItems = (json.data ?? []) as BackendMovement[];

    const mapped: Movement[] = backendItems.map(mapBackendMovement);

    setMovements(mapped);
  }

  useEffect(() => {
    const cancelled = false;

    async function run() {
      try {
        setLoadingMovements(true);
        setMovementsError(null);

        const res = await fetch(`/api/movements?year=${year}&month=${month}`, {
          method: "GET",
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error?.message ?? `Error cargando movimientos (${res.status})`);
        }

        const backendItems = (json.data ?? []) as BackendMovement[];

        const mapped: Movement[] = backendItems.map(mapBackendMovement);

        if (!cancelled) setMovements(mapped);
      } catch (e: unknown) {
        if (!cancelled) setMovementsError(getErrorMessage(e, "Error"));
        if (!cancelled) setMovements([]);
      } finally {
        if (!cancelled) setLoadingMovements(false);
      }
    }

    run();
  }, [year, month]);

  useEffect(() => {
    const from = `${annualYear - 1}-01-01`;
    const to = `${annualYear - 1}-12-31`;
    let cancelled = false;

    async function loadPreviousYear() {
      try {
        const res = await fetch(`/api/movements?from=${from}&to=${to}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error?.message ?? "No se pudo cargar la comparación anual");
        if (!cancelled) setPreviousYearMovements(((json.data ?? []) as BackendMovement[]).map(mapBackendMovement));
      } catch {
        if (!cancelled) setPreviousYearMovements([]);
      }
    }

    void loadPreviousYear();
    return () => { cancelled = true; };
  }, [annualYear]);

  useEffect(() => {
    const previous = new Date(year, month - 1, 1);
    const { from, to } = monthBounds(previous.getFullYear(), previous.getMonth());
    let cancelled = false;

    async function loadPreviousMonth() {
      try {
        const res = await fetch(`/api/movements?from=${from}&to=${to}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error?.message ?? "No se pudo cargar la comparación");
        if (!cancelled) setPreviousMovements(((json.data ?? []) as BackendMovement[]).map(mapBackendMovement));
      } catch {
        if (!cancelled) setPreviousMovements([]);
      }
    }

    void loadPreviousMonth();
    return () => { cancelled = true; };
  }, [year, month]);

  useEffect(() => {
    let cancelled = false;

    async function loadPeriod() {
      if (mode === "monthly") {
        setPeriodMovements(movements);
        setPeriodError(null);
        return;
      }

      const today = new Date();
      let from: string;
      let to: string;
      if (mode === "yearly") {
        from = `${annualYear}-01-01`;
        to = `${annualYear}-12-31`;
      } else if (mode === "historic") {
        const historicFrom = Math.min(historicFromYear, historicToYear);
        const historicTo = Math.max(historicFromYear, historicToYear);
        from = `${historicFrom}-01-01`;
        to = `${historicTo}-12-31`;
      } else {
        const firstMonth = shiftMonth(new Date(today.getFullYear(), today.getMonth(), 1), -12);
        const lastMonth = shiftMonth(new Date(today.getFullYear(), today.getMonth(), 1), -1);
        from = isoDate(firstMonth);
        to = isoDate(new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0));
      }

      try {
        setLoadingPeriod(true);
        setPeriodError(null);
        const res = await fetch(`/api/movements?from=${from}&to=${to}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error?.message ?? "No se pudo cargar el periodo");
        if (!cancelled) setPeriodMovements(((json.data ?? []) as BackendMovement[]).map(mapBackendMovement));
      } catch (e: unknown) {
        if (!cancelled) {
          setPeriodMovements([]);
          setPeriodError(getErrorMessage(e, "No se pudo cargar el periodo"));
        }
      } finally {
        if (!cancelled) setLoadingPeriod(false);
      }
    }

    void loadPeriod();
    return () => { cancelled = true; };
  }, [mode, movements, annualYear, historicFromYear, historicToYear]);

  const sharedRange = useMemo(() => {
    if (mode === "forecast") {
      const today = new Date();
      const firstMonth = shiftMonth(new Date(today.getFullYear(), today.getMonth(), 1), -12);
      const lastMonth = shiftMonth(new Date(today.getFullYear(), today.getMonth(), 1), -1);
      return { from: isoDate(firstMonth), to: isoDate(new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0)) };
    }
    if (mode === "monthly") return monthBounds(year, month);
    if (mode === "yearly") return { from: `${annualYear}-01-01`, to: `${annualYear}-12-31` };
    return { from: `${Math.min(historicFromYear, historicToYear)}-01-01`, to: `${Math.max(historicFromYear, historicToYear)}-12-31` };
  }, [mode, year, month, annualYear, historicFromYear, historicToYear]);

  const sharedComparisonRange = useMemo(() => {
    if (mode === "monthly") {
      const previous = new Date(year, month - 1, 1);
      return monthBounds(previous.getFullYear(), previous.getMonth());
    }
    if (mode === "yearly") return { from: `${annualYear - 1}-01-01`, to: `${annualYear - 1}-12-31` };
    return null;
  }, [mode, year, month, annualYear]);

  useEffect(() => {
    if (!sharedRange) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSharedDetails(null);
      return;
    }
    const range = sharedRange;
    let cancelled = false;
    async function loadSharedDetails() {
      try {
        setLoadingSharedDetails(true);
        setSharedDetailsError(null);
        const res = await fetch(`/api/movements?sharedDetails=1&from=${range.from}&to=${range.to}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error?.message ?? "No se pudieron cargar las finanzas compartidas");
        if (!cancelled) setSharedDetails(json.data as SharedFinanceDetails);
      } catch (e: unknown) {
        if (!cancelled) {
          setSharedDetails(null);
          setSharedDetailsError(getErrorMessage(e, "No se pudieron cargar las finanzas compartidas"));
        }
      } finally {
        if (!cancelled) setLoadingSharedDetails(false);
      }
    }
    void loadSharedDetails();
    return () => { cancelled = true; };
  }, [sharedRange, sharedRefresh]);

  useEffect(() => {
    if (dashboardScope === "mine" || !sharedComparisonRange) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSharedComparisonDetails(null);
      return;
    }
    const range = sharedComparisonRange;
    let cancelled = false;
    async function loadSharedComparison() {
      try {
        const res = await fetch(`/api/movements?sharedDetails=1&from=${range.from}&to=${range.to}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error?.message ?? "No se pudo cargar la comparación compartida");
        if (!cancelled) setSharedComparisonDetails(json.data as SharedFinanceDetails);
      } catch {
        if (!cancelled) setSharedComparisonDetails(null);
      }
    }
    void loadSharedComparison();
    return () => { cancelled = true; };
  }, [dashboardScope, sharedComparisonRange, sharedRefresh]);

  const sharedOwners = sharedDetails?.members ?? [];
  const effectiveSharedOwner = sharedOwners.includes(selectedSharedOwner) ? selectedSharedOwner : (sharedOwners[0] ?? "");

  const sharedScopeMovements = useMemo(() => {
    if (!sharedDetails || dashboardScope === "mine") return [];
    const ownerFilter = dashboardScope === "theirs" && effectiveSharedOwner
      ? (movement: BackendMovement) => movement.userEmail === effectiveSharedOwner
      : () => true;
    return sharedDetails.movements.filter(ownerFilter).map(mapBackendMovement);
  }, [sharedDetails, dashboardScope, effectiveSharedOwner]);

  const sharedComparisonScopeMovements = useMemo(() => {
    if (!sharedComparisonDetails || dashboardScope === "mine") return [];
    const ownerFilter = dashboardScope === "theirs" && effectiveSharedOwner
      ? (movement: BackendMovement) => movement.userEmail === effectiveSharedOwner
      : () => true;
    return sharedComparisonDetails.movements.filter(ownerFilter).map(mapBackendMovement);
  }, [sharedComparisonDetails, dashboardScope, effectiveSharedOwner]);

  const activePeriodMovements = useMemo(() => {
    if (dashboardScope === "mine") return mode === "monthly" ? movements : periodMovements;
    if (dashboardScope === "combined") return [...(mode === "monthly" ? movements : periodMovements), ...sharedScopeMovements];
    return sharedScopeMovements;
  }, [dashboardScope, mode, movements, periodMovements, sharedScopeMovements]);

  const activePreviousMovements = useMemo(() => {
    if (dashboardScope === "mine") {
      return mode === "monthly" ? previousMovements : previousYearMovements;
    }
    if (dashboardScope === "combined") return [...(mode === "monthly" ? previousMovements : previousYearMovements), ...sharedComparisonScopeMovements];
    return sharedComparisonScopeMovements;
  }, [dashboardScope, mode, previousMovements, previousYearMovements, sharedComparisonScopeMovements]);

  const activeMonthlyMovements = useMemo(() => {
    if (dashboardScope === "mine") return movements;
    if (dashboardScope === "combined") return [...movements, ...sharedScopeMovements];
    return sharedScopeMovements;
  }, [dashboardScope, movements, sharedScopeMovements]);

  const activeTableMovements = useMemo(() => {
    if (dashboardScope === "mine") return movements;
    const visibleMovementOwners = sharedDetails?.editableMembers ?? [];
    const manageableShared = sharedScopeMovements.filter((movement) => movement.ownerEmail && visibleMovementOwners.includes(movement.ownerEmail));
    if (dashboardScope === "combined") return [...movements, ...manageableShared];
    return manageableShared;
  }, [dashboardScope, movements, sharedDetails, sharedScopeMovements]);

  async function onEditMovement(id: string) {
    setActionMsg(null);
    router.push(`/finance/movements/update/${id}`);
  }

  async function onDeleteMovement(id: string) {
    setActionMsg(null);

    setDeletingId(id);
    try {
      const res = await fetch(`/api/movements/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);

      if (!res.ok || json?.ok === false) {
        throw new Error(
          json?.error?.backend?.message ??
            json?.error?.message ??
            `Error eliminando movimiento (${res.status})`
        );
      }

      try {
        await loadMovements();
      } catch {
        setMovements((prev) => prev.filter((m) => m.id !== id));
      }

      setSharedRefresh((value) => value + 1);

      setActionMsg({ type: "ok", text: "Movimiento eliminado correctamente." });
    } catch (e: unknown) {
      setActionMsg({ type: "err", text: getErrorMessage(e, "Error eliminando movimiento.") });
    } finally {
      setDeletingId(null);
      setConfirmMovementId(null);
    }
  }

  // Totales mensual
  const monthlyTotals = useMemo(() => {
    const benefits: number[] = [];
    const essentials: number[] = [];
    const discretionaryExpenses: number[] = [];
    const investments: number[] = [];

    for (const mv of activeMonthlyMovements) {
      if (mv.type === "beneficio") benefits.push(mv.amount);
      if (mv.type === "gasto_necesario") essentials.push(mv.amount);
      if (mv.type === "gasto_innecesario") discretionaryExpenses.push(mv.amount);
      if (mv.type === "inversion") investments.push(mv.amount);
    }

    const benefit = sumMoney(benefits);
    const essential = sumMoney(essentials);
    const discretionary = sumMoney(discretionaryExpenses);
    const investment = sumMoney(investments);
    const gastosTotales = sumMoney([essential, discretionary]);
    // El ahorro es lo que queda tras gastos. Las inversiones se muestran
    // aparte y el balance descuenta ambas salidas para detectar déficits.
    const ahorros = subtractMoney(benefit, gastosTotales);
    const balance = subtractMoney(ahorros, investment);

    return {
      beneficio: benefit,
      gastos_necesarios: essential,
      gastos_innecesarios: discretionary,
      gastos_totales: gastosTotales,
      inversion: investment,
      ahorros,
      balance,
    };
  }, [activeMonthlyMovements]);

  const monthlyIncome = monthlyTotals.beneficio || 0;

  const monthlyChartData = useMemo(() => {
    const income = monthlyIncome;

    const idealNecesarios = percentageMoney(income, monthlyIdealPercent.gasto_necesario);
    const idealInnecesarios = percentageMoney(income, monthlyIdealPercent.gasto_innecesario);
    const idealInversion = percentageMoney(income, monthlyIdealPercent.inversion);
    const idealAhorro = percentageMoney(income, monthlyIdealPercent.ahorro);
    const idealGastosTotales = sumMoney([idealNecesarios, idealInnecesarios]);

    return [
      { tipo: "Beneficio", ideal: income, real: monthlyTotals.beneficio },
      { tipo: "Gastos necesarios", ideal: idealNecesarios, real: monthlyTotals.gastos_necesarios },
      { tipo: "Gastos innecesarios", ideal: idealInnecesarios, real: monthlyTotals.gastos_innecesarios },
      { tipo: "Gastos totales", ideal: idealGastosTotales, real: monthlyTotals.gastos_totales },
      { tipo: "Inversión", ideal: idealInversion, real: monthlyTotals.inversion },
      { tipo: "Ahorros", ideal: idealAhorro, real: monthlyTotals.ahorros },
    ];
  }, [monthlyIncome, monthlyIdealPercent, monthlyTotals]);

  // ANUAL real
  const [annualData, setAnnualData] = useState<Array<{ mes: string; ideal: number; real: number }>>(
    []
  );
  const [loadingAnnual, setLoadingAnnual] = useState(false);
  const [annualError, setAnnualError] = useState<string | null>(null);

  useEffect(() => {
    const cancelled = false;

    if (dashboardScope !== "mine") {
      // El cambio de contexto invalida las respuestas personales pendientes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnnualData([]);
      setLoadingAnnual(false);
      setAnnualError(null);
      return;
    }

    async function loadAnnual() {
      try {
        setLoadingAnnual(true);
        setAnnualError(null);

        const backendMetric = metricKeyToBackend(annualMetric);

        const res = await fetch(
          `/api/movements?annual=1&year=${annualYear}&metric=${backendMetric}`,
          { cache: "no-store" }
        );

        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error?.message ?? `Error anual (${res.status})`);
        }

        const data = json.data as AnnualResponse;

        const mapped = (data.series ?? [])
          .slice()
          .sort((a, b) => a.month - b.month)
          .map((it) => ({
            mes: monthNames[it.month - 1]?.slice(0, 3) ?? String(it.month),
            ideal: Number(it.idealAmount ?? 0),
            real: Number(it.realAmount ?? 0),
          }));

        if (!cancelled) setAnnualData(mapped);
      } catch (e: unknown) {
        if (!cancelled) setAnnualError(getErrorMessage(e, "Error"));
        if (!cancelled) setAnnualData([]);
      } finally {
        if (!cancelled) setLoadingAnnual(false);
      }
    }

    loadAnnual();
  }, [annualYear, annualMetric, dashboardScope]);

  // HISTÓRICO real
  const [historicalRaw, setHistoricalRaw] = useState<
    Array<{ year: number; ideal: number; real: number }>
  >([]);
  const [loadingHistorical, setLoadingHistorical] = useState(false);
  const [historicalError, setHistoricalError] = useState<string | null>(null);

  useEffect(() => {
    const cancelled = false;

    if (dashboardScope !== "mine") {
      // El cambio de contexto invalida las respuestas personales pendientes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHistoricalRaw([]);
      setLoadingHistorical(false);
      setHistoricalError(null);
      return;
    }

    async function loadHistorical() {
      try {
        setLoadingHistorical(true);
        setHistoricalError(null);

        const backendMetric = metricKeyToBackend(historicMetric);

        const res = await fetch(`/api/movements?historical=1&metric=${backendMetric}`, {
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error?.message ?? `Error histórico (${res.status})`);
        }

        const data = json.data as HistoricalResponse;

        const mapped = (data.series ?? [])
          .slice()
          .sort((a, b) => a.year - b.year)
          .map((it) => ({
            year: Number(it.year),
            ideal: Number(it.idealAmount ?? 0),
            real: Number(it.realAmount ?? 0),
          }));

        if (!cancelled) setHistoricalRaw(mapped);
      } catch (e: unknown) {
        if (!cancelled) setHistoricalError(getErrorMessage(e, "Error"));
        if (!cancelled) setHistoricalRaw([]);
      } finally {
        if (!cancelled) setLoadingHistorical(false);
      }
    }

    loadHistorical();
  }, [historicMetric, dashboardScope]);

  const historicChartData = useMemo(() => {
    const from = Math.min(historicFromYear, historicToYear);
    const to = Math.max(historicFromYear, historicToYear);

    return historicalRaw
      .filter((p) => p.year >= from && p.year <= to)
      .map((p) => ({
        year: String(p.year),
        ideal: p.ideal,
        real: p.real,
      }));
  }, [historicalRaw, historicFromYear, historicToYear]);

  const displayAnnualData = useMemo(() => {
    if (dashboardScope === "mine") return annualData;
    return buildAnnualChartData(activePeriodMovements, annualYear, annualMetric, monthlyIdealPercent);
  }, [dashboardScope, annualData, activePeriodMovements, annualYear, annualMetric, monthlyIdealPercent]);

  const displayHistoricChartData = useMemo(() => {
    if (dashboardScope === "mine") return historicChartData;
    return buildHistoricalChartData(activePeriodMovements, historicMetric, monthlyIdealPercent);
  }, [dashboardScope, historicChartData, activePeriodMovements, historicMetric, monthlyIdealPercent]);

  const yearsForSelect = availableYears.length > 0 ? availableYears : [currentYear];

  return (
    <main className="app-shell text-gray-100 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="fade-up mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">Tu visión financiera</p>
            <h1 className="page-title text-4xl font-black tracking-tight md:text-6xl">
              Dashboard
            </h1>
            <p className="mt-2 text-gray-300">
              Visualiza tus movimientos y compara <span className="font-semibold">ideal vs real</span>.
            </p>

            {loadingYears ? (
              <p className="mt-2 text-xs"><InlineLoading label="Preparando años" /></p>
            ) : yearsError ? (
              <p className="text-xs text-red-300 mt-2">Años: {yearsError}</p>
            ) : null}

            {loadingIdeal ? (
              <p className="mt-1 text-xs"><InlineLoading label="Preparando objetivos" /></p>
            ) : idealError ? (
              <p className="text-xs text-amber-200 mt-1">
                IdealPercentage: {idealError} (usando fallback)
              </p>
            ) : null}

            {actionMsg ? <Toast message={actionMsg.text} tone={actionMsg.type === "ok" ? "success" : "error"} onClose={() => setActionMsg(null)} /> : null}
          </div>

          <div className={`${cardClass} grid grid-cols-2 gap-1 p-1.5 sm:flex`}>
            <TabButton active={mode === "monthly"} onClick={() => setMode("monthly")}>
              Mensual
            </TabButton>
            <TabButton active={mode === "yearly"} onClick={() => setMode("yearly")}>
              Anual
            </TabButton>
            <TabButton active={mode === "historic"} onClick={() => setMode("historic")}>
              Histórico
            </TabButton>
            <TabButton active={mode === "forecast"} onClick={() => setMode("forecast")}>
              Previsión
            </TabButton>
          </div>
        </header>

        <section className={`${cardClass} p-4 md:p-5`} aria-label="Contexto del dashboard">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow">Contexto de datos</p>
              <h2 className="mt-1 text-lg font-black text-white">¿Qué quieres ver?</h2>
              <p className="mt-1 text-sm text-slate-400">Las tarjetas, gráficas, previsiones y listas se actualizan con esta selección.</p>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto">
              <TabButton active={dashboardScope === "mine"} onClick={() => setDashboardScope("mine")}>Lo mío</TabButton>
              <TabButton active={dashboardScope === "theirs"} disabled={sharedOwners.length === 0} onClick={() => setDashboardScope("theirs")}>
                Lo suyo{sharedOwners.length === 0 ? " · sin detalle" : ""}
              </TabButton>
              <TabButton active={dashboardScope === "combined"} disabled={sharedOwners.length === 0} onClick={() => setDashboardScope("combined")}>
                Conjunto{sharedOwners.length === 0 ? " · sin detalle" : ""}
              </TabButton>
            </div>
          </div>
          {dashboardScope !== "mine" && sharedOwners.length > 0 ? (
            <div className="mt-4 max-w-md">
              {dashboardScope === "theirs" ? (
                <Select
                  label="Cuenta que quieres consultar"
                  value={effectiveSharedOwner}
                  onChange={setSelectedSharedOwner}
                  options={sharedOwners.map((ownerEmail) => ({ value: ownerEmail, label: ownerEmail }))}
                />
              ) : (
                <p className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.05] px-4 py-3 text-xs text-cyan-100">Conjunto: tus datos más las cuentas que te han concedido «Ver detalles».</p>
              )}
            </div>
          ) : null}
          {dashboardScope !== "mine" && sharedOwners.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">No tienes conexiones con permiso «Ver detalles» o superior para mostrar este dashboard.</p>
          ) : null}
        </section>

        {mode !== "forecast" ? (
          <FinanceSummary
            movements={toInsightMovements(activePeriodMovements)}
            previousMovements={mode === "monthly" || mode === "yearly" ? toInsightMovements(activePreviousMovements) : undefined}
            periodLabel={mode === "monthly" ? `${monthNames[month]} ${year}` : mode === "yearly" ? `Año ${annualYear}` : `${Math.min(historicFromYear, historicToYear)} — ${Math.max(historicFromYear, historicToYear)}`}
            showComparison={mode === "monthly" || mode === "yearly"}
            comparisonLabel={mode === "yearly" ? "año anterior" : "mes anterior"}
          />
        ) : null}

        {periodError && mode !== "monthly" ? <p className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">{periodError}</p> : null}
        {loadingPeriod && mode !== "monthly" ? <p className="text-xs text-slate-500"><InlineLoading label="Preparando análisis del periodo" /></p> : null}

        {/* MONTHLY */}
        {mode === "monthly" ? (
          <section className={`${cardClass} p-6 md:p-8 space-y-6`}>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Vista mensual</h2>
                <p className="text-sm text-gray-300 mt-1">
                  Selecciona mes y año. Revisa movimientos y compara distribución.
                </p>

                {loadingMovements ? (
                  <p className="mt-2 text-xs"><InlineLoading label="Cargando movimientos" /></p>
                ) : movementsError ? (
                  <p className="text-xs text-red-300 mt-2">Movimientos: {movementsError}</p>
                ) : null}
              </div>

              {/* ✅ CTA Crear movimiento + filtros */}
              <div className="flex flex-col gap-3 w-full lg:w-auto">
                

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                  <Select
                    label="Mes"
                    value={String(month)}
                    onChange={(v) => setMonth(Number(v))}
                    options={monthNames.map((mName, idx) => ({
                      value: String(idx),
                      label: mName,
                    }))}
                  />
                  <Select
                    label="Año"
                    value={String(year)}
                    onChange={(v) => setYear(Number(v))}
                    options={yearsForSelect.map((y) => ({
                      value: String(y),
                      label: String(y),
                    }))}
                  />
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => setShowMonthlyChart((s) => !s)}
                      className="w-full px-4 py-3 rounded-full font-semibold transition shadow-lg
                                 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white
                                 [--tw-shadow-color:rgb(var(--brand-primary-rgb)/0.30)]"
                    >
                      {showMonthlyChart ? "Ocultar gráfica" : "Ver gráfica"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {showMonthlyChart ? (
              <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">Distribución mensual: ideal vs real</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Ideal se calcula sobre los beneficios del mes. Real se agrega desde movimientos.
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 text-right">
                    <div>
                      Beneficios:{" "}
                      <span className="font-semibold text-gray-200">{formatEUR(monthlyIncome)}</span>
                    </div>
                  </div>
                </div>

                <div className="h-96 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                      <XAxis dataKey="tipo" tick={{ fill: "#E5E7EB" }} />
                      <YAxis tick={{ fill: "#E5E7EB" }} />
                      <Tooltip
                        formatter={(v: unknown) => formatEUR(Number(v))}
                        contentStyle={{
                          background: "rgba(15, 23, 42, 0.95)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 12,
                          color: "#E5E7EB",
                        }}
                        labelStyle={{ color: "#E5E7EB" }}
                      />
                      <Legend wrapperStyle={{ color: "#E5E7EB" }} />
                      <Bar dataKey="ideal" name="Ideal" fill="#60A5FA" radius={[10, 10, 0, 0]} />
                      <Bar dataKey="real" name="Real" fill="#34D399" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-3xl border border-white/10">
              <div className="bg-black/20 px-5 py-4 flex items-center justify-between">
                <p className="font-semibold">Movimientos</p>
                <p className="text-xs text-gray-400">
                  {monthNames[month]} {year} • {activeTableMovements.length} movimientos visibles
                </p>
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] table-fixed text-sm">
                  <thead className="bg-black/30 text-gray-300">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold">Día</th>
                      <th className="text-left px-5 py-3 font-semibold">Fecha</th>
                      <th className="text-left px-5 py-3 font-semibold">Descripción</th>
                      <th className="text-left px-5 py-3 font-semibold">Etiqueta</th>
                      <th className="text-left px-5 py-3 font-semibold">Tipo</th>
                      <th className="text-right px-5 py-3 font-semibold">Cantidad</th>
                      <th className="text-right px-5 py-3 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {activeTableMovements.map((mv) => (
                      <tr key={`${mv.ownerEmail ?? "mine"}-${mv.id}`} className="hover:bg-white/5 transition">
                        <td className="px-5 py-3 text-gray-200">{mv.weekday}</td>
                        <td className="px-5 py-3 text-gray-200">{mv.date}</td>
                        <td className="max-w-[18rem] truncate px-5 py-3 font-medium text-gray-100" title={mv.description}>{mv.description}</td>

                        {/* ✅ etiqueta con color */}
                        <td className="px-5 py-3">
                          <TagChip name={mv.tagName} color={mv.tagColor} />
                        </td>

                        <td className="px-5 py-3">
                          <span className={chipType(mv.type)}>{typeLabel[mv.type]}</span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold">{formatEUR(mv.amount)}</td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            <IconButton
                              onClick={() => onEditMovement(mv.id)}
                              title="Editar"
                              disabled={!!deletingId}
                            >
                              Editar
                            </IconButton>
                            <IconButton
                              onClick={() => setConfirmMovementId(mv.id)}
                              title="Eliminar"
                              variant="danger"
                              disabled={deletingId === mv.id}
                            >
                              {deletingId === mv.id ? "Eliminando…" : "Eliminar"}
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {activeTableMovements.length === 0 && !loadingMovements ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                          {dashboardScope === "mine" ? "No hay movimientos para este mes." : "No hay movimientos visibles para esta selección o no tienes permiso de edición."}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 p-3 md:hidden">
                {activeTableMovements.map((mv) => (
                  <article key={`${mv.ownerEmail ?? "mine"}-${mv.id}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white" title={mv.description}>{mv.description}</p>
                        <p className="mt-1 text-xs text-slate-400">{mv.weekday} · {mv.date}</p>
                      </div>
                      <p className="shrink-0 font-bold text-white">{formatEUR(mv.amount)}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={chipType(mv.type)}>{typeLabel[mv.type]}</span>
                      <TagChip name={mv.tagName} color={mv.tagColor} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <IconButton onClick={() => onEditMovement(mv.id)} title="Editar" disabled={!!deletingId}>Editar</IconButton>
                      <IconButton onClick={() => setConfirmMovementId(mv.id)} title="Eliminar" variant="danger" disabled={deletingId === mv.id}>{deletingId === mv.id ? "Eliminando…" : "Eliminar"}</IconButton>
                    </div>
                  </article>
                ))}
                {activeTableMovements.length === 0 && !loadingMovements ? (
                  <p className="px-3 py-8 text-center text-sm text-gray-400">
                    {dashboardScope === "mine" ? "No hay movimientos para este mes." : "No hay movimientos visibles para esta selección o no tienes permiso de edición."}
                  </p>
                ) : null}
              </div>
            </div>

            <PeriodAnalytics
              movements={toInsightMovements(activeMonthlyMovements)}
              label={`${monthNames[month]} ${year}${dashboardScope === "mine" ? "" : dashboardScope === "theirs" ? ` · ${effectiveSharedOwner}` : " · conjunto"}`}
              showDaily
            />
            {loadingSharedDetails ? <p className="text-xs text-slate-500"><InlineLoading label="Cargando análisis conjunto" /></p> : null}
            {sharedDetailsError ? <p className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">Finanzas compartidas: {sharedDetailsError}</p> : null}
            <SharedFinanceSection details={sharedDetails} scope={dashboardScope} selectedOwnerEmail={effectiveSharedOwner} showMovementsTable={false} onEdit={onEditMovement} onDelete={setConfirmMovementId} deletingId={deletingId} />
          </section>
        ) : null}

        {/* YEARLY */}
        {mode === "yearly" ? (
          <section className={`${cardClass} p-6 md:p-8 space-y-6`}>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Vista anual</h2>
                <p className="text-sm text-gray-300 mt-1">
                  Compara por mes <span className="font-semibold">real vs ideal</span>.
                </p>
                {loadingAnnual ? (
                  <p className="mt-2 text-xs"><InlineLoading label="Cargando vista anual" /></p>
                ) : annualError ? (
                  <p className="text-xs text-red-300 mt-2">Anual: {annualError}</p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto">
                <Select
                  label="Año"
                  value={String(annualYear)}
                  onChange={(v) => setAnnualYear(Number(v))}
                  options={yearsForSelect.map((y) => ({ value: String(y), label: String(y) }))}
                />
                <Select
                  label="Qué ver"
                  value={annualMetric}
                  onChange={(v) => {
                    if (isMetricKey(v)) setAnnualMetric(v);
                  }}
                  options={metricOptions.map((m) => ({ value: m.key, label: m.label }))}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="font-semibold">
                {metricOptions.find((m) => m.key === annualMetric)?.label} — {annualYear}
              </p>

              <div className="h-96 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={displayAnnualData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fill: "#E5E7EB" }} />
                    <YAxis tick={{ fill: "#E5E7EB" }} />
                    <Tooltip
                      formatter={(v: unknown) => formatEUR(Number(v))}
                      contentStyle={{
                        background: "rgba(15, 23, 42, 0.95)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        color: "#E5E7EB",
                      }}
                      labelStyle={{ color: "#E5E7EB" }}
                    />
                    <Legend wrapperStyle={{ color: "#E5E7EB" }} />
                    <Bar dataKey="ideal" name="Ideal" fill="#60A5FA" radius={[10, 10, 0, 0]} />
                    <Bar dataKey="real" name="Real" fill="#34D399" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <PeriodAnalytics
              movements={toInsightMovements(activePeriodMovements)}
              label={`Año ${annualYear}${dashboardScope === "mine" ? "" : dashboardScope === "theirs" ? ` · ${effectiveSharedOwner}` : " · conjunto"}`}
            />
            {loadingSharedDetails ? <p className="text-xs text-slate-500"><InlineLoading label="Cargando análisis conjunto" /></p> : null}
            {sharedDetailsError ? <p className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">Finanzas compartidas: {sharedDetailsError}</p> : null}
            <SharedFinanceSection details={sharedDetails} scope={dashboardScope} selectedOwnerEmail={effectiveSharedOwner} showMovementsTable onEdit={onEditMovement} onDelete={setConfirmMovementId} deletingId={deletingId} />
          </section>
        ) : null}

        {/* HISTORIC */}
        {mode === "historic" ? (
          <section className={`${cardClass} p-6 md:p-8 space-y-6`}>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Vista histórica</h2>
                <p className="text-sm text-gray-300 mt-1">
                  Línea con puntos por año: ideal vs real (backend).
                </p>
                {loadingHistorical ? (
                  <p className="mt-2 text-xs"><InlineLoading label="Cargando histórico" /></p>
                ) : historicalError ? (
                  <p className="text-xs text-red-300 mt-2">Histórico: {historicalError}</p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                <Select
                  label="Desde"
                  value={String(historicFromYear)}
                  onChange={(v) => setHistoricFromYear(Number(v))}
                  options={yearsForSelect.map((y) => ({ value: String(y), label: String(y) }))}
                />
                <Select
                  label="Hasta"
                  value={String(historicToYear)}
                  onChange={(v) => setHistoricToYear(Number(v))}
                  options={yearsForSelect.map((y) => ({ value: String(y), label: String(y) }))}
                />
                <Select
                  label="Qué ver"
                  value={historicMetric}
                  onChange={(v) => {
                    if (isMetricKey(v)) setHistoricMetric(v);
                  }}
                  options={metricOptions.map((m) => ({ value: m.key, label: m.label }))}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="font-semibold">
                {metricOptions.find((m) => m.key === historicMetric)?.label} — Histórico
              </p>

              <div className="h-96 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={displayHistoricChartData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fill: "#E5E7EB" }} />
                    <YAxis tick={{ fill: "#E5E7EB" }} />
                    <Tooltip
                      formatter={(v: unknown) => formatEUR(Number(v))}
                      contentStyle={{
                        background: "rgba(15, 23, 42, 0.95)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        color: "#E5E7EB",
                      }}
                      labelStyle={{ color: "#E5E7EB" }}
                    />
                    <Legend wrapperStyle={{ color: "#E5E7EB" }} />
                    <Line type="monotone" dataKey="ideal" name="Ideal" stroke="#60A5FA" dot />
                    <Line type="monotone" dataKey="real" name="Real" stroke="#34D399" dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <PeriodAnalytics
              movements={toInsightMovements(activePeriodMovements)}
              label={`${Math.min(historicFromYear, historicToYear)} — ${Math.max(historicFromYear, historicToYear)}${dashboardScope === "mine" ? "" : dashboardScope === "theirs" ? ` · ${effectiveSharedOwner}` : " · conjunto"}`}
            />
            {loadingSharedDetails ? <p className="text-xs text-slate-500"><InlineLoading label="Cargando análisis conjunto" /></p> : null}
            {sharedDetailsError ? <p className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">Finanzas compartidas: {sharedDetailsError}</p> : null}
            <SharedFinanceSection details={sharedDetails} scope={dashboardScope} selectedOwnerEmail={effectiveSharedOwner} showMovementsTable onEdit={onEditMovement} onDelete={setConfirmMovementId} deletingId={deletingId} />
          </section>
        ) : null}

        {mode === "forecast" ? (
          <ForecastPanel movements={toInsightMovements(activePeriodMovements)} />
        ) : null}

        <ConfirmDialog
          open={confirmMovementId !== null}
          title="¿Eliminar este movimiento?"
          description="El movimiento desaparecerá de tus registros y esta acción no se puede deshacer."
          loading={confirmMovementId !== null && deletingId === confirmMovementId}
          onCancel={() => setConfirmMovementId(null)}
          onConfirm={() => {
            if (confirmMovementId) void onDeleteMovement(confirmMovementId);
          }}
        />

        <p className="text-center text-xs text-gray-500">
          Nota: estas gráficas son solo para fines informativos y no constituyen asesoramiento financiero. Todos los datos cumplen con la GDPR y se manejan de forma segura.
        </p>
      </div>
    </main>
  );
}

function TabButton({
  active,
  disabled = false,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "w-full rounded-xl border px-3 py-2 text-sm font-semibold sm:w-auto sm:px-4 disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "border-white/15 bg-white/10 text-white shadow-sm"
          : "border-transparent bg-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.05] hover:text-slate-100",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium text-gray-200">{label}</span>
      </div>
      <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-slate-900">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
