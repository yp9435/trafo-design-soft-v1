/* outputRenderer.js — all output tabs: technical report, rating plate,
   BOM table, PDF generation, export button wiring */

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
    // ── core object — exactly matches core_design.py return dict ──────────────
    // Keys: initial_volts_per_turn, phase_voltage, turns_per_phase,
    //       volts_per_turn, net_core_area, gross_core_area, core_dimensions
    // Note: flux_density is a user input shown for reference alongside core results
    let coreHtml =
        trRow("Volts per Turn",              r4(s.initVT)   + " V") +
        trRow("LV Base Turns per Phase",         s.lv1Turns     + " turns") +
        trRow("Revised Volts per Turn",      r4(s.vt)       + " V") +
        trRow("Net Core Area",               r0(s.A_net)    + " mm²") +
        trRow("Gross Core Area",             r0(s.A_gross)  + " mm²") +
        trRow("Core Frame (Tongue × Stack)", s.tongue + " × " + s.stack + " mm");
    setTbody("coreDesignBody", coreHtml);

    // ── final_core object fields ──────────────────────────────────────────────
    // tongue_width, center_distance, window_height, core_length,
    // core_weight, core_loss, tank/overall dims
    let finalCoreHtml =
        trRow("Tongue Width",          s.tongue          + " mm") +
        trRow("Yoke Height",           r0(s.yokeHeight)  + " mm") +
        trRow("Window Height",         r0(s.windowHeight) + " mm") +
        trRow("Limb Spacing (c-c)",    s.limbSpacingA    + " mm") +
        trRow("Core Length",           r0(s.coreLen_mm)  + " mm") +
        trRow("Core Weight",           r1(s.coreWeight)  + " kg") +
        trRow("Core Loss",             r0(s.coreLoss)    + " W") +
        trRow("Enclosure (L × W × H)", s.enc_L + " × " + s.enc_W + " × " + s.enc_H + " mm");
    setTbody("finalCoreBody", finalCoreHtml);

    // ════════════════════════════════════════════════════════════
    //  CROSS CONDUCTOR AREA TABLE  (conductorBreakdownBody)
    // ════════════════════════════════════════════════════════════
    // Parallel counts: winding_design.py uses axial/radial_parallel internally
    // but does NOT return them. Read from user input — the authoritative source.
    let lv1TotalPar = (inp.lv1axPar || 1) * (inp.lv1radPar || 1);
    let lv2TotalPar = (inp.lv2axPar || 1) * (inp.lv2radPar || 1);
    let hvTotalPar  = (inp.hvaxPar  || 1) * (inp.hvradPar  || 1);

    // "Winding Length (eff.)" is the same value as "Net Winding Length" — removed as duplicate.
    let cbHtml =
        trRow4("Window Height",          r0(s.windowHeight) + " mm",
               "LV1 Conductor b (bare)", r2(s.lv1_b)  + " mm") +
        trRow4("End Clearance",          r0(endClr)    + " mm",
               "LV1 Conductor b (ins.)", r2(s.lv1_bi) + " mm") +
        trRow4("Net Winding Length",     r0(netWindLen) + " mm",
               "LV1 Conductor h (bare)", r2(s.lv1_h)  + " mm") +
        trRow4("Total Parallel (LV1)",   lv1TotalPar,
               "LV1 Conductor h (ins.)", r2(s.lv1_hi) + " mm") +
        trRow4("Total Parallel (LV2)",   lv2TotalPar,
               "LV1 Conductor Area",     r2(s.lv1_csActual) + " mm²") +
        trRow4("Total Parallel (HV)",    hvTotalPar,
               "LV2 Conductor Area",     r2(s.lv2_csActual) + " mm²") +
        trRow4("",                       "",
               "HV Conductor Area",      r2(s.hv_csActual)  + " mm²");
    setTbody("conductorBreakdownBody", cbHtml);

    // Phase voltage labels (display only — no arithmetic, just label format)
    let lv1PhaseVLabel = (inp.lv1conn === "Y") ? inp.lv1Voltage + " / √3 V" : inp.lv1Voltage + " V";
    let lv2PhaseVLabel = (inp.lv2conn === "Y") ? inp.lv2Voltage + " / √3 V" : inp.lv2Voltage + " V";
    let hvPhaseVLabel  = (inp.hvconn  === "Y") ? inp.hvVoltage  + " / √3 V" : inp.hvVoltage  + " V";

    // ── Winding detail body builder — all values from backend ─────────
    function windingBodyHtml(wnd) {
        return trRow("Voltage per Phase",                   wnd.phaseVLabel) +
               trRow("Current per Phase",                   r2(wnd.curPhase)      + " A") +
               trRow("Turns per Phase",                     wnd.turns             + " turns") +
               trRow("Connection",                          toConnName(wnd.conn)) +
               trRow("Conductor Material",                  wnd.mat.toUpperCase()) +
               trRow("Number of Layers",                    wnd.layers) +
               trRow("Turns per Layer",                     wnd.tpL) +
               trRow("Axial Parallel (Np)",                 wnd.np) +
               trRow("Radial Parallel (Nr)",                wnd.nr) +
               trRow("Total Parallel Conductors (Np × Nr)", wnd.np * wnd.nr) +
               trRow("Window Height",                       r0(wnd.windowHeight)   + " mm") +
               trRow("End Clearance",                       r0(wnd.endClearance)   + " mm") +
               trRow("Net Winding Length",                  r0(wnd.windingLength)  + " mm") +
               trRow("Conductor Breadth (bare / ins.)",     r2(wnd.b)   + " mm  &  " + r2(wnd.bi)  + " mm") +
               trRow("Conductor Height (bare / ins.)",      r2(wnd.h)   + " mm  &  " + r2(wnd.hi)  + " mm") +
               trRow("Net Conductor Area",                  r2(wnd.csActual)       + " mm²") +
               trRow("Current Density (actual)",            r3(wnd.cd)             + " A/mm²") +
               trRow("Inter-Layer Insulation",              r2(wnd.interLayerIns)  + " mm") +
               trRow("Radial Build (winding thickness)",    r2(wnd.radThick)       + " mm") +
               trRow("Mean Turn Length (LMT)",              r3(wnd.lmt)            + " m") +
               trRow("Total Wire Length",                   r1(wnd.wl)             + " m") +
               trRow("Resistance per Phase @ 75°C",         r4(wnd.R75)            + " Ω") +
               trRow("Bare / Insulated / Procurement Wt.",  r1(wnd.bareWt) + " / " + r1(wnd.insWt) + " / " + r1(wnd.procWt) + " kg") +
               trRow("Stray Loss (%)",                      r3(wnd.strayPct)       + " %") +
               trRow("Load Loss (I²R + Stray)",             r0(wnd.loadLoss)       + " W") +
               trRow("Winding Temperature Gradient",        r1(wnd.gradient)       + " °C");
    }

    setTbody("windingLV1Body", windingBodyHtml({
        phaseVLabel: lv1PhaseVLabel,  curPhase: s.lv1CurPhase,  turns: s.lv1Turns,
        conn: inp.lv1conn,  mat: inp.lv1mat,
        layers: s.lv1Layers,  tpL: s.lv1TpL,  np: inp.lv1axPar || 1,  nr: inp.lv1radPar || 1,
        windowHeight: s.windowHeight,  endClearance: s.endClearance_lv1,  windingLength: s.windingLength_lv1,
        b: s.lv1_b,  bi: s.lv1_bi,  h: s.lv1_h,  hi: s.lv1_hi,
        csActual: s.lv1_csActual,  cd: s.lv1_cd,  interLayerIns: s.lv1_interLayerIns,
        radThick: s.lv1_radThick,  lmt: s.lmt_lv1,  wl: s.wireLen_lv1,  R75: s.R75_lv1,
        bareWt: s.bareWt_lv1,  insWt: s.insWt_lv1,  procWt: s.procWt_lv1,
        strayPct: s.strayPct_lv1,  loadLoss: s.ll_lv1,  gradient: s.gradient_lv1
    }));

    setTbody("windingLV2Body", windingBodyHtml({
        phaseVLabel: lv2PhaseVLabel,  curPhase: s.lv2CurPhase,  turns: s.lv2Turns,
        conn: inp.lv2conn,  mat: inp.lv2mat,
        layers: s.lv2Layers,  tpL: s.lv2TpL,  np: inp.lv2axPar || 1,  nr: inp.lv2radPar || 1,
        windowHeight: s.windowHeight,  endClearance: s.endClearance_lv2,  windingLength: s.windingLength_lv2,
        b: s.lv2_b,  bi: s.lv2_bi,  h: s.lv2_h,  hi: s.lv2_hi,
        csActual: s.lv2_csActual,  cd: s.lv2_cd,  interLayerIns: s.lv2_interLayerIns,
        radThick: s.lv2_radThick,  lmt: s.lmt_lv2,  wl: s.wireLen_lv2,  R75: s.R75_lv2,
        bareWt: s.bareWt_lv2,  insWt: s.insWt_lv2,  procWt: s.procWt_lv2,
        strayPct: s.strayPct_lv2,  loadLoss: s.ll_lv2,  gradient: s.gradient_lv2
    }));

    setTbody("windingHVBody", windingBodyHtml({
        phaseVLabel: hvPhaseVLabel,  curPhase: s.hvCurPhase,  turns: s.hvTurns,
        conn: inp.hvconn,  mat: inp.hvmat,
        layers: s.hvLayers,  tpL: s.hvTpL,  np: inp.hvaxPar || 1,  nr: inp.hvradPar || 1,
        windowHeight: s.windowHeight,  endClearance: s.endClearance_hv,  windingLength: s.windingLength_hv,
        b: s.hv_b,  bi: s.hv_bi,  h: s.hv_h,  hi: s.hv_hi,
        csActual: s.hv_csActual,  cd: s.hv_cd,  interLayerIns: s.hv_interLayerIns,
        radThick: s.hv_radThick,  lmt: s.lmt_hv,  wl: s.wireLen_hv,  R75: s.R75_hv,
        bareWt: s.bareWt_hv,  insWt: s.insWt_hv,  procWt: s.procWt_hv,
        strayPct: s.strayPct_hv,  loadLoss: s.ll_hv,  gradient: s.gradient_hv
    }));
}

/* =============================================
   WINDING COMPARE TABLE — 3-column side-by-side
   Populates the wc-{winding}-{field} cell IDs
   ============================================= */
function populateWindingCompare(inp, result) {
    let s = result.steps;

    // Phase voltage label builder
    function phaseVLabel(conn, voltage) {
        return (conn === "Y") ? voltage + " / √3 V" : voltage + " V";
    }

    // Helper: set a winding-compare cell by winding prefix + field key
    function wc(winding, field, value) {
        let el = document.getElementById("wc-" + winding + "-" + field);
        if (el) el.textContent = (value === null || value === undefined || value === "") ? "—" : value;
    }

    let lv1PhaseV = phaseVLabel(inp.lv1conn, inp.lv1Voltage);
    let lv2PhaseV = phaseVLabel(inp.lv2conn, inp.lv2Voltage);
    let hvPhaseV  = phaseVLabel(inp.hvconn,  inp.hvVoltage);

    // Row: Voltage per Phase
    wc("lv1","phaseV",    lv1PhaseV);
    wc("lv2","phaseV",    lv2PhaseV);
    wc("hv", "phaseV",    hvPhaseV);

    // Row: Current per Phase
    wc("lv1","curPhase",  r2(s.lv1CurPhase) + " A");
    wc("lv2","curPhase",  r2(s.lv2CurPhase) + " A");
    wc("hv", "curPhase",  r2(s.hvCurPhase)  + " A");

    // Row: Turns per Phase
    wc("lv1","turns",     s.lv1Turns + " turns");
    wc("lv2","turns",     s.lv2Turns + " turns");
    wc("hv", "turns",     s.hvTurns  + " turns");

    // Row: Connection
    wc("lv1","conn",  toConnName(inp.lv1conn));
    wc("lv2","conn",  toConnName(inp.lv2conn));
    wc("hv", "conn",  toConnName(inp.hvconn));

    // Row: Conductor Material
    wc("lv1","mat",  (inp.lv1mat || "").toUpperCase());
    wc("lv2","mat",  (inp.lv2mat || "").toUpperCase());
    wc("hv", "mat",  (inp.hvmat  || "").toUpperCase());

    // Row: Number of Layers
    wc("lv1","layers",   s.lv1Layers);
    wc("lv2","layers",   s.lv2Layers);
    wc("hv", "layers",   s.hvLayers);

    // Row: Turns per Layer
    wc("lv1","tpL",   s.lv1TpL);
    wc("lv2","tpL",   s.lv2TpL);
    wc("hv", "tpL",   s.hvTpL);

    // Axial/Radial Parallel: NOT in winding_design.py return dict.
    // Read from user input — the only authoritative source.
    wc("lv1","np",  inp.lv1axPar  || 1);
    wc("lv2","np",  inp.lv2axPar  || 1);
    wc("hv", "np",  inp.hvaxPar   || 1);

    wc("lv1","nr",  inp.lv1radPar || 1);
    wc("lv2","nr",  inp.lv2radPar || 1);
    wc("hv", "nr",  inp.hvradPar  || 1);

    wc("lv1","totalPar",  (inp.lv1axPar || 1) * (inp.lv1radPar || 1));
    wc("lv2","totalPar",  (inp.lv2axPar || 1) * (inp.lv2radPar || 1));
    wc("hv", "totalPar",  (inp.hvaxPar  || 1) * (inp.hvradPar  || 1));

    // Row: Window Height — each winding has its own window_height field
    wc("lv1","winH",   r0(s.windowHeight_lv1 || s.windowHeight) + " mm");
    wc("lv2","winH",   r0(s.windowHeight_lv2 || s.windowHeight) + " mm");
    wc("hv", "winH",   r0(s.windowHeight_hv  || s.windowHeight) + " mm");

    // Row: End Clearance
    wc("lv1","endClr",  r0(s.endClearance_lv1) + " mm");
    wc("lv2","endClr",  r0(s.endClearance_lv2) + " mm");
    wc("hv", "endClr",  r0(s.endClearance_hv)  + " mm");

    // Row: Net Winding Length
    wc("lv1","windLen",  r0(s.windingLength_lv1) + " mm");
    wc("lv2","windLen",  r0(s.windingLength_lv2) + " mm");
    wc("hv", "windLen",  r0(s.windingLength_hv)  + " mm");

    // Number of Ducts: removed — not in winding_design.py return dict.

    // Row: Conductor Breadth
    wc("lv1","b",  r2(s.lv1_b) + " / " + r2(s.lv1_bi) + " mm");
    wc("lv2","b",  r2(s.lv2_b) + " / " + r2(s.lv2_bi) + " mm");
    wc("hv", "b",  r2(s.hv_b)  + " / " + r2(s.hv_bi)  + " mm");

    // Row: Conductor Height
    wc("lv1","h",  r2(s.lv1_h) + " / " + r2(s.lv1_hi) + " mm");
    wc("lv2","h",  r2(s.lv2_h) + " / " + r2(s.lv2_hi) + " mm");
    wc("hv", "h",  r2(s.hv_h)  + " / " + r2(s.hv_hi)  + " mm");

    // Row: Net Conductor Area
    wc("lv1","csArea",  r2(s.lv1_csActual) + " mm²");
    wc("lv2","csArea",  r2(s.lv2_csActual) + " mm²");
    wc("hv", "csArea",  r2(s.hv_csActual)  + " mm²");

    // Row: Current Density
    wc("lv1","cd",  r3(s.lv1_cd) + " A/mm²");
    wc("lv2","cd",  r3(s.lv2_cd) + " A/mm²");
    wc("hv", "cd",  r3(s.hv_cd)  + " A/mm²");

    // Row: Inter-Layer Insulation
    wc("lv1","interIns",  r2(s.lv1_interLayerIns) + " mm");
    wc("lv2","interIns",  r2(s.lv2_interLayerIns) + " mm");
    wc("hv", "interIns",  r2(s.hv_interLayerIns)  + " mm");

    // Row: Radial Build
    wc("lv1","radThick",  r2(s.lv1_radThick) + " mm");
    wc("lv2","radThick",  r2(s.lv2_radThick) + " mm");
    wc("hv", "radThick",  r2(s.hv_radThick)  + " mm");

    // Row: LMT
    wc("lv1","lmt",  r3(s.lmt_lv1) + " m");
    wc("lv2","lmt",  r3(s.lmt_lv2) + " m");
    wc("hv", "lmt",  r3(s.lmt_hv)  + " m");

    // Row: Wire Length
    wc("lv1","wl",  r1(s.wireLen_lv1) + " m");
    wc("lv2","wl",  r1(s.wireLen_lv2) + " m");
    wc("hv", "wl",  r1(s.wireLen_hv)  + " m");

    // Row: Resistance @ 75°C
    wc("lv1","R75",  r4(s.R75_lv1) + " Ω");
    wc("lv2","R75",  r4(s.R75_lv2) + " Ω");
    wc("hv", "R75",  r4(s.R75_hv)  + " Ω");

    // Row: Weights
    wc("lv1","wt",  r1(s.bareWt_lv1) + " / " + r1(s.insWt_lv1) + " / " + r1(s.procWt_lv1) + " kg");
    wc("lv2","wt",  r1(s.bareWt_lv2) + " / " + r1(s.insWt_lv2) + " / " + r1(s.procWt_lv2) + " kg");
    wc("hv", "wt",  r1(s.bareWt_hv)  + " / " + r1(s.insWt_hv)  + " / " + r1(s.procWt_hv)  + " kg");

    // Row: Stray Loss
    wc("lv1","stray",  r3(s.strayPct_lv1) + " %");
    wc("lv2","stray",  r3(s.strayPct_lv2) + " %");
    wc("hv", "stray",  r3(s.strayPct_hv)  + " %");

    // Row: Load Loss
    wc("lv1","ll",  r0(s.ll_lv1) + " W");
    wc("lv2","ll",  r0(s.ll_lv2) + " W");
    wc("hv", "ll",  r0(s.ll_hv)  + " W");

    // Row: Winding Temperature Gradient
    wc("lv1","grad",  r1(s.gradient_lv1) + " °C");
    wc("lv2","grad",  r1(s.gradient_lv2) + " °C");
    wc("hv", "grad",  r1(s.gradient_hv)  + " °C");
}

/* =============================================
   RATING PLATE — populate from calculation
   ============================================= */
function populateRatingPlate(inp, result) {
    // All values from backend rating_plate object (rating_plate.py).
    // Company details are hardcoded for Bhavitron — no settings panel.
    let rp = result.ratingPlate || {};
    let pf = result.performance;

    // ── Electrical data — all from backend rp object ──────────────────
    setText("rp-bv-rating", rp.rating_kva        || (inp.ratedPower + " KVA"));
    setText("rp-bv-freq",   rp.frequency_hz       || ((inp.frequency || 50) + " HZ"));
    setText("rp-bv-imp",    rp.impedance_percentage || "<5%");

    // ── Primary / secondary — use backend display strings directly ────
    let primary = rp.primary     || {};
    let sec1    = rp.secondary_1 || {};
    let sec2    = rp.secondary_2 || {};

    setText("rp-bv-primary", primary.display || "—");
    setText("rp-bv-sec1",    sec1.display    || "—");
    setText("rp-bv-sec2",    sec2.display    || "—");
    setText("rp-bv-vector",  (rp.vector_symbol || "—").toUpperCase());

    // ── Weight — from backend rp.weight (bom.py active+enclosure) ────
    setText("rp-bv-weight", rp.weight || "—");

    // ── SL. No. — from backend (null by default, handwritten on plate) ─
    setText("rp-bv-slno", rp.sl_no || "—");

    // ── Mfg. Year — from backend rp.mfg_year ─────────────────────────
    let mfgEl = document.getElementById("rp-bv-mfg");
    if (mfgEl) {
        mfgEl.textContent = rp.mfg_year || new Date().getFullYear();
    }
}

/* =============================================
   POPULATE CALCULATED OUTPUTS
   ============================================= */
function populateOutput(inp, data) {
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
            buildOutputRow("Axial Parallel (Np)",    inp.lv1axPar  || 1,    inp.lv2axPar  || 1,    inp.hvaxPar   || 1) +
            buildOutputRow("Radial Parallel (Nr)",   inp.lv1radPar || 1,    inp.lv2radPar || 1,    inp.hvradPar  || 1) +
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
    // core_design.py: initial_volts_per_turn, turns_per_phase, volts_per_turn,
    //                 net_core_area, gross_core_area, core_dimensions
    // final_core_design.py: window_height, tongue_width(yoke), center_distance,
    //                       core_length, core_weight, core_loss, enclosure dims
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
        // Only fields from backend: core_loss (final_core), load_loss sum (windings)
        // Impedance Voltage and Voltage Regulation are NOT in any backend return dict — removed.
        perfEl.innerHTML =
            kvRow("Core Loss",       r0(pf.coreLoss)      + " W") +
            kvRow("Total Load Loss", r0(pf.totalLoadLoss) + " W") +
            kvRow("Total Loss",      r0(pf.totalLoss)     + " W");
    }

    /* ---- Core Material Summary ---- */
    let cmEl = document.getElementById("coreMaterialOutput");
    if (cmEl && data.coreMatMeta) {
        let cm = data.coreMatMeta;
        // Only show fields that exist in final_core_design.py return dict:
        // density, build_factor, specific_loss, core_weight, core_loss
        // Sheet Thickness and Stack Factor are NOT backend fields — removed.
        cmEl.innerHTML =
            kvRow("Material Type",        cm.type) +
            kvRow("Grade / Standard",     cm.grade) +
            kvRow("Density",              cm.density) +
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
        ["Total Losses",      r0(pf.totalLoss) + " W",
         "",                  ""],
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
        ["LV Base Turns per Phase",                s.lv1Turns + " turns"],
        ["Revised Volts per Turn",             revVT + " V"],
        ["Net Core Flux Density (B)",          r2(inp.fluxDensity) + " T"],
        ["Net Core Area (A_net)",              r0(s.A_net) + " mm²"],
        ["Gross Core Area (A_gross)",          r0(s.A_gross) + " mm²"],
        // Stack Factor removed — not in backend return dict
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
        // "Winding Length (eff.)" removed — same value as Net Winding Length (duplicate)
        ["Total Parallel (LV1)",    String((inp.lv1axPar || 1) * (inp.lv1radPar || 1)),
         "LV1 Conductor h (ins.)",  r2(s.lv1_hi) + " mm"],
        ["Total Parallel (LV2)",    String((inp.lv2axPar || 1) * (inp.lv2radPar || 1)),
         "LV1 Conductor Area",      r2(s.lv1_csActual) + " mm²"],
        ["Total Parallel (HV)",     String((inp.hvaxPar  || 1) * (inp.hvradPar  || 1)),
         "LV2 Conductor Area",      r2(s.lv2_csActual) + " mm²"],
        ["",                        "",
         "HV  Conductor Area",      r2(s.hv_csActual)  + " mm²"],
    ]);

    // Core material sub-section
    subHeading("Core Material Summary");
    if (cm) {
        tableHeader2("PARAMETER", "VALUE");
        paramTable([
            ["Material Type",           cm.type],
            ["Grade / Standard",        cm.grade],
            ["Density",                 cm.density],
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
        // Impedance Voltage removed — not in backend return dict
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
            "<td colspan=\"2\"><strong>Total Conductor</strong></td>" +
            "<td class=\"col-num\"><strong>" + r2(wd.total_conductor_kg || 0) + " kg</strong></td>" +
            "<td colspan=\"2\"></td>" +
            "<td class=\"col-num\"><strong>₹ " + r0(wd.total_conductor_cost || 0) + "</strong></td>" +
            "</tr>"
        );

        wBody.innerHTML = rows.join("");
    }

    // ── Summary card — all fields from bm (bom.py return dict) ─────────────────────────
    let totalWeightKg = (bm.active_part_weight_kg || 0) + (bm.enclosure_weight_kg || 0);
    setText("bomInsulationWeight", r2(bm.insulation_kg         || 0) + " kg");
    setText("bomActiveWeight",     r1(bm.active_part_weight_kg || 0) + " kg");
    setText("bomEnclosureWeight",  r1(bm.enclosure_weight_kg   || 0) + " kg");
    setText("bomTotalWeight",      r1(totalWeightKg)                 + " kg");
    setText("bomTotalCost",        "₹ " + r0(bm.total_cost_inr || 0));
    setText("bomCurrency",         bm.currency || "INR");
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