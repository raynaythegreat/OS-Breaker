export function getRuntimeEnv() {
  const onVercel = process.env.VERCEL === "1";
  const onRender =
    process.env.RENDER === "true" ||
    (typeof process.env.RENDER_SERVICE_ID === "string" &&
      process.env.RENDER_SERVICE_ID.trim().length > 0);
  const onCloud = onVercel || onRender;
  return { onVercel, onRender, onCloud };
}

