/* app.js — entry point: runCalculation, onCalculationComplete,
   handleSubmit, runCalcBtn wiring.
   Load order: utils → navigation → apiClient → formReader
             → outputRenderer → layoutDiagrams → validation → app */

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

    populateOutput(inputData, result);
    populateTechnicalReport(inputData, result);
    populateWindingCompare(inputData, result);   // 3-column side-by-side winding table
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