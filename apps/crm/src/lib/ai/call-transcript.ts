/**
 * Speech-to-text cez OpenAI Whisper (server-side).
 * Bez OPENAI_API_KEY vráti kontrolovanú chybu.
 */

export async function transcribeCallAudio(params: {
  buffer: Buffer;
  filename: string;
  mimeType?: string;
}): Promise<{ text: string } | { error: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { error: "Chýba OPENAI_API_KEY — transkripcia nie je dostupná." };
  }

  try {
    const u8 = new Uint8Array(params.buffer);
    const blob = new Blob([u8], { type: params.mimeType || "application/octet-stream" });
    const formData = new FormData();
    formData.append("file", blob, params.filename.replace(/[^a-zA-Z0-9._-]/g, "_") || "call.webm");
    formData.append("model", "whisper-1");
    formData.append("language", "sk");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      return { error: `Whisper API: ${res.status} ${errText.slice(0, 240)}` };
    }

    const data = (await res.json()) as { text?: string };
    const text = String(data.text || "").trim();
    if (!text) {
      return { error: "Transkripcia je prázdna." };
    }
    return { text };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Transkripcia zlyhala." };
  }
}
