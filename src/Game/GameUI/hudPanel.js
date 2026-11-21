// Where the left-hand panels stand and how big they get: Actions (actions.jsx),
// Diplomacy (chat.jsx), Events and Timeline (time.jsx), and where Rostra
// (social.jsx) stands. "все окна стоят в разных местах, в разно бой и с разными
// состояниями. Давай проанализируем как их можно оптимизировать и
// стандартизировать" (the owner, 2026-11-21): one edge, one line above the dock,
// one height shared by all of them, a width each.
//
// The numbers are measured from the screen. The panels are drawn into a layer of
// their own (hudPanel.jsx HudPanelLayer), not inside the dock: the dock's
// backdrop-filter made it the reference box of anything fixed inside it, but only
// while the map's frosted glass was off (styles.css .oh-map-frost), so the same
// panel stood in two places.

import { DOCK_BOTTOM_REM, DOCK_HEIGHT_REM, DOCK_LEFT_REM } from "./hudDock.js";
import { PANEL_HEIGHT_KEY, PANEL_MIN_HEIGHT_REM, PANEL_TOP_CLEARANCE_REM } from "./actionsPanelLayout.js";
import { ACTIONS_PANEL_WIDTH_KEY, EVENTS_PANEL_WIDTH_KEY, PANEL_MIN_WIDTH_REM, readStoredPx, writeStoredPx } from "./panelSize.js";
import { APP_HEIGHT, SAFE_BOTTOM, SAFE_LEFT, SAFE_RIGHT, SAFE_TOP } from "../../runtime/mobileUi.js";

const tidy = (value) => Math.round(value * 1000) / 1000;

// Between the dock's top edge and a panel's bottom edge.
export const HUD_PANEL_GAP_REM = 0.5;

// The dock's left edge, and a line just above the dock.
export const HUD_PANEL_LEFT = `calc(${DOCK_LEFT_REM}rem + ${SAFE_LEFT})`;
export const HUD_PANEL_BOTTOM_REM = tidy(DOCK_BOTTOM_REM + DOCK_HEIGHT_REM + HUD_PANEL_GAP_REM);
export const HUD_PANEL_BOTTOM = `calc(${HUD_PANEL_BOTTOM_REM}rem + ${SAFE_BOTTOM})`;

// The widest a panel gets: the screen less the same gap on both sides, less an
// open Advisor or Country drawer on the right (main.jsx sets the variable), so
// the two meet and never stack.
export const HUD_PANEL_WIDTH_CAP = `calc(100vw - ${tidy(DOCK_LEFT_REM * 2)}rem - ${SAFE_LEFT} - ${SAFE_RIGHT} - var(--oh-right-drawer-safe-offset, 0px))`;
// The tallest: never into the room the top of the screen needs.
export const HUD_PANEL_HEIGHT_CAP = `calc(${APP_HEIGHT} - ${PANEL_TOP_CLEARANCE_REM}rem - ${SAFE_TOP} - ${SAFE_BOTTOM})`;

// The panels that take the shared chrome, by their slot in main.jsx
// (activeBottomPanel): the width each starts at and the key its dragged width is
// kept under on this device. Diplomacy shows a list and a conversation side by
// side, so it starts wide.
export const HUD_PANELS = Object.freeze({
    actions: Object.freeze({ defaultWidth: "26.25rem", widthKey: ACTIONS_PANEL_WIDTH_KEY }),
    chat: Object.freeze({ defaultWidth: "58rem", widthKey: "oh-diplomacy-panel-width" }),
    history: Object.freeze({ defaultWidth: "26.25rem", widthKey: EVENTS_PANEL_WIDTH_KEY }),
    skip: Object.freeze({ defaultWidth: "26.25rem", widthKey: "oh-timeline-panel-width" }),
});

// One height for every panel, so their top edges stay on one line when the
// player goes from one to another. The Actions panel's own key from before is
// read once and given up, so a height the player already chose is kept.
export const HUD_PANEL_HEIGHT_KEY = "oh-hud-panel-height";

export const readHudPanelHeight = (storage) => readStoredPx(storage, HUD_PANEL_HEIGHT_KEY) ?? readStoredPx(storage, PANEL_HEIGHT_KEY);

export const writeHudPanelHeight = (storage, px) => {
    writeStoredPx(storage, HUD_PANEL_HEIGHT_KEY, px);
    writeStoredPx(storage, PANEL_HEIGHT_KEY, null);
};

// The width as CSS: the dragged px, or the panel's own default, under the cap.
// On a phone every panel is the screen's width.
export const hudPanelWidthCss = (px, defaultWidth, { phone = false } = {}) => {
    if (phone) return HUD_PANEL_WIDTH_CAP;
    const wanted = Number.isFinite(px) && px > 0 ? `max(${Math.round(px)}px, ${PANEL_MIN_WIDTH_REM}rem)` : defaultWidth;
    return `min(${HUD_PANEL_WIDTH_CAP}, ${wanted})`;
};

// The height as CSS. The default grows with a tall screen (leaving ~16rem for the
// top bar) and never drops below 30rem, as the Actions panel always did.
export const hudPanelHeightCss = (px) => {
    const wanted = Number.isFinite(px) && px > 0
        ? `max(${Math.round(px)}px, ${PANEL_MIN_HEIGHT_REM}rem)`
        : `max(calc(${APP_HEIGHT} - 16rem), 30rem)`;
    return `min(${HUD_PANEL_HEIGHT_CAP}, ${wanted})`;
};

// How a panel comes and goes: up from below the screen, fading in, at one speed
// for all. Open, it has no transform at all, so a fixed popup inside it (a
// dialog, a menu) still measures from the screen. With Reduce motion it only
// fades.
const HIDDEN_BELOW = `translateY(calc(100% + ${HUD_PANEL_BOTTOM_REM}rem + ${SAFE_BOTTOM}))`;
export const hudPanelMotion = (open, reduceMotion = false) => ({
    opacity: open ? 1 : 0,
    pointerEvents: open ? "auto" : "none",
    transform: open ? "none" : HIDDEN_BELOW,
    transition: reduceMotion ? "opacity 0.15s ease" : "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease",
});

// The shared surface: the dense dark one Diplomacy had, so long text reads over
// any map (the owner chose it over the glass Events had).
export const HUD_PANEL_SURFACE = Object.freeze({
    backdropFilter: "blur(8px)",
    backgroundColor: "var(--oh-ui-overlay, rgba(24,24,27,0.95))",
    border: "1px solid var(--oh-ui-line, rgba(255,255,255,0.1))",
    borderRadius: "16px",
    boxShadow: "-4px 0 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
    color: "white",
    fontFamily: "sans-serif",
});
