// Run: node --test src/Game/GameUI/hudPanel.test.js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { DOCK_BOTTOM_REM, DOCK_HEIGHT_REM, DOCK_LEFT_REM } from "./hudDock.js";
import { PANEL_HEIGHT_KEY } from "./actionsPanelLayout.js";
import {
    HUD_PANELS,
    HUD_PANEL_BOTTOM,
    HUD_PANEL_BOTTOM_REM,
    HUD_PANEL_GAP_REM,
    HUD_PANEL_HEIGHT_CAP,
    HUD_PANEL_HEIGHT_KEY,
    HUD_PANEL_LEFT,
    HUD_PANEL_SURFACE,
    HUD_PANEL_WIDTH_CAP,
    hudPanelHeightCss,
    hudPanelMotion,
    hudPanelWidthCss,
    readHudPanelHeight,
    writeHudPanelHeight,
} from "./hudPanel.js";

const read = (name) => fs.readFileSync(new URL(name, import.meta.url), "utf8");

const memoryStorage = () => {
    const map = new Map();
    return {
        getItem: (key) => (map.has(key) ? map.get(key) : null),
        setItem: (key, value) => map.set(key, String(value)),
        removeItem: (key) => map.delete(key),
        map,
    };
};

test("every panel stands on the dock's left edge, just above the dock, measured from the screen", () => {
    assert.equal(HUD_PANEL_LEFT, `calc(${DOCK_LEFT_REM}rem + env(safe-area-inset-left, 0px))`);
    assert.equal(HUD_PANEL_BOTTOM_REM, Math.round((DOCK_BOTTOM_REM + DOCK_HEIGHT_REM + HUD_PANEL_GAP_REM) * 1000) / 1000);
    assert.equal(HUD_PANEL_BOTTOM, `calc(${HUD_PANEL_BOTTOM_REM}rem + env(safe-area-inset-bottom, 0px))`);
});

test("no panel runs under an open right-hand drawer, past the screen or into the top bar", () => {
    assert.match(HUD_PANEL_WIDTH_CAP, /var\(--oh-right-drawer-safe-offset, 0px\)/);
    assert.match(HUD_PANEL_WIDTH_CAP, /env\(safe-area-inset-left, 0px\) - env\(safe-area-inset-right, 0px\)/);
    assert.match(HUD_PANEL_HEIGHT_CAP, /- 9rem - env\(safe-area-inset-top, 0px\) - env\(safe-area-inset-bottom, 0px\)/);
});

test("each panel has its own default width and its own key; Diplomacy starts wide", () => {
    assert.deepEqual(Object.keys(HUD_PANELS).sort(), ["actions", "chat", "history", "skip"]);
    assert.equal(HUD_PANELS.chat.defaultWidth, "58rem");
    for (const key of ["actions", "history", "skip"]) assert.equal(HUD_PANELS[key].defaultWidth, "26.25rem");
    const keys = Object.values(HUD_PANELS).map((entry) => entry.widthKey);
    assert.equal(new Set([...keys, HUD_PANEL_HEIGHT_KEY]).size, keys.length + 1);
});

test("the width is the dragged one or the default, always under the cap; a phone gets the full width", () => {
    assert.equal(hudPanelWidthCss(null, "26.25rem"), `min(${HUD_PANEL_WIDTH_CAP}, 26.25rem)`);
    assert.equal(hudPanelWidthCss(612.4, "26.25rem"), `min(${HUD_PANEL_WIDTH_CAP}, max(612px, 20rem))`);
    assert.equal(hudPanelWidthCss(612, "58rem", { phone: true }), HUD_PANEL_WIDTH_CAP);
});

test("the shared height is the dragged one or the old Actions default, always under the cap", () => {
    assert.equal(hudPanelHeightCss(null), `min(${HUD_PANEL_HEIGHT_CAP}, max(calc(var(--oh-app-height, 100vh) - 16rem), 30rem))`);
    assert.equal(hudPanelHeightCss(480.6), `min(${HUD_PANEL_HEIGHT_CAP}, max(481px, 20rem))`);
});

test("the height the player gave the Actions panel before is kept once and the old key given up", () => {
    const storage = memoryStorage();
    assert.equal(readHudPanelHeight(storage), null);
    storage.setItem(PANEL_HEIGHT_KEY, "640");
    assert.equal(readHudPanelHeight(storage), 640);
    writeHudPanelHeight(storage, 700);
    assert.equal(readHudPanelHeight(storage), 700);
    assert.equal(storage.map.has(PANEL_HEIGHT_KEY), false);
    writeHudPanelHeight(storage, null);
    assert.equal(storage.map.has(HUD_PANEL_HEIGHT_KEY), false);
});

test("panels come up from below at one speed; open there is no transform; Reduce motion only fades", () => {
    const open = hudPanelMotion(true);
    assert.equal(open.transform, "none");
    assert.equal(open.opacity, 1);
    assert.equal(open.pointerEvents, "auto");
    const closed = hudPanelMotion(false);
    assert.match(closed.transform, /^translateY\(calc\(100% \+ /);
    assert.equal(closed.opacity, 0);
    assert.equal(closed.pointerEvents, "none");
    assert.match(open.transition, /^transform 0\.35s/);
    assert.equal(hudPanelMotion(false, true).transition, "opacity 0.15s ease");
});

test("one dense dark surface, themed through the overlay token", () => {
    assert.equal(HUD_PANEL_SURFACE.backgroundColor, "var(--oh-ui-overlay, rgba(24,24,27,0.95))");
    assert.equal(HUD_PANEL_SURFACE.borderRadius, "16px");
});

test("the four panels take the shared shell, and Rostra the shared place through the same layer", () => {
    assert.ok(read("./actions.jsx").includes('<HudPanel panel="actions"'));
    assert.ok(read("./chat.jsx").includes('<HudPanel panel="chat"'));
    const time = read("./time.jsx");
    assert.ok(time.includes('panel="history"'));
    assert.ok(time.includes('panel="skip"'));
    assert.ok(time.includes("<HudPanel panel={panel}"));
    const social = read("./social.jsx");
    assert.ok(social.includes("<HudPanelPortal>"));
    assert.ok(social.includes("bottom: HUD_PANEL_BOTTOM,"));
    assert.ok(social.includes("left: HUD_PANEL_LEFT,"));
    // The layer sits inside the HUD, so the war room still hides the panels with it.
    const main = read("./main.jsx");
    assert.ok(main.indexOf("<HudPanelLayer>") > main.indexOf('<div data-oh-hud="" style={hudStyle}>'));
    // The Actions and Diplomacy tab strips are one.
    for (const name of ["./actions.jsx", "./chat.jsx"]) assert.ok(read(name).includes("<PanelTabs"), name);
});
