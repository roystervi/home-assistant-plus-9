import { NextResponse } from 'next/server'

export default function middleware(req) {
  return NextResponse.next()
}

export const config = {
  runtime: "nodejs",
  matcher: ["/settings", "/dashboard", "/energy", "/automations", "/thermostat", "/sprinkler", "/cameras", "/media", "/assistant", "/medications", "/alarm", "/system", "/crypto"], // Apply middleware to specific routes
};