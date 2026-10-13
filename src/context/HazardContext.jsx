import { createContext, useContext, useState } from "react";

const HazardContext = createContext(null);

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// In-memory only: hazards reset when the page is refreshed.
// When the backend is ready, only this file needs to change.
export function HazardProvider({ children }) {
    const [hazards, setHazards] = useState([]);

    const addHazard = ({ name, photo }) => {
        const id = makeId();
        setHazards((prev) => [
            ...prev,
            {
                id,
                worksiteId: null, // filled in once the worksite model exists
                name,
                comment: "",
                photos: photo ? [photo] : [],
                createdAt: new Date().toISOString(),
            },
        ]);
        return id;
    };

    const updateHazard = (id, changes) =>
        setHazards((prev) => prev.map((h) => (h.id === id ? { ...h, ...changes } : h)));

    const addPhotos = (id, urls) =>
        setHazards((prev) => prev.map((h) => (h.id === id ? { ...h, photos: [...h.photos, ...urls] } : h)));

    const deleteHazard = (id) => setHazards((prev) => prev.filter((h) => h.id !== id));

    return (
        <HazardContext.Provider value={{ hazards, addHazard, updateHazard, addPhotos, deleteHazard }}>
            {children}
        </HazardContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useHazards() {
    const ctx = useContext(HazardContext);
    if (!ctx) throw new Error("useHazards must be used inside <HazardProvider>");
    return ctx;
}