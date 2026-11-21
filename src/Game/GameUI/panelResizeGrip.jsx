import React from "react";
import { APP_HEIGHT_VAR } from "../../runtime/mobileUi.js";
import { keyedPanelSize } from "./panelSize.js";

// The visible height (mobileUi.js APP_HEIGHT, which follows a phone's address
// bar and keyboard), the width and the root font size, in px, for a drag.
const screenMetrics = () => {
    if (typeof window === "undefined") return { viewport: 800, viewportWidth: 1200, rem: 16 };
    const root = document.documentElement;
    const rem = parseFloat(getComputedStyle(root).fontSize) || 16;
    const viewport = parseFloat(root.style.getPropertyValue(APP_HEIGHT_VAR)) || window.innerHeight || 800;
    return { viewport, viewportWidth: window.innerWidth || 1200, rem };
};

// Where each grip sits on a panel that stands on the left edge of the screen:
// the top edge (height), the right edge (width) and the top-right corner (both).
const gripPlace = (axis, thickness) => ({
    y: { cursor: "ns-resize", height: thickness, left: "24px", right: "24px", top: 0 },
    x: { bottom: "24px", cursor: "ew-resize", right: 0, top: "24px", width: thickness },
    xy: { cursor: "nesw-resize", height: "16px", right: 0, top: 0, width: "16px" },
}[axis]);

// A grip on a resizable panel, as the Actions panel's top edge works
// (actions.jsx PanelResizeHandle): drag it, or focus it and use the arrow keys
// (Shift for bigger steps, Home and End for the smallest and the largest); a
// double-click or Enter gives back the default. Pointer capture keeps the drag
// alive off the thin strip.
//
//   axis         "y" the top edge, "x" the right edge, "xy" the top-right corner
//   clampWidth   (px, metrics) => px, clampHeight likewise
//   onLive       ({ width?, height? }) puts a size on the panel while it is dragged
//   onCommit     ({ width?, height? }) once it is let go; null on a side is its default
export const PanelResizeGrip = ({ axis, panelRef, label, clampWidth, clampHeight, onLive, onCommit, touch = false }) => {
    const [lit, setLit] = React.useState(false);
    const currentSize = () => ({ width: panelRef.current?.offsetWidth || 0, height: panelRef.current?.offsetHeight || 0 });
    const resetPatch = axis === "y" ? { height: null } : axis === "x" ? { width: null } : { width: null, height: null };

    const handlePointerDown = (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        const target = event.currentTarget;
        try { target.setPointerCapture(event.pointerId); } catch { /* optional */ }
        const start = currentSize();
        const startX = event.clientX;
        const startY = event.clientY;
        const metrics = screenMetrics();
        let latest = null;
        setLit(true);
        // Straight onto the panel while the pointer moves, and into React (and
        // storage) once, when it lets go.
        const onMove = (moveEvent) => {
            latest = {
                ...(axis === "y" ? null : { width: clampWidth(start.width + (moveEvent.clientX - startX), metrics) }),
                ...(axis === "x" ? null : { height: clampHeight(start.height + (startY - moveEvent.clientY), metrics) }),
            };
            onLive(latest);
        };
        const onUp = () => {
            setLit(false);
            target.removeEventListener("pointermove", onMove);
            target.removeEventListener("pointerup", onUp);
            target.removeEventListener("pointercancel", onUp);
            if (latest !== null) onCommit(latest);
        };
        target.addEventListener("pointermove", onMove);
        target.addEventListener("pointerup", onUp);
        target.addEventListener("pointercancel", onUp);
    };

    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            onCommit(resetPatch);
            return;
        }
        const metrics = screenMetrics();
        const next = keyedPanelSize(event.key, axis, {
            current: currentSize(),
            shift: event.shiftKey,
            clampWidth: (px) => clampWidth(px, metrics),
            clampHeight: (px) => clampHeight(px, metrics),
        });
        if (next === null) return;
        event.preventDefault();
        onCommit(next);
    };

    // The corner is for the pointer only: the two edges already take the keys.
    const keyed = axis !== "xy";
    const bar = axis === "y" ? { height: "3px", width: "42px" } : axis === "x" ? { height: "42px", width: "3px" } : null;
    return (
        <div
        role={keyed ? "separator" : undefined}
        aria-orientation={keyed ? (axis === "y" ? "horizontal" : "vertical") : undefined}
        aria-label={keyed ? label : undefined}
        aria-hidden={keyed ? undefined : true}
        tabIndex={keyed ? 0 : -1}
        title="Drag to resize. Double-click for the default size."
        onPointerDown={handlePointerDown}
        onDoubleClick={() => onCommit(resetPatch)}
        onKeyDown={keyed ? handleKeyDown : undefined}
        onFocus={() => setLit(true)}
        onBlur={() => setLit(false)}
        style={{
            ...gripPlace(axis, touch ? "10px" : "8px"),
            alignItems: "center",
            display: "flex",
            justifyContent: "center",
            outline: "none",
            position: "absolute",
            touchAction: "none",
            zIndex: 30,
        }}
        >
        {bar && (
            <div style={{ ...bar, backgroundColor: lit ? "var(--oh-ui-accent, #2bc1f3)" : "rgba(255,255,255,0.22)", borderRadius: "2px", transition: "background-color 0.15s" }} />
        )}
        </div>
    );
};
