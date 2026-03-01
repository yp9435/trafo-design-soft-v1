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

/* =============================================
   PAGE NAVIGATION
   ============================================= */
const navItems = document.querySelectorAll(".nav-item");
const pages    = document.querySelectorAll(".page");

function showPage(pageId) {
    pages.forEach(function(page) {
        page.classList.add("hidden");
    });

    let target = document.getElementById("page-" + pageId);
    if (target) {
        target.classList.remove("hidden");
    }

    navItems.forEach(function(item) {
        item.classList.remove("active");
        if (item.getAttribute("data-page") === pageId) {
            item.classList.add("active");
        }
    });
}

navItems.forEach(function(item) {
    item.addEventListener("click", function() {
        showPage(item.getAttribute("data-page"));
    });
});

// Default page on load
showPage("input");

/* =============================================
   TECHNICAL REPORT — TABS (top-level & winding sub-tabs)
   ============================================= */
initTabs(".tr-tab",          ".tr-tab-content",      "data-tr-tab",      "tr-");
initTabs(".winding-sub-tab", ".winding-sub-content", "data-winding-tab", "winding-");

/* =============================================
   INPUT PAGE — RUN CALCULATION
   ============================================= */
const transformerForm = document.getElementById("transformerForm");

/* =============================================
   API SERVICE LAYER
   POST http://127.0.0.1:8000/design
   ============================================= */
const API_BASE = "http://127.0.0.1:8000";

function buildApiPayload(inp) {
    // Builds the exact JSON shape expected by TransformerDesignInput (input_model.py).
    //
    // IMPORTANT: The backend uses a FLAT structure (not nested lv1/lv2/hv objects)
    // and expects full display strings, not short codes:
    //   lv1_material: "Copper" | "Aluminium"   (NOT "CU" | "AL")
    //   lv1_connection: "Star" | "Delta"        (NOT "Y"  | "D")
    //
    // Field names verified against the actual failing request JSON payload.
    return {
        // Transformer level
        rated_power       : inp.ratedPower,
        phases            : inp.phases,
        flux_density      : inp.fluxDensity,
        frequency         : inp.frequency,
        vector_group      : inp.vectorGroup,
        insulation_class  : inp.insulationClass,

        // LV1 (flat, not nested)
        lv1_voltage        : inp.lv1Voltage,
        lv1_kva            : inp.lv1kva,
        lv1_current_density: inp.lv1cd,
        lv1_material       : inp.lv1matDisp,   // "Copper" | "Aluminium"
        lv1_connection     : inp.lv1connDisp,  // "Star"   | "Delta"

        // LV2 (flat)
        lv2_voltage        : inp.lv2Voltage,
        lv2_kva            : inp.lv2kva,
        lv2_current_density: inp.lv2cd,
        lv2_material       : inp.lv2matDisp,
        lv2_connection     : inp.lv2connDisp,

        // HV (flat)
        hv_voltage         : inp.hvVoltage,
        hv_kva             : inp.hvkva,
        hv_current_density : inp.hvcd,
        hv_material        : inp.hvmatDisp,
        hv_connection      : inp.hvconnDisp,

        // Core material
        core_material_type : inp.coreMaterialType,   // "CRGO" | "CRNO"
        core_grade         : inp.coreGrade           // "M4" | "M3" | "23ZDMH"
    };
}

function mapApiResponse(apiResp) {
    // ── Mode A: already-shaped internal object — pass through ──────────
    if (apiResp.windingSummary && apiResp.coreDesign && apiResp.performance) {
        return apiResp;
    }

    // ── Mode B: map from design_engine result keys → internal shape ─────
    //
    //  Backend structure (from actual JSON response):
    //    apiResp.core       → initial_volts_per_turn, phase_voltage, turns_per_phase,
    //                         volts_per_turn, net_core_area, gross_core_area,
    //                         core_dimensions[tongue, stack]
    //    apiResp.lv1/lv2/hv → voltage_per_phase, current_per_phase, number_of_layers,
    //                         turns_per_layer, total_conductor_cross_sectional_area,
    //                         current_density_verification, window_height, end_clearance,
    //                         winding_length, conductor_breadth, insulated_conductor_breadth,
    //                         conductor_height, insulated_conductor_height,
    //                         interlayer_insulation_thickness, radial_thickness,
    //                         winding_inner_dimensions, winding_outer_dimensions,
    //                         mean_length_of_turn, total_wire_length,
    //                         resistance_per_phase_75C, bare_weight, insulated_weight,
    //                         procurement_weight, stray_loss_percentage, load_loss,
    //                         winding_temperature_gradient
    //    apiResp.final_core  → tongue_width, center_distance, window_height, core_length,
    //                         density, build_factor, specific_loss, core_weight, core_loss,
    //                         tank_length, tank_width, tank_height,
    //                         overall_length, overall_width, overall_height,
    //                         lv1_bare_weight, lv2_bare_weight, hv_bare_weight,
    //                         insulation_weight, active_part_weight
    //    apiResp.layout      → front_view, side_view, top_view
    //    apiResp.rating_plate → manufacturer, primary, secondary_1, secondary_2, ...
    //    apiResp.bom         → windings, core, total_cost_inr, ...

    let c  = apiResp.core        || {};
    let w1 = apiResp.lv1         || {};
    let w2 = apiResp.lv2         || {};
    let wh = apiResp.hv          || {};
    let fc = apiResp.final_core  || {};
    let ly = apiResp.layout      || {};
    let rp = apiResp.rating_plate || {};
    let bm = apiResp.bom         || {};

    // core_dimensions is [tongue, stack]
    let coreDims = c.core_dimensions || [0, 0];
    let tongue   = coreDims[0] || 0;
    let stack    = coreDims[1] || 0;

    // layout sub-objects
    let lyFront = ly.front_view || {};
    let lySide  = ly.side_view  || {};
    let lyTop   = ly.top_view   || {};

    // winding_inner/outer_dimensions are [width, height] arrays
    let lv1OD = w1.winding_outer_dimensions || [0, 0];
    let lv2OD = w2.winding_outer_dimensions || [0, 0];
    let hvOD  = wh.winding_outer_dimensions || [0, 0];

    // Derived: yoke height = tongue_width (square core cross-section)
    let yokeHeight = fc.tongue_width || tongue;

    // Enclosure from layout.top_view (definitive source)
    let encL = lyTop.enclosure_length_mm || fc.overall_length || fc.tank_length || 0;
    let encW = lyTop.enclosure_width_mm  || fc.overall_width  || fc.tank_width  || 0;
    let encH = lyTop.enclosure_height_mm || fc.overall_height || fc.tank_height || 0;

    // Limb centre-to-centre from final_core
    let limbSpacing = fc.center_distance || 0;

    // Total load loss = sum of individual winding load losses
    let totalLoadLoss = (w1.load_loss || 0) + (w2.load_loss || 0) + (wh.load_loss || 0);
    let totalLoss     = totalLoadLoss + (fc.core_loss || 0);

    return {
        // ── Winding summary ─────────────────────────────────────────────
        windingSummary: {
            LV1: {
                turns          : c.turns_per_phase                        || 0,
                conductorArea  : w1.total_conductor_cross_sectional_area   || 0,
                currentDensity : w1.current_density_verification           || 0,
                copperLoss     : w1.load_loss                              || 0
            },
            LV2: {
                turns          : Math.round((w2.voltage_per_phase || 0) / (c.volts_per_turn || 1)),
                conductorArea  : w2.total_conductor_cross_sectional_area   || 0,
                currentDensity : w2.current_density_verification           || 0,
                copperLoss     : w2.load_loss                              || 0
            },
            HV: {
                turns          : Math.round((wh.voltage_per_phase || 0) / (c.volts_per_turn || 1)),
                conductorArea  : wh.total_conductor_cross_sectional_area   || 0,
                currentDensity : wh.current_density_verification           || 0,
                copperLoss     : wh.load_loss                              || 0
            }
        },

        // ── Core design summary ─────────────────────────────────────────
        coreDesign: {
            netCoreArea  : c.net_core_area   || 0,   // mm²
            grossCoreArea: c.gross_core_area  || 0,   // mm²
            tongue       : tongue,
            stack        : stack,
            windowHeight : fc.window_height   || 0,   // mm
            yokeHeight   : yokeHeight,                // mm
            coreWeight   : fc.core_weight     || 0,   // kg
            limbSpacing  : limbSpacing,               // mm
            enc_L        : encL,
            enc_W        : encW,
            enc_H        : encH
        },

        // ── Performance ─────────────────────────────────────────────────
        performance: {
            coreLoss      : fc.core_loss      || 0,
            totalLoadLoss : totalLoadLoss,
            totalLoss     : totalLoss,
            impedance     : rp.impedance_percentage ? parseFloat(rp.impedance_percentage) : 0,
            regulation    : 0   // not in current backend response; extend when available
        },

        // ── Radial layout dims (visual diagram) ─────────────────────────
        radialDims: {
            coreDia : tongue,                          // tongue width used as core reference dim
            lv1     : w1.radial_thickness || 0,
            duct1   : (lv2OD[0] || 0) - (lv1OD[0] || 0) > 0
                        ? ((lv2OD[0] || 0) - (lv1OD[0] || 0)) / 2
                        : 5,
            lv2     : w2.radial_thickness || 0,
            duct2   : (hvOD[0] || 0) - (lv2OD[0] || 0) > 0
                        ? ((hvOD[0] || 0) - (lv2OD[0] || 0)) / 2
                        : 10,
            hv      : wh.radial_thickness || 0
        },

        // ── Core material metadata ──────────────────────────────────────
        coreMatMeta: {
            type       : "CRGO Silicon Steel",           // extend when backend returns this
            grade      : "M4",
            thickness  : "0.27 mm",
            density    : (fc.density || 7.65) + " g/cc",
            stackFactor: 0.96,
            specLoss   : fc.specific_loss  || 0,
            buildFactor: fc.build_factor   || 1.3
        },

        // ── Rating plate (direct from backend, used by populateRatingPlate) ──
        ratingPlate: rp,

        // ── BOM (direct from backend) ────────────────────────────────────
        bom: bm,

        // ── Layout (direct from backend) ─────────────────────────────────
        layout: ly,

        // ── Flat steps — all detail fields for report/output tables ─────
        steps: {
            // Core
            vt           : c.volts_per_turn   || 0,
            A_net        : c.net_core_area     || 0,   // mm²
            A_gross      : c.gross_core_area   || 0,   // mm²
            tongue       : tongue,
            stack        : stack,
            windowHeight : fc.window_height    || 0,
            yokeHeight   : yokeHeight,
            limbSpacingA : limbSpacing,
            coreLen_mm   : fc.core_length      || 0,
            coreWeight   : fc.core_weight      || 0,
            coreLoss     : fc.core_loss        || 0,
            enc_L        : encL,
            enc_W        : encW,
            enc_H        : encH,

            // Turns
            lv1Turns  : c.turns_per_phase                                               || 0,
            lv2Turns  : Math.round((w2.voltage_per_phase || 0) / (c.volts_per_turn || 1)),
            hvTurns   : Math.round((wh.voltage_per_phase || 0) / (c.volts_per_turn || 1)),

            // Layers & turns per layer
            lv1TpL    : w1.turns_per_layer  || 0,
            lv2TpL    : w2.turns_per_layer  || 0,
            hvTpL     : wh.turns_per_layer  || 0,
            lv1Layers : w1.number_of_layers || 0,
            lv2Layers : w2.number_of_layers || 0,
            hvLayers  : wh.number_of_layers || 0,

            // Parallel conductors (not in current backend response — default 1)
            lv1Np: 1, lv2Np: 1, hvNp: 1,
            lv1Nr: 1, lv2Nr: 1, hvNr: 1,

            // Phase currents
            lv1CurPhase : w1.current_per_phase || 0,
            lv2CurPhase : w2.current_per_phase || 0,
            hvCurPhase  : wh.current_per_phase || 0,

            // Conductor dimensions
            lv1_b  : w1.conductor_breadth           || 0,
            lv1_bi : w1.insulated_conductor_breadth  || 0,
            lv1_h  : w1.conductor_height            || 0,
            lv1_hi : w1.insulated_conductor_height   || 0,
            lv2_b  : w2.conductor_breadth           || 0,
            lv2_bi : w2.insulated_conductor_breadth  || 0,
            lv2_h  : w2.conductor_height            || 0,
            lv2_hi : w2.insulated_conductor_height   || 0,
            hv_b   : wh.conductor_breadth           || 0,
            hv_bi  : wh.insulated_conductor_breadth  || 0,
            hv_h   : wh.conductor_height            || 0,
            hv_hi  : wh.insulated_conductor_height   || 0,

            // Conductor area & actual current density
            lv1_csActual : w1.total_conductor_cross_sectional_area || 0,
            lv2_csActual : w2.total_conductor_cross_sectional_area || 0,
            hv_csActual  : wh.total_conductor_cross_sectional_area || 0,
            lv1_cd       : w1.current_density_verification || 0,
            lv2_cd       : w2.current_density_verification || 0,
            hv_cd        : wh.current_density_verification || 0,

            // Radial thickness
            lv1_radThick : w1.radial_thickness || 0,
            lv2_radThick : w2.radial_thickness || 0,
            hv_radThick  : wh.radial_thickness || 0,

            // Interlayer insulation
            lv1_interLayerIns : w1.interlayer_insulation_thickness || 0,
            lv2_interLayerIns : w2.interlayer_insulation_thickness || 0,
            hv_interLayerIns  : wh.interlayer_insulation_thickness || 0,

            // LMT & wire length
            lmt_lv1    : w1.mean_length_of_turn || 0,
            lmt_lv2    : w2.mean_length_of_turn || 0,
            lmt_hv     : wh.mean_length_of_turn || 0,
            wireLen_lv1: w1.total_wire_length   || 0,
            wireLen_lv2: w2.total_wire_length   || 0,
            wireLen_hv : wh.total_wire_length   || 0,

            // Resistance
            R75_lv1 : w1.resistance_per_phase_75C || 0,
            R75_lv2 : w2.resistance_per_phase_75C || 0,
            R75_hv  : wh.resistance_per_phase_75C || 0,

            // Weights
            bareWt_lv1  : w1.bare_weight         || 0,
            bareWt_lv2  : w2.bare_weight         || 0,
            bareWt_hv   : wh.bare_weight         || 0,
            insWt_lv1   : w1.insulated_weight    || 0,
            insWt_lv2   : w2.insulated_weight    || 0,
            insWt_hv    : wh.insulated_weight    || 0,
            procWt_lv1  : w1.procurement_weight  || 0,
            procWt_lv2  : w2.procurement_weight  || 0,
            procWt_hv   : wh.procurement_weight  || 0,

            // Stray loss & temperature gradient (computed by backend)
            strayPct_lv1 : w1.stray_loss_percentage    || 0,
            strayPct_lv2 : w2.stray_loss_percentage    || 0,
            strayPct_hv  : wh.stray_loss_percentage    || 0,
            gradient_lv1 : w1.winding_temperature_gradient || 0,
            gradient_lv2 : w2.winding_temperature_gradient || 0,
            gradient_hv  : wh.winding_temperature_gradient || 0,

            // Losses
            ll_lv1       : w1.load_loss        || 0,
            ll_lv2       : w2.load_loss        || 0,
            ll_hv        : wh.load_loss        || 0,
            totalLoadLoss: totalLoadLoss,
            totalLoss    : totalLoss,

            // Window details (from lv1 as reference — all windings share the same window)
            windingLength : w1.winding_length || 0,
            endClearance  : w1.end_clearance  || 0
        }
    };
}

function showLoadingState(isLoading) {
    let btn = document.getElementById("runCalcBtn");
    let spinner = document.getElementById("calcSpinner");
    if (btn) {
        btn.disabled = isLoading;
        btn.style.opacity = isLoading ? "0.7" : "1";
        btn.textContent = isLoading ? "CALCULATING..." : "RUN CALCULATION";
    }
    if (spinner) spinner.style.display = isLoading ? "block" : "none";
}

function showApiError(message) {
    let panel = document.getElementById("validationSummary");
    if (panel) {
        panel.innerHTML = '<div class="val-sum-err">⚠ API Error: ' + message + '</div>';
        panel.className = "val-summary-panel val-summary-dirty";
        panel.scrollIntoView({ behavior: "smooth" });
    }
}

/* ── Main API call ─────────────────────────────────────────────── */
function callDesignApi(inputData, onSuccess, onError) {
    let payload = buildApiPayload(inputData);

    fetch(API_BASE + "/design", {
        method  : "POST",
        headers : { "Content-Type": "application/json" },
        body    : JSON.stringify(payload)
    })
    .then(function(response) {
        if (!response.ok) {
            return response.text().then(function(text) {
                let msg;
                try { msg = JSON.parse(text).detail || JSON.parse(text).message || text; }
                catch(e) { msg = text || ("HTTP " + response.status); }
                throw new Error(msg);
            });
        }
        return response.json();
    })
    .then(function(apiResp) {
        let mapped = mapApiResponse(apiResp);
        onSuccess(mapped);
    })
    .catch(function(err) {
        onError(err.message || "Could not reach backend. Is it running on 127.0.0.1:8000?");
    });
}

/* =============================================
   INPUT COLLECTION  (single normalised point)
   ============================================= */
function collectInputs() {
    function num(id)  { return parseFloat(document.getElementById(id).value) || 0; }
    function int_(id) { return parseInt(document.getElementById(id).value)   || 1; }
    function sel(id)  { let el = document.getElementById(id); return el ? el.value : ""; }

    // Raw values — match backend Literal["CU","AL"] and Literal["D","Y"]
    let lv1matRaw  = sel("lv1mat");   // "CU" or "AL"
    let lv2matRaw  = sel("lv2mat");
    let hvmatRaw   = sel("hvmat");
    let lv1connRaw = sel("lv1conn");  // "Y" or "D"
    let lv2connRaw = sel("lv2conn");
    let hvconnRaw  = sel("hvconn");

    // Display-normalised values — used only by UI / PDF rendering
    let lv1matDisp  = lv1matRaw === "AL" ? "Aluminium" : "Copper";
    let lv2matDisp  = lv2matRaw === "AL" ? "Aluminium" : "Copper";
    let hvmatDisp   = hvmatRaw  === "AL" ? "Aluminium" : "Copper";
    let lv1connDisp = toConnName(lv1connRaw);   // "Star" or "Delta"
    let lv2connDisp = toConnName(lv2connRaw);
    let hvconnDisp  = toConnName(hvconnRaw);

    // k_value: kept in sync with ratedPower for API
    let ratedPower  = num("ratedPower");
    let kValue      = ratedPower <= 25 ? 0.45 : ratedPower <= 100 ? 0.55 : 0.62;
    // Allow manual override if input exists
    let kEl = document.getElementById("kValue");
    if (kEl && parseFloat(kEl.value)) kValue = parseFloat(kEl.value);

    // coreMaterialType from HTML select: "CRGO" | "CRNO" (backend Literal)
    let coreMaterialRaw = sel("coreMaterialType") || "CRGO";
    // Map legacy "Amorphous" value if used in HTML to CRNO (closest backend Literal)
    if (coreMaterialRaw === "Amorphous") coreMaterialRaw = "CRNO";

    return {
        // ── Transformer-level ──────────────────────────────────────────
        ratedPower      : ratedPower,
        fluxDensity     : num("fluxDensity"),
        frequency       : num("frequency"),
        kValue          : kValue,
        vectorGroup     : sel("vectorGroup"),
        insulationClass : sel("insulationClass"),
        phases          : parseInt(sel("phases")) || 3,

        // ── Voltages & kVA ────────────────────────────────────────────
        lv1Voltage  : num("lv1Voltage"),
        lv2Voltage  : num("lv2Voltage"),
        hvVoltage   : num("hvVoltage"),
        lv1kva      : num("lv1kva"),
        lv2kva      : num("lv2kva"),
        hvkva       : num("hvkva"),

        // ── Current density ────────────────────────────────────────────
        lv1cd : num("lv1cd"),
        lv2cd : num("lv2cd"),
        hvcd  : num("hvcd"),

        // ── Raw (API-safe) values ───────────────────────────────────────
        lv1mat  : lv1matRaw,   lv2mat  : lv2matRaw,   hvmat  : hvmatRaw,
        lv1conn : lv1connRaw,  lv2conn : lv2connRaw,  hvconn : hvconnRaw,

        // ── Display values (UI / PDF only) ──────────────────────────────
        lv1matDisp  : lv1matDisp,   lv2matDisp  : lv2matDisp,   hvmatDisp  : hvmatDisp,
        lv1connDisp : lv1connDisp,  lv2connDisp : lv2connDisp,  hvconnDisp : hvconnDisp,

        // ── Parallel conductors ─────────────────────────────────────────
        lv1axPar  : int_("lv1axPar"),  lv2axPar  : int_("lv2axPar"),  hvaxPar  : int_("hvaxPar"),
        lv1radPar : int_("lv1radPar"), lv2radPar : int_("lv2radPar"), hvradPar : int_("hvradPar"),

        // ── Core material ───────────────────────────────────────────────
        coreMaterialType : coreMaterialRaw,
        coreGrade        : sel("coreGrade") || "M4"
    };
}

/* =============================================
   RUN CALCULATION (async, API-first)
   ============================================= */
function runCalculation() {
    let inputData = collectInputs();
    showLoadingState(true);

    callDesignApi(
        inputData,
        // ── SUCCESS ──────────────────────────────────────────────────────
        function(result) {
            showLoadingState(false);
            onCalculationComplete(inputData, result);
        },
        // ── ERROR: show message, do NOT fall back to local calculation ──
        function(errMsg) {
            showLoadingState(false);
            showApiError(errMsg);
        }
    );
}

function onCalculationComplete(inputData, result) {
    _lastInputData  = inputData;
    _lastResultData = result;

    populateOutput(result);
    populateTechnicalReport(inputData, result);
    populateBom(result);
    populateRatingPlate(inputData, result);

    let outputSection = document.getElementById("outputSection");
    if (outputSection) {
        outputSection.classList.remove("hidden");
        outputSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    updateLayoutDimensions(result);

    let ldLabel = document.getElementById("ldRatingLabel");
    if (ldLabel && inputData.ratedPower) ldLabel.textContent = inputData.ratedPower + " kVA Transformer";
}

/* =============================================
   TECHNICAL REPORT — populate all tables from calculation
   ============================================= */
function populateTechnicalReport(inp, result) {
    let s  = result.steps;
    let cd = result.coreDesign;
    let pf = result.performance;
    let cm = result.coreMatMeta;
    let w  = result.windingSummary;

    // End clearance & winding length come from the backend — no recalculation
    let endClr     = s.endClearance  || 0;
    let netWindLen = s.windingLength  || 0;

    // ════════════════════════════════════════════════════════════
    //  SECTION 1: CORE DESIGN  (coreDesignBody)
    // ════════════════════════════════════════════════════════════
    let coreHtml =
        trRow("Volts per Turn",              r4(s.vt)          + " V") +
        trRow("LV1 Turns per Phase",         s.lv1Turns        + " turns") +
        trRow("Revised Volts per Turn",      r4(s.vt)          + " V") +
        trRow("Net Core Flux Density",       r2(inp.fluxDensity) + " T") +
        trRow("Net Core Area",               r0(s.A_net)       + " mm²") +
        trRow("Gross Core Area",             r0(s.A_gross)     + " mm²") +
        trRow("Core Frame (Tongue × Stack)", s.tongue          + " × " + s.stack + " mm") +
        trRow("Window Height",               r0(s.windowHeight) + " mm") +
        trRow("Yoke Height",                 r0(s.yokeHeight)  + " mm") +
        trRow("End Clearance",               r0(endClr)        + " mm") +
        trRow("Net Winding Length",          r0(netWindLen)    + " mm") +
        trRow("Limb Spacing (c-c)",          s.limbSpacingA    + " mm") +
        trRow("Core Length",                 r0(s.coreLen_mm)  + " mm") +
        trRow("Core Weight",                 r1(s.coreWeight)  + " kg") +
        trRow("Core Loss",                   r0(s.coreLoss)    + " W") +
        trRow("Enclosure (L × W × H)",       s.enc_L + " × " + s.enc_W + " × " + s.enc_H + " mm");
    setTbody("coreDesignBody", coreHtml);

    // ════════════════════════════════════════════════════════════
    //  CROSS CONDUCTOR AREA TABLE  (conductorBreakdownBody)
    // ════════════════════════════════════════════════════════════
    let cbHtml =
        trRow4("Window Height",           r0(s.windowHeight) + " mm",
               "LV1 Conductor b (bare)",  r2(s.lv1_b)   + " mm") +
        trRow4("End Clearance",           r0(endClr)  + " mm",
               "LV1 Conductor b (ins.)",  r2(s.lv1_bi) + " mm") +
        trRow4("Net Winding Length",      r0(netWindLen) + " mm",
               "LV1 Conductor h (bare)",  r2(s.lv1_h)  + " mm") +
        trRow4("Winding Length (eff.)",   r0(netWindLen) + " mm",
               "LV1 Conductor h (ins.)",  r2(s.lv1_hi) + " mm") +
        trRow4("Total Parallel (LV1)",    s.lv1Np * s.lv1Nr,
               "LV1 Conductor Area",      r2(s.lv1_csActual) + " mm²") +
        trRow4("Total Parallel (LV2)",    s.lv2Np * s.lv2Nr,
               "LV2 Conductor Area",      r2(s.lv2_csActual) + " mm²") +
        trRow4("Total Parallel (HV)",     s.hvNp * s.hvNr,
               "HV Conductor Area",       r2(s.hv_csActual)  + " mm²");
    setTbody("conductorBreakdownBody", cbHtml);

    // Phase voltage labels (display only — no arithmetic, just label format)
    let lv1PhaseVLabel = (inp.lv1conn === "Y") ? inp.lv1Voltage + " / √3 V" : inp.lv1Voltage + " V";
    let lv2PhaseVLabel = (inp.lv2conn === "Y") ? inp.lv2Voltage + " / √3 V" : inp.lv2Voltage + " V";
    let hvPhaseVLabel  = (inp.hvconn  === "Y") ? inp.hvVoltage  + " / √3 V" : inp.hvVoltage  + " V";

    // ── Winding detail body builder — all values from backend ─────────
    function windingBodyHtml(wnd) {
        return trRow("Voltage per Phase",                   wnd.phaseVLabel) +
               trRow("Current per Phase",                   r2(wnd.curPhase)   + " A") +
               trRow("Turns per Phase",                     wnd.turns          + " turns") +
               trRow("Connection",                          toConnName(wnd.conn)) +
               trRow("Conductor Material",                  wnd.mat.toUpperCase()) +
               trRow("Number of Layers",                    wnd.layers) +
               trRow("Turns per Layer",                     wnd.tpL) +
               trRow("Axial Parallel (Np)",                 wnd.np) +
               trRow("Radial Parallel (Nr)",                wnd.nr) +
               trRow("Total Parallel Conductors (Np × Nr)", wnd.np * wnd.nr) +
               trRow("Conductor Breadth (bare / ins.)",     r2(wnd.b)  + " mm  &  " + r2(wnd.bi)  + " mm") +
               trRow("Conductor Height (bare / ins.)",      r2(wnd.h)  + " mm  &  " + r2(wnd.hi)  + " mm") +
               trRow("Net Conductor Area",                  r2(wnd.csActual) + " mm²") +
               trRow("Current Density (actual)",            r2(wnd.cd)       + " A/mm²") +
               trRow("Inter-Layer Insulation",              r2(wnd.interLayerIns) + " mm") +
               trRow("Radial Build (winding thickness)",    r2(wnd.radThick) + " mm") +
               trRow("Mean Turn Length (LMT)",              r3(wnd.lmt)      + " m") +
               trRow("Total Wire Length",                   r1(wnd.wl)       + " m") +
               trRow("Resistance per Phase @ 75°C",         r4(wnd.R75)      + " Ω") +
               trRow("Bare / Insulated / Procurement Wt.",  r1(wnd.bareWt)   + " / " + r1(wnd.insWt) + " / " + r1(wnd.procWt) + " kg") +
               trRow("Stray Loss (%)",                      r3(wnd.strayPct) + " %") +
               trRow("Load Loss (I²R + Stray)",             r0(wnd.loadLoss) + " W") +
               trRow("Winding Temperature Gradient",        r1(wnd.gradient) + " °C");
    }

    setTbody("windingLV1Body", windingBodyHtml({
        phaseVLabel: lv1PhaseVLabel,  curPhase: s.lv1CurPhase,  turns: s.lv1Turns,
        conn: inp.lv1conn,  mat: inp.lv1mat,
        layers: s.lv1Layers,  tpL: s.lv1TpL,  np: s.lv1Np,  nr: s.lv1Nr,
        b: s.lv1_b,  bi: s.lv1_bi,  h: s.lv1_h,  hi: s.lv1_hi,
        csActual: s.lv1_csActual,  cd: s.lv1_cd,  interLayerIns: s.lv1_interLayerIns,
        radThick: s.lv1_radThick,  lmt: s.lmt_lv1,  wl: s.wireLen_lv1,  R75: s.R75_lv1,
        bareWt: s.bareWt_lv1,  insWt: s.insWt_lv1,  procWt: s.procWt_lv1,
        strayPct: s.strayPct_lv1,  loadLoss: s.ll_lv1,  gradient: s.gradient_lv1
    }));

    setTbody("windingLV2Body", windingBodyHtml({
        phaseVLabel: lv2PhaseVLabel,  curPhase: s.lv2CurPhase,  turns: s.lv2Turns,
        conn: inp.lv2conn,  mat: inp.lv2mat,
        layers: s.lv2Layers,  tpL: s.lv2TpL,  np: s.lv2Np,  nr: s.lv2Nr,
        b: s.lv2_b,  bi: s.lv2_bi,  h: s.lv2_h,  hi: s.lv2_hi,
        csActual: s.lv2_csActual,  cd: s.lv2_cd,  interLayerIns: s.lv2_interLayerIns,
        radThick: s.lv2_radThick,  lmt: s.lmt_lv2,  wl: s.wireLen_lv2,  R75: s.R75_lv2,
        bareWt: s.bareWt_lv2,  insWt: s.insWt_lv2,  procWt: s.procWt_lv2,
        strayPct: s.strayPct_lv2,  loadLoss: s.ll_lv2,  gradient: s.gradient_lv2
    }));

    setTbody("windingHVBody", windingBodyHtml({
        phaseVLabel: hvPhaseVLabel,  curPhase: s.hvCurPhase,  turns: s.hvTurns,
        conn: inp.hvconn,  mat: inp.hvmat,
        layers: s.hvLayers,  tpL: s.hvTpL,  np: s.hvNp,  nr: s.hvNr,
        b: s.hv_b,  bi: s.hv_bi,  h: s.hv_h,  hi: s.hv_hi,
        csActual: s.hv_csActual,  cd: s.hv_cd,  interLayerIns: s.hv_interLayerIns,
        radThick: s.hv_radThick,  lmt: s.lmt_hv,  wl: s.wireLen_hv,  R75: s.R75_hv,
        bareWt: s.bareWt_hv,  insWt: s.insWt_hv,  procWt: s.procWt_hv,
        strayPct: s.strayPct_hv,  loadLoss: s.ll_hv,  gradient: s.gradient_hv
    }));
}

/* =============================================
   RATING PLATE — populate from calculation
   ============================================= */
function populateRatingPlate(inp, result) {
    // All rating plate data comes from the backend's rating_plate object.
    // Frontend only provides static company/address/sl.no from the settings panel.
    let rp = result.ratingPlate || {};
    let s  = result.steps;
    let pf = result.performance;
    let cm = result.coreMatMeta;

    // ── Title line ────────────────────────────────────────────────────────
    let phases = inp.phases === 1 ? "1 PHASE" : "3 PHASE";
    setText("rp-bv-title",  phases + " " + matCode(inp.lv1mat) + " WOUND DRY TYPE ISOLATION TRANSFORMER");
    setText("rp-bv-spec",   "IS 1180 : 2014 PART 1  ·  VECTOR GROUP: " + (rp.vector_symbol || inp.vectorGroup || "—").toUpperCase());
    setText("rp-bv-rating", rp.rating_kva  || (inp.ratedPower + " KVA"));
    setText("rp-bv-freq",   rp.frequency_hz || ((inp.frequency || 50) + " HZ"));
    setText("rp-bv-imp",    rp.impedance_percentage || "—");

    // ── Primary / secondary displays — use backend strings directly ───────
    let primary = rp.primary    || {};
    let sec1    = rp.secondary_1 || {};
    let sec2    = rp.secondary_2 || {};

    setText("rp-bv-primary", primary.display || "—");
    setText("rp-bv-sec1",    sec1.display    || "—");
    setText("rp-bv-sec2",    sec2.display    || "—");
    setText("rp-bv-vector",  (rp.vector_symbol || inp.vectorGroup || "—").toUpperCase());

    // ── Weight, insulation class ─────────────────────────────────────────
    setText("rp-bv-weight", rp.weight || "—");
    setText("rp-bv-insul",  "CLASS " + (inp.insulationClass || "—").toUpperCase());

    // ── Losses ───────────────────────────────────────────────────────────
    setText("rp-bv-noload",   (pf && pf.coreLoss      ? r0(pf.coreLoss)      : "—") + " W");
    setText("rp-bv-fullload", (pf && pf.totalLoadLoss ? r0(pf.totalLoadLoss) : "—") + " W");

    // ── Core material ────────────────────────────────────────────────────
    if (cm) setText("rp-bv-coremat", cm.type + " · Grade " + cm.grade);

    // ── Phasor title ─────────────────────────────────────────────────────
    setText("rp-bv-phasor-title", (rp.vector_symbol || inp.vectorGroup || "Dyn11").toUpperCase());

    // ── Mfg year — use backend value, fall back to current year ──────────
    let mfgEl = document.getElementById("rp-bv-mfg");
    if (mfgEl) {
        if (rp.mfg_year) {
            mfgEl.textContent = rp.mfg_year;
        } else if (!mfgEl.textContent || mfgEl.textContent === "—") {
            mfgEl.textContent = new Date().getFullYear();
        }
    }
}

/* ── Live settings updater (company name, address, etc.) ── */
function updateRPSettings() {
    function val(id) {
        let el = document.getElementById(id);
        return el ? el.value.trim() : "";
    }

    let company = val("rp-set-company");
    let addr1   = val("rp-set-addr1");
    let addr2   = val("rp-set-addr2");
    let logo    = val("rp-set-logo");
    let slno    = val("rp-set-slno");
    let mfg     = val("rp-set-mfg");

    if (company) setTextUpper("rp-bv-company-name",  company);
    if (addr1)   setTextUpper("rp-bv-company-addr1", addr1);
    if (addr2)   setTextUpper("rp-bv-company-addr2", addr2);
    if (logo)    setTextUpper("rp-bv-logo-label",    logo);
    if (slno)    setText("rp-bv-slno", slno);
    if (mfg)     setText("rp-bv-mfg",  mfg);
}

/* =============================================
   POPULATE CALCULATED OUTPUTS
   ============================================= */
function populateOutput(data) {
    let w  = data.windingSummary;
    let cd = data.coreDesign;
    let pf = data.performance;
    let s  = data.steps;

    /* ---- Winding Summary table ---- */
    let tbody = document.getElementById("windingOutputBody");
    if (tbody) {
        tbody.innerHTML =
            buildOutputRow("Turns / Phase",          w.LV1.turns,           w.LV2.turns,           w.HV.turns) +
            buildOutputRow("Turns / Layer",          s.lv1TpL,              s.lv2TpL,              s.hvTpL) +
            buildOutputRow("No. of Layers",          s.lv1Layers,           s.lv2Layers,           s.hvLayers) +
            buildOutputRow("Axial Parallel (Np)",    s.lv1Np,               s.lv2Np,               s.hvNp) +
            buildOutputRow("Radial Parallel (Nr)",   s.lv1Nr,               s.lv2Nr,               s.hvNr) +
            buildOutputRow("Current / Phase (A)",    r2(s.lv1CurPhase),     r2(s.lv2CurPhase),     r2(s.hvCurPhase)) +
            buildOutputRow("Conductor b (mm)",       r2(s.lv1_b),           r2(s.lv2_b),           r2(s.hv_b)) +
            buildOutputRow("Conductor h (mm)",       r2(s.lv1_h),           r2(s.lv2_h),           r2(s.hv_h)) +
            buildOutputRow("Conductor Area (mm²)",   r2(w.LV1.conductorArea), r2(w.LV2.conductorArea), r2(w.HV.conductorArea)) +
            buildOutputRow("Current Density (A/mm²)",r2(w.LV1.currentDensity), r2(w.LV2.currentDensity), r2(w.HV.currentDensity)) +
            buildOutputRow("Radial Thickness (mm)",  r2(s.lv1_radThick),    r2(s.lv2_radThick),    r2(s.hv_radThick)) +
            buildOutputRow("LMT (m)",                r3(s.lmt_lv1),         r3(s.lmt_lv2),         r3(s.lmt_hv)) +
            buildOutputRow("Wire Length (m)",        r1(s.wireLen_lv1),     r1(s.wireLen_lv2),     r1(s.wireLen_hv)) +
            buildOutputRow("R @ 75°C (Ω)",           r4(s.R75_lv1),         r4(s.R75_lv2),         r4(s.R75_hv)) +
            buildOutputRow("Bare Weight (kg)",       r1(s.bareWt_lv1),      r1(s.bareWt_lv2),      r1(s.bareWt_hv)) +
            buildOutputRow("Load Loss (W)",          r0(s.ll_lv1),          r0(s.ll_lv2),          r0(s.ll_hv));
    }

    /* ---- Core Design ---- */
    let coreEl = document.getElementById("coreOutput");
    if (coreEl) {
        coreEl.innerHTML =
            kvRow("Volts / Turn",               r4(s.vt)          + " V") +
            kvRow("Net Core Area",              r0(s.A_net)       + " mm²") +
            kvRow("Gross Core Area",            r0(s.A_gross)     + " mm²") +
            kvRow("Core Frame (Tongue × Stack)", s.tongue          + " × " + s.stack + " mm") +
            kvRow("Window Height",              r0(s.windowHeight) + " mm") +
            kvRow("Yoke Height",                r0(s.yokeHeight)  + " mm") +
            kvRow("Limb Spacing (c-c)",         s.limbSpacingA    + " mm") +
            kvRow("Core Length",                r0(s.coreLen_mm)  + " mm") +
            kvRow("Core Weight",                r1(s.coreWeight)  + " kg") +
            kvRow("Enclosure L × W × H",        s.enc_L + " × " + s.enc_W + " × " + s.enc_H + " mm");
    }

    /* ---- Performance ---- */
    let perfEl = document.getElementById("performanceOutput");
    if (perfEl) {
        perfEl.innerHTML =
            kvRow("Core Loss",        r0(pf.coreLoss)       + " W") +
            kvRow("Total Load Loss",  r0(pf.totalLoadLoss)  + " W") +
            kvRow("Total Loss",       r0(pf.totalLoss)      + " W") +
            kvRow("Impedance Voltage", pf.impedance          + " %") +
            kvRow("Voltage Regulation", pf.regulation        + " %");
    }

    /* ---- Core Material Summary ---- */
    let cmEl = document.getElementById("coreMaterialOutput");
    if (cmEl && data.coreMatMeta) {
        let cm = data.coreMatMeta;
        cmEl.innerHTML =
            kvRow("Material Type",        cm.type) +
            kvRow("Grade / Standard",     cm.grade) +
            kvRow("Sheet Thickness",      cm.thickness) +
            kvRow("Density",              cm.density) +
            kvRow("Stack Factor",         cm.stackFactor) +
            kvRow("Specific Loss (W/kg)", r3(cm.specLoss)   + " W/kg") +
            kvRow("Build Factor",         cm.buildFactor) +
            kvRow("Core Weight",          r1(s.coreWeight)  + " kg") +
            kvRow("Core Loss",            r0(s.coreLoss)    + " W") +
            kvRow("Formula",              cm.type + " · " + r1(s.coreWeight) + " kg × " + r3(cm.specLoss) + " W/kg × " + cm.buildFactor);
    }

    /* ---- Update radial dims for layout diagram ---- */
    if (data.radialDims) {
        let rd = data.radialDims;
        ldDims.coreDia      = rd.coreDia;
        ldDims.lv1Radial    = rd.lv1;
        ldDims.duct1        = rd.duct1;
        ldDims.lv2Radial    = rd.lv2;
        ldDims.duct2        = rd.duct2;
        ldDims.hvRadial     = rd.hv;
        ldDims.windowHeight = s.windowHeight;
        ldDims.yokeHeight   = s.yokeHeight;
        ldDims.limbSpacing  = s.limbSpacingA;
        ldDims.coreFootInsulation = 10;
        // Winding heights: use backend side_view if available, else window height
        let lySide = data.layout && data.layout.side_view ? data.layout.side_view : {};
        ldDims.lv1Height = lySide.lv1_radial_depth_mm || s.windowHeight;
        ldDims.lv2Height = lySide.lv2_radial_depth_mm || s.windowHeight;
        ldDims.hvHeight  = lySide.hv_radial_depth_mm  || s.windowHeight;
    }
}

/* =============================================
   DOWNLOAD TECHNICAL REPORT AS PDF  (jsPDF + autotable)
   ============================================= */
let downloadBtn = document.getElementById("downloadPdfBtn");
if (downloadBtn) {
    downloadBtn.addEventListener("click", function() {
        generateTechnicalReportPDF();
    });
}

/* ── stored last result so PDF generator can access it ── */
let _lastInputData  = null;
let _lastResultData = null;

function generateTechnicalReportPDF() {
    if (!_lastInputData || !_lastResultData) {
        showToast("Please run a calculation first before downloading the report.", "warn");
        return;
    }

    let inp = _lastInputData;
    let res = _lastResultData;
    let s   = res.steps;
    let pf  = res.performance;
    let cm  = res.coreMatMeta;
    let w   = res.windingSummary;

    // ── init jsPDF ──────────────────────────────────────────────────────
    let jsPDF = window.jspdf ? window.jspdf.jsPDF : (window.jsPDF || (typeof jsPDF !== "undefined" ? jsPDF : null));
    if (!jsPDF) { showToast("PDF library not loaded. Please check your internet connection.", "error"); return; }

    let doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    let PW  = 210;   // page width mm
    let PH  = 297;   // page height mm
    let ML  = 14;    // margin left
    let MR  = 14;    // margin right
    let TW  = PW - ML - MR;  // table width
    let y   = 0;     // current y cursor

    // ── colour palette ───────────────────────────────────────────────────
    let C_DARK   = [30,  30,  46];   // header bar
    let C_ACCENT = [0,  122, 204];   // blue accent
    let C_HEAD   = [45,  45,  65];   // section headers
    let C_ALT    = [245, 247, 250];  // alternating row
    let C_WHITE  = [255, 255, 255];
    let C_BORDER = [200, 205, 215];
    let C_TEXT   = [30,  30,  30];
    let C_MID    = [100, 105, 120];

    function checkPageBreak(neededMM) {
        if (y + neededMM > PH - 18) {
            doc.addPage();
            y = 20;
            addFooter(doc.getNumberOfPages());
        }
    }

    function addFooter(pageNum) {
        let total = doc.getNumberOfPages();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...C_MID);
        doc.setDrawColor(...C_BORDER);
        doc.line(ML, PH - 12, PW - MR, PH - 12);
        doc.text("Dry Type Transformer Design Report  |  Generated " + new Date().toLocaleDateString(), ML, PH - 7);
        doc.text("Page " + pageNum + " / " + total, PW - MR, PH - 7, { align: "right" });
    }

    // ── COVER / TITLE PAGE ───────────────────────────────────────────────
    // Dark header band
    doc.setFillColor(...C_DARK);
    doc.rect(0, 0, PW, 55, "F");

    // Blue accent bar
    doc.setFillColor(...C_ACCENT);
    doc.rect(0, 55, PW, 4, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...C_WHITE);
    doc.text("DRY TYPE TRANSFORMER", PW / 2, 22, { align: "center" });
    doc.text("DESIGN TECHNICAL REPORT", PW / 2, 32, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 210, 240);
    doc.text("Complete Design Calculations  |  IS 1180 : 2014 Part 1", PW / 2, 43, { align: "center" });

    // Summary box
    y = 70;
    doc.setFillColor(250, 251, 253);
    doc.setDrawColor(...C_BORDER);
    doc.roundedRect(ML, y, TW, 68, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...C_ACCENT);
    doc.text("TRANSFORMER SPECIFICATION SUMMARY", ML + 6, y + 9);

    // 2-column summary grid
    let col1x = ML + 6, col2x = ML + TW / 2 + 4;
    let summaryRows = [
        ["Rated Power",       (inp.ratedPower || "—") + " kVA",
         "Vector Group",      (inp.vectorGroup || "—").toUpperCase()],
        ["Phases",            (inp.phases || "—") + " Phase",
         "Frequency",         (inp.frequency || "—") + " Hz"],
        ["HV Voltage",        (inp.hvVoltage || "—") + " V  (" + toConnLabel(inp.hvconn) + ")",
         "Insulation Class",  "Class " + (inp.insulationClass || "—").toUpperCase()],
        ["LV1 Voltage",       (inp.lv1Voltage || "—") + " V  (" + toConnLabel(inp.lv1conn) + ")",
         "LV2 Voltage",       (inp.lv2Voltage || "—") + " V  (" + toConnLabel(inp.lv2conn) + ")"],
        ["Flux Density",      (inp.fluxDensity || "—") + " T",
         "Core Material",     (cm ? cm.type + " · " + cm.grade : "—")],
        ["No-Load Losses",    r0(pf.coreLoss) + " W",
         "Full-Load Losses",  r0(pf.totalLoadLoss) + " W"],
        ["Impedance Voltage", r2(pf.impedance) + " %",
         "Total Losses",      r0(pf.totalLoss) + " W"],
    ];

    let sy = y + 17;
    summaryRows.forEach(function(row, i) {
        if (i % 2 === 0) {
            doc.setFillColor(248, 250, 253);
            doc.rect(ML + 1, sy - 4, TW - 2, 8, "F");
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...C_MID);
        doc.text(row[0], col1x, sy);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C_TEXT);
        doc.text(row[1], col1x + 36, sy);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(...C_MID);
        doc.text(row[2], col2x, sy);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C_TEXT);
        doc.text(row[3], col2x + 36, sy);
        sy += 8.5;
    });

    addFooter(1);

    // ════════════════════════════════════════════════════════════════════
    // ── helper: draw a section heading ──────────────────────────────────
    // ════════════════════════════════════════════════════════════════════
    function sectionHeading(title, subtitle) {
        checkPageBreak(22);
        doc.setFillColor(...C_HEAD);
        doc.rect(ML, y, TW, 10, "F");
        doc.setFillColor(...C_ACCENT);
        doc.rect(ML, y, 4, 10, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...C_WHITE);
        doc.text(title, ML + 8, y + 6.8);
        if (subtitle) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(180, 210, 240);
            doc.text(subtitle, PW - MR, y + 6.8, { align: "right" });
        }
        y += 13;
    }

    function subHeading(title) {
        checkPageBreak(12);
        doc.setFillColor(235, 240, 248);
        doc.rect(ML, y, TW, 7.5, "F");
        doc.setDrawColor(...C_ACCENT);
        doc.line(ML, y, ML, y + 7.5);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...C_HEAD);
        doc.text(title, ML + 5, y + 5);
        y += 10;
    }

    // ── helper: two-column parameter table (label | value) ───────────────
    function paramTable(rows, colWidths) {
        let cw = colWidths || [TW * 0.58, TW * 0.42];
        let rowH = 7.5;
        rows.forEach(function(row, i) {
            checkPageBreak(rowH + 2);
            // alternating rows
            if (i % 2 === 0) {
                doc.setFillColor(...C_ALT);
                doc.rect(ML, y, TW, rowH, "F");
            }
            doc.setDrawColor(...C_BORDER);
            doc.rect(ML, y, TW, rowH);
            // divider
            doc.line(ML + cw[0], y, ML + cw[0], y + rowH);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(...C_TEXT);
            doc.text(String(row[0]), ML + 3, y + 5);
            doc.setFont("helvetica", "bold");
            doc.text(String(row[1]), ML + cw[0] + 3, y + 5);
            y += rowH;
        });
        y += 2;
    }

    // ── helper: four-column table ─────────────────────────────────────────
    function param4Table(rows) {
        let cw = [TW * 0.30, TW * 0.20, TW * 0.30, TW * 0.20];
        let rowH = 7.5;
        rows.forEach(function(row, i) {
            checkPageBreak(rowH + 2);
            if (i % 2 === 0) {
                doc.setFillColor(...C_ALT);
                doc.rect(ML, y, TW, rowH, "F");
            }
            doc.setDrawColor(...C_BORDER);
            doc.rect(ML, y, TW, rowH);
            let xs = [ML, ML + cw[0], ML + cw[0] + cw[1], ML + cw[0] + cw[1] + cw[2]];
            cw.forEach(function(w_, j) {
                doc.line(xs[j], y, xs[j], y + rowH);
            });
            let isLabel = [true, false, true, false];
            row.forEach(function(cell, j) {
                doc.setFont("helvetica", isLabel[j] ? "normal" : "bold");
                doc.setFontSize(8.5);
                doc.setTextColor(...C_TEXT);
                doc.text(String(cell || "—"), xs[j] + 3, y + 5);
            });
            y += rowH;
        });
        y += 2;
    }

    // ── helper: table column headers ──────────────────────────────────────
    function tableHeader2(h1, h2) {
        checkPageBreak(9);
        let cw = [TW * 0.58, TW * 0.42];
        doc.setFillColor(...C_DARK);
        doc.rect(ML, y, TW, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...C_WHITE);
        doc.text(h1, ML + 3, y + 5.5);
        doc.text(h2, ML + cw[0] + 3, y + 5.5);
        y += 8;
    }

    function tableHeader4(h1, h2, h3, h4) {
        checkPageBreak(9);
        let cw = [TW * 0.30, TW * 0.20, TW * 0.30, TW * 0.20];
        let xs = [ML, ML + cw[0], ML + cw[0] + cw[1], ML + cw[0] + cw[1] + cw[2]];
        doc.setFillColor(...C_DARK);
        doc.rect(ML, y, TW, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...C_WHITE);
        [h1, h2, h3, h4].forEach(function(h, i) { doc.text(h, xs[i] + 3, y + 5.5); });
        y += 8;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  PAGE 2 — SECTION 1: CORE DESIGN
    // ══════════════════════════════════════════════════════════════════════
    doc.addPage();
    addFooter(2);
    y = 20;

    sectionHeading("SECTION 1 — CORE DESIGN", inp.ratedPower + " kVA  |  " + (inp.vectorGroup || "").toUpperCase());

    // Use backend-provided values — no recalculation in frontend
    let endClr = s.endClearance  || 0;
    let netWL  = s.windingLength  || 0;
    let lv1pV  = s.lv1CurPhase ? (w1 ? w1.voltage_per_phase : 0) : 0;  // display only
    let revVT  = r4(s.vt);

    tableHeader2("PARAMETER", "VALUE");
    paramTable([
        ["Initial Volts per Turn (estimate)",  r4(s.vt) + " V"],
        ["LV1 Phase Voltage",                  (inp.lv1conn === "Y")
                                                  ? inp.lv1Voltage + " / √3 V"
                                                  : inp.lv1Voltage + " V"],
        ["LV1 Turns per Phase",                s.lv1Turns + " turns"],
        ["Revised Volts per Turn",             revVT + " V"],
        ["Net Core Flux Density (B)",          r2(inp.fluxDensity) + " T"],
        ["Net Core Area (A_net)",              r0(s.A_net) + " mm²"],
        ["Gross Core Area (A_gross)",          r0(s.A_gross) + " mm²"],
        ["Stack Factor",                       cm ? cm.stackFactor : "—"],
        ["Core Frame — Tongue × Stack",        s.tongue + " × " + s.stack + " mm"],
        ["Window Height",                      r0(s.windowHeight) + " mm"],
        ["Yoke Height",                        r0(s.yokeHeight) + " mm"],
        ["End Clearance (each side)",          r0(endClr) + " mm"],
        ["Net Winding Length",                 r0(netWL) + " mm"],
        ["Limb Spacing (centre to centre)",    s.limbSpacingA + " mm"],
        ["Core Length",                        r0(s.coreLen_mm) + " mm"],
        ["Core Weight",                        r1(s.coreWeight) + " kg"],
        ["Specific Loss (W/kg)",               cm ? r3(cm.specLoss) + " W/kg  @ " + r2(inp.fluxDensity) + " T" : "—"],
        ["Build Factor",                       cm ? cm.buildFactor : "—"],
        ["Core Loss  (Wt × Spec.Loss × BF)",   r0(s.coreLoss) + " W"],
        ["Enclosure (L × W × H)",              s.enc_L + " × " + s.enc_W + " × " + s.enc_H + " mm"],
    ]);

    // Cross conductor area sub-section
    subHeading("Cross Conductor Area Calculations");
    tableHeader4("PARAMETER", "VALUE", "PARAMETER", "VALUE");
    param4Table([
        ["Window Height",           r0(s.windowHeight) + " mm",
         "LV1 Conductor b (bare)",  r2(s.lv1_b) + " mm"],
        ["End Clearance",           endClr + " mm",
         "LV1 Conductor b (ins.)",  r2(s.lv1_bi) + " mm"],
        ["Net Winding Length",      netWL + " mm",
         "LV1 Conductor h (bare)",  r2(s.lv1_h) + " mm"],
        ["Winding Length (eff.)",   netWL + " mm",
         "LV1 Conductor h (ins.)",  r2(s.lv1_hi) + " mm"],
        ["Total Parallel (LV1)",    String((s.lv1Np || 1) * (s.lv1Nr || 1)),
         "LV1 Conductor Area",      r2(s.lv1_csActual) + " mm²"],
        ["Total Parallel (LV2)",    String((s.lv2Np || 1) * (s.lv2Nr || 1)),
         "LV2 Conductor Area",      r2(s.lv2_csActual) + " mm²"],
        ["Total Parallel (HV)",     String((s.hvNp  || 1) * (s.hvNr  || 1)),
         "HV  Conductor Area",      r2(s.hv_csActual)  + " mm²"],
    ]);

    // Core material sub-section
    subHeading("Core Material Summary");
    if (cm) {
        tableHeader2("PARAMETER", "VALUE");
        paramTable([
            ["Material Type",           cm.type],
            ["Grade / Standard",        cm.grade],
            ["Sheet Thickness",         cm.thickness],
            ["Density",                 cm.density],
            ["Stack Factor",            String(cm.stackFactor)],
            ["Specific Loss (W/kg)",    cm.specLoss + " W/kg  @ " + r2(inp.fluxDensity) + " T"],
            ["Build Factor",            String(cm.buildFactor)],
            ["Core Weight",             r1(s.coreWeight) + " kg"],
            ["Core Loss Formula",       cm.type + " · " + r1(s.coreWeight) + " kg × " + cm.specLoss + " W/kg × " + cm.buildFactor],
            ["Core Loss (Step 65)",     r0(s.coreLoss) + " W"],
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  SECTION 2: WINDING DESIGN  (one page per winding)
    // ══════════════════════════════════════════════════════════════════════
    let windings = [
        { label: "LV1", turns: s.lv1Turns, tpL: s.lv1TpL, layers: s.lv1Layers,
          np: s.lv1Np, nr: s.lv1Nr,
          curPhase: s.lv1CurPhase, b: s.lv1_b, bi: s.lv1_bi, h: s.lv1_h, hi: s.lv1_hi,
          cs: s.lv1_csActual, cd: s.lv1_cd, interLayerIns: s.lv1_interLayerIns,
          radThick: s.lv1_radThick, lmt: s.lmt_lv1, wl: s.wireLen_lv1, R75: s.R75_lv1,
          bareWt: s.bareWt_lv1, insWt: s.insWt_lv1, procWt: s.procWt_lv1,
          strayPct: s.strayPct_lv1, loadLoss: s.ll_lv1, gradient: s.gradient_lv1,
          voltage: inp.lv1Voltage, conn: inp.lv1conn, mat: inp.lv1mat, kva: inp.lv1kva },
        { label: "LV2", turns: s.lv2Turns, tpL: s.lv2TpL, layers: s.lv2Layers,
          np: s.lv2Np, nr: s.lv2Nr,
          curPhase: s.lv2CurPhase, b: s.lv2_b, bi: s.lv2_bi, h: s.lv2_h, hi: s.lv2_hi,
          cs: s.lv2_csActual, cd: s.lv2_cd, interLayerIns: s.lv2_interLayerIns,
          radThick: s.lv2_radThick, lmt: s.lmt_lv2, wl: s.wireLen_lv2, R75: s.R75_lv2,
          bareWt: s.bareWt_lv2, insWt: s.insWt_lv2, procWt: s.procWt_lv2,
          strayPct: s.strayPct_lv2, loadLoss: s.ll_lv2, gradient: s.gradient_lv2,
          voltage: inp.lv2Voltage, conn: inp.lv2conn, mat: inp.lv2mat, kva: inp.lv2kva },
        { label: "HV",  turns: s.hvTurns,  tpL: s.hvTpL,  layers: s.hvLayers,
          np: s.hvNp,  nr: s.hvNr,
          curPhase: s.hvCurPhase, b: s.hv_b, bi: s.hv_bi, h: s.hv_h, hi: s.hv_hi,
          cs: s.hv_csActual, cd: s.hv_cd, interLayerIns: s.hv_interLayerIns,
          radThick: s.hv_radThick, lmt: s.lmt_hv, wl: s.wireLen_hv, R75: s.R75_hv,
          bareWt: s.bareWt_hv, insWt: s.insWt_hv, procWt: s.procWt_hv,
          strayPct: s.strayPct_hv, loadLoss: s.ll_hv, gradient: s.gradient_hv,
          voltage: inp.hvVoltage, conn: inp.hvconn, mat: inp.hvmat, kva: inp.hvkva },
    ];

    windings.forEach(function(wnd, wi) {
        doc.addPage();
        addFooter(3 + wi);
        y = 20;

        // Phase voltage label — display only
        let phV = (wnd.conn === "Y")
            ? wnd.voltage + " / √3 V"
            : wnd.voltage + " V";

        sectionHeading(
            "SECTION 2 — WINDING DESIGN  :  " + wnd.label + " WINDING",
            toConnLabel(wnd.conn) + "  |  " + wnd.mat.toUpperCase()
        );

        tableHeader2("PARAMETER", "VALUE");
        paramTable([
            ["Winding",                               wnd.label],
            ["Voltage (line)",                        wnd.voltage + " V"],
            ["Voltage per Phase",                     phV],
            ["Connection Type",                       toConnLabel(wnd.conn)],
            ["Conductor Material",                    wnd.mat.toUpperCase()],
            ["Rated kVA",                             (wnd.kva || inp.ratedPower) + " kVA"],
            ["Current per Phase",                     r2(wnd.curPhase) + " A"],
            ["Turns per Phase",                       String(wnd.turns)],
            ["Number of Layers",                      String(wnd.layers)],
            ["Turns per Layer",                       String(wnd.tpL)],
            ["Axial Parallel Conductors (Np)",        String(wnd.np)],
            ["Radial Parallel Conductors (Nr)",       String(wnd.nr)],
            ["Total Parallel Conductors (Np × Nr)",   String(wnd.np * wnd.nr)],
            ["Conductor Breadth — bare",              r2(wnd.b)   + " mm"],
            ["Conductor Breadth — insulated",         r2(wnd.bi)  + " mm"],
            ["Conductor Height — bare",               r2(wnd.h)   + " mm"],
            ["Conductor Height — insulated",          r2(wnd.hi)  + " mm"],
            ["Net Conductor Area",                    r2(wnd.cs)  + " mm²"],
            ["Actual Current Density",                r2(wnd.cd)  + " A/mm²"],
            ["Inter-Layer Insulation",                r2(wnd.interLayerIns) + " mm"],
            ["Radial Build (winding thickness)",      r2(wnd.radThick) + " mm"],
            ["Mean Turn Length (LMT)",                r3(wnd.lmt) + " m"],
            ["Total Wire Length",                     r1(wnd.wl)  + " m"],
            ["Resistance per Phase @ 75°C",           r4(wnd.R75) + " \u03a9"],
            ["Bare Weight",                           r1(wnd.bareWt)  + " kg"],
            ["Insulated Weight",                      r1(wnd.insWt)   + " kg"],
            ["Procurement Weight",                    r1(wnd.procWt)  + " kg"],
            ["Stray Loss (%)",                        r3(wnd.strayPct) + " %"],
            ["Load Loss  (I\u00b2R + Stray)",         r0(wnd.loadLoss) + " W"],
            ["Winding Temperature Gradient",          r1(wnd.gradient) + " \u00b0C"],
        ]);
    });

    // ══════════════════════════════════════════════════════════════════════
    //  FINAL PAGE — PERFORMANCE SUMMARY
    // ══════════════════════════════════════════════════════════════════════
    doc.addPage();
    addFooter(3 + windings.length);
    y = 20;

    sectionHeading("PERFORMANCE SUMMARY", inp.ratedPower + " kVA  ·  " + (inp.vectorGroup || "").toUpperCase());

    tableHeader2("PARAMETER", "VALUE");
    paramTable([
        ["Core Loss (No-Load Loss)",         r0(pf.coreLoss)      + " W"],
        ["LV1 Winding Load Loss",            r0(s.ll_lv1)         + " W"],
        ["LV2 Winding Load Loss",            r0(s.ll_lv2)         + " W"],
        ["HV  Winding Load Loss",            r0(s.ll_hv)          + " W"],
        ["Total Full-Load Loss",             r0(pf.totalLoadLoss) + " W"],
        ["Total Loss (Core + Full Load)",    r0(pf.totalLoss)     + " W"],
        ["Impedance Voltage (%)",            r2(pf.impedance)     + " %"],
        ["Voltage Regulation (%)",           r2(pf.regulation)    + " %"],
        ["Core Weight",                      r1(s.coreWeight)     + " kg"],
        ["LV1 Bare Conductor Weight",        r1(s.bareWt_lv1)     + " kg"],
        ["LV2 Bare Conductor Weight",        r1(s.bareWt_lv2)     + " kg"],
        ["HV  Bare Conductor Weight",        r1(s.bareWt_hv)      + " kg"],
        ["Total Active Weight (est.)",       r1(s.coreWeight + s.bareWt_lv1 + s.bareWt_lv2 + s.bareWt_hv) + " kg"],
        ["Enclosure (L × W × H)",           s.enc_L + " × " + s.enc_W + " × " + s.enc_H + " mm"],
    ]);

    // Fix all page footers with correct total
    let total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...C_MID);
        // rewrite page numbers now we know total
        doc.setFillColor(...C_WHITE);
        doc.rect(PW - MR - 30, PH - 12, 32, 8, "F");
        doc.text("Page " + p + " / " + total, PW - MR, PH - 7, { align: "right" });
    }

    // ── save ──────────────────────────────────────────────────────────────
    let filename = "TechReport_" + (inp.ratedPower || "0") + "kVA_" +
                   (inp.vectorGroup || "").toUpperCase() + "_" +
                   new Date().toISOString().slice(0, 10) + ".pdf";
    doc.save(filename);
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
/* =============================================
   BOM PAGE — ACTION BUTTONS
   ============================================= */
const bomDownloadPdf   = document.getElementById("bomDownloadPdf");
const bomDownloadExcel = document.getElementById("bomDownloadExcel");
const bomPrint         = document.getElementById("bomPrint");

if (bomDownloadPdf) {
    bomDownloadPdf.addEventListener("click", function() { printPage(); });
}

if (bomDownloadExcel) {
    bomDownloadExcel.addEventListener("click", function() {
        showToast("Excel export coming soon — will be connected to the Electron backend.", "warn");
    });
}

if (bomPrint) {
    bomPrint.addEventListener("click", function() { printPage(); });
}

/* Populate full BOM table from backend bom object */
function populateBom(result) {
    let bm = result.bom || {};
    let kva = _lastInputData ? _lastInputData.ratedPower : "";

    // Rating label
    let ratingEl = document.getElementById("bomRating");
    if (ratingEl && kva) ratingEl.textContent = kva + " kVA";

    // ── Core row ─────────────────────────────────────────────────────────────────────
    let cBody = document.getElementById("bomCoreBody");
    if (cBody && bm.core) {
        let cr = bm.core;
        cBody.innerHTML =
            "<tr>" +
            "<td>Core</td>" +
            "<td>" + (cr.material     || "—") + "</td>" +
            "<td class=\"col-num\">" + r2(cr.weight_kg    || 0) + " kg</td>" +
            "<td class=\"col-num\">₹ " + r0(cr.price_per_kg || 0) + "</td>" +
            "<td>" + (cr.price_source  || "—") + "</td>" +
            "<td class=\"col-num bom-cost\">₹ " + r0(cr.cost_inr || 0) + "</td>" +
            "</tr>";
    }

    // ── Winding rows ───────────────────────────────────────────────────────────────────
    let wBody = document.getElementById("bomWindingBody");
    if (wBody && bm.windings) {
        let wd = bm.windings;
        let rows = [["LV1", wd.lv1], ["LV2", wd.lv2], ["HV", wd.hv]]
            .map(function(pair) {
                let label = pair[0], w = pair[1] || {};
                let cls = label === "HV" ? "bom-winding-label hv" : "bom-winding-label lv";
                return "<tr>" +
                    "<td class=\"" + cls + "\">" + label + "</td>" +
                    "<td>" + (w.material      || "—") + "</td>" +
                    "<td class=\"col-num\">" + r2(w.weight_kg    || 0) + " kg</td>" +
                    "<td class=\"col-num\">₹ " + r0(w.price_per_kg || 0) + "</td>" +
                    "<td>" + (w.price_source  || "—") + "</td>" +
                    "<td class=\"col-num bom-cost\">₹ " + r0(w.cost_inr || 0) + "</td>" +
                    "</tr>";
            });

        rows.push(
            "<tr class=\"bom-subtotal\">" +
            "<td colspan=\"5\"><strong>Total Conductor</strong></td>" +
            "<td class=\"col-num\"><strong>₹ " + r0(wd.total_conductor_cost || 0) + "</strong></td>" +
            "</tr>"
        );

        wBody.innerHTML = rows.join("");
    }

    // ── Summary card ──────────────────────────────────────────────────────────────────────
    setText("bomActiveWeight",    r1(bm.active_part_weight_kg || 0) + " kg");
    setText("bomEnclosureWeight", r1(bm.enclosure_weight_kg   || 0) + " kg");
    setText("bomTotalCost",       "₹ " + r0(bm.total_cost_inr || 0));
    setText("bomCurrency",        bm.currency || "INR");
}

/* =============================================
   RATING PLATE — EXPORT BUTTONS
   ============================================= */

/* --- Export as SVG --- */
const rpExportSvg = document.getElementById("rpExportSvg");
if (rpExportSvg) {
    rpExportSvg.addEventListener("click", function() {
        let plate = document.getElementById("ratingPlateExport");
        if (!plate) return;

        // Inline all computed styles into a clone so SVG is self-contained
        let clone = plate.cloneNode(true);
        let allEls = plate.querySelectorAll("*");
        let cloneEls = clone.querySelectorAll("*");

        allEls.forEach(function(el, i) {
            let computed = window.getComputedStyle(el);
            cloneEls[i].style.cssText = computed.cssText;
        });

        let html = clone.innerHTML;
        let svgContent =
            '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml"' +
            ' width="740" height="' + (plate.scrollHeight + 40) + '">' +
            '<foreignObject width="100%" height="100%">' +
            '<html xmlns="http://www.w3.org/1999/xhtml"><body style="margin:0;padding:20px;background:#fff;">' +
            clone.outerHTML +
            '</body></html></foreignObject></svg>';

        let blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
        let url  = URL.createObjectURL(blob);
        let a    = document.createElement("a");
        a.href     = url;
        a.download = "rating_plate.svg";
        a.click();
        URL.revokeObjectURL(url);
    });
}

/* --- Export as PDF (print dialog) --- */
const rpExportPdf = document.getElementById("rpExportPdf");
if (rpExportPdf) {
    rpExportPdf.addEventListener("click", function() {
        printPage([".rp-export-bar", ".main-header"]);
    });
}

/* =============================================
   LAYOUT DESIGN PAGE
   ============================================= */

// Global layout dimensions (updated from calculation results)
let ldDims = {
    coreDia:    150,   // mm
    lv1Radial:  25,
    duct1:      12,
    lv2Radial:  18,
    duct2:      15,
    hvRadial:   27,
    lv1Height:  210,
    lv2Height:  270,
    hvHeight:   420,
    yokeHeight: 95,
    windowHeight: 210,
    coreFootInsulation: 10,
    limbSpacing: 260,   // centre-to-centre distance between limbs
    numLimbs:   3
};

/* Feed layout dimensions from backend result — no local approximations */
function updateLayoutDimensions(data) {
    if (!data) return;

    let s      = data.steps       || {};
    let rd     = data.radialDims  || {};
    let ly     = data.layout      || {};
    let lyFront = ly.front_view   || {};
    let lySide  = ly.side_view    || {};
    let lyTop   = ly.top_view     || {};

    // All dimensions come from the backend — no multiplication factors here
    ldDims.coreDia     = lyFront.D_core_tongue_width_mm || s.tongue        || ldDims.coreDia;
    ldDims.windowHeight= lyFront.L_window_height_mm     || s.windowHeight   || ldDims.windowHeight;
    ldDims.yokeHeight  = lyFront.yoke_depth_mm          || s.yokeHeight     || ldDims.yokeHeight;
    ldDims.limbSpacing = lyFront.A_limb_center_to_center_mm || s.limbSpacingA || ldDims.limbSpacing;

    ldDims.lv1Radial = lySide.lv1_radial_depth_mm || rd.lv1 || ldDims.lv1Radial;
    ldDims.lv2Radial = lySide.lv2_radial_depth_mm || rd.lv2 || ldDims.lv2Radial;
    ldDims.hvRadial  = lySide.hv_radial_depth_mm  || rd.hv  || ldDims.hvRadial;

    // Winding heights: use window height as the authoritative value from backend
    ldDims.lv1Height = s.windowHeight || ldDims.lv1Height;
    ldDims.lv2Height = s.windowHeight || ldDims.lv2Height;
    ldDims.hvHeight  = s.windowHeight || ldDims.hvHeight;

    // Duct gaps: derived from the difference between consecutive winding OD inner dims
    ldDims.duct1 = rd.duct1 || 5;
    ldDims.duct2 = rd.duct2 || 10;

    ldDims.coreFootInsulation = lySide.core_foot_with_insulation_mm || 10;
    ldDims.numLimbs = lyTop.num_phases || 3;

    updateLayoutUI(ldDims);
    drawAllDiagrams(ldDims);
}

function updateLayoutUI(dims) {
    let d = dims || ldDims;
    setText("ldCoreDia",  d.coreDia    + " mm");
    setText("ldLV1rad",   d.lv1Radial  + " mm");
    setText("ldDuct1",    d.duct1      + " mm");
    setText("ldLV2rad",   d.lv2Radial  + " mm");
    setText("ldDuct2",    d.duct2      + " mm");
    setText("ldHVrad",    d.hvRadial   + " mm");
    setText("ldLV1ax",    d.lv1Height  + " mm");
    setText("ldLV2ax",    d.lv2Height  + " mm");
    setText("ldHVax",     d.hvHeight   + " mm");
    setText("ldYokeax",   d.yokeHeight + " mm");
    setText("ldAxLV1",    d.lv1Height  + " mm");
    setText("ldAxLV2",    d.lv2Height  + " mm");
    setText("ldAxHV",     d.hvHeight   + " mm");
    setText("ldAxYoke",   d.yokeHeight + " mm");
}

/* ---- DRAW ALL THREE DIAGRAMS ---- */
function drawAllDiagrams(dims) {
    let d = dims || ldDims;
    drawFrontView(d);
    drawSideElevation(d);
    drawPlanView(d);
}

/* ==================================================
   DIAGRAM 1 — TOP-DOWN PLAN VIEW (engineering drawing style)
   Matches reference: outer frame with two window openings,
   centre pillar, dimension labels D (yoke), A (width), L (window height)
   ================================================== */
function drawFrontView(d) {
    d = d || ldDims;
    let canvas = document.getElementById("canvasFront");
    if (!canvas) return;
    let ctx = canvas.getContext("2d");
    let W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);


    /* ── Computed dimensions (all in mm) ──────────────────────────── */
    // D = yoke depth (top/bottom frame thickness)
    let D_mm = d.yokeHeight || 95;
    // A = overall width (limb spacing between outer limbs + core diameter each side)
    let A_mm = d.limbSpacing + d.coreDia;
    // L = window height (opening height inside the frame)
    let L_mm = d.windowHeight || 210;
    // Window width (opening inside frame = limb spacing - coreDia)
    let W_mm = Math.max(30, d.limbSpacing - d.coreDia);
    // Centre pillar width = coreDia
    let P_mm = d.coreDia;
    // Total height of the frame = D + L + D
    let TH_mm = D_mm + L_mm + D_mm;

    /* ── Scale to fit canvas with comfortable margins ─────────────── */
    let marginLeft = 80, marginRight = 60, marginTop = 52, marginBottom = 52;
    let drawW = W - marginLeft - marginRight;
    let drawH = H - marginTop - marginBottom;

    let scaleX = drawW / A_mm;
    let scaleY = drawH / TH_mm;
    let sc = Math.min(scaleX, scaleY);

    // Rendered sizes (pixels)
    let rA  = A_mm  * sc;   // total outer width
    let rTH = TH_mm * sc;   // total outer height
    let rD  = D_mm  * sc;   // yoke band thickness
    let rL  = L_mm  * sc;   // window opening height
    let rW  = W_mm  * sc;   // window opening width (each)
    let rP  = P_mm  * sc;   // centre pillar width

    // Origin: top-left of the outer frame, centred in available area
    let ox = marginLeft + (drawW - rA) / 2;
    let oy = marginTop  + (drawH - rTH) / 2;

    /* ── Background ───────────────────────────────────────────────── */
    // Subtle gradient to echo the dark-mode aesthetic of the app
    let bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0,   "#1c1c28");
    bgGrad.addColorStop(1,   "#14141e");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    /* ── Helper: draw filled+stroked rect with an optional gradient ── */
    function solidRect(x, y, w, h, fillCol, strokeCol, lw) {
        ctx.fillStyle   = fillCol;
        ctx.strokeStyle = strokeCol || "#8899bb";
        ctx.lineWidth   = lw || 1.5;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
    }

    /* ── Core frame parts ─────────────────────────────────────────── */
    // We draw the frame as a thick outer border with two window cut-outs.
    // Actual geometry (all pixel coords):
    //
    //  ox,oy ┌──────────────────────────────┐ ox+rA, oy
    //        │         TOP YOKE (rD)         │
    //        ├────┬──────────┬──────────┬───┤ oy+rD
    //        │ LT │ WINDOW 1 │ PILLAR   │RT │       (LT=left wall, RT=right wall)
    //        │    │          │  (rP)    │   │
    //        ├────┴──────────┴──────────┴───┤ oy+rD+rL
    //        │        BOTTOM YOKE (rD)       │
    //        └──────────────────────────────┘ oy+rTH

    // Yoke gradient — warm steel
    function yokeGrad(x, y, w, h) {
        let g = ctx.createLinearGradient(x, y, x, y + h);
        g.addColorStop(0,   "#5e6278");
        g.addColorStop(0.4, "#6e7390");
        g.addColorStop(1,   "#4a4e62");
        return g;
    }

    // Side-wall / pillar gradient — slightly darker
    function pillarGrad(x, y, w, h) {
        let g = ctx.createLinearGradient(x, y, x + w, y);
        g.addColorStop(0,   "#4e5268");
        g.addColorStop(0.5, "#606480");
        g.addColorStop(1,   "#4e5268");
        return g;
    }

    // Window opening — inner void, very dark with a subtle inner glow
    function windowFill(x, y, w, h) {
        let g = ctx.createRadialGradient(x + w/2, y + h/2, 2, x + w/2, y + h/2, Math.max(w, h) * 0.6);
        g.addColorStop(0,   "#2a2d3e");
        g.addColorStop(1,   "#1a1c28");
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, h);
    }

    // ── Compute left-wall width and right-wall width ───────────────
    // Total inner span = rA - left_wall - right_wall = window1 + pillar + window2
    // By symmetry: left_wall = right_wall = (rA - rW*2 - rP) / 2
    let sideW = (rA - rW * 2 - rP) / 2;

    let winY  = oy + rD;          // top of window openings
    let winH  = rL;               // height of window openings

    // ── Top yoke ──
    ctx.fillStyle   = yokeGrad(ox, oy, rA, rD);
    ctx.fillRect(ox, oy, rA, rD);

    // ── Bottom yoke ──
    let byY = oy + rD + rL;
    ctx.fillStyle = yokeGrad(ox, byY, rA, rD);
    ctx.fillRect(ox, byY, rA, rD);

    // ── Left side wall ──
    ctx.fillStyle = pillarGrad(ox, winY, sideW, winH);
    ctx.fillRect(ox, winY, sideW, winH);

    // ── Right side wall ──
    ctx.fillStyle = pillarGrad(ox + sideW + rW * 2 + rP, winY, sideW, winH);
    ctx.fillRect(ox + sideW + rW * 2 + rP, winY, sideW, winH);

    // ── Centre pillar ──
    ctx.fillStyle = pillarGrad(ox + sideW + rW, winY, rP, winH);
    ctx.fillRect(ox + sideW + rW, winY, rP, winH);

    // ── Window openings (cut-outs) ──
    windowFill(ox + sideW, winY, rW, winH);
    windowFill(ox + sideW + rW + rP, winY, rW, winH);

    // ── Stroke the full outer frame ──
    ctx.strokeStyle = "#8899cc";
    ctx.lineWidth   = 2;
    ctx.strokeRect(ox, oy, rA, rTH);

    // ── Inner horizontal lines (top & bottom of window zone) ──
    ctx.strokeStyle = "#7788aa";
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(ox, oy + rD); ctx.lineTo(ox + rA, oy + rD);
    ctx.moveTo(ox, byY);     ctx.lineTo(ox + rA, byY);
    ctx.stroke();

    // ── Centre pillar vertical edges ──
    ctx.strokeStyle = "#7788aa";
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(ox + sideW + rW, winY);         ctx.lineTo(ox + sideW + rW, winY + winH);
    ctx.moveTo(ox + sideW + rW + rP, winY);    ctx.lineTo(ox + sideW + rW + rP, winY + winH);
    ctx.stroke();

    // ── Side-wall edges ──
    ctx.strokeStyle = "#667799";
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(ox + sideW, winY);              ctx.lineTo(ox + sideW, winY + winH);
    ctx.moveTo(ox + sideW + rW * 2 + rP, winY); ctx.lineTo(ox + sideW + rW * 2 + rP, winY + winH);
    ctx.stroke();

    // ── Diagonal cross-hatch on yokes (engineering convention) ──
    function hatchRect(x, y, w, h, step, ang) {
        ctx.save();
        ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
        ctx.strokeStyle = "rgba(150,165,200,0.12)";
        ctx.lineWidth   = 0.8;
        let diag = Math.sqrt(w * w + h * h);
        for (let t = -diag; t < diag * 2; t += step) {
            ctx.beginPath();
            if (ang === 45) {
                ctx.moveTo(x + t, y);
                ctx.lineTo(x + t + h, y + h);
            } else {
                ctx.moveTo(x + t + h, y);
                ctx.lineTo(x + t, y + h);
            }
            ctx.stroke();
        }
        ctx.restore();
    }
    hatchRect(ox, oy, rA, rD, 12, 45);
    hatchRect(ox, byY, rA, rD, 12, 45);
    hatchRect(ox, winY, sideW, winH, 12, 45);
    hatchRect(ox + sideW + rW * 2 + rP, winY, sideW, winH, 12, 45);
    hatchRect(ox + sideW + rW, winY, rP, winH, 12, -45);

    /* ── 3-D perspective lines (subtle edge suggestion) ─────────── */
    let depthX = 18, depthY = -16;
    function perspEdge(x1, y1, x2, y2) {
        ctx.save();
        ctx.strokeStyle = "rgba(160,175,210,0.22)";
        ctx.lineWidth   = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + depthX, y1 + depthY);
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 + depthX, y2 + depthY);
        ctx.stroke();
        ctx.restore();
    }
    // Top-edge corners
    perspEdge(ox,        oy,  ox + rA, oy);
    // Top of pillar top face
    perspEdge(ox + sideW + rW, winY, ox + sideW + rW + rP, winY);

    // Connect top perspective points with a line
    ctx.save();
    ctx.strokeStyle = "rgba(160,175,210,0.22)";
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(ox + depthX,      oy + depthY);
    ctx.lineTo(ox + rA + depthX, oy + depthY);
    ctx.stroke();
    ctx.restore();

    /* ── DIMENSION ANNOTATIONS ────────────────────────────────────── */
    let ANNOT  = "#c8d4ee";
    let ANNOT2 = "#8a9bc0";

    function dimLine(x1, y1, x2, y2) {
        ctx.strokeStyle = ANNOT2;
        ctx.lineWidth   = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.stroke();
        // Arrowheads
        let ang = Math.atan2(y2 - y1, x2 - x1);
        let as  = 7;
        [{ x: x1, y: y1, a: ang + Math.PI }, { x: x2, y: y2, a: ang }].forEach(function(p) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - as * Math.cos(p.a - 0.4), p.y - as * Math.sin(p.a - 0.4));
            ctx.lineTo(p.x - as * Math.cos(p.a + 0.4), p.y - as * Math.sin(p.a + 0.4));
            ctx.closePath();
            ctx.fillStyle = ANNOT2;
            ctx.fill();
        });
    }

    function extLine(x1, y1, x2, y2) {
        // Extension line (thin, dashed)
        ctx.save();
        ctx.strokeStyle = "rgba(140,160,200,0.45)";
        ctx.lineWidth   = 0.8;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
    }

    function labelText(txt, x, y, align, baseline, size, bold) {
        ctx.fillStyle    = ANNOT;
        ctx.font         = (bold ? "bold " : "") + (size || 11) + "px 'Arial', sans-serif";
        ctx.textAlign    = align    || "center";
        ctx.textBaseline = baseline || "middle";
        ctx.setLineDash([]);
        ctx.fillText(txt, x, y);
    }

    function dimBox(txt, x, y) {
        // Small white-on-dark box for the dimension value
        ctx.font = "bold 12px Arial";
        let tw = ctx.measureText(txt).width + 10;
        let bh = 18;
        ctx.fillStyle   = "rgba(20,22,36,0.82)";
        ctx.strokeStyle = "rgba(140,160,210,0.45)";
        ctx.lineWidth   = 0.8;
        ctx.setLineDash([]);
        roundRect(ctx, x - tw / 2, y - bh / 2, tw, bh, 3);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle    = "#dde6ff";
        ctx.font         = "bold 12px Arial";
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(txt, x, y);
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    /* ── D = yoke thickness (top, annotated top-right with leader) ── */
    // Leader from top-right corner diagonally
    let dLeadX1 = ox + rA - sideW / 2;
    let dLeadY1 = oy + rD / 2;
    let dLeadX2 = ox + rA + 38;
    let dLeadY2 = oy - 22;
    extLine(dLeadX1, dLeadY1, dLeadX2, dLeadY2);
    ctx.save();
    ctx.strokeStyle = ANNOT2; ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(dLeadX2, dLeadY2); ctx.lineTo(dLeadX2 + 30, dLeadY2);
    ctx.stroke();
    ctx.restore();
    labelText("D = " + D_mm + " mm", dLeadX2 + 15, dLeadY2 - 7, "center", "bottom", 11, true);

    /* ── A = total width — annotated below the bottom yoke ───────── */
    let aY = oy + rTH + 28;
    extLine(ox,        oy + rTH, ox,        aY + 6);
    extLine(ox + rA,   oy + rTH, ox + rA,   aY + 6);
    dimLine(ox, aY, ox + rA, aY);
    dimBox("A = " + A_mm + " mm", ox + rA / 2, aY);

    /* ── L = window height — annotated to the left ───────────────── */
    let lX = ox - 30;
    extLine(ox, winY,       lX - 6, winY);
    extLine(ox, winY + winH, lX - 6, winY + winH);
    dimLine(lX, winY, lX, winY + winH);
    dimBox("L = " + L_mm + " mm", lX - 2, winY + winH / 2);

    /* ── Window width label (inside the left window) ─────────────── */
    if (rW > 40) {
        labelText(W_mm + " mm", ox + sideW + rW / 2, winY + winH / 2, "center", "middle", 10, false);
    }

    /* ── Centre pillar label ──────────────────────────────────────── */
    if (rP > 22) {
        ctx.save();
        ctx.fillStyle    = "rgba(200,214,240,0.75)";
        ctx.font         = "10px Arial";
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";
        ctx.translate(ox + sideW + rW + rP / 2, winY + winH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText("Core Ø " + d.coreDia + " mm", 0, 0);
        ctx.restore();
    }

    /* ── Overall height label (right side) ───────────────────────── */
    let hX = ox + rA + 54;
    extLine(ox + rA, oy,        hX + 6, oy);
    extLine(ox + rA, oy + rTH, hX + 6, oy + rTH);
    dimLine(hX, oy, hX, oy + rTH);
    labelText((D_mm * 2 + L_mm) + " mm", hX + 8, oy + rTH / 2, "left", "middle", 10, false);

    /* ── Title label inside the drawing ─────────────────────────── */
    ctx.fillStyle    = "rgba(180,195,230,0.45)";
    ctx.font         = "10px Arial";
    ctx.textAlign    = "center";
    ctx.textBaseline = "top";
    ctx.fillText("CORE PLAN VIEW", ox + rA / 2, oy + 4);
}

/* ==================================================
   DIAGRAM 2 — SIDE ELEVATION (core stack with yoke labels)
   ================================================== */
function drawSideElevation(d) {
    d = d || ldDims;
    let canvas = document.getElementById("canvasSide");
    if (!canvas) return;
    let ctx = canvas.getContext("2d");
    let W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, W, H);

    let totalH_mm = d.yokeHeight + d.windowHeight + d.yokeHeight + d.coreFootInsulation;
    let scale = (H * 0.72) / totalH_mm;
    let coreW = d.coreDia * scale * 0.9;

    let ox = W * 0.2;
    let oy = H * 0.1;

    let topYokeH  = d.yokeHeight * scale;
    let winH      = d.windowHeight * scale;
    let botYokeH  = d.yokeHeight * scale;
    let footH     = d.coreFootInsulation * scale;

    // OCTC circle at top
    let circR = 10;
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ox + coreW / 2, oy - circR - 4, circR, 0, Math.PI * 2);
    ctx.stroke();

    // Top yoke
    ctx.fillStyle = "#5a5a6a";
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 1;
    ctx.fillRect(ox, oy, coreW, topYokeH);
    ctx.strokeRect(ox, oy, coreW, topYokeH);

    // Window (core limb visible as a narrower rect)
    let limbW = coreW * 0.7;
    let limbX = ox + (coreW - limbW) / 2;
    ctx.fillStyle = "#3a3a4a";
    ctx.fillRect(limbX, oy + topYokeH, limbW, winH);
    ctx.strokeRect(limbX, oy + topYokeH, limbW, winH);

    // Bottom yoke
    let byY = oy + topYokeH + winH;
    ctx.fillStyle = "#5a5a6a";
    ctx.fillRect(ox, byY, coreW, botYokeH);
    ctx.strokeRect(ox, byY, coreW, botYokeH);

    // Core foot
    let footY = byY + botYokeH;
    ctx.fillStyle = "#4a4a5a";
    ctx.fillRect(ox - 8, footY, coreW + 16, footH);
    ctx.strokeRect(ox - 8, footY, coreW + 16, footH);

    // Dimension labels on the right
    let lx = ox + coreW + 16;
    let arX = lx + 60;

    annotateRight(ctx, lx, oy - circR * 2 - 4, oy, "OCTC to cover = 100 mm");
    annotateRight(ctx, lx, oy, oy + topYokeH, "Top yoke = " + d.yokeHeight + " mm");
    annotateRight(ctx, lx, oy + topYokeH, oy + topYokeH + winH, "Window height = " + d.windowHeight + " mm");
    annotateRight(ctx, lx, byY, byY + botYokeH, "Bottom yoke = " + d.yokeHeight + " mm");
    annotateRight(ctx, lx, footY, footY + footH, "Core foot with insulation = " + d.coreFootInsulation + " mm");
}

function annotateRight(ctx, lx, y1, y2, text) {
    let mx = (y1 + y2) / 2;
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1;
    // Horizontal tick from edge to label line
    ctx.beginPath(); ctx.moveTo(lx, y1); ctx.lineTo(lx + 8, y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx, y2); ctx.lineTo(lx + 8, y2); ctx.stroke();
    // Vertical bar
    ctx.beginPath(); ctx.moveTo(lx + 8, y1); ctx.lineTo(lx + 8, y2); ctx.stroke();
    // Arrow tip to text
    ctx.beginPath(); ctx.moveTo(lx + 8, mx); ctx.lineTo(lx + 18, mx); ctx.stroke();
    ctx.fillStyle = "#bbb";
    ctx.font = "10px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, lx + 22, mx);
}

/* ==================================================
   DIAGRAM 3 — PLAN VIEW (top-down 3-limb footprint)
   ================================================== */
function drawPlanView(d) {
    d = d || ldDims;
    let canvas = document.getElementById("canvasTop");
    if (!canvas) return;
    let ctx = canvas.getContext("2d");
    let W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, W, H);


    // Plan: total width = 2 * limbSpacing + coreDia + 2*margin
    let margin = 50; // mm each side
    let totalW_mm = d.limbSpacing * 2 + d.coreDia + margin * 2;
    // Total depth = coreDia + 2*hvRadial*2 + margin*2 (winding depth front+back) + margins
    let windingDepth = d.hvRadial * 2 + d.duct2 * 2 + d.lv2Radial * 2 + d.duct1 * 2 + d.lv1Radial * 2 + d.coreDia;
    let totalD_mm = windingDepth + margin * 2 + 20;

    let scale = Math.min((W * 0.82) / totalW_mm, (H * 0.72) / totalD_mm);

    let ox = (W - totalW_mm * scale) / 2;
    let oy = (H - totalD_mm * scale) / 2;

    let marginS  = margin * scale;
    let limbSpS  = d.limbSpacing * scale;
    let coreDiaS = d.coreDia * scale;
    let windDpS  = windingDepth * scale;

    // Outer frame
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ox, oy, totalW_mm * scale, totalD_mm * scale);

    // 3 limb squares + windings
    let limbs = [
        ox + marginS,
        ox + marginS + limbSpS,
        ox + marginS + limbSpS * 2
    ];

    let depthOffset = (totalD_mm * scale - windDpS) / 2;

    for (let i = 0; i < 3; i++) {
        let lx = limbs[i];
        let topY = oy + depthOffset;

        // HV winding (outermost — blue)
        let hvD = d.hvRadial * scale;
        ctx.fillStyle = "rgba(40,96,176,0.4)";
        ctx.strokeStyle = "#2860b0";
        ctx.lineWidth = 1;
        ctx.fillRect(lx - hvD - d.duct2 * scale - d.lv2Radial * scale - d.duct1 * scale - d.lv1Radial * scale,
                     topY, coreDiaS + (hvD + d.duct2 * scale + d.lv2Radial * scale + d.duct1 * scale + d.lv1Radial * scale) * 2,
                     windDpS);
        ctx.strokeRect(lx - hvD - d.duct2 * scale - d.lv2Radial * scale - d.duct1 * scale - d.lv1Radial * scale,
                       topY, coreDiaS + (hvD + d.duct2 * scale + d.lv2Radial * scale + d.duct1 * scale + d.lv1Radial * scale) * 2,
                       windDpS);

        // LV2 winding
        let lv2S = d.lv2Radial * scale;
        let lv2innerW = coreDiaS + (d.duct1 * scale + d.lv1Radial * scale) * 2;
        let lv2innerH = windDpS - hvD * 2 - d.duct2 * scale * 2;
        ctx.fillStyle = "rgba(180,140,40,0.4)";
        ctx.strokeStyle = "#c09030";
        let lv2topY = topY + hvD + d.duct2 * scale;
        ctx.fillRect(lx - d.duct1 * scale - d.lv1Radial * scale - lv2S, lv2topY,
                     lv2innerW + lv2S * 2, lv2innerH);
        ctx.strokeRect(lx - d.duct1 * scale - d.lv1Radial * scale - lv2S, lv2topY,
                       lv2innerW + lv2S * 2, lv2innerH);

        // LV1 winding
        let lv1S = d.lv1Radial * scale;
        let lv1topY = lv2topY + lv2S + d.duct1 * scale;
        ctx.fillStyle = "rgba(200,146,42,0.5)";
        ctx.strokeStyle = "#f0b840";
        ctx.fillRect(lx - lv1S, lv1topY, coreDiaS + lv1S * 2, windDpS - (hvD + d.duct2 * scale + lv2S + d.duct1 * scale) * 2);
        ctx.strokeRect(lx - lv1S, lv1topY, coreDiaS + lv1S * 2, windDpS - (hvD + d.duct2 * scale + lv2S + d.duct1 * scale) * 2);

        // Core square
        ctx.fillStyle = "#5a5a6a";
        ctx.strokeStyle = "#999";
        ctx.fillRect(lx, lv1topY + lv1S, coreDiaS, windDpS - (hvD + d.duct2 * scale + lv2S + d.duct1 * scale + lv1S) * 2);
        ctx.strokeRect(lx, lv1topY + lv1S, coreDiaS, windDpS - (hvD + d.duct2 * scale + lv2S + d.duct1 * scale + lv1S) * 2);
    }

    // Limb spacing dimension at top
    let dimY = oy + depthOffset - 18;
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 1;
    // Gap markers between limb centres
    for (let j = 0; j < 2; j++) {
        let lc1 = limbs[j] + coreDiaS / 2;
        let lc2 = limbs[j + 1] + coreDiaS / 2;
        drawArrow(ctx, lc1, dimY, lc2, dimY, "#888");
        dimLabel(ctx, (lc1 + lc2) / 2, dimY - 8, d.limbSpacing + " mm", "#aaa", true);
    }

    // Left / right margin
    dimLabel(ctx, ox + marginS / 2, oy + totalD_mm * scale / 2, d.coreDia + " mm\n(margin)", "#888", true);

    // Depth dimension on right
    let rightX = ox + totalW_mm * scale + 18;
    drawArrow(ctx, rightX, oy + depthOffset, rightX, oy + depthOffset + windDpS, "#888");
    dimLabel(ctx, rightX + 4, oy + depthOffset + windDpS / 2, windingDepth + " mm", "#aaa", false, true);

    // Bottom frame width
    let botY = oy + totalD_mm * scale + 16;
    drawArrow(ctx, ox, botY, ox + totalW_mm * scale, botY, "#888");
    dimLabel(ctx, ox + totalW_mm * scale / 2, botY + 10, totalW_mm + " mm", "#aaa", true);

    // Duct gap labels in centre column
    ctx.fillStyle = "#999";
    ctx.font = "9px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let mid1x = limbs[0] + coreDiaS + (limbs[1] - limbs[0] - coreDiaS) / 2;
    let mid2x = limbs[1] + coreDiaS + (limbs[2] - limbs[1] - coreDiaS) / 2;
    let midY  = oy + totalD_mm * scale / 2;
    ctx.fillText(d.duct1 + " mm", mid1x, midY);
    ctx.fillText(d.duct1 + " mm", mid2x, midY);

    // Side margins label
    let sideMarginLabel = margin + " mm";
    ctx.fillText(sideMarginLabel, ox + marginS / 2, midY);
    ctx.fillText(sideMarginLabel, ox + totalW_mm * scale - marginS / 2, midY);

    // Bottom winding height label
    ctx.fillText(d.lv1Height + " mm", ox + totalW_mm * scale / 2, oy + totalD_mm * scale - 10);
}

/* ---- Helpers ---- */
function drawArrow(ctx, x1, y1, x2, y2, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.stroke();
    let angle = Math.atan2(y2 - y1, x2 - x1);
    let as = 6;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + as * Math.cos(angle + 2.8), y1 + as * Math.sin(angle + 2.8));
    ctx.lineTo(x1 + as * Math.cos(angle - 2.8), y1 + as * Math.sin(angle - 2.8));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - as * Math.cos(angle - 2.8), y2 - as * Math.sin(angle - 2.8));
    ctx.lineTo(x2 - as * Math.cos(angle + 2.8), y2 - as * Math.sin(angle + 2.8));
    ctx.closePath();
    ctx.fill();
}

function dimLabel(ctx, x, y, text, color, centered, rightAligned, leftAligned) {
    ctx.fillStyle = color || "#aaa";
    ctx.font = "10px Arial";
    if (centered)          ctx.textAlign = "center";
    else if (rightAligned) ctx.textAlign = "right";
    else if (leftAligned)  ctx.textAlign = "left";   // was incorrectly "right"
    else                   ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
}

/* Draw on page load — canvases are in the static HTML so they exist on DOMContentLoaded */
document.addEventListener("DOMContentLoaded", function() {
    drawAllDiagrams();
    updateLayoutUI();
});

/* Redraw when Layout Design tab becomes visible — draw directly after showPage()
   has already removed 'hidden', no setTimeout needed */
navItems.forEach(function(item) {
    if (item.getAttribute("data-page") === "layout-design") {
        item.addEventListener("click", function() {
            drawAllDiagrams(ldDims);
        });
    }
});

/* ---- EXPORT BUTTONS ---- */
const ldExportPdf = document.getElementById("ldExportPdf");
if (ldExportPdf) {
    ldExportPdf.addEventListener("click", function() {
        printPage([".ld-export-bar"]);
    });
}

const ldExportSvg = document.getElementById("ldExportSvg");
if (ldExportSvg) {
    ldExportSvg.addEventListener("click", function() {
        // Combine all 3 canvases into one SVG via data URLs
        let canvases = ["canvasFront","canvasSide","canvasTop"];
        let svgParts = ['<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="580">'];
        let yOff = 0;
        canvases.forEach(function(id) {
            let c = document.getElementById(id);
            if (!c) return;
            let dataUrl = c.toDataURL("image/png");
            svgParts.push('<image x="10" y="' + yOff + '" width="' + c.width + '" height="' + c.height + '" xlink:href="' + dataUrl + '"/>');
            yOff += c.height + 10;
        });
        svgParts.push('</svg>');
        let blob = new Blob([svgParts.join("")], { type: "image/svg+xml" });
        let url = URL.createObjectURL(blob);
        let a = document.createElement("a");
        a.href = url;
        a.download = "layout_design.svg";
        a.click();
        URL.revokeObjectURL(url);
    });
}

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
/* =============================================
   CORE MATERIAL — live info note updater
   Updates the hint text whenever dropdowns change
   ============================================= */
(function() {
    let matSel   = document.getElementById("coreMaterialType");
    let gradeSel = document.getElementById("coreGrade");
    let noteEl   = document.getElementById("coreMaterialNoteText");

    // Grade metadata lookup
    let gradeInfo = {
        "M4"    : { label: "M-4",    thick: "0.27 mm", stdLoss: "0.83 W/kg @ 1.5T" },
        "M3"    : { label: "M-3",    thick: "0.23 mm", stdLoss: "0.67 W/kg @ 1.5T" },
        "23ZDMH": { label: "23ZDMH", thick: "0.23 mm", stdLoss: "0.56 W/kg @ 1.5T" }
    };

    function updateNote() {
        if (!matSel || !gradeSel || !noteEl) return;
        let mat   = matSel.value;
        let grade = gradeSel.value;
        let isCrno = (mat === "CRNO");   // CRNO = low-loss; was legacy "Amorphous"
        let dens   = isCrno ? "7.20 g/cc" : "7.65 g/cc";
        let sf     = isCrno ? "0.84" : "0.96";
        let gi     = gradeInfo[isCrno ? "23ZDMH" : grade] || gradeInfo["M4"];
        noteEl.textContent =
            (isCrno ? "CRNO" : "CRGO") + " " + gi.label +
            " · Density: " + dens +
            " · Thickness: " + gi.thick +
            " · Stack Factor: " + sf +
            " · Ref. Loss: " + gi.stdLoss;

        // Restrict grade options for CRNO (only 23ZDMH applies)
        if (gradeSel) {
            for (let i = 0; i < gradeSel.options.length; i++) {
                gradeSel.options[i].disabled = isCrno && gradeSel.options[i].value !== "23ZDMH";
            }
            if (isCrno) gradeSel.value = "23ZDMH";
        }
    }

    if (matSel)   matSel.addEventListener("change", updateNote);
    if (gradeSel) gradeSel.addEventListener("change", updateNote);
    updateNote(); // run once on load
})();