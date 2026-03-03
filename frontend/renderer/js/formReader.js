/* formReader.js — collectInputs() and core-material live note */

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
    let kValue = num("kValue");

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
        windowHeight    : num("windowHeight") || null,

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

        // ── Number of layers (user-specified, sent to backend) ───────────
        lv1Layers : int_("lv1Layers"), lv2Layers : int_("lv2Layers"), hvLayers : int_("hvLayers"),

        // ── Core material ───────────────────────────────────────────────
        coreMaterialType : coreMaterialRaw,
        coreGrade        : sel("coreGrade") || "M4"
    };
}

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