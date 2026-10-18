// Hazard status is derived, never stored:
// marked not applicable wins, then a photo counts as reviewed (with evidence).
export const HAZARD_STATUS = {
    UNADDRESSED: "unaddressed",
    REVIEWED: "reviewed",
    NOT_APPLICABLE: "na",
};

export const STATUS_LABEL = {
    [HAZARD_STATUS.UNADDRESSED]: "Unaddressed",
    [HAZARD_STATUS.REVIEWED]: "Reviewed",
    [HAZARD_STATUS.NOT_APPLICABLE]: "Not applicable",
};

export function getHazardStatus(hazard) {
    if (hazard.notApplicable) return HAZARD_STATUS.NOT_APPLICABLE;
    if (hazard.photos.length > 0) return HAZARD_STATUS.REVIEWED;
    return HAZARD_STATUS.UNADDRESSED;
}

// Keeps creation order inside each group.
export function groupByStatus(hazards) {
    const groups = {
        [HAZARD_STATUS.UNADDRESSED]: [],
        [HAZARD_STATUS.REVIEWED]: [],
        [HAZARD_STATUS.NOT_APPLICABLE]: [],
    };
    hazards.forEach((h) => groups[getHazardStatus(h)].push(h));
    return groups;
}

export const photoCount = (n) => `${n} photo${n === 1 ? "" : "s"}`;
