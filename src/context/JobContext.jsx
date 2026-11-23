import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import useAuth from "../auth/useAuth";
import { api, createSaveQueue, isTemporaryFailure } from "../data/api";
import { isFinished } from "../data/finishCheck";

const JobContext = createContext(null);

// Job sites are saved in MongoDB through the API (server/routes/jobs.js), so each officer sees only their own,
// on any device. `jobs` is the list (newest opened first, no hazards); `currentJob` is the full first one,
// with its sheet, checklist, visit notes and hazards. HazardContext reads and changes the hazards through here.
//
// Saves that wait for typing to pause share one queue (`saveQueue`), and every other change flushes it first,
// so changes reach the server in the order the officer made them.
//
// A finished inspection (FEAT-7, `isFinished`) is read-only: the pages hide what would change it, the change
// functions here do nothing for it, and the server answers 423 if a change gets there anyway (finished on
// another device, say). A 423 reloads the current job, so the pages turn read-only.

const NOT_ALL_SAVED = "Some changes haven't been saved yet. Check your connection, then try again.";

const summary = ({ id, label, sheetIds, lastOpenedAt, finishedAt, createdAt, updatedAt }) => ({
    id, label, sheetIds, lastOpenedAt, finishedAt: finishedAt ?? null, createdAt, updatedAt,
});
const newestFirst = (list) => [...list].sort((a, b) => String(b.lastOpenedAt).localeCompare(String(a.lastOpenedAt)));

export function JobProvider({ children }) {
    const { user, logout } = useAuth();
    const email = user?.email?.toLowerCase();

    const [jobs, setJobs] = useState([]);
    const [currentJob, setCurrentJob] = useState(null);
    const [status, setStatus] = useState("loading"); // loading | ready | error
    const [saveError, setSaveError] = useState("");
    const [checklistDrafts, setChecklistDrafts] = useState({}); // itemId -> status not yet confirmed by the server
    const [notesDrafts, setNotesDrafts] = useState({}); // job id -> visit notes not yet confirmed by the server
    const saveQueue = useMemo(() => createSaveQueue(), []);
    const inFlight = useRef(new Set()); // changes sent but not answered yet, so finishing can wait for them
    const loadId = useRef(0);
    const logoutRef = useRef(logout);
    const reloadRef = useRef(null);
    useEffect(() => {
        logoutRef.current = logout;
    }, [logout]);

    const reportError = useCallback((err) => {
        if (err?.status === 401) {
            logoutRef.current(); // the session ran out: back to sign in
            return;
        }
        setSaveError(err?.message || "Couldn't save. Try again.");
        if (err?.status === 423) reloadRef.current?.(); // finished somewhere else: show it read-only
    }, []);

    // The server's copy of the current job replaces ours, and the list entry follows it
    const replaceCurrentJob = useCallback((job) => {
        setCurrentJob(job);
        if (job) setJobs((list) => newestFirst([summary(job), ...list.filter((j) => j.id !== job.id)]));
    }, []);

    // Takes the answer to a save from the queue. A retry can land after the officer has opened another job,
    // so this never changes which job is current. The error message goes once nothing is left to save.
    const confirmSavedJob = useCallback(
        (job) => {
            setCurrentJob((current) => (current?.id === job.id ? job : current));
            setJobs((list) => list.map((j) => (j.id === job.id ? summary(job) : j)));
            if (!saveQueue.hasWaiting()) setSaveError("");
        },
        [saveQueue],
    );

    // Reads the job list and the current job. Ignores the answer if a newer load started meanwhile.
    const load = useCallback(() => {
        const id = ++loadId.current;
        const fresh = () => id === loadId.current;
        return api("GET", "/jobs")
            .then(async ({ jobs: list }) => {
                const full = list[0] ? (await api("GET", `/jobs/${list[0].id}`)).job : null;
                if (!fresh()) return;
                setJobs(list);
                setCurrentJob(full);
                setStatus("ready");
            })
            .catch((err) => {
                if (!fresh()) return;
                if (err.status === 401) return reportError(err);
                setSaveError(err.message);
                setStatus("error");
            });
    }, [reportError]);

    // Start again whenever a different officer signs in (adjust state during render, per React docs)
    const [loadedFor, setLoadedFor] = useState(email);
    if (loadedFor !== email) {
        setLoadedFor(email);
        setJobs([]);
        setCurrentJob(null);
        setChecklistDrafts({});
        setNotesDrafts({});
        setStatus("loading");
    }
    useEffect(() => {
        if (email) load();
    }, [email, load]);

    // Send waiting saves when the page is hidden or closed
    useEffect(() => {
        const flush = () => saveQueue.flush();
        window.addEventListener("pagehide", flush);
        document.addEventListener("visibilitychange", flush);
        return () => {
            window.removeEventListener("pagehide", flush);
            document.removeEventListener("visibilitychange", flush);
            saveQueue.clear(); // signed out: a retry must not run in the next officer's session
        };
    }, [saveQueue]);

    // Sign out: sends what the officer typed first (waiting at most a few seconds), so it is saved to their
    // account before the session ends and nothing of theirs is left for the next officer on the device (B-13)
    const signOut = useCallback(async () => {
        await Promise.race([saveQueue.flush(), new Promise((resolve) => setTimeout(resolve, 5000))]);
        saveQueue.clear();
        await logoutRef.current();
    }, [saveQueue]);

    const reloadCurrentJob = useCallback(async () => {
        if (!currentJob) return;
        try {
            replaceCurrentJob((await api("GET", `/jobs/${currentJob.id}`)).job);
        } catch (err) {
            reportError(err);
        }
    }, [currentJob, replaceCurrentJob, reportError]);
    useEffect(() => {
        reloadRef.current = reloadCurrentJob;
    }, [reloadCurrentJob]);

    // Runs a change after everything waiting has been saved. Resolves to the change's result, or null if it failed.
    const change = useCallback(
        (run) => {
            const done = (async () => {
                await saveQueue.flush();
                try {
                    const result = await run();
                    if (!saveQueue.hasWaiting()) setSaveError("");
                    return result;
                } catch (err) {
                    reportError(err);
                    return null;
                }
            })();
            inFlight.current.add(done);
            const settled = () => inFlight.current.delete(done);
            done.then(settled, settled);
            return done;
        },
        [saveQueue, reportError],
    );

    // Whether a job in the list (or the current one) is finished, so a change to it does nothing
    const finished = (id) => isFinished(currentJob?.id === id ? currentJob : jobs.find((j) => j.id === id));

    // `label` is whatever the officer typed: a site name ("Oak St. tower") or an address ("123 Main St").
    // Adding a site again (any case) reopens its visit that isn't finished; when every visit is finished the
    // server starts a numbered one, "Oak St. tower (2)" (src/data/jobVisits.js). Resolves to the job, or null.
    const addJob = (label) => {
        if (!label.trim()) return Promise.resolve(null);
        return change(async () => {
            const { job } = await api("POST", "/jobs", { label });
            replaceCurrentJob(job);
            return job;
        });
    };

    // Makes a job current, finished or not. Resolves to the job, or null.
    const openJob = (id) =>
        change(async () => {
            const { job } = await api("POST", `/jobs/${id}/open`);
            replaceCurrentJob(job);
            return job;
        });

    // Sends everything the officer did: typing that waits for a pause and changes still on their way.
    // A change can start another (a new hazard, then its photo), so this looks again until nothing is left.
    // Resolves false if something couldn't be saved yet (it waits to be tried again).
    const sendEverything = async () => {
        for (let round = 0; round < 3; round++) {
            await saveQueue.flush();
            await Promise.allSettled([...inFlight.current]);
            if (!saveQueue.hasWaiting() && !inFlight.current.size) return true;
        }
        return false;
    };

    // Finishes the inspection for good (FEAT-7), after everything typed has reached the server, so nothing is lost
    // and the server checks what the officer sees. Resolves to { ok: true }, or { ok: false, error } to show
    // where the officer pressed Finish; the job is reloaded then, so the review shows what the server has.
    const finishJob = async (id) => {
        if (!(await sendEverything())) return { ok: false, error: NOT_ALL_SAVED };
        try {
            const { job } = await api("POST", `/jobs/${id}/finish`);
            replaceCurrentJob(job);
            setSaveError("");
            return { ok: true };
        } catch (err) {
            if (err.status === 401) {
                reportError(err);
                return { ok: false, error: "" };
            }
            reloadCurrentJob();
            return { ok: false, error: err.message };
        }
    };

    // Deletes the job site with its hazards and photos. A finished one can't be deleted.
    const deleteJob = (id) => {
        if (finished(id)) return Promise.resolve(null);
        return change(async () => {
            await api("DELETE", `/jobs/${id}`);
            const rest = jobs.filter((j) => j.id !== id);
            setJobs(rest);
            if (currentJob?.id === id) setCurrentJob(rest[0] ? (await api("GET", `/jobs/${rest[0].id}`)).job : null);
            return true;
        });
    };

    // Sets the job's protocol sheets, in order ([] clears them). The server syncs the hazards in the same save.
    const setJobSheets = (id, sheetIds) => {
        if (finished(id)) return Promise.resolve(null);
        return change(async () => {
            const { job } = await api("PUT", `/jobs/${id}/sheets`, { sheetIds });
            replaceCurrentJob(job);
            return job.id;
        });
    };

    // Planning checklist: item id (from the sheet) -> "pending" | "ready" | "not-applicable".
    // Shown at once; the server's answer only confirms it.
    const setChecklistStatus = (id, itemId, status) => {
        if (finished(id)) return;
        setChecklistDrafts((d) => ({ ...d, [itemId]: status }));
        change(async () => {
            const { job } = await api("PUT", `/jobs/${id}/checklist/${encodeURIComponent(itemId)}`, { status });
            replaceCurrentJob(job);
            return job.id;
        }).then((ok) => {
            setChecklistDrafts((d) => {
                if (d[itemId] !== status) return d; // a newer tap is on its way
                const next = { ...d };
                delete next[itemId];
                return next;
            });
            if (!ok) reloadCurrentJob();
        });
    };

    // Drops a notes draft the server now has (unless it was typed over again since)
    const settleNotes = (id, visitNotes) =>
        setNotesDrafts((d) => {
            if (d[id] !== visitNotes) return d;
            const next = { ...d };
            delete next[id];
            return next;
        });

    // Visit notes show at once and save once typing pauses. If the save fails they stay on screen.
    const saveVisitNotes = (id, visitNotes) => {
        if (finished(id)) return;
        setNotesDrafts((d) => ({ ...d, [id]: visitNotes }));
        const key = `notes:${id}`;
        const save = () =>
            api("PUT", `/jobs/${id}/visit-notes`, { visitNotes }, { keepalive: true })
                .then(({ job }) => {
                    confirmSavedJob(job);
                    settleNotes(id, visitNotes);
                })
                .catch((err) => {
                    // The job is gone (404) or was finished somewhere else (423): show what the server has
                    if (err.status === 404 || err.status === 423) settleNotes(id, visitNotes);
                    reportError(err);
                    if (isTemporaryFailure(err)) saveQueue.retryLater(key, save);
                });
        saveQueue.schedule(key, save);
    };

    // What the pages see: the server's job with checklist taps and visit notes that are still on their way
    const shownJob = useMemo(() => {
        if (!currentJob) return currentJob;
        const notes = notesDrafts[currentJob.id];
        if (!Object.keys(checklistDrafts).length && notes === undefined) return currentJob;
        const checklist = { ...currentJob.checklist };
        for (const [itemId, s] of Object.entries(checklistDrafts)) {
            if (s === "pending") delete checklist[itemId];
            else checklist[itemId] = s;
        }
        return { ...currentJob, checklist, visitNotes: notes ?? currentJob.visitNotes };
    }, [currentJob, checklistDrafts, notesDrafts]);

    const value = {
        jobs,
        currentJob: shownJob,
        isFinished: isFinished(currentJob), // the current inspection is finished, so read-only
        addJob,
        openJob,
        finishJob,
        deleteJob,
        setJobSheets,
        setChecklistStatus,
        saveVisitNotes,
        saveError,
        clearSaveError: () => setSaveError(""),
        signOut,
        // for HazardContext
        saveQueue,
        change,
        replaceCurrentJob,
        confirmSavedJob,
        reloadCurrentJob,
        reportError,
    };

    if (status !== "ready") {
        return (
            <div className="load-state" role={status === "error" ? "alert" : "status"}>
                {status === "loading" ? (
                    <p>Loading your job sites…</p>
                ) : (
                    <>
                        <p>{saveError || "Couldn't load your job sites."}</p>
                        <button type="button" className="btn btn-orange" onClick={() => { setSaveError(""); setStatus("loading"); load(); }}>
                            Try again
                        </button>
                    </>
                )}
            </div>
        );
    }

    return <JobContext.Provider value={value}>{children}</JobContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useJobs() {
    const ctx = useContext(JobContext);
    if (!ctx) throw new Error("useJobs must be used inside <JobProvider>");
    return ctx;
}
