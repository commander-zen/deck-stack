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
    </div>
  );
}
