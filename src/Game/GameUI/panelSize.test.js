// Run: node --test src/Game/GameUI/panelSize.test.js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { clampPanelHeight } from "./actionsPanelLayout.js";
import {
    ACTIONS_PANEL_WIDTH_KEY,
    EVENTS_PANEL_HEIGHT_KEY,
    EVENTS_PANEL_WIDTH_KEY,
    clampPanelWidth,
    eventsPanelHeightCss,
    keyedPanelSize,
    panelWidthCss,
    readStoredPx,
    writeStoredPx,
} from "./panelSize.js";

const memoryStorage = () => {
    const map = new Map();
    return {
        getItem: (key) => (map.has(key) ? map.get(key) : null),
        setItem: (key, value) => map.set(key, String(value)),
        removeItem: (key) => map.delete(key),
        map,
    };
};

const throwingStorage = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); },
    removeItem: () => { throw new Error("blocked"); },
};

test("a dragged size is read back, and a reset forgets it", () => {
    const storage = memoryStorage();
    assert.equal(readStoredPx(storage, EVENTS_PANEL_WIDTH_KEY), null);
    writeStoredPx(storage, EVENTS_PANEL_WIDTH_KEY, 512.4);
    assert.equal(readStoredPx(storage, EVENTS_PANEL_WIDTH_KEY), 512);
    writeStoredPx(storage, EVENTS_PANEL_WIDTH_KEY, null);
    assert.equal(storage.map.has(EVENTS_PANEL_WIDTH_KEY), false);
});

test("the panels keep their sizes apart", () => {
    assert.equal(new Set([ACTIONS_PANEL_WIDTH_KEY, EVENTS_PANEL_WIDTH_KEY, EVENTS_PANEL_HEIGHT_KEY, "oh-actions-panel-height"]).size, 4);
});

test("a broken or blocked storage gives the default and never throws", () => {
    const storage = memoryStorage();
    storage.setItem(EVENTS_PANEL_HEIGHT_KEY, "tall");
    assert.equal(readStoredPx(storage, EVENTS_PANEL_HEIGHT_KEY), null);
    storage.setItem(EVENTS_PANEL_HEIGHT_KEY, "-5");
    assert.equal(readStoredPx(storage, EVENTS_PANEL_HEIGHT_KEY), null);
    assert.equal(readStoredPx(throwingStorage, EVENTS_PANEL_HEIGHT_KEY), null);
    assert.doesNotThrow(() => writeStoredPx(throwingStorage, EVENTS_PANEL_HEIGHT_KEY, 400));
    assert.equal(readStoredPx(null, EVENTS_PANEL_HEIGHT_KEY), null);
});

test("the width stays between 20rem and the screen less 1rem", () => {
    const screen = { viewportWidth: 1200, rem: 16 };
    assert.equal(clampPanelWidth(100, screen), 320);
    assert.equal(clampPanelWidth(600, screen), 600);
    assert.equal(clampPanelWidth(5000, screen), 1184);
    // A phone narrower than the minimum gets what it has.
    assert.equal(clampPanelWidth(500, { viewportWidth: 300, rem: 16 }), 284);
});

test("the CSS keeps a dragged size under the screen's cap, and the default height is the old one", () => {
    assert.equal(panelWidthCss(null), null);
    assert.equal(panelWidthCss(600), "min(calc(100vw - 1rem - 0px), max(600px, 20rem))");
    assert.equal(panelWidthCss(600, "L - R"), "min(calc(100vw - 1rem - L - R), max(600px, 20rem))");
    assert.equal(eventsPanelHeightCss(null, "100vh"), "min(calc(100vh - 9rem), max(calc(100vh - 33rem), 30rem))");
    assert.equal(eventsPanelHeightCss(480.6, "100vh"), "min(calc(100vh - 9rem), max(481px, 20rem))");
});

test("the keys move only their own grip's side", () => {
    const clampWidth = (px) => clampPanelWidth(px, { viewportWidth: 1200, rem: 16 });
    const clampHeight = (px) => clampPanelHeight(px, { viewport: 900, rem: 16 });
    const at = { current: { width: 420, height: 500 }, clampWidth, clampHeight };
    assert.deepEqual(keyedPanelSize("ArrowUp", "y", at), { height: 516 });
    assert.deepEqual(keyedPanelSize("ArrowDown", "y", { ...at, shift: true }), { height: 436 });
    assert.deepEqual(keyedPanelSize("ArrowRight", "x", at), { width: 436 });
    assert.deepEqual(keyedPanelSize("Home", "x", at), { width: 320 });
    assert.deepEqual(keyedPanelSize("End", "y", at), { height: 756 });
    assert.equal(keyedPanelSize("ArrowLeft", "y", at), null);
    assert.equal(keyedPanelSize("ArrowUp", "x", at), null);
    assert.equal(keyedPanelSize("ArrowUp", "xy", at), null);
});

test("both panels take the grips on their free edges and remember what was dragged", () => {
    const read = (name) => fs.readFileSync(new URL(name, import.meta.url), "utf8");
    const actions = read("./actions.jsx");
    assert.ok(actions.includes('<PanelResizeGrip axis="x"'));
    assert.ok(actions.includes('<PanelResizeGrip axis="xy"'));
    assert.ok(actions.includes("width: panelWidthCss(panelWidth) ?? \"26.25rem\""));
    const time = read("./time.jsx");
    assert.ok(time.includes('{grip("y", "Resize the Events panel\'s height")}'));
    assert.ok(time.includes('{grip("x", "Resize the Events panel\'s width")}'));
    // Only the Events panel resizes; the Timeline panel shares its chrome and keeps its size.
    assert.equal(time.split("        resizable\n").length - 1, 1);
});
