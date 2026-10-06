import { Link, Navigate } from "react-router-dom";
import useInstallPrompt from "../../pwa/useInstallPrompt";
import "./Landing.css";

const BENEFITS = [
    {
        title: "Works offline",
        text: "Sheets and inspection notes are kept on your phone, so poor signal on site doesn't stop you.",
    },
    {
        title: "From photo to sheet",
        text: "Take a site photo and get a suggested protocol sheet. You can also browse for it.",
    },
    {
        title: "Your call, every time",
        text: "Every suggestion can be confirmed, edited or dismissed. The judgement stays yours.",
    },
];

function InstallHelp({ isIOS }) {
    if (isIOS) {
        return (
            <div className="install-help">
                <p className="install-help-title">To install on iPhone or iPad:</p>
                <ol>
                    <li>Open this page in Safari.</li>
                    <li>
                        Tap the <strong>Share</strong> button.
                    </li>
                    <li>
                        Choose <strong>Add to Home Screen</strong>.
                    </li>
                </ol>
            </div>
        );
    }
    return (
        <p className="install-help">
            Your browser doesn't offer an install prompt here. Open this page in Chrome or Edge to
            install, or keep using it in the browser.
        </p>
    );
}

export default function LandingPage() {
    const { canInstall, promptInstall, isInstalled, isIOS } = useInstallPrompt();

    // Opened from the home screen icon: skip the pitch and go to the app
    if (isInstalled) return <Navigate to="/home" replace />;

    return (
        <div className="content landing">
            <p className="prototype-notice">
                <strong>Prototype.</strong> HIIPS360 is a BCIT student prototype for WorkSafeBC. It is not
                connected to WorkSafeBC systems and does not write inspection reports.
            </p>

            <section className="landing-hero" aria-labelledby="landing-title">
                <h1 id="landing-title" className="landing-title">
                    The HIIPS sheets, on your phone
                </h1>
                <p className="landing-lead">
                    Hazards, controls and the governing regulation for the work in front of you, built to keep
                    working when the signal drops.
                </p>

                <div className="landing-actions">
                    {canInstall ? (
                        <button type="button" className="btn btn-orange landing-btn" onClick={promptInstall}>
                            Install app
                        </button>
                    ) : (
                        <InstallHelp isIOS={isIOS} />
                    )}
                    <Link to="/login" className="btn btn-outline-orange landing-btn">
                        Sign in
                    </Link>
                </div>

                <p className="landing-alt">
                    New here? <Link to="/register">Create an account</Link>
                </p>
            </section>

            <section aria-labelledby="benefits-title">
                <h2 id="benefits-title" className="landing-subtitle">
                    What it does
                </h2>
                <ul className="benefits">
                    {BENEFITS.map(({ title, text }) => (
                        <li key={title} className="benefit">
                            <h3 className="benefit-title">{title}</h3>
                            <p className="benefit-text">{text}</p>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
