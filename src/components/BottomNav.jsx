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

function ProfileIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/>
    </svg>
  );
}

export default function BottomNav({ screen, onGoToStack, onGoToPile, onGoToMaybe, onGoToProfile }) {
  const active   = "var(--primary)";
  const inactive = "rgba(255,255,255,0.35)";

  const tabs = [
    { id: "stack",   label: "STACK",   Icon: StackIcon,   isActive: screen === "search" || screen === "swipe", onClick: onGoToStack },
    { id: "pile",    label: "PILE",    Icon: PileIcon,    isActive: screen === "pile",   onClick: onGoToPile },
    { id: "maybe",   label: "MAYBE",   Icon: MaybeIcon,   isActive: screen === "maybe",  onClick: onGoToMaybe },
    { id: "profile", label: "PROFILE", Icon: ProfileIcon, isActive: screen === "brews",  onClick: onGoToProfile },
  ];

  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100 }}>
      <div style={{
        maxWidth: 600, margin: "0 auto",
        background: "rgba(13,13,15,0.97)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
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
