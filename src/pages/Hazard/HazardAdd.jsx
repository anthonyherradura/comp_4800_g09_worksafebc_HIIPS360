import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useHazards } from "../../context/HazardContext";
import { CameraPlusIcon, MicIcon, CloseIcon } from "./HazardIcons";
import "./Hazard.css";

// Page 2: add a photo + hazard name, then Accept
export default function HazardAdd() {
    const { addHazard } = useHazards();
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [photo, setPhoto] = useState(null);

    const handlePhoto = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (photo) URL.revokeObjectURL(photo);
            setPhoto(URL.createObjectURL(file));
        }
        e.target.value = ""; // lets the same file be picked again
    };

    const handleClear = () => {
        if (photo) URL.revokeObjectURL(photo);
        setName("");
        setPhoto(null);
    };

    const handleClose = () => {
        handleClear();
        navigate("/hazard");
    };

    const handleAccept = (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        addHazard({ name: name.trim(), photo });
        navigate("/hazard");
    };

    return (
        <div className="hz-page">
            <div className="hz-outer">
                <form className="hz-card hz-card--scroll" onSubmit={handleAccept}>
                    <div className="hz-title-row">
                        <h2 className="hz-title">Hazard guidance</h2>
                        <button type="button" className="hz-close" aria-label="Close" onClick={handleClose}>
                            <CloseIcon />
                        </button>
                    </div>

                    <div className="hz-frame">
                        <label className="hz-photo hz-photo--tall">
                            {photo ? <img src={photo} alt="Selected hazard" /> : <CameraPlusIcon />}
                            <input
                                className="hz-visually-hidden"
                                type="file"
                                accept="image/*"
                                aria-label="Add a photo"
                                onChange={handlePhoto}
                            />
                        </label>
                    </div>

                    <div className="hz-prompt">
                        <input
                            className="hz-input"
                            type="text"
                            placeholder="Enter hazard name"
                            aria-label="Hazard name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <button type="button" className="hz-mic" aria-label="Voice input">
                            <MicIcon />
                        </button>
                    </div>

                    <div className="hz-suggest">
                        {name.trim() ? <strong>{name}</strong> : <span className="hz-suggest-placeholder">Suggested hazard</span>}
                    </div>

                    <div className="hz-actions">
                        <button type="submit" className="btn btn-orange" disabled={!name.trim()}>
                            Accept
                        </button>
                        <button type="button" className="btn hz-clear" onClick={handleClear}>
                            Clear
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}