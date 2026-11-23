import { formatFullDay } from "../data/recentSheets";

export const LockIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
);

// Top of a finished inspection's pages (FEAT-7): it can be read and its PDF downloaded, but nothing changes.
// `children` adds a sentence about this page, for example why the checklist can't be tapped.
export default function ReadOnlyBanner({ finishedAt, children }) {
    return (
        <div className="readonly-banner" role="note">
            <LockIcon />
            <p>
                <strong>Read-only.</strong> This inspection was finished on {formatFullDay(finishedAt)}.
                {children && <> {children}</>}
            </p>
        </div>
    );
}
