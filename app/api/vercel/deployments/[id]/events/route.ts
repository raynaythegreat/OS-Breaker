import { NextRequest, NextResponse } from "next/server";
import { VercelService } from "@/services/vercel";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function coerceEvents(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (isPlainObject(value) && Array.isArray((value as any).events)) return (value as any).events;
  return [];
}

function extractEventText(event: unknown): string | null {
  if (typeof event === "string") return event;
  if (!isPlainObject(event)) return null;

  const direct = (event as any).text ?? (event as any).message;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const payload = (event as any).payload;
  if (isPlainObject(payload)) {
    const payloadText =
      (payload as any).text ??
      (payload as any).message ??
      (payload as any).stdout ??
      (payload as any).stderr ??
      (payload as any).data;
    if (typeof payloadText === "string" && payloadText.trim()) return payloadText.trim();
  }

  return null;
}

function buildLogText(events: unknown[], maxChars = 20_000): string {
  const lines: string[] = [];
  for (const event of events) {
    const text = extractEventText(event);
    if (!text) continue;
    lines.push(text);
  }

  const joined = lines.join("\n");
  if (joined.length <= maxChars) return joined;
  return joined.slice(joined.length - maxChars);
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Deployment ID is required" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw && /^\d+$/.test(limitRaw) ? Math.min(5000, Math.max(1, Number(limitRaw))) : 2000;

    const vercel = new VercelService();
    const raw = await vercel.getDeploymentEvents(id, limit);
    const events = coerceEvents(raw);
    const text = buildLogText(events);

    return NextResponse.json({ eventsCount: events.length, text });
  } catch (error) {
    console.error("Failed to get deployment events:", error);
    return NextResponse.json(
      { eventsCount: 0, text: "", error: error instanceof Error ? error.message : "Failed to get deployment events" },
      { status: 200 }
    );
  }
}

