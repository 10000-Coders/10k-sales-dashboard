import {NextResponse} from 'next/server';

const session = false;

const protectedRoutes = ['/batches', '/completed', '/unreadrequests'];

export default async function middleware(request) {
  if (!session && protectedRoutes.includes(request.nextUrl.pathname)) {
    const loginUrl = new URL(
      `/login?redirectTo=${encodeURIComponent(request.nextUrl.pathname)}`,
      request.nextUrl.origin,
    );
    return NextResponse.redirect(loginUrl);
  }

  // Continue with the request if not a protected route
  return NextResponse.next();
}
