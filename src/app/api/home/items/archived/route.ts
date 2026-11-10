import { NextResponse } from "next/server";
import { serverAuth } from "@/app/lib/auth";
import { backendErrorResponse, getErrorMessage } from "@/app/lib/api/errors";

const base = () => process.env.API_GATEWAY_URL ?? "http://localhost:8080";

export const GET = serverAuth(async (req) => {
  try {
    const token = req.auth?.accessToken;
    if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
    const query = new URL(req.url).search;
    const res = await fetch(`${base()}/home/items/archived${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return backendErrorResponse(res, "Error cargando archivados");
    return NextResponse.json({ ok: true, data: await res.json() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: getErrorMessage(e, "Error interno") } }, { status: 500 });
  }
});
