import { useState } from "react";

export const NAV_HEIGHT = 60;

function StackIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="14" height="17" rx="2"/>
      <path d="M8 2h10a2 2 0 0 1 2 2v14" strokeOpacity="0.45"/>
    </svg>
  );
}

function PileIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7.5" height="10" rx="1.5"/>
      <rect x="13.5" y="3" width="7.5" height="10" rx="1.5"/>
      <rect x="3" y="15.5" width="7.5" height="5.5" rx="1.5"/>
      <rect x="13.5" y="15.5" width="7.5" height="5.5" rx="1.5"/>
    </svg>
  );
}

function SearchIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.35-4.35"/>
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

function ChevronRight({ color = "rgba(255,255,255,0.3)" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}

export default function BottomNav({ screen, pileCount, maybeCount, onGoToStack, onGoToPile, onSearch, onProfile }) {
  const [pileSheetOpen, setPileSheetOpen] = useState(false);

  const activeColor   = "var(--primary)";
  const inactiveColor = "rgba(255,255,255,0.35)";
  const pileActive    = screen === "pile" || pileSheetOpen;

  function handlePilePress() {
    setPileSheetOpen(v => !v);
  }

  function handleGoToPile(tab) {
    setPileSheetOpen(false);
    onGoToPile(tab);
  }

  const tabs = [
    {
      id: "stack",
      label: "STACK",
      Icon: StackIcon,
      active: screen === "swipe",
      onClick: onGoToStack,
    },
    {
      id: "pile",
      label: "PILE",
      Icon: PileIcon,
      active: pileActive,
      onClick: handlePilePress,
    },
    {
      id: "search",
      label: "SEARCH",
      Icon: SearchIcon,
      active: false,
      onClick: onSearch,
    },
    {
      id: "profile",
      label: "PROFILE",
      Icon: ProfileIcon,
      active: false,
      onClick: onProfile,
    },
  ];

  return (
    <>
      {/* Pile mini-sheet */}
      {pileSheetOpen && (
        <>
          <div
            onClick={() => setPileSheetOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 149 }}
          />
          <div style={{
            position: "fixed",
            bottom: NAV_HEIGHT,
            left: 0,
            right: 0,
            zIndex: 150,
            maxWidth: 600,
            margin: "0 auto",
            background: "var(--panel2)",
            borderRadius: "16px 16px 0 0",
            border: "1px solid rgba(255,255,255,0.08)",
            borderBottom: "none",
            animation: "navSheetUp 0.22s cubic-bezier(0.32,0.72,0,1) both",
          }}>
            <style>{`@keyframes navSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

            {/* Drag handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.18)" }} />
            </div>

            {/* Section label */}
            <div style={{
              padding: "0 20px 10px",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 11, letterSpacing: 3,
              color: "var(--muted)",
            }}>
              NAVIGATE TO
            </div>

            {/* DECK row */}
            <button
              onClick={() => handleGoToPile("deck")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "14px 20px",
                background: "transparent", border: "none",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <PileIcon color="var(--primary)" />
                <span style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 16, letterSpacing: 3,
                  color: "var(--text)",
                }}>DECK</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 600, fontSize: 15,
                  color: "var(--primary)",
                  background: "rgba(91,143,255,0.15)",
                  padding: "2px 10px", borderRadius: 10,
                  minWidth: 28, textAlign: "center",
                }}>
                  {pileCount}
                </span>
                <ChevronRight />
              </div>
            </button>

            {/* MAYBE row */}
            <button
              onClick={() => handleGoToPile("maybe")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "14px 20px",
                background: "transparent", border: "none",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <PileIcon color="var(--secondary)" />
                <span style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 16, letterSpacing: 3,
                  color: "var(--text)",
                }}>MAYBE</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 600, fontSize: 15,
                  color: "var(--secondary)",
                  background: "rgba(167,139,250,0.15)",
                  padding: "2px 10px", borderRadius: 10,
                  minWidth: 28, textAlign: "center",
                }}>
                  {maybeCount ?? 0}
                </span>
                <ChevronRight />
              </div>
            </button>

            <div style={{ height: 8 }} />
          </div>
        </>
      )}

      {/* Nav bar */}
      <div style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        zIndex: 160,
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
          {tabs.map(({ id, label, Icon, active, onClick }) => (
            <button
              key={id}
              onClick={onClick}
              style={{
                flex: 1,
                height: NAV_HEIGHT,
                background: "transparent",
                border: "none",
                borderTop: active
                  ? "2px solid var(--primary)"
                  : "2px solid transparent",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                paddingTop: 4,
                transition: "border-color 0.15s",
              }}
            >
              <Icon color={active ? activeColor : inactiveColor} />
              <span style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 10,
                letterSpacing: 2,
                color: active ? activeColor : inactiveColor,
                transition: "color 0.15s",
              }}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
