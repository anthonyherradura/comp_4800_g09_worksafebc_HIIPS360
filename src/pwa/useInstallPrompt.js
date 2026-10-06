import { useEffect, useState } from "react";

const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

// iPhone/iPad Safari never fires beforeinstallprompt; users install via Share > Add to Home Screen.
// iPadOS reports itself as "Macintosh", so touch support is used to tell it apart from a Mac.
const detectIOS = () =>
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);

export default function useInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(isStandalone);

    useEffect(() => {
        const onBeforeInstall = (event) => {
            // Stop the browser's mini-infobar so the page's own button can trigger the prompt
            event.preventDefault();
            setDeferredPrompt(event);
        };
        const onInstalled = () => {
            setDeferredPrompt(null);
            setIsInstalled(true);
        };

        window.addEventListener("beforeinstallprompt", onBeforeInstall);
        window.addEventListener("appinstalled", onInstalled);
        return () => {
            window.removeEventListener("beforeinstallprompt", onBeforeInstall);
            window.removeEventListener("appinstalled", onInstalled);
        };
    }, []);

    const promptInstall = async () => {
        if (!deferredPrompt) return false;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        // A prompt event can only be used once
        setDeferredPrompt(null);
        return outcome === "accepted";
    };

    return {
        canInstall: deferredPrompt !== null,
        promptInstall,
        isInstalled,
        isIOS: detectIOS(),
    };
}
