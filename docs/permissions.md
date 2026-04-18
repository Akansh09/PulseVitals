# PulseVitals — Chrome permission justifications

Copy-paste-ready answers for the Chrome Web Store review form. One paragraph per permission; kept short because reviewers see hundreds of these.

## `storage`

**Reason:** PulseVitals saves up to 10 performance snapshots per origin for the history view (in `chrome.storage.local`) and saves the user's preferences such as budgets, denylist, and theme (in `chrome.storage.sync`). All data stays on the user's device; nothing is transmitted.

## `activeTab`

**Reason:** The toolbar popup reads the active tab's URL and origin to label the report, to check against the user's denylist, and to send a message to the content script running in that tab. This permission grants access only at the moment the user clicks the extension icon.

## `tabs`

**Reason:** The popup uses `chrome.tabs.query({active: true, currentWindow: true})` to identify which tab to display data for, and `chrome.tabs.sendMessage` to request cached metrics from the content script already running there. The Batch audit and Competitor Comparison features use `chrome.tabs.create`/`remove` to load URLs into background tabs for measurement, which requires this permission.

## `notifications` *(requested conditionally)*

**Reason:** Only requested when the user opts into performance-budget alerts from the Options page. When a measurement exceeds the user's configured LCP / CLS / INP budget on a page, a Chrome desktop notification fires. The permission is revocable from the same Options page.

## Host permissions

**Reason:** None requested. The content script declares `matches: ["<all_urls>"]` in `content_scripts`, which is the declarative (not programmatic) form and is strictly scoped to performance-API reads on the tab's own origin. No cross-origin `fetch`, `XMLHttpRequest`, or iframe content access happens anywhere in the extension.

## What we do not request

- `webRequest` / `webRequestBlocking` — we do not intercept or block network requests.
- `scripting` — we do not inject programmatic scripts; the content script is declared in the manifest.
- `cookies` — we never read cookies.
- `history` — we do not read browser history.
- `bookmarks`, `downloads`, `management`, `geolocation`, `clipboardRead` — none.

## Data handling (for the Web Store data usage declaration)

- **Personally identifiable information:** Not collected.
- **Health information:** Not collected.
- **Financial and payment information:** Not collected.
- **Authentication information:** Not collected.
- **Personal communications:** Not collected.
- **Location:** Not collected.
- **Web history:** Not collected; we observe only the active tab's own performance, not a browsing trail.
- **User activity:** Collected locally only (the current tab's click/scroll interactions are observed via `PerformanceObserver` with `type: "event"` to compute INP). Never transmitted.
- **Website content:** The extension reads the `<title>`, meta tags, and structured-data blocks of the current page for the SEO-checks feature. This data is processed locally and never transmitted.

Check the "I do not sell or transfer user data to third parties" and "I do not use or transfer user data for purposes unrelated to the extension's single purpose" boxes.
