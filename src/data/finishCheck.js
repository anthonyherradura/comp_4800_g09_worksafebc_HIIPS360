// What has to be done before an inspection can be finished (FEAT-7), and the counts the review before finishing shows.
// A plain function over one job, so the server (POST /api/jobs/:jobId/finish) and the app's review sheet use the
// same rule. Plain ESM with no browser or Vite features: the server and node --test import it too.
//
// An inspection can be finished once nothing is left to do:
// - no hazard is Unaddressed (each one has a photo or is marked not applicable), and
// - no checklist item is still "To review" (each one is Ready or Not applicable).
// Visit notes are optional.
import { HAZARD_STATUS, getHazardStatus } from "./hazardStatus.js";

// A finished inspection is read-only. Jobs saved before FEAT-7 have no finishedAt, which means open.
export const isFinished = (job) => Boolean(job?.finishedAt);

// The server's hazards carry photo ids, the app's carry photo URLs. Either one counts.
const photosOf = (hazard) => hazard.photos ?? hazard.photoIds ?? [];

// A missing answer means "To review". The checklist is a plain object, or a Map on a Mongoose document.
const answerOf = (checklist, itemId) => (checklist instanceof Map ? checklist.get(itemId) : checklist?.[itemId]);

// job: { hazards, checklist, visitNotes }. checklistItems: the job's checklist, [{ id }], from getJobChecklist(sheetIds).
export function finishSummary(job, checklistItems = []) {
    const hazards = { total: 0, reviewed: 0, notApplicable: 0, unaddressed: 0 };
    let photos = 0;
    for (const hazard of job?.hazards ?? []) {
        const list = photosOf(hazard);
        photos += list.length;
        hazards.total += 1;
        const status = getHazardStatus({ ...hazard, photos: list });
        if (status === HAZARD_STATUS.NOT_APPLICABLE) hazards.notApplicable += 1;
        else if (status === HAZARD_STATUS.REVIEWED) hazards.reviewed += 1;
        else hazards.unaddressed += 1;
    }
    const toReview = checklistItems.filter((item) => !answerOf(job?.checklist, item.id)).length;
    return {
        hazards,
        checklist: { total: checklistItems.length, done: checklistItems.length - toReview, toReview },
        photos,
        hasVisitNotes: Boolean(job?.visitNotes?.trim()),
        canFinish: hazards.unaddressed === 0 && toReview === 0,
    };
}

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// What still stops the inspection being finished, in words:
// ["2 hazards are still Unaddressed", "3 checklist items are still To review"], or [] when nothing is left
export function whatsLeft({ hazards, checklist }) {
    const left = [];
    if (hazards.unaddressed) left.push(`${count(hazards.unaddressed, "hazard is", "hazards are")} still Unaddressed`);
    if (checklist.toReview) left.push(`${count(checklist.toReview, "checklist item is", "checklist items are")} still To review`);
    return left;
}
