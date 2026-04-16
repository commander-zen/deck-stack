export const NAV_HEIGHT = 56;

export default function BottomNav({ screen, pileCount, onTab }) {
  const tabs = [
    { id: "swipe", label: "SWIPE" },
    { id: "pile",  label: `PILE (${pileCount})` },
  ];

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: 600,
        margin: "0 auto",
        background: "rgba(13,13,15,0.97)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
        display: "flex",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {tabs.map(({ id, label }) => {
          const active = screen === id;
          return (
            <button
              key={id}
              onClick={() => onTab(id)}
              style={{
                flex: 1,
                height: NAV_HEIGHT,
                background: "transparent",
                border: "none",
                borderTop: active
                  ? "2px solid var(--primary)"
                  : "2px solid transparent",
                color: active ? "var(--primary)" : "rgba(255,255,255,0.38)",
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 14,
                letterSpacing: 3,
                cursor: "pointer",
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
