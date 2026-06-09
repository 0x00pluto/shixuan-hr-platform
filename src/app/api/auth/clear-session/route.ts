import { NextResponse } from "next/server";

const SESSION_COOKIE = "sx_session";

export function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
