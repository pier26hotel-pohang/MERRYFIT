import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const isAdmin = req.cookies.get("mf_admin")?.value === "1";
  const hasStaff = Boolean(req.cookies.get("mf_staff")?.value);
  const path = req.nextUrl.pathname;

  // /staff 는 강사 본인 화면 — 강사 계정이면 통과, 관리자도 볼 수 있다.
  const needsStaff = path.startsWith("/staff");
  const needsAdmin = path.startsWith("/admin") || path.startsWith("/checkin");

  if ((needsAdmin && !isAdmin) || (needsStaff && !hasStaff && !isAdmin)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/checkin/:path*", "/staff/:path*"] };
