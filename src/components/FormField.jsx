import { useState } from "react";

// Labelled input with an inline error. Password fields get a show/hide toggle.
export default function FormField({ id, label, hint, error, type = "text", ...inputProps }) {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

    return (
        <div className="field">
            <label className="field-label" htmlFor={id}>
                {label}
            </label>
            {hint && (
                <p className="field-hint" id={hintId}>
                    {hint}
                </p>
            )}
            <div className="field-control">
                <input
                    id={id}
                    name={id}
                    className="field-input"
                    type={isPassword && showPassword ? "text" : type}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    {...inputProps}
                />
                {isPassword && (
                    <button
                        type="button"
                        className="field-toggle"
                        onClick={() => setShowPassword((shown) => !shown)}
                        aria-pressed={showPassword}
                        aria-controls={id}
                    >
                        {showPassword ? "Hide" : "Show"}
                    </button>
                )}
            </div>
            {error && (
                <p className="field-error" id={errorId}>
                    {error}
                </p>
            )}
        </div>
    );
}
