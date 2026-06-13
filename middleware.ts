import { auth } from "@/auth";

/**
 * Server-side route protection. Runs before any matched page renders, so a
 * protected page never reaches the client (even partially) without a valid
 * session cookie. Unauthenticated requests are redirected to /signup.
 */
export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/signup", req.nextUrl.origin);
    loginUrl.searchParams.set("mode", "login");
    loginUrl.searchParams.set(
      "callbackUrl",
      req.nextUrl.pathname + req.nextUrl.search,
    );
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/platform/:path*",
    "/account/:path*",
    "/payouts/:path*",
  ],
};
