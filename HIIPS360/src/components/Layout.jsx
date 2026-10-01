import { NavLink, Outlet } from "react-router-dom";
import "../styles/tokens.css";
import "./Layout.css";

const HomeIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.5 1.5 11.5h2.8V21h6v-6h3.4v6h6v-9.5h2.8L18 7.3V3.5h-3v1.2L12 2.5Z" fill="currentColor" />
    </svg>
);

const DashboardIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2.5" y="3.5" width="19" height="17" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <rect x="2.5" y="3.5" width="19" height="4" fill="currentColor" />
        <rect x="5.5" y="10.5" width="5" height="6" fill="currentColor" />
        <path d="M13 11h6M13 14h6M13 17h6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
);

const PlanningIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="16" height="18" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <rect x="8" y="2" width="8" height="4" rx="1.2" fill="currentColor" />
        <path d="M8 11h2M12 11h4M8 15h2M12 15h4M8 19h2M12 19h4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
);

const HazardIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.5 23 21.5H1L12 2.5Z" fill="currentColor" strokeLinejoin="round" />
        <path d="M12 9v6" stroke="#ED8B00" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="12" cy="18" r="1.4" fill="#ED8B00" />
    </svg>
);

const SummaryIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 2.5h8l5 5v14H7v-19Z" fill="currentColor" />
        <path d="M12 12h6M12 15.5h6" stroke="#ED8B00" strokeWidth="1.8" />
        <path d="M5.5 11 8 8.5l1.8 1.8-2.5 2.5-2.6.8.8-2.6Z" fill="#ED8B00" stroke="currentColor" strokeWidth="1" />
    </svg>
);


const NAV_ITEMS = [
    { to: "/", label: "Home", Icon: HomeIcon },
    { to: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
    { to: "/planning", label: "Planning", Icon: PlanningIcon },
    { to: "/hazard", label: "Hazard", Icon: HazardIcon },
    { to: "/summary", label: "Summary", Icon: SummaryIcon },
];

export default function Layout() {
    return (
        <div className="app-shell">
            <div className="phone">
                <header className="header">
                    <h1 className="logo">
                        HIIPS<span>360</span>
                    </h1>
                </header>

                {/* The current page renders here */}
                
                <main className="page">
                    <Outlet />
                </main>

                <nav className="nav" aria-label="Main navigation">
                    {NAV_ITEMS.map(({ to, label, Icon }) => (
                        <NavLink key={to} to={to} end={to === "/"} className="nav-btn" aria-label={label}>
                            <Icon />
                        </NavLink>
                    ))}
                </nav>
            </div>
        </div>
    );
}