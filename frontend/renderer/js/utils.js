/* utils.js — shared helpers, DOM shortcuts, formatting
   No DOM queries at module level — pure functions only. */

/* =============================================
   RENDERER.JS — Dry Type Transformer Design Software
   ============================================= */

/* =============================================
   SHARED UTILITIES  (single canonical set)
   ============================================= */

/* ── Rounding helpers ── */
function r0(v) { return Math.round(+v); }
function r1(v) { return (+v).toFixed(1); }
function r2(v) { return (+v).toFixed(2); }
function r3(v) { return (+v).toFixed(3); }
function r4(v) { return (+v).toFixed(4); }

/* ── DOM helpers ── */
function setText(id, val) {
    let el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.textContent = val;
}
function setTextUpper(id, val) { if (val) setText(id, String(val).toUpperCase()); }
function setTbody(id, html) { let el = document.getElementById(id); if (el) el.innerHTML = html; }

/* ── Connection / material helpers (canonical) ── */
function toConnName(v) {
    if (v === "Y" || v === "Star")  return "Star";
    if (v === "D" || v === "Delta") return "Delta";
    return v || "—";
}
function toConnLabel(v) {
    if (v === "Y" || v === "Star")  return "Star (Y)";
    if (v === "D" || v === "Delta") return "Delta (D)";
    return v || "-";
}
function toConnUpper(v) {
    let n = toConnName(v);
    return n === "Star" ? "STAR" : n === "Delta" ? "DELTA" : (v || "—");
}
function isCu(mat) { return mat === "Copper" || mat === "Cu" || mat === "CU"; }
function matCode(mat) {
    if (!mat) return "—";
    let l = mat.toLowerCase();
    return (l === "al" || l.indexOf("alum") !== -1) ? "AL" : "CU";
}
function phaseVoltage(lineV, conn) {
    // Accepts both raw API values ("Y","D") and display values ("Star","Delta")
    return (conn === "Y" || conn === "Star") ? lineV / Math.sqrt(3) : lineV;
}
function getBIL(volts) {
    if (!volts || volts <= 0) return "—";
    if (volts <= 1000)  return "—";
    if (volts <= 3300)  return "40 kVp (IS 2026)";
    if (volts <= 6600)  return "60 kVp";
    if (volts <= 11000) return "95 kVp";
    if (volts <= 22000) return "150 kVp";
    return "250 kVp";
}

/* ── HTML row builders ── */
function trRow(label, value) {
    return '<tr><td class="col-param">' + label + '</td><td class="col-value">' + value + '</td></tr>';
}
function trRow4(l1, v1, l2, v2) {
    return '<tr>' +
        '<td class="col-param">' + l1 + '</td><td class="col-value">' + v1 + '</td>' +
        '<td class="col-param">' + l2 + '</td><td class="col-value">' + v2 + '</td>' +
        '</tr>';
}
function buildOutputRow(label, v1, v2, hv) {
    return "<tr><th>" + label + "</th><td>" + v1 + "</td><td>" + v2 + "</td><td>" + hv + "</td></tr>";
}
function kvRow(label, value) {
    return '<div class="kv-row"><span class="kv-label">' + label +
           '</span><span class="kv-value">' + value + '</span></div>';
}

/* ── Generic tab initialiser (replaces two identical tab blocks) ── */
function initTabs(tabSel, contentSel, attr, prefix) {
    let tabs     = document.querySelectorAll(tabSel);
    let contents = document.querySelectorAll(contentSel);
    tabs.forEach(function(tab) {
        tab.addEventListener("click", function() {
            tabs.forEach(function(t)     { t.classList.remove("active"); });
            contents.forEach(function(c) { c.classList.add("hidden"); });
            tab.classList.add("active");
            let el = document.getElementById(prefix + tab.getAttribute(attr));
            if (el) el.classList.remove("hidden");
        });
    });
}


/* ── Toast notification (replaces alert() — non-blocking, auto-dismiss) ── */
function showToast(message, type) {
    let existing = document.getElementById("_toast");
    if (existing) existing.remove();

    let toast = document.createElement("div");
    toast.id = "_toast";
    let bg = type === "error" ? "background:#c0392b;border-left:4px solid #e74c3c"
           : type === "warn"  ? "background:#7d4e0a;border-left:4px solid #f39c12"
           :                    "background:#1a3f5c;border-left:4px solid #2980b9";
    toast.style.cssText =
        "position:fixed;bottom:24px;right:24px;z-index:9999;" +
        "padding:12px 20px;border-radius:6px;font:600 13px/1.4 Arial,sans-serif;" +
        "max-width:420px;box-shadow:0 4px 16px rgba(0,0,0,.5);" +
        "color:#fff;opacity:0;transition:opacity .2s;" + bg;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(function() {
        requestAnimationFrame(function() { toast.style.opacity = "1"; });
    });
    setTimeout(function() {
        toast.style.opacity = "0";
        setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 250);
    }, 4000);
}

/* ── Print utility — DRY wrapper around window.print() ─────────── */
function printPage(hideSelectors) {
    let hidden = (hideSelectors || []).map(function(s) {
        return document.querySelector(s);
    }).filter(Boolean);
    hidden.forEach(function(el) { el.style.display = "none"; });
    window.print();
    hidden.forEach(function(el) { el.style.display = ""; });
}