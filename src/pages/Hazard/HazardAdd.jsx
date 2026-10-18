import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useHazards } from "../../context/HazardContext";
import { CameraPlusIcon, MicIcon, CloseIcon } from "./HazardIcons";
import { suggestHazard } from "./suggestHazard";
import "./Hazard.css";

// Page 2: add a photo and/or a prompt, ask the AI for a suggested hazard, then Accept
export default function HazardAdd() {
    const { addHazard } = useHazards();
    const navigate = useNavigate();
    const [prompt, setPrompt] = useState("");
    const [photoFile, setPhotoFile] = useState(null); // sent to the AI
    const [photo, setPhoto] = useState(null); // preview URL, also saved with the hazard
    const [suggestion, setSuggestion] = useState("");
    const [suggesting, setSuggesting] = useState(false);
    const [error, setError] = useState("");

    const canSend = (prompt.trim() || photoFile) && !suggesting;

    const handlePhoto = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (photo) URL.revokeObjectURL(photo);
            setPhotoFile(file);
            setPhoto(URL.createObjectURL(file));
            setSuggestion(""); // the old suggestion no longer matches the input
            setError("");
        }
        e.target.value = ""; // lets the same file be picked again
    };

    const handlePrompt = (e) => {
        setPrompt(e.target.value);
        setSuggestion("");
        setError("");
    };

    const handleSend = async () => {
        if (!canSend) return;
        setSuggesting(true);
        setError("");
        setSuggestion("");
        try {
            setSuggestion(await suggestHazard({ text: prompt.trim(), photoFile }));
        } catch (err) {
            setError(err.message);
        } finally {
            setSuggesting(false);
        }
    };

    const handleClear = () => {
        if (photo) URL.revokeObjectURL(photo);
        setPrompt("");
        setPhotoFile(null);
        setPhoto(null);
        setSuggestion("");
        setError("");
    };

    const handleClose = () => {
        handleClear();
        navigate("/hazard");
    };

    const handleAccept = (e) => {
        e.preventDefault();
        if (!suggestion) return;
        addHazard({ name: suggestion, photo });
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
                                accept="image/jpeg,image/png,image/webp"
                                aria-label="Add a photo"
                                disabled={suggesting}
                                onChange={handlePhoto}
                            />
                        </label>
                    </div>

                    <div className="hz-prompt">
                        <input
                            className="hz-input"
                            type="text"
                            placeholder="Enter your prompt"
                            aria-label="Describe the hazard"
                            maxLength={500}
                            value={prompt}
                            disabled={suggesting}
                            onChange={handlePrompt}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault(); // Enter sends the prompt, it doesn't accept
                                    handleSend();
                                }
                            }}
                        />
                        <button type="button" className="hz-mic" aria-label="Voice input">
                            <MicIcon />
                        </button>
                    </div>

                    <button type="button" className="btn btn-orange hz-send" disabled={!canSend} onClick={handleSend}>
                        {suggesting ? "Thinking…" : "Send"}
                    </button>

                    <div className="hz-suggest" aria-live="polite">
                        {suggestion ? (
                            <strong>{suggestion}</strong>
                        ) : (
                            <span className="hz-suggest-placeholder">{suggesting ? "Thinking…" : "Suggested hazard"}</span>
                        )}
                    </div>

                    {error && (
                        <p role="alert" className="hz-error">
                            {error}
                        </p>
                    )}

                    <div className="hz-actions">
                        <button type="submit" className="btn btn-orange" disabled={!suggestion || suggesting}>
                            Accept
                        </button>
                        <button type="button" className="btn hz-clear" onClick={handleClear} disabled={suggesting}>
                            Clear
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}