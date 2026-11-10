import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";

export default auth((req) => {
  const { pathname, searchParams } = req.nextUrl;

  // Conserva los enlaces antiguos de FinanzApp durante la transición.
  if (pathname === "/app" || pathname.startsWith("/app/")) {
    const url = req.nextUrl.clone();
    url.pathname = `/finance${pathname.slice("/app".length)}`;
    return NextResponse.redirect(url);
  }

  if (
    !(
      pathname === "/dashboard" ||
      pathname.startsWith("/dashboard/") ||
      pathname === "/finance" ||
      pathname.startsWith("/finance/")
      || pathname === "/home"
      || pathname.startsWith("/home/")
      || pathname === "/connections"
      || pathname.startsWith("/connections/")
      || pathname === "/shared-spaces"
      || pathname.startsWith("/shared-spaces/")
    )
  ) {
    return NextResponse.next();
  }

  if (!req.auth) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    if (!url.searchParams.get("callbackUrl")) {
      const qs = searchParams.toString();
      url.searchParams.set("callbackUrl", pathname + (qs ? `?${qs}` : ""));
    }
    return NextResponse.redirect(url);
  }

  if (req.auth.tokenError) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    if (!url.searchParams.get("callbackUrl")) {
      const qs = searchParams.toString();
      url.searchParams.set("callbackUrl", pathname + (qs ? `?${qs}` : ""));
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/finance/:path*", "/home/:path*", "/connections/:path*", "/shared-spaces/:path*", "/app/:path*"],
};
