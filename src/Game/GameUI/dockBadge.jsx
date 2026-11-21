import React from "react";

// The count on a dock launcher's corner (chat.jsx Diplomacy, social.jsx Rostra):
// "это нужно сделать бейдж с числом нотификации, для Rostra аналогично" (the
// owner, 2026-11-21). One look for both, in place of the separate 🔔 button
// Diplomacy had above the dock. The launcher's icon is its anchor
// (position: relative).
export const DockBadge = ({ count }) => {
    const value = Number(count) || 0;
    if (value <= 0) return null;
    return (
        <span
        data-no-translate
        style={{
            alignItems: "center",
            background: "#dc2626",
            border: "1px solid rgba(255,255,255,0.35)",
            borderRadius: "999px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
            color: "white",
            display: "flex",
            fontSize: "0.62rem",
            fontWeight: 700,
            height: "1.05rem",
            justifyContent: "center",
            lineHeight: 1,
            minWidth: "1.05rem",
            padding: "0 0.2rem",
            position: "absolute",
            right: "-0.8rem",
            top: "-0.55rem",
        }}
        >
        {value > 9 ? "9+" : value}
        </span>
    );
};
