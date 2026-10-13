import { Link } from "react-router-dom";
import { useHazards } from "../../context/HazardContext";
import { InfoIcon } from "./HazardIcons";
import "./Hazard.css";

// Page 1: scrollable list of hazards
export default function HazardList() {
    const { hazards } = useHazards();

    return (
        <div className="hz-page">
            <div className="hz-outer">
                <section className="hz-card">
                    <div className="hz-head">
                        <h2 className="hz-title">Hazard guidance</h2>
                        <Link to="/hazard/new" className="btn btn-orange hz-add">
                            Add hazard
                        </Link>
                    </div>
                    <div className="hz-divider" />

                    {hazards.length === 0 ? (
                        <p className="hz-empty">No hazards yet. Tap “Add hazard” to create one.</p>
                    ) : (
                        <ul className="hz-list">
                            {hazards.map((h) => (
                                <li className="hz-row" key={h.id}>
                                    <span className="hz-name">{h.name}</span>
                                    <Link to={`/hazard/${h.id}`} className="hz-info" aria-label={`View details for ${h.name}`}>
                                        <InfoIcon />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}