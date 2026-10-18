import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useJobs } from "../../context/JobContext";
import { formatOpened, getLastOpened, recordOpened } from "../../data/recentSheets";
import "./Homepage.css";

// Placeholder sheets. Swap in real sheet ids and titles later.
const SHEETS = [
    { id: "sheet-001", name: "Scaffolding" },
    { id: "sheet-002", name: "Ladders" },
];

export default function HomePage() {
    const [query, setQuery] = useState("");
    const [opened] = useState(getLastOpened);
    const navigate = useNavigate();
    const { currentJob } = useJobs();

    // Most recently opened first. Sheets never opened stay at the bottom.
    const recent = [...SHEETS].sort((a, b) =>
        (opened[b.id] || "").localeCompare(opened[a.id] || "")
    );

    function handleSearch(e) {
        e.preventDefault();
        const q = query.trim();
        navigate(q ? `/hazard?q=${encodeURIComponent(q)}` : "/hazard");
    }

    return (
        <div className="content">
            {currentJob && (
                <p className="home-job">
                    <span>Job: <strong>{currentJob.label}</strong></span>
                    <Link to="/jobs">Change</Link>
                </p>
            )}

            <h1 className="home-title">What work are you inspecting?</h1>

            <form className="search" onSubmit={handleSearch}>
                <label className="search-label" htmlFor="home-query">
                    Describe what you see, search a sheet or regulation
                </label>
                <input
                    id="home-query"
                    className="add-input"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Construction, scaffolding, PBE, etc."
                />
            </form>

            <div className="cards">
                <div className="card card-off" aria-disabled="true">
                    <span className="card-title">Find a protocol sheet</span>
                    <span className="card-desc">By work type or classification unit</span>
                </div>

                <Link className="card" to="/hazard">
                    <span className="card-title">Identify work from a photo</span>
                    <span className="card-desc">Take a photo on arrival and confirm the work type</span>
                </Link>

                <div className="card card-off" aria-disabled="true">
                    <span className="card-title">Search the regulation</span>
                    <span className="card-desc">Act, OHS Regulation, policies and guidelines together</span>
                </div>
            </div>

            <section aria-labelledby="recent-heading">
                <h2 id="recent-heading" className="recent-heading">Recent</h2>
                <ul className="list">
                    {recent.map((item) => (
                        <li key={item.id}>
                            <Link
                                className="list-row"
                                to={`/hazard/${item.id}`}
                                state={{ name: item.name }}
                                onClick={() => recordOpened(item.id)}
                            >
                                <span>{item.name}</span>
                                <span className="list-meta">{formatOpened(opened[item.id])}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}