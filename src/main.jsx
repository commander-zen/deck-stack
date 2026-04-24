import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

// Pre-React safety net: if the JS bundle loads but React crashes before mounting,
// show the error text in the #root div instead of a blank screen.
const rootEl = document.getElementById("root");
window.addEventListener("error", (e) => {
  if (rootEl && !rootEl._reactRootContainer && rootEl.childElementCount === 0) {
    rootEl.style.cssText = "display:flex;align-items:center;justify-content:center;min-height:100dvh;background:#0d0d0f;padding:24px;box-sizing:border-box";
    rootEl.innerHTML = `<div style="max-width:400px;font-family:monospace;color:#ff4d6d"><div style="font-size:20px;margin-bottom:12px">LOAD ERROR</div><pre style="font-size:12px;white-space:pre-wrap;word-break:break-word;color:#e8e8f0">${String(e.error?.message ?? e.message)}\n\n${String(e.error?.stack ?? "")}</pre></div>`;
  }
});

registerSW({ immediate: true });

createRoot(rootEl).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
