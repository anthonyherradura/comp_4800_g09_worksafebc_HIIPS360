// Job sites, their hazards and their photos. Every route needs a signed-in officer, and every query includes
// that officer's userId, so another officer's job, hazard or photo answers 404 exactly like one that doesn't exist.
// Changes answer with the whole updated job ({ job }), so the app can show what was actually saved.
//
//   GET    /api/jobs                                   -> { jobs }   my jobs, most recently opened first (no hazards)
//   POST   /api/jobs                 { label }         -> { job }    201 new, or 200 when that site has a visit that
//                                                                    isn't finished (reopened). A site whose visits are
//                                                                    all finished gets a new numbered one: "Oak St (2)"
//   GET    /api/jobs/:jobId                            -> { job }
//   POST   /api/jobs/:jobId/open                       -> { job }    makes it the current job (finished ones too)
//   POST   /api/jobs/:jobId/finish                     -> { job }    finishes the inspection; 409 while anything is left
//   DELETE /api/jobs/:jobId                            -> 204        with its hazards and photos
//   PUT    /api/jobs/:jobId/sheets   { sheetIds }      -> { job }    sets the job's sheets (in order, [] clears) and syncs the hazards
//   PUT    /api/jobs/:jobId/checklist/:itemId { status } -> { job }  "pending" | "ready" | "not-applicable"
//   PUT    /api/jobs/:jobId/visit-notes { visitNotes } -> { job }
//   POST   /api/jobs/:jobId/hazards  { name, comment? } -> 201 { job, hazardId }
//   PATCH  /api/jobs/:jobId/hazards/:hazardId { comment?, notApplicable? } -> { job }
//   DELETE /api/jobs/:jobId/hazards/:hazardId          -> { job }    with its photos; officer hazards only (403 for sheet)
//   POST   /api/jobs/:jobId/hazards/:hazardId/photos (multipart, field "photos", 1 or more) -> 201 { job }
//   DELETE /api/jobs/:jobId/hazards/:hazardId/photos/:photoId -> { job }
//
// A finished inspection is read-only (FEAT-7): DELETE and every PUT, PATCH and hazard or photo POST above answer
// 423 for it and change nothing. Reading it, opening it and its photos still work.
import { Router } from "express";
import mongoose from "mongoose";
import multer from "multer";
import requireAuth from "../middleware/requireAuth.js";
import Job, { LABEL_COLLATION, jobSheetIds } from "../models/Job.js";
import Photo from "../models/Photo.js";
import { CHECKLIST_STATUSES, LIMITS, PHOTO_TYPES } from "../db/limits.js";
import { getJobChecklist, getSheetHazards, sheetExists } from "../services/sheetCatalog.js";
import { syncSheetHazards } from "../../src/data/syncSheetHazards.js";
import { finishSummary, whatsLeft } from "../../src/data/finishCheck.js";
import { cleanLabel, planNewJob } from "../../src/data/jobVisits.js";
import { checkIds, notFound } from "./ids.js";

const { ObjectId } = mongoose.Types;
const DUPLICATE_KEY = 11000;
const SYNC_ATTEMPTS = 3;

const router = Router();
router.use(requireAuth);
checkIds(router, ["jobId", "hazardId", "photoId"]);

const bad = (res, error) => res.status(400).json({ error });
const sendJob = (res, job, status = 200, extra = {}) => res.status(status).json({ job: job.toJSON(), ...extra });
const mine = (req) => ({ _id: req.params.jobId, userId: req.userId });
const UPDATE = { returnDocument: "after", runValidators: true };
const busy = (res) => res.status(409).json({ error: "This job is being changed somewhere else. Try again." });

// ---------- finished inspections are read-only ----------

// Every change includes this in its filter, so it can't land on a finished job, even one finished while the
// request was on its way. null also matches jobs saved before finishing existed (they have no finishedAt).
const OPEN = { finishedAt: null };
const locked = (res, error = "This inspection is finished, so it can't be changed.") => res.status(423).json({ error });

// After a change matched nothing: the job's finishedAt, or null when the job isn't this officer's (or is gone)
const jobState = (req) => Job.findOne(mine(req)).select("finishedAt").lean();

// A change matched nothing: a finished job answers 423, anything else 404 as before
async function refuse(req, res, what) {
    const job = await jobState(req);
    return job?.finishedAt ? locked(res) : notFound(res, what);
}

// ---------- jobs ----------

router.get("/", async (req, res) => {
    const jobs = await Job.find({ userId: req.userId })
        .sort({ lastOpenedAt: -1 })
        .select("label sheetIds sheetId lastOpenedAt finishedAt createdAt updatedAt");
    res.json({ jobs: jobs.map((j) => j.toJSON()) });
});

router.post("/", async (req, res) => {
    const label = cleanLabel(req.body?.label);
    if (!label) return bad(res, "Enter a job site name or address.");
    if (label.length > LIMITS.labelChars) return bad(res, `Keep the job site name under ${LIMITS.labelChars} characters.`);

    // Reopen the site's visit that isn't finished, or create the site (the next numbered visit when every one is
    // finished). The rule is in src/data/jobVisits.js. Two requests at once can race to insert; the unique index
    // refuses the second, and planning again finds the first.
    for (let attempt = 1; attempt <= SYNC_ATTEMPTS; attempt++) {
        const jobs = await Job.find({ userId: req.userId }).select("label finishedAt lastOpenedAt").lean();
        const plan = planNewJob(label, jobs);

        if (plan.reopen) {
            const job = await Job.findOneAndUpdate(
                { _id: plan.reopen._id, userId: req.userId, ...OPEN },
                { $set: { lastOpenedAt: new Date() } },
                UPDATE,
            );
            if (job) return sendJob(res, job);
            continue; // finished or deleted meanwhile: plan again
        }

        if (plan.create.length > LIMITS.labelChars) return bad(res, `Keep the job site name under ${LIMITS.labelChars} characters.`);
        try {
            const result = await Job.findOneAndUpdate(
                { userId: req.userId, label: plan.create },
                { $set: { lastOpenedAt: new Date() } },
                { ...UPDATE, upsert: true, setDefaultsOnInsert: true, collation: LABEL_COLLATION, includeResultMetadata: true },
            );
            return sendJob(res, result.value, result.lastErrorObject?.updatedExisting ? 200 : 201);
        } catch (err) {
            if (err.code !== DUPLICATE_KEY) throw err;
        }
    }
    busy(res);
});

router.get("/:jobId", async (req, res) => {
    const job = await Job.findOne(mine(req));
    return job ? sendJob(res, job) : notFound(res, "Job");
});

router.post("/:jobId/open", async (req, res) => {
    const job = await Job.findOneAndUpdate(mine(req), { $set: { lastOpenedAt: new Date() } }, UPDATE);
    return job ? sendJob(res, job) : notFound(res, "Job");
});

// Finishes the inspection (FEAT-7), for good: only once nothing is left to do (src/data/finishCheck.js).
// The check and the write use the same copy of the job (rev), so a change that lands in between is checked again.
// Finishing a job that is already finished answers it unchanged, so a retry after a lost answer does no harm.
router.post("/:jobId/finish", async (req, res) => {
    for (let attempt = 1; attempt <= SYNC_ATTEMPTS; attempt++) {
        const job = await Job.findOne(mine(req)).lean();
        if (!job) return notFound(res, "Job");
        if (job.finishedAt) return sendJob(res, Job.hydrate(job));

        const summary = finishSummary(job, getJobChecklist(jobSheetIds(job)));
        if (!summary.canFinish) {
            return res.status(409).json({ error: `This inspection can't be finished yet: ${whatsLeft(summary).join(" and ")}.` });
        }
        const saved = await Job.findOneAndUpdate({ ...mine(req), ...OPEN, rev: job.rev }, { $set: { finishedAt: new Date() } }, UPDATE);
        if (saved) return sendJob(res, saved);
    }
    busy(res);
});

router.delete("/:jobId", async (req, res) => {
    const { deletedCount } = await Job.deleteOne({ ...mine(req), ...OPEN });
    if (!deletedCount) {
        const job = await jobState(req);
        return job?.finishedAt ? locked(res, "This inspection is finished, so it can't be deleted.") : notFound(res, "Job");
    }
    // The job is gone first, so a failure here leaves only photos nobody can reach, never a job with missing photos
    await Photo.deleteMany({ jobId: req.params.jobId });
    res.status(204).end();
});

// Sets the job's sheets: add one, remove one, or clear them all. The sheet list and the synced hazards are written
// in one update to one document, so they can't disagree. If the job changed after it was read (rev moved), the
// sync is redone on the fresh copy instead of overwriting that change.
router.put("/:jobId/sheets", async (req, res) => {
    const asked = req.body?.sheetIds;
    if (!Array.isArray(asked)) return bad(res, "Send the job's sheets as a list.");
    if (asked.some((id) => typeof id !== "string" || !sheetExists(id))) return bad(res, "That protocol sheet doesn't exist.");
    const sheetIds = [...new Set(asked)];
    if (sheetIds.length > LIMITS.sheetsPerJob) return bad(res, `A job can have at most ${LIMITS.sheetsPerJob} protocol sheets.`);
    const sheets = sheetIds.map((sheetId) => ({ sheetId, hazards: getSheetHazards(sheetId) }));

    for (let attempt = 1; attempt <= SYNC_ATTEMPTS; attempt++) {
        const job = await Job.findOne(mine(req)).lean();
        if (!job) return notFound(res, "Job");
        if (job.finishedAt) return locked(res);

        const hazards = syncSheetHazards(job.hazards, { sheets })
            .map((h) => (h._id ? h : { _id: new ObjectId(), ...h }));
        if (hazards.length > LIMITS.hazardsPerJob) {
            return bad(res, `These sheets would take the job over ${LIMITS.hazardsPerJob} hazards.`);
        }

        const update = { $set: { sheetIds, hazards }, $unset: { sheetId: "" } };
        const saved = await Job.findOneAndUpdate({ ...mine(req), ...OPEN, rev: job.rev }, update, UPDATE);
        if (saved) return sendJob(res, saved);
    }
    busy(res);
});

router.put("/:jobId/checklist/:itemId", async (req, res) => {
    const { itemId } = req.params;
    const status = req.body?.status;
    if (status !== "pending" && !CHECKLIST_STATUSES.includes(status)) return bad(res, "Unknown checklist status.");

    const job = await Job.findOne(mine(req)).select("sheetIds sheetId finishedAt").lean();
    if (!job) return notFound(res, "Job");
    if (job.finishedAt) return locked(res);
    if (!getJobChecklist(jobSheetIds(job)).some((item) => item.id === itemId)) return bad(res, "That item isn't on this job's checklist.");

    const path = `checklist.${itemId}`;
    const update = status === "pending" ? { $unset: { [path]: "" } } : { $set: { [path]: status } };
    // Only if the sheets are still the ones the item was checked against
    const sameSheets = job.sheetIds ? { sheetIds: job.sheetIds } : { sheetIds: { $exists: false }, sheetId: job.sheetId ?? null };
    const saved = await Job.findOneAndUpdate({ ...mine(req), ...OPEN, ...sameSheets }, update, UPDATE);
    if (saved) return sendJob(res, saved);
    const now = await jobState(req);
    if (!now) return notFound(res, "Job");
    if (now.finishedAt) return locked(res);
    return res.status(409).json({ error: "The protocol sheet changed. Reload and try again." });
});

router.put("/:jobId/visit-notes", async (req, res) => {
    const visitNotes = req.body?.visitNotes;
    if (typeof visitNotes !== "string") return bad(res, "Visit notes must be text.");
    if (visitNotes.length > LIMITS.visitNotesChars) return bad(res, `Keep visit notes under ${LIMITS.visitNotesChars} characters.`);

    const job = await Job.findOneAndUpdate({ ...mine(req), ...OPEN }, { $set: { visitNotes, visitNotesUpdatedAt: new Date() } }, UPDATE);
    return job ? sendJob(res, job) : refuse(req, res, "Job");
});

// ---------- hazards ----------

const hazardInJob = (req) => ({ ...mine(req), "hazards._id": req.params.hazardId });

function checkComment(comment) {
    if (comment === undefined) return null;
    if (typeof comment !== "string") return "The comment must be text.";
    if (comment.length > LIMITS.commentChars) return `Keep the comment under ${LIMITS.commentChars} characters.`;
    return null;
}

router.post("/:jobId/hazards", async (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const comment = req.body?.comment ?? "";
    if (!name) return bad(res, "The hazard needs a name.");
    if (name.length > LIMITS.hazardNameChars) return bad(res, `Keep the hazard name under ${LIMITS.hazardNameChars} characters.`);
    const commentError = checkComment(comment);
    if (commentError) return bad(res, commentError);

    const hazard = { _id: new ObjectId(), source: "officer", name, comment, notApplicable: false, photoIds: [], createdAt: new Date() };
    // The hazards.<limit - 1> condition only matches while there is room, so the limit holds even with two requests at once
    const job = await Job.findOneAndUpdate(
        { ...mine(req), ...OPEN, [`hazards.${LIMITS.hazardsPerJob - 1}`]: { $exists: false } },
        { $push: { hazards: hazard } },
        UPDATE,
    );
    if (job) return sendJob(res, job, 201, { hazardId: String(hazard._id) });
    const now = await jobState(req);
    if (!now) return notFound(res, "Job");
    if (now.finishedAt) return locked(res);
    return bad(res, `A job can have at most ${LIMITS.hazardsPerJob} hazards.`);
});

router.patch("/:jobId/hazards/:hazardId", async (req, res) => {
    const { comment, notApplicable } = req.body ?? {};
    const commentError = checkComment(comment);
    if (commentError) return bad(res, commentError);
    if (notApplicable !== undefined && typeof notApplicable !== "boolean") return bad(res, "notApplicable must be true or false.");

    const $set = {};
    if (comment !== undefined) $set["hazards.$.comment"] = comment;
    if (notApplicable !== undefined) $set["hazards.$.notApplicable"] = notApplicable;
    if (!Object.keys($set).length) return bad(res, "Nothing to change.");

    const job = await Job.findOneAndUpdate({ ...hazardInJob(req), ...OPEN }, { $set }, UPDATE);
    return job ? sendJob(res, job) : refuse(req, res, "Hazard");
});

router.delete("/:jobId/hazards/:hazardId", async (req, res) => {
    const { jobId, hazardId } = req.params;
    // Only officer-added hazards can be deleted; sheet hazards are marked not applicable instead
    const job = await Job.findOneAndUpdate(
        { ...mine(req), ...OPEN, hazards: { $elemMatch: { _id: hazardId, source: "officer" } } },
        { $pull: { hazards: { _id: hazardId } } },
        UPDATE,
    );
    if (!job) {
        if ((await jobState(req))?.finishedAt) return locked(res);
        if (await Job.exists(hazardInJob(req))) {
            return res.status(403).json({ error: "Hazards from the protocol sheet can't be deleted. Mark it not applicable instead." });
        }
        return notFound(res, "Hazard");
    }
    await Photo.deleteMany({ jobId, hazardId });
    sendJob(res, job);
});

// ---------- photos ----------

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: LIMITS.photoBytes, files: LIMITS.photosPerHazard },
    fileFilter: (req, file, cb) =>
        PHOTO_TYPES.includes(file.mimetype)
            ? cb(null, true)
            : cb(Object.assign(new Error("Unsupported photo type."), { code: "BAD_PHOTO_TYPE" })),
});

const UPLOAD_ERRORS = {
    LIMIT_FILE_SIZE: `Each photo must be under ${LIMITS.photoBytes / 1024 / 1024} MB.`,
    LIMIT_FILE_COUNT: `A hazard can have at most ${LIMITS.photosPerHazard} photos.`,
    LIMIT_UNEXPECTED_FILE: "Send the photos in the \"photos\" field.",
    BAD_PHOTO_TYPE: "Photos must be JPEG, PNG or WebP.",
};

const uploadPhotos = (req, res, next) =>
    upload.array("photos")(req, res, (err) => {
        if (!err) return next();
        if (UPLOAD_ERRORS[err.code]) return bad(res, UPLOAD_ERRORS[err.code]);
        next(err);
    });

// Order matters: the photos are saved first, then their ids go on the hazard. If that second step fails the
// photos are deleted again, so the hazard never points at a photo that doesn't exist.
router.post("/:jobId/hazards/:hazardId/photos", uploadPhotos, async (req, res) => {
    const { jobId, hazardId } = req.params;
    const files = req.files ?? [];
    if (!files.length) return bad(res, "Add at least one photo.");

    const current = await Job.findOne(hazardInJob(req), { "hazards.$": 1, finishedAt: 1 }).lean();
    if (!current) return notFound(res, "Hazard");
    // Checked before any photo is saved, so a finished inspection never gets a stray photo
    if (current.finishedAt) return locked(res);
    const room = LIMITS.photosPerHazard - current.hazards[0].photoIds.length;
    if (files.length > room) return bad(res, `A hazard can have at most ${LIMITS.photosPerHazard} photos (room for ${Math.max(room, 0)} more).`);

    const photos = await Photo.insertMany(
        files.map((f) => ({ userId: req.userId, jobId, hazardId, contentType: f.mimetype, data: f.buffer, size: f.size })),
    );
    const ids = photos.map((p) => p._id);
    try {
        // Still room, counted again in the same write
        const job = await Job.findOneAndUpdate(
            { ...mine(req), ...OPEN, hazards: { $elemMatch: { _id: hazardId, [`photoIds.${LIMITS.photosPerHazard - ids.length}`]: { $exists: false } } } },
            { $push: { "hazards.$.photoIds": { $each: ids } } },
            UPDATE,
        );
        if (job) return sendJob(res, job, 201);
    } catch (err) {
        await Photo.deleteMany({ _id: { $in: ids } });
        throw err;
    }
    await Photo.deleteMany({ _id: { $in: ids } });
    if ((await jobState(req))?.finishedAt) return locked(res);
    res.status(409).json({ error: "The hazard was deleted or filled up while uploading. Try again." });
});

router.delete("/:jobId/hazards/:hazardId/photos/:photoId", async (req, res) => {
    const { jobId, hazardId, photoId } = req.params;
    // The id comes off the hazard first, so a failure here leaves an unreachable photo, never a broken image
    const job = await Job.findOneAndUpdate({ ...hazardInJob(req), ...OPEN }, { $pull: { "hazards.$.photoIds": photoId } }, UPDATE);
    if (!job) return refuse(req, res, "Hazard");
    await Photo.deleteOne({ _id: photoId, userId: req.userId, jobId, hazardId });
    sendJob(res, job);
});

export default router;
