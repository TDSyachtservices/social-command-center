import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");

function showFatalError(message: string) {
  const el = document.getElementById("root");
  if (!el || el.childElementCount > 0) return;
  el.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;background:#faf9fc;color:#1f2937">
      <div style="max-width:520px;width:100%;border:1px solid #e5e7eb;border-radius:8px;background:#fff;padding:24px;box-shadow:0 1px 2px rgba(0,0,0,.05)">
        <h1 style="font-size:18px;font-weight:600;margin:0">Something went wrong</h1>
        <p style="font-size:14px;color:#6b7280;margin:8px 0 16px">The app failed to start. Reload to try again — the details below can help diagnose it.</p>
        <button onclick="window.location.reload()" style="border:0;border-radius:6px;background:#7c3aed;color:#fff;font-size:14px;font-weight:500;padding:8px 16px;cursor:pointer">Reload page</button>
        <pre style="margin-top:16px;max-height:240px;overflow:auto;white-space:pre-wrap;word-break:break-word;background:#f3f4f6;border-radius:6px;padding:12px;font-size:12px;color:#6b7280">${message.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string))}</pre>
      </div>
    </div>`;
}

window.addEventListener("error", (e) => {
  showFatalError(e.error?.stack || e.message || String(e.error));
});
window.addEventListener("unhandledrejection", (e) => {
  const r = e.reason;
  showFatalError(r?.stack || r?.message || String(r));
});

try {
  if (!rootElement) throw new Error('Root element "#root" not found');
  createRoot(rootElement).render(<App />);
} catch (err) {
  showFatalError(err instanceof Error ? err.stack || err.message : String(err));
}
