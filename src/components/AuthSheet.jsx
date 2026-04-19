import { useState } from "react";
import { signInWithEmail, signOut } from "../lib/auth.js";

export default function AuthSheet({ open, onClose, user }) {
  const [email,  setEmail]  = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errMsg, setErrMsg] = useState("");

  async function handleSend() {
    if (!email.trim()) return;
    setStatus("sending");
    setErrMsg("");
    try {
      await signInWithEmail(email.trim());
      setStatus("sent");
    } catch (err) {
      setErrMsg(err.message);
      setStatus("error");
    }
  }

  async function handleSignOut() {
    await signOut();
    onClose();
  }

  function handleClose() {
    setStatus("idle");
    setEmail("");
    setErrMsg("");
    onClose();
  }

  return (
    <>
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.65)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.28s",
        }}
      />

      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201,
        display: "flex", justifyContent: "center",
        transform: open ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
        pointerEvents: open ? "auto" : "none",
      }}>
        <div style={{
          width: "100%", maxWidth: 600,
          background: "var(--bg)",
          borderRadius: "20px 20px 0 0",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          borderLeft: "1px solid rgba(255,255,255,0.06)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}>
          <div style={{ textAlign: "center", paddingTop: 12, paddingBottom: 2 }}>
            <div style={{
              display: "inline-block", width: 36, height: 4, borderRadius: 2,
              background: "rgba(255,255,255,0.18)",
            }} />
          </div>

          <div style={{
            display: "flex", alignItems: "center",
            padding: "8px 18px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <span style={{
              flex: 1,
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 18, letterSpacing: 4,
              color: "var(--primary)",
            }}>
              SYNC BREWS
            </span>
            <button
              onClick={handleClose}
              style={{
                background: "transparent", border: "none",
                color: "rgba(255,255,255,0.45)", fontSize: 18,
                cursor: "pointer", padding: "4px 6px", lineHeight: 1,
              }}
            >✕</button>
          </div>

          <div style={{
            padding: "24px 18px",
            paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
          }}>
            {user ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  Signed in as
                  <span style={{ color: "var(--text)", marginLeft: 6 }}>{user.email}</span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
                  Your brews sync across devices automatically.
                </div>
                <button
                  onClick={handleSignOut}
                  style={{
                    padding: "13px 20px", borderRadius: 12,
                    border: "1px solid rgba(255,80,80,0.3)",
                    background: "rgba(255,80,80,0.07)",
                    color: "var(--danger)",
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 15, letterSpacing: 3,
                    cursor: "pointer",
                  }}
                >SIGN OUT</button>
              </div>
            ) : status === "sent" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
                <div style={{ fontSize: 36 }}>✉️</div>
                <div style={{ fontSize: 14, color: "var(--text)", textAlign: "center", lineHeight: 1.6 }}>
                  Check your email — tap the link to sign in
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Sent to {email}</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                  Sign in to access your brews on any device.
                </div>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "13px 16px", borderRadius: 10,
                    border: `1px solid ${errMsg ? "rgba(255,80,80,0.5)" : "rgba(255,255,255,0.12)"}`,
                    background: "rgba(255,255,255,0.05)",
                    color: "var(--text)", fontSize: 15,
                    fontFamily: "'DM Sans', sans-serif",
                    outline: "none",
                  }}
                />
                {errMsg && (
                  <div style={{ fontSize: 12, color: "var(--danger)" }}>{errMsg}</div>
                )}
                <button
                  onClick={handleSend}
                  disabled={status === "sending" || !email.trim()}
                  style={{
                    padding: "13px 20px", borderRadius: 12,
                    border: "1.5px solid rgba(91,143,255,0.35)",
                    background: "transparent",
                    color: "var(--primary)",
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 15, letterSpacing: 3,
                    cursor: status === "sending" || !email.trim() ? "default" : "pointer",
                    opacity: status === "sending" || !email.trim() ? 0.5 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  {status === "sending" ? "SENDING…" : "SEND MAGIC LINK"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
