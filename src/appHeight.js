// Installed to the iPhone Home Screen, iOS reports the page height short by the status bar height
// (vh, dvh and innerHeight alike), which leaves a dead strip under the bottom nav. The app does cover
// the whole screen there, so Layout.css takes the height from --app-height when this sets it.
// Everywhere else the variable stays unset and the layout uses 100dvh.
export function fillScreenWhenInstalled() {
    // navigator.standalone only exists on iOS, and is true only for a Home Screen app
    if (window.navigator.standalone !== true) return;

    const portrait = window.matchMedia("(orientation: portrait)");
    const update = () => {
        // iOS keeps screen.width / height as the portrait size when the phone is turned
        const screenHeight = portrait.matches ? window.screen.height : window.screen.width;
        const height = Math.max(window.innerHeight, screenHeight);
        document.documentElement.style.setProperty("--app-height", `${height}px`);
    };
    update();
    window.addEventListener("resize", update);
    portrait.addEventListener("change", update);
}
