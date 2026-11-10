"use client";

import { useSession, signIn } from "next-auth/react";
import { ButtonLoading } from "./components/LoadingUI";

const features = [
  { number: "01", title: "Un solo punto de entrada", text: "Accede a tus herramientas personales desde un espacio único, claro y preparado para crecer contigo." },
  { number: "02", title: "Módulos conectados", text: "Finanzas, hogar, movilidad, tareas y el resto de tu vida organizada sin perder el contexto." },
  { number: "03", title: "Tu información bajo control", text: "Una identidad segura y una experiencia privada para decidir qué quieres usar y cuándo." },
];

function startAuthentication() {
  void signIn("keycloak", { callbackUrl: "/dashboard" });
}

export default function ClientHome() {
  const { data: session, status } = useSession();

  const isLoading = status === "loading";
  const isLoggedIn = status === "authenticated";

  return (
    <main className="min-h-screen overflow-hidden bg-[#07111f] text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-violet-600/15 blur-3xl" />
        <div className="absolute right-[-12rem] top-24 h-[28rem] w-[28rem] rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-lg font-black shadow-lg shadow-violet-500/20">L</span>
          <div>
            <p className="font-extrabold tracking-tight text-white">LifeHub</p>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Tu vida, en un solo lugar</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={startAuthentication}
            className="hidden rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-slate-200 hover:border-white/20 hover:bg-white/10 sm:block"
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={startAuthentication}
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#10213a] hover:bg-cyan-50"
          >
            Crear cuenta
          </button>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 pb-24 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-32 lg:pt-24">
        <div className="fade-up max-w-2xl">
          <p className="eyebrow mb-5">El centro de tu vida digital</p>
          <h1 className="text-5xl font-black leading-[0.98] tracking-[-0.055em] text-white sm:text-7xl">
            Todo lo importante, en un <span className="page-title">mismo lugar.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-400 sm:text-xl">
            LifeHub conecta las áreas que hacen funcionar tu día a día. Empieza por FinanzApp y ve construyendo tu propio espacio personal.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={startAuthentication}
              disabled={isLoading || isLoggedIn}
              className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-500 px-6 py-3.5 font-bold text-white shadow-xl shadow-violet-900/30 hover:-translate-y-0.5 hover:from-violet-500 hover:to-indigo-400 disabled:cursor-wait disabled:opacity-70"
            >
              {isLoading ? <ButtonLoading label="Preparando" /> : isLoggedIn ? <ButtonLoading label="Abriendo LifeHub" /> : "Entrar en LifeHub  →"}
            </button>
            <span className="text-sm text-slate-500">Privado · modular · bajo tu control</span>
          </div>
        </div>

        <div className="relative fade-up [animation-delay:120ms]" aria-label="Vista previa del dashboard">
          <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-violet-500/20 via-transparent to-cyan-400/10 blur-2xl" />
          <div className="surface relative rounded-[2rem] p-4 sm:p-6">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tu espacio</p>
                <p className="mt-1 text-xl font-bold text-white">Módulos activos</p>
              </div>
              <span className="rounded-full bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-200">LifeHub</span>
            </div>
            <div className="py-7">
              <p className="text-sm text-slate-500">Tu panel personal</p>
              <p className="mt-2 text-4xl font-black tracking-tight text-white">Una vida más sencilla.</p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  ["FinanzApp", "Finanzas personales", "bg-violet-400"],
                  ["Hogar", "Próximamente", "bg-cyan-300"],
                  ["Tareas", "Próximamente", "bg-emerald-300"],
                  ["Viajes", "Próximamente", "bg-amber-300"],
                ].map(([name, description, color]) => (
                  <div key={name} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                    <div>
                      <p className="text-sm font-bold text-white">{name}</p>
                      <p className="text-xs text-slate-500">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-white/[0.08] pt-5 text-sm text-slate-500">Empieza con el módulo que más necesitas hoy.</div>
          </div>
        </div>
      </section>

      <section className="relative border-y border-white/[0.07] bg-white/[0.025] px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-xl">
            <p className="eyebrow">Diseñado para el día a día</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Menos fricción. Más perspectiva.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.number} className="surface-soft rounded-3xl p-6 transition duration-300 hover:-translate-y-1 hover:border-violet-300/25 hover:bg-white/[0.07]">
                <span className="text-sm font-bold text-violet-300">{feature.number}</span>
                <h3 className="mt-10 text-xl font-bold text-white">{feature.title}</h3>
                <p className="mt-3 leading-7 text-slate-400">{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative mx-auto flex max-w-7xl flex-col gap-2 px-6 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <span>© {new Date().getFullYear()} LifeHub</span>
        <span>Tu vida, organizada con calma.</span>
      </footer>
    </main>
  );
}
