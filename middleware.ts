import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Rafraîchit la session Supabase et garde l'accès à /admin.
 *
 * Première couche de défense seulement : le middleware ne vérifie que la
 * présence d'une session. Le contrôle du rôle admin est refait côté serveur
 * dans le layout /admin (requireAdmin) et garanti en base par la RLS.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && pathname.startsWith("/admin")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // `/espace/connexion` doit rester joignable sans session, sinon la page de
  // connexion se redirige vers elle-même.
  if (
    !user &&
    pathname.startsWith("/espace") &&
    !pathname.startsWith("/espace/connexion")
  ) {
    return NextResponse.redirect(new URL("/espace/connexion", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf les fichiers statiques et les images optimisées.
     * `/api/stripe/webhook` est exclu : la signature Stripe est calculée sur le
     * corps brut et la requête ne porte aucun cookie de session. `/r/` l'est
     * aussi : la redirection NFC doit être la plus rapide possible et n'a
     * jamais besoin de session.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|r/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
