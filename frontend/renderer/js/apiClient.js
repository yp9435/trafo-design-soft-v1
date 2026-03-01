/* apiClient.js — buildApiPayload, mapApiResponse, callDesignApi,
   loading/error state, API_BASE constant */

/* =============================================
   API SERVICE LAYER
   POST http://127.0.0.1:8000/design
   ============================================= */
const API_BASE = "http://127.0.0.1:8000";

function buildApiPayload(inp) {
    // ── Exact shape required by input_model.py ────────────────────────────
    // TransformerDesignInput:
    //   transformer_kva, frequency, flux_density, k_value
    //   lv1 / lv2 / hv  → WindingInput (NESTED objects, NOT flat)
    //   core_material    → CoreMaterialInput (NESTED)
    //
    // WindingInput fields:
    //   voltage, kva_rating, conductor_current_density,
    //   conductor_material ("CU"|"AL"),  connection_type ("D"|"Y"),
    //   axial_parallel, radial_parallel
    //
    // DO NOT send: phases, vector_group, insulation_class,
    //              number_of_layers, window_height  — not in the model.

    function windingPayload(voltage, kva, cd, mat, conn, axPar, radPar) {
        return {
            voltage                   : voltage,
            kva_rating                : kva,
            conductor_current_density : cd,
            conductor_material        : mat,    // "CU" | "AL"  (short code)
            connection_type           : conn,   // "D"  | "Y"   (short code)
            axial_parallel            : axPar  || 1,
            radial_parallel           : radPar || 1
        };
    }

    return {
        transformer_kva : inp.ratedPower,
        frequency       : inp.frequency,
        flux_density    : inp.fluxDensity,
        k_value         : inp.kValue,

        lv1 : windingPayload(
            inp.lv1Voltage, inp.lv1kva, inp.lv1cd,
            inp.lv1mat, inp.lv1conn,
            inp.lv1axPar, inp.lv1radPar
        ),
        lv2 : windingPayload(
            inp.lv2Voltage, inp.lv2kva, inp.lv2cd,
            inp.lv2mat, inp.lv2conn,
            inp.lv2axPar, inp.lv2radPar
        ),
        hv  : windingPayload(
            inp.hvVoltage, inp.hvkva, inp.hvcd,
            inp.hvmat, inp.hvconn,
            inp.hvaxPar, inp.hvradPar
        ),

        core_material : {
            material : inp.coreMaterialType,  // "CRGO" | "CRNO"
            grade    : inp.coreGrade          // "M4" | "M3" | "23ZDMH"
        }
    };
}

function mapApiResponse(apiResp) {
    // ── Mode A: already-shaped internal object — pass through ──────────
    if (apiResp.windingSummary && apiResp.coreDesign && apiResp.performance) {
        return apiResp;
    }

    // ── Mode B: map backend JSON → internal shape ───────────────────────
    // Backend top-level keys: core, lv1, lv2, hv, final_core, layout,
    //                         rating_plate, bom
    let c  = apiResp.core         || {};
    let w1 = apiResp.lv1          || {};
    let w2 = apiResp.lv2          || {};
    let wh = apiResp.hv           || {};
    let fc = apiResp.final_core   || {};
    let ly = apiResp.layout       || {};
    let rp = apiResp.rating_plate || {};
    let bm = apiResp.bom          || {};

    // core_dimensions: [tongue_mm, stack_mm]
    let coreDims = c.core_dimensions || [0, 0];
    let tongue   = coreDims[0] || 0;
    let stack    = coreDims[1] || 0;

    // layout sub-objects
    let lyFront = ly.front_view || {};
    let lySide  = ly.side_view  || {};
    let lyTop   = ly.top_view   || {};

    // winding outer dims: [width_mm, height_mm]
    let lv1ID = w1.winding_inner_dimensions || [0, 0];
    let lv1OD = w1.winding_outer_dimensions || [0, 0];
    let lv2ID = w2.winding_inner_dimensions || [0, 0];
    let lv2OD = w2.winding_outer_dimensions || [0, 0];
    let hvID  = wh.winding_inner_dimensions || [0, 0];
    let hvOD  = wh.winding_outer_dimensions || [0, 0];

    // Yoke height = tongue width (square cross-section)
    let yokeHeight  = fc.tongue_width || tongue;
    let limbSpacing = fc.center_distance || 0;

    // Enclosure — definitive source is layout.top_view
    let encL = lyTop.enclosure_length_mm || fc.overall_length || fc.tank_length || 0;
    let encW = lyTop.enclosure_width_mm  || fc.overall_width  || fc.tank_width  || 0;
    let encH = lyTop.enclosure_height_mm || fc.overall_height || fc.tank_height || 0;

    // Turns — lv1 from core.turns_per_phase; lv2/hv derived from voltage ÷ revised vt
    let vt     = c.volts_per_turn || 1;
    let initVT = c.initial_volts_per_turn || vt;
    let lv1Turns = c.turns_per_phase || 0;
    let lv2Turns = w2.turns_per_layer && w2.number_of_layers
                     ? w2.turns_per_layer * w2.number_of_layers
                     : Math.round((w2.voltage_per_phase || 0) / vt);
    let hvTurns  = wh.turns_per_layer && wh.number_of_layers
                     ? wh.turns_per_layer * wh.number_of_layers
                     : Math.round((wh.voltage_per_phase || 0) / vt);

    // Losses
    let totalLoadLoss = (w1.load_loss || 0) + (w2.load_loss || 0) + (wh.load_loss || 0);
    let totalLoss     = totalLoadLoss + (fc.core_loss || 0);

    // Duct gaps between windings (radial clearances)
    let duct1 = (lv2ID[0] - lv1OD[0]) > 0 ? (lv2ID[0] - lv1OD[0]) / 2 : 5;
    let duct2 = (hvID[0]  - lv2OD[0]) > 0 ? (hvID[0]  - lv2OD[0]) / 2 : 10;

    // Core material — pull from bom.core.material if available (e.g. "CRGO-M4")
    let coreMatRaw  = (bm.core && bm.core.material) ? bm.core.material : "CRGO";
    let coreMatType = coreMatRaw.startsWith("CRNO") ? "CRNO Silicon Steel" : "CRGO Silicon Steel";
    let coreGradeStr = coreMatRaw.includes("-") ? coreMatRaw.split("-")[1] : "M4";

    return {
        // ── Winding summary (overview table) ─────────────────────────────
        windingSummary: {
            LV1: {
                turns          : lv1Turns,
                conductorArea  : w1.total_conductor_cross_sectional_area || 0,
                currentDensity : w1.current_density_verification         || 0,
                copperLoss     : w1.load_loss                            || 0
            },
            LV2: {
                turns          : lv2Turns,
                conductorArea  : w2.total_conductor_cross_sectional_area || 0,
                currentDensity : w2.current_density_verification         || 0,
                copperLoss     : w2.load_loss                            || 0
            },
            HV: {
                turns          : hvTurns,
                conductorArea  : wh.total_conductor_cross_sectional_area || 0,
                currentDensity : wh.current_density_verification         || 0,
                copperLoss     : wh.load_loss                            || 0
            }
        },

        // ── Core design summary ──────────────────────────────────────────
        coreDesign: {
            netCoreArea  : c.net_core_area    || 0,
            grossCoreArea: c.gross_core_area  || 0,
            tongue       : tongue,
            stack        : stack,
            windowHeight : fc.window_height   || 0,
            yokeHeight   : yokeHeight,
            coreWeight   : fc.core_weight     || 0,
            limbSpacing  : limbSpacing,
            enc_L        : encL,
            enc_W        : encW,
            enc_H        : encH
        },

        // ── Performance ──────────────────────────────────────────────────
        performance: {
            coreLoss      : fc.core_loss   || 0,
            totalLoadLoss : totalLoadLoss,
            totalLoss     : totalLoss,
            impedance     : rp.impedance_percentage ? parseFloat(rp.impedance_percentage) : 0,
            regulation    : 0
        },

        // ── Radial dims for layout diagrams ──────────────────────────────
        radialDims: {
            coreDia : tongue,
            lv1     : w1.radial_thickness || 0,
            duct1   : duct1,
            lv2     : w2.radial_thickness || 0,
            duct2   : duct2,
            hv      : wh.radial_thickness || 0
        },

        // ── Core material metadata ────────────────────────────────────────
        coreMatMeta: {
            type       : coreMatType,
            grade      : coreGradeStr,
            thickness  : fc.specific_loss <= 0.67 ? "0.23 mm" : "0.27 mm",
            density    : (fc.density || 7.65) + " g/cc",
            stackFactor: fc.build_factor ? (1 / fc.build_factor).toFixed(2) : 0.96,
            specLoss   : fc.specific_loss  || 0,
            buildFactor: fc.build_factor   || 1.3
        },

        ratingPlate : rp,
        bom         : bm,
        layout      : ly,

        // ── Flat steps — all detail fields consumed by output tables ─────
        steps: {
            // Core
            initVT       : initVT,             // initial volts per turn  (before rounding turns)
            vt           : vt,                 // revised volts per turn  (after integer turns)
            A_net        : c.net_core_area    || 0,
            A_gross      : c.gross_core_area  || 0,
            tongue       : tongue,
            stack        : stack,
            windowHeight : fc.window_height   || 0,
            yokeHeight   : yokeHeight,
            limbSpacingA : limbSpacing,
            coreLen_mm   : fc.core_length     || 0,
            coreWeight   : fc.core_weight     || 0,
            coreLoss     : fc.core_loss       || 0,
            enc_L        : encL,
            enc_W        : encW,
            enc_H        : encH,

            // Turns
            lv1Turns : lv1Turns,
            lv2Turns : lv2Turns,
            hvTurns  : hvTurns,

            // Layers & turns-per-layer
            lv1Layers : w1.number_of_layers || 0,
            lv2Layers : w2.number_of_layers || 0,
            hvLayers  : wh.number_of_layers || 0,
            lv1TpL    : w1.turns_per_layer  || 0,
            lv2TpL    : w2.turns_per_layer  || 0,
            hvTpL     : wh.turns_per_layer  || 0,

            // Parallel conductors — backend does not return these; default 1
            lv1Np: 1, lv2Np: 1, hvNp: 1,
            lv1Nr: 1, lv2Nr: 1, hvNr: 1,

            // Phase currents
            lv1CurPhase : w1.current_per_phase || 0,
            lv2CurPhase : w2.current_per_phase || 0,
            hvCurPhase  : wh.current_per_phase || 0,

            // Conductor dimensions (bare & insulated)
            lv1_b  : w1.conductor_breadth            || 0,
            lv1_bi : w1.insulated_conductor_breadth   || 0,
            lv1_h  : w1.conductor_height             || 0,
            lv1_hi : w1.insulated_conductor_height    || 0,
            lv2_b  : w2.conductor_breadth            || 0,
            lv2_bi : w2.insulated_conductor_breadth   || 0,
            lv2_h  : w2.conductor_height             || 0,
            lv2_hi : w2.insulated_conductor_height    || 0,
            hv_b   : wh.conductor_breadth            || 0,
            hv_bi  : wh.insulated_conductor_breadth   || 0,
            hv_h   : wh.conductor_height             || 0,
            hv_hi  : wh.insulated_conductor_height    || 0,

            // Net cross-sectional area & actual current density
            lv1_csActual : w1.total_conductor_cross_sectional_area || 0,
            lv2_csActual : w2.total_conductor_cross_sectional_area || 0,
            hv_csActual  : wh.total_conductor_cross_sectional_area || 0,
            lv1_cd       : w1.current_density_verification         || 0,
            lv2_cd       : w2.current_density_verification         || 0,
            hv_cd        : wh.current_density_verification         || 0,

            // Radial build
            lv1_radThick : w1.radial_thickness || 0,
            lv2_radThick : w2.radial_thickness || 0,
            hv_radThick  : wh.radial_thickness || 0,

            // Interlayer insulation
            lv1_interLayerIns : w1.interlayer_insulation_thickness || 0,
            lv2_interLayerIns : w2.interlayer_insulation_thickness || 0,
            hv_interLayerIns  : wh.interlayer_insulation_thickness || 0,

            // LMT & wire length
            lmt_lv1     : w1.mean_length_of_turn || 0,
            lmt_lv2     : w2.mean_length_of_turn || 0,
            lmt_hv      : wh.mean_length_of_turn || 0,
            wireLen_lv1 : w1.total_wire_length   || 0,
            wireLen_lv2 : w2.total_wire_length   || 0,
            wireLen_hv  : wh.total_wire_length   || 0,

            // Resistance @ 75 °C
            R75_lv1 : w1.resistance_per_phase_75C || 0,
            R75_lv2 : w2.resistance_per_phase_75C || 0,
            R75_hv  : wh.resistance_per_phase_75C || 0,

            // Weights (bare / insulated / procurement)
            bareWt_lv1 : w1.bare_weight        || 0,
            bareWt_lv2 : w2.bare_weight        || 0,
            bareWt_hv  : wh.bare_weight        || 0,
            insWt_lv1  : w1.insulated_weight   || 0,
            insWt_lv2  : w2.insulated_weight   || 0,
            insWt_hv   : wh.insulated_weight   || 0,
            procWt_lv1 : w1.procurement_weight || 0,
            procWt_lv2 : w2.procurement_weight || 0,
            procWt_hv  : wh.procurement_weight || 0,

            // Losses & temperature gradient
            strayPct_lv1 : w1.stray_loss_percentage       || 0,
            strayPct_lv2 : w2.stray_loss_percentage       || 0,
            strayPct_hv  : wh.stray_loss_percentage       || 0,
            gradient_lv1 : w1.winding_temperature_gradient || 0,
            gradient_lv2 : w2.winding_temperature_gradient || 0,
            gradient_hv  : wh.winding_temperature_gradient || 0,
            ll_lv1       : w1.load_loss        || 0,
            ll_lv2       : w2.load_loss        || 0,
            ll_hv        : wh.load_loss        || 0,
            totalLoadLoss: totalLoadLoss,
            totalLoss    : totalLoss,

            // Per-winding window details (each winding returns its own window_height)
            windowHeight_lv1  : w1.window_height  || 0,
            windowHeight_lv2  : w2.window_height  || 0,
            windowHeight_hv   : wh.window_height  || 0,
            windingLength_lv1 : w1.winding_length || 0,
            windingLength_lv2 : w2.winding_length || 0,
            windingLength_hv  : wh.winding_length || 0,
            endClearance_lv1  : w1.end_clearance  || 0,
            endClearance_lv2  : w2.end_clearance  || 0,
            endClearance_hv   : wh.end_clearance  || 0,

            // Number of ducts per winding (backend field: number_of_ducts or duct_count)
            ducts_lv1 : w1.number_of_ducts || w1.duct_count || 0,
            ducts_lv2 : w2.number_of_ducts || w2.duct_count || 0,
            ducts_hv  : wh.number_of_ducts || wh.duct_count || 0,
            // Shared window height (all windings must fit the same window)
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