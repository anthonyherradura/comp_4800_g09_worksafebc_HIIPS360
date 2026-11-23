import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LockIcon } from "../../components/ReadOnlyBanner";
import { useHazards } from "../../context/HazardContext";
import { useJobs } from "../../context/JobContext";
import { finishSummary } from "../../data/finishCheck";
import { getJobChecklist, sheetName } from "../../data/sheets";

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const DoneIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="fi-ok">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <path d="m8 12.5 2.75 2.75L16.5 9.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const LeftIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="fi-warn">
        <path d="M12 3 2.5 20h19L12 3Z" fill="currentColor" />
        <path d="M12 9.5v5" stroke="var(--wsbc-white)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="17.2" r="1.1" fill="var(--wsbc-white)" />
    </svg>
);

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// "8 reviewed, 3 not applicable", leaving out a part that is 0
const hazardWords = ({ total, reviewed, notApplicable }) =>
    total ? [reviewed && `${reviewed} reviewed`, notApplicable && `${notApplicable} not applicable`].filter(Boolean).join(", ") : "None logged";

// Finish inspection (FEAT-7). An outline button on the Hazards page (Log hazard is the page's one primary), then:
// 1. a review sheet, always: what the inspection holds, and what still stops it being finished;
// 2. "Finish this inspection?", because it can't be undone;
// 3. the server finishes it, and the pages turn read-only.
// The rule is the server's too (src/data/finishCheck.js). onShowUnaddressed opens the Unaddressed tab.
export default function FinishInspection({ onShowUnaddressed, onFinished }) {
    const { currentJob, finishJob } = useJobs();
    const { hazards } = useHazards();
    const navigate = useNavigate();
    const [step, setStep] = useState(null); // null | "review" | "confirm"
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const stepRef = useRef(step);
    const reviewRef = useRef(null);
    const confirmRef = useRef(null);
    const reviewTitleRef = useRef(null);
    const cancelRef = useRef(null);
    const id = useId();

    const sheetIds = currentJob?.sheetIds ?? [];
    const summary = finishSummary(
        { hazards, checklist: currentJob?.checklist, visitNotes: currentJob?.visitNotes },
        getJobChecklist(sheetIds),
    );
    const { hazards: h, checklist } = summary;
    const things = (h.unaddressed ? 1 : 0) + (checklist.toReview ? 1 : 0);

    // The dialogs follow `step`. Each closes before the next opens, so focus goes back where it came from.
    useEffect(() => {
        stepRef.current = step;
        const review = reviewRef.current;
        const confirm = confirmRef.current;
        if (step !== "review" && review?.open) review.close();
        if (step !== "confirm" && confirm?.open) confirm.close();
        if (step === "review" && review && !review.open) {
            review.showModal();
            reviewTitleRef.current?.focus(); // read the title first, not a button
        }
        if (step === "confirm" && confirm && !confirm.open) {
            confirm.showModal();
            cancelRef.current?.focus(); // Enter right away must not lock the inspection
        }
    }, [step]);

    const open = () => {
        setError("");
        setStep("review");
    };
    const close = () => !busy && setStep(null);

    // Closes the review now, before going somewhere else on the page, so the browser putting focus back on
    // the Finish inspection button happens first and the page can then move focus where it wants
    const leaveTo = (next) => {
        stepRef.current = null;
        reviewRef.current?.close();
        setStep(null);
        next?.();
    };

    const handleFinish = async () => {
        if (busy) return;
        setBusy(true);
        const result = await finishJob(currentJob.id);
        setBusy(false);
        if (result.ok) {
            setStep(null);
            onFinished?.();
            return;
        }
        setError(result.error);
        setStep(result.error ? "review" : null); // no message: signed out
    };

    // Escape or a tap outside the sheet closes it. The browser closes a dialog on Escape by itself, so the
    // close event brings `step` up to date; one closed by the effect above already matches.
    const dialogProps = (which, onEscape) => ({
        onCancel: (e) => busy && e.preventDefault(),
        onClose: () => stepRef.current === which && setStep(onEscape),
    });

    return (
        <>
            <button type="button" className="hl-tool hl-finish" onClick={open}>
                <CheckIcon />
                Finish inspection
            </button>

            <dialog
                ref={reviewRef}
                className="fi-dialog fi-sheet"
                aria-labelledby={`${id}-review`}
                aria-describedby={`${id}-review-about`}
                {...dialogProps("review", null)}
                onClick={(e) => e.target === e.currentTarget && close()}
            >
                <div className="fi-body">
                    <div className="fi-handle" aria-hidden="true" />
                    <h2 id={`${id}-review`} ref={reviewTitleRef} tabIndex={-1}>
                        Review before you finish
                    </h2>

                    {summary.canFinish ? (
                        <p id={`${id}-review-about`} className="fi-lead">
                            Check this is everything from today's visit.
                        </p>
                    ) : (
                        <div id={`${id}-review-about`} className="fi-left">
                            <p className="fi-left-title">{count(things, "thing", "things")} to fix before you finish</p>
                            {h.unaddressed > 0 && (
                                <div className="fi-left-item">
                                    <p>
                                        {h.unaddressed === 1
                                            ? "1 hazard is still Unaddressed. Add a photo, or mark it Not applicable."
                                            : `${h.unaddressed} hazards are still Unaddressed. Add a photo, or mark each one Not applicable.`}
                                    </p>
                                    <button type="button" className="fi-link" onClick={() => leaveTo(onShowUnaddressed)}>
                                        Show unaddressed hazards
                                    </button>
                                </div>
                            )}
                            {checklist.toReview > 0 && (
                                <div className="fi-left-item">
                                    <p>{count(checklist.toReview, "checklist item is", "checklist items are")} still To review.</p>
                                    <button type="button" className="fi-link" onClick={() => leaveTo(() => navigate("/planning"))}>
                                        Go to Planning
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <dl className="fi-rows">
                        {summary.canFinish && (
                            <>
                                <div className="fi-row">
                                    <dt>Job site</dt>
                                    <dd>{currentJob?.label}</dd>
                                </div>
                                <div className="fi-row">
                                    <dt>{sheetIds.length > 1 ? "Protocol sheets" : "Protocol sheet"}</dt>
                                    <dd>{sheetIds.length ? sheetIds.map(sheetName).join(", ") : "None picked"}</dd>
                                </div>
                            </>
                        )}
                        <div className="fi-row">
                            <dt>Checklist</dt>
                            <dd>
                                {checklist.total ? (
                                    <>
                                        {checklist.toReview ? <LeftIcon /> : <DoneIcon />}
                                        {checklist.done} of {checklist.total} done
                                    </>
                                ) : (
                                    "No items"
                                )}
                            </dd>
                        </div>
                        {summary.canFinish && (
                            <div className="fi-row">
                                <dt>Hazards</dt>
                                <dd>
                                    {h.total > 0 && <DoneIcon />}
                                    {hazardWords(h)}
                                </dd>
                            </div>
                        )}
                        <div className="fi-row">
                            <dt>Unaddressed</dt>
                            <dd>
                                {h.unaddressed ? <LeftIcon /> : <DoneIcon />}
                                {h.unaddressed ? count(h.unaddressed, "hazard", "hazards") : "None"}
                            </dd>
                        </div>
                        <div className="fi-row">
                            <dt>Visit notes</dt>
                            <dd>{summary.hasVisitNotes ? "Added" : "None (optional)"}</dd>
                        </div>
                    </dl>

                    {error && (
                        <p className="hz-error fi-error" role="alert">
                            {error}
                        </p>
                    )}

                    <button
                        type="button"
                        className="fi-primary"
                        disabled={!summary.canFinish}
                        aria-describedby={summary.canFinish ? undefined : `${id}-fix`}
                        onClick={() => setStep("confirm")}
                    >
                        Finish inspection
                    </button>
                    {!summary.canFinish && (
                        <p id={`${id}-fix`} className="fi-helper">
                            Fix the items above to finish.
                        </p>
                    )}
                    <button type="button" className="fi-secondary" onClick={close}>
                        Keep editing
                    </button>
                </div>
            </dialog>

            <dialog
                ref={confirmRef}
                role="alertdialog"
                className="fi-dialog fi-confirm"
                aria-labelledby={`${id}-confirm`}
                aria-describedby={`${id}-confirm-about`}
                {...dialogProps("confirm", "review")}
            >
                <div className="fi-body">
                    <span className="fi-lock">
                        <LockIcon />
                    </span>
                    <h2 id={`${id}-confirm`}>Finish this inspection?</h2>
                    <div id={`${id}-confirm-about`} className="fi-about">
                        <p>
                            After you finish, this inspection is read-only. You can still open it and download its PDF,
                            but no one can change its hazards, photos, comments, checklist or visit notes.
                        </p>
                        <p className="fi-strong">This can't be undone.</p>
                    </div>
                    {/* aria-disabled, not disabled, while finishing: a disabled button would drop keyboard focus */}
                    <button type="button" className="fi-primary" onClick={handleFinish} aria-disabled={busy || undefined}>
                        {busy ? "Finishing…" : "Finish and lock"}
                    </button>
                    <button
                        type="button"
                        className="fi-secondary"
                        ref={cancelRef}
                        onClick={() => !busy && setStep("review")}
                        aria-disabled={busy || undefined}
                    >
                        Cancel
                    </button>
                </div>
            </dialog>
        </>
    );
}
