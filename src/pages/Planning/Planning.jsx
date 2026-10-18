import { useState } from "react";
import "../../styles/tokens.css";
import "./Planning.css";

const INITIAL_ITEMS = [
    { id: "sheet", label: "Confirm protocol sheet" },
    { id: "equipment", label: "Review protective equipment" },
    { id: "practices", label: "Review site practices" },
    { id: "questions", label: "Prepare inspection questions" },
];

const STATUSES = [
    { value: "pending", label: "To review", symbol: "" },
    { value: "ready", label: "Ready", symbol: "✓" },
    { value: "not-applicable", label: "Not applicable", symbol: "×" },
];

export default function PlanningPage() {
    const [notes, setNotes] = useState("");
    const [statuses, setStatuses] = useState({});

    return (
        <div className="planning-page">
            <section className="planning-panel" aria-labelledby="planning-title">
                <h2 id="planning-title" className="planning-title">Planning</h2>

                <div className="planning-notes">
                    <label className="planning-sr-only" htmlFor="planning-notes">Visit notes</label>
                    <textarea
                        id="planning-notes"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="Add visit notes…"
                        aria-describedby="planning-demo"
                    />
                </div>

                <ul className="planning-checklist" aria-label="Preparation checklist">
                    {INITIAL_ITEMS.map((item) => {
                        const status = STATUSES.find((option) => option.value === (statuses[item.id] || "pending"));
                        return (
                            <li key={item.id} className="planning-item">
                                <div className={`planning-status planning-status--${status.value}`}>
                                    <span aria-hidden="true">{status.symbol}</span>
                                    <select
                                        aria-label={`${item.label}: status`}
                                        value={status.value}
                                        onChange={(event) => setStatuses((previous) => ({ ...previous, [item.id]: event.target.value }))}
                                    >
                                        {STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                    </select>
                                </div>
                                <div className="planning-item-text">
                                    <span>{item.label}</span>
                                    <small>{status.label}</small>
                                </div>
                            </li>
                        );
                    })}
                </ul>
                <p id="planning-demo" className="planning-demo">Sample checklist · Changes last only while this page is open.</p>
            </section>
        </div>
    );
}
