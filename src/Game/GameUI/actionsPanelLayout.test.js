// Run: node --test src/Game/GameUI/actionsPanelLayout.test.js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
    GOAL_OPEN_KEY,
    PANEL_HEIGHT_VAR,
    actionsLayoutReducer,
    clampPanelHeight,
    initialActionsLayout,
    openSectionOf,
    readGoalOpen,
    writeGoalOpen,
} from "./actionsPanelLayout.js";

const memoryStorage = () => {
    const map = new Map();
    return {
        getItem: (key) => (map.has(key) ? map.get(key) : null),
        setItem: (key, value) => map.set(key, String(value)),
        removeItem: (key) => map.delete(key),
        map,
    };
};

const brokenStorage = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); },
    removeItem: () => { throw new Error("blocked"); },
};

test("the suggested list is open only while it is shown at all", () => {
    assert.equal(openSectionOf("suggested", true), "suggested");
    assert.equal(openSectionOf("suggested", false), "submitted");
    assert.equal(openSectionOf("submitted", true), "submitted");
    assert.deepEqual(initialActionsLayout(), { section: "submitted", goalOpen: true });
    assert.deepEqual(initialActionsLayout(false), { section: "submitted", goalOpen: false });
});

test("opening the suggested actions minimizes the standing goal", () => {
    const start = initialActionsLayout(true);
    // AI Suggestions pressed while no list of them was shown yet.
    assert.deepEqual(actionsLayoutReducer(start, { type: "open", section: "suggested", showSuggested: false }), { section: "suggested", goalOpen: false });
    // Its header clicked while the submitted actions were open.
    assert.deepEqual(actionsLayoutReducer(start, { type: "toggle", showSuggested: true }), { section: "suggested", goalOpen: false });
});

test("opening the submitted actions minimizes the standing goal", () => {
    const suggested = { section: "suggested", goalOpen: true };
    // An order sent while the suggestions were open.
    assert.deepEqual(actionsLayoutReducer(suggested, { type: "open", section: "submitted", showSuggested: true }), { section: "submitted", goalOpen: false });
    // Either header clicked: the other list opens, as the accordion always did.
    assert.deepEqual(actionsLayoutReducer(suggested, { type: "toggle", showSuggested: true }), { section: "submitted", goalOpen: false });
});

test("asking for the list that is already open changes nothing", () => {
    const submitted = { section: "submitted", goalOpen: true };
    assert.equal(actionsLayoutReducer(submitted, { type: "open", section: "submitted", showSuggested: true }), submitted);
    const suggested = { section: "suggested", goalOpen: true };
    assert.equal(actionsLayoutReducer(suggested, { type: "open", section: "suggested", showSuggested: true }), suggested);
    // With no suggestions shown, the submitted actions are already the open list.
    const hidden = { section: "suggested", goalOpen: true };
    assert.deepEqual(actionsLayoutReducer(hidden, { type: "open", section: "submitted", showSuggested: false }), { section: "submitted", goalOpen: true });
    // And a header that cannot be clicked does nothing.
    assert.equal(actionsLayoutReducer(submitted, { type: "toggle", showSuggested: false }), submitted);
});

test("expanding the standing goal leaves the open list open", () => {
    const minimized = { section: "suggested", goalOpen: false };
    assert.deepEqual(actionsLayoutReducer(minimized, { type: "goal" }), { section: "suggested", goalOpen: true });
    assert.deepEqual(actionsLayoutReducer({ section: "suggested", goalOpen: true }, { type: "goal" }), { section: "suggested", goalOpen: false });
    assert.equal(actionsLayoutReducer(minimized, { type: "goal", open: false }), minimized);
    assert.equal(actionsLayoutReducer(minimized, { type: "nothing" }), minimized);
});

test("the goal card's state is remembered, and blocked storage never breaks the panel", () => {
    const storage = memoryStorage();
    assert.equal(readGoalOpen(storage), true, "expanded until the player minimizes it");
    writeGoalOpen(storage, false);
    assert.equal(storage.map.get(GOAL_OPEN_KEY), "0");
    assert.equal(readGoalOpen(storage), false);
    writeGoalOpen(storage, true);
    assert.equal(readGoalOpen(storage), true);
    assert.equal(readGoalOpen(brokenStorage), true);
    assert.equal(readGoalOpen(null), true);
    assert.doesNotThrow(() => writeGoalOpen(brokenStorage, false));
    assert.doesNotThrow(() => writeGoalOpen(null, false));
});

test("the panel is dragged between 20rem and the screen's available height", () => {
    // A 900 px screen at 16 px to the rem: 900 - 9rem = 756 px at most, 320 px at least.
    assert.equal(clampPanelHeight(500, { viewport: 900, rem: 16 }), 500);
    assert.equal(clampPanelHeight(100, { viewport: 900, rem: 16 }), 320);
    assert.equal(clampPanelHeight(5000, { viewport: 900, rem: 16 }), 756);
    // A screen too short for the minimum gets what it has.
    assert.equal(clampPanelHeight(100, { viewport: 400, rem: 16 }), 256);
    assert.equal(clampPanelHeight(-50, { viewport: 100, rem: 16 }), 0);
});

// The panel itself (actions.jsx) is React; these read its source.
const actionsSource = fs.readFileSync(new URL("./actions.jsx", import.meta.url), "utf8");
const projectsSource = fs.readFileSync(new URL("./projects.jsx", import.meta.url), "utf8");

test("the panel's height is the shared one, moved by a grip a mouse, a finger and a keyboard can use", () => {
    const grip = fs.readFileSync(new URL("./panelResizeGrip.jsx", import.meta.url), "utf8");
    for (const needle of [
        "role={keyed ? \"separator\" : undefined}",
        "cursor: \"ns-resize\"",
        "touchAction: \"none\"",
        "onPointerDown={handlePointerDown}",
        "setPointerCapture",
        "\"pointercancel\"",
        "onDoubleClick={() => onCommit(resetPatch)}",
        "onKeyDown={keyed ? handleKeyDown : undefined}",
    ]) {
        assert.ok(grip.includes(needle), `the grip has ${needle}`);
    }
    const shell = fs.readFileSync(new URL("./hudPanel.jsx", import.meta.url), "utf8");
    assert.ok(shell.includes('{grip("y", "Resize the panel\'s height")}'), "every panel's top edge takes the height grip");
    assert.ok(actionsSource.includes('<HudPanel panel="actions"'), "the Actions panel is the shared shell");
    assert.ok(actionsSource.includes('[PANEL_HEIGHT_VAR]: "var(--oh-hud-panel-height)"'), "the panel's variable follows the shared height");
    assert.ok(projectsSource.includes(`var(${PANEL_HEIGHT_VAR},`), "the Projects tab sizes its tag menu by the panel's real height");
});

test("the standing goal card and the order lists share one state", () => {
    assert.ok(actionsSource.includes("React.useReducer(actionsLayoutReducer"), "one reducer holds both");
    assert.ok(actionsSource.includes("open={layout.goalOpen} onToggle={() => dispatchLayout({ type: \"goal\" })}"), "the goal card reads and flips it");
    assert.equal((actionsSource.match(/dispatchLayout\(\{ type: "toggle", showSuggested \}\)/g) || []).length, 2, "both list headers go through it");
    assert.ok(!/setOpenSection|\bopenSection\b/.test(actionsSource), "the old accordion state is gone");
});
