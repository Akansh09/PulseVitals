// PulseVitals content script — v2.1.
// - Nav timing, paint, LCP, CLS, INP, storage, resources (full 100 with startTime), platform, SEO, axe.
// - JS error capture (window.error + unhandledrejection, cap 20).
// - Image DOM audit (srcset / loading / format) for image-optimization insights.
// - Optional on-page pin overlay in a shadow DOM.
// - SPA soft-nav, self-perf budget.

let cachedTimings = null;
const cachedPaint = { "first-paint": null, "first-contentful-paint": null };
let cachedLcp = null;

// CLS (session-windowed)
let clsSessionValue = 0;
let clsSessionEntries = [];
let cachedCls = null;

// INP
const interactionDurations = new Map();
let cachedInp = null;

// JS errors
const cachedJsErrors = [];
const MAX_JS_ERRORS = 20;

// Self-perf
let selfPerfMs = 0;

function wrapSelfPerf(fn) {
  const t = performance.now();
  try { return fn(); }
  finally { selfPerfMs += performance.now() - t; }
}

function captureTimings() {
  wrapSelfPerf(() => {
    if (!window.performance || !window.performance.timing) return;
    const t = window.performance.timing.toJSON();
    if (!t.loadEventEnd && !t.domComplete) return;
    cachedTimings = t;
  });
}

function observePaintAndLcp() {
  if (typeof PerformanceObserver === "undefined") return;
  const originMs = (window.performance && window.performance.timeOrigin) || 0;
  try {
    new PerformanceObserver((list) => wrapSelfPerf(() => {
      for (const entry of list.getEntries()) {
        if (entry.name in cachedPaint) cachedPaint[entry.name] = originMs + entry.startTime;
      }
    })).observe({ type: "paint", buffered: true });
  } catch (_e) {}
  try {
    new PerformanceObserver((list) => wrapSelfPerf(() => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) cachedLcp = originMs + last.startTime;
      notifyVerdict();
      updatePin();
    })).observe({ type: "largest-contentful-paint", buffered: true });
  } catch (_e) {}
}

function observeCls() {
  if (typeof PerformanceObserver === "undefined") return;
  try {
    new PerformanceObserver((list) => wrapSelfPerf(() => {
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue;
        const first = clsSessionEntries[0];
        const last = clsSessionEntries[clsSessionEntries.length - 1];
        if (clsSessionValue > 0 && first && last &&
            entry.startTime - last.startTime < 1000 &&
            entry.startTime - first.startTime < 5000) {
          clsSessionValue += entry.value;
          clsSessionEntries.push(entry);
        } else {
          clsSessionValue = entry.value;
          clsSessionEntries = [entry];
        }
        if (cachedCls === null || clsSessionValue > cachedCls) cachedCls = clsSessionValue;
      }
      notifyVerdict();
      updatePin();
    })).observe({ type: "layout-shift", buffered: true });
  } catch (_e) {}
}

function recomputeInp() {
  if (interactionDurations.size === 0) { cachedInp = null; return; }
  const values = Array.from(interactionDurations.values()).sort((a, b) => a - b);
  if (values.length < 50) { cachedInp = values[values.length - 1]; return; }
  const idx = Math.min(values.length - 1, Math.floor(values.length * 0.98));
  cachedInp = values[idx];
}

function observeInp() {
  if (typeof PerformanceObserver === "undefined") return;
  try {
    new PerformanceObserver((list) => wrapSelfPerf(() => {
      for (const entry of list.getEntries()) {
        if (!entry.interactionId || entry.interactionId <= 0) continue;
        const current = interactionDurations.get(entry.interactionId) || 0;
        if (entry.duration > current) interactionDurations.set(entry.interactionId, entry.duration);
      }
      recomputeInp();
      notifyVerdict();
      updatePin();
    })).observe({ type: "event", durationThreshold: 40, buffered: true });
  } catch (_e) {}
}

// ---------- JS error capture ----------

function recordError(err) {
  if (!err) return;
  cachedJsErrors.push(err);
  while (cachedJsErrors.length > MAX_JS_ERRORS) cachedJsErrors.shift();
}

window.addEventListener("error", (e) => {
  try {
    recordError({
      message: String((e && e.message) || "Error"),
      source: String((e && e.filename) || ""),
      line: Number((e && e.lineno) || 0),
      column: Number((e && e.colno) || 0),
      kind: "error",
      timestamp: Date.now()
    });
  } catch (_x) {}
}, true);

window.addEventListener("unhandledrejection", (e) => {
  try {
    const reason = e && e.reason;
    const msg = reason && (reason.message || String(reason));
    recordError({
      message: "Unhandled promise rejection: " + String(msg || "unknown"),
      source: "",
      line: 0,
      column: 0,
      kind: "unhandledrejection",
      timestamp: Date.now()
    });
  } catch (_x) {}
}, true);

// ---------- Verdict + SW messaging ----------

function rateLcp(ms) { return ms <= 2500 ? "good" : ms <= 4000 ? "warn" : "bad"; }
function rateCls(v) { return v <= 0.1 ? "good" : v <= 0.25 ? "warn" : "bad"; }
function rateInp(ms) { return ms <= 200 ? "good" : ms <= 500 ? "warn" : "bad"; }

function computeVerdict() {
  const start = cachedTimings ? cachedTimings.navigationStart : 0;
  const lcpMs = (cachedLcp && start) ? cachedLcp - start : null;
  const ratings = [];
  if (lcpMs !== null) ratings.push(rateLcp(lcpMs));
  if (cachedCls !== null) ratings.push(rateCls(cachedCls));
  if (cachedInp !== null) ratings.push(rateInp(cachedInp));
  if (ratings.length === 0) return "none";
  if (ratings.indexOf("bad") !== -1) return "bad";
  if (ratings.indexOf("warn") !== -1) return "warn";
  return "good";
}

let lastVerdictSent;
function notifyVerdict() {
  const verdict = computeVerdict();
  if (verdict === lastVerdictSent) return;
  lastVerdictSent = verdict;
  try {
    chrome.runtime.sendMessage({
      type: "PULSEVITALS_SET_VERDICT",
      verdict,
      metrics: {
        lcpMs: (cachedLcp && cachedTimings) ? cachedLcp - cachedTimings.navigationStart : null,
        cls: cachedCls,
        inp: cachedInp
      },
      url: window.location && window.location.href
    });
  } catch (_e) {}
}

// ---------- Storage + resources ----------

function storageByteCount(storage) {
  try {
    let bytes = 0;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      const val = storage.getItem(key) || "";
      bytes += ((key || "").length + val.length) * 2;
    }
    return bytes;
  } catch (_e) { return null; }
}

async function getStorage() {
  const localBytes = storageByteCount(window.localStorage);
  const sessionBytes = storageByteCount(window.sessionStorage);
  let usage = null, quota = null;
  try {
    if (navigator.storage && typeof navigator.storage.estimate === "function") {
      const est = await navigator.storage.estimate();
      usage = typeof est.usage === "number" ? est.usage : null;
      quota = typeof est.quota === "number" ? est.quota : null;
    }
  } catch (_e) {}
  return { localStorage: localBytes, sessionStorage: sessionBytes, usage, quota };
}

function getAllResources() {
  if (!window.performance || typeof window.performance.getEntriesByType !== "function") return [];
  const entries = window.performance.getEntriesByType("resource") || [];
  return entries.slice(0, 100).map((e) => ({
    name: e.name,
    transferSize: typeof e.transferSize === "number" ? e.transferSize : 0,
    duration: Math.round(typeof e.duration === "number" ? e.duration : 0),
    startTime: Math.round(typeof e.startTime === "number" ? e.startTime : 0),
    initiatorType: e.initiatorType || ""
  }));
}

// ---------- Image DOM audit ----------

function isAboveFold(el) {
  try {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight || 800;
    return r.top < vh && r.bottom > 0 && r.top < vh * 1.2;
  } catch (_e) { return false; }
}

function imageFormat(url) {
  if (!url) return "";
  const m = String(url).match(/\.(jpg|jpeg|png|webp|avif|gif|svg)(\?|#|$)/i);
  return m ? m[1].toLowerCase() : "";
}

function captureImageAudit() {
  try {
    const imgs = Array.from(document.querySelectorAll("img")).slice(0, 60);
    return imgs.map((img) => ({
      src: img.currentSrc || img.src || "",
      hasSrcset: !!(img.getAttribute("srcset") || "").trim(),
      loading: (img.getAttribute("loading") || "").toLowerCase(),
      format: imageFormat(img.currentSrc || img.src),
      naturalWidth: img.naturalWidth || 0,
      naturalHeight: img.naturalHeight || 0,
      renderedWidth: Math.round(img.getBoundingClientRect().width),
      aboveFold: isAboveFold(img)
    }));
  } catch (_e) { return []; }
}

// ---------- Platform + SEO + axe ----------

function detectPlatform() {
  try {
    const html = document.documentElement;
    const gen = (document.querySelector("meta[name='generator']") || {}).content || "";
    const body = document.body ? document.body.className : "";
    if (/Shopify/i.test(gen) || /shopify/i.test(body) || window.Shopify) return "shopify";
    if (/WordPress/i.test(gen) || document.querySelector("link[href*='wp-content']") || document.querySelector("link[href*='wp-includes']")) return "wordpress";
    if (/Webflow/i.test(gen) || html.getAttribute("data-wf-page")) return "webflow";
    if (document.querySelector("script#__NEXT_DATA__") || window.__NEXT_DATA__) return "nextjs";
    if (/Wix/i.test(gen) || html.getAttribute("data-wix")) return "wix";
    if (/Squarespace/i.test(gen) || (window.Static && window.Static.SQUARESPACE_CONTEXT)) return "squarespace";
    return null;
  } catch (_e) { return null; }
}

function collectSeo() {
  try {
    const titleEl = document.querySelector("title");
    const title = (titleEl ? titleEl.textContent || "" : "").trim();
    const metaDescEl = document.querySelector("meta[name='description']");
    const metaDesc = ((metaDescEl && metaDescEl.content) || "").trim();
    const h1Count = document.querySelectorAll("h1").length;
    const canonical = !!document.querySelector("link[rel='canonical'][href]");
    const ogImage = !!document.querySelector("meta[property='og:image'][content]");
    const viewportEl = document.querySelector("meta[name='viewport']");
    const viewport = !!viewportEl && /width\s*=/.test(viewportEl.content || "");
    const jsonLd = document.querySelectorAll("script[type='application/ld+json']").length;
    return { titleLen: title.length, metaDescLen: metaDesc.length, h1Count, canonical, ogImage, viewport, jsonLdCount: jsonLd };
  } catch (_e) { return null; }
}

function runAxeLite() {
  try {
    if (typeof PulseVitalsAxeLite === "object" && PulseVitalsAxeLite && typeof PulseVitalsAxeLite.run === "function") {
      return PulseVitalsAxeLite.run(document);
    }
  } catch (_e) {}
  return [];
}

// ---------- Pin overlay (Shadow DOM) ----------

let pinShadowRoot = null;
let pinHost = null;

async function maybeMountPin() {
  try {
    const { pinEnabled } = await chrome.storage.sync.get({ pinEnabled: false });
    if (!pinEnabled) return;
    if (sessionStorage.getItem("pv::pin-dismissed") === "1") return;
    if (pinHost) return;
    if (!document.body && !document.documentElement) return;

    pinHost = document.createElement("div");
    pinHost.id = "pulsevitals-pin-host";
    pinHost.style.cssText = "all: initial; position: fixed; bottom: 16px; right: 16px; z-index: 2147483647;";
    pinShadowRoot = pinHost.attachShadow({ mode: "open" });
    pinShadowRoot.innerHTML =
      '<style>' +
        '.card{display:flex;align-items:center;gap:10px;padding:8px 10px 8px 12px;' +
        'background:#0F172A;color:#FFFFFF;border-radius:10px;' +
        'box-shadow:0 6px 24px rgba(0,0,0,0.25);' +
        'font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:12px;' +
        'cursor:default;transition:opacity .15s}' +
        '@media (prefers-color-scheme: dark){.card{background:#E6EDF3;color:#0B0F14}}' +
        '.verdict{width:12px;height:12px;border-radius:50%;background:#94A3B8;flex-shrink:0}' +
        '.verdict.good{background:#16A34A}' +
        '.verdict.warn{background:#D97706}' +
        '.verdict.bad{background:#DC2626}' +
        '.label{font-size:10px;opacity:.7}' +
        '.values{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:600;font-size:11px}' +
        '.close{background:none;border:none;color:inherit;cursor:pointer;' +
        'font-size:13px;opacity:.6;padding:0 2px;margin-left:4px}' +
        '.close:hover{opacity:1}' +
      '</style>' +
      '<div class="card" role="status" aria-label="PulseVitals pin">' +
        '<span class="verdict" id="v"></span>' +
        '<div><div class="label">PulseVitals</div>' +
        '<div class="values" id="m">Measuring\u2026</div></div>' +
        '<button class="close" id="c" title="Hide until next page load" aria-label="Dismiss">\u00d7</button>' +
      '</div>';
    const close = pinShadowRoot.getElementById("c");
    if (close) close.addEventListener("click", () => {
      try { sessionStorage.setItem("pv::pin-dismissed", "1"); } catch (_e) {}
      unmountPin();
    });
    (document.body || document.documentElement).appendChild(pinHost);
    updatePin();
  } catch (_e) { /* CSP may reject style tag; silently no-op */ }
}

function unmountPin() {
  try {
    if (pinHost && pinHost.parentNode) pinHost.parentNode.removeChild(pinHost);
  } catch (_e) {}
  pinHost = null;
  pinShadowRoot = null;
}

function updatePin() {
  if (!pinShadowRoot) return;
  try {
    const start = cachedTimings ? cachedTimings.navigationStart : 0;
    const lcpMs = (cachedLcp && start) ? Math.round(cachedLcp - start) : null;
    const verdict = computeVerdict();
    const vEl = pinShadowRoot.getElementById("v");
    const mEl = pinShadowRoot.getElementById("m");
    if (vEl) vEl.className = "verdict" + (verdict !== "none" ? " " + verdict : "");
    if (mEl) {
      const parts = [];
      if (lcpMs !== null) parts.push("LCP " + (lcpMs / 1000).toFixed(1) + "s");
      else parts.push("LCP \u2014");
      if (cachedCls !== null) parts.push("CLS " + cachedCls.toFixed(2));
      mEl.textContent = parts.join(" \u00b7 ") || "Measuring\u2026";
    }
  } catch (_e) {}
}

// ---------- Payload builder ----------

async function buildPayload() {
  if (!cachedTimings) captureTimings();
  if (!cachedTimings) return null;
  const t0 = performance.now();
  const storage = await getStorage();
  const allResources = getAllResources();
  const resources = allResources.slice().sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0)).slice(0, 10);
  const platform = detectPlatform();
  const seo = collectSeo();
  const axe = runAxeLite();
  const imageAudit = captureImageAudit();
  const buildMs = performance.now() - t0;
  return Object.assign({}, cachedTimings, cachedPaint, {
    "largest-contentful-paint": cachedLcp,
    cls: cachedCls,
    inp: cachedInp,
    storage,
    resources,
    allResources,
    platform,
    seo,
    axe,
    imageAudit,
    jsErrors: cachedJsErrors.slice(),
    selfPerf: { contentScriptMs: Math.round(selfPerfMs), payloadBuildMs: Math.round(buildMs) }
  });
}

function onMessage(message, _sender, sendResponse) {
  if (!message) return false;
  if (message.type === "PULSEVITALS_GET_TIMINGS") {
    buildPayload().then((payload) => sendResponse({ type: "PULSEVITALS_TIMINGS", payload }));
    return true;
  }
  if (message.type === "PULSEVITALS_SET_PIN") {
    if (message.enabled) maybeMountPin();
    else unmountPin();
    return false;
  }
  return false;
}

// ---------- SPA soft-nav ----------

function wireSpaSoftNav() {
  let lastUrl = location.href;
  const resetAndCapture = () => {
    cachedTimings = null;
    cachedPaint["first-paint"] = null;
    cachedPaint["first-contentful-paint"] = null;
    cachedLcp = null;
    clsSessionValue = 0;
    clsSessionEntries = [];
    cachedCls = null;
    interactionDurations.clear();
    cachedInp = null;
    cachedJsErrors.length = 0;
    lastVerdictSent = undefined;
    try { sessionStorage.removeItem("pv::pin-dismissed"); } catch (_e) {}
    setTimeout(() => { captureTimings(); notifyVerdict(); updatePin(); }, 300);
  };
  const check = () => {
    if (location.href !== lastUrl) { lastUrl = location.href; resetAndCapture(); }
  };
  try {
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function () { origPush.apply(this, arguments); setTimeout(check, 0); };
    history.replaceState = function () { origReplace.apply(this, arguments); setTimeout(check, 0); };
    window.addEventListener("popstate", () => setTimeout(check, 0));
    window.addEventListener("hashchange", () => setTimeout(check, 0));
  } catch (_e) {}
}

// ---------- Bootstrap ----------

if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener(onMessage);
}

observePaintAndLcp();
observeCls();
observeInp();
wireSpaSoftNav();

if (document.readyState === "complete") {
  setTimeout(() => { captureTimings(); notifyVerdict(); maybeMountPin(); }, 50);
} else {
  window.addEventListener("load", () => setTimeout(() => { captureTimings(); notifyVerdict(); maybeMountPin(); }, 50));
}
