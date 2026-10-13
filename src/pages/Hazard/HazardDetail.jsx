import { Link, useNavigate, useParams } from "react-router-dom";
import { useHazards } from "../../context/HazardContext";
import { CameraPlusIcon, BackIcon } from "./HazardIcons";
import "./Hazard.css";

// Page 3: hazard info, photo collection, comment, delete
export default function HazardDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hazards, updateHazard, addPhotos, deleteHazard } = useHazards();
    const hazard = hazards.find((h) => h.id === id);

    // Happens if the page is refreshed (data only lives in memory for now)
    if (!hazard) {
        return (
            <div className="hz-page">
                <div className="hz-outer">
                    <section className="hz-card hz-card--scroll">
                        <p className="hz-empty">Hazard not found.</p>
                        <Link to="/hazard" className="hz-back">
                            <BackIcon /> Back
                        </Link>
                    </section>
                </div>
            </div>
        );
    }

    const created = new Date(hazard.createdAt);
    const count = hazard.photos.length;

    const handleAddPhotos = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length) addPhotos(id, files.map((f) => URL.createObjectURL(f)));
        e.target.value = "";
    };

    const handleDelete = () => {
        if (window.confirm(`Delete "${hazard.name}"? This can't be undone.`)) {
            hazard.photos.forEach((url) => URL.revokeObjectURL(url));
            deleteHazard(id);
            navigate("/hazard");
        }
    };

    return (
        <div className="hz-page">
            <div className="hz-outer">
                <section className="hz-card hz-card--scroll">
                    <div className="hz-detail-head">
                        <Link to="/hazard" className="hz-back">
                            <BackIcon /> Back
                        </Link>
                        <h2 className="hz-title">Hazard</h2>
                        <span />
                    </div>
                    <div className="hz-divider" />

                    <div className="hz-name hz-name--solo">{hazard.name}</div>

                    <div className="hz-chips">
                        <span className="hz-chip"></span>
                        <span className="hz-chip"></span>
                        <span className="hz-chip"></span>
                    </div>

                    <textarea
                        className="hz-textarea"
                        placeholder="Add a comment"
                        aria-label="Comment"
                        value={hazard.comment}
                        onChange={(e) => updateHazard(id, { comment: e.target.value })}
                    />

                    <div className="hz-frame">
                        <label className="hz-photo">
                            <CameraPlusIcon />
                            <input
                                className="hz-visually-hidden"
                                type="file"
                                accept="image/*"
                                multiple
                                aria-label="Add photos"
                                onChange={handleAddPhotos}
                            />
                        </label>
                    </div>

                    <div className="hz-frame">
                        <div className="hz-gallery">
                            {count === 0 ? (
                                <span className="hz-gallery-empty">No photos yet</span>
                            ) : (
                                hazard.photos.map((url) => <img key={url} src={url} alt="Hazard" />)
                            )}
                        </div>
                    </div>

                    <button type="button" className="btn hz-delete" onClick={handleDelete}>
                        Delete
                    </button>
                </section>
            </div>
        </div>
    );
}