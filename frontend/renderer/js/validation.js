/* validation.js — field rules, validateAllInputs, renderValidation,
   touch/dirty tracking, refreshValidation, updateValidationSummary */

/* =============================================
   INPUT PAGE — REAL-TIME VALIDATION ENGINE
   Based on Sara Consultants design steps
   ============================================= */

const validationRules = {
    ratedPower:      { min: 1,    max: 5000,  label: "Rated Power",           unit: "kVA" },
    frequency:       { min: 50,   max: 60,    label: "Frequency",             unit: "Hz" },
    fluxDensity:     { min: 0.8,  max: 1.75,  label: "Flux Density (B)",      unit: "T",
                       hint: "Typical: 1.4–1.73 T for CRGO. Higher B → smaller core but higher losses." },
    lv1Voltage:      { min: 100,  max: 15000, label: "LV1 Voltage",           unit: "V" },
    lv2Voltage:      { min: 100,  max: 15000, label: "LV2 Voltage",           unit: "V" },
    hvVoltage:       { min: 200,  max: 36000, label: "HV Voltage",            unit: "V" },
    lv1kva:          { min: 0.1,  max: 5000,  label: "LV1 kVA",              unit: "kVA" },
    lv2kva:          { min: 0.1,  max: 5000,  label: "LV2 kVA",              unit: "kVA" },
    hvkva:           { min: 0.1,  max: 5000,  label: "HV kVA",               unit: "kVA" },
    lv1cd:           { min: 0.5,  max: 4.0,   label: "LV1 Current Density",  unit: "A/mm²",
                       hint: "Copper: 1.4–3.5 A/mm². Aluminium: 1.0–2.5 A/mm²." },
    lv2cd:           { min: 0.5,  max: 4.0,   label: "LV2 Current Density",  unit: "A/mm²",
                       hint: "Copper: 1.4–3.5 A/mm². Aluminium: 1.0–2.5 A/mm²." },
    hvcd:            { min: 0.5,  max: 4.0,   label: "HV Current Density",   unit: "A/mm²",
                       hint: "HV winding: typically 1.0–2.5 A/mm²." }
};

let validationMessages = {}; // fieldId → { type: 'error'|'warn'|'ok', text }

function getInputValue(id) {
    let el = document.getElementById(id);
    return el ? parseFloat(el.value) || 0 : 0;
}
function getSelectValue(id) {
    let el = document.getElementById(id);
    return el ? el.value : "";
}

/* ── Cross-field validation logic ─────────────────────────────── */
function validateAllInputs() {
    let msgs = {};
    let sqrt3 = Math.sqrt(3);

    let ratedPower = getInputValue("ratedPower");
    let freq       = getInputValue("frequency");
    let B          = getInputValue("fluxDensity");
    let lv1V       = getInputValue("lv1Voltage");
    let lv2V       = getInputValue("lv2Voltage");
    let hvV        = getInputValue("hvVoltage");
    let lv1kva     = getInputValue("lv1kva");
    let lv2kva     = getInputValue("lv2kva");
    let hvkva      = getInputValue("hvkva");
    let lv1cd      = getInputValue("lv1cd");
    let lv2cd      = getInputValue("lv2cd");
    let hvcd       = getInputValue("hvcd");
    let lv1conn    = toConnName(getSelectValue("lv1conn"));
    let lv2conn    = toConnName(getSelectValue("lv2conn"));
    let hvconn     = toConnName(getSelectValue("hvconn"));
    let lv1mat     = getSelectValue("lv1mat") === "AL" ? "Aluminium" : "Copper";
    let lv2mat     = getSelectValue("lv2mat") === "AL" ? "Aluminium" : "Copper";
    let hvmat      = getSelectValue("hvmat")  === "AL" ? "Aluminium" : "Copper";

    // 1. Basic range checks
    Object.keys(validationRules).forEach(function(id) {
        let rule = validationRules[id];
        let val  = getInputValue(id);
        if (!val || val === 0) {
            msgs[id] = { type: "error", text: rule.label + " is required." };
        } else if (val < rule.min || val > rule.max) {
            msgs[id] = { type: "error",
                text: rule.label + " must be between " + rule.min + " and " + rule.max + " " + rule.unit + "." };
        } else if (rule.hint) {
            msgs[id] = { type: "ok", text: rule.hint };
        }
    });

    // 2. KVA balance: LV1 + LV2 ≈ HV (within ±10%)
    if (lv1kva > 0 && lv2kva > 0 && hvkva > 0) {
        let totalSec = lv1kva + lv2kva;
        let diff = Math.abs(totalSec - hvkva) / hvkva;
        if (diff > 0.10) {
            msgs["hvkva"] = { type: "error",
                text: "HV kVA (" + hvkva + ") should equal LV1 + LV2 kVA (" + totalSec + "). Difference: " + (diff * 100).toFixed(1) + "%." };
            msgs["lv1kva"] = { type: "warn", text: "LV1 + LV2 = " + totalSec + " kVA must match HV kVA." };
            msgs["lv2kva"] = { type: "warn", text: "LV1 + LV2 = " + totalSec + " kVA must match HV kVA." };
        } else if (diff > 0.02) {
            msgs["hvkva"] = { type: "warn",
                text: "LV1 + LV2 (" + totalSec + " kVA) ≈ HV (" + hvkva + " kVA). Small mismatch (~" + (diff * 100).toFixed(1) + "%). Check if intentional." };
        }
        if (!msgs["ratedPower"] || msgs["ratedPower"].type !== "error") {
            if (Math.abs(ratedPower - hvkva) / hvkva > 0.10) {
                msgs["ratedPower"] = { type: "warn",
                    text: "Rated Power (" + ratedPower + " kVA) should typically match HV kVA (" + hvkva + " kVA)." };
            }
        }
    }

    // 3. Flux density vs insulation class
    let insClass = getSelectValue("insulationClass");
    if (B > 0 && insClass) {
        if (insClass === "F" || insClass === "E") {
            if (B > 1.6) {
                msgs["fluxDensity"] = { type: "warn",
                    text: "B=" + B + " T is high for class " + insClass + ". Class H allows up to 1.73 T safely." };
            }
        }
        if (B > 1.73) {
            msgs["fluxDensity"] = { type: "error",
                text: "B=" + B + " T exceeds CRGO M4 grade saturation limit (~1.73 T). Core will saturate." };
        }
    }

    // 4. Current density vs material
    [
        { id: "lv1cd", mat: lv1mat, cur: lv1cd },
        { id: "lv2cd", mat: lv2mat, cur: lv2cd },
        { id: "hvcd",  mat: hvmat,  cur: hvcd  }
    ].forEach(function(w) {
        if (!w.mat || !w.cur) return;
        let cu = isCu(w.mat);
        if (cu && w.cur > 3.5) {
            msgs[w.id] = { type: "error",
                text: "Current density " + w.cur + " A/mm² too high for Copper. Max recommended: 3.5 A/mm²." };
        } else if (!cu && w.cur > 2.5) {
            msgs[w.id] = { type: "error",
                text: "Current density " + w.cur + " A/mm² too high for Aluminium. Max recommended: 2.5 A/mm²." };
        } else if (cu && w.cur < 1.0) {
            msgs[w.id] = { type: "warn",
                text: "Current density " + w.cur + " A/mm² is low for Copper. Winding will be oversized." };
        } else if (!cu && w.cur < 0.8) {
            msgs[w.id] = { type: "warn",
                text: "Current density " + w.cur + " A/mm² is low for Aluminium. Winding will be oversized." };
        }
    });

    // 5. Voltage ratio plausibility (LV < HV)
    if (lv1V > 0 && hvV > 0 && lv1V >= hvV) {
        msgs["lv1Voltage"] = { type: "warn",
            text: "LV1 voltage (" + lv1V + " V) is ≥ HV voltage (" + hvV + " V). Verify winding designation." };
    }
    if (lv2V > 0 && hvV > 0 && lv2V >= hvV) {
        msgs["lv2Voltage"] = { type: "warn",
            text: "LV2 voltage (" + lv2V + " V) is ≥ HV voltage (" + hvV + " V). Verify winding designation." };
    }

    // 6. HV voltage BIL check
    if (hvV > 0) {
        let bil = getBIL(hvV);
        let bilDisplay = bil === "—" ? "Not required (LV)" : bil;
        if (!msgs["hvVoltage"] || msgs["hvVoltage"].type === "ok") {
            msgs["hvVoltage"] = { type: "ok", text: "Recommended BIL: " + bilDisplay };
        }
    }

    // 8. Vector group consistency
    let vectorGroup = getSelectValue("vectorGroup");
    if (vectorGroup && hvconn && lv1conn) {
        let vgUpper = vectorGroup.toUpperCase();
        let hvExpect = vgUpper[0];  // D or Y
        let hvIsD = (hvconn === "Delta");
        let hvIsY = (hvconn === "Star");
        if ((hvExpect === "D" && !hvIsD) || (hvExpect === "Y" && !hvIsY)) {
            msgs["vectorGroup"] = { type: "warn",
                text: "Vector group '" + vectorGroup + "' implies HV is " + (hvExpect === "D" ? "Delta" : "Star") + ", but HV connection is set to " + hvconn + "." };
        }
    }

    return msgs;
}

/* ── Render validation badges next to each field ─────────────────── */
function renderValidation(msgs) {
    // Clear all previous
    document.querySelectorAll(".val-badge").forEach(function(el) { el.remove(); });

    Object.keys(msgs).forEach(function(id) {
        let field = document.getElementById(id);
        if (!field) return;
        let msg = msgs[id];
        let badge = document.createElement("div");
        badge.className = "val-badge val-" + msg.type;
        badge.textContent = msg.text;
        let parent = field.parentNode;
        // Insert after field
        if (parent) {
            let next = field.nextSibling;
            parent.insertBefore(badge, next);
        }
    });

    // Update run button state
    let runBtn = document.getElementById("runCalcBtn");
    let hasError = Object.values(msgs).some(function(m) { return m.type === "error"; });
    if (runBtn) {
        runBtn.disabled = hasError;
        runBtn.style.opacity = hasError ? "0.5" : "1";
        runBtn.style.cursor  = hasError ? "not-allowed" : "pointer";
        runBtn.title = hasError ? "Fix validation errors before running" : "Run Calculation";
    }

    return hasError;
}

/* ── Touch tracking — only show errors for fields the user has interacted with ── */
let touchedFields = {};   // fieldId → true once the user has left the field or changed a select
let dirtyFields   = {};   // fieldId → true once the user has typed something (even if still focused)

const valFields = [
    "ratedPower","frequency","fluxDensity",
    "lv1Voltage","lv2Voltage","hvVoltage",
    "lv1kva","lv2kva","hvkva",
    "lv1cd","lv2cd","hvcd",
    "lv1conn","lv2conn","hvconn",
    "lv1mat","lv2mat","hvmat",
    "vectorGroup","insulationClass"
];

valFields.forEach(function(id) {
    let el = document.getElementById(id);
    if (!el) return;
    let isSelect = el.tagName === "SELECT";

    if (isSelect) {
        // Selects: validate immediately when user picks a value
        el.addEventListener("change", function() {
            touchedFields[id] = true;
            dirtyFields[id]   = true;
            refreshValidation();
        });
    } else {
        // Text/number inputs:

        // Mark dirty once they start typing (but DON'T validate empty yet)
        el.addEventListener("input", function() {
            if (el.value.trim() !== "") {
                dirtyFields[id] = true;
            }
            // If already touched (they left and came back), validate live
            if (touchedFields[id]) {
                refreshValidation();
            } else if (dirtyFields[id]) {
                // Typed something — show live feedback for THIS field only
                refreshValidation();
            }
        });

        // Mark touched on blur — this is the key: "focused then left"
        el.addEventListener("blur", function() {
            touchedFields[id] = true;
            dirtyFields[id]   = true;
            refreshValidation();
        });
    }
});

/* Validate but only render badges for touched/dirty fields */
function refreshValidation() {
    let allMsgs = validateAllInputs();

    // Filter: only show messages for fields that have been interacted with
    // EXCEPTION: cross-field warnings (kva balance, vector group) shown
    // only if ALL involved fields are dirty
    let visibleMsgs = {};
    Object.keys(allMsgs).forEach(function(id) {
        let msg = allMsgs[id];

        // Always show "ok" hints for dirty fields (not errors)
        if (msg.type === "ok" && dirtyFields[id]) {
            visibleMsgs[id] = msg;
            return;
        }

        // Show errors/warnings only for touched fields
        if (touchedFields[id] || dirtyFields[id]) {
            // For "empty/required" errors: only show if field was touched (blurred)
            if (msg.text && msg.text.indexOf("required") !== -1) {
                if (touchedFields[id]) {
                    visibleMsgs[id] = msg;
                }
            } else {
                // Logic errors (wrong value): show as soon as they've typed
                visibleMsgs[id] = msg;
            }
        }
    });

    renderValidation(visibleMsgs);
    updateValidationSummary(visibleMsgs);

    // Run button: disable only if there are actual errors in ALL messages
    // (not just visible ones — we don't want users to submit with hidden errors)
    let totalErrors = Object.values(allMsgs).filter(function(m) { return m.type === "error"; });
    let runBtn = document.getElementById("runCalcBtn");
    if (runBtn) {
        // Only disable if at least one field has been touched AND there are errors
        let anyTouched = Object.keys(touchedFields).length > 0;
        let hasBlocker = anyTouched && totalErrors.length > 0;
        runBtn.disabled = false; // always let them try — we'll validate on submit
        runBtn.style.opacity = "1";
        runBtn.style.cursor  = "pointer";
        runBtn.title = hasBlocker ? "Fix errors before running" : "Run Calculation";
    }
}

/* ── Summary panel — only show touched field issues ─────────────── */
function updateValidationSummary(msgs) {
    let panel = document.getElementById("validationSummary");
    if (!panel) return;

    let errors = [], warnings = [];
    Object.values(msgs).forEach(function(m) {
        if (m.type === "error") errors.push(m.text);
        if (m.type === "warn")  warnings.push(m.text);
    });

    if (errors.length === 0 && warnings.length === 0) {
        let anyTouched = Object.keys(touchedFields).length > 0 || Object.keys(dirtyFields).length > 0;
        if (anyTouched) {
            panel.innerHTML = '<div class="val-summary-ok">✓ Looking good — keep filling in the inputs</div>';
            panel.className = "val-summary-panel val-summary-clean";
        } else {
            panel.innerHTML = '<div style="color:#666;font-size:11px;">Fill in the inputs above — validation feedback will appear here.</div>';
            panel.className = "val-summary-panel";
        }
    } else {
        let html = "";
        errors.forEach(function(t)   { html += '<div class="val-sum-err">✕ ' + t + '</div>'; });
        warnings.forEach(function(t) { html += '<div class="val-sum-warn">⚠ ' + t + '</div>'; });
        panel.innerHTML = html;
        panel.className = "val-summary-panel" + (errors.length ? " val-summary-dirty" : " val-summary-warn");
    }
}

/* ── On submit: validate ALL fields then run ──────────────────────── */
function handleSubmit() {
    // Mark all fields as touched so all errors become visible
    valFields.forEach(function(id) {
        touchedFields[id] = true;
        dirtyFields[id]   = true;
    });

    let allMsgs = validateAllInputs();
    renderValidation(allMsgs);
    updateValidationSummary(allMsgs);

    let hasError = Object.values(allMsgs).some(function(m) { return m.type === "error"; });
    if (hasError) {
        let panel = document.getElementById("validationSummary");
        if (panel) panel.scrollIntoView({ behavior: "smooth" });
        return;
    }
    runCalculation();
}

/* Single submit listener */
if (transformerForm) {
    transformerForm.addEventListener("submit", function(e) {
        e.preventDefault();
        handleSubmit();
    });
}

/* Also wire the button directly in case it's outside the form */
const runCalcBtn = document.getElementById("runCalcBtn");
if (runCalcBtn) {
    runCalcBtn.addEventListener("click", function(e) {
        // If inside a form, the form submit will fire — only handle if not
        if (!transformerForm) {
            e.preventDefault();
            handleSubmit();
        }
    });
}

/* Start fresh — no validation shown on load */
(function() {
    let panel = document.getElementById("validationSummary");
    if (panel) {
        panel.innerHTML = '<div style="color:#555;font-size:11px;">Fill in the inputs above — validation feedback will appear here as you go.</div>';
        panel.className = "val-summary-panel";
    }
})();