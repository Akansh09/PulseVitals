// PulseVitals MV3 service worker — v2.0.
// - Receives CWV verdicts from content scripts.
// - Updates a tab-scoped colored badge on the toolbar icon.
// - Checks each verdict against the user's budgets (chrome.storage.sync) and fires
//   a Chrome notification when the budget is exceeded — once per URL per threshold crossing.
// - Clears the badge when a tab navigates to a new URL.

const BADGE_COLORS = { good: "#16A34A", warn: "#D97706", bad: "#DC2626" };

function setBadge(tabId, verdict) {
  if (typeof tabId !== "number") return;
  if (verdict === "none" || !BADGE_COLORS[verdict]) {
    chrome.action.setBadgeText({ tabId, text: "" }).catch(() => {});
    return;
  }
  chrome.action.setBadgeText({ tabId, text: " " }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLORS[verdict] }).catch(() => {});
}

async function maybeAlert(tabId, url, metrics) {
  if (!metrics) return;
  try {
    const { alerts, budgetLcp, budgetCls, budgetInp } = await chrome.storage.sync.get({
      alerts: false, budgetLcp: 2500, budgetCls: 0.10, budgetInp: 200
    });
    if (!alerts || !url) return;

    const exceeded = [];
    if (Number.isFinite(metrics.lcpMs) && metrics.lcpMs > budgetLcp) exceeded.push(`LCP ${Math.round(metrics.lcpMs)}ms > ${budgetLcp}ms`);
    if (Number.isFinite(metrics.cls) && metrics.cls > budgetCls) exceeded.push(`CLS ${metrics.cls.toFixed(2)} > ${budgetCls}`);
    if (Number.isFinite(metrics.inp) && metrics.inp > budgetInp) exceeded.push(`INP ${Math.round(metrics.inp)}ms > ${budgetInp}ms`);
    if (!exceeded.length) return;

    const lastAlertKey = `alert::${url}`;
    const prev = await chrome.storage.local.get(lastAlertKey);
    const last = prev[lastAlertKey] || 0;
    if (Date.now() - last < 10 * 60 * 1000) return;
    await chrome.storage.local.set({ [lastAlertKey]: Date.now() });

    const has = await chrome.permissions.contains({ permissions: ["notifications"] }).catch(() => false);
    if (!has) return;

    chrome.notifications.create(`pv-${tabId}-${Date.now()}`, {
      type: "basic",
      iconUrl: "icons/128.png",
      title: "PulseVitals — budget exceeded",
      message: exceeded.join(" · ") + `  (${url.replace(/^https?:\/\//, "")})`,
      priority: 1
    }, () => { /* swallow lastError */ });
  } catch (_e) { /* best effort */ }
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!message || message.type !== "PULSEVITALS_SET_VERDICT") return;
  const tabId = sender && sender.tab && sender.tab.id;
  setBadge(tabId, message.verdict);
  if (message.verdict === "bad" || message.verdict === "warn") {
    maybeAlert(tabId, message.url, message.metrics);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    chrome.action.setBadgeText({ tabId, text: "" }).catch(() => {});
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local.set({ "pv::needs-consent": true }).catch(() => {});
  } else if (details.reason === "update") {
    chrome.storage.local.set({ "pv::whatsnew-version": chrome.runtime.getManifest().version }).catch(() => {});
  }
});
