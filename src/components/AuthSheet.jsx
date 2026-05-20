import { useState } from "react";
import { signInWithGoogle, signOut } from "../lib/auth.js";

export default function AuthSheet({ open, onClose, user }) {
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [errMsg, setErrMsg] = useState("");

  async function handleGoogleSignIn() {
    setStatus("loading");
    setErrMsg("");
    try {
      await signInWithGoogle();
      // Browser will redirect to Google; no further action needed here
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
    setErrMsg("");
    onClose();
  }

  return (
    <>
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0, 0, 0, 0.75)",
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
          background: "var(--color-surface)",
          borderStyle: "solid",
          borderWidth: "2px",
          borderTopColor: "var(--bevel-light)",
          borderLeftColor: "var(--bevel-light)",
          borderBottomColor: "var(--bevel-dark)",
          borderRightColor: "var(--bevel-dark)",
          borderRadius: 0,
          overflow: "hidden",
        }}>
          <div style={{ textAlign: "center", paddingTop: 12, paddingBottom: 2 }}>
            <div style={{
              display: "inline-block", width: 36, height: 4, borderRadius: 0,
              background: "var(--color-chrome-mid)",
            }} />
          </div>

          <div style={{
            background: "var(--color-titlebar)",
            color: "var(--color-titlebar-text)",
            fontFamily: "var(--font-system)",
            fontSize: "var(--font-size-base)",
            fontWeight: "bold",
            padding: "var(--space-1) var(--space-2)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span>SYNC BREWS</span>
            <button
              onClick={handleClose}
              style={{
                background: "var(--color-chrome)",
                color: "var(--color-text-chrome)",
                fontFamily: "var(--font-system)",
                fontSize: "var(--font-size-sm)",
                borderStyle: "solid",
                borderWidth: "2px",
                borderTopColor: "var(--bevel-light)",
                borderLeftColor: "var(--bevel-light)",
                borderBottomColor: "var(--bevel-dark)",
                borderRightColor: "var(--bevel-dark)",
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                borderRadius: 0,
                padding: 0,
                flexShrink: 0,
              }}
            >✕</button>
          </div>

          <div style={{
            padding: "24px 18px",
            paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
          }}>
            {user ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: "var(--font-size-sm)", fontFamily: "var(--font-system)", color: "var(--color-text-secondary)" }}>
                  Signed in as
                  <span style={{ color: "var(--color-text-primary)", marginLeft: 6 }}>
                    {user.user_metadata?.full_name || user.email}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
                  Your brews sync across devices automatically.
                </div>
                <button
                  onClick={handleSignOut}
                  style={{
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
                    padding: "var(--space-1) var(--space-3)",
                    cursor: "pointer",
                    borderRadius: 0,
                    letterSpacing: 3,
                  }}
                >SIGN OUT</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                  Sign in to access your brews on any device.
                </div>
                {errMsg && (
                  <div style={{ fontSize: 12, color: "var(--danger)" }}>{errMsg}</div>
                )}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={status === "loading"}
                  style={{
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
                    padding: "var(--space-1) var(--space-3)",
                    cursor: status === "loading" ? "default" : "pointer",
                    borderRadius: 0,
                    opacity: status === "loading" ? 0.5 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  }}
                >
                  {status !== "loading" && (
                    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      <path fill="none" d="M0 0h48v48H0z"/>
                    </svg>
                  )}
                  {status === "loading" ? "Redirecting…" : "Sign in with Google"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
