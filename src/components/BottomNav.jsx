export const NAV_HEIGHT = 60;

function StackIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="14" height="17" rx="2"/>
      <path d="M8 2h10a2 2 0 0 1 2 2v14" strokeOpacity="0.4"/>
    </svg>
  );
}

function PileIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M3 12h18M3 18h18"/>
    </svg>
  );
}

function MaybeIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3"/>
      <circle cx="12" cy="17" r="0.5" fill={color}/>
    </svg>
  );
}

function TagsIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  );
}

function BrewsIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6"/>
      <path d="M9 3v5l-4.5 7A2 2 0 0 0 6.22 18h11.56a2 2 0 0 0 1.72-3L15 8V3"/>
      <path d="M6.5 13.5h11"/>
    </svg>
  );
}

export default function BottomNav({ screen, onGoToStack, onGoToPile, onGoToMaybe, onGoToTags, onGoToProfile }) {
  const active   = "var(--primary)";
  const inactive = "rgba(255,255,255,0.35)";

  const tabs = [
    { id: "stack", label: "STACK", Icon: StackIcon, isActive: screen === "search" || screen === "swipe", onClick: onGoToStack },
    { id: "pile",  label: "PILE",  Icon: PileIcon,  isActive: screen === "pile",  onClick: onGoToPile },
    { id: "maybe", label: "MAYBE", Icon: MaybeIcon, isActive: screen === "maybe", onClick: onGoToMaybe },
    { id: "tags",  label: "TAGS",  Icon: TagsIcon,  isActive: screen === "tags",  onClick: onGoToTags },
    { id: "brews", label: "BREWS", Icon: BrewsIcon, isActive: screen === "brews", onClick: onGoToProfile },
  ];

  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100 }}>
      <div style={{
        maxWidth: 600, margin: "0 auto",
        background: "rgba(0,0,0,0.97)",
        borderTop: "0.5px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
        display: "flex",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {tabs.map(({ id, label, Icon, isActive, onClick }) => (
          <button
            key={id}
            onClick={onClick}
            style={{
              flex: 1, height: NAV_HEIGHT,
              background: "transparent", border: "none",
              borderTop: isActive ? "2px solid var(--primary)" : "2px solid transparent",
              cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 3, paddingTop: 4,
              transition: "border-color 0.15s",
            }}
          >
            <Icon color={isActive ? active : inactive} />
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 10, letterSpacing: 2,
              color: isActive ? active : inactive,
              transition: "color 0.15s",
            }}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
