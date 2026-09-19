// Refreshes the Supabase auth session on every request and protects
// authenticated routes. Runs before any page/route handler.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PROTECTED_PREFIXES = ["/dashboard", "/profile", "/assessments", "/settings", "/admin", "/organization"];
const STAFF_ONLY_PREFIXES = ["/admin"];
const ORG_ACCESS_PREFIXES = ["/organization"];
const STAFF_ROLES = ["OWNER", "ADMIN", "SUPPORT"];
const ORG_ACCESS_ROLES = ["OWNER", "ADMIN", "SUPPORT", "ORGANIZATION_MANAGER"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p));

  if (isProtected && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const needsStaff = STAFF_ONLY_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p));
  const needsOrgAccess = ORG_ACCESS_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p));

  if (user && (needsStaff || needsOrgAccess)) {
    const admin = createAdminClient();
    const { data: roleRows, error: roleErr } = await admin
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", user.id);
    console.error("[middleware-debug] role check", { userId: user.id, path: request.nextUrl.pathname, roleErr, roleRows });
    const roleNames = (roleRows ?? []).map((r: any) => r.roles?.name).filter(Boolean);
    const requiredRoles = needsStaff ? STAFF_ROLES : ORG_ACCESS_ROLES;
    const authorized = roleNames.some((name: string) => requiredRoles.includes(name));

    if (!authorized) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
