/* =============================================
   RENDERER.JS — Dry Type Transformer Design Software
   ============================================= */

/* =============================================
   PAGE NAVIGATION
   ============================================= */
var navItems = document.querySelectorAll(".nav-item");
var pages    = document.querySelectorAll(".page");

function showPage(pageId) {
    pages.forEach(function(page) {
        page.classList.add("hidden");
    });

    var target = document.getElementById("page-" + pageId);
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
   TECHNICAL REPORT — TOP-LEVEL TABS
   ============================================= */
var trTabs        = document.querySelectorAll(".tr-tab");
var trTabContents = document.querySelectorAll(".tr-tab-content");

trTabs.forEach(function(tab) {
    tab.addEventListener("click", function() {
        var target = tab.getAttribute("data-tr-tab");

        trTabs.forEach(function(t) { t.classList.remove("active"); });
        trTabContents.forEach(function(c) { c.classList.add("hidden"); });

        tab.classList.add("active");

        var content = document.getElementById("tr-" + target);
        if (content) {
            content.classList.remove("hidden");
        }
    });
});

/* =============================================
   TECHNICAL REPORT — WINDING SUB-TABS
   ============================================= */
var windingSubTabs     = document.querySelectorAll(".winding-sub-tab");
var windingSubContents = document.querySelectorAll(".winding-sub-content");

windingSubTabs.forEach(function(tab) {
    tab.addEventListener("click", function() {
        var target = tab.getAttribute("data-winding-tab");

        windingSubTabs.forEach(function(t) { t.classList.remove("active"); });
        windingSubContents.forEach(function(c) { c.classList.add("hidden"); });

        tab.classList.add("active");

        var content = document.getElementById("winding-" + target);
        if (content) {
            content.classList.remove("hidden");
        }
    });
});

/* =============================================
   INPUT PAGE — RUN CALCULATION
   ============================================= */
var transformerForm = document.getElementById("transformerForm");

function runCalculation() {
    var inputData = {
        ratedPower    : parseFloat(document.getElementById("ratedPower").value)    || 0,
        phases        : parseInt(document.getElementById("phases").value)           || 0,
        fluxDensity   : parseFloat(document.getElementById("fluxDensity").value)   || 0,
        frequency     : parseFloat(document.getElementById("frequency").value)     || 0,
        lv1Voltage    : parseFloat(document.getElementById("lv1Voltage").value)    || 0,
        lv2Voltage    : parseFloat(document.getElementById("lv2Voltage").value)    || 0,
        hvVoltage     : parseFloat(document.getElementById("hvVoltage").value)     || 0,
        lv1kva        : parseFloat(document.getElementById("lv1kva").value)        || 0,
        lv2kva        : parseFloat(document.getElementById("lv2kva").value)        || 0,
        hvkva         : parseFloat(document.getElementById("hvkva").value)         || 0,
        lv1cd         : parseFloat(document.getElementById("lv1cd").value)         || 0,
        lv2cd         : parseFloat(document.getElementById("lv2cd").value)         || 0,
        hvcd          : parseFloat(document.getElementById("hvcd").value)          || 0,
        lv1mat        : document.getElementById("lv1mat").value,
        lv2mat        : document.getElementById("lv2mat").value,
        hvmat         : document.getElementById("hvmat").value,
        lv1conn       : document.getElementById("lv1conn").value,
        lv2conn       : document.getElementById("lv2conn").value,
        hvconn        : document.getElementById("hvconn").value,
        vectorGroup   : document.getElementById("vectorGroup").value,
        insulationClass: document.getElementById("insulationClass").value
    };

    // Normalize short codes to full names used by engine & validation
    function normMat(v)  { return (v === "AL") ? "Aluminium" : "Copper"; }
    function normConn(v) { return (v === "Y")  ? "Star"      : "Delta";  }
    inputData.lv1mat  = normMat(inputData.lv1mat);
    inputData.lv2mat  = normMat(inputData.lv2mat);
    inputData.hvmat   = normMat(inputData.hvmat);
    inputData.lv1conn = normConn(inputData.lv1conn);
    inputData.lv2conn = normConn(inputData.lv2conn);
    inputData.hvconn  = normConn(inputData.hvconn);

    var result;

    if (window.api && typeof window.api.runCalculation === "function") {
        result = window.api.runCalculation(inputData);
    } else {
        result = fallbackCalculation(inputData);
    }

    populateOutput(result);

    var outputSection = document.getElementById("outputSection");
    if (outputSection) {
        outputSection.classList.remove("hidden");
        outputSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // Update Layout Design diagrams with real values
    updateLayoutDimensions(result);

    // Update BOM rating label
    updateBomRating(inputData.ratedPower);

    // Update layout rating label
    var ldLabel = document.getElementById("ldRatingLabel");
    if (ldLabel && inputData.ratedPower) ldLabel.textContent = inputData.ratedPower + " kVA Transformer";
}

/* =============================================
   POPULATE CALCULATED OUTPUTS
   ============================================= */
function populateOutput(data) {
    var w  = data.windingSummary;
    var cd = data.coreDesign;
    var pf = data.performance;
    var s  = data.steps;

    /* ---- Winding Summary table ---- */
    var tbody = document.getElementById("windingOutputBody");
    if (tbody) {
        tbody.innerHTML =
            buildOutputRow("Turns / Phase",          w.LV1.turns,           w.LV2.turns,           w.HV.turns) +
            buildOutputRow("Turns / Layer",          s.lv1TpL,              s.lv2TpL,              s.hvTpL) +
            buildOutputRow("No. of Layers",          s.lv1Layers,           s.lv2Layers,           s.hvLayers) +
            buildOutputRow("Current / Phase (A)",    r2(s.lv1CurPhase),     r2(s.lv2CurPhase),     r2(s.hvCurPhase)) +
            buildOutputRow("Conductor b (mm)",       r2(s.lv1_b),           r2(s.lv2_b),           r2(s.hv_b)) +
            buildOutputRow("Conductor h (mm)",       r2(s.lv1_h),           r2(s.lv2_h),           r2(s.hv_h)) +
            buildOutputRow("Conductor Area (mm²)",   w.LV1.conductorArea,   w.LV2.conductorArea,   w.HV.conductorArea) +
            buildOutputRow("Current Density (A/mm²)",w.LV1.currentDensity,  w.LV2.currentDensity,  w.HV.currentDensity) +
            buildOutputRow("Radial Thickness (mm)",  r2(s.lv1_radThick),    r2(s.lv2_radThick),    r2(s.hv_radThick)) +
            buildOutputRow("LMT (m)",                r3(s.lmt_lv1),         r3(s.lmt_lv2),         r3(s.lmt_hv)) +
            buildOutputRow("Wire Length (m)",        r1(s.wireLen_lv1),     r1(s.wireLen_lv2),     r1(s.wireLen_hv)) +
            buildOutputRow("R @ 75°C (Ω)",           r4(s.R75_lv1),         r4(s.R75_lv2),         r4(s.R75_hv)) +
            buildOutputRow("Bare Weight (kg)",       r1(s.bareWt_lv1),      r1(s.bareWt_lv2),      r1(s.bareWt_hv)) +
            buildOutputRow("Load Loss (W)",          w.LV1.copperLoss,      w.LV2.copperLoss,      w.HV.copperLoss);
    }

    /* ---- Core Design ---- */
    var coreEl = document.getElementById("coreOutput");
    if (coreEl) {
        coreEl.innerHTML =
            kvRow("Volts / Turn",          r3(s.vt) + " V") +
            kvRow("Net Core Area",         r0(s.A_net) + " mm²  (" + r4(cd.netCoreArea) + " m²)") +
            kvRow("Gross Core Area",       r0(s.A_gross) + " mm²") +
            kvRow("Core Frame (Tongue × Stack)", s.tongue + " × " + s.stack + " mm") +
            kvRow("Core Diameter",         r1(cd.coreDiameter * 1000) + " mm") +
            kvRow("Window Height",         r0(s.windowHeight) + " mm") +
            kvRow("Yoke Height",           r0(s.yokeHeight) + " mm") +
            kvRow("Limb Spacing (c-c)",    s.limbSpacingA + " mm") +
            kvRow("Core Length",           r0(s.coreLen_mm) + " mm") +
            kvRow("Core Weight",           r1(s.coreWeight) + " kg") +
            kvRow("Enclosure L × W × H",  s.enc_L + " × " + s.enc_W + " × " + s.enc_H + " mm");
    }

    /* ---- Performance ---- */
    var perfEl = document.getElementById("performanceOutput");
    if (perfEl) {
        perfEl.innerHTML =
            kvRow("Core Loss",            pf.coreLoss      + " W") +
            kvRow("Total Load Loss",      pf.totalLoadLoss + " W") +
            kvRow("Total Loss",           pf.totalLoss     + " W") +
            kvRow("Impedance Voltage",    pf.impedance     + " %") +
            kvRow("Voltage Regulation",   pf.regulation    + " %");
    }

    /* Also update radial dims on layout page */
    if (data.radialDims) {
        var rd = data.radialDims;
        ldDims.coreDia    = rd.coreDia;
        ldDims.lv1Radial  = rd.lv1;
        ldDims.duct1      = rd.duct1;
        ldDims.lv2Radial  = rd.lv2;
        ldDims.duct2      = rd.duct2;
        ldDims.hvRadial   = rd.hv;
        ldDims.windowHeight = s.windowHeight;
        ldDims.yokeHeight   = s.yokeHeight;
        ldDims.lv1Height    = Math.round(s.windowHeight * 0.85);
        ldDims.lv2Height    = Math.round(s.windowHeight * 0.90);
        ldDims.hvHeight     = s.windowHeight;
        ldDims.limbSpacing  = s.limbSpacingA;
        ldDims.coreFootInsulation = 10;
    }
}

/* rounding helpers */
function r0(v){ return Math.round(v); }
function r1(v){ return parseFloat(v).toFixed(1); }
function r2(v){ return parseFloat(v).toFixed(2); }
function r3(v){ return parseFloat(v).toFixed(3); }
function r4(v){ return parseFloat(v).toFixed(4); }

function buildOutputRow(label, v1, v2, hv) {
    return "<tr>" +
        "<th>" + label + "</th>" +
        "<td>" + v1   + "</td>" +
        "<td>" + v2   + "</td>" +
        "<td>" + hv   + "</td>" +
        "</tr>";
}

function kvRow(label, value) {
    return '<div class="kv-row">' +
        '<span class="kv-label">' + label + '</span>' +
        '<span class="kv-value">' + value + '</span>' +
        '</div>';
}

/* =============================================
   REAL CALCULATION ENGINE
   Following Sara Consultants step-by-step method
   (Steps 1–66 from design PDF)
   ============================================= */
function fallbackCalculation(inp) {
    var sqrt3 = Math.sqrt(3);
    var PI    = Math.PI;

    // ─── MATERIAL CONSTANTS ──────────────────────────────────────────────
    var rho_Cu  = 0.02128; // resistivity of Cu @ 75°C  (Ω·mm²/m)
    var rho_Al  = 0.03533; // resistivity of Al @ 75°C
    var dens_Cu = 8.89e-3; // kg/mm³
    var dens_Al = 2.703e-3;
    var dens_Fe = 7.65e-3;
    var stackFactor = 0.96; // combined stacking/insulation factor on gross area

    // Load loss factor (Table #5)
    var llf = (inp.lv1mat === "Copper" || inp.lv1mat === "Cu") ? 2.4 : 12.79;

    // Stray loss factor (Table #4) — use copper strip as default
    var slf_lv = 0.9622;
    var slf_hv = 0.9622;

    // ─── STEP 1 — Volts / Turn (initial estimate) ────────────────────────
    // k = 0.4–0.8 for copper; choose k based on kVA
    var k = (inp.ratedPower <= 25) ? 0.45 : (inp.ratedPower <= 100) ? 0.55 : 0.62;
    var vt_initial = k * Math.sqrt(inp.ratedPower);

    // ─── STEP 2 — LV1 turns/phase ────────────────────────────────────────
    // Phase voltage for LV1
    var lv1PhaseV = (inp.lv1conn === "Star") ? inp.lv1Voltage / sqrt3 : inp.lv1Voltage;
    var lv1Turns  = Math.round(lv1PhaseV / vt_initial);
    lv1Turns = Math.max(lv1Turns, 1);

    // ─── STEP 3 — Revised Volts/Turn ─────────────────────────────────────
    var vt = lv1PhaseV / lv1Turns;

    // ─── STEP 4 — Net Core Area ──────────────────────────────────────────
    // e = 4.44 × f × B × A × N  =>  A = V/T / (4.44 × f × B × 1e-6) [mm²]
    var A_net = vt / (4.44 * inp.frequency * inp.fluxDensity * 1e-6);

    // ─── STEP 5 — Gross Core Area ─────────────────────────────────────────
    var A_gross = A_net / stackFactor;

    // ─── STEP 6 — Core cross section (tongue × stack, ratio 1.5–3) ───────
    // Derive square-ish frame: tongue ≈ √A_gross  then stack = A_gross/tongue
    var tongue = Math.round(Math.sqrt(A_gross / 1.8));
    tongue = Math.ceil(tongue / 5) * 5; // round to nearest 5 mm
    var stack  = Math.round(A_gross / tongue);
    stack  = Math.ceil(stack / 5) * 5;
    // Recalculate actual gross area & net area
    A_gross = tongue * stack;
    A_net   = A_gross * stackFactor;
    vt      = lv1PhaseV / lv1Turns; // keep revised vt

    // Effective core diameter (circle equivalent)
    var coreDia = 2 * Math.sqrt(A_gross / PI); // mm

    // ─── LV2 WINDING (Steps 7–25) ─────────────────────────────────────────
    var lv2PhaseV  = (inp.lv2conn === "Star") ? inp.lv2Voltage / sqrt3 : inp.lv2Voltage;
    var lv2Turns   = Math.round(lv2PhaseV / vt);
    var lv2CurPhase = (inp.lv2kva * 1000) / (3 * lv2PhaseV);
    var lv2Layers  = (lv2Turns <= 30) ? 1 : 2;
    var lv2TpL     = Math.ceil(lv2Turns / lv2Layers);
    var lv2CsNet   = lv2CurPhase / inp.lv2cd;           // mm² net
    var lv2CsGross = lv2CsNet + 0.363;                   // corner radius correction
    // End clearance = 12mm per side assumed for LV2
    var wl2 = tongue - 2 * 12;
    var lv2_bi   = wl2 / ((lv2TpL + 1) * 1);
    var lv2_b    = lv2_bi - 0.1;
    var lv2_h    = lv2CsGross / lv2_b;
    var lv2_hi   = lv2_h + 0.1;
    var lv2_csActual = lv2_b * lv2_h;
    var lv2_cd   = lv2CurPhase / lv2_csActual;
    var lv2_radThick = lv2_hi * 1 * lv2Layers + (lv2Layers - 1) * 5 + 0.3 * lv2Layers;

    // ─── LV1 WINDING (Steps 7–25, same structure) ─────────────────────────
    var lv1CurPhase = (inp.lv1kva * 1000) / (3 * lv1PhaseV);
    var lv1Layers  = (lv1Turns <= 30) ? 1 : 2;
    var lv1TpL     = Math.ceil(lv1Turns / lv1Layers);
    var lv1CsNet   = lv1CurPhase / inp.lv1cd;
    var lv1CsGross = lv1CsNet + 0.363;
    var wl1 = tongue - 2 * 12;
    var lv1_bi   = wl1 / ((lv1TpL + 1) * 1);
    var lv1_b    = lv1_bi - 0.1;
    var lv1_h    = lv1CsGross / lv1_b;
    var lv1_hi   = lv1_h + 0.1;
    var lv1_csActual = lv1_b * lv1_h;
    var lv1_cd   = lv1CurPhase / lv1_csActual;
    var lv1_radThick = lv1_hi * 1 * lv1Layers + (lv1Layers - 1) * 5 + 0.3 * lv1Layers;

    // ─── HV WINDING (Steps 45–63) ─────────────────────────────────────────
    var hvPhaseV   = (inp.hvconn === "Star") ? inp.hvVoltage / sqrt3
                   : (inp.hvconn === "Delta") ? inp.hvVoltage : inp.hvVoltage / sqrt3;
    var hvTurns    = Math.round(hvPhaseV / vt);
    var hvCurPhase = (inp.hvkva * 1000) / (3 * hvPhaseV);
    var hvLayers   = Math.max(2, Math.ceil(hvTurns / 20));
    var hvTpL      = Math.ceil(hvTurns / hvLayers);
    var hvCsNet    = hvCurPhase / inp.hvcd;
    var hvCsGross  = hvCsNet + 0.86;
    var wlH = tongue - 2 * 16;
    var hv_bi   = wlH / ((hvTpL + 1) * 1);
    var hv_b    = hv_bi - 0.1;
    var hv_h    = hvCsGross / hv_b;
    var hv_hi   = hv_h + 0.1;
    var hv_csActual = hv_b * hv_h;
    var hv_cd   = hvCurPhase / hv_csActual;
    var hv_radThick = hv_hi * 1 * hvLayers + (hvLayers - 1) * 5 + 0.1 * hvLayers;

    // ─── WINDOW HEIGHT ─────────────────────────────────────────────────────
    // Max winding height + end clearances
    var winding_len_lv1 = wl1;
    var winding_len_lv2 = wl2;
    var winding_len_hv  = wlH;
    var windowHeight = Math.max(winding_len_lv1, winding_len_lv2, winding_len_hv) + 2 * 19 + 10;
    windowHeight = Math.ceil(windowHeight / 10) * 10;

    // ─── YOKE HEIGHT ────────────────────────────────────────────────────────
    var yokeHeight = stack * 0.55;
    yokeHeight = Math.ceil(yokeHeight / 5) * 5;

    // ─── LMT CALCULATIONS ──────────────────────────────────────────────────
    // LV1 ID = core frame + core-to-LV clearance (5 mm each side)
    var lv1_id_t = tongue + 2 * 5;
    var lv1_id_s = stack  + 2 * 5;
    var lv1_od_t = lv1_id_t + 2 * lv1_radThick;
    var lv1_od_s = lv1_id_s + 2 * lv1_radThick;
    var lmt_lv1  = ((lv1_id_t + lv1_id_s + lv1_od_t + lv1_od_s) - (lv1_radThick) * 8 + 2 * PI * lv1_radThick) / 1000;

    var duct_lv1_lv2 = 5; // mm (inner duct)
    var lv2_id_t = lv1_od_t + 2 * duct_lv1_lv2;
    var lv2_id_s = lv1_od_s + 2 * duct_lv1_lv2;
    var lv2_od_t = lv2_id_t + 2 * lv2_radThick;
    var lv2_od_s = lv2_id_s + 2 * lv2_radThick;
    var lmt_lv2  = ((lv2_id_t + lv2_id_s + lv2_od_t + lv2_od_s) - (lv2_radThick) * 8 + 2 * PI * lv2_radThick) / 1000;

    var duct_lv2_hv = 10; // mm
    var hv_id_t  = lv2_od_t + 2 * duct_lv2_hv;
    var hv_id_s  = lv2_od_s + 2 * duct_lv2_hv;
    var hv_od_t  = hv_id_t + 2 * hv_radThick;
    var hv_od_s  = hv_id_s + 2 * hv_radThick;
    var lmt_hv   = ((hv_id_t + hv_id_s + hv_od_t + hv_od_s) - (hv_radThick) * 8 + 2 * PI * hv_radThick) / 1000;

    // ─── WIRE LENGTHS ─────────────────────────────────────────────────────
    var tol1 = 1 + (lv1Layers === 1 ? 1 : 5) / 100;
    var tol2 = 1 + (lv2Layers === 1 ? 1 : 5) / 100;
    var tolH = 1.01;
    var wireLen_lv1 = lmt_lv1 * 1 * lv1Turns * 3 * tol1;
    var wireLen_lv2 = lmt_lv2 * 1 * lv2Turns * 3 * tol2;
    var wireLen_hv  = lmt_hv  * 1 * hvTurns  * 3 * tolH;

    // ─── RESISTANCE @ 75°C ───────────────────────────────────────────────
    var rho_lv1 = (inp.lv1mat === "Copper" || inp.lv1mat === "Cu") ? rho_Cu : rho_Al;
    var rho_lv2 = (inp.lv2mat === "Copper" || inp.lv2mat === "Cu") ? rho_Cu : rho_Al;
    var rho_hv  = (inp.hvmat  === "Copper" || inp.hvmat  === "Cu") ? rho_Cu : rho_Al;
    var R75_lv1 = (rho_lv1 * lmt_lv1 * lv1Turns) / lv1_csActual;
    var R75_lv2 = (rho_lv2 * lmt_lv2 * lv2Turns) / lv2_csActual;
    var R75_hv  = (rho_hv  * lmt_hv  * hvTurns)  / hv_csActual;

    // ─── BARE / PROCUREMENT WEIGHTS ───────────────────────────────────────
    var dens_lv1 = (inp.lv1mat === "Copper" || inp.lv1mat === "Cu") ? dens_Cu : dens_Al;
    var dens_lv2 = (inp.lv2mat === "Copper" || inp.lv2mat === "Cu") ? dens_Cu : dens_Al;
    var dens_hv  = (inp.hvmat  === "Copper" || inp.hvmat  === "Cu") ? dens_Cu : dens_Al;
    var bareWt_lv1 = lmt_lv1 * lv1Turns * lv1_csActual * 3 * dens_lv1;
    var bareWt_lv2 = lmt_lv2 * lv2Turns * lv2_csActual * 3 * dens_lv2;
    var bareWt_hv  = lmt_hv  * hvTurns  * hv_csActual  * 3 * dens_hv;

    // ─── STRAY LOSS (Step 23/42/61) ───────────────────────────────────────
    function strayLoss(b, bi, tpl, apCond, slf) {
        var ratio = Math.sqrt((b * tpl * apCond) / ((bi * tpl * apCond) - 0.1));
        var nRad  = apCond; // radial conductors
        var slFrac = ratio * slf * Math.pow(nRad, 4 / 10) * ((nRad * nRad) - 0.2) / 9;
        return 1 + slFrac / 100;
    }
    var stray_lv1 = strayLoss(lv1_b, lv1_bi, lv1TpL, 1, slf_lv);
    var stray_lv2 = strayLoss(lv2_b, lv2_bi, lv2TpL, 1, slf_lv);
    var stray_hv  = strayLoss(hv_b,  hv_bi,  hvTpL,  1, slf_hv);

    // ─── LOAD LOSSES (Step 24/43/62) ──────────────────────────────────────
    var ll_lv1 = llf * bareWt_lv1 * lv1_cd * lv1_cd * stray_lv1;
    var ll_lv2 = llf * bareWt_lv2 * lv2_cd * lv2_cd * stray_lv2;
    var ll_hv  = llf * bareWt_hv  * hv_cd  * hv_cd  * stray_hv;
    var totalLoadLoss = Math.round(ll_lv1 + ll_lv2 + ll_hv);

    // ─── CORE WEIGHT & CORE LOSS (Steps 64–65) ────────────────────────────
    // Limb spacing A = hv_od_t/2 + margin
    var limbSpacingA = Math.round((hv_od_t + tongue) / 2 + 20);
    limbSpacingA = Math.ceil(limbSpacingA / 10) * 10;
    // Core length = 2D + 3L + 4A
    var coreLen_mm = 2 * tongue + 3 * windowHeight + 4 * limbSpacingA;
    var coreWeight = (coreLen_mm * A_net * dens_Fe);   // kg

    // Specific loss from flux density (approximate from Table #7, M-4 grade)
    var specLoss;
    var B = inp.fluxDensity;
    if      (B <= 1.40) specLoss = 0.70;
    else if (B <= 1.50) specLoss = 0.83;
    else if (B <= 1.60) specLoss = 0.92;
    else if (B <= 1.70) specLoss = 1.01;
    else if (B <= 1.73) specLoss = 1.33;
    else                specLoss = 1.50;

    // Build factor (Table #8)
    var buildFactor = (coreDia <= 150) ? 1.30 : (coreDia <= 300) ? 1.25 : 1.20;
    var coreLoss = Math.round(coreWeight * specLoss * buildFactor);

    var totalLoss = totalLoadLoss + coreLoss;

    // ─── IMPEDANCE (Rogowski / leakage flux method) ───────────────────────
    // Z% ≈ (2π f μ₀ × (turns²/phase) × LMT × ducts) / (rated impedance base)
    // Simplified industrial formula:
    var innerDuct   = duct_lv1_lv2;
    var outerDuct   = duct_lv2_hv;
    var atHV        = hvTurns;
    var Lc          = windowHeight / 1000; // m
    var at2         = atHV * atHV;
    var aHVavg      = (lmt_hv  * 1000) / 1000; // m
    var bHVavg      = (lmt_lv2 * 1000) / 1000;
    var ductFactor   = (lv1_radThick / 3 + innerDuct + lv2_radThick / 3 + outerDuct + hv_radThick / 3) / 1000;
    var vBase        = hvPhaseV;
    var Zpu          = (2 * PI * inp.frequency * 4 * PI * 1e-7 * at2 * ductFactor * aHVavg) /
                       (vBase * Lc);
    var impedance    = +(Zpu * 100).toFixed(2);

    // ─── REGULATION ───────────────────────────────────────────────────────
    var Req = (R75_hv + R75_lv1 * Math.pow(hvTurns / lv1Turns, 2)) * 1000;
    var regulation = +((Req / (vBase * 1000) * 100) + 0.5 * Zpu * Zpu * 100).toFixed(2);

    // ─── ENCLOSURE DIMENSIONS (Step 66) ──────────────────────────────────
    var enc_L = Math.round(50 + hv_od_s + limbSpacingA * 2 + 50);
    var enc_W = Math.round(hv_od_t + 50 + 50 + 25);
    var enc_H = Math.round(10 + windowHeight + 2 * yokeHeight + 100);

    // ─── RADIAL & AXIAL LAYOUT DIMS (for Layout Design page) ──────────────
    var radCoreDia  = Math.round(coreDia);
    var radLV1      = Math.round(lv1_radThick);
    var radDuct1    = duct_lv1_lv2;
    var radLV2      = Math.round(lv2_radThick);
    var radDuct2    = duct_lv2_hv;
    var radHV       = Math.round(hv_radThick);

    // ─── ASSEMBLE RESULT ──────────────────────────────────────────────────
    return {
        steps: {
            vt, lv1Turns, lv2Turns, hvTurns,
            A_net, A_gross, tongue, stack, coreDia,
            lv1CurPhase, lv2CurPhase, hvCurPhase,
            lv1Layers, lv2Layers, hvLayers,
            lv1TpL, lv2TpL, hvTpL,
            lv1_b, lv1_h, lv1_bi, lv1_hi, lv1_csActual, lv1_cd, lv1_radThick,
            lv2_b, lv2_h, lv2_bi, lv2_hi, lv2_csActual, lv2_cd, lv2_radThick,
            hv_b,  hv_h,  hv_bi,  hv_hi,  hv_csActual,  hv_cd,  hv_radThick,
            lmt_lv1, lmt_lv2, lmt_hv,
            wireLen_lv1, wireLen_lv2, wireLen_hv,
            R75_lv1, R75_lv2, R75_hv,
            bareWt_lv1, bareWt_lv2, bareWt_hv,
            coreWeight, coreLen_mm, limbSpacingA,
            ll_lv1, ll_lv2, ll_hv, totalLoadLoss,
            coreLoss, totalLoss,
            enc_L, enc_W, enc_H,
            windowHeight, yokeHeight
        },
        windingSummary: {
            LV1: {
                turns:         lv1Turns,
                conductorArea: +lv1_csActual.toFixed(2),
                currentDensity:+lv1_cd.toFixed(2),
                copperLoss:    Math.round(ll_lv1)
            },
            LV2: {
                turns:         lv2Turns,
                conductorArea: +lv2_csActual.toFixed(2),
                currentDensity:+lv2_cd.toFixed(2),
                copperLoss:    Math.round(ll_lv2)
            },
            HV: {
                turns:         hvTurns,
                conductorArea: +hv_csActual.toFixed(2),
                currentDensity:+hv_cd.toFixed(2),
                copperLoss:    Math.round(ll_hv)
            }
        },
        coreDesign: {
            netCoreArea:  +(A_net / 1e6).toFixed(6),
            grossCoreArea:+(A_gross / 1e6).toFixed(6),
            coreDiameter: +(coreDia / 1000).toFixed(4),
            tongue:       tongue,
            stack:        stack,
            windowHeight: +(windowHeight / 1000).toFixed(4),
            yokeHeight:   +(yokeHeight / 1000).toFixed(4),
            coreWeight:   +coreWeight.toFixed(1),
            limbSpacing:  limbSpacingA,
            enc_L, enc_W, enc_H
        },
        radialDims: {
            coreDia: radCoreDia,
            lv1: radLV1, duct1: radDuct1,
            lv2: radLV2, duct2: radDuct2,
            hv:  radHV
        },
        performance: {
            coreLoss,
            totalLoadLoss,
            totalLoss,
            impedance:  +impedance.toFixed(2),
            regulation: +Math.abs(regulation).toFixed(2)
        }
    };
}

/* =============================================
   DOWNLOAD TECHNICAL REPORT AS PDF
   ============================================= */
var downloadBtn = document.getElementById("downloadPdfBtn");
if (downloadBtn) {
    downloadBtn.addEventListener("click", function() {
        window.print();
    });
}

/* =============================================
   BOM PAGE — ACTION BUTTONS
   ============================================= */
var bomDownloadPdf   = document.getElementById("bomDownloadPdf");
var bomDownloadExcel = document.getElementById("bomDownloadExcel");
var bomPrint         = document.getElementById("bomPrint");

if (bomDownloadPdf) {
    bomDownloadPdf.addEventListener("click", function() { window.print(); });
}

if (bomDownloadExcel) {
    bomDownloadExcel.addEventListener("click", function() {
        alert("Excel export will be connected to the Electron backend.");
    });
}

if (bomPrint) {
    bomPrint.addEventListener("click", function() { window.print(); });
}

/* Update BOM rating when a calculation is run */
function updateBomRating(kva) {
    var el = document.getElementById("bomRating");
    if (el && kva) { el.textContent = kva + " kVA"; }
}

/* =============================================
   RATING PLATE — EXPORT BUTTONS
   ============================================= */

/* --- Export as SVG --- */
var rpExportSvg = document.getElementById("rpExportSvg");
if (rpExportSvg) {
    rpExportSvg.addEventListener("click", function() {
        var plate = document.getElementById("ratingPlateExport");
        if (!plate) return;

        // Inline all computed styles into a clone so SVG is self-contained
        var clone = plate.cloneNode(true);
        var allEls = plate.querySelectorAll("*");
        var cloneEls = clone.querySelectorAll("*");

        allEls.forEach(function(el, i) {
            var computed = window.getComputedStyle(el);
            cloneEls[i].style.cssText = computed.cssText;
        });

        var html = clone.innerHTML;
        var svgContent =
            '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml"' +
            ' width="740" height="' + (plate.scrollHeight + 40) + '">' +
            '<foreignObject width="100%" height="100%">' +
            '<html xmlns="http://www.w3.org/1999/xhtml"><body style="margin:0;padding:20px;background:#fff;">' +
            clone.outerHTML +
            '</body></html></foreignObject></svg>';

        var blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
        var url  = URL.createObjectURL(blob);
        var a    = document.createElement("a");
        a.href     = url;
        a.download = "rating_plate.svg";
        a.click();
        URL.revokeObjectURL(url);
    });
}

/* --- Export as PDF (print dialog) --- */
var rpExportPdf = document.getElementById("rpExportPdf");
if (rpExportPdf) {
    rpExportPdf.addEventListener("click", function() {
        // Hide everything except the plate, print, then restore
        var pageWrap  = document.querySelector(".rp-page-wrap");
        var exportBar = document.querySelector(".rp-export-bar");
        var mainHeader = document.querySelector(".main-header");

        if (exportBar)   exportBar.style.display = "none";
        if (mainHeader)  mainHeader.style.display = "none";

        window.print();

        if (exportBar)   exportBar.style.display = "";
        if (mainHeader)  mainHeader.style.display = "";
    });
}

/* =============================================
   LAYOUT DESIGN PAGE
   ============================================= */

// Global layout dimensions (updated from calculation results)
var ldDims = {
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

/* Call this after runCalculation to feed real values */
function updateLayoutDimensions(data) {
    if (!data) return;
    var cd = data.coreDesign;
    var ws = data.windingSummary;

    if (cd) {
        ldDims.coreDia      = Math.round((cd.coreDiameter || 0.15) * 1000);
        ldDims.yokeHeight   = Math.round((cd.windowHeight || 0.24) * 1000 * 0.4);
        ldDims.windowHeight = Math.round((cd.windowHeight || 0.24) * 1000);
    }

    // Derive radial from conductor areas (rough approximation)
    if (ws) {
        var lv1Area = ws.LV1 ? (ws.LV1.conductorArea || 25) : 25;
        var lv2Area = ws.LV2 ? (ws.LV2.conductorArea || 18) : 18;
        var hvArea  = ws.HV  ? (ws.HV.conductorArea  || 27) : 27;
        ldDims.lv1Radial = Math.max(10, Math.round(lv1Area * 0.8));
        ldDims.lv2Radial = Math.max(10, Math.round(lv2Area * 0.7));
        ldDims.hvRadial  = Math.max(15, Math.round(hvArea  * 0.9));
        ldDims.lv1Height = Math.round(ldDims.windowHeight * 0.5);
        ldDims.lv2Height = Math.round(ldDims.windowHeight * 0.65);
        ldDims.hvHeight  = Math.round(ldDims.windowHeight * 1.0);
    }

    ldDims.limbSpacing = ldDims.coreDia + ldDims.lv1Radial * 2 + ldDims.duct1 * 2 +
                         ldDims.lv2Radial * 2 + ldDims.duct2 * 2 + ldDims.hvRadial * 2 + 20;

    updateLayoutUI();
    drawAllDiagrams();
}

function updateLayoutUI() {
    var d = ldDims;
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

function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
}

/* ---- DRAW ALL THREE DIAGRAMS ---- */
function drawAllDiagrams() {
    drawFrontView();
    drawSideElevation();
    drawPlanView();
}

/* ==================================================
   DIAGRAM 1 — FRONT VIEW (3-limb core + windings)
   ================================================== */
function drawFrontView() {
    var canvas = document.getElementById("canvasFront");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, W, H);

    var d = ldDims;
    var scale = Math.min(
        (W * 0.72) / (d.limbSpacing * 2 + d.coreDia),
        (H * 0.62) / (d.yokeHeight * 2 + d.hvHeight)
    );

    var totalW = (d.limbSpacing * 2 + d.coreDia) * scale;
    var totalH = (d.yokeHeight * 2 + d.hvHeight) * scale;
    var ox = (W - totalW) / 2;
    var oy = (H - totalH) / 2;

    var yokeH  = d.yokeHeight * scale;
    var winH   = d.hvHeight   * scale;
    var coreW  = d.coreDia    * scale;
    var limbSp = d.limbSpacing * scale;

    // Limb x-centres
    var cx = [ox + coreW / 2, ox + coreW / 2 + limbSp, ox + coreW / 2 + limbSp * 2];

    // --- Top yoke ---
    ctx.fillStyle = "#5a5a6a";
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 1;
    ctx.fillRect(ox, oy, totalW, yokeH);
    ctx.strokeRect(ox, oy, totalW, yokeH);
    dimLabel(ctx, ox + totalW / 2, oy + yokeH / 2, "Top Yoke = " + d.yokeHeight + " mm", "#ccc", true);

    // --- Bottom yoke ---
    var byY = oy + yokeH + winH;
    ctx.fillStyle = "#5a5a6a";
    ctx.fillRect(ox, byY, totalW, yokeH);
    ctx.strokeRect(ox, byY, totalW, yokeH);
    dimLabel(ctx, ox + totalW / 2, byY + yokeH / 2, "Bottom Yoke = " + d.yokeHeight + " mm", "#ccc", true);

    // --- Core limbs + windings ---
    for (var i = 0; i < 3; i++) {
        var lx = cx[i] - coreW / 2;
        var ly = oy + yokeH;

        // Core limb (dark grey)
        ctx.fillStyle = "#4a4a5a";
        ctx.fillRect(lx, ly, coreW, winH);
        ctx.strokeStyle = "#777";
        ctx.lineWidth = 1;
        ctx.strokeRect(lx, ly, coreW, winH);

        // LV1 winding (gold/amber) — innermost
        var lv1t  = d.lv1Radial  * scale;
        var duct1t = d.duct1 * scale;
        var lv2t  = d.lv2Radial  * scale;
        var duct2t = d.duct2 * scale;
        var hvt   = d.hvRadial   * scale;

        var lv1H = d.lv1Height * scale;
        var lv2H = d.lv2Height * scale;
        var hvH  = d.hvHeight  * scale;

        var lv1y = ly + (winH - lv1H) / 2;
        drawCoil(ctx, lx - lv1t, lv1y, lv1t, lv1H, "#c8922a", "#f0b840", "LV1");

        // Mirror right side
        drawCoil(ctx, lx + coreW, lv1y, lv1t, lv1H, "#c8922a", "#f0b840", "");

        // LV2 winding (lighter gold)
        var lv2x = lx - lv1t - duct1t - lv2t;
        var lv2y = ly + (winH - lv2H) / 2;
        drawCoil(ctx, lv2x, lv2y, lv2t, lv2H, "#8a6a20", "#c09030", "LV2");
        drawCoil(ctx, lx + coreW + lv1t + duct1t, lv2y, lv2t, lv2H, "#8a6a20", "#c09030", "");

        // HV winding (blue)
        var hvx = lv2x - duct2t - hvt;
        var hvy = ly + (winH - hvH) / 2;
        drawCoil(ctx, hvx, hvy, hvt, hvH, "#1a3a6a", "#2860b0", "HV");
        drawCoil(ctx, lx + coreW + lv1t + duct1t + lv2t + duct2t, hvy, hvt, hvH, "#1a3a6a", "#2860b0", "");
    }

    // Window height arrow + label on the right
    var arrowX = ox + totalW + 20;
    var winTop = oy + yokeH;
    var winBot = winTop + winH;
    drawArrow(ctx, arrowX, winTop, arrowX, winBot, "#aaa");
    dimLabel(ctx, arrowX + 4, (winTop + winBot) / 2, d.hvHeight + " mm", "#aaa", false, true);

    // Total height label on left
    drawArrow(ctx, ox - 20, oy, ox - 20, oy + totalH, "#aaa");
    dimLabel(ctx, ox - 22, oy + totalH / 2, (d.yokeHeight * 2 + d.hvHeight) + " mm", "#aaa", false, true, true);

    // Width label at bottom
    drawArrow(ctx, ox, oy + totalH + 18, ox + totalW, oy + totalH + 18, "#aaa");
    dimLabel(ctx, ox + totalW / 2, oy + totalH + 26, d.limbSpacing + " mm", "#aaa", true);

    // OCTC to cover label (top)
    dimLabel(ctx, ox + coreW / 2 + 60, oy - 12, "OCTC to cover = 100 mm", "#888", true);
}

function drawCoil(ctx, x, y, w, h, colDark, colLight, label) {
    // Main body
    ctx.fillStyle = colLight;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = colDark;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Horizontal winding lines
    ctx.strokeStyle = colDark;
    ctx.lineWidth = 0.5;
    var step = Math.max(4, h / 18);
    for (var i = step; i < h - 1; i += step) {
        ctx.beginPath();
        ctx.moveTo(x, y + i);
        ctx.lineTo(x + w, y + i);
        ctx.stroke();
    }

    // Label
    if (label) {
        ctx.save();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 9px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (h > 30) {
            ctx.translate(x + w / 2, y + h / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(label, 0, 0);
        }
        ctx.restore();
    }
}

/* ==================================================
   DIAGRAM 2 — SIDE ELEVATION (core stack with yoke labels)
   ================================================== */
function drawSideElevation() {
    var canvas = document.getElementById("canvasSide");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, W, H);

    var d = ldDims;
    var totalH_mm = d.yokeHeight + d.windowHeight + d.yokeHeight + d.coreFootInsulation;
    var scale = (H * 0.72) / totalH_mm;
    var coreW = d.coreDia * scale * 0.9;

    var ox = W * 0.2;
    var oy = H * 0.1;

    var topYokeH  = d.yokeHeight * scale;
    var winH      = d.windowHeight * scale;
    var botYokeH  = d.yokeHeight * scale;
    var footH     = d.coreFootInsulation * scale;

    // OCTC circle at top
    var circR = 10;
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
    var limbW = coreW * 0.7;
    var limbX = ox + (coreW - limbW) / 2;
    ctx.fillStyle = "#3a3a4a";
    ctx.fillRect(limbX, oy + topYokeH, limbW, winH);
    ctx.strokeRect(limbX, oy + topYokeH, limbW, winH);

    // Bottom yoke
    var byY = oy + topYokeH + winH;
    ctx.fillStyle = "#5a5a6a";
    ctx.fillRect(ox, byY, coreW, botYokeH);
    ctx.strokeRect(ox, byY, coreW, botYokeH);

    // Core foot
    var footY = byY + botYokeH;
    ctx.fillStyle = "#4a4a5a";
    ctx.fillRect(ox - 8, footY, coreW + 16, footH);
    ctx.strokeRect(ox - 8, footY, coreW + 16, footH);

    // Dimension labels on the right
    var lx = ox + coreW + 16;
    var arX = lx + 60;

    annotateRight(ctx, lx, oy - circR * 2 - 4, oy, "OCTC to cover = 100 mm");
    annotateRight(ctx, lx, oy, oy + topYokeH, "Top yoke = " + d.yokeHeight + " mm");
    annotateRight(ctx, lx, oy + topYokeH, oy + topYokeH + winH, "Window height = " + d.windowHeight + " mm");
    annotateRight(ctx, lx, byY, byY + botYokeH, "Bottom yoke = " + d.yokeHeight + " mm");
    annotateRight(ctx, lx, footY, footY + footH, "Core foot with insulation = " + d.coreFootInsulation + " mm");
}

function annotateRight(ctx, lx, y1, y2, text) {
    var mx = (y1 + y2) / 2;
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
function drawPlanView() {
    var canvas = document.getElementById("canvasTop");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, W, H);

    var d = ldDims;

    // Plan: total width = 2 * limbSpacing + coreDia + 2*margin
    var margin = 50; // mm each side
    var totalW_mm = d.limbSpacing * 2 + d.coreDia + margin * 2;
    // Total depth = coreDia + 2*hvRadial*2 + margin*2 (winding depth front+back) + margins
    var windingDepth = d.hvRadial * 2 + d.duct2 * 2 + d.lv2Radial * 2 + d.duct1 * 2 + d.lv1Radial * 2 + d.coreDia;
    var totalD_mm = windingDepth + margin * 2 + 20;

    var scale = Math.min((W * 0.82) / totalW_mm, (H * 0.72) / totalD_mm);

    var ox = (W - totalW_mm * scale) / 2;
    var oy = (H - totalD_mm * scale) / 2;

    var marginS  = margin * scale;
    var limbSpS  = d.limbSpacing * scale;
    var coreDiaS = d.coreDia * scale;
    var windDpS  = windingDepth * scale;

    // Outer frame
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ox, oy, totalW_mm * scale, totalD_mm * scale);

    // 3 limb squares + windings
    var limbs = [
        ox + marginS,
        ox + marginS + limbSpS,
        ox + marginS + limbSpS * 2
    ];

    var depthOffset = (totalD_mm * scale - windDpS) / 2;

    for (var i = 0; i < 3; i++) {
        var lx = limbs[i];
        var topY = oy + depthOffset;

        // HV winding (outermost — blue)
        var hvD = d.hvRadial * scale;
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
        var lv2S = d.lv2Radial * scale;
        var lv2innerW = coreDiaS + (d.duct1 * scale + d.lv1Radial * scale) * 2;
        var lv2innerH = windDpS - hvD * 2 - d.duct2 * scale * 2;
        ctx.fillStyle = "rgba(180,140,40,0.4)";
        ctx.strokeStyle = "#c09030";
        var lv2topY = topY + hvD + d.duct2 * scale;
        ctx.fillRect(lx - d.duct1 * scale - d.lv1Radial * scale - lv2S, lv2topY,
                     lv2innerW + lv2S * 2, lv2innerH);
        ctx.strokeRect(lx - d.duct1 * scale - d.lv1Radial * scale - lv2S, lv2topY,
                       lv2innerW + lv2S * 2, lv2innerH);

        // LV1 winding
        var lv1S = d.lv1Radial * scale;
        var lv1topY = lv2topY + lv2S + d.duct1 * scale;
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
    var dimY = oy + depthOffset - 18;
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 1;
    // Gap markers between limb centres
    for (var j = 0; j < 2; j++) {
        var lc1 = limbs[j] + coreDiaS / 2;
        var lc2 = limbs[j + 1] + coreDiaS / 2;
        drawArrow(ctx, lc1, dimY, lc2, dimY, "#888");
        dimLabel(ctx, (lc1 + lc2) / 2, dimY - 8, d.limbSpacing + " mm", "#aaa", true);
    }

    // Left / right margin
    dimLabel(ctx, ox + marginS / 2, oy + totalD_mm * scale / 2, d.coreDia + " mm\n(margin)", "#888", true);

    // Depth dimension on right
    var rightX = ox + totalW_mm * scale + 18;
    drawArrow(ctx, rightX, oy + depthOffset, rightX, oy + depthOffset + windDpS, "#888");
    dimLabel(ctx, rightX + 4, oy + depthOffset + windDpS / 2, windingDepth + " mm", "#aaa", false, true);

    // Bottom frame width
    var botY = oy + totalD_mm * scale + 16;
    drawArrow(ctx, ox, botY, ox + totalW_mm * scale, botY, "#888");
    dimLabel(ctx, ox + totalW_mm * scale / 2, botY + 10, totalW_mm + " mm", "#aaa", true);

    // Duct gap labels in centre column
    ctx.fillStyle = "#999";
    ctx.font = "9px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    var mid1x = limbs[0] + coreDiaS + (limbs[1] - limbs[0] - coreDiaS) / 2;
    var mid2x = limbs[1] + coreDiaS + (limbs[2] - limbs[1] - coreDiaS) / 2;
    var midY  = oy + totalD_mm * scale / 2;
    ctx.fillText(d.duct1 + " mm", mid1x, midY);
    ctx.fillText(d.duct1 + " mm", mid2x, midY);

    // Side margins label
    var sideMarginLabel = margin + " mm";
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
    var angle = Math.atan2(y2 - y1, x2 - x1);
    var as = 6;
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
    if (centered)      ctx.textAlign = "center";
    else if (rightAligned) ctx.textAlign = "right";
    else if (leftAligned)  ctx.textAlign = "right";
    else ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
}

/* Draw on page load with default dims */
(function() {
    var checkCanvases = setInterval(function() {
        if (document.getElementById("canvasFront")) {
            clearInterval(checkCanvases);
            drawAllDiagrams();
            updateLayoutUI();
        }
    }, 100);
})();

/* Redraw when Layout Design tab is clicked */
navItems.forEach(function(item) {
    if (item.getAttribute("data-page") === "layout-design") {
        item.addEventListener("click", function() {
            setTimeout(function() { drawAllDiagrams(); }, 50);
        });
    }
});

/* ---- EXPORT BUTTONS ---- */
var ldExportPdf = document.getElementById("ldExportPdf");
if (ldExportPdf) {
    ldExportPdf.addEventListener("click", function() {
        var bar = document.querySelector(".ld-export-bar");
        if (bar) bar.style.display = "none";
        window.print();
        if (bar) bar.style.display = "";
    });
}

var ldExportSvg = document.getElementById("ldExportSvg");
if (ldExportSvg) {
    ldExportSvg.addEventListener("click", function() {
        // Combine all 3 canvases into one SVG via data URLs
        var canvases = ["canvasFront","canvasSide","canvasTop"];
        var svgParts = ['<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="580">'];
        var yOff = 0;
        canvases.forEach(function(id) {
            var c = document.getElementById(id);
            if (!c) return;
            var dataUrl = c.toDataURL("image/png");
            svgParts.push('<image x="10" y="' + yOff + '" width="' + c.width + '" height="' + c.height + '" xlink:href="' + dataUrl + '"/>');
            yOff += c.height + 10;
        });
        svgParts.push('</svg>');
        var blob = new Blob([svgParts.join("")], { type: "image/svg+xml" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
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

var validationRules = {
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

var validationMessages = {}; // fieldId → { type: 'error'|'warn'|'ok', text }

function getInputValue(id) {
    var el = document.getElementById(id);
    return el ? parseFloat(el.value) || 0 : 0;
}
function getSelectValue(id) {
    var el = document.getElementById(id);
    return el ? el.value : "";
}

/* ── Cross-field validation logic ─────────────────────────────── */
function validateAllInputs() {
    var msgs = {};
    var sqrt3 = Math.sqrt(3);

    var ratedPower = getInputValue("ratedPower");
    var freq       = getInputValue("frequency");
    var B          = getInputValue("fluxDensity");
    var lv1V       = getInputValue("lv1Voltage");
    var lv2V       = getInputValue("lv2Voltage");
    var hvV        = getInputValue("hvVoltage");
    var lv1kva     = getInputValue("lv1kva");
    var lv2kva     = getInputValue("lv2kva");
    var hvkva      = getInputValue("hvkva");
    var lv1cd      = getInputValue("lv1cd");
    var lv2cd      = getInputValue("lv2cd");
    var hvcd       = getInputValue("hvcd");
    var lv1conn    = getSelectValue("lv1conn") === "Y" ? "Star" : "Delta";
    var lv2conn    = getSelectValue("lv2conn") === "Y" ? "Star" : "Delta";
    var hvconn     = getSelectValue("hvconn")  === "Y" ? "Star" : "Delta";
    var lv1mat     = getSelectValue("lv1mat") === "AL" ? "Aluminium" : "Copper";
    var lv2mat     = getSelectValue("lv2mat") === "AL" ? "Aluminium" : "Copper";
    var hvmat      = getSelectValue("hvmat")  === "AL" ? "Aluminium" : "Copper";

    // 1. Basic range checks
    Object.keys(validationRules).forEach(function(id) {
        var rule = validationRules[id];
        var val  = getInputValue(id);
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
        var totalSec = lv1kva + lv2kva;
        var diff = Math.abs(totalSec - hvkva) / hvkva;
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
    var insClass = getSelectValue("insulationClass");
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
        var isCu = (w.mat === "Copper" || w.mat === "Cu");
        if (isCu && w.cur > 3.5) {
            msgs[w.id] = { type: "error",
                text: "Current density " + w.cur + " A/mm² too high for Copper. Max recommended: 3.5 A/mm²." };
        } else if (!isCu && w.cur > 2.5) {
            msgs[w.id] = { type: "error",
                text: "Current density " + w.cur + " A/mm² too high for Aluminium. Max recommended: 2.5 A/mm²." };
        } else if (isCu && w.cur < 1.0) {
            msgs[w.id] = { type: "warn",
                text: "Current density " + w.cur + " A/mm² is low for Copper. Winding will be oversized." };
        } else if (!isCu && w.cur < 0.8) {
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

    // 6. Volts/Turn estimate check
    if (ratedPower > 0 && lv1V > 0) {
        var k = (ratedPower <= 25) ? 0.45 : (ratedPower <= 100) ? 0.55 : 0.62;
        var vtEst = k * Math.sqrt(ratedPower);
        var lv1Phase = (lv1conn === "Star") ? lv1V / sqrt3 : lv1V;
        var turnsEst = Math.round(lv1Phase / vtEst);
        if (turnsEst < 10) {
            msgs["lv1Voltage"] = msgs["lv1Voltage"] || { type: "warn",
                text: "Very low estimated turns (~" + turnsEst + ") for LV1. Consider increasing voltage or reducing kVA." };
        }
    }

    // 7. HV voltage BIL check
    if (hvV > 0) {
        var bil;
        if      (hvV <= 1000)  bil = "Not required (LV)";
        else if (hvV <= 3300)  bil = "40 kVp (IS 2026)";
        else if (hvV <= 6600)  bil = "60 kVp";
        else if (hvV <= 11000) bil = "95 kVp";
        else if (hvV <= 22000) bil = "150 kVp";
        else                   bil = "250 kVp";
        if (!msgs["hvVoltage"] || msgs["hvVoltage"].type === "ok") {
            msgs["hvVoltage"] = { type: "ok", text: "Recommended BIL: " + bil };
        }
    }

    // 8. Vector group consistency
    var vectorGroup = getSelectValue("vectorGroup");
    if (vectorGroup && hvconn && lv1conn) {
        var vgUpper = vectorGroup.toUpperCase();
        var hvExpect = vgUpper[0];  // D or Y
        var hvIsD = (hvconn === "Delta");
        var hvIsY = (hvconn === "Star");
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
        var field = document.getElementById(id);
        if (!field) return;
        var msg = msgs[id];
        var badge = document.createElement("div");
        badge.className = "val-badge val-" + msg.type;
        badge.textContent = msg.text;
        var parent = field.parentNode;
        // Insert after field
        if (parent) {
            var next = field.nextSibling;
            parent.insertBefore(badge, next);
        }
    });

    // Update run button state
    var runBtn = document.getElementById("runCalcBtn");
    var hasError = Object.values(msgs).some(function(m) { return m.type === "error"; });
    if (runBtn) {
        runBtn.disabled = hasError;
        runBtn.style.opacity = hasError ? "0.5" : "1";
        runBtn.style.cursor  = hasError ? "not-allowed" : "pointer";
        runBtn.title = hasError ? "Fix validation errors before running" : "Run Calculation";
    }

    return hasError;
}

/* ── Show a floating summary panel ───────────────────────────────── */
function updateValidationSummary(msgs) {
    var panel = document.getElementById("validationSummary");
    if (!panel) return;
    var errors = [], warnings = [];
    Object.values(msgs).forEach(function(m) {
        if (m.type === "error")   errors.push(m.text);
        if (m.type === "warn")    warnings.push(m.text);
    });

    if (errors.length === 0 && warnings.length === 0) {
        panel.innerHTML = '<div class="val-summary-ok">✓ All inputs valid — ready to calculate</div>';
        panel.className = "val-summary-panel val-summary-clean";
    } else {
        var html = "";
        errors.forEach(function(t)   { html += '<div class="val-sum-err">✕ ' + t + '</div>'; });
        warnings.forEach(function(t) { html += '<div class="val-sum-warn">⚠ ' + t + '</div>'; });
        panel.innerHTML = html;
        panel.className = "val-summary-panel" + (errors.length ? " val-summary-dirty" : " val-summary-warn");
    }
}

/* ── Touch tracking — only show errors for fields the user has interacted with ── */
var touchedFields = {};   // fieldId → true once the user has left the field or changed a select
var dirtyFields   = {};   // fieldId → true once the user has typed something (even if still focused)

var valFields = [
    "ratedPower","frequency","fluxDensity",
    "lv1Voltage","lv2Voltage","hvVoltage",
    "lv1kva","lv2kva","hvkva",
    "lv1cd","lv2cd","hvcd",
    "lv1conn","lv2conn","hvconn",
    "lv1mat","lv2mat","hvmat",
    "vectorGroup","insulationClass"
];

valFields.forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var isSelect = el.tagName === "SELECT";

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
    var allMsgs = validateAllInputs();

    // Filter: only show messages for fields that have been interacted with
    // EXCEPTION: cross-field warnings (kva balance, vector group) shown
    // only if ALL involved fields are dirty
    var visibleMsgs = {};
    Object.keys(allMsgs).forEach(function(id) {
        var msg = allMsgs[id];

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
    var totalErrors = Object.values(allMsgs).filter(function(m) { return m.type === "error"; });
    var runBtn = document.getElementById("runCalcBtn");
    if (runBtn) {
        // Only disable if at least one field has been touched AND there are errors
        var anyTouched = Object.keys(touchedFields).length > 0;
        var hasBlocker = anyTouched && totalErrors.length > 0;
        runBtn.disabled = false; // always let them try — we'll validate on submit
        runBtn.style.opacity = "1";
        runBtn.style.cursor  = "pointer";
        runBtn.title = hasBlocker ? "Fix errors before running" : "Run Calculation";
    }
}

/* ── Summary panel — only show touched field issues ─────────────── */
function updateValidationSummary(msgs) {
    var panel = document.getElementById("validationSummary");
    if (!panel) return;

    var errors = [], warnings = [];
    Object.values(msgs).forEach(function(m) {
        if (m.type === "error") errors.push(m.text);
        if (m.type === "warn")  warnings.push(m.text);
    });

    if (errors.length === 0 && warnings.length === 0) {
        var anyTouched = Object.keys(touchedFields).length > 0 || Object.keys(dirtyFields).length > 0;
        if (anyTouched) {
            panel.innerHTML = '<div class="val-summary-ok">✓ Looking good — keep filling in the inputs</div>';
            panel.className = "val-summary-panel val-summary-clean";
        } else {
            panel.innerHTML = '<div style="color:#666;font-size:11px;">Fill in the inputs above — validation feedback will appear here.</div>';
            panel.className = "val-summary-panel";
        }
    } else {
        var html = "";
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

    var allMsgs = validateAllInputs();
    renderValidation(allMsgs);
    updateValidationSummary(allMsgs);

    var hasError = Object.values(allMsgs).some(function(m) { return m.type === "error"; });
    if (hasError) {
        var panel = document.getElementById("validationSummary");
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
var runCalcBtn = document.getElementById("runCalcBtn");
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
    var panel = document.getElementById("validationSummary");
    if (panel) {
        panel.innerHTML = '<div style="color:#555;font-size:11px;">Fill in the inputs above — validation feedback will appear here as you go.</div>';
        panel.className = "val-summary-panel";
    }
})();