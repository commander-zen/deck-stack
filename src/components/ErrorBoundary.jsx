import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, source: null };
    this._onError = this._onError.bind(this);
    this._onUnhandledRejection = this._onUnhandledRejection.bind(this);
  }

  componentDidMount() {
    window.addEventListener("error", this._onError);
    window.addEventListener("unhandledrejection", this._onUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener("error", this._onError);
    window.removeEventListener("unhandledrejection", this._onUnhandledRejection);
  }

  _onError(event) {
    if (this.state.error) return;
    this.setState({ error: event.error ?? new Error(event.message), source: "global" });
  }

  _onUnhandledRejection(event) {
    if (this.state.error) return;
    const err = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    this.setState({ error: err, source: "promise" });
  }

  static getDerivedStateFromError(error) {
    return { error, source: "render" };
  }

  render() {
    const { error, source } = this.state;
    if (!error) return this.props.children;

    const sourceLabel = source === "render" ? "React render" : source === "promise" ? "Unhandled promise" : "Global error";

    return (
      <div style={{
        minHeight: "100dvh",
        background: "#0d0d0f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
        fontFamily: "system-ui, sans-serif",
        color: "#e8e8f0",
      }}>
        <div style={{ width: "100%", maxWidth: 400 }}>

          {/* Title */}
          <div style={{
            fontFamily: "'Noto Sans', sans-serif",
            fontSize: 20, letterSpacing: "0.06em",
            color: "#ff4d6d",
            marginBottom: 6,
          }}>
            SOMETHING WENT WRONG
          </div>

          <div style={{
            fontSize: 13, color: "#555566",
            marginBottom: 20, lineHeight: 1.5,
          }}>
            The app encountered an unexpected error. Your deck data may still be intact.
          </div>

          {/* Error message */}
          <div style={{
            background: "var(--color-surface)",
            borderStyle: "solid",
            borderWidth: "2px",
            borderTopColor: "var(--bevel-light)",
            borderLeftColor: "var(--bevel-light)",
            borderBottomColor: "var(--bevel-dark)",
            borderRightColor: "var(--bevel-dark)",
            borderRadius: 0,
            padding: "14px 16px",
            marginBottom: 24,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 600,
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: "#555566", marginBottom: 8,
            }}>
              {sourceLabel}
            </div>
            <pre style={{
              fontFamily: "'Noto Sans', sans-serif",
              fontSize: 12, color: "#ff4d6d",
              whiteSpace: "pre-wrap", wordBreak: "break-word",
              margin: 0, lineHeight: 1.6,
            }}>
              {error.message || String(error)}
            </pre>
            {error.stack && (
              <pre style={{
                fontFamily: "'Noto Sans', sans-serif",
                fontSize: 10, color: "#555566",
                whiteSpace: "pre-wrap", wordBreak: "break-word",
                margin: "10px 0 0", lineHeight: 1.5,
              }}>
                {error.stack}
              </pre>
            )}
          </div>

          {/* Recovery buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              style={{
                width: "100%",
                background: "#800000",
                color: "#ffffff",
                fontFamily: "var(--font-system)",
                fontSize: "var(--font-size-sm)",
                borderStyle: "solid",
                borderWidth: "2px",
                borderTopColor: "#ffffff",
                borderLeftColor: "#ffffff",
                borderBottomColor: "#400000",
                borderRightColor: "#400000",
                padding: "15px 20px",
                cursor: "pointer",
                borderRadius: 0,
                letterSpacing: "0.1em",
              }}
            >
              RELOAD APP  ·  CLEAR ALL DATA
            </button>

            <button
              onClick={() => window.location.reload()}
              style={{
                width: "100%",
                background: "var(--color-titlebar)",
                color: "var(--color-titlebar-text)",
                fontFamily: "var(--font-system)",
                fontSize: "var(--font-size-sm)",
                borderStyle: "solid",
                borderWidth: "2px",
                borderTopColor: "#ffffff",
                borderLeftColor: "#ffffff",
                borderBottomColor: "#000040",
                borderRightColor: "#000040",
                padding: "15px 20px",
                cursor: "pointer",
                borderRadius: 0,
                letterSpacing: "0.1em",
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
