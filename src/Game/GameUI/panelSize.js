// The sizes a player gives the side panels by their edges (panelResizeGrip.jsx):
// "окно с просчётом событий - сделать растягиваемым по высоте и ширине, как для
// действий, с запоминанием размеров", then the Actions panel's width the same way
// (the owner, 2026-11-21).
//
// The panels stand on the left edge of the screen, above the dock, so their
// free edges are the top (height) and the right (width). Where they stand, the
// height they share and the width each starts at are in hudPanel.js; this file
// holds the clamps, the keys and the storage they use.

// Remembered on this device, across openings and reloads.
export const ACTIONS_PANEL_WIDTH_KEY = "oh-actions-panel-width";
export const EVENTS_PANEL_WIDTH_KEY = "oh-events-panel-width";

export const PANEL_MIN_WIDTH_REM = 20;
// Kept free beside a panel: its inset on the left and as much on the right.
export const PANEL_SIDE_CLEARANCE_REM = 1;
// An arrow key on a focused grip moves it by this much; with Shift, four times.
export const PANEL_SIZE_KEY_STEP_PX = 16;

// A dragged size in px, or null for the default.
export const readStoredPx = (storage, key) => {
    try {
        const saved = Number(storage?.getItem(key));
        return Number.isFinite(saved) && saved > 0 ? Math.round(saved) : null;
    } catch {
        return null;
    }
};

export const writeStoredPx = (storage, key, px) => {
    try {
        if (Number.isFinite(px) && px > 0) storage?.setItem(key, String(Math.round(px)));
        else storage?.removeItem(key);
    } catch { /* private mode or blocked storage: it is only a preference */ }
};

// Between the minimum and the screen's width less the side clearance. A screen
// too narrow for the minimum gets what it has.
export const clampPanelWidth = (px, { viewportWidth, rem = 16 }) => {
    const max = Math.max(0, viewportWidth - PANEL_SIDE_CLEARANCE_REM * rem);
    const min = Math.min(PANEL_MIN_WIDTH_REM * rem, max);
    return Math.round(Math.min(Math.max(Number(px) || 0, min), max));
};

// What a key does on a grip: the top grip takes ArrowUp/ArrowDown (up is
// taller), the right grip ArrowLeft/ArrowRight (right is wider); Home and End
// give the smallest and the largest. Returns the side that changed, { height }
// or { width }, or null for a key the grip does not use. `clampWidth` and
// `clampHeight` take px and already know the screen.
export const keyedPanelSize = (key, axis, { current, shift = false, clampWidth, clampHeight }) => {
    const step = PANEL_SIZE_KEY_STEP_PX * (shift ? 4 : 1);
    const target = (grow, shrink, value) => (
        key === grow ? value + step
            : key === shrink ? value - step
            : key === "Home" ? 0
            : key === "End" ? Infinity
            : null
    );
    if (axis === "y") {
        const height = target("ArrowUp", "ArrowDown", current.height);
        return height === null ? null : { height: clampHeight(height) };
    }
    if (axis === "x") {
        const width = target("ArrowRight", "ArrowLeft", current.width);
        return width === null ? null : { width: clampWidth(width) };
    }
    return null;
};
