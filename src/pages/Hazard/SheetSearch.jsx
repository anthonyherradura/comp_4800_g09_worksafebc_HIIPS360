import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { searchSheets, warmUp } from "../../search/sheetSearch";
import "./SheetSearch.css";

const NO_RESULTS = { query: "", results: [], mode: "none" };

export default function SheetSearch({ initialQuery = "", sheetId }) {
    const [query, setQuery] = useState(initialQuery);
    // The last finished search and the text it was for. What to show and "Searching..." are worked out
    // from it during render, so the effect only sets state when a search comes back (B-15).
    const [found, setFound] = useState(NO_RESULTS);
    const q = query.trim();
    const state = q ? found : NO_RESULTS;
    const busy = q !== "" && found.query !== q;

    useEffect(() => {
        warmUp();
    }, []);

    useEffect(() => {
        if (!q) return;
        let cancelled = false;
        const timer = setTimeout(async () => {
            const next = await searchSheets(q, { sheetId });
            if (!cancelled) setFound({ ...next, query: q });
        }, 250);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [q, sheetId]);

    return (
        <div className="ss">
            <label className="ss-label" htmlFor="ss-query">
                Describe what you see, or search a sheet
            </label>
            <input
                id="ss-query"
                className="ss-input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Driver standing on the bunks to raise stakes"
            />

            <p className="ss-status" aria-live="polite">
                {busy && "Searching..."}
                {!busy && state.mode === "keyword" && "Keyword search only. The AI search model is not loaded."}
                {!busy && state.mode === "hybrid" && state.results.length === 0 && "No matches. Try describing it another way."}
            </p>

            <ul className="ss-results">
                {state.results.map((r) => (
                    <li key={r.id}>
                        <details className="ss-item">
                            <summary>
                                <span className="ss-heading">{r.heading || r.section}</span>
                                <span className="ss-meta">
                                    {r.sheetTitle} · {r.section}
                                </span>
                            </summary>
                            <p className="ss-text">{r.text}</p>
                            {r.regulations.length > 0 && (
                                <p className="ss-regs">{r.regulations.join(" · ")}</p>
                            )}
                            <p className="ss-meta">
                                Sheet issued {r.issued}, page {r.page}
                            </p>
                            {!sheetId && (
                                <Link className="ss-more" to={`/sheets/${r.sheetId}?q=${encodeURIComponent(q)}`}>
                                    More matches in this sheet
                                </Link>
                            )}
                        </details>
                    </li>
                ))}
            </ul>

        </div>
    );
}