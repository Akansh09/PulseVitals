// PulseVitals popup script — v2.0.
// View state machine: current / historyList / historyDetail / consent / onboarding.
// Plus: CWV bar, insights engine (8 base + platform-aware rules), third-party breakdown,
// SEO checks, axe-lite combined score, RUM histogram, budget banner, what's-new card,
// share-as-HTML, mobile emulation toggle, options link, bug-report link.

const SERIES = [
  "navigationStart", "fetchStart", "domainLookupStart", "domainLookupEnd",
  "connectStart", "connectEnd", "requestStart", "responseStart", "responseEnd",
  "domLoading", "domInteractive", "domContentLoadedEventStart",
  "domContentLoadedEventEnd", "domComplete"
];
const PAINT_SERIES = ["first-paint", "first-contentful-paint", "largest-contentful-paint"];
const UNSUPPORTED_PREFIXES = [
  "chrome://", "chrome-extension://", "about:", "edge://", "brave://", "opera://", "view-source:"
];
const MAX_HISTORY_PER_ORIGIN = 10;
const HISTORY_DEDUP_WINDOW_MS = 60 * 1000;
const TOAST_MS = 2000;
const CURRENT_VERSION = "2.1";

const CWV_THRESHOLDS = { lcp: [2500, 4000], cls: [0.1, 0.25], inp: [200, 500] };
const CWV_LABEL_KEYS = { good: "cwvGood", warn: "cwvWarn", bad: "cwvBad", none: "cwvMeasuring" };
const MAX_INSIGHTS = 5;
const WATERFALL_MAX_ROWS = 10;
const MAX_ERROR_ROWS = 5;

const VENDOR_MAP = [
  { patterns: [/(^|\.)googletagmanager\.com$/, /(^|\.)google-analytics\.com$/, /(^|\.)googleapis\.com$/, /(^|\.)googlesyndication\.com$/, /(^|\.)doubleclick\.net$/, /(^|\.)googleadservices\.com$/, /(^|\.)youtube\.com$/, /(^|\.)ytimg\.com$/], name: "Google", color: "#4285F4" },
  { patterns: [/(^|\.)facebook\.com$/, /(^|\.)facebook\.net$/, /(^|\.)fbcdn\.net$/, /(^|\.)instagram\.com$/], name: "Meta", color: "#1877F2" },
  { patterns: [/(^|\.)hubspot\.com$/, /(^|\.)hs-analytics\.net$/, /(^|\.)hsforms\.(com|net)$/, /(^|\.)hscollectedforms\.net$/], name: "HubSpot", color: "#FF7A59" },
  { patterns: [/(^|\.)hotjar\.com$/, /(^|\.)hotjar\.io$/], name: "Hotjar", color: "#F7941D" },
  { patterns: [/(^|\.)cloudflare\.com$/, /(^|\.)cloudflareinsights\.com$/], name: "Cloudflare", color: "#F38020" },
  { patterns: [/(^|\.)intercom\.io$/, /(^|\.)intercomassets\.com$/, /(^|\.)intercomcdn\.com$/], name: "Intercom", color: "#1F8DED" },
  { patterns: [/(^|\.)segment\.com$/, /(^|\.)segment\.io$/], name: "Segment", color: "#52BD95" },
  { patterns: [/(^|\.)stripe\.com$/, /(^|\.)stripe\.network$/], name: "Stripe", color: "#635BFF" },
  { patterns: [/(^|\.)amazon-adsystem\.com$/, /(^|\.)amazonaws\.com$/], name: "Amazon", color: "#FF9900" },
  { patterns: [/(^|\.)twitter\.com$/, /(^|\.)x\.com$/, /(^|\.)twimg\.com$/], name: "X / Twitter", color: "#1DA1F2" },
  { patterns: [/(^|\.)tiktok\.com$/, /(^|\.)tiktokcdn\.com$/], name: "TikTok", color: "#FF0050" },
  { patterns: [/(^|\.)linkedin\.com$/, /(^|\.)licdn\.com$/], name: "LinkedIn", color: "#0A66C2" }
];

const PLATFORM_TIPS = {
  shopify: [
    { title: "Enable Shopify image URL filter (WebP)", savings: "~1.4s", savingsMs: 1400,
      fix: "In your Liquid templates, pass images through `img_url: 'w_800,f_webp'` so Shopify's image CDN returns modern formats automatically. No app required." },
    { title: "Lazy-load product-grid thumbnails", savings: "~0.6s", savingsMs: 600,
      fix: "Add loading='lazy' to product card images below the fold. Shopify's default section templates ship without it." }
  ],
  wordpress: [
    { title: "Install a caching plugin", savings: "~0.9s", savingsMs: 900,
      fix: "WP Rocket or Cache Enabler cache rendered HTML, cut PHP round-trips, and compress text assets. Drastically reduces TTFB." },
    { title: "Enable native lazy-loading", savings: "~0.5s", savingsMs: 500,
      fix: "Ensure your theme outputs loading='lazy' on images; WP 5.5+ does this by default but some themes override." }
  ],
  webflow: [
    { title: "Compress Webflow-hosted images", savings: "~0.8s", savingsMs: 800,
      fix: "Webflow's image CMS field has a 'compress' toggle that downsamples uploads. Enable it per asset in the Designer." }
  ],
  nextjs: [
    { title: "Use next/image for hero images", savings: "~1.1s", savingsMs: 1100,
      fix: "Swap <img> tags for next/image with priority set on the hero. Next.js handles sizes, srcset, and lazy-loading automatically." },
    { title: "Enable font optimisation", savings: "~0.3s", savingsMs: 300,
      fix: "Use next/font for Google / local fonts to inline them at build time and eliminate render-blocking font requests." }
  ],
  wix: [
    { title: "Reduce installed Wix apps", savings: "~1.2s", savingsMs: 1200,
      fix: "Each Wix app adds JS to every page. Audit installed apps in the Dashboard and remove unused ones." }
  ],
  squarespace: [
    { title: "Use an image-focus-aware crop", savings: "~0.4s", savingsMs: 400,
      fix: "Squarespace loads large hero images by default. Set appropriate image focus + smaller breakpoints in Image settings." }
  ]
};

const SEO_CHECKS = [
  { id: "title", run: (seo) => seo && seo.titleLen > 10 && seo.titleLen <= 70 ? { status: "pass", detail: seo.titleLen + " chars" } : seo && seo.titleLen ? { status: "warn", detail: seo.titleLen + " chars (target 10–70)" } : { status: "fail", detail: "missing" } },
  { id: "metaDesc", run: (seo) => !seo ? { status: "fail", detail: "missing" } : seo.metaDescLen >= 80 && seo.metaDescLen <= 160 ? { status: "pass", detail: seo.metaDescLen + " chars" } : seo.metaDescLen ? { status: "warn", detail: seo.metaDescLen + " chars (target 80–160)" } : { status: "fail", detail: "missing" } },
  { id: "h1", run: (seo) => !seo ? { status: "fail", detail: "unknown" } : seo.h1Count === 1 ? { status: "pass", detail: "1" } : seo.h1Count === 0 ? { status: "fail", detail: "0" } : { status: "warn", detail: "found " + seo.h1Count } },
  { id: "canonical", run: (seo) => seo && seo.canonical ? { status: "pass", detail: "set" } : { status: "warn", detail: "missing" } },
  { id: "ogImage", run: (seo) => seo && seo.ogImage ? { status: "pass", detail: "set" } : { status: "warn", detail: "missing" } },
  { id: "viewport", run: (seo) => seo && seo.viewport ? { status: "pass", detail: "responsive" } : { status: "fail", detail: "missing" } },
  { id: "jsonld", run: (seo) => seo && seo.jsonLdCount > 0 ? { status: "pass", detail: seo.jsonLdCount + " block(s)" } : { status: "warn", detail: "none" } }
];

const state = {
  tab: null,
  payload: null,
  view: "current",
  detailSnapshot: null,
  detailIndex: null,
  options: null,
  mobileMode: false,
  historySelection: new Set()
};

// ---------- i18n ----------

function t(key, args) {
  if (typeof chrome !== "undefined" && chrome.i18n && typeof chrome.i18n.getMessage === "function") {
    const msg = args ? chrome.i18n.getMessage(key, args) : chrome.i18n.getMessage(key);
    if (msg) return msg;
  }
  return key;
}

function currentLocale() {
  if (typeof chrome !== "undefined" && chrome.i18n && typeof chrome.i18n.getUILanguage === "function") {
    return chrome.i18n.getUILanguage() || "en";
  }
  return (navigator && navigator.language) || "en";
}

function applyStaticI18n() {
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of document.querySelectorAll("[data-i18n-title]")) {
    el.title = t(el.dataset.i18nTitle);
  }
}

// ---------- Utilities ----------

function isUnsupportedUrl(url) {
  if (!url) return true;
  if (/\.pdf(\?|#|$)/i.test(url)) return true;
  return UNSUPPORTED_PREFIXES.some((p) => url.startsWith(p));
}

function isDeniedOrigin(url) {
  if (!state.options || !state.options.denylist) return false;
  const origin = originOf(url);
  if (!origin) return false;
  const list = state.options.denylist.split("\n").map((s) => s.trim()).filter(Boolean);
  return list.some((entry) => origin === entry || origin.startsWith(entry));
}

function middleEllipsis(str, max) {
  if (str.length <= max) return str;
  const keep = Math.floor((max - 1) / 2);
  return str.slice(0, keep) + "\u2026" + str.slice(str.length - keep);
}

function originOf(url) { try { return new URL(url).origin; } catch (_e) { return null; } }
function hostOf(url) { try { return new URL(url).host; } catch (_e) { return null; } }
function pathOf(url) {
  try { const u = new URL(url); return u.pathname + (u.search || ""); } catch (_e) { return url; }
}

function formatTime(epochMs) {
  const d = new Date(epochMs);
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") +
    ":" + String(d.getSeconds()).padStart(2, "0") + "." + String(d.getMilliseconds()).padStart(3, "0");
}

function formatBytes(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return null;
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return Math.round(n / 1024) + " KB";
  if (n < 1024 * 1024 * 1024) return localeFixed(n / (1024 * 1024), 1) + " MB";
  return localeFixed(n / (1024 * 1024 * 1024), 1) + " GB";
}

function localeFixed(n, digits) {
  try { return n.toLocaleString(currentLocale(), { minimumFractionDigits: digits, maximumFractionDigits: digits }); }
  catch (_e) { return n.toFixed(digits); }
}

function localeInt(n) {
  try { return n.toLocaleString(currentLocale()); } catch (_e) { return String(Math.round(n)); }
}

function shortClock(epochMs) {
  const d = new Date(epochMs);
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

function relativeTime(epochMs) {
  const now = Date.now();
  const diff = now - epochMs;
  if (diff < 60 * 1000) return t("relativeJustNow");
  if (diff < 60 * 60 * 1000) return t("relativeMinutesAgo", [String(Math.round(diff / 60000))]);
  const d = new Date(epochMs);
  const today = new Date();
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const daysDiff = Math.round((todayStart - dayStart) / 86400000);
  if (daysDiff === 0) return t("relativeToday", [shortClock(epochMs)]);
  if (daysDiff === 1) return t("relativeYesterday", [shortClock(epochMs)]);
  if (daysDiff < 7) return t("relativeDaysAgo", [String(daysDiff)]);
  try { return new Date(epochMs).toLocaleDateString(currentLocale()); }
  catch (_e) { return new Date(epochMs).toLocaleDateString(); }
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- DOM helpers ----------

function clearNode(el) { while (el.firstChild) el.removeChild(el.firstChild); }
function setSubheadText(text) { document.getElementById("subhead-text").textContent = text; }
function setUrlBar(url) {
  const el = document.getElementById("urlbar");
  el.hidden = false;
  if (!url) { el.textContent = "\u2014"; el.style.opacity = "0.5"; return; }
  el.textContent = middleEllipsis(url, 44);
  el.style.opacity = "";
}
function hideUrlBar() { document.getElementById("urlbar").hidden = true; }

function setBackButton(label, ariaLabel, onClick) {
  const btn = document.getElementById("back-btn");
  if (!label) { btn.hidden = true; btn.onclick = null; btn.removeAttribute("aria-label"); return; }
  btn.hidden = false; btn.textContent = label;
  if (ariaLabel) btn.setAttribute("aria-label", ariaLabel); else btn.removeAttribute("aria-label");
  btn.onclick = onClick;
}

function showStateMessage(lines) {
  const body = document.getElementById("body");
  clearNode(body);
  const div = document.createElement("div");
  div.className = "state";
  div.setAttribute("role", "status");
  div.setAttribute("aria-live", "polite");
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) div.appendChild(document.createElement("br"));
    div.appendChild(document.createTextNode(lines[i]));
  }
  body.appendChild(div);
}

let toastTimer = null;
function showToast(text) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.textContent = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { if (toast && toast.parentNode) toast.parentNode.removeChild(toast); }, TOAST_MS);
}

// ---------- CWV verdict ----------

function rateMetric(value, thresholds) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  if (value <= thresholds[0]) return "good";
  if (value <= thresholds[1]) return "warn";
  return "bad";
}

function computeCwv(payload) {
  const start = Number(payload[SERIES[0]]) || 0;
  const lcpRaw = Number(payload["largest-contentful-paint"]);
  const lcpMs = (Number.isFinite(lcpRaw) && lcpRaw > 0 && start) ? lcpRaw - start : null;
  const cls = Number.isFinite(payload.cls) ? payload.cls : null;
  const inp = Number.isFinite(payload.inp) ? payload.inp : null;
  const ratings = [];
  if (lcpMs !== null) ratings.push(rateMetric(lcpMs, CWV_THRESHOLDS.lcp));
  if (cls !== null) ratings.push(rateMetric(cls, CWV_THRESHOLDS.cls));
  if (inp !== null) ratings.push(rateMetric(inp, CWV_THRESHOLDS.inp));
  let verdict;
  if (ratings.length === 0) verdict = "none";
  else if (ratings.indexOf("bad") !== -1) verdict = "bad";
  else if (ratings.indexOf("warn") !== -1) verdict = "warn";
  else verdict = "good";
  return { verdict, lcpMs, cls, inp };
}

function renderCwvBar(payload) {
  const { verdict, lcpMs, cls, inp } = computeCwv(payload);
  const bar = document.createElement("div");
  bar.className = "cwv-bar " + verdict;
  bar.setAttribute("role", "status");
  bar.setAttribute("aria-live", "polite");
  const pill = document.createElement("span"); pill.className = "pill"; bar.appendChild(pill);
  const label = document.createElement("span"); label.className = "label";
  label.textContent = t(CWV_LABEL_KEYS[verdict]); bar.appendChild(label);
  const breakdown = document.createElement("span"); breakdown.className = "breakdown";
  const parts = [];
  parts.push(lcpMs !== null ? "LCP " + localeFixed(lcpMs / 1000, 1) + "s" : "LCP \u2014");
  parts.push(cls !== null ? "CLS " + localeFixed(cls, 2) : "CLS \u2014");
  parts.push(inp !== null ? "INP " + localeInt(Math.round(inp)) + "ms" : "INP \u2014");
  breakdown.textContent = parts.join(" \u00b7 ");
  bar.appendChild(breakdown);
  return bar;
}

// ---------- Insights engine ----------

function insightShortName(url) {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").pop() || u.pathname;
    return last.length > 28 ? last.slice(0, 28) + "\u2026" : last;
  } catch (_e) { return ""; }
}

const INSIGHT_RULES = [
  { id: "slow-lcp", check(p) {
    const start = Number(p[SERIES[0]]) || 0;
    const lcp = Number(p["largest-contentful-paint"]);
    if (!Number.isFinite(lcp) || lcp <= 0 || !start) return null;
    const ms = lcp - start;
    if (ms <= 2500) return null;
    return { severity: ms > 4000 ? "bad" : "warn",
      title: t("insightSlowLcpTitle", [localeFixed(ms / 1000, 1)]),
      savings: "~" + localeFixed((ms - 2500) / 1000, 1) + "s", savingsMs: ms - 2500,
      fix: t("insightSlowLcpFix") };
  }},
  { id: "large-hero-image", check(p) {
    if (!p.resources || !p.resources.length) return null;
    const top = p.resources[0];
    if (!top.transferSize) return null;
    const isImage = /\.(jpg|jpeg|png|webp|avif|gif)(\?|#|$)/i.test(top.name) || top.initiatorType === "img";
    if (!isImage || top.transferSize < 300 * 1024) return null;
    return { severity: top.transferSize > 1024 * 1024 ? "bad" : "warn",
      title: t("insightLargeImageTitle", [formatBytes(top.transferSize)]),
      savings: "~" + localeFixed(top.transferSize / 1024 / 500, 1) + "s", savingsMs: top.transferSize / 500,
      fix: t("insightLargeImageFix", [insightShortName(top.name)]) };
  }},
  { id: "poor-cls", check(p) {
    const cls = Number(p.cls);
    if (!Number.isFinite(cls) || cls <= 0.1) return null;
    return { severity: cls > 0.25 ? "bad" : "warn",
      title: t("insightPoorClsTitle", [localeFixed(cls, 2)]),
      savings: "CLS \u2212" + localeFixed(Math.max(0, cls - 0.1), 2), savingsMs: cls * 10000,
      fix: t("insightPoorClsFix") };
  }},
  { id: "poor-inp", check(p) {
    const inp = Number(p.inp);
    if (!Number.isFinite(inp) || inp <= 200) return null;
    return { severity: inp > 500 ? "bad" : "warn",
      title: t("insightPoorInpTitle", [localeInt(Math.round(inp))]),
      savings: "INP \u2212" + localeInt(Math.max(0, Math.round(inp - 200))) + "ms", savingsMs: inp - 200,
      fix: t("insightPoorInpFix") };
  }},
  { id: "slow-ttfb", check(p) {
    const start = Number(p[SERIES[0]]) || 0;
    const responseStart = Number(p.responseStart);
    if (!start || !Number.isFinite(responseStart) || responseStart <= 0) return null;
    const ttfb = responseStart - start;
    if (ttfb <= 600) return null;
    return { severity: ttfb > 1500 ? "bad" : "warn",
      title: t("insightSlowTtfbTitle", [localeInt(Math.round(ttfb))]),
      savings: "~" + localeFixed((ttfb - 300) / 1000, 1) + "s", savingsMs: ttfb - 300,
      fix: t("insightSlowTtfbFix") };
  }},
  { id: "large-js", check(p) {
    const resources = p.allResources || p.resources || [];
    const jsRes = resources.filter((r) => /\.js(\?|#|$)/i.test(r.name) || r.initiatorType === "script");
    const totalJs = jsRes.reduce((s, r) => s + (r.transferSize || 0), 0);
    if (totalJs < 500 * 1024) return null;
    return { severity: totalJs > 2 * 1024 * 1024 ? "bad" : "warn",
      title: t("insightLargeJsTitle", [formatBytes(totalJs)]),
      savings: "~" + localeFixed(totalJs / 1024 / 500, 1) + "s", savingsMs: totalJs / 500,
      fix: t("insightLargeJsFix") };
  }},
  { id: "large-total", check(p) {
    const resources = p.allResources || p.resources || [];
    const total = resources.reduce((s, r) => s + (r.transferSize || 0), 0);
    if (total < 2 * 1024 * 1024) return null;
    return { severity: total > 5 * 1024 * 1024 ? "bad" : "warn",
      title: t("insightLargeTotalTitle", [formatBytes(total)]),
      savings: "~" + localeFixed(total / 1024 / 500, 1) + "s", savingsMs: total / 500,
      fix: t("insightLargeTotalFix") };
  }},
  { id: "slow-dom", check(p) {
    const start = Number(p[SERIES[0]]) || 0;
    const domComplete = Number(p.domComplete);
    if (!start || !Number.isFinite(domComplete) || domComplete <= 0) return null;
    const ms = domComplete - start;
    if (ms <= 3000) return null;
    return { severity: ms > 6000 ? "bad" : "warn",
      title: t("insightSlowDomTitle", [localeFixed(ms / 1000, 1)]),
      savings: "~" + localeFixed((ms - 1500) / 1000, 1) + "s", savingsMs: ms - 1500,
      fix: t("insightSlowDomFix") };
  }},
  { id: "images-non-modern", check(p) {
    const imgs = p.imageAudit || [];
    if (!imgs.length) return null;
    const bigLegacy = imgs.filter((i) => (i.format === "jpg" || i.format === "jpeg" || i.format === "png") && resourceSizeFor(p, i.src) > 100 * 1024);
    if (bigLegacy.length < 2) return null;
    const total = bigLegacy.reduce((s, i) => s + resourceSizeFor(p, i.src), 0);
    const saveMs = (total * 0.45) / 500;
    return { severity: bigLegacy.length >= 4 ? "bad" : "warn", kind: "image",
      title: t("insightImagesNonModernTitle", [String(bigLegacy.length)]),
      savings: "~" + localeFixed(saveMs / 1000, 1) + "s", savingsMs: saveMs,
      fix: t("insightImagesNonModernFix") };
  }},
  { id: "images-missing-lazy", check(p) {
    const imgs = p.imageAudit || [];
    if (!imgs.length) return null;
    const belowFold = imgs.filter((i) => !i.aboveFold && i.loading !== "lazy" && i.loading !== "eager");
    if (belowFold.length < 3) return null;
    return { severity: belowFold.length >= 8 ? "bad" : "warn", kind: "image",
      title: t("insightImagesMissingLazyTitle", [String(belowFold.length)]),
      savings: "~" + localeFixed(belowFold.length * 0.08, 1) + "s",
      savingsMs: belowFold.length * 80,
      fix: t("insightImagesMissingLazyFix") };
  }},
  { id: "images-missing-srcset", check(p) {
    const imgs = p.imageAudit || [];
    const heroCandidates = imgs.filter((i) => i.aboveFold && i.renderedWidth > 300 && !i.hasSrcset);
    if (!heroCandidates.length) return null;
    const biggest = heroCandidates.sort((a, b) => b.renderedWidth - a.renderedWidth)[0];
    const size = resourceSizeFor(p, biggest.src);
    if (size < 80 * 1024) return null;
    const saveMs = size * 0.4 / 500;
    return { severity: "warn", kind: "image",
      title: t("insightImagesMissingSrcsetTitle"),
      savings: "~" + localeFixed(saveMs / 1000, 1) + "s", savingsMs: saveMs,
      fix: t("insightImagesMissingSrcsetFix") };
  }}
];

function resourceSizeFor(payload, url) {
  if (!url || !payload.allResources) return 0;
  const r = payload.allResources.find((x) => x.name === url);
  return r ? (r.transferSize || 0) : 0;
}

function generateInsights(payload) {
  const out = [];
  for (const rule of INSIGHT_RULES) {
    try { const r = rule.check(payload); if (r) out.push(r); } catch (_e) {}
  }
  if (state.options && state.options.platformTips && payload.platform && PLATFORM_TIPS[payload.platform]) {
    for (const tip of PLATFORM_TIPS[payload.platform]) {
      out.push({ severity: "platform", title: tip.title, savings: tip.savings,
        savingsMs: tip.savingsMs, fix: tip.fix, platform: payload.platform });
    }
  }
  out.sort((a, b) => (b.savingsMs || 0) - (a.savingsMs || 0));
  return out.slice(0, MAX_INSIGHTS);
}

function renderInsightCard(insight) {
  const card = document.createElement("div");
  card.className = "insight";
  const head = document.createElement("div");
  head.className = "insight-head";
  const sev = document.createElement("span");
  sev.className = "insight-sev " + insight.severity;
  head.appendChild(sev);
  const title = document.createElement("span");
  title.className = "insight-title";
  if (insight.platform) {
    const tag = document.createElement("span");
    tag.className = "platform-tag";
    tag.textContent = insight.platform;
    title.appendChild(tag);
  } else if (insight.kind === "image") {
    const tag = document.createElement("span");
    tag.className = "image-tag";
    tag.textContent = t("imageInsightBadge");
    title.appendChild(tag);
  }
  title.appendChild(document.createTextNode(insight.title));
  head.appendChild(title);
  const savings = document.createElement("span");
  savings.className = "insight-savings";
  savings.textContent = insight.savings;
  head.appendChild(savings);
  card.appendChild(head);
  const fix = document.createElement("p");
  fix.className = "insight-fix";
  fix.textContent = insight.fix;
  card.appendChild(fix);
  return card;
}

function renderInsightsSection(body, payload) {
  const heading = document.createElement("h2");
  heading.className = "section-heading";
  heading.textContent = t("sectionInsights");
  body.appendChild(heading);
  const insights = generateInsights(payload);
  if (insights.length > 0) {
    for (const insight of insights) body.appendChild(renderInsightCard(insight));
    return;
  }
  const { verdict } = computeCwv(payload);
  const empty = document.createElement("div");
  empty.className = "insights-empty";
  empty.textContent = verdict === "none" ? t("insightsEmptyMeasuring") : t("insightsEmptyPassing");
  body.appendChild(empty);
}

// ---------- Third-party breakdown ----------

function vendorFor(host) {
  for (const v of VENDOR_MAP) {
    for (const p of v.patterns) { if (p.test(host)) return v; }
  }
  return { name: host, color: "#94A3B8" };
}

function groupThirdParty(resources, pageOrigin) {
  if (!resources || !resources.length || !pageOrigin) return [];
  const pageHost = hostOf(pageOrigin);
  const byVendor = new Map();
  for (const r of resources) {
    const host = hostOf(r.name);
    if (!host || host === pageHost) continue;
    const v = vendorFor(host);
    const key = v.name;
    let agg = byVendor.get(key);
    if (!agg) { agg = { vendor: v.name, color: v.color, origins: new Set(), transferSize: 0, count: 0 }; byVendor.set(key, agg); }
    agg.origins.add(host);
    agg.transferSize += r.transferSize || 0;
    agg.count += 1;
  }
  return Array.from(byVendor.values())
    .map((a) => ({ vendor: a.vendor, color: a.color, origins: Array.from(a.origins), transferSize: a.transferSize, count: a.count }))
    .sort((a, b) => b.transferSize - a.transferSize)
    .slice(0, 10);
}

function renderThirdPartySection(body, payload) {
  const heading = document.createElement("h2");
  heading.className = "section-heading";
  heading.textContent = t("sectionThirdParty");
  body.appendChild(heading);
  const pageOrigin = originOf(state.tab && state.tab.url);
  const groups = groupThirdParty(payload.allResources || payload.resources, pageOrigin);
  if (!groups.length) {
    const empty = document.createElement("div");
    empty.className = "insights-empty";
    empty.textContent = t("thirdPartyEmpty");
    body.appendChild(empty);
    return;
  }
  for (const g of groups) {
    const row = document.createElement("div");
    row.className = "tp-row";
    const dot = document.createElement("span");
    dot.className = "tp-vendor-dot";
    dot.style.background = g.color;
    row.appendChild(dot);
    const v = document.createElement("div");
    v.className = "tp-vendor";
    const name = document.createElement("span");
    name.className = "tp-vendor-name";
    name.textContent = g.vendor;
    v.appendChild(name);
    const origin = document.createElement("span");
    origin.className = "tp-origin";
    origin.textContent = g.origins.join(", ");
    v.appendChild(origin);
    row.appendChild(v);
    const count = document.createElement("span");
    count.className = "tp-count";
    count.textContent = String(g.count);
    row.appendChild(count);
    const size = document.createElement("span");
    size.className = "tp-size";
    size.textContent = formatBytes(g.transferSize) || "\u2014";
    row.appendChild(size);
    body.appendChild(row);
  }
}

// ---------- SEO section ----------

function renderSeoSection(body, payload) {
  if (!state.options || !state.options.seoChecks) return;
  const heading = document.createElement("h2");
  heading.className = "section-heading";
  heading.textContent = t("sectionSeoChecks");
  body.appendChild(heading);
  const seo = payload.seo;
  if (!seo) {
    const empty = document.createElement("div");
    empty.className = "insights-empty";
    empty.textContent = t("seoUnavailable");
    body.appendChild(empty);
    return;
  }
  for (const c of SEO_CHECKS) {
    const result = c.run(seo);
    const row = document.createElement("div");
    row.className = "check-row";
    const icon = document.createElement("span");
    icon.className = "check-icon " + result.status;
    icon.textContent = result.status === "pass" ? "\u2713" : result.status === "fail" ? "\u2715" : "!";
    row.appendChild(icon);
    const label = document.createElement("span");
    label.className = "check-label";
    label.textContent = t("seoCheck_" + c.id);
    row.appendChild(label);
    const detail = document.createElement("span");
    detail.className = "check-detail";
    detail.textContent = result.detail;
    row.appendChild(detail);
    body.appendChild(row);
  }
}

// ---------- Accessibility + CWV score ----------

function renderAxeScoreSection(body, payload) {
  if (!state.options || !state.options.axeChecks) return;
  const heading = document.createElement("h2");
  heading.className = "section-heading";
  heading.textContent = t("sectionHealthScore");
  body.appendChild(heading);
  const { verdict } = computeCwv(payload);
  const axe = payload.axe || [];
  const violationCount = axe.length;
  const cwvMultiplier = verdict === "good" ? 1 : verdict === "warn" ? 0.75 : verdict === "bad" ? 0.5 : 0.5;
  const rawScore = Math.max(0, 100 - (10 * violationCount));
  const score = Math.round(rawScore * cwvMultiplier);
  const tile = document.createElement("div");
  tile.className = "score-tile";
  const big = document.createElement("div");
  big.className = "big-num " + (score >= 80 ? "good" : score >= 50 ? "warn" : "bad");
  big.textContent = String(score);
  tile.appendChild(big);
  const right = document.createElement("div");
  const kicker = document.createElement("div");
  kicker.className = "kicker";
  kicker.textContent = t("healthScoreKicker");
  right.appendChild(kicker);
  const subtitle = document.createElement("div");
  subtitle.className = "subtitle";
  subtitle.textContent = t("healthScoreSummary", [verdict, String(violationCount)]);
  right.appendChild(subtitle);
  const desc = document.createElement("div");
  desc.className = "desc";
  desc.textContent = t("healthScoreFormula");
  right.appendChild(desc);
  tile.appendChild(right);
  body.appendChild(tile);
  if (violationCount > 0) {
    const subH = document.createElement("h2");
    subH.className = "section-heading";
    subH.textContent = t("sectionA11yIssues");
    body.appendChild(subH);
    for (const v of axe.slice(0, 5)) {
      const row = document.createElement("div");
      row.className = "check-row";
      const icon = document.createElement("span");
      icon.className = "check-icon " + (v.impact === "critical" || v.impact === "serious" ? "fail" : "warn");
      icon.textContent = "\u2715";
      row.appendChild(icon);
      const label = document.createElement("span");
      label.className = "check-label";
      label.textContent = v.label;
      row.appendChild(label);
      const detail = document.createElement("span");
      detail.className = "check-detail";
      detail.textContent = v.detail || v.selector || "";
      row.appendChild(detail);
      body.appendChild(row);
    }
  }
}

// ---------- RUM histogram ----------

async function renderRumSection(body) {
  const origin = originOf(state.tab && state.tab.url);
  if (!origin) return;
  const key = "history::" + origin;
  const stored = await chrome.storage.local.get(key);
  const entries = stored[key] || [];
  if (entries.length < 3) return;
  const heading = document.createElement("h2");
  heading.className = "section-heading";
  heading.textContent = t("sectionRumHistogram");
  body.appendChild(heading);
  const lcps = [];
  for (const e of entries) {
    const p = e.payload || {};
    const start = Number(p.navigationStart) || 0;
    const lcp = Number(p["largest-contentful-paint"]);
    if (Number.isFinite(lcp) && lcp > 0 && start) lcps.push(lcp - start);
  }
  if (lcps.length === 0) return;
  const bins = 8;
  const min = Math.min(...lcps);
  const max = Math.max(...lcps);
  const span = Math.max(max - min, 100);
  const buckets = new Array(bins).fill(0);
  for (const v of lcps) {
    const idx = Math.min(bins - 1, Math.floor(((v - min) / span) * bins));
    buckets[idx] += 1;
  }
  const peak = Math.max(...buckets);
  const hist = document.createElement("div");
  hist.className = "hist";
  for (const c of buckets) {
    const bar = document.createElement("div");
    bar.className = "bar" + (c === peak ? " active" : "");
    bar.style.height = (peak ? (c / peak) * 100 : 0) + "%";
    hist.appendChild(bar);
  }
  body.appendChild(hist);
  const legend = document.createElement("div");
  legend.className = "hist-legend";
  const a = document.createElement("span");
  a.textContent = localeFixed(min / 1000, 1) + "s";
  const b = document.createElement("span");
  b.textContent = localeFixed(max / 1000, 1) + "s";
  legend.appendChild(a); legend.appendChild(b);
  body.appendChild(legend);
  const sorted = lcps.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  const stats = [
    [t("rumMedian"), localeInt(Math.round(median)) + " ms"],
    [t("rumP95"), localeInt(Math.round(p95)) + " ms"],
    [t("rumSamples"), lcps.length + " / " + MAX_HISTORY_PER_ORIGIN]
  ];
  for (const [label, val] of stats) {
    const row = document.createElement("div");
    row.className = "rum-stat";
    const l = document.createElement("span"); l.textContent = label; row.appendChild(l);
    const v = document.createElement("span"); v.className = "val"; v.textContent = val; row.appendChild(v);
    body.appendChild(row);
  }
}

// ---------- Timing + Storage + Resources (unchanged primitives) ----------

function makeTh(text, cls) {
  const th = document.createElement("th");
  if (cls) th.className = cls;
  th.scope = "col";
  th.textContent = text;
  return th;
}

function renderTimingRow(tbody, key, payload, startMs) {
  const raw = Number(payload[key]);
  const hasValue = Number.isFinite(raw) && raw > 0;
  const tr = document.createElement("tr");
  const tdKey = document.createElement("td"); tdKey.textContent = key; tr.appendChild(tdKey);
  const tdTime = document.createElement("td"); tdTime.className = "num";
  tdTime.textContent = hasValue ? formatTime(raw) : "\u2014"; tr.appendChild(tdTime);
  const tdDelta = document.createElement("td"); tdDelta.className = "num";
  tdDelta.textContent = (hasValue && startMs) ? localeInt(Math.round(raw - startMs)) : "\u2014";
  tr.appendChild(tdDelta);
  tbody.appendChild(tr);
}

function renderTimingTable(body, payload) {
  const heading = document.createElement("h2");
  heading.className = "section-heading";
  heading.textContent = t("sectionTimings");
  body.appendChild(heading);
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headerRow.appendChild(makeTh(t("tableEvent")));
  headerRow.appendChild(makeTh(t("tableTime"), "num"));
  headerRow.appendChild(makeTh(t("tableDelta"), "num"));
  thead.appendChild(headerRow);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  const startMs = Number(payload[SERIES[0]]) || 0;
  for (const key of SERIES) renderTimingRow(tbody, key, payload, startMs);
  const sub = document.createElement("tr"); sub.className = "subgroup";
  const subTd = document.createElement("td"); subTd.colSpan = 3; subTd.textContent = t("sectionPaintAndCwv");
  sub.appendChild(subTd); tbody.appendChild(sub);
  for (const key of PAINT_SERIES) renderTimingRow(tbody, key, payload, startMs);
  table.appendChild(tbody);
  body.appendChild(table);
}

function makeKvRow(label, value, isNa) {
  const row = document.createElement("div"); row.className = "kv";
  const l = document.createElement("span"); l.textContent = label; row.appendChild(l);
  const v = document.createElement("span"); v.className = "value" + (isNa ? " na" : "");
  v.textContent = value; row.appendChild(v);
  return row;
}

function renderStorageSection(body, storage) {
  const heading = document.createElement("h2");
  heading.className = "section-heading";
  heading.textContent = t("sectionStorage");
  body.appendChild(heading);
  const unavailable = t("valueUnavailable");
  const lsVal = storage ? formatBytes(storage.localStorage) : null;
  const ssVal = storage ? formatBytes(storage.sessionStorage) : null;
  body.appendChild(makeKvRow(t("storageLocal"), lsVal || unavailable, !lsVal));
  body.appendChild(makeKvRow(t("storageSession"), ssVal || unavailable, !ssVal));
  let usageText = unavailable, usageIsNa = true;
  if (storage && storage.usage !== null && storage.usage !== undefined) {
    const u = formatBytes(storage.usage);
    const q = storage.quota ? " / " + formatBytes(storage.quota) : "";
    if (u) { usageText = u + q; usageIsNa = false; }
  }
  body.appendChild(makeKvRow(t("storageOriginTotal"), usageText, usageIsNa));
}

function shortResourceName(url) {
  try {
    const u = new URL(url);
    return middleEllipsis(u.pathname + (u.search || "") || "/", 28);
  } catch (_e) { return middleEllipsis(url || "", 28); }
}

function renderResourcesSection(body, resources) {
  const heading = document.createElement("h2");
  heading.className = "section-heading";
  heading.textContent = t("sectionTopResources");
  body.appendChild(heading);
  if (!resources || resources.length === 0) {
    body.appendChild(makeKvRow(t("noResourcesCaptured"), "\u2014", true));
    return;
  }
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headerRow.appendChild(makeTh(t("tableResource")));
  headerRow.appendChild(makeTh(t("tableSize"), "num"));
  headerRow.appendChild(makeTh(t("tableDuration"), "num"));
  thead.appendChild(headerRow); table.appendChild(thead);
  const tbody = document.createElement("tbody");
  for (const r of resources) {
    const tr = document.createElement("tr");
    const tdN = document.createElement("td");
    tdN.className = "resource"; tdN.textContent = shortResourceName(r.name); tdN.title = r.name;
    tr.appendChild(tdN);
    const tdS = document.createElement("td"); tdS.className = "num";
    tdS.textContent = formatBytes(r.transferSize) || "\u2014"; tr.appendChild(tdS);
    const tdD = document.createElement("td"); tdD.className = "num";
    tdD.textContent = (r.duration >= 0 ? r.duration : 0) + " ms"; tr.appendChild(tdD);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  body.appendChild(table);
}

// ---------- CWV/whatsnew/banner containers ----------

function setCwvBar(payload) {
  const c = document.getElementById("cwv-bar-container");
  clearNode(c); c.hidden = false; c.appendChild(renderCwvBar(payload));
}
function hideCwvBar() {
  const c = document.getElementById("cwv-bar-container"); clearNode(c); c.hidden = true;
}

function renderBudgetBanner(payload) {
  const c = document.getElementById("banner-container");
  clearNode(c);
  if (!state.options || !state.options.alerts) return;
  const { lcpMs, cls, inp } = computeCwv(payload);
  const over = [];
  if (Number.isFinite(lcpMs) && lcpMs > state.options.budgetLcp) over.push(`LCP ${Math.round(lcpMs)}ms > ${state.options.budgetLcp}ms`);
  if (Number.isFinite(cls) && cls > state.options.budgetCls) over.push(`CLS ${cls.toFixed(2)} > ${state.options.budgetCls}`);
  if (Number.isFinite(inp) && inp > state.options.budgetInp) over.push(`INP ${Math.round(inp)}ms > ${state.options.budgetInp}ms`);
  if (!over.length) return;
  const b = document.createElement("div");
  b.className = "banner budget";
  b.setAttribute("role", "alert");
  const icon = document.createElement("span"); icon.className = "icon"; icon.textContent = "⚠"; b.appendChild(icon);
  const main = document.createElement("div"); main.className = "main";
  const title = document.createElement("div"); title.className = "title"; title.textContent = t("bannerBudgetExceeded"); main.appendChild(title);
  const detail = document.createElement("div"); detail.textContent = over.join(" · "); main.appendChild(detail);
  b.appendChild(main);
  const dismiss = document.createElement("button"); dismiss.className = "dismiss"; dismiss.setAttribute("aria-label", "Dismiss");
  dismiss.textContent = "×"; dismiss.onclick = () => clearNode(c);
  b.appendChild(dismiss);
  c.appendChild(b);
}

async function maybeRenderWhatsNew() {
  const c = document.getElementById("whatsnew-container");
  clearNode(c);
  try {
    const stored = await chrome.storage.local.get(["pv::whatsnew-seen"]);
    if (stored["pv::whatsnew-seen"] === CURRENT_VERSION) return;
    const card = document.createElement("div");
    card.className = "whatsnew";
    card.setAttribute("role", "region");
    card.setAttribute("aria-label", "What's new");
    const tag = document.createElement("div"); tag.className = "tag";
    tag.textContent = t("whatsnewTag", [CURRENT_VERSION]); card.appendChild(tag);
    const title = document.createElement("div"); title.className = "title";
    title.textContent = t("whatsnewTitle"); card.appendChild(title);
    const body = document.createElement("div"); body.className = "body-text";
    body.textContent = t("whatsnewBody"); card.appendChild(body);
    const actions = document.createElement("div"); actions.className = "actions";
    const ok = document.createElement("button");
    ok.textContent = t("whatsnewDismiss");
    ok.onclick = async () => { await chrome.storage.local.set({ "pv::whatsnew-seen": CURRENT_VERSION }); clearNode(c); };
    actions.appendChild(ok);
    card.appendChild(actions);
    c.appendChild(card);
  } catch (_e) {}
}

// ---------- Report body ----------

// ---------- Waterfall ----------

function initiatorClass(t) {
  if (!t) return "other";
  if (t === "script" || t === "module") return "script";
  if (t === "css" || t === "link") return "css";
  if (t === "img" || t === "image") return "img";
  if (t === "xmlhttprequest" || t === "fetch") return "xhr";
  return "other";
}

function renderWaterfallSection(body, payload) {
  const resources = (payload.allResources || payload.resources || []).slice();
  if (!resources.length) return;
  const heading = document.createElement("h2");
  heading.className = "section-heading";
  heading.textContent = t("sectionWaterfall", [String(Math.min(WATERFALL_MAX_ROWS, resources.length)), String(resources.length)]);
  body.appendChild(heading);

  const sorted = resources.slice().sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0)).slice(0, WATERFALL_MAX_ROWS);
  const maxEnd = resources.reduce((m, r) => Math.max(m, (r.startTime || 0) + (r.duration || 0)), 1);

  for (const r of sorted) {
    const row = document.createElement("div");
    row.className = "wf-row";
    const name = document.createElement("span");
    name.className = "wf-name";
    name.title = r.name;
    name.textContent = shortResourceName(r.name);
    row.appendChild(name);
    const track = document.createElement("div");
    track.className = "wf-track";
    const bar = document.createElement("div");
    bar.className = "wf-bar " + initiatorClass(r.initiatorType);
    const left = Math.max(0, Math.min(100, ((r.startTime || 0) / maxEnd) * 100));
    const width = Math.max(1, Math.min(100 - left, ((r.duration || 0) / maxEnd) * 100));
    bar.style.left = left + "%";
    bar.style.width = width + "%";
    bar.title = r.name + " — " + (r.duration || 0) + " ms";
    track.appendChild(bar);
    row.appendChild(track);
    const size = document.createElement("span");
    size.className = "wf-size";
    size.textContent = formatBytes(r.transferSize || 0) || "\u2014";
    row.appendChild(size);
    body.appendChild(row);
  }

  const legend = document.createElement("div");
  legend.className = "wf-legend";
  const items = [
    ["script", t("waterfallLegendScript")],
    ["css", t("waterfallLegendCss")],
    ["img", t("waterfallLegendImage")],
    ["xhr", t("waterfallLegendXhr")],
    ["other", t("waterfallLegendOther")]
  ];
  for (const [cls, label] of items) {
    const item = document.createElement("span");
    const sw = document.createElement("span");
    sw.className = "wf-sw " + cls;
    item.appendChild(sw);
    item.appendChild(document.createTextNode(" " + label));
    legend.appendChild(item);
  }
  body.appendChild(legend);
}

// ---------- Console errors ----------

function renderConsoleErrorsSection(body, payload) {
  const errors = (payload.jsErrors || []).slice();
  const heading = document.createElement("h2");
  heading.className = "section-heading err-heading";
  heading.textContent = t("sectionConsoleErrors");
  if (errors.length === 0) {
    const pill = document.createElement("span");
    pill.className = "err-none";
    pill.textContent = " " + t("consoleErrorsNone");
    heading.appendChild(pill);
    body.appendChild(heading);
    const empty = document.createElement("div");
    empty.className = "insights-empty";
    empty.textContent = t("consoleErrorsEmpty");
    body.appendChild(empty);
    return;
  }
  const count = document.createElement("span");
  count.className = "err-count";
  count.textContent = String(errors.length);
  heading.appendChild(document.createTextNode(" "));
  heading.appendChild(count);
  body.appendChild(heading);

  for (const err of errors.slice(-MAX_ERROR_ROWS).reverse()) {
    const row = document.createElement("div");
    row.className = "err-row";
    const dot = document.createElement("span");
    dot.className = "err-dot";
    row.appendChild(dot);
    const info = document.createElement("div");
    info.className = "err-info";
    const msg = document.createElement("div");
    msg.className = "err-msg";
    msg.textContent = err.message || "Error";
    msg.title = err.message || "";
    info.appendChild(msg);
    if (err.source || err.line) {
      const src = document.createElement("div");
      src.className = "err-src";
      src.textContent = (err.source ? err.source.split("/").pop() : "") + (err.line ? ":" + err.line : "");
      info.appendChild(src);
    }
    row.appendChild(info);
    body.appendChild(row);
  }
}

// ---------- Annotation on history detail ----------

function renderAnnotationRow(body, entry) {
  const row = document.createElement("div");
  row.className = "anno-row";
  const label = document.createElement("div");
  label.className = "anno-label";
  label.textContent = t("annoLabel");
  row.appendChild(label);
  const textarea = document.createElement("textarea");
  textarea.className = "anno-input";
  textarea.placeholder = t("annoPlaceholder");
  textarea.value = entry.note || "";
  const saved = document.createElement("span");
  saved.className = "anno-saved";
  saved.textContent = " " + t("annoSaved");

  let debounceTimer = null;
  textarea.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try {
        const origin = originOf(entry.url);
        if (!origin) return;
        const key = "history::" + origin;
        const stored = await chrome.storage.local.get(key);
        const list = stored[key] || [];
        const idx = list.findIndex((e) => e.url === entry.url && e.timestamp === entry.timestamp);
        if (idx >= 0) {
          list[idx].note = textarea.value;
          entry.note = textarea.value;
          await chrome.storage.local.set({ [key]: list });
          saved.classList.add("show");
          setTimeout(() => saved.classList.remove("show"), 1200);
        }
      } catch (_e) {}
    }, 400);
  });

  row.appendChild(textarea);
  row.appendChild(saved);
  body.appendChild(row);
}

// ---------- Diff view ----------

function computeDiffRows(a, b) {
  const rows = [];
  const start = (p) => Number(p[SERIES[0]]) || 0;
  const getLcp = (p) => {
    const lcp = Number(p["largest-contentful-paint"]);
    const s = start(p);
    return (Number.isFinite(lcp) && lcp > 0 && s) ? lcp - s : null;
  };
  const getDomComplete = (p) => {
    const d = Number(p.domComplete); const s = start(p);
    return (Number.isFinite(d) && d > 0 && s) ? d - s : null;
  };
  const totalTransfer = (p) => (p.allResources || p.resources || []).reduce((s, r) => s + (r.transferSize || 0), 0);
  const topTransfer = (p) => (p.resources && p.resources[0] && p.resources[0].transferSize) || 0;

  rows.push({ section: "cwv", label: "LCP", a: getLcp(a), b: getLcp(b), unit: "ms", lowerIsBetter: true });
  rows.push({ section: "cwv", label: "CLS", a: Number.isFinite(a.cls) ? a.cls : null, b: Number.isFinite(b.cls) ? b.cls : null, unit: "", lowerIsBetter: true, digits: 2 });
  rows.push({ section: "cwv", label: "INP", a: Number.isFinite(a.inp) ? a.inp : null, b: Number.isFinite(b.inp) ? b.inp : null, unit: "ms", lowerIsBetter: true });
  rows.push({ section: "cwv", label: "domComplete", a: getDomComplete(a), b: getDomComplete(b), unit: "ms", lowerIsBetter: true });
  rows.push({ section: "transfer", label: "Top resource", a: topTransfer(a), b: topTransfer(b), unit: "bytes", lowerIsBetter: true });
  rows.push({ section: "transfer", label: "Total transfer", a: totalTransfer(a), b: totalTransfer(b), unit: "bytes", lowerIsBetter: true });
  rows.push({ section: "transfer", label: "Resources", a: (a.allResources || a.resources || []).length, b: (b.allResources || b.resources || []).length, unit: "", lowerIsBetter: true });
  return rows;
}

function fmtDiffValue(row, v) {
  if (v === null || v === undefined) return "\u2014";
  if (row.unit === "ms") return localeInt(Math.round(v)) + " ms";
  if (row.unit === "bytes") return formatBytes(v) || "0 B";
  if (row.digits) return localeFixed(v, row.digits);
  return String(v);
}

function fmtDelta(row) {
  if (row.a === null || row.b === null || row.a === undefined || row.b === undefined) return { text: "\u2014", cls: "same" };
  const delta = row.b - row.a;
  if (Math.abs(delta) < 0.01 * Math.max(Math.abs(row.a), 1)) return { text: t("diffDeltaSame"), cls: "same" };
  const better = row.lowerIsBetter ? delta < 0 : delta > 0;
  const sign = delta > 0 ? "+" : "";
  let text;
  if (row.unit === "bytes") text = sign + (formatBytes(delta) || "0 B");
  else if (row.unit === "ms") text = sign + localeInt(Math.round(delta)) + " ms";
  else if (row.digits) text = sign + localeFixed(delta, row.digits);
  else text = sign + localeInt(delta);
  return { text, cls: better ? "better" : "worse" };
}

function renderDiffView(a, b) {
  state.view = "historyDiff";
  setSubheadText(t("subheadDiff"));
  setBackButton(t("buttonBackToList"), t("ariaLabelBackDiff"), () => renderHistoryListView());
  hideUrlBar(); hideCwvBar();
  clearNode(document.getElementById("banner-container"));
  clearNode(document.getElementById("whatsnew-container"));

  const body = document.getElementById("body");
  clearNode(body);

  const header = document.createElement("div");
  header.className = "diff-header";
  const colA = document.createElement("div"); colA.className = "col-a";
  const aStrong = document.createElement("strong"); aStrong.textContent = "A — " + relativeTime(a.timestamp); colA.appendChild(aStrong);
  if (a.note) { colA.appendChild(document.createElement("br")); const em = document.createElement("em"); em.textContent = a.note; colA.appendChild(em); }
  const colB = document.createElement("div"); colB.className = "col-b";
  const bStrong = document.createElement("strong"); bStrong.textContent = "B — " + relativeTime(b.timestamp); colB.appendChild(bStrong);
  if (b.note) { colB.appendChild(document.createElement("br")); const em = document.createElement("em"); em.textContent = b.note; colB.appendChild(em); }
  header.appendChild(colA); header.appendChild(colB);
  body.appendChild(header);

  const rows = computeDiffRows(a.payload, b.payload);
  const sections = [
    { key: "cwv", label: t("diffSectionCwv") },
    { key: "transfer", label: t("diffSectionTransfer") }
  ];
  let anyChanged = false;
  for (const sect of sections) {
    const sub = document.createElement("h2");
    sub.className = "section-heading";
    sub.textContent = sect.label;
    body.appendChild(sub);
    for (const row of rows.filter((r) => r.section === sect.key)) {
      const tr = document.createElement("div");
      tr.className = "diff-row";
      const label = document.createElement("span"); label.className = "label"; label.textContent = row.label;
      tr.appendChild(label);
      const aEl = document.createElement("span"); aEl.className = "a"; aEl.textContent = fmtDiffValue(row, row.a); tr.appendChild(aEl);
      const arrow = document.createElement("span"); arrow.className = "arrow"; arrow.textContent = "\u2192"; tr.appendChild(arrow);
      const bEl = document.createElement("span"); bEl.className = "b"; bEl.textContent = fmtDiffValue(row, row.b); tr.appendChild(bEl);
      const d = fmtDelta(row);
      const delta = document.createElement("span"); delta.className = "delta " + d.cls; delta.textContent = d.text; tr.appendChild(delta);
      if (d.cls !== "same") anyChanged = true;
      body.appendChild(tr);
    }
  }
  if (!anyChanged) {
    const empty = document.createElement("div");
    empty.className = "insights-empty";
    empty.textContent = t("diffNoChanges");
    body.appendChild(empty);
  }
}

function renderReportBody(payload) {
  const body = document.getElementById("body");
  clearNode(body);
  renderBudgetBanner(payload);
  renderConsoleErrorsSection(body, payload);
  renderInsightsSection(body, payload);
  renderThirdPartySection(body, payload);
  if (state.options && state.options.seoChecks) renderSeoSection(body, payload);
  if (state.options && state.options.axeChecks) renderAxeScoreSection(body, payload);
  renderTimingTable(body, payload);
  renderWaterfallSection(body, payload);
  renderStorageSection(body, payload.storage);
  renderResourcesSection(body, payload.resources);
  renderRumSection(body);
}

// ---------- Consent + onboarding ----------

function brandLogoSvg() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 128 128");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M 16 64 L 40 64 L 48 56 L 56 64 L 68 24 L 76 104 L 84 64 L 112 64");
  path.setAttribute("stroke", "#FFFFFF"); path.setAttribute("stroke-width", "12");
  path.setAttribute("stroke-linecap", "round"); path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("fill", "none");
  svg.appendChild(path);
  return svg;
}

function renderFullCard(kind) {
  state.view = kind;
  hideCwvBar(); hideUrlBar();
  document.getElementById("history-btn").disabled = true;
  document.getElementById("export-btn").disabled = true;
  document.getElementById("share-btn").disabled = true;
  document.getElementById("mobile-btn").disabled = true;
  setBackButton(null);
  setSubheadText(kind === "consent" ? t("consentSubhead") : t("onboardingSubhead"));
  const body = document.getElementById("body");
  clearNode(body);
  const card = document.createElement("div"); card.className = "full-card";
  const logo = document.createElement("div"); logo.className = "logo"; logo.appendChild(brandLogoSvg());
  card.appendChild(logo);
  const h = document.createElement("h2");
  h.textContent = kind === "consent" ? t("consentTitle") : t("onboardingTitle");
  card.appendChild(h);
  if (kind === "consent") {
    const p = document.createElement("p"); p.textContent = t("consentLead"); card.appendChild(p);
    const ul = document.createElement("ul");
    ["consentPoint1", "consentPoint2", "consentPoint3", "consentPoint4"].forEach((k) => {
      const li = document.createElement("li"); li.textContent = t(k); ul.appendChild(li);
    });
    card.appendChild(ul);
    const cta = document.createElement("div"); cta.className = "cta-row";
    const btn = document.createElement("button"); btn.className = "cta-primary";
    btn.textContent = t("consentCta"); btn.onclick = async () => {
      await chrome.storage.local.set({ "pv::consent": true }); await chrome.storage.local.remove("pv::needs-consent");
      boot();
    };
    cta.appendChild(btn);
    card.appendChild(cta);
  } else {
    const p = document.createElement("p"); p.textContent = t("onboardingLead"); card.appendChild(p);
    const ul = document.createElement("ul");
    ["onboardingPoint1", "onboardingPoint2", "onboardingPoint3"].forEach((k) => {
      const li = document.createElement("li"); li.textContent = t(k); ul.appendChild(li);
    });
    card.appendChild(ul);
    const cta = document.createElement("div"); cta.className = "cta-row";
    const primary = document.createElement("button"); primary.className = "cta-primary";
    primary.textContent = t("onboardingCta"); primary.onclick = async () => {
      await chrome.storage.local.set({ "pv::onboarded": true });
      document.getElementById("history-btn").disabled = false;
      document.getElementById("export-btn").disabled = false;
      document.getElementById("share-btn").disabled = false;
      document.getElementById("mobile-btn").disabled = false;
      state.view = "current";
      renderCurrentView();
    };
    cta.appendChild(primary);
    const ghost = document.createElement("button"); ghost.className = "cta-ghost";
    ghost.textContent = t("onboardingSkip"); ghost.onclick = primary.onclick;
    cta.appendChild(ghost);
    card.appendChild(cta);
  }
  body.appendChild(card);
}

// ---------- Current / History views ----------

function renderCurrentView() {
  state.view = "current";
  setSubheadText(state.mobileMode ? t("subheadCurrentMobile") : t("subheadCurrent"));
  setBackButton(null);
  if (state.tab && state.tab.url) setUrlBar(state.tab.url); else setUrlBar(null);
  if (!state.payload) {
    hideCwvBar();
    showStateMessage([t("stateNoDataLine1"), t("stateNoDataLine2")]);
    return;
  }
  setCwvBar(state.payload);
  maybeRenderWhatsNew();
  renderReportBody(state.payload);
}

async function renderHistoryListView() {
  state.view = "historyList";
  state.historySelection = new Set();
  const origin = state.tab ? originOf(state.tab.url) : null;
  const originText = origin ? origin.replace(/^https?:\/\//, "") : "";
  setSubheadText(origin ? t("subheadHistoryList", [originText]) : t("subheadHistoryList", [""]));
  setBackButton(t("buttonBack"), t("ariaLabelBackToCurrent"), () => renderCurrentView());
  hideUrlBar(); hideCwvBar();
  clearNode(document.getElementById("banner-container"));
  clearNode(document.getElementById("whatsnew-container"));
  const body = document.getElementById("body"); clearNode(body);
  if (!origin) { showStateMessage([t("stateNoHistoryLine1"), t("stateNoHistoryLine2")]); return; }
  const key = "history::" + origin;
  const stored = await chrome.storage.local.get(key);
  const entries = stored[key] || [];
  if (entries.length === 0) { showStateMessage([t("stateNoHistoryLine1"), t("stateNoHistoryLine2")]); return; }

  const actionbar = document.createElement("div");
  actionbar.className = "history-actionbar";
  actionbar.id = "history-actionbar";
  const status = document.createElement("span"); status.id = "history-selected-count";
  status.textContent = t("historyCompareDisabled");
  actionbar.appendChild(status);
  const compare = document.createElement("button");
  compare.id = "history-compare-btn"; compare.type = "button";
  compare.textContent = t("historyCompareCta", ["0"]);
  compare.disabled = true;
  actionbar.appendChild(compare);
  body.appendChild(actionbar);

  const newest = entries.slice().reverse();
  const entriesById = new Map();
  for (const entry of newest) {
    const id = entry.url + "|" + entry.timestamp;
    entriesById.set(id, entry);
    body.appendChild(renderHistoryCard(entry, id, entries.length));
  }

  compare.addEventListener("click", () => {
    if (state.historySelection.size !== 2) return;
    const [idA, idB] = Array.from(state.historySelection);
    const a = entriesById.get(idA);
    const b = entriesById.get(idB);
    if (!a || !b) return;
    const ordered = a.timestamp <= b.timestamp ? [a, b] : [b, a];
    renderDiffView(ordered[0], ordered[1]);
  });
}

function updateHistoryActionBar(total) {
  const n = state.historySelection.size;
  const status = document.getElementById("history-selected-count");
  const btn = document.getElementById("history-compare-btn");
  if (!status || !btn) return;
  if (n === 0) {
    status.textContent = t("historyCompareDisabled");
  } else {
    status.textContent = t("historySelectedOfTotal", [String(n), String(total)]);
  }
  btn.textContent = t("historyCompareCta", [String(n)]);
  btn.disabled = n !== 2;
}

function renderHistoryCard(entry, id, total) {
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "history-item";
  btn.dataset.id = id;

  const chk = document.createElement("span"); chk.className = "history-chk";
  btn.appendChild(chk);

  const when = document.createElement("div"); when.className = "when"; when.textContent = relativeTime(entry.timestamp); btn.appendChild(when);
  const path = document.createElement("div"); path.className = "path"; path.textContent = pathOf(entry.url); btn.appendChild(path);
  const stats = document.createElement("div"); stats.className = "stats"; stats.textContent = formatHistoryStats(entry.payload); btn.appendChild(stats);
  if (entry.note) {
    const note = document.createElement("div"); note.className = "history-note";
    note.textContent = entry.note; btn.appendChild(note);
  }

  btn.addEventListener("click", (e) => {
    if (e.target === chk || (e.target instanceof Element && e.target.closest(".history-chk"))) {
      e.stopPropagation();
    }
  });

  chk.addEventListener("click", (e) => {
    e.stopPropagation();
    if (state.historySelection.has(id)) {
      state.historySelection.delete(id);
      btn.classList.remove("sel");
    } else {
      if (state.historySelection.size >= 2) {
        const [first] = state.historySelection;
        state.historySelection.delete(first);
        const old = document.querySelector('.history-item[data-id="' + CSS.escape(first) + '"]');
        if (old) old.classList.remove("sel");
      }
      state.historySelection.add(id);
      btn.classList.add("sel");
    }
    updateHistoryActionBar(total);
  });

  btn.addEventListener("click", () => renderHistoryDetailView(entry));
  return btn;
}

function formatHistoryStats(payload) {
  if (!payload) return "\u2014";
  const start = Number(payload[SERIES[0]]) || 0;
  const lcp = Number(payload["largest-contentful-paint"]);
  const domComplete = Number(payload["domComplete"]);
  const parts = [];
  if (Number.isFinite(lcp) && lcp > 0 && start) parts.push(t("historyStatLcp", [localeInt(Math.round(lcp - start))]));
  if (Number.isFinite(domComplete) && domComplete > 0 && start) parts.push(t("historyStatDom", [localeInt(Math.round(domComplete - start))]));
  if (payload.resources && payload.resources[0] && payload.resources[0].transferSize) {
    parts.push(t("historyStatTop", [formatBytes(payload.resources[0].transferSize)]));
  }
  return parts.join(" \u00b7 ") || t("historyNoMetrics");
}

function renderHistoryDetailView(entry) {
  state.view = "historyDetail";
  state.detailSnapshot = entry;
  setSubheadText(t("subheadHistoryDetail", [relativeTime(entry.timestamp)]));
  setBackButton(t("buttonBackToList"), t("ariaLabelBackToList"), () => renderHistoryListView());
  setUrlBar(entry.url); setCwvBar(entry.payload);
  clearNode(document.getElementById("whatsnew-container"));
  renderReportBody(entry.payload);
  const body = document.getElementById("body");
  const anno = document.createElement("div");
  body.insertBefore(anno, body.firstChild);
  renderAnnotationRow(anno, entry);
}

// ---------- Export + Share ----------

function activePayload() {
  if (state.view === "historyDetail" && state.detailSnapshot) return state.detailSnapshot.payload;
  return state.payload;
}
function activeUrl() {
  if (state.view === "historyDetail" && state.detailSnapshot) return state.detailSnapshot.url;
  return state.tab ? state.tab.url : null;
}

function buildExportObject() {
  return { brand: "PulseVitals", version: CURRENT_VERSION, generatedAt: new Date().toISOString(),
    url: activeUrl(), payload: activePayload() };
}

function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const str = String(v);
  if (/[",\n]/.test(str)) return "\"" + str.replace(/"/g, "\"\"") + "\"";
  return str;
}

function buildCsv(obj) {
  const payload = obj.payload || {};
  const start = Number(payload[SERIES[0]]) || 0;
  const lines = ["section,key,value1,value2"];
  for (const key of SERIES) {
    const raw = Number(payload[key]);
    const hasValue = Number.isFinite(raw) && raw > 0;
    const delta = (hasValue && start) ? Math.round(raw - start) : "";
    lines.push(["timing", csvEscape(key), hasValue ? raw : "", delta].join(","));
  }
  for (const key of PAINT_SERIES) {
    const raw = Number(payload[key]);
    const hasValue = Number.isFinite(raw) && raw > 0;
    const delta = (hasValue && start) ? Math.round(raw - start) : "";
    lines.push(["paint", csvEscape(key), hasValue ? raw : "", delta].join(","));
  }
  if (payload.storage) {
    const s = payload.storage;
    lines.push(["storage", "localStorage", s.localStorage === null ? "" : s.localStorage, "bytes"].join(","));
    lines.push(["storage", "sessionStorage", s.sessionStorage === null ? "" : s.sessionStorage, "bytes"].join(","));
    lines.push(["storage", "usage", s.usage === null ? "" : s.usage, "bytes"].join(","));
    lines.push(["storage", "quota", s.quota === null ? "" : s.quota, "bytes"].join(","));
  }
  if (payload.resources) {
    for (const r of payload.resources) lines.push(["resource", csvEscape(r.name), r.transferSize, r.duration].join(","));
  }
  return lines.join("\n") + "\n";
}

function downloadBlob(data, filename, type) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportReport() {
  if (!activePayload()) { showToast(t("toastNothingToExport")); return; }
  const obj = buildExportObject();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  downloadBlob(JSON.stringify(obj, null, 2), "pulsevitals-report-" + stamp + ".json", "application/json");
  downloadBlob(buildCsv(obj), "pulsevitals-report-" + stamp + ".csv", "text/csv");
  showToast(t("toastExportDone"));
}

function buildShareHtml() {
  const payload = activePayload();
  const url = activeUrl() || "";
  const when = new Date().toLocaleString(currentLocale());
  const { verdict, lcpMs, cls, inp } = computeCwv(payload);
  const insights = generateInsights(payload);
  const tp = groupThirdParty(payload.allResources || payload.resources, originOf(url));
  const start = Number(payload[SERIES[0]]) || 0;

  const verdictColor = verdict === "good" ? "#16A34A" : verdict === "warn" ? "#D97706" : verdict === "bad" ? "#DC2626" : "#94A3B8";
  const verdictLabel = verdict === "good" ? "Good" : verdict === "warn" ? "Needs improvement" : verdict === "bad" ? "Poor" : "Measuring";

  const insightsHtml = insights.map((i) => {
    const color = i.severity === "bad" ? "#DC2626" : i.severity === "warn" ? "#D97706" : "#E11D48";
    const tag = i.platform ? `<span style="font-size:0.7rem;font-weight:600;color:#E11D48;border:1px solid #E11D4840;padding:1px 6px;border-radius:4px;margin-right:6px;">${escapeHtml(i.platform)}</span>` : "";
    return `<div style="padding:12px 0;border-bottom:1px solid #E2E8F0;">
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px;">
        <span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;"></span>
        <strong style="font-size:0.95rem;flex:1;">${tag}${escapeHtml(i.title)}</strong>
        <span style="font-family:ui-monospace,monospace;font-size:0.8rem;color:#475569;">${escapeHtml(i.savings)}</span>
      </div>
      <p style="font-size:0.85rem;color:#475569;margin:0;">${escapeHtml(i.fix)}</p>
    </div>`;
  }).join("");

  const timingRows = SERIES.map((k) => {
    const raw = Number(payload[k]);
    const hasValue = Number.isFinite(raw) && raw > 0;
    const delta = (hasValue && start) ? Math.round(raw - start) : "—";
    return `<tr><td>${escapeHtml(k)}</td><td style="text-align:right;font-family:ui-monospace,monospace;">${delta}</td></tr>`;
  }).join("") + PAINT_SERIES.map((k) => {
    const raw = Number(payload[k]);
    const hasValue = Number.isFinite(raw) && raw > 0;
    const delta = (hasValue && start) ? Math.round(raw - start) : "—";
    return `<tr><td>${escapeHtml(k)}</td><td style="text-align:right;font-family:ui-monospace,monospace;">${delta}</td></tr>`;
  }).join("");

  const tpHtml = tp.length ? tp.map((g) => `<tr>
    <td><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${g.color};margin-right:6px;"></span>${escapeHtml(g.vendor)}</td>
    <td style="text-align:right;font-family:ui-monospace,monospace;">${g.count}</td>
    <td style="text-align:right;font-family:ui-monospace,monospace;">${escapeHtml(formatBytes(g.transferSize) || "—")}</td>
  </tr>`).join("") : `<tr><td colspan="3" style="color:#475569;">No third-party resources detected.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>PulseVitals Report — ${escapeHtml(url)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root { color-scheme: light dark; }
body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  max-width: 820px; margin: 32px auto; padding: 0 24px; line-height: 1.5; color: #0F172A; background: #FFFFFF; }
h1 { font-size: 1.75rem; margin: 0 0 4px; }
.meta { color: #475569; margin: 0 0 24px; font-size: 0.9rem; }
h2 { font-size: 0.8rem; margin: 28px 0 12px; color: #475569;
  text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
.cwv-hero { padding: 16px 20px; border-radius: 8px;
  background: ${verdictColor}1A; color: ${verdictColor};
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.cwv-hero .big { font-weight: 600; font-size: 1.125rem; }
.cwv-hero .stats { font-family: ui-monospace, monospace; font-size: 0.9rem; }
table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-bottom: 8px; }
td, th { padding: 6px 4px; border-bottom: 1px solid #E2E8F0; text-align: left; }
th { font-weight: 600; color: #475569; font-size: 0.75rem;
  text-transform: uppercase; letter-spacing: 0.06em; }
footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E2E8F0;
  color: #475569; font-size: 0.8rem; }
@media (prefers-color-scheme: dark) {
  body { background: #0B0F14; color: #E6EDF3; }
  .meta, h2, td, th, footer { color: #94A3B8; }
  td, th { border-bottom-color: #1F2933; }
  footer { border-top-color: #1F2933; }
}
</style>
</head>
<body>
<h1>PulseVitals Report</h1>
<p class="meta">${escapeHtml(url)} · Generated ${escapeHtml(when)}</p>
<div class="cwv-hero">
  <span class="big">Core Web Vitals: ${escapeHtml(verdictLabel)}</span>
  <span class="stats">LCP ${lcpMs !== null ? (lcpMs / 1000).toFixed(1) + "s" : "—"} &nbsp;&nbsp; CLS ${cls !== null ? cls.toFixed(2) : "—"} &nbsp;&nbsp; INP ${inp !== null ? Math.round(inp) + "ms" : "—"}</span>
</div>
<h2>Insights</h2>
${insightsHtml || `<p style="color:#475569;">No actionable issues detected.</p>`}
<h2>Third-party origins</h2>
<table>
  <thead><tr><th>Vendor</th><th style="text-align:right;">Requests</th><th style="text-align:right;">Transfer</th></tr></thead>
  <tbody>${tpHtml}</tbody>
</table>
<h2>Timings (Δ from navigationStart, ms)</h2>
<table>
  <thead><tr><th>Event</th><th style="text-align:right;">Δ (ms)</th></tr></thead>
  <tbody>${timingRows}</tbody>
</table>
<footer>Generated by PulseVitals · <a href="https://pulsevitals.app" style="color:#E11D48;text-decoration:none;">pulsevitals.app</a></footer>
</body>
</html>`;
}

function shareReport() {
  if (!activePayload()) { showToast(t("toastNothingToExport")); return; }
  const html = buildShareHtml();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  downloadBlob(html, "pulsevitals-report-" + stamp + ".html", "text/html");
  showToast(t("toastShareDone"));
}

// ---------- Persistence ----------

async function persistSnapshot() {
  if (!state.payload || !state.tab || !state.tab.url) return;
  if (isUnsupportedUrl(state.tab.url)) return;
  const origin = originOf(state.tab.url);
  if (!origin) return;
  const key = "history::" + origin;
  const stored = await chrome.storage.local.get(key);
  let list = stored[key] || [];
  const entry = { url: state.tab.url, timestamp: Date.now(), payload: state.payload };
  if (list.length > 0) {
    const latest = list[list.length - 1];
    if (latest.url === entry.url && (entry.timestamp - latest.timestamp) < HISTORY_DEDUP_WINDOW_MS) list[list.length - 1] = entry;
    else list.push(entry);
  } else list.push(entry);
  if (list.length > MAX_HISTORY_PER_ORIGIN) list = list.slice(list.length - MAX_HISTORY_PER_ORIGIN);
  await chrome.storage.local.set({ [key]: list });
}

// ---------- Options ----------

const OPTIONS_DEFAULTS = {
  autoMeasure: true, mobileDefault: false, platformTips: true,
  seoChecks: true, axeChecks: true, pinEnabled: false, alerts: false,
  budgetLcp: 2500, budgetCls: 0.10, budgetInp: 200,
  denylist: "", bugUrl: "https://pulsevitals.app/feedback"
};

async function loadOptions() {
  try { state.options = await chrome.storage.sync.get(OPTIONS_DEFAULTS); }
  catch (_e) { state.options = Object.assign({}, OPTIONS_DEFAULTS); }
  state.mobileMode = !!state.options.mobileDefault;
  document.getElementById("mobile-btn").classList.toggle("active", state.mobileMode);
  const bug = document.getElementById("bug-link");
  if (bug) bug.href = state.options.bugUrl || OPTIONS_DEFAULTS.bugUrl;
}

// ---------- Main ----------

async function boot() {
  applyStaticI18n();
  try { document.documentElement.lang = currentLocale().split("-")[0] || "en"; } catch (_e) {}
  await loadOptions();

  const needsConsent = (await chrome.storage.local.get(["pv::consent", "pv::needs-consent"]));
  if (needsConsent["pv::needs-consent"] && !needsConsent["pv::consent"]) {
    renderFullCard("consent");
    return;
  }

  document.getElementById("history-btn").onclick = () => {
    if (state.view === "historyList") renderCurrentView();
    else renderHistoryListView();
  };
  document.getElementById("export-btn").onclick = () => exportReport();
  document.getElementById("share-btn").onclick = () => shareReport();
  document.getElementById("mobile-btn").onclick = () => {
    state.mobileMode = !state.mobileMode;
    document.getElementById("mobile-btn").classList.toggle("active", state.mobileMode);
    setSubheadText(state.mobileMode ? t("subheadCurrentMobile") : t("subheadCurrent"));
  };
  document.getElementById("options-link").onclick = (e) => {
    e.preventDefault();
    try { chrome.runtime.openOptionsPage(); } catch (_e) {}
  };
  document.getElementById("bug-link").onclick = (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: state.options.bugUrl || OPTIONS_DEFAULTS.bugUrl });
  };

  let tab;
  try { const tabs = await chrome.tabs.query({ active: true, currentWindow: true }); tab = tabs[0]; }
  catch (_e) { setUrlBar(null); showStateMessage([t("stateErrorLine1"), t("stateErrorLine2")]); return; }
  if (!tab) { setUrlBar(null); showStateMessage([t("stateErrorLine1"), t("stateErrorLine2")]); return; }
  state.tab = tab; setUrlBar(tab.url);

  if (isUnsupportedUrl(tab.url)) { hideCwvBar(); showStateMessage([t("stateUnsupported")]); return; }
  if (isDeniedOrigin(tab.url)) { hideCwvBar(); showStateMessage([t("stateDenied")]); return; }

  let response;
  try { response = await chrome.tabs.sendMessage(tab.id, { type: "PULSEVITALS_GET_TIMINGS" }); }
  catch (_e) { showStateMessage([t("stateNoDataLine1"), t("stateNoDataLine2")]); return; }
  if (!response || response.type !== "PULSEVITALS_TIMINGS" || !response.payload) {
    showStateMessage([t("stateNoDataLine1"), t("stateNoDataLine2")]); return;
  }
  state.payload = response.payload;

  const onboarded = await chrome.storage.local.get(["pv::onboarded"]);
  if (!onboarded["pv::onboarded"]) {
    renderFullCard("onboarding");
    return;
  }

  renderCurrentView();
  persistSnapshot().catch(() => {});
}

boot();
