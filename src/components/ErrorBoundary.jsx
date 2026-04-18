import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
        fontFamily: "'DM Sans', sans-serif",
        color: "var(--text)",
      }}>
        <div style={{ width: "100%", maxWidth: 400 }}>

          {/* Title */}
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 32, letterSpacing: "0.06em",
            color: "var(--danger)",
            marginBottom: 6,
          }}>
            SOMETHING WENT WRONG
          </div>

          <div style={{
            fontSize: 13, color: "var(--muted)",
            marginBottom: 20, lineHeight: 1.5,
          }}>
            The app encountered an unexpected error. Your deck data may still be intact.
          </div>

          {/* Error message */}
          <div style={{
            background: "var(--panel)",
            border: "1px solid rgba(255,80,80,0.2)",
            borderRadius: 10,
            padding: "14px 16px",
            marginBottom: 24,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 600,
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: "var(--muted)", marginBottom: 8,
            }}>
              Error
            </div>
            <pre style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12, color: "var(--danger)",
              whiteSpace: "pre-wrap", wordBreak: "break-word",
              margin: 0, lineHeight: 1.6,
            }}>
              {error.message || String(error)}
            </pre>
          </div>

          {/* Recovery buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              style={{
                width: "100%",
                background: "rgba(255,80,80,0.1)",
                border: "1.5px solid rgba(255,80,80,0.4)",
                borderRadius: 12, padding: "15px 20px",
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 16, letterSpacing: "0.1em",
                color: "var(--danger)", cursor: "pointer",
              }}
            >
              RELOAD APP  ·  CLEAR ALL DATA
            </button>

            <button
              onClick={() => window.location.reload()}
              style={{
                width: "100%",
                background: "rgba(91,143,255,0.08)",
                border: "1.5px solid rgba(91,143,255,0.3)",
                borderRadius: 12, padding: "15px 20px",
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 16, letterSpacing: "0.1em",
                color: "var(--primary)", cursor: "pointer",
              }}
            >
              KEEP DATA  ·  RELOAD
            </button>
          </div>

        </div>
      </div>
    );
  }
}
