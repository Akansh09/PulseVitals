// PulseVitals options page.
// Reads/writes chrome.storage.sync; writes history-clear to chrome.storage.local.

const DEFAULTS = {
  autoMeasure: true,
  mobileDefault: false,
  platformTips: true,
  seoChecks: true,
  axeChecks: true,
  pinEnabled: false,
  alerts: false,
  budgetLcp: 2500,
  budgetCls: 0.10,
  budgetInp: 200,
  denylist: "",
  bugUrl: "https://pulsevitals.app/feedback"
};

const TOGGLE_MAP = {
  "toggle-automeasure": "autoMeasure",
  "toggle-mobile": "mobileDefault",
  "toggle-platform": "platformTips",
  "toggle-seo": "seoChecks",
  "toggle-axe": "axeChecks",
  "toggle-pin": "pinEnabled",
  "toggle-alerts": "alerts"
};

async function broadcastPinChange(enabled) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id) continue;
      chrome.tabs.sendMessage(tab.id, { type: "PULSEVITALS_SET_PIN", enabled }).catch(() => {});
    }
  } catch (_e) {}
}

const savedIndicator = document.getElementById("saved");
let savedTimer = null;
function flashSaved() {
  savedIndicator.classList.add("show");
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => savedIndicator.classList.remove("show"), 1200);
}

function setToggle(el, value) {
  el.classList.toggle("on", !!value);
  el.setAttribute("aria-checked", value ? "true" : "false");
}

async function loadOptions() {
  const stored = await chrome.storage.sync.get(DEFAULTS);
  for (const [id, key] of Object.entries(TOGGLE_MAP)) {
    const el = document.getElementById(id);
    if (el) setToggle(el, stored[key]);
  }
  document.getElementById("denylist").value = stored.denylist || "";
  document.getElementById("budget-lcp").value = stored.budgetLcp;
  document.getElementById("budget-cls").value = stored.budgetCls;
  document.getElementById("budget-inp").value = stored.budgetInp;
  document.getElementById("bug-url").value = stored.bugUrl;
}

async function save(partial) {
  await chrome.storage.sync.set(partial);
  flashSaved();
}

async function requestNotificationsPermission() {
  if (!chrome.permissions || !chrome.permissions.request) return false;
  try {
    return await chrome.permissions.request({ permissions: ["notifications"] });
  } catch (_e) {
    return false;
  }
}

function wireToggles() {
  for (const [id, key] of Object.entries(TOGGLE_MAP)) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.addEventListener("click", async () => {
      const next = !el.classList.contains("on");
      if (key === "alerts" && next) {
        const granted = await requestNotificationsPermission();
        if (!granted) {
          setToggle(el, false);
          return;
        }
      }
      setToggle(el, next);
      save({ [key]: next });
      if (key === "pinEnabled") broadcastPinChange(next);
    });
  }
}

function wireTextInputs() {
  const denylist = document.getElementById("denylist");
  const bugUrl = document.getElementById("bug-url");
  denylist.addEventListener("change", () => save({ denylist: denylist.value }));
  bugUrl.addEventListener("change", () => save({ bugUrl: bugUrl.value.trim() || DEFAULTS.bugUrl }));
}

function wireNumberInputs() {
  const fields = [
    ["budget-lcp", "budgetLcp", (v) => Math.max(0, Math.round(Number(v) || 0))],
    ["budget-cls", "budgetCls", (v) => Math.max(0, Number(v) || 0)],
    ["budget-inp", "budgetInp", (v) => Math.max(0, Math.round(Number(v) || 0))]
  ];
  for (const [id, key, parse] of fields) {
    const el = document.getElementById(id);
    el.addEventListener("change", () => save({ [key]: parse(el.value) }));
  }
}

function wireDataButtons() {
  document.getElementById("clear-history").addEventListener("click", async () => {
    const ok = confirm("Remove every stored PulseVitals snapshot? This can't be undone.");
    if (!ok) return;
    const all = await chrome.storage.local.get(null);
    const keys = Object.keys(all).filter((k) => k.startsWith("history::"));
    if (keys.length) await chrome.storage.local.remove(keys);
    flashSaved();
  });
  document.getElementById("reset-consent").addEventListener("click", async () => {
    await chrome.storage.local.remove(["pv::consent", "pv::onboarded", "pv::whatsnew"]);
    flashSaved();
  });
}

async function main() {
  await loadOptions();
  wireToggles();
  wireTextInputs();
  wireNumberInputs();
  wireDataButtons();
}

main();
