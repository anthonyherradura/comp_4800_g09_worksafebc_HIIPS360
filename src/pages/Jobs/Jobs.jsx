import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LockIcon } from "../../components/ReadOnlyBanner";
import { useJobs } from "../../context/JobContext";
import { isFinished } from "../../data/finishCheck";
import { cleanLabel, planNewJob } from "../../data/jobVisits";
import { formatDay, formatFullDay, formatWhen } from "../../data/recentSheets";
import "./Jobs.css";

// Job selection: its own page (no nav bar), shown after sign-in and from the header's job button.
// Picking or creating a job leads to protocol selection (/home). A finished inspection (FEAT-7) opens on its
// Hazards page instead, read-only; finished sites are listed on their own and can't be deleted.
const JOB_START_ROUTE = "/home";
const FINISHED_ROUTE = "/hazard";
const routeFor = (job) => (isFinished(job) ? FINISHED_ROUTE : JOB_START_ROUTE);

const PlusIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
);

const SearchIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <path d="m15.5 15.5 5 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
);

// Every word typed must appear in the job's name or address, in any order or case
const matchesSearch = (label, query) => {
    const text = label.toLowerCase();
    return query.toLowerCase().split(/\s+/).filter(Boolean).every((word) => text.includes(word));
};

const CloseIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 5l14 14M19 5 5 19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
);

// "Started Nov 20 · Last opened 2 days ago", or "Started Oct 14 · Finished Oct 14"
const jobDates = (job) =>
    [
        job.createdAt && `Started ${formatDay(job.createdAt)}`,
        isFinished(job) ? `Finished ${formatWhen(job.finishedAt)}` : job.lastOpenedAt && `Last opened ${formatWhen(job.lastOpenedAt)}`,
    ]
        .filter(Boolean)
        .join(" · ");

export default function JobsPage() {
    const { jobs, currentJob, addJob, openJob, deleteJob } = useJobs();
    const [label, setLabel] = useState("");
    const [search, setSearch] = useState("");
    const [busy, setBusy] = useState(false); // waiting for the server, so a double tap doesn't send twice
    const navigate = useNavigate();
    const shown = jobs.filter((job) => matchesSearch(job.label, search));
    const open = shown.filter((job) => !isFinished(job));
    const finished = shown.filter(isFinished);

    // Typing a finished site's name: say that adding it starts a new, numbered visit (src/data/jobVisits.js,
    // the same rule the server follows), and offer the finished one instead
    const typed = cleanLabel(label);
    const plan = typed ? planNewJob(typed, jobs) : null;
    const nextVisit = plan?.create && plan.after ? plan : null;

    async function handleAdd(e) {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        const job = await addJob(label);
        setBusy(false);
        if (!job) return;
        setLabel("");
        navigate(routeFor(job));
    }

    async function handleOpen(id) {
        if (busy) return;
        setBusy(true);
        const opened = await openJob(id);
        setBusy(false);
        if (!opened) return;
        setLabel("");
        navigate(routeFor(opened));
    }

    function handleDelete(job) {
        if (window.confirm(`Delete "${job.label}" with its hazards and photos? This can't be undone.`)) deleteJob(job.id);
    }

    const jobRow = (job) => {
        const current = job.id === currentJob?.id;
        const done = isFinished(job);
        return (
            <li className={`jobs-row${nextVisit?.after.id === job.id ? " is-match" : ""}`} key={job.id}>
                <button
                    type="button"
                    className={`jobs-item${current ? " is-current" : ""}`}
                    onClick={() => handleOpen(job.id)}
                    aria-current={current ? "true" : undefined}
                >
                    <span className="jobs-label">
                        {done && (
                            <span className="jobs-lock">
                                <LockIcon />
                            </span>
                        )}
                        {job.label}
                    </span>
                    <span className="jobs-meta">{jobDates(job)}</span>
                </button>
                {/* A finished inspection can't be deleted (the server refuses too) */}
                {!done && (
                    <button
                        type="button"
                        className="jobs-remove"
                        onClick={() => handleDelete(job)}
                        aria-label={`Remove ${job.label}`}
                    >
                        <CloseIcon />
                    </button>
                )}
            </li>
        );
    };

    return (
        <div className="jobs-page">
            <h1 className="jobs-title">Select a job site</h1>

            <form className="jobs-panel jobs-add" onSubmit={handleAdd}>
                <label className="jobs-visually-hidden" htmlFor="job-label">
                    Job site name or address
                </label>
                <input
                    id="job-label"
                    className="jobs-input"
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Job site name or address"
                    autoComplete="off"
                    enterKeyHint="done"
                    aria-describedby={nextVisit ? "jobs-next-visit" : undefined}
                />
                <button
                    type="submit"
                    className="jobs-add-btn"
                    aria-label={nextVisit ? `Create job ${nextVisit.create}` : "Create job"}
                    disabled={!label.trim() || busy}
                >
                    <PlusIcon />
                </button>
            </form>

            {nextVisit && (
                <div id="jobs-next-visit" className="jobs-note" role="status">
                    <p>
                        <strong>{nextVisit.after.label}</strong> was finished on {formatFullDay(nextVisit.after.finishedAt)}.
                        Adding it starts a new inspection: <strong>{nextVisit.create}</strong>.
                    </p>
                    <button type="button" className="jobs-note-btn" onClick={() => handleOpen(nextVisit.after.id)}>
                        Open the finished one instead
                    </button>
                </div>
            )}

            <section className="jobs-panel jobs-list-panel" aria-labelledby="jobs-heading">
                <h2 id="jobs-heading" className="jobs-visually-hidden">Your job sites</h2>

                {jobs.length > 0 && (
                    <div className="jobs-search" role="search">
                        <label className="jobs-visually-hidden" htmlFor="job-search">
                            Search your job sites
                        </label>
                        <span className="jobs-search-icon">
                            <SearchIcon />
                        </span>
                        <input
                            id="job-search"
                            className="jobs-input jobs-search-input"
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search your job sites"
                            autoComplete="off"
                            enterKeyHint="search"
                        />
                    </div>
                )}

                {search.trim() && shown.length > 0 && (
                    <p className="jobs-subtitle jobs-search-count" aria-live="polite">
                        {shown.length} of {jobs.length} job sites
                    </p>
                )}

                {jobs.length === 0 ? (
                    <p className="jobs-empty">
                        No job sites yet. Enter a site name or address above and tap + to create one.
                    </p>
                ) : shown.length === 0 ? (
                    <p className="jobs-empty" aria-live="polite">
                        No job sites match “{search.trim()}”. Type it in the box above and tap + to create it.
                    </p>
                ) : (
                    <>
                        {open.length > 0 && (
                            <div className="jobs-group">
                                {/* Only worth a heading next to the Finished group */}
                                {finished.length > 0 && (
                                    <h3 id="jobs-open-heading" className="jobs-subtitle">
                                        In progress
                                    </h3>
                                )}
                                <ul className="jobs-list" aria-labelledby={finished.length > 0 ? "jobs-open-heading" : undefined}>
                                    {open.map(jobRow)}
                                </ul>
                            </div>
                        )}
                        {finished.length > 0 && (
                            <div className="jobs-group">
                                <h3 id="jobs-finished-heading" className="jobs-subtitle">
                                    Finished
                                </h3>
                                <ul className="jobs-list" aria-labelledby="jobs-finished-heading">
                                    {finished.map(jobRow)}
                                </ul>
                            </div>
                        )}
                    </>
                )}
            </section>

            {jobs.length > 0 && (
                <p className="jobs-hint">
                    {jobs.some(isFinished)
                        ? "Tap a site to open it. Finished sites open read-only and can't be deleted. Adding a finished site's name again starts a new, numbered visit."
                        : "Tap a site to open it. × deletes the site with its hazards and photos."}
                </p>
            )}
        </div>
    );
}
