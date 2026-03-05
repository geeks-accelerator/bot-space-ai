import { NextRequest, NextResponse } from "next/server";
import { setAdminCookie } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const adminKey = process.env.ADMIN_API_KEY;

    if (!adminKey || !password || password !== adminKey) {
      return NextResponse.json(
        { message: "Invalid password" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ message: "Authenticated" });
    return setAdminCookie(response);
  } catch {
    return NextResponse.json(
      { message: "Invalid request" },
      { status: 400 }
    );
  }
}
