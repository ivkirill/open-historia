// Run: node --test src/Game/GameUI/panelSize.test.js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { clampPanelHeight } from "./actionsPanelLayout.js";
import {
    ACTIONS_PANEL_WIDTH_KEY,
    EVENTS_PANEL_WIDTH_KEY,
    clampPanelWidth,
    keyedPanelSize,
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

test("the panels keep their widths apart", () => {
    assert.notEqual(ACTIONS_PANEL_WIDTH_KEY, EVENTS_PANEL_WIDTH_KEY);
});

test("a broken or blocked storage gives the default and never throws", () => {
    const storage = memoryStorage();
    storage.setItem(EVENTS_PANEL_WIDTH_KEY, "wide");
    assert.equal(readStoredPx(storage, EVENTS_PANEL_WIDTH_KEY), null);
    storage.setItem(EVENTS_PANEL_WIDTH_KEY, "-5");
    assert.equal(readStoredPx(storage, EVENTS_PANEL_WIDTH_KEY), null);
    assert.equal(readStoredPx(throwingStorage, EVENTS_PANEL_WIDTH_KEY), null);
    assert.doesNotThrow(() => writeStoredPx(throwingStorage, EVENTS_PANEL_WIDTH_KEY, 400));
    assert.equal(readStoredPx(null, EVENTS_PANEL_WIDTH_KEY), null);
});

test("the width stays between 20rem and the screen less 1rem", () => {
    const screen = { viewportWidth: 1200, rem: 16 };
    assert.equal(clampPanelWidth(100, screen), 320);
    assert.equal(clampPanelWidth(600, screen), 600);
    assert.equal(clampPanelWidth(5000, screen), 1184);
    // A phone narrower than the minimum gets what it has.
    assert.equal(clampPanelWidth(500, { viewportWidth: 300, rem: 16 }), 284);
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

test("every resizable panel takes the grips on its free edges, and a phone only the height", () => {
    const shell = fs.readFileSync(new URL("./hudPanel.jsx", import.meta.url), "utf8");
    assert.ok(shell.includes('{grip("y", "Resize the panel\'s height")}'));
    assert.ok(shell.includes('{!phone && grip("x", "Resize the panel\'s width")}'));
    assert.ok(shell.includes('{!phone && grip("xy", "")}'));
    assert.ok(shell.includes("writeStoredPx(panelStorage(), widthKey, patch.width);"), "a dragged width is kept under the panel's own key");
});
