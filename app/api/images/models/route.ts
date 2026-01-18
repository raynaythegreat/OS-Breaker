import { NextResponse } from "next/server";

type ImageModelConfig = {
  models: string[];
  defaultModel: string;
};

function parseModelList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,\\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildModelConfig(
  modelEnv: string | undefined,
  modelsEnv: string | undefined,
): ImageModelConfig {
  const list = parseModelList(modelsEnv);
  const defaultModel = (modelEnv ?? "").trim();
  const models = defaultModel && !list.includes(defaultModel)
    ? [defaultModel, ...list]
    : list;
  const uniqueModels = Array.from(new Set(models)).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
  return {
    models: uniqueModels,
    defaultModel: defaultModel || uniqueModels[0] || "",
  };
}

export async function GET() {
  const fireworks = buildModelConfig(
    process.env.FIREWORKS_IMAGE_MODEL,
    process.env.FIREWORKS_IMAGE_MODELS,
  );
  const nanobanana = buildModelConfig(
    process.env.NANOBANANA_IMAGE_MODEL,
    process.env.NANOBANANA_IMAGE_MODELS,
  );
  const ideogram = buildModelConfig(
    process.env.IDEOGRAM_IMAGE_MODEL,
    process.env.IDEOGRAM_IMAGE_MODELS,
  );

  return NextResponse.json({
    providers: {
      fireworks,
      nanobanana,
      ideogram,
    },
  });
}
