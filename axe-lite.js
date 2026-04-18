// PulseVitals axe-lite — a hand-authored 8-rule accessibility checker.
// Not a vendor copy of axe-core; we keep the rule set tiny on purpose:
//   - Keeps bundled extension size minimal (no vendor blob).
//   - Every rule is something a site owner can act on without reading W3C specs.
// Rules intentionally conservative to avoid false positives.
//
// Each rule: { id, impact: "critical" | "serious" | "moderate", label, check(doc) -> { violations: [{selector, detail}] } }
//
// Exposed as a global `window.PulseVitalsAxeLite` on the page so the content script
// can invoke `PulseVitalsAxeLite.run(document)` and receive a flat list.

(function () {
  "use strict";

  function hasAccessibleName(el) {
    return !!(
      (el.getAttribute("aria-label") || "").trim() ||
      (el.getAttribute("aria-labelledby") || "").trim() ||
      (el.getAttribute("title") || "").trim() ||
      (el.textContent || "").trim()
    );
  }

  function pathTo(el) {
    if (!el || el.nodeType !== 1) return "";
    if (el.id) return "#" + el.id;
    const parts = [];
    let node = el;
    let depth = 0;
    while (node && node.nodeType === 1 && depth < 6) {
      let tag = node.tagName.toLowerCase();
      if (node.classList && node.classList.length) tag += "." + Array.from(node.classList).slice(0, 2).join(".");
      parts.unshift(tag);
      node = node.parentElement;
      depth++;
    }
    return parts.join(" > ");
  }

  const RULES = [
    {
      id: "image-alt",
      impact: "critical",
      label: "Images must have alt text",
      check: function (doc) {
        const violations = [];
        const imgs = doc.querySelectorAll("img:not([alt])");
        for (const img of imgs) {
          if (img.getAttribute("role") === "presentation" || img.getAttribute("aria-hidden") === "true") continue;
          violations.push({ selector: pathTo(img), detail: (img.src || "").slice(-40) });
        }
        return { violations };
      }
    },
    {
      id: "label",
      impact: "critical",
      label: "Form inputs must have accessible labels",
      check: function (doc) {
        const violations = [];
        const inputs = doc.querySelectorAll("input, textarea, select");
        for (const el of inputs) {
          const type = (el.getAttribute("type") || "").toLowerCase();
          if (type === "hidden" || type === "submit" || type === "button" || type === "image") continue;
          if (hasAccessibleName(el)) continue;
          const id = el.id;
          if (id && doc.querySelector("label[for='" + CSS.escape(id) + "']")) continue;
          if (el.closest("label")) continue;
          violations.push({ selector: pathTo(el), detail: "no label/aria-label" });
        }
        return { violations };
      }
    },
    {
      id: "button-name",
      impact: "serious",
      label: "Buttons must have a discernible name",
      check: function (doc) {
        const violations = [];
        const buttons = doc.querySelectorAll("button, [role='button']");
        for (const el of buttons) {
          if (hasAccessibleName(el)) continue;
          violations.push({ selector: pathTo(el), detail: "empty button" });
        }
        return { violations };
      }
    },
    {
      id: "link-name",
      impact: "serious",
      label: "Links must have a discernible name",
      check: function (doc) {
        const violations = [];
        const anchors = doc.querySelectorAll("a[href]");
        for (const el of anchors) {
          if (hasAccessibleName(el)) continue;
          if (el.querySelector("img[alt]")) continue;
          violations.push({ selector: pathTo(el), detail: (el.href || "").slice(-40) });
        }
        return { violations };
      }
    },
    {
      id: "html-has-lang",
      impact: "serious",
      label: "<html> must have a lang attribute",
      check: function (doc) {
        const root = doc.documentElement;
        if (!root || !(root.getAttribute("lang") || "").trim()) {
          return { violations: [{ selector: "html", detail: "missing lang" }] };
        }
        return { violations: [] };
      }
    },
    {
      id: "document-title",
      impact: "serious",
      label: "Document must have a non-empty <title>",
      check: function (doc) {
        const t = (doc.title || "").trim();
        if (!t) return { violations: [{ selector: "title", detail: "empty" }] };
        return { violations: [] };
      }
    },
    {
      id: "heading-order",
      impact: "moderate",
      label: "Page should not skip heading levels",
      check: function (doc) {
        const violations = [];
        const headings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6");
        let last = 0;
        for (const h of headings) {
          const level = parseInt(h.tagName[1], 10);
          if (last && level - last > 1) {
            violations.push({ selector: pathTo(h), detail: "skipped from h" + last + " to h" + level });
          }
          last = level;
        }
        return { violations };
      }
    },
    {
      id: "landmark-one-main",
      impact: "moderate",
      label: "Page should have exactly one <main> landmark",
      check: function (doc) {
        const mains = doc.querySelectorAll("main, [role='main']");
        if (mains.length === 0) return { violations: [{ selector: "main", detail: "0 landmarks" }] };
        if (mains.length > 1) return { violations: [{ selector: "main", detail: mains.length + " landmarks" }] };
        return { violations: [] };
      }
    }
  ];

  function run(doc) {
    doc = doc || document;
    const out = [];
    for (const rule of RULES) {
      let result;
      try {
        result = rule.check(doc);
      } catch (_e) {
        continue;
      }
      if (!result || !result.violations || !result.violations.length) continue;
      for (const v of result.violations) {
        out.push({
          id: rule.id,
          impact: rule.impact,
          label: rule.label,
          selector: v.selector,
          detail: v.detail
        });
      }
    }
    return out;
  }

  // Expose
  const api = { run, rules: RULES.map((r) => ({ id: r.id, impact: r.impact, label: r.label })) };
  if (typeof window !== "undefined") window.PulseVitalsAxeLite = api;
  if (typeof self !== "undefined") self.PulseVitalsAxeLite = api;
})();
