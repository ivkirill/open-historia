import React from "react";
import ReactDOM from "react-dom";
import { useTouchPrimary } from "../../runtime/mobileUi.js";
import { useIsMobile } from "../../runtime/useIsMobile.js";
import { MAP_SETTING_KEYS, useMotionSetting } from "../../runtime/mapSettings.js";
import { clampPanelHeight } from "./actionsPanelLayout.js";
import { PanelResizeGrip } from "./panelResizeGrip.jsx";
import { clampPanelWidth, readStoredPx, writeStoredPx } from "./panelSize.js";
import {
    HUD_PANELS,
    HUD_PANEL_BOTTOM,
    HUD_PANEL_LEFT,
    HUD_PANEL_SURFACE,
    hudPanelHeightCss,
    hudPanelMotion,
    hudPanelWidthCss,
    readHudPanelHeight,
    writeHudPanelHeight,
} from "./hudPanel.js";

const panelStorage = () => {
    try {
        return typeof window === "undefined" ? null : window.localStorage;
    } catch {
        return null;
    }
};

// ── The layer the panels are drawn into ──────────────────────────────────────
// Inside the HUD (main.jsx data-oh-hud), so the war room still puts the panels
// out of sight with the rest, but outside the dock, whose backdrop-filter would
// make it their reference box (hudPanel.js).
const HudPanelLayerContext = React.createContext(null);

export const HudPanelLayer = ({ children }) => {
    const [layer, setLayer] = React.useState(null);
    return (
        <HudPanelLayerContext.Provider value={layer}>
        {children}
        <div data-oh-hud-panels="" ref={setLayer} style={{ display: "contents" }} />
        </HudPanelLayerContext.Provider>
    );
};

// Rostra keeps its own phone frame but stands in the same layer.
export const HudPanelPortal = ({ children }) => {
    const layer = React.useContext(HudPanelLayerContext);
    return layer ? ReactDOM.createPortal(children, layer) : children;
};

// ── The one height every panel shares ────────────────────────────────────────
const heightListeners = new Set();
let heightLoaded = false;
let sharedHeight = null;

const getSharedHeight = () => {
    if (!heightLoaded) {
        heightLoaded = true;
        sharedHeight = readHudPanelHeight(panelStorage());
    }
    return sharedHeight;
};

const subscribeSharedHeight = (callback) => {
    heightListeners.add(callback);
    return () => heightListeners.delete(callback);
};

const setSharedHeight = (px) => {
    heightLoaded = true;
    sharedHeight = Number.isFinite(px) && px > 0 ? Math.round(px) : null;
    writeHudPanelHeight(panelStorage(), sharedHeight);
    heightListeners.forEach((listener) => listener());
};

const useSharedHeight = () => React.useSyncExternalStore(subscribeSharedHeight, getSharedHeight, () => null);

// The game's Reduce motion: the player's two motion switches, or the system's
// request (mapSettings.js reduceMotionEnabled).
export const useHudReducedMotion = () => {
    const still = useMotionSetting(MAP_SETTING_KEYS.disableIdleRotation);
    const noCamera = useMotionSetting(MAP_SETTING_KEYS.disableEventCamera);
    return still && noCamera;
};

// ── The shell ────────────────────────────────────────────────────────────────
// One of the left-hand panels: where it stands, the surface, its size and the
// grips that change it (the top edge for the shared height, the right edge for
// its own width, the corner for both; on a phone, height only), and how it comes
// and goes. `panel` is its slot (hudPanel.js HUD_PANELS). What is inside is the
// panel's own.
export const HudPanel = ({ panel, isOpen, children, style = null, ariaLabel }) => {
    const panelRef = React.useRef(null);
    const isMobile = useIsMobile();
    const isTouch = useTouchPrimary();
    const phone = isMobile || isTouch;
    const reduceMotion = useHudReducedMotion();
    const height = useSharedHeight();
    const { defaultWidth, widthKey } = HUD_PANELS[panel];
    const [width, setWidth] = React.useState(() => readStoredPx(panelStorage(), widthKey));

    // Straight onto the panel while a grip is dragged; the style below takes over
    // once it is let go.
    const showSizeWhileDragged = (size) => {
        const node = panelRef.current;
        if (!node) return;
        if (size.width) node.style.width = `${size.width}px`;
        if (size.height) node.style.setProperty("--oh-hud-panel-height", `${size.height}px`);
    };
    const commitSize = (patch) => {
        if ("width" in patch) {
            writeStoredPx(panelStorage(), widthKey, patch.width);
            setWidth(patch.width);
        }
        if ("height" in patch) setSharedHeight(patch.height);
    };
    const grip = (axis, label) => (
        <PanelResizeGrip
        axis={axis}
        panelRef={panelRef}
        label={label}
        clampWidth={clampPanelWidth}
        clampHeight={clampPanelHeight}
        onLive={showSizeWhileDragged}
        onCommit={commitSize}
        touch={phone}
        />
    );

    return (
        <HudPanelPortal>
        <div
        ref={panelRef}
        role="region"
        aria-label={ariaLabel}
        style={{
            ...HUD_PANEL_SURFACE,
            "--oh-hud-panel-height": hudPanelHeightCss(height),
            bottom: HUD_PANEL_BOTTOM,
            display: "flex",
            flexDirection: "column",
            height: "var(--oh-hud-panel-height)",
            left: HUD_PANEL_LEFT,
            minHeight: "10rem",
            overflow: "hidden",
            position: "fixed",
            width: hudPanelWidthCss(width, defaultWidth, { phone }),
            zIndex: 9998,
            ...hudPanelMotion(isOpen, reduceMotion),
            ...style,
        }}
        >
        {isOpen && (
            <>
            {grip("y", "Resize the panel's height")}
            {!phone && grip("x", "Resize the panel's width")}
            {!phone && grip("xy", "")}
            </>
        )}
        {children}
        </div>
        </HudPanelPortal>
    );
};

// ── Header parts ─────────────────────────────────────────────────────────────
const CloseGlyph = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

export const PanelCloseButton = ({ onClick, label }) => (
    <button
    type="button"
    className="oh-tap"
    onClick={onClick}
    aria-label={label}
    style={{
        alignItems: "center",
        background: "none",
        border: "none",
        borderRadius: "6px",
        color: "rgba(255,255,255,0.5)",
        cursor: "pointer",
        display: "flex",
        flexShrink: 0,
        lineHeight: 1,
        padding: "0.3rem",
        transition: "color 0.15s, background 0.15s",
    }}
    onMouseEnter={(event) => {
        event.currentTarget.style.color = "white";
        event.currentTarget.style.background = "rgba(255,255,255,0.08)";
    }}
    onMouseLeave={(event) => {
        event.currentTarget.style.color = "rgba(255,255,255,0.5)";
        event.currentTarget.style.background = "none";
    }}
    >
    <CloseGlyph />
    </button>
);

// The tab strip of the Actions and Diplomacy panels. `tabs`: { key, label, icon,
// count, unread }; an unread count is blue, any other count grey. Wider than a
// phone's header, the strip scrolls sideways rather than wrapping.
export const PanelTabs = ({ tabs, active, onSelect, touch = false }) => (
    <div role="tablist" style={{ display: "flex", gap: ".35rem", minWidth: 0, overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
    {tabs.map(({ key, label, icon, count = 0, unread = false }) => {
        const selected = key === active;
        return (
            <button
            key={key}
            type="button"
            role="tab"
            aria-selected={selected}
            className="oh-tap-row"
            onClick={() => onSelect(key)}
            style={{
                alignItems: "center",
                background: selected ? "var(--oh-ui-active, var(--oh-grey-selected))" : "var(--oh-ui-overlay-card, rgba(255,255,255,.025))",
                border: "1px solid " + (selected ? "var(--oh-ui-accent, var(--oh-grey-border-strong))" : "var(--oh-ui-line, rgba(255,255,255,.07))"),
                borderRadius: "8px",
                color: selected ? "white" : "rgba(255,255,255,0.48)",
                cursor: "pointer",
                display: "flex",
                flex: "0 0 auto",
                fontFamily: "sans-serif",
                fontSize: ".76rem",
                fontWeight: 750,
                gap: ".38rem",
                padding: touch ? ".3rem .6rem" : ".35rem .7rem",
                whiteSpace: "nowrap",
            }}
            >
            {icon && <span aria-hidden="true" style={{ display: "inline-flex", opacity: .8 }}>{icon}</span>}
            <span>{label}</span>
            {Number(count) > 0 && (
                <span
                data-no-translate
                style={{
                    alignItems: "center",
                    background: selected ? "rgba(255,255,255,.14)" : unread ? "rgba(96,165,250,.16)" : "rgba(255,255,255,.08)",
                    borderRadius: 999,
                    color: selected ? "#fff" : unread ? "#93c5fd" : "rgba(255,255,255,0.6)",
                    display: "inline-flex",
                    fontSize: ".57rem",
                    fontWeight: 800,
                    height: "1.05rem",
                    justifyContent: "center",
                    minWidth: "1.05rem",
                    padding: "0 .25rem",
                }}
                >
                {count}
                </span>
            )}
            </button>
        );
    })}
    </div>
);
