// Turns every chunk in src/data/sheets/*.json into a vector and writes src/data/embeddings.json.
// Run after extract_sheets.py and download-model.mjs:  node scripts/build-embeddings.mjs
import { pipeline, env } from "@huggingface/transformers";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MODEL = "Xenova/all-MiniLM-L6-v2";
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = path.resolve("public/models") + path.sep;

const dir = "src/data/sheets";
const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
const extractor = await pipeline("feature-extraction", MODEL, { dtype: "q8" });

// Heading first, so the hazard name carries the most weight. The model reads about 200 words.
const embeddingText = (c) => [c.sheetTitle, c.section, c.heading, c.text].filter(Boolean).join(". ");

const vectors = {};
for (const f of files) {
    const sheet = JSON.parse(await readFile(path.join(dir, f), "utf8"));
    for (const c of sheet.chunks) {
        const out = await extractor(embeddingText(c), { pooling: "mean", normalize: true });
        vectors[c.id] = Array.from(out.data, (x) => Math.round(x * 1e4) / 1e4);
    }
    console.log(f, sheet.chunks.length, "chunks embedded");
}

await writeFile("src/data/embeddings.json", JSON.stringify({ model: MODEL, dim: 384, vectors }));
console.log("wrote src/data/embeddings.json");