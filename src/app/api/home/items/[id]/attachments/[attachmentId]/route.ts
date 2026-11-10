import { NextResponse } from "next/server";
import { serverAuth } from "@/app/lib/auth";

export const GET = serverAuth(async (req, ctx) => {
  const token = req.auth?.accessToken;
  if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
  const { id, attachmentId } = await ctx.params;
  const res = await fetch(`${process.env.API_GATEWAY_URL ?? "http://localhost:8080"}/home/items/${id}/attachments/${attachmentId}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) return NextResponse.json({ ok: false, error: { message: "Documento no encontrado" } }, { status: res.status });
  const headers = new Headers();
  const contentType = res.headers.get("content-type"); if (contentType) headers.set("content-type", contentType);
  const disposition = res.headers.get("content-disposition"); if (disposition) headers.set("content-disposition", disposition);
  return new NextResponse(res.body, { status: 200, headers });
});
