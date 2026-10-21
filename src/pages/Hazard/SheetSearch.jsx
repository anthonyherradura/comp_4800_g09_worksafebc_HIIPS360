import { useEffect, useState } from "react";
import { searchSheets, warmUp } from "../../search/sheetSearch";
import "./SheetSearch.css";

export default function SheetSearch({ initialQuery = "", sheetId }) {
    const [query, setQuery] = useState(initialQuery);
    const [state, setState] = useState({ results: [], mode: "none" });
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        warmUp();
    }, []);

    useEffect(() => {
        if (!query.trim()) {
            setState({ results: [], mode: "none" });
            return;
        }
        let cancelled = false;
        setBusy(true);
        const timer = setTimeout(async () => {
            const next = await searchSheets(query, { sheetId });
            if (!cancelled) {
                setState(next);
                setBusy(false);
            }
        }, 250);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [query, sheetId]);

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
                        </details>
                    </li>
                ))}
            </ul>

        </div>
    );
}