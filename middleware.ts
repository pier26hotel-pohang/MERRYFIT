import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const isAdmin = req.cookies.get("mf_admin")?.value === "1";
  const path = req.nextUrl.pathname;
  if ((path.startsWith("/admin") || path.startsWith("/checkin")) && !isAdmin) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/checkin/:path*"] };
