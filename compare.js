// PulseVitals competitor comparison.
// Reuses the batch-audit measurement primitive (open → wait → query → close).

const PER_URL_TIMEOUT_MS = 20 * 1000;
const MEASURE_SETTLE_MS = 1500;
const CWV_THRESHOLDS = { lcp: [2500, 4000], cls: [0.1, 0.25], inp: [200, 500] };

let rows = [];

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

function verdictLabel(v) {
  return v === "good" ? "Good" : v === "warn" ? "Needs improvement" : v === "bad" ? "Poor" : "—";
}

function extractMetrics(payload, url, label) {
  const start = Number(payload.navigationStart) || 0;
  const lcpRaw = Number(payload["largest-contentful-paint"]);
  const lcp = (Number.isFinite(lcpRaw) && lcpRaw > 0 && start) ? Math.round(lcpRaw - start) : null;
  const cls = Number.isFinite(payload.cls) ? payload.cls : null;
  const inp = Number.isFinite(payload.inp) ? Math.round(payload.inp) : null;
  const transfer = (payload.resources || []).reduce((s, r) => s + (r.transferSize || 0), 0);
  return { label, url, lcp, cls, inp, transfer };
}

function emptyRow(url, label, reason) {
  return { label, url, lcp: null, cls: null, inp: null, transfer: 0, error: reason };
}

async function measureOne(url, label) {
  let tab;
  try { tab = await chrome.tabs.create({ url, active: false }); }
  catch (_e) { return emptyRow(url, label, "couldn't open tab"); }
  const tabId = tab.id;

  await new Promise((resolve) => {
    let done = false;
    const onUpdated = (changedId, info) => {
      if (changedId === tabId && info.status === "complete" && !done) {
        done = true; chrome.tabs.onUpdated.removeListener(onUpdated); resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
    setTimeout(() => {
      if (!done) { done = true; try { chrome.tabs.onUpdated.removeListener(onUpdated); } catch (_e) {} resolve(); }
    }, PER_URL_TIMEOUT_MS);
  });

  await new Promise((r) => setTimeout(r, MEASURE_SETTLE_MS));

  let response;
  try { response = await chrome.tabs.sendMessage(tabId, { type: "PULSEVITALS_GET_TIMINGS" }); }
  catch (_e) { try { await chrome.tabs.remove(tabId); } catch (_x) {} return emptyRow(url, label, "no response"); }
  try { await chrome.tabs.remove(tabId); } catch (_e) {}

  if (!response || !response.payload) return emptyRow(url, label, "empty payload");
  return extractMetrics(response.payload, url, label);
}

function renderRow(row, winners) {
  const tr = document.createElement("tr");
  const tdSite = document.createElement("td");
  tdSite.className = "url";
  tdSite.title = row.url;
  tdSite.textContent = row.label + " — " + row.url;
  tr.appendChild(tdSite);

  const verdict = computeVerdict(row);
  const tdV = document.createElement("td");
  const dot = document.createElement("span"); dot.className = "dot " + verdict;
  tdV.appendChild(dot);
  tdV.appendChild(document.createTextNode(row.error || verdictLabel(verdict)));
  tr.appendChild(tdV);

  const cell = (value, metric) => {
    const td = document.createElement("td");
    td.className = "num";
    td.textContent = value === null || value === undefined ? "—" : String(value);
    if (winners[metric] === row.label) td.classList.add("winner");
    return td;
  };
  tr.appendChild(cell(row.lcp, "lcp"));
  tr.appendChild(cell(row.cls === null ? null : row.cls.toFixed(2), "cls"));
  tr.appendChild(cell(row.inp, "inp"));
  tr.appendChild(cell(row.transfer ? (row.transfer / 1024).toFixed(0) + " KB" : null, "transfer"));

  return tr;
}

function computeWinners() {
  const winners = {};
  const bestLower = (key) => {
    const cand = rows.filter((r) => r[key] !== null && Number.isFinite(r[key]));
    if (cand.length < 2) return null;
    return cand.reduce((best, r) => r[key] < best[key] ? r : best).label;
  };
  winners.lcp = bestLower("lcp");
  winners.cls = bestLower("cls");
  winners.inp = bestLower("inp");
  winners.transfer = bestLower("transfer");
  return winners;
}

function render() {
  const body = document.getElementById("results-body");
  body.textContent = "";
  if (!rows.length) {
    document.getElementById("results-wrap").hidden = true;
    document.getElementById("empty").hidden = false;
    return;
  }
  document.getElementById("results-wrap").hidden = false;
  document.getElementById("empty").hidden = true;
  const winners = computeWinners();
  for (const row of rows) body.appendChild(renderRow(row, winners));
}

function updateProgress(text) { document.getElementById("progress").textContent = text || ""; }

async function runCompare() {
  const entries = [
    ["You", document.getElementById("url-you").value.trim()],
    ["Competitor 1", document.getElementById("url-a").value.trim()],
    ["Competitor 2", document.getElementById("url-b").value.trim()]
  ].filter((e) => e[1]);

  if (entries.length < 2) {
    updateProgress("Enter at least two URLs.");
    return;
  }

  rows = [];
  render();
  const btn = document.getElementById("compare");
  btn.disabled = true;
  document.getElementById("share-png").disabled = true;

  for (let i = 0; i < entries.length; i++) {
    const [label, url] = entries[i];
    updateProgress(`Measuring ${label}… (${i + 1} / ${entries.length})`);
    const row = await measureOne(url, label);
    rows.push(row);
    render();
  }
  updateProgress(`Done · ${rows.length} sites compared.`);
  btn.disabled = false;
  document.getElementById("share-png").disabled = false;
}

function sharePng() {
  if (!rows.length) return;
  const canvas = document.getElementById("png-canvas");
  const ctx = canvas.getContext("2d");
  canvas.style.display = "";

  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = "#0B0F14"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#E11D48"; ctx.fillRect(64, 64, 48, 48);
  ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(70, 88); ctx.lineTo(80, 88); ctx.lineTo(84, 82); ctx.lineTo(88, 88);
  ctx.lineTo(94, 70); ctx.lineTo(98, 106); ctx.lineTo(102, 88); ctx.lineTo(108, 88); ctx.stroke();

  ctx.fillStyle = "#FFFFFF"; ctx.font = "600 48px system-ui, sans-serif";
  ctx.fillText("PulseVitals · Comparison", 140, 100);
  ctx.fillStyle = "#94A3B8"; ctx.font = "400 22px system-ui, sans-serif";
  ctx.fillText(new Date().toLocaleDateString(), 140, 134);

  const cellW = (W - 128) / 5;
  const rowH = 72;
  let y = 190;

  ctx.fillStyle = "#94A3B8"; ctx.font = "600 18px system-ui, sans-serif";
  ["Site", "Verdict", "LCP (ms)", "CLS", "Transfer"].forEach((h, i) => {
    ctx.fillText(h, 64 + i * cellW, y);
  });
  ctx.strokeStyle = "#1F2933"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(64, y + 10); ctx.lineTo(W - 64, y + 10); ctx.stroke();
  y += rowH;

  const winners = computeWinners();
  for (const row of rows) {
    const verdict = computeVerdict(row);
    ctx.font = "600 24px system-ui, sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(row.label, 64, y);
    ctx.font = "400 18px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = "#94A3B8";
    const urlText = row.url.length > 26 ? row.url.slice(0, 26) + "…" : row.url;
    ctx.fillText(urlText, 64, y + 24);

    ctx.fillStyle =
      verdict === "good" ? "#22C55E" :
      verdict === "warn" ? "#F59E0B" :
      verdict === "bad" ? "#EF4444" : "#94A3B8";
    ctx.beginPath(); ctx.arc(64 + cellW + 10, y - 6, 8, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "600 22px system-ui, sans-serif";
    ctx.fillText(verdictLabel(verdict), 64 + cellW + 28, y);

    ctx.font = "400 24px ui-monospace, SFMono-Regular, Menlo, monospace";
    const cell = (val, metric, ix) => {
      const text = val === null || val === undefined ? "—" : String(val);
      ctx.fillStyle = winners[metric] === row.label ? "#22C55E" : "#FFFFFF";
      ctx.fillText(text, 64 + ix * cellW, y);
    };
    cell(row.lcp, "lcp", 2);
    cell(row.cls === null ? null : row.cls.toFixed(2), "cls", 3);
    cell(row.transfer ? (row.transfer / 1024).toFixed(0) + " KB" : null, "transfer", 4);

    ctx.strokeStyle = "#1F2933";
    ctx.beginPath(); ctx.moveTo(64, y + 28); ctx.lineTo(W - 64, y + 28); ctx.stroke();
    y += rowH;
  }

  ctx.font = "400 16px system-ui, sans-serif";
  ctx.fillStyle = "#94A3B8";
  ctx.fillText("Generated by PulseVitals · pulsevitals.app", 64, H - 48);

  canvas.toBlob((blob) => {
    canvas.style.display = "none";
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url; a.download = `pulsevitals-comparison-${stamp}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}

document.getElementById("compare").addEventListener("click", runCompare);
document.getElementById("share-png").addEventListener("click", sharePng);
render();
