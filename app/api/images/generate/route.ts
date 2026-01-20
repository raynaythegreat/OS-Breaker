import { NextRequest, NextResponse } from "next/server";

type ImageProvider = "fireworks" | "nanobanana" | "ideogram";

const ALLOWED_SIZES = new Set(["512x512", "768x768", "1024x1024"]);
const MAX_PROMPT_CHARS = 2000;
const DEFAULT_IMAGE_MIME = "image/png";

type ProviderConfig = {
  label: string;
  apiKey?: string;
  baseUrl: string;
  endpoint?: string;
  model: string;
  keyHint: string;
  baseUrlHint: string;
  endpointHint: string;
  modelHint: string;
  requiresModel: boolean;
  renderingSpeed?: string;
  styleType?: string;
};

function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function resolveEndpoint(
  baseUrl: string,
  endpoint: string | undefined,
): string | null {
  const endpointValue = endpoint?.trim() || "";
  if (endpointValue && /^https?:\/\//i.test(endpointValue)) {
    return endpointValue;
  }

  const normalizedBase = normalizeUrl(baseUrl || "");
  if (!normalizedBase) return null;
  const path = endpointValue.replace(/^\/+/, "");
  if (!path) return normalizedBase;
  return new URL(
    path,
    normalizedBase.endsWith("/") ? normalizedBase : `${normalizedBase}/`,
  ).toString();
}

function buildNanobananaFallbackEndpoints(
  config: ProviderConfig,
  initialUrl: string,
): string[] {
  const base = normalizeUrl(config.baseUrl || "");
  if (!base) return [];
  const endpointValue = config.endpoint?.trim() || "";
  const cleanedEndpoint = endpointValue.replace(/^\/+/, "");
  const baseHasV1 = /\/v1(\/|$)/i.test(base);
  const endpointHasV1 = cleanedEndpoint.startsWith("v1/");
  const baseCandidates = baseHasV1
    ? [base]
    : [base, `${base.replace(/\/+$/, "")}/v1`];
  const endpointCandidates = endpointHasV1
    ? [cleanedEndpoint, cleanedEndpoint.replace(/^v1\//, "")]
    : [cleanedEndpoint, `v1/${cleanedEndpoint}`];

  const candidates = new Set<string>();
  for (const baseCandidate of baseCandidates) {
    for (const endpointCandidate of endpointCandidates) {
      const resolved = resolveEndpoint(baseCandidate, endpointCandidate);
      if (resolved) candidates.add(resolved);
    }
  }

  candidates.delete(initialUrl);
  return Array.from(candidates);
}

async function readErrorBody(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  if (!text) return "";
  try {
    const data = JSON.parse(text);
    if (typeof data === "string") return data;
    return (
      data?.error?.message ||
      data?.message ||
      data?.error ||
      data?.detail ||
      text
    );
  } catch {
    return text;
  }
}

function parseBase64(value: string): { base64: string; mimeType: string } {
  const trimmed = value.trim();
  const match = trimmed.match(/^data:([^;]+);base64,(.+)$/i);
  if (match) {
    return { base64: match[2] || "", mimeType: match[1] || DEFAULT_IMAGE_MIME };
  }
  return { base64: trimmed, mimeType: DEFAULT_IMAGE_MIME };
}

async function fetchImageAsBase64(url: string): Promise<{
  base64: string;
  mimeType: string;
} | null> {
  const response = await fetch(url);
  if (!response.ok) return null;
  const mimeType =
    response.headers.get("content-type")?.split(";")[0] || DEFAULT_IMAGE_MIME;
  const buffer = Buffer.from(await response.arrayBuffer());
  return { base64: buffer.toString("base64"), mimeType };
}

function getProviderConfig(provider: ImageProvider, request: NextRequest): ProviderConfig {
  if (provider === "fireworks") {
    return {
      label: "Fireworks",
      apiKey:
        request.headers.get("x-fireworks-key") ||
        process.env.FIREWORKS_IMAGE_API_KEY || 
        process.env.FIREWORKS_API_KEY,
      baseUrl:
        process.env.FIREWORKS_IMAGE_BASE_URL ||
        process.env.FIREWORKS_BASE_URL ||
        "https://api.fireworks.ai/inference/v1",
      endpoint:
        process.env.FIREWORKS_IMAGE_ENDPOINT || "images/generations",
      model: process.env.FIREWORKS_IMAGE_MODEL || "",
      keyHint: "FIREWORKS_IMAGE_API_KEY or FIREWORKS_API_KEY",
      baseUrlHint: "FIREWORKS_IMAGE_BASE_URL",
      endpointHint: "FIREWORKS_IMAGE_ENDPOINT",
      modelHint: "FIREWORKS_IMAGE_MODEL",
      requiresModel: true,
    };
  }

  if (provider === "nanobanana") {
    // Note: Nanobanana key is not in our settings UI, but we keep the logic for completeness.
    return {
      label: "Nanobanana",
      apiKey:
        request.headers.get("x-nanobanana-key") ||
        process.env.NANOBANANA_IMAGE_API_KEY || 
        process.env.NANOBANANA_API_KEY,
      baseUrl:
        process.env.NANOBANANA_IMAGE_BASE_URL ||
        process.env.NANOBANANA_BASE_URL ||
        "https://api.nanobananaapi.ai/v1",
      endpoint:
        process.env.NANOBANANA_IMAGE_ENDPOINT ||
        "nanobanana-api/generate-or-edit-image",
      model: process.env.NANOBANANA_IMAGE_MODEL || "",
      keyHint: "NANOBANANA_IMAGE_API_KEY or NANOBANANA_API_KEY",
      baseUrlHint: "NANOBANANA_IMAGE_BASE_URL",
      endpointHint: "NANOBANANA_IMAGE_ENDPOINT",
      modelHint: "NANOBANANA_IMAGE_MODEL",
      requiresModel: false,
    };
  }

  return {
    label: "Ideogram",
    apiKey: 
      request.headers.get("x-ideogram-key") ||
      process.env.IDEOGRAM_IMAGE_API_KEY || 
      process.env.IDEOGRAM_API_KEY,
    baseUrl:
      process.env.IDEOGRAM_IMAGE_BASE_URL ||
      process.env.IDEOGRAM_BASE_URL ||
      "https://api.ideogram.ai",
    endpoint:
      process.env.IDEOGRAM_IMAGE_ENDPOINT || "v1/ideogram-v3/generate",
    model: process.env.IDEOGRAM_IMAGE_MODEL || "",
    renderingSpeed:
      process.env.IDEOGRAM_IMAGE_RENDERING_SPEED || "TURBO",
    styleType:
      process.env.IDEOGRAM_IMAGE_STYLE_TYPE || "AUTO",
    keyHint: "IDEOGRAM_IMAGE_API_KEY or IDEOGRAM_API_KEY",
    baseUrlHint: "IDEOGRAM_IMAGE_BASE_URL",
    endpointHint: "IDEOGRAM_IMAGE_ENDPOINT",
    modelHint: "IDEOGRAM_IMAGE_MODEL",
    requiresModel: false,
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const provider = payload.provider as ImageProvider | undefined;
    if (!provider || !["fireworks", "nanobanana", "ideogram"].includes(provider)) {
      return NextResponse.json(
        { error: "Unsupported image provider." },
        { status: 400 },
      );
    }

    const promptRaw = typeof payload.prompt === "string" ? payload.prompt : "";
    const prompt = promptRaw.trim().slice(0, MAX_PROMPT_CHARS);
    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required." },
        { status: 400 },
      );
    }

    const sizeCandidate = typeof payload.size === "string" ? payload.size : "";
    const size = ALLOWED_SIZES.has(sizeCandidate)
      ? sizeCandidate
      : "1024x1024";

    const config = getProviderConfig(provider, request);
    if (!config.apiKey) {
      return NextResponse.json(
        { error: `${config.label} API key missing. Set ${config.keyHint} in settings.` },
        { status: 400 },
      );
    }

    const endpointUrl = resolveEndpoint(config.baseUrl || "", config.endpoint);
    if (!endpointUrl) {
      return NextResponse.json(
        {
          error: `${config.label} endpoint missing. Set ${config.baseUrlHint} and ${config.endpointHint}.`,
        },
        { status: 400 },
      );
    }

    let resolvedEndpointUrl = endpointUrl;
    const modelOverride =
      typeof payload.model === "string" ? payload.model.trim() : "";
    const model = modelOverride || config.model.trim();
    if (config.requiresModel && !model) {
      return NextResponse.json(
        {
          error: `${config.label} model is required. Set ${config.modelHint} or pass a model.`,
        },
        { status: 400 },
      );
    }

    const headers: Record<string, string> = {};
    if (provider === "ideogram") {
      headers["Api-Key"] = config.apiKey;
    } else {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }
    headers["Content-Type"] = "application/json";

    const body =
      provider === "fireworks"
        ? {
            model,
            prompt,
            size,
            n: 1,
            response_format: "b64_json",
          }
        : provider === "ideogram"
          ? {
              prompt,
              rendering_speed: config.renderingSpeed,
              style_type: config.styleType,
            }
          : (() => {
              const [width, height] = size
                .split("x")
                .map((val: string) => Number(val));
              return {
                prompt,
                ...(model ? { model } : {}),
                ...(size ? { size } : {}),
                ...(Number.isFinite(width) ? { width } : {}),
                ...(Number.isFinite(height) ? { height } : {}),
              };
            })();

    const makeRequest = (url: string) =>
      fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

    let response = await makeRequest(resolvedEndpointUrl);
    if (!response.ok && provider === "nanobanana" && response.status === 404) {
      const fallbackEndpoints = buildNanobananaFallbackEndpoints(
        config,
        resolvedEndpointUrl,
      );
      for (const fallback of fallbackEndpoints) {
        const fallbackResponse = await makeRequest(fallback);
        if (fallbackResponse.ok || fallbackResponse.status !== 404) {
          response = fallbackResponse;
          resolvedEndpointUrl = fallback;
          break;
        }
      }
    }

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) {
      const errorText = await readErrorBody(response);
      const errorPath = (() => {
        try {
          return new URL(resolvedEndpointUrl).pathname;
        } catch {
          return "";
        }
      })();
      return NextResponse.json(
        {
          error:
            errorText ||
            `${config.label} image request failed (HTTP ${response.status})${
              errorPath ? ` at ${errorPath}` : ""
            }.`,
        },
        { status: response.status },
      );
    }

    let data: any = null;
    let directImage: { base64: string; mimeType: string } | null = null;
    if (contentType.startsWith("image/")) {
      const buffer = Buffer.from(await response.arrayBuffer());
      directImage = {
        base64: buffer.toString("base64"),
        mimeType: contentType.split(";")[0] || DEFAULT_IMAGE_MIME,
      };
    } else {
      const responseText = await response.text();
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {
        data = null;
      }
    }

    const candidates: Array<{
      b64?: string;
      url?: string;
      mimeType?: string;
      revisedPrompt?: string | null;
    }> = [];

    if (directImage) {
      candidates.push({ b64: directImage.base64, mimeType: directImage.mimeType });
    }

    const dataArray = Array.isArray(data?.data) ? data.data : [];
    for (const item of dataArray) {
      if (typeof item?.b64_json === "string") {
        candidates.push({
          b64: item.b64_json,
          mimeType: DEFAULT_IMAGE_MIME,
          revisedPrompt:
            typeof item?.revised_prompt === "string"
              ? item.revised_prompt
              : null,
        });
        continue;
      }
      if (typeof item?.url === "string") {
        candidates.push({ url: item.url });
        continue;
      }
      if (typeof item?.image === "string") {
        candidates.push({ b64: item.image, mimeType: DEFAULT_IMAGE_MIME });
      }
    }

    if (typeof data?.image === "string") {
      candidates.push({ b64: data.image, mimeType: DEFAULT_IMAGE_MIME });
    }
    if (typeof data?.image_base64 === "string") {
      candidates.push({ b64: data.image_base64, mimeType: DEFAULT_IMAGE_MIME });
    }
    if (typeof data?.url === "string") {
      candidates.push({ url: data.url });
    }

    const normalizedImages: Array<{
      b64: string;
      mimeType: string;
      revisedPrompt: string | null;
    }> = [];

    for (const candidate of candidates) {
      if (candidate.b64) {
        const parsed = parseBase64(candidate.b64);
        if (!parsed.base64) continue;
        normalizedImages.push({
          b64: parsed.base64,
          mimeType: candidate.mimeType || parsed.mimeType,
          revisedPrompt: candidate.revisedPrompt ?? null,
        });
        continue;
      }

      if (candidate.url) {
        const fetched = await fetchImageAsBase64(candidate.url);
        if (!fetched?.base64) continue;
        normalizedImages.push({
          b64: fetched.base64,
          mimeType: fetched.mimeType || DEFAULT_IMAGE_MIME,
          revisedPrompt: candidate.revisedPrompt ?? null,
        });
      }
    }

    if (normalizedImages.length === 0) {
      return NextResponse.json(
        { error: "No image data returned from provider." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      provider,
      images: normalizedImages,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Image generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
