// Asks the server (which asks Gemini) for a hazard suggestion.
// Throws Error(message) on failure, same style as the auth service.
export async function suggestHazard({ text, photoFile }) {
    const body = new FormData();
    if (text) body.append("text", text);
    if (photoFile) body.append("photo", photoFile);

    const res = await fetch("/api/ai/suggest-hazard", { method: "POST", body, credentials: "same-origin" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Couldn't get a suggestion. Try again.");
    return data.suggestion;
}