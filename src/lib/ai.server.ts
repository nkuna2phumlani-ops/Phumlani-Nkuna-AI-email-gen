// Server-only Lovable AI Gateway helper (Responses API, streamed, strict JSON schema).
const RUN_ID = "X-Lovable-AIG-Run-ID";

export async function callAI<T>(opts: {
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
}): Promise<T> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured yet.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      instructions: opts.system,
      input: [{ role: "user", content: opts.user }],
      text: {
        format: { type: "json_schema", name: opts.schemaName, strict: true, schema: opts.schema },
      },
    }),
  });
  void res.headers.get(RUN_ID);
  if (!res.ok || !res.body) {
    let msg = `AI request failed (${res.status}).`;
    try {
      const j = (await res.json()) as { error?: { message?: string }; message?: string };
      msg = j.error?.message || j.message || msg;
    } catch {}
    if (res.status === 429) msg = "The AI is busy right now. Please wait a moment and try again.";
    if (res.status === 402) msg = "AI credits have run out for this workspace. " + msg;
    throw new Error(msg);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const ev = JSON.parse(data) as { type?: string; delta?: string; error?: { message?: string }; response?: { error?: { message?: string } } };
        if (ev.type === "response.output_text.delta" && ev.delta) out += ev.delta;
        if (ev.type === "error" || ev.type === "response.failed")
          throw new Error(ev.error?.message || ev.response?.error?.message || "AI failed.");
        if (ev.type === "response.refusal.delta") throw new Error("The AI declined this request.");
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
  if (!out.trim()) throw new Error("The AI returned an empty response. Please try again.");
  return JSON.parse(out) as T;
}

export const GROUNDING =
  "Constraints: Use ONLY information present in the provided context. Never invent names, dates, deadlines, decisions or facts. If something is not stated, use an empty string. Be concise and professional.";
