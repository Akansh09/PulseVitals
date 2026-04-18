// PulseVitals batch audit.
// For each URL: open a background tab, wait for the content script to measure,
// ask it for the payload via chrome.tabs.sendMessage, close the tab, move on.

const MAX_URLS = 50;
const PER_URL_TIMEOUT_MS = 20 * 1000;
const MEASURE_SETTLE_MS = 1500;

const CWV_THRESHOLDS = {
  lcp: [2500, 4000],
  cls: [0.1, 0.25],
  inp: [200, 500]
};

let results = [];
let sortKey = "transfer";
let sortDir = -1;

function parseUrls(raw) {
  return raw
    .split(/[,\n]/)
    .map((u) => u.trim())
    .filter((u) => u.length > 0)
    .filter((u, i, a) => a.indexOf(u) === i);
}

function rate(v, thresh) {
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  if (v <= thresh[0]) return "good";
  if (v <= thresh[1]) return "warn";
  return "bad";
}

function computeVerdict(row) {
  const ratings = [];
  if (row.lcp !== null) ratings.push(rate(row.lcp, CWV_THRESHOLDS.lcp));
  if (row.cls !== null) ratings.push(rate(row.cls, CWV_THRESHOLDS.cls));
  if (row.inp !== null) ratings.push(rate(row.inp, CWV_THRESHOLDS.inp));
  if (!ratings.length) return "none";
  if (ratings.includes("bad")) return "bad";
  if (ratings.includes("warn")) return "warn";
  return "good";
}

function extractMetrics(payload, url) {
  const start = Number(payload.navigationStart) || 0;
  const lcpRaw = Number(payload["largest-contentful-paint"]);
  const lcp = (Number.isFinite(lcpRaw) && lcpRaw > 0 && start) ? Math.round(lcpRaw - start) : null;
  const cls = Number.isFinite(payload.cls) ? payload.cls : null;
  const inp = Number.isFinite(payload.inp) ? Math.round(payload.inp) : null;
  const responseStart = Number(payload.responseStart);
  const ttfb = (Number.isFinite(responseStart) && responseStart > 0 && start) ? Math.round(responseStart - start) : null;
  const transfer = (payload.resources || []).reduce((s, r) => s + (r.transferSize || 0), 0);
  return { url, lcp, cls, inp, ttfb, transfer };
}

function emptyRow(url, reason) {
  return { url, lcp: null, cls: null, inp: null, ttfb: null, transfer: 0, error: reason };
}

async function measureOne(url) {
  let tab;
  try {
    tab = await chrome.tabs.create({ url, active: false });
  } catch (_e) {
    return emptyRow(url, "couldn't open tab");
  }
  const tabId = tab.id;

  await new Promise((resolve) => {
    let done = false;
    const onUpdated = (changedId, info) => {
      if (changedId === tabId && info.status === "complete" && !done) {
        done = true;
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
    setTimeout(() => {
      if (!done) {
        done = true;
        try { chrome.tabs.onUpdated.removeListener(onUpdated); } catch (_e) {}
        resolve();
      }
    }, PER_URL_TIMEOUT_MS);
  });

  await new Promise((r) => setTimeout(r, MEASURE_SETTLE_MS));

  let response;
  try {
    response = await chrome.tabs.sendMessage(tabId, { type: "PULSEVITALS_GET_TIMINGS" });
  } catch (_e) {
    try { await chrome.tabs.remove(tabId); } catch (_x) {}
    return emptyRow(url, "no response");
  }
  try { await chrome.tabs.remove(tabId); } catch (_e) {}

  if (!response || !response.payload) return emptyRow(url, "empty payload");
  return extractMetrics(response.payload, url);
}

function renderResults() {
  const body = document.getElementById("results-body");
  body.textContent = "";

  if (!results.length) {
    document.getElementById("results-wrap").hidden = true;
    document.getElementById("empty").hidden = false;
    return;
  }
  document.getElementById("results-wrap").hidden = false;
  document.getElementById("empty").hidden = true;

  const sorted = results.slice().sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    if (typeof av === "string") return sortDir * av.localeCompare(bv);
    return sortDir * (av - bv);
  });

  for (const row of sorted) {
    const tr = document.createElement("tr");

    const tdUrl = document.createElement("td");
    tdUrl.className = "url";
    tdUrl.title = row.url;
    tdUrl.textContent = row.url;
    tr.appendChild(tdUrl);

    const verdict = computeVerdict(row);
    const tdV = document.createElement("td");
    const dot = document.createElement("span");
    dot.className = "dot " + verdict;
    tdV.appendChild(dot);
    tdV.appendChild(document.createTextNode(
      row.error ? row.error :
      verdict === "good" ? "Good" :
      verdict === "warn" ? "Needs improvement" :
      verdict === "bad" ? "Poor" : "—"
    ));
    tr.appendChild(tdV);

    const cell = (val) => {
      const td = document.createElement("td");
      td.className = "num";
      td.textContent = val === null || val === undefined ? "—" : String(val);
      return td;
    };
    tr.appendChild(cell(row.lcp));
    tr.appendChild(cell(row.cls === null ? null : row.cls.toFixed(2)));
    tr.appendChild(cell(row.inp));
    tr.appendChild(cell(row.transfer ? (row.transfer / 1024).toFixed(0) + " KB" : null));
    tr.appendChild(cell(row.ttfb));

    body.appendChild(tr);
  }
}

function updateProgress(text) {
  document.getElementById("progress").textContent = text || "";
}

async function runAudit() {
  const raw = document.getElementById("urls").value;
  const urls = parseUrls(raw).slice(0, MAX_URLS);
  if (!urls.length) {
    updateProgress("No URLs to audit.");
    return;
  }
  const btn = document.getElementById("run");
  btn.disabled = true;
  document.getElementById("export").disabled = true;
  results = [];
  renderResults();

  const t0 = Date.now();
  for (let i = 0; i < urls.length; i++) {
    updateProgress(`Measuring ${i + 1} / ${urls.length} · ${urls[i]}`);
    const row = await measureOne(urls[i]);
    results.push(row);
    renderResults();
  }
  const seconds = Math.round((Date.now() - t0) / 1000);
  updateProgress(`Done · ${results.length} URLs in ${seconds}s`);
  btn.disabled = false;
  document.getElementById("export").disabled = false;
}

function exportCsv() {
  if (!results.length) return;
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = ["url,verdict,lcp_ms,cls,inp_ms,transfer_bytes,ttfb_ms"];
  for (const r of results) {
    lines.push([
      escape(r.url),
      escape(computeVerdict(r)),
      escape(r.lcp),
      escape(r.cls),
      escape(r.inp),
      escape(r.transfer),
      escape(r.ttfb)
    ].join(","));
  }
  const blob = new Blob([lines.join("\n") + "\n"], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  a.href = url;
  a.download = `pulsevitals-batch-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function wireSorting() {
  const ths = document.querySelectorAll("th[data-sort]");
  for (const th of ths) {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      sortDir = sortKey === key ? -sortDir : -1;
      sortKey = key;
      renderResults();
    });
  }
}

document.getElementById("run").addEventListener("click", runAudit);
document.getElementById("export").addEventListener("click", exportCsv);
wireSorting();
renderResults();
