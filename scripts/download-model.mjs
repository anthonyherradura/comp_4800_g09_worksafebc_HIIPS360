// One-time download of the search model into public/models so the app can load it offline.
// Run with: node scripts/download-model.mjs   (needs an internet connection)
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const base = "https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/";
const files = ["config.json", "tokenizer.json", "tokenizer_config.json", "onnx/model_quantized.onnx"];
const out = "public/models/Xenova/all-MiniLM-L6-v2";

for (const f of files) {
    const res = await fetch(base + f);
    if (!res.ok) throw new Error(`${f}: HTTP ${res.status}`);
    const dest = path.join(out, f);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    console.log("saved", dest);
}