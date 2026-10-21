// Copies the ONNX runtime WebAssembly files into public/ort so they load offline too.
// Run with: node scripts/copy-ort.mjs
import { cp, mkdir, readdir } from "node:fs/promises";

const src = "node_modules/onnxruntime-web/dist";
const dst = "public/ort";
await mkdir(dst, { recursive: true });
for (const f of await readdir(src)) {
    if (/^ort-wasm.*\.(wasm|mjs)$/.test(f)) {
        await cp(`${src}/${f}`, `${dst}/${f}`);
        console.log("copied", f);
    }
}