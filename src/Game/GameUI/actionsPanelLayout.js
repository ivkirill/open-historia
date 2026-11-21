// How the Actions panel shares its room (actions.jsx): "make it so you can
// minimize the standing goal and it is auto minimized when suggested actions
// are opened or submitted actions are opened (suggested actions and submitted
// actions already do this for each other) also make the actions tab resizable
// vertically" (the owner, 2026-11-09).
//
// The standing goal card and the two order lists are one family. Opening a
// list (its header, AI Suggestions, sending an order) minimizes the goal card,
// so the list gets the room. Expanding the goal card leaves the open list
// open: the queued orders never disappear behind it.

// Remembered across openings of the panel, on this device.
export const GOAL_OPEN_KEY = "oh-actions-goal-open";
// The Actions panel's height from before every panel shared one: read once and
// given up (hudPanel.js readHudPanelHeight).
export const PANEL_HEIGHT_KEY = "oh-actions-panel-height";

// Dragged no shorter than this, and never into the 9rem the top of the screen
// needs (the panel's own cap since it grew to fill tall screens).
export const PANEL_MIN_HEIGHT_REM = 20;
export const PANEL_TOP_CLEARANCE_REM = 9;

// The CSS variable the panel's height lives in, which the Projects tab reads
// to size its tag menu (projects.jsx PANEL_HEIGHT).
export const PANEL_HEIGHT_VAR = "--oh-actions-panel-height";

// Which list is open. Suggested is only ever open while it is shown at all;
// otherwise the submitted actions are.
export const openSectionOf = (section, showSuggested) => (showSuggested && section === "suggested" ? "suggested" : "submitted");

export const initialActionsLayout = (goalOpen = true) => ({ section: "submitted", goalOpen: goalOpen !== false });

// Events:
//   { type: "open", section, showSuggested }  a list asked for (AI Suggestions, an order sent)
//   { type: "toggle", showSuggested }          a list's header clicked: the other list opens
//   { type: "goal", open? }                    the goal card's header: flips it, or sets it
// A list that opens minimizes the goal card; one already open changes nothing.
export const actionsLayoutReducer = (state, event) => {
    const current = openSectionOf(state.section, event?.showSuggested);
    switch (event?.type) {
        case "open": {
            const next = event.section === "suggested" ? "suggested" : "submitted";
            if (next === current) return state.section === next ? state : { ...state, section: next };
            return { section: next, goalOpen: false };
        }
        case "toggle": {
            if (!event.showSuggested) return state;
            return { section: current === "suggested" ? "submitted" : "suggested", goalOpen: false };
        }
        case "goal": {
            const open = typeof event.open === "boolean" ? event.open : !state.goalOpen;
            return open === state.goalOpen ? state : { ...state, goalOpen: open };
        }
        default:
            return state;
    }
};

export const readGoalOpen = (storage) => {
    try {
        const saved = storage?.getItem(GOAL_OPEN_KEY);
        return saved === null || saved === undefined ? true : saved !== "0";
    } catch {
        return true;
    }
};

export const writeGoalOpen = (storage, open) => {
    try {
        storage?.setItem(GOAL_OPEN_KEY, open ? "1" : "0");
    } catch { /* private mode or blocked storage: it is only a preference */ }
};

// Between the minimum and the screen's available height. A screen too short
// for the minimum gets what it has.
export const clampPanelHeight = (px, { viewport, rem = 16 }) => {
    const max = Math.max(0, viewport - PANEL_TOP_CLEARANCE_REM * rem);
    const min = Math.min(PANEL_MIN_HEIGHT_REM * rem, max);
    return Math.round(Math.min(Math.max(Number(px) || 0, min), max));
};
