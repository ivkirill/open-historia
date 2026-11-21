/*! Open Historia — portions (mobile country/date row) © 2026 Nicholas Krol, AGPL-3.0-or-later (see LICENSE). */
import React, { memo, useEffect, useState } from "react";
import { JSON_URLS, getNationFlags } from "../../runtime/assets.js";
import { isPolityLandless, readWorldState } from "../../runtime/gameState.js";
import { useIsMobile } from "../../runtime/useIsMobile.js";
import { DOCK_BUTTON_REM } from "./hudDock.js";
import { useCountryDisplayName } from "../../runtime/polityNames.js";
import { bundledFlagUrl, flagEmojiFromGid, flagImageUrlFromGid } from "../../runtime/countryFlags.js";
import { resolveChosenPolityFlag, resolvePolityFlag } from "../../runtime/polityFlags.js";
import { useLibraryState } from "../../runtime/library.js";


// A GID_0 that isn't a real ISO country (custom scenario polities like "HRE",
// "YUAN") has no flag — flagImageUrlFromGid/flagEmojiFromGid both return null
// for it, which this component uses directly as the fallback signal instead
// of maintaining a separate "is this a real country" check.
const FallbackBadge = ({ label }) => (
    <div
    title={label}
    aria-label={label ? `${label} flag unavailable` : "Flag unavailable"}
    style={{
        alignItems: "center",
        background: "rgba(255,255,255,0.063)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "5px",
        color: "rgba(255,255,255,0.68)",
        display: "flex",
        fontSize: "1rem",
        fontWeight: 700,
        height: "100%",
        justifyContent: "center",
        width: "100%",
    }}
    >
    🏳️
    </div>
);

// A button of the right-hand tray (main.jsx RightDock), as the launchers are
// buttons of the dock on the left: the same size, corners and colours.
const Other = memo(function Other({ active = false, onToggle = null }) {
    const { activeGame } = useLibraryState();
    const activeGameId = String(activeGame?.id || "");
    const activeGameCountry = String(activeGame?.country || "").trim();
    const [country, setCountry] = useState(() => activeGameCountry || null);
    // A LANDLESS player is a stateless actor (a person, a movement, a
    // government-in-exile) whose game.country may still resolve to a real ISO
    // code — but they are NOT that country, so the badge must not borrow its
    // flag. Neutral placeholder instead. Refreshed on the same 5s cadence as the
    // stats pane so gaining/losing all territory flips the badge within a poll.
    const [landless, setLandless] = useState(false);
    const [worldState, setWorldState] = useState(null);
    const [flagCatalog, setFlagCatalog] = useState({});
    const [imageFailed, setImageFailed] = useState(false);
    const isMobile = useIsMobile();
    // The player sees the FULL country name in the tooltip, never the code.
    const displayName = useCountryDisplayName(country);

    useEffect(() => {
        let cancelled = false;
        const liveCountry = { current: activeGameCountry };
        const liveWorld = { current: null };

        // The library store owns which campaign is active. Using cached game.json here
        // meant a campaign switch could leave this one badge stuck on the previous
        // player's polity even while every other UI surface had already moved on.
        if (activeGameCountry) {
            setCountry((current) => current === activeGameCountry ? current : activeGameCountry);
        }
        setWorldState(null);
        setLandless(false);
        setImageFailed(false);

        const apply = () => {
            if (cancelled) return;
            const code = liveCountry.current;
            setCountry((current) => current === code ? current : code);
            if (liveWorld.current) {
                const next = isPolityLandless(liveWorld.current, code);
                setLandless((current) => current === next ? current : next);
            }
        };

        Promise.all([
            // One forced refresh on campaign activation is cheap and prevents the new
            // polity from being paired with the previous campaign's world/flag state.
            readWorldState({ force: true }),
            getNationFlags().catch(() => ({})),
        ])
            .then(([world, flags]) => {
                liveWorld.current = world;
                setWorldState(world || null);
                setFlagCatalog(flags || {});
                apply();
            })
            .catch((err) => {
                if (!cancelled) console.error("Failed to load player badge state:", err);
            });

        const onGameUpdated = (event) => {
            liveCountry.current = event?.detail?.game?.country || liveCountry.current;
            apply();
        };
        const onWorldUpdated = (event) => {
            liveWorld.current = event?.detail?.world || liveWorld.current;
            setWorldState(liveWorld.current || null);
            apply();
        };
        const onRuntimeUpdated = (event) => {
            if (event?.detail?.url === JSON_URLS.flags && event?.detail?.value) {
                setFlagCatalog(event.detail.value);
                setImageFailed(false);
            }
        };

        window.addEventListener("oh:game-updated", onGameUpdated);
        window.addEventListener("oh:world-updated", onWorldUpdated);
        window.addEventListener("oh:runtime-json-updated", onRuntimeUpdated);
        return () => {
            cancelled = true;
            window.removeEventListener("oh:game-updated", onGameUpdated);
            window.removeEventListener("oh:world-updated", onWorldUpdated);
            window.removeEventListener("oh:runtime-json-updated", onRuntimeUpdated);
        };
    }, [activeGameCountry, activeGameId]);

    useEffect(() => {
        setImageFailed(false);
    }, [country]);

    // Hidden on phones, where it would cover the date: there the country name
    // in the date widget opens the drawer (time.jsx).
    if (isMobile || !country) return null;

    // Landless → only a flag chosen for the polity (a new faction's or group's),
    // never the code-derived country flag; without one, fall through to the
    // neutral FallbackBadge (both null makes the render pick it).
    const flagArgs = {
        polity: { polityKey: country, code: country, name: displayName || country },
        world: worldState || {},
        flags: flagCatalog || {},
    };
    const resolvedFlag = landless ? resolveChosenPolityFlag(flagArgs) : resolvePolityFlag(flagArgs);
    const flagUrl = landless ? resolvedFlag.imageUrl : (resolvedFlag?.imageUrl || flagImageUrlFromGid(country));
    const flagEmoji = landless ? null : flagEmojiFromGid(country);

    return (
        <button
        type="button"
        title={`${displayName} · Open country panel`}
        aria-label={`Open ${displayName} country panel`}
        data-oh-theme-hud=""
        onClick={onToggle}
        style={{
            alignItems: "center",
            appearance: "none",
            background: active
                ? "var(--oh-ui-glass-active, rgba(59,130,246,0.16))"
                : "var(--oh-ui-glass-chip, rgba(255,255,255,0.04))",
            border: "1px solid var(--oh-ui-glass-line, rgba(255,255,255,0.1))",
            borderColor: active ? "var(--oh-ui-glass-active-line, rgba(96,165,250,0.34))" : "var(--oh-ui-glass-line, rgba(255,255,255,0.1))",
            borderRadius: "10px",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
            boxSizing: "border-box",
            color: "white",
            cursor: "pointer",
            display: "flex",
            height: `${DOCK_BUTTON_REM}rem`,
            justifyContent: "center",
            overflow: "hidden",
            padding: "0.3rem",
            transition: "background 0.15s ease",
            width: `${DOCK_BUTTON_REM}rem`,
        }}
        >
        {flagUrl && !imageFailed ? (
            <img
            src={bundledFlagUrl(flagUrl)}
            alt={displayName}
            onError={() => setImageFailed(true)}
            style={{ borderRadius: "5px", boxShadow: "0 0 0 1px rgba(255,255,255,0.16)", height: "100%", objectFit: "cover", width: "100%" }}
            />
        ) : flagEmoji ? (
            <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>{flagEmoji}</span>
        ) : (
            <FallbackBadge label={displayName} />
        )}
        </button>
    );
});

export { Other };
