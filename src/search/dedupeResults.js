// B-18: the same sheet showed up several times in one search. Plain ESM so node --test can import it.
//
// `ranked` is a list of sheet chunks, best match first. Keeps the first (best) of each group:
// - onePerSheet: one result per sheet. Used when searching every sheet, where the officer is picking a sheet.
// - otherwise: one result per passage. Sheets repeat some text word for word (the same hazard under
//   Loading and Unloading, a list of resources that each say "Consultation/inspection"), and those
//   repeats looked like the same result listed twice.
const sameText = (text) => String(text ?? "").replace(/\s+/g, " ").trim().toLowerCase();

export function dedupeResults(ranked, { onePerSheet = false } = {}) {
    const seen = new Set();
    return ranked.filter((chunk) => {
        const key = onePerSheet ? chunk.sheetId : `${chunk.sheetId}\n${sameText(chunk.text)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
