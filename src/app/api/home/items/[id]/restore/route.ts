import { NextResponse } from "next/server";
import { serverAuth } from "@/app/lib/auth";
import { backendErrorResponse, getErrorMessage, sameOriginFailure } from "@/app/lib/api/errors";

const base = () => process.env.API_GATEWAY_URL ?? "http://localhost:8080";

export const PATCH = serverAuth(async (req, ctx) => {
  try {
    const failure = sameOriginFailure(req); if (failure) return failure;
    const token = req.auth?.accessToken;
    if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
    const { id } = await ctx.params;
    const res = await fetch(`${base()}/home/items/${id}/restore`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return backendErrorResponse(res, "Error restaurando artículo");
    return NextResponse.json({ ok: true, data: await res.json() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: getErrorMessage(e, "Error interno") } }, { status: 500 });
  }
});
