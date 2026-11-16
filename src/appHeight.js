// Installed to the iPhone Home Screen, iOS reports the page height short by the status bar height
// (vh, dvh and innerHeight alike), which leaves a dead strip under the bottom nav. The app does cover
// the whole screen there, so Layout.css takes the height from --app-height when this sets it.
// Everywhere else the variable stays unset and the layout uses 100dvh.
//
// That only holds when the app draws behind the status bar (black-translucent). iOS reads that
// setting when the app is added to the Home Screen, so an icon added before DEV-34 still gets an
// opaque status bar: the page starts below it, innerHeight is already right, and the screen height
// would push the bottom nav off the screen. A top safe-area inset of 0 means that case.
function topInset() {
    const probe = document.createElement("div");
    probe.style.cssText =
        "position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none;" +
        "height:env(safe-area-inset-top, 0px)";
    document.body.appendChild(probe);
    const inset = probe.getBoundingClientRect().height;
    probe.remove();
    return inset;
}

export function fillScreenWhenInstalled() {
    // navigator.standalone only exists on iOS, and is true only for a Home Screen app
    if (window.navigator.standalone !== true) return;

    const root = document.documentElement;
    const portrait = window.matchMedia("(orientation: portrait)");
    const update = () => {
        if (portrait.matches && topInset() === 0) {
            root.style.removeProperty("--app-height");
            return;
        }
        // iOS keeps screen.width / height as the portrait size when the phone is turned
        const screenHeight = portrait.matches ? window.screen.height : window.screen.width;
        const height = Math.max(window.innerHeight, screenHeight);
        root.style.setProperty("--app-height", `${height}px`);
    };
    update();
    window.addEventListener("resize", update);
    portrait.addEventListener("change", update);
}
