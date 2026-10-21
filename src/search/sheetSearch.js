import MiniSearch from "minisearch";
import { SHEETS } from "../data/sheets";
import ortMjs from "../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs?url";
import ortWasm from "../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm?url";

const MODEL = "Xenova/all-MiniLM-L6-v2";
const MIN_SIMILARITY = 0.25;   // below this, a "meaning" match is too weak to show
const RRF_K = 60;              // standard constant for merging two ranked lists

const CHUNKS = SHEETS.flatMap((s) => s.chunks);
const byId = new Map(CHUNKS.map((c) => [c.id, c]));

// Keyword index. Always works, even if the AI model is missing.
const keyword = new MiniSearch({
    fields: ["heading", "text", "section", "sheetTitle"],
    searchOptions: { prefix: true, fuzzy: 0.2, boost: { heading: 2 } },
});
keyword.addAll(CHUNKS);

// The embeddings file is built by scripts/build-embeddings.mjs. glob() keeps the app
// from crashing before that file exists.
const embeddingFiles = import.meta.glob("../data/embeddings.json");

async function loadVectors() {
    const load = Object.values(embeddingFiles)[0];
    if (!load) throw new Error("embeddings.json has not been built yet");
    const { default: data } = await load();
    return new Map(Object.entries(data.vectors).map(([id, v]) => [id, Float32Array.from(v)]));
}

let ready;
function initSemantic() {
    ready ??= (async () => {
        const [{ pipeline, env }, vectors] = await Promise.all([
            import("@huggingface/transformers"),
            loadVectors(),
        ]);
        env.allowRemoteModels = false;          // everything comes from /public so it works offline
        env.allowLocalModels = true;
        env.localModelPath = "/models/";
        env.backends.onnx.wasm.wasmPaths = { mjs: ortMjs, wasm: ortWasm };
        const extractor = await pipeline("feature-extraction", MODEL, { dtype: "q8" });
        return { extractor, vectors };
    })();
    return ready;
}

/** Start loading the model early, for example when the search page opens. */
export function warmUp() {
    initSemantic().catch(() => {});
}

function dot(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
    return sum;
}

/**
 * Search the sheets by meaning and by keyword, then merge the two rankings.
 * Returns { results, mode } where mode is "hybrid" or "keyword" (model not available).
 */
export async function searchSheets(query, { sheetId, limit = 8 } = {}) {
    const q = query.trim();
    if (!q) return { results: [], mode: "none" };
    const inScope = (c) => !sheetId || c.sheetId === sheetId;

    const kw = keyword.search(q).map((r) => byId.get(r.id)).filter(inScope);
    let sem = [];
    let mode = "keyword";
    let error = "";

    try {
        const { extractor, vectors } = await initSemantic();
        const out = await extractor(q, { pooling: "mean", normalize: true });
        sem = CHUNKS.filter(inScope)
            .map((c) => ({ c, score: vectors.has(c.id) ? dot(out.data, vectors.get(c.id)) : 0 }))
            .filter((x) => x.score >= MIN_SIMILARITY)
            .sort((a, b) => b.score - a.score)
            .map((x) => x.c);
        mode = "hybrid";
    } catch (e) {
        error = e.message;
    }

    const scores = new Map();
    const matched = new Map();
    const bump = (list, tag) =>
        list.forEach((c, rank) => {
            scores.set(c.id, (scores.get(c.id) || 0) + 1 / (RRF_K + rank));
            matched.set(c.id, matched.has(c.id) ? "both" : tag);
        });
    bump(kw, "keyword");
    bump(sem, "meaning");

    const results = [...scores.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([id]) => ({ ...byId.get(id), matched: matched.get(id) }));

    return { results, mode, error };
}