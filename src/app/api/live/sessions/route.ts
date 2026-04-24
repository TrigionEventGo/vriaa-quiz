import { NextResponse } from "next/server";

import { isAdminAuthorized } from "@/lib/admin-auth";
import { createLiveSession } from "@/lib/live-session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const session = createLiveSession();
  return NextResponse.json({
    code: session.code,
    hostPath: `/host/${session.code}`,
    playPath: `/play/${session.code}`,
  });
}
