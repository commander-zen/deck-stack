import SearchForm from "../components/SearchForm.jsx";

export default function SearchScreen({ onSearch, loading, error }) {
  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--bg)",
      color: "var(--text)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 480,
        padding: "56px 20px 80px",
        display: "flex",
        flexDirection: "column",
        gap: 22,
      }}>

        {/* ── Logo ── */}
        <div>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 52, letterSpacing: 6,
            color: "var(--primary)", lineHeight: 1,
          }}>
            DECK STACK
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5 }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", letterSpacing: 1 }}>
              Swipe cards · Build your deck
            </div>
            <div style={{
              padding: "2px 8px", borderRadius: 4,
              background: "rgba(91,143,255,0.15)",
              border: "1px solid rgba(91,143,255,0.35)",
              color: "var(--primary)",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 11, letterSpacing: 2,
            }}>
              COMMANDER
            </div>
          </div>
        </div>

        <SearchForm onSearch={onSearch} loading={loading} error={error} />

      </div>

      {/* ── Footer ── */}
      <footer style={{
        width: "100%",
        maxWidth: 480,
        padding: "0 20px 32px",
        marginTop: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
      }}>
        {/* Linktree */}
        <div style={{
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          justifyContent: "center",
        }}>
          {[
            { label: "GitHub", href: "https://github.com/commander-zen/deck-stack" },
            { label: "Report a Bug", href: "https://github.com/commander-zen/deck-stack/issues/new?labels=bug&template=bug_report.md" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12,
                color: "var(--primary)",
                textDecoration: "none",
                opacity: 0.7,
                letterSpacing: 0.5,
              }}
              onMouseOver={e => e.currentTarget.style.opacity = "1"}
              onMouseOut={e => e.currentTarget.style.opacity = "0.7"}
            >
              {label}
            </a>
          ))}
        </div>

        <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 0.5 }}>
          DECK STACK · MTG Commander Deck Builder
        </div>
      </footer>
    </div>
  );
}
