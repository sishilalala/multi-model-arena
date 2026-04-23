export async function GET() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    await fetch("https://openrouter.ai/api/v1/models", {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return Response.json({ online: true, timestamp: new Date().toISOString() });
  } catch {
    clearTimeout(timeoutId);
    return Response.json({ online: false, timestamp: new Date().toISOString() });
  }
}
