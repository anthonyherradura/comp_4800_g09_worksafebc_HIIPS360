// Loads every sheet JSON in this folder. Drop a new one in and it shows up.
const modules = import.meta.glob("./*.json", { eager: true });

export const SHEETS = Object.values(modules).map((m) => m.default);