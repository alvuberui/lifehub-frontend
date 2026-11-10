import Link from "next/link";
import { redirect } from "next/navigation";
import { serverAuth } from "@/app/lib/auth";

type FinancePoint = {
  label: string;
  value: number;
};

type FinancePreview = {
  points: FinancePoint[];
  latest: number;
  hasData: boolean;
};

const fallbackFinancePoints: FinancePoint[] = [
  { label: "Ene", value: 32 },
  { label: "Feb", value: 48 },
  { label: "Mar", value: 42 },
  { label: "Abr", value: 66 },
  { label: "May", value: 58 },
  { label: "Jun", value: 78 },
  { label: "Jul", value: 72 },
  { label: "Ago", value: 91 },
  { label: "Sep", value: 76 },
  { label: "Oct", value: 100 },
  { label: "Nov", value: 88 },
  { label: "Dic", value: 108 },
];

async function getFinancePreview(accessToken: string): Promise<FinancePreview> {
  const fallback: FinancePreview = { points: fallbackFinancePoints, latest: 0, hasData: false };
  const baseUrl = process.env.API_GATEWAY_URL;
  if (!baseUrl) return fallback;

  const year = new Date().getFullYear();

  try {
    const response = await fetch(
      `${baseUrl}/movement/movements/anual?from=${year}-01-01&to=${year}-12-31&metric=SAVINGS`,
      { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
    );

    if (!response.ok) return fallback;

    const data = (await response.json()) as {
      series?: Array<{ month: number; monthName: string; realAmount: number }>;
    };

    const points = Array.from({ length: 12 }, (_, index) => {
      const month = data.series?.find((item) => item.month === index + 1);
      return {
        label: month?.monthName?.slice(0, 3) ?? fallbackFinancePoints[index].label,
        value: Number(month?.realAmount ?? 0),
      };
    });

    const hasData = points.some((point) => Math.abs(point.value) > 0);
    const latest = [...points].reverse().find((point) => Math.abs(point.value) > 0)?.value ?? 0;

    return { points: hasData ? points : fallback.points, latest, hasData };
  } catch {
    return fallback;
  }
}

export default async function LifeHubDashboardPage() {
  const session = await serverAuth();

  if (!session?.user?.email || session.tokenError || !session.accessToken) {
    redirect("/?callbackUrl=/dashboard");
  }

  const displayName = session.user.name?.trim() || session.user.email.split("@")[0];
  const firstName = displayName.split(/[ ._-]/)[0];
  const finance = await getFinancePreview(session.accessToken);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050b16] text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-64 -top-72 h-[42rem] w-[42rem] rounded-full bg-violet-600/14 blur-3xl" />
        <div className="absolute right-[-16rem] top-[-8rem] h-[36rem] w-[36rem] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-[-16rem] left-1/3 h-[32rem] w-[32rem] rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:64px_64px]" />
      </div>

      <header className="relative z-10 border-b border-white/[0.08] bg-[#050b16]/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-5 px-6 py-5 lg:px-10">
          <Link href="/dashboard" className="group flex items-center gap-3" aria-label="Ir al dashboard de LifeHub">
            <span className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 text-lg font-black text-white shadow-lg shadow-violet-500/25 transition group-hover:scale-105">
              <span className="absolute -inset-6 rounded-full border border-white/20 opacity-60" />
              L
            </span>
            <span>
              <span className="block text-[1.05rem] font-extrabold tracking-tight text-white">LifeHub</span>
              <span className="block text-[0.68rem] font-medium uppercase tracking-[0.16em] text-slate-500">Tu espacio personal</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/connections" className="hidden rounded-xl border border-violet-300/15 bg-violet-300/[0.05] px-3 py-2 text-sm font-semibold text-violet-200 transition hover:border-violet-200/30 hover:bg-violet-300/10 sm:block">
              Conexiones
            </Link>
            <div className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-sm text-slate-400 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,.9)]" />
              Todo en calma
            </div>
            <span className="hidden text-sm text-slate-400 md:block">{displayName}</span>
            <Link href="/logout" className="rounded-xl border border-rose-400/15 bg-rose-400/[0.06] px-3 py-2 text-sm font-semibold text-rose-200 transition hover:border-rose-300/30 hover:bg-rose-400/10">
              Salir
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-[90rem] px-6 pb-9 pt-12 lg:px-10 lg:pb-12 lg:pt-16">
        <div className="flex flex-col justify-between gap-8 xl:flex-row xl:items-end">
          <div className="max-w-4xl">
            <p className="eyebrow">Buenos días, {firstName}</p>
            <h1 className="mt-4 text-5xl font-black leading-[0.98] tracking-[-0.06em] text-white sm:text-7xl">
              Tu mundo, visto con <span className="page-title">perspectiva.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400 sm:text-xl">
              Un lugar sereno para entender lo que pasa, cuidar lo que importa y abrir cada parte de tu vida cuando la necesites.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <QuickStat value="01" label="Activo" tone="text-violet-200" />
            <QuickStat value="07" label="Módulos" tone="text-cyan-200" />
            <QuickStat value="∞" label="Posibilidades" tone="text-emerald-200" />
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-[90rem] grid-cols-1 gap-5 px-6 pb-20 lg:px-10 xl:grid-cols-12">
        <FinancePreviewCard finance={finance} />
        <TravelPreviewCard />
        <ModulePreviewCard href="/home" name="Hogar" label="Tu casa, en orden" detail="Inventario, garantías y documentos importantes siempre a mano." icon="⌂" accent="from-cyan-400 to-blue-500" visual="home" />
        <ModulePreviewCard name="Tareas" label="Tu atención, enfocada" detail="Menos ruido mental. Más cosas importantes terminadas." icon="✓" accent="from-emerald-400 to-teal-500" visual="tasks" />
        <ModulePreviewCard name="Vehículo" label="Siempre listo" detail="Revisiones, documentación y todo bajo control." icon="⌁" accent="from-rose-400 to-pink-500" visual="vehicle" />
        <ModulePreviewCard name="Compras" label="Compra con intención" detail="Listas, necesidades y decisiones más sencillas." icon="◌" accent="from-orange-300 to-amber-500" visual="shopping" />
        <ModulePreviewCard name="Documentos" label="Lo importante, a mano" detail="Fechas, archivos y recordatorios sin buscar de más." icon="▤" accent="from-sky-300 to-cyan-500" visual="documents" />
        <ModulePreviewCard name="Life AI" label="Una capa de inteligencia" detail="Ideas y contexto para ayudarte a decidir mejor." icon="✦" accent="from-fuchsia-400 to-violet-500" visual="ai" />
      </section>
    </main>
  );
}

function QuickStat({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <div className="surface-soft min-w-[5.5rem] rounded-2xl px-3 py-3 text-center sm:min-w-[6.5rem] sm:px-4">
      <p className={`text-xl font-black ${tone}`}>{value}</p>
      <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
    </div>
  );
}

function FinancePreviewCard({ finance }: { finance: FinancePreview }) {
  const maxValue = Math.max(...finance.points.map((point) => Math.abs(point.value)), 1);
  const chartPoints = finance.points.map((point, index) => {
    const x = 14 + (index * 492) / (finance.points.length - 1);
    const y = 158 - (Math.abs(point.value) / maxValue) * 126;
    return { ...point, x, y };
  });
  const line = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `14,174 ${line} 506,174`;

  return (
    <Link href="/finance" className="group surface relative col-span-1 overflow-hidden rounded-[2rem] p-6 transition duration-500 hover:-translate-y-1 hover:border-violet-300/35 hover:shadow-[0_25px_90px_rgba(124,58,237,.18)] lg:p-8 xl:col-span-7">
      <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl transition duration-700 group-hover:bg-violet-400/25" />
      <div className="pointer-events-none absolute bottom-[-12rem] left-1/3 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-2xl font-black text-white shadow-xl shadow-violet-900/30">€</span>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xl font-black text-white">FinanzApp</p>
              <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-emerald-300">Activo</span>
            </div>
            <p className="mt-1 text-sm text-slate-400">La película de tu dinero</p>
          </div>
        </div>
        <span className="text-2xl text-violet-200 transition group-hover:translate-x-1">↗</span>
      </div>

      <div className="relative mt-8 grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Ahorro acumulado · este año</p>
          <p className="mt-3 text-4xl font-black tracking-[-0.05em] text-white">{finance.hasData ? formatEUR(finance.latest) : "Tu próximo capítulo"}</p>
          <p className="mt-3 max-w-xs text-sm leading-6 text-slate-400">
            {finance.hasData ? "Una vista rápida de cómo evoluciona tu capacidad de ahorro." : "Cuando registres movimientos, aquí aparecerá tu evolución real."}
          </p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-violet-200">
            Abrir FinanzApp <span className="transition group-hover:translate-x-1">→</span>
          </span>
        </div>

        <div className="relative rounded-3xl border border-white/[0.08] bg-[#07111f]/70 p-4 shadow-inner shadow-black/20">
          <div className="mb-3 flex items-center justify-between text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
            <span>Ritmo de ahorro</span>
            <span>{finance.hasData ? "Datos reales" : "Vista previa"}</span>
          </div>
          <svg viewBox="0 0 520 190" className="h-44 w-full overflow-visible" role="img" aria-label="Gráfica de evolución financiera">
            <defs>
              <linearGradient id="financeArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#a78bfa" stopOpacity="0.34" />
                <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="financeLine" x1="0" x2="1">
                <stop offset="0" stopColor="#8b5cf6" />
                <stop offset="1" stopColor="#67e8f9" />
              </linearGradient>
            </defs>
            {[32, 74, 116, 158].map((y) => <line key={y} x1="14" x2="506" y1={y} y2={y} stroke="rgba(148,163,184,.12)" strokeDasharray="3 8" />)}
            <polygon points={area} fill="url(#financeArea)" />
            <polyline points={line} fill="none" stroke="url(#financeLine)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
            {chartPoints.map((point) => <circle key={point.label} cx={point.x} cy={point.y} r="3.5" fill="#07111f" stroke="#a78bfa" strokeWidth="2" />)}
          </svg>
          <div className="mt-1 grid grid-cols-6 text-[0.62rem] font-medium text-slate-600">
            {finance.points.filter((_, index) => index % 2 === 0).map((point) => <span key={point.label}>{point.label}</span>)}
          </div>
        </div>
      </div>
    </Link>
  );
}

function TravelPreviewCard() {
  return (
    <article className="group surface relative col-span-1 overflow-hidden rounded-[2rem] p-6 transition duration-500 hover:-translate-y-1 hover:border-amber-200/30 hover:shadow-[0_25px_90px_rgba(245,158,11,.12)] lg:p-8 xl:col-span-5">
      <div className="pointer-events-none absolute -right-28 -top-20 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl transition duration-700 group-hover:bg-amber-300/20" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-2xl font-black text-white shadow-xl shadow-orange-900/25">✈</span>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xl font-black text-white">Travel</p>
              <span className="rounded-full bg-white/[0.07] px-2 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-slate-400">Preview</span>
            </div>
            <p className="mt-1 text-sm text-slate-400">La memoria de tus lugares</p>
          </div>
        </div>
        <span className="text-sm font-bold text-amber-200/80">Próximamente</span>
      </div>

      <div className="relative mt-5 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#07111f]/60">
        <svg viewBox="0 0 560 300" className="h-[18rem] w-full" role="img" aria-label="Globo terráqueo con rutas de viaje">
          <defs>
            <radialGradient id="globeFill" cx="35%" cy="25%">
              <stop offset="0" stopColor="#67e8f9" stopOpacity="0.5" />
              <stop offset="0.45" stopColor="#2563eb" stopOpacity="0.3" />
              <stop offset="1" stopColor="#312e81" stopOpacity="0.16" />
            </radialGradient>
            <linearGradient id="routeLine" x1="0" x2="1">
              <stop offset="0" stopColor="#fbbf24" />
              <stop offset="1" stopColor="#fb7185" />
            </linearGradient>
            <filter id="glow"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <circle cx="280" cy="157" r="116" fill="url(#globeFill)" stroke="rgba(165,243,252,.45)" strokeWidth="1.5" filter="url(#glow)" />
          <ellipse cx="280" cy="157" rx="116" ry="42" fill="none" stroke="rgba(165,243,252,.25)" />
          <ellipse cx="280" cy="157" rx="116" ry="78" fill="none" stroke="rgba(165,243,252,.18)" />
          <ellipse cx="280" cy="157" rx="52" ry="116" fill="none" stroke="rgba(165,243,252,.2)" />
          <ellipse cx="280" cy="157" rx="88" ry="116" fill="none" stroke="rgba(165,243,252,.13)" />
          <path d="M166 137 C220 68 310 71 389 121" fill="none" stroke="url(#routeLine)" strokeDasharray="5 8" strokeLinecap="round" strokeWidth="2.5" />
          <path d="M389 121 C365 191 300 214 231 183" fill="none" stroke="url(#routeLine)" strokeDasharray="5 8" strokeLinecap="round" strokeWidth="2.5" />
          <path d="M231 183 C206 156 190 142 166 137" fill="none" stroke="url(#routeLine)" strokeDasharray="5 8" strokeLinecap="round" strokeWidth="2.5" />
          {[[166, 137, "Lisboa"], [389, 121, "Tokio"], [231, 183, "Nueva York"]].map(([cx, cy, label]) => (
            <g key={String(label)}>
              <circle cx={Number(cx)} cy={Number(cy)} r="11" fill="rgba(251,191,36,.18)" />
              <circle cx={Number(cx)} cy={Number(cy)} r="4.5" fill="#fbbf24" stroke="#fff7ed" strokeWidth="2" />
              <text x={Number(cx) + 12} y={Number(cy) - 11} fill="rgba(226,232,240,.72)" fontSize="11" fontWeight="600">{String(label)}</text>
            </g>
          ))}
          <text x="28" y="34" fill="rgba(148,163,184,.65)" fontSize="10" fontWeight="700" letterSpacing="2">YOUR WORLD / 2026</text>
        </svg>
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#07111f]/75 px-4 py-3 backdrop-blur-md">
          <div><p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Tu mapa de recuerdos</p><p className="mt-1 text-sm font-bold text-white">3 destinos · 1 historia</p></div>
          <span className="text-lg text-amber-200">✦</span>
        </div>
      </div>
    </article>
  );
}

type VisualType = "home" | "tasks" | "vehicle" | "shopping" | "documents" | "ai";

function ModulePreviewCard({ href, name, label, detail, icon, accent, visual }: { href?: string; name: string; label: string; detail: string; icon: string; accent: string; visual: VisualType }) {
  const content = <>
      <div className={`pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-gradient-to-br ${accent} opacity-[0.12] blur-3xl transition group-hover:opacity-25`} />
      <div className="relative flex items-start justify-between gap-4">
        <span className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${accent} text-xl font-black text-white shadow-lg`}>{icon}</span>
        <span className={`rounded-full px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider ${href ? "bg-emerald-400/10 text-emerald-300" : "bg-white/[0.06] text-slate-500"}`}>{href ? "Activo" : "Próximamente"}</span>
      </div>
      <div className="relative mt-6">
        <h2 className="text-lg font-bold text-white">{name}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-300">{label}</p>
        <p className="mt-3 min-h-12 text-sm leading-6 text-slate-500">{detail}</p>
      </div>
      <ModuleVisual type={visual} accent={accent} />
    </>;
  return href ? <Link href={href} className="group surface-soft relative block overflow-hidden rounded-[1.75rem] p-6 transition duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.065] xl:col-span-2">{content}</Link> : <article className="group surface-soft relative overflow-hidden rounded-[1.75rem] p-6 transition duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.065] xl:col-span-2">{content}</article>;
}

function ModuleVisual({ type, accent }: { type: VisualType; accent: string }) {
  if (type === "home") {
    return <div className="relative mt-5 grid h-20 grid-cols-4 gap-1.5 rounded-2xl border border-white/[0.07] bg-[#07111f]/60 p-2"><span className="col-span-2 rounded-lg bg-cyan-300/20" /><span className="rounded-lg bg-white/[0.06]" /><span className="rounded-lg bg-blue-400/20" /><span className="rounded-lg bg-white/[0.06]" /><span className="col-span-2 rounded-lg bg-cyan-300/10" /></div>;
  }
  if (type === "tasks") {
    return <div className="mt-5 space-y-2 rounded-2xl border border-white/[0.07] bg-[#07111f]/60 p-3"><ProgressRow label="Lo importante" width="82%" color="bg-emerald-300" /><ProgressRow label="Pequeñas victorias" width="58%" color="bg-teal-300" /><ProgressRow label="Algún día" width="34%" color="bg-emerald-500/50" /></div>;
  }
  if (type === "vehicle") {
    return <div className="mt-5 flex h-20 items-center gap-4 rounded-2xl border border-white/[0.07] bg-[#07111f]/60 px-4"><div className={`grid h-12 w-12 place-items-center rounded-full border-4 border-white/10 bg-gradient-to-br ${accent} text-xs font-black text-white`}>78%</div><div className="flex-1"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Próxima revisión</p><p className="mt-1 text-sm font-bold text-slate-200">En 24 días</p></div></div>;
  }
  if (type === "shopping") {
    return <div className="mt-5 flex items-center gap-2 rounded-2xl border border-white/[0.07] bg-[#07111f]/60 p-3"><span className="rounded-xl bg-orange-300/15 px-3 py-2 text-lg">✦</span><span className="h-2 flex-1 rounded-full bg-gradient-to-r from-orange-300/70 to-amber-300/20" /><span className="text-xs font-bold text-slate-500">12 items</span></div>;
  }
  if (type === "documents") {
    return <div className="mt-5 space-y-2 rounded-2xl border border-white/[0.07] bg-[#07111f]/60 p-3"><DocumentRow color="bg-sky-300" label="Seguro del hogar" /><DocumentRow color="bg-cyan-300" label="Pasaporte" /><DocumentRow color="bg-blue-400" label="ITV / vehículo" /></div>;
  }
  return <div className="relative mt-5 flex h-20 items-center justify-center overflow-hidden rounded-2xl border border-fuchsia-300/15 bg-gradient-to-br from-fuchsia-400/10 via-violet-400/10 to-transparent"><span className="absolute h-24 w-24 rounded-full border border-fuchsia-300/20 animate-ping" /><span className="relative text-2xl text-fuchsia-200">✦</span><span className="ml-3 text-sm font-semibold text-slate-300">Pensando contigo</span></div>;
}

function ProgressRow({ label, width, color }: { label: string; width: string; color: string }) {
  return <div><div className="mb-1 flex justify-between text-[0.65rem] text-slate-500"><span>{label}</span><span>{width}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]"><span className={`block h-full rounded-full ${color}`} style={{ width }} /></div></div>;
}

function DocumentRow({ label, color }: { label: string; color: string }) {
  return <div className="flex items-center gap-2 text-xs font-medium text-slate-400"><span className={`h-2 w-2 rounded-full ${color}`} /><span>{label}</span><span className="ml-auto text-slate-600">›</span></div>;
}

function formatEUR(value: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}
