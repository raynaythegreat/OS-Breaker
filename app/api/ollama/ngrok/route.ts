import { NextRequest, NextResponse } from "next/server";
import { getRuntimeEnv } from "@/lib/runtime";
import { ensureNgrokTunnel } from "@/lib/ngrok";

export const dynamic = "force-dynamic";

function isLocalHostRequest(request: NextRequest) {
  const host = request.headers.get("host") || "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("0.0.0.0");
}


export async function POST(request: NextRequest) {
  const { onCloud } = getRuntimeEnv();
  if (onCloud) {
    return NextResponse.json(
      { ok: false, error: "This action can only run on your local machine (not on a cloud deployment)." },
      { status: 200 }
    );
  }

  if (!isLocalHostRequest(request)) {
    return NextResponse.json({ ok: false, error: "This endpoint is only available from localhost." }, { status: 403 });
  }

  const port = 11434;
  const started = await ensureNgrokTunnel(port);
  if (!started.publicUrl) {
    return NextResponse.json(
      { ok: false, error: started.error || "Failed to start ngrok", started: started.started, port },
      { status: 200 }
    );
  }

  return NextResponse.json({
    ok: true,
    port,
    started: started.started,
    publicUrl: started.publicUrl,
  });
}
