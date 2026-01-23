import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ZaiModel = {
  id: string;
  name: string;
  description: string;
};

// Z.ai models available via their API
const ZAI_MODELS: ZaiModel[] = [
  {
    id: "glm-4.7",
    name: "GLM-4.7",
    description: "Flagship coding model with advanced reasoning",
  },
  {
    id: "glm-4.6v",
    name: "GLM-4.6V",
    description: "Multimodal model with vision capabilities",
  },
];

function parseEnvList(value: string | undefined): ZaiModel[] {
  const raw = value?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((id) => ({ id, name: id, description: "Z.ai Model" }));
}

export async function GET() {
  const envModels = parseEnvList(process.env.ZAI_CHAT_MODELS);

  if (envModels.length > 0) {
    return NextResponse.json({ models: envModels });
  }

  // Return default Z.ai models
  return NextResponse.json({ models: ZAI_MODELS });
}
