import { NextResponse } from "next/server";
import { serverAuth } from "@/app/lib/auth";
import { backendErrorResponse, getErrorMessage, sameOriginFailure } from "@/app/lib/api/errors";

const backendUrl = () => `${process.env.API_GATEWAY_URL ?? "http://localhost:8080"}/movement/forecast-events`;

export const GET = serverAuth(async (req) => {
  try {
    const token = req.auth?.accessToken;
    if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
    const res = await fetch(backendUrl(), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!res.ok) return backendErrorResponse(res, "Error cargando los eventos de previsión");
    return NextResponse.json({ ok: true, data: await res.json() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: getErrorMessage(error, "Error interno") } }, { status: 500 });
  }
});

export const POST = serverAuth(async (req) => {
  try {
    const failure = sameOriginFailure(req);
    if (failure) return failure;
    const token = req.auth?.accessToken;
    if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
    const body = await req.json().catch(() => null);
    if (!body || typeof body.name !== "string" || typeof body.month !== "string" || typeof body.amount !== "number" || !["expense", "income"].includes(body.type)) {
      return NextResponse.json({ ok: false, error: { message: "Los datos del evento no son válidos" } }, { status: 400 });
    }
    const res = await fetch(backendUrl(), { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    if (!res.ok) return backendErrorResponse(res, "Error guardando el evento de previsión");
    return NextResponse.json({ ok: true, data: await res.json() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: getErrorMessage(error, "Error interno") } }, { status: 500 });
  }
});
