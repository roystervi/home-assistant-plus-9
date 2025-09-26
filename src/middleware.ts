import { NextResponse } from 'next/server'

export default function middleware(req) {
  return NextResponse.next()
}

export const config = {
  runtime: "nodejs",
  matcher: ["/settings", "/energy", "/automations", "/thermostat", "/sprinkler", "/cameras", "/media", "/assistant", "/agenda", "/medications", "/alarm", "/system", "/crypto"], // Apply middleware to specific routes
};