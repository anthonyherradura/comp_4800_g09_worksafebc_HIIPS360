import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { useHazards } from "../../context/HazardContext";
import { useJobs } from "../../context/JobContext";
import { SHEET_CATALOG, getJobChecklist } from "../../data/sheets";
import { matchesWords } from "../../data/sheets/catalog";
import { HAZARD_STATUS, getHazardStatus } from "../../data/hazardStatus";
import { shrinkImage } from "../../data/store";
import useRecentSheets from "../../hooks/useRecentSheets";
import { CameraPlusIcon, CloseIcon } from "../Hazard/HazardIcons";
import { matchSheets } from "./matchSheets";
import "./Homepage.css";

const byId = Object.fromEntries(SHEET_CATALOG.map((s) => [s.sheetId, s]));
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const MAX_RECENT = 3;
const DEFAULT_SHEETS = SHEET_CATALOG;

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const SparkleIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.5 14 9l6.5 2-6.5 2-2 6.5-2-6.5-6.5-2L10 9l2-6.5Z" fill="currentColor" />
        <path d="M19 15.5 19.8 18l2.2.7-2.2.8L19 22l-.8-2.5-2.2-.8 2.2-.7.8-2.5Z" fill="currentColor" />
    </svg>
);

const WarningIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 2.5 20h19L12 3Z" fill="currentColor" />
        <path d="M12 9.5v5" stroke="var(--wsbc-white)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="17.2" r="1.1" fill="var(--wsbc-white)" />
    </svg>
);

const ChecklistIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="4" width="14" height="17" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M9 3h6v3H9zM8.5 11h1.5M8.5 15h1.5M12.5 11h3M12.5 15h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const DocumentIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3h8l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M14 3v5h5M8.5 13h7M8.5 17h7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

// One sheet in a list: tap to add it to the job, tap again to remove it
function SheetOption({ sheet, reason, selected, onPick }) {
    return (
        <li>
            <button
                type="button"
                className={`home-card home-sheet${selected ? " is-selected" : ""}`}
                aria-pressed={selected}
                onClick={() => onPick(sheet.sheetId)}
            >
                <span className="home-card-text">
                    <span className="home-card-title">{sheet.name}</span>
                    {reason && <span className="home-sheet-reason">{reason}</span>}
                    <span className="home-card-desc">
                        {[sheet.cu, `Issued ${sheet.issued}`].filter(Boolean).join(" · ")}
                    </span>
                </span>
                <span className="home-sheet-check" aria-hidden="true">
                    {selected && <CheckIcon />}
                </span>
            </button>
        </li>
    );
}

// Home: pick the protocol sheets for the current job by name, by describing the work (Gemini) or from a photo.
// A job can have several (framing with a scaffold up the side). PRD: reach the sheet for the work, and confirm
// or change the ones offered.
export default function HomePage() {
    const { currentJob, setJobSheets } = useJobs();
    const { hazards } = useHazards();
    const [query, setQuery] = useState("");
    const [ai, setAi] = useState({ status: "idle" }); // idle | loading | done | error
    // Sheet ids, most recently viewed first. Saved on the officer's account.
    const { user } = useAuth();
    const requestId = useRef(0);

    const email = user?.email?.trim().toLowerCase();
    const [recentIds, remember, recentLoaded] = useRecentSheets(email, MAX_RECENT);
    const selectedIds = (currentJob?.sheetIds ?? []).filter((id) => byId[id]);
    const selected = selectedIds.map((id) => byId[id]);
    const isSelected = (sheetId) => selectedIds.includes(sheetId);

    const q = query.trim();
    const searching = q !== "";
    const aiMatches = ai.status === "done" ? ai.matches.filter((m) => byId[m.sheetId]) : [];
    const filtered = SHEET_CATALOG.filter((s) => matchesWords(s, query));
    const recentSheets = recentIds.map((id) => byId[id]).filter(Boolean).slice(0, MAX_RECENT);
    const hasRecent = recentSheets.length > 0;
    const listed = searching ? filtered : hasRecent ? recentSheets : DEFAULT_SHEETS;
    const listReady = searching || recentLoaded;
    // So every sheet can still be browsed once there are recent ones
    const otherSheets = hasRecent ? SHEET_CATALOG.filter((s) => !recentSheets.includes(s)) : [];

    // A job that already has a sheet counts as viewed, so the list is not empty for it.
    const firstSelected = selectedIds[0];
    useEffect(() => {
        if (recentLoaded && firstSelected && !recentIds.includes(firstSelected)) remember(firstSelected);
    }, [recentLoaded, firstSelected]); // eslint-disable-line react-hooks/exhaustive-deps

    // Adding a sheet loads its hazards into the job (and the Planning checklist reads it too); removing it takes
    // away only the hazards nobody has worked on. The server does both in the same save.
    function pick(sheetId) {
        const adding = !isSelected(sheetId);
        setJobSheets(currentJob.id, adding ? [...selectedIds, sheetId] : selectedIds.filter((id) => id !== sheetId));
        if (adding) remember(sheetId);
    }

    const suggestedToAdd = aiMatches.map((m) => m.sheetId).filter((id) => !isSelected(id));
    function addSuggested() {
        setJobSheets(currentJob.id, [...selectedIds, ...suggestedToAdd]);
        suggestedToAdd.forEach(remember);
    }
    // Still to do: no photo and not marked not applicable, whether it came from a sheet or the officer logged it.
    // From HazardContext, which has photo URLs and unsaved Not applicable taps (the job's own hazards have neither).
    const toReview = hazards.filter((h) => getHazardStatus(h) === HAZARD_STATUS.UNADDRESSED).length;

    async function ask({ text, photoFile }) {
        const id = ++requestId.current;
        setAi({ status: "loading", fromPhoto: !!photoFile });
        try {
            const matches = await matchSheets({ text, photoFile });
            if (id !== requestId.current) return;
            setAi({ status: "done", fromPhoto: !!photoFile, matches });
        } catch (err) {
            if (id !== requestId.current) return;
            setAi({ status: "error", message: err.message });
        }
    }

    function handleQueryChange(e) {
        setQuery(e.target.value);
        requestId.current += 1;
        setAi((prev) => (prev.status === "idle" ? prev : { status: "idle" }));
    }

    function handleAsk(e) {
        e.preventDefault();
        if (query.trim() && ai.status !== "loading") ask({ text: query.trim() });
    }

    async function handlePhoto(e) {
        const file = e.target.files?.[0];
        e.target.value = ""; // lets the same photo be picked again
        if (!file) return;
        // Phone photos are 3 to 5 MB; a smaller JPEG uploads faster and is plenty for Gemini
        const photoFile = (await shrinkImage(file).catch(() => null)) ?? file;
        ask({ text: query.trim(), photoFile });
    }

    if (!currentJob) {
        return (
            <div className="page-content">
                <h1 className="home-title">What work are you inspecting?</h1>
                <div className="home-panel">
                    <Link className="home-card" to="/jobs">
                        <span className="home-card-text">
                            <span className="home-card-title">Select a job site first</span>
                            <span className="home-card-desc">The protocol sheets are saved with the job</span>
                        </span>
                        <span className="home-arrow" aria-hidden="true" />
                    </Link>
                </div>
            </div>
        );
    }

    const loading = ai.status === "loading";

    return (
        <div className="page-content">
            <h1 className="home-title">What work are you inspecting?</h1>

            {selected.length > 0 && (
                <section className="home-selected" aria-labelledby="selected-heading">
                    <h2 id="selected-heading" className="home-selected-kicker">
                        {selected.length === 1 ? "Protocol sheet for this job" : `Protocol sheets for this job (${selected.length})`}
                    </h2>
                    <ul className="home-selected-sheets">
                        {selected.map((s) => (
                            <li key={s.sheetId} className="home-selected-sheet">
                                <span className="home-selected-name">
                                    {s.name} <span className="home-selected-cu">{s.cu}</span>
                                </span>
                                <a
                                    className="home-selected-pdf"
                                    href={`/sheets-pdf/${s.sheetId}.pdf`}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label={`Open the ${s.name} sheet (PDF)`}
                                >
                                    <DocumentIcon />
                                </a>
                                <button
                                    type="button"
                                    className="home-selected-remove"
                                    aria-label={`Remove ${s.name} from this job`}
                                    onClick={() => pick(s.sheetId)}
                                >
                                    <CloseIcon />
                                </button>
                            </li>
                        ))}
                    </ul>
                                        <ul className="home-selected-links">
                        <li>
                            <Link to="/planning">
                                <span className="home-link-icon"><ChecklistIcon /></span>
                                <span className="home-card-text">
                                    <span className="home-card-title">
                                        {plural(getJobChecklist(selectedIds).length, "checklist item")}
                                    </span>
                                </span>
                                <span className="home-arrow" aria-hidden="true" />
                            </Link>
                        </li>
                        <li>
                            <Link to="/hazard">
                                <span className="home-link-icon home-link-icon--warn"><WarningIcon /></span>
                                <span className="home-card-text">
                                    <span className="home-card-title">
                                        {toReview ? `${plural(toReview, "hazard")} to review` : "No hazards left to review"}
                                    </span>
                                </span>
                                <span className="home-arrow" aria-hidden="true" />
                            </Link>
                        </li>
                    </ul>
                </section>
            )}

            <form className="home-box home-search" onSubmit={handleAsk} role="search">
                <label className="home-search-label" htmlFor="home-query">
                    {selected.length ? "Add another sheet: search, or describe the work" : "Search sheets, or describe the work and ask AI"}
                </label>
                <input
                    id="home-query"
                    className="home-input"
                    type="search"
                    maxLength={500}
                    value={query}
                    onChange={handleQueryChange}
                    placeholder="Sheet name, CU number or the work"
                    enterKeyHint="search"
                />
                <div className="home-actions">
                    <label className={`home-action home-photo${loading ? " is-disabled" : ""}`}>
                        <CameraPlusIcon />
                        <span>From a photo</span>
                        <input
                            className="home-visually-hidden"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            capture="environment"
                            aria-label="Match a protocol sheet from a photo of the worksite"
                            disabled={loading}
                            onChange={handlePhoto}
                        />
                    </label>
                    <button type="submit" className="home-action home-send" disabled={!query.trim() || loading}>
                        <SparkleIcon />
                        <span>Ask AI</span>
                    </button>
                </div>
            </form>

            {ai.status !== "idle" && (
                <section aria-labelledby="ai-heading" aria-live="polite">
                    <h2 id="ai-heading" className="home-section-heading">
                        {ai.fromPhoto ? "Suggested from your photo" : "Suggested by AI"}
                    </h2>
                    {loading ? (
                        <p className="home-box home-panel-note">Matching protocol sheets…</p>
                    ) : ai.status === "error" ? (
                        <p role="alert" className="home-box home-error">{ai.message}</p>
                    ) : aiMatches.length === 0 ? (
                        <p className="home-box home-panel-note">
                            No protocol sheet covers that work. Try describing it differently, or pick from the list.
                        </p>
                    ) : (
                        <>
                            <ul className="home-panel">
                                {aiMatches.map((m) => (
                                    <SheetOption
                                        key={m.sheetId}
                                        sheet={byId[m.sheetId]}
                                        reason={m.reason}
                                        selected={isSelected(m.sheetId)}
                                        onPick={pick}
                                    />
                                ))}
                            </ul>
                            {aiMatches.length > 1 && suggestedToAdd.length > 0 && (
                                <button type="button" className="home-add-all" onClick={addSuggested}>
                                    Add {suggestedToAdd.length === aiMatches.length ? "all" : "the other"} {plural(suggestedToAdd.length, "suggested sheet")}
                                </button>
                            )}
                        </>
                    )}
                </section>
            )}

            {listReady && (
                <section aria-labelledby="sheets-heading">
                    <h2 id="sheets-heading" className="home-section-heading">
                        {searching
                            ? `${filtered.length} of ${SHEET_CATALOG.length} sheets match “${q}”`
                            : hasRecent
                                ? `Recently viewed (${recentSheets.length})`
                                : `Sheets (${DEFAULT_SHEETS.length})`}
                    </h2>
                    {listed.length === 0 ? (
                        <p className="home-box home-panel-note">
                            {searching
                                ? "No sheets match those words. Tap Ask AI to search by what the work is."
                                : "No protocol sheets found."}
                        </p>
                    ) : (
                        <ul className="home-panel">
                            {listed.map((s) => (
                                <SheetOption key={s.sheetId} sheet={s} selected={isSelected(s.sheetId)} onPick={pick} />
                            ))}
                        </ul>
                    )}
                </section>
            )}

            {listReady && !searching && otherSheets.length > 0 && (
                <section aria-labelledby="all-sheets-heading">
                    <h2 id="all-sheets-heading" className="home-section-heading">
                        All sheets ({otherSheets.length})
                    </h2>
                    <ul className="home-panel">
                        {otherSheets.map((s) => (
                            <SheetOption key={s.sheetId} sheet={s} selected={isSelected(s.sheetId)} onPick={pick} />
                        ))}
                    </ul>
                </section>
            )}

            <div className="home-panel">
                <Link className="home-card" to="/pdfs">
                    <span className="home-card-text">
                        <span className="home-card-title">Protocol sheet PDFs</span>
                        <span className="home-card-desc">Open the original sheets as PDF</span>
                    </span>
                    <span className="home-arrow" aria-hidden="true" />
                </Link>
            </div>
        </div>
    );
}
