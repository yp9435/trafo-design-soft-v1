/* layoutDiagrams.js
   Exactly matches Step 66 enclosure design reference:
   Diagram 1 → Side Elevation  — stacked zones + right open-arrow leaders
   Diagram 2 → Plan View       — enclosure top-down with ALL 10 clearance labels
   Diagram 3 → Front Elevation — 3D oblique box, D/A/L annotations
   ─────────────────────────────────────────────────────────────────────────
   BACKEND ALIGNMENT (layout_designer.py):
     front_view:  D_core_tongue_width_mm, A_limb_center_to_center_mm,
                  L_window_height_mm, yoke_depth_mm
     side_view:   core_foot_with_insulation_mm, window_height_mm,
                  octc_to_cover_mm, hv/lv1/lv2_radial_depth_mm
     top_view:    enclosure_length/width/height_mm, center_to_center_mm,
                  num_phases, length_breakdown{end_clearance_each_side_mm,
                  inter_phase_gap_mm, hv_od_width_per_phase_mm},
                  width_breakdown{clearance_each_side_mm, base_plate_thickness_mm}
   ─────────────────────────────────────────────────────────────────────────
   All label values update automatically on every Calculate press.           */

/* ══ Live dimension store ═══════════════════════════════════════════════ */
let ldDims = {
    coreDia       : 95,
    yokeHeight    : 95,
    windowHeight  : 210,
    limbSpacing   : 260,   /* centre-to-centre distance between limbs */
    hvOD          : 249,   /* HV winding outer dimension (square) */
    lv1OD         : 130,
    lv2OD         : 180,
    lv1Height     : 210,
    lv2Height     : 210,
    hvHeight      : 210,
    /* clearances from backend breakdown */
    endClearance  : 50,
    sideClearance : 50,
    baseplate     : 25,
    interPhaseGap : 9,
    coreFootIns   : 10,
    octcToCover   : 100,
    /* enclosure totals */
    numLimbs      : 3,
    encLength     : 865,
    encWidth      : 449,
    encHeight     : 535,
};

/* ══ Feed backend response — called from app.js after every Calculate ════ */
function updateLayoutDimensions(data) {
    if (!data) return;

    var s       = data.steps      || {};
    var rd      = data.radialDims || {};
    var ly      = data.layout     || {};
    var lyFront = ly.front_view   || {};
    var lySide  = ly.side_view    || {};
    var lyTop   = ly.top_view     || {};
    /* layout_designer.py top_view breakdown objects */
    var lenBrk  = lyTop.length_breakdown || {};
    var widBrk  = lyTop.width_breakdown  || {};
    var hgtBrk  = lyTop.height_breakdown || {};

    /* ── Core geometry ── */
    if (lyFront.D_core_tongue_width_mm)          ldDims.coreDia      = lyFront.D_core_tongue_width_mm;
    else if (s.tongue)                            ldDims.coreDia      = s.tongue;

    if (lyFront.yoke_depth_mm)                   ldDims.yokeHeight   = lyFront.yoke_depth_mm;
    else if (s.yokeHeight)                        ldDims.yokeHeight   = s.yokeHeight;

    if (lyFront.L_window_height_mm)              ldDims.windowHeight = lyFront.L_window_height_mm;
    else if (lySide.window_height_mm)            ldDims.windowHeight = lySide.window_height_mm;
    else if (s.windowHeight)                     ldDims.windowHeight = s.windowHeight;

    /* limb c-c: top_view.center_to_center_mm is authoritative */
    if (lyTop.center_to_center_mm)               ldDims.limbSpacing  = lyTop.center_to_center_mm;
    else if (lyFront.A_limb_center_to_center_mm) ldDims.limbSpacing  = lyFront.A_limb_center_to_center_mm;
    else if (s.limbSpacingA)                     ldDims.limbSpacing  = s.limbSpacingA;

    /* ── Winding OD dimensions ── */
    if (lySide.hv_radial_depth_mm  > 0) ldDims.hvOD  = lySide.hv_radial_depth_mm;
    else if (lenBrk.hv_od_width_per_phase_mm)    ldDims.hvOD  = lenBrk.hv_od_width_per_phase_mm;
    if (lySide.lv1_radial_depth_mm > 0) ldDims.lv1OD = lySide.lv1_radial_depth_mm;
    if (lySide.lv2_radial_depth_mm > 0) ldDims.lv2OD = lySide.lv2_radial_depth_mm;

    /* ── Clearances from layout_designer.py breakdown objects ── */
    if (lenBrk.end_clearance_each_side_mm !== undefined) ldDims.endClearance  = lenBrk.end_clearance_each_side_mm;
    if (lenBrk.inter_phase_gap_mm         !== undefined) ldDims.interPhaseGap = lenBrk.inter_phase_gap_mm;
    if (widBrk.clearance_each_side_mm     !== undefined) ldDims.sideClearance = widBrk.clearance_each_side_mm;
    if (widBrk.base_plate_thickness_mm    !== undefined) ldDims.baseplate     = widBrk.base_plate_thickness_mm;
    /* side_view also carries these directly */
    if (lySide.core_foot_with_insulation_mm)             ldDims.coreFootIns   = lySide.core_foot_with_insulation_mm;
    else if (hgtBrk.core_foot_insulation_mm)             ldDims.coreFootIns   = hgtBrk.core_foot_insulation_mm;
    if (lySide.octc_to_cover_mm)                         ldDims.octcToCover   = lySide.octc_to_cover_mm;
    else if (hgtBrk.octc_to_cover_mm)                   ldDims.octcToCover   = hgtBrk.octc_to_cover_mm;

    /* ── Enclosure totals ── */
    if (lyTop.num_phases)          ldDims.numLimbs  = lyTop.num_phases;
    if (lyTop.enclosure_length_mm) ldDims.encLength = lyTop.enclosure_length_mm;
    if (lyTop.enclosure_width_mm)  ldDims.encWidth  = lyTop.enclosure_width_mm;
    if (lyTop.enclosure_height_mm) ldDims.encHeight = lyTop.enclosure_height_mm;

    /* ── Winding axial heights ── */
    ldDims.lv1Height = s.windingLength_lv1 || s.windingLength || ldDims.windowHeight;
    ldDims.lv2Height = s.windingLength_lv2 || s.windingLength || ldDims.windowHeight;
    ldDims.hvHeight  = s.windingLength_hv  || s.windingLength || ldDims.windowHeight;

    updateLayoutUI(ldDims);
    drawAllDiagrams(ldDims);
}

function updateLayoutUI(d) {
    d = d || ldDims;
    function sv(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
    sv("ldCoreDia",  d.coreDia    + " mm");
    sv("ldLV1rad",   d.lv1OD     + " mm");
    sv("ldLV2rad",   d.lv2OD     + " mm");
    sv("ldHVrad",    d.hvOD      + " mm");
    sv("ldLV1ax",    d.lv1Height + " mm");  sv("ldAxLV1",  d.lv1Height  + " mm");
    sv("ldLV2ax",    d.lv2Height + " mm");  sv("ldAxLV2",  d.lv2Height  + " mm");
    sv("ldHVax",     d.hvHeight  + " mm");  sv("ldAxHV",   d.hvHeight   + " mm");
    sv("ldYokeax",   d.yokeHeight + " mm"); sv("ldAxYoke", d.yokeHeight + " mm");
}

function drawAllDiagrams(d) {
    d = d || ldDims;
    drawSideElevation(d);
    drawPlanView(d);
    drawFrontElevation(d);
}

/* ══ Canvas helper ═══════════════════════════════════════════════════════ */
function makeCtx(id) {
    var c = document.getElementById(id);
    if (!c) return null;
    var ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#f8f6f0";
    ctx.fillRect(0, 0, c.width, c.height);
    return { ctx: ctx, W: c.width, H: c.height };
}

/* ══ Engineering dimension line (double-headed arrow) ════════════════════ */
function dimLine(ctx, x1, y1, x2, y2, label, offset, col, fs) {
    col = col || "#1a1a1a"; fs = fs || 9;
    var ang  = Math.atan2(y2 - y1, x2 - x1);
    var perp = ang - Math.PI / 2;
    var ox = Math.cos(perp) * offset, oy = Math.sin(perp) * offset;
    var ax1 = x1 + ox, ay1 = y1 + oy, ax2 = x2 + ox, ay2 = y2 + oy;
    ctx.save();
    /* extension lines (dashed) */
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = "rgba(80,80,80,0.4)"; ctx.lineWidth = 0.55;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ax1, ay1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(ax2, ay2); ctx.stroke();
    ctx.setLineDash([]);
    /* dimension line */
    ctx.strokeStyle = col; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(ax1, ay1); ctx.lineTo(ax2, ay2); ctx.stroke();
    /* arrowheads */
    function arr(px, py, a) {
        ctx.fillStyle = col; ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - 7 * Math.cos(a - 0.32), py - 7 * Math.sin(a - 0.32));
        ctx.lineTo(px - 7 * Math.cos(a + 0.32), py - 7 * Math.sin(a + 0.32));
        ctx.closePath(); ctx.fill();
    }
    arr(ax1, ay1, ang + Math.PI); arr(ax2, ay2, ang);
    /* label in white clearance box */
    if (label) {
        var mx = (ax1 + ax2) / 2, my = (ay1 + ay2) / 2;
        ctx.font = "bold " + fs + "px Arial";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        var tw = ctx.measureText(label).width + 6;
        ctx.fillStyle = "#f8f6f0"; ctx.fillRect(mx - tw / 2, my - fs / 2 - 2, tw, fs + 4);
        ctx.fillStyle = col; ctx.fillText(label, mx, my);
    }
    ctx.restore();
}

/* ══ Open arrow leader: start → arrowhead → text (Step 66 side elev style) */
function leaderArrow(ctx, fromX, midY, label, col, fs) {
    col = col || "#1a1a1a"; fs = fs || 9;
    var lineLen = 18, arrowGap = 9;
    ctx.save();
    ctx.strokeStyle = col; ctx.lineWidth = 0.85;
    ctx.beginPath(); ctx.moveTo(fromX, midY); ctx.lineTo(fromX + lineLen + arrowGap, midY); ctx.stroke();
    /* open arrowhead pointing right */
    ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(fromX + lineLen + arrowGap, midY);
    ctx.lineTo(fromX + lineLen, midY - 4);
    ctx.lineTo(fromX + lineLen, midY + 4);
    ctx.closePath(); ctx.fill();
    ctx.font = fs + "px Arial";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillStyle = col;
    ctx.fillText(label, fromX + lineLen + arrowGap + 5, midY);
    ctx.restore();
}

function T(ctx, s, x, y, col, fs, al, ba) {
    ctx.save();
    ctx.fillStyle = col || "#1a1a1a"; ctx.font = (fs || 9) + "px Arial";
    ctx.textAlign = al || "center"; ctx.textBaseline = ba || "middle";
    ctx.fillText(s, x, y); ctx.restore();
}

/* ══════════════════════════════════════════════════════════════════════════
   DIAGRAM 1 — SIDE ELEVATION
   Matches Step 66 reference:
   • Left vertical axis line
   • OCTC circle symbol at top (open, arrow inside pointing right)
   • Top yoke □ → window zone (narrower limb) → bottom yoke □ → foot strip
   • Right side: open arrow leaders → "Label = X mm"
   ══════════════════════════════════════════════════════════════════════════ */
function drawSideElevation(d) {
    var cv = makeCtx("canvasSide"); if (!cv) return;
    var ctx = cv.ctx, W = cv.W, H = cv.H;

    var foot = Math.round(d.coreFootIns);
    var yoke = Math.round(d.yokeHeight);
    var win  = Math.round(d.windowHeight);
    var octc = Math.round(d.octcToCover);
    var total = octc + yoke + win + yoke + foot;

    var ml = 30, mr = 215, mt = 24, mb = 16;
    var dH = H - mt - mb;
    var sc = dH / total;

    var colW = 50;
    var colX = ml + 6;

    /* Zone Y boundaries (top → bottom) */
    var Yo = mt;
    var Y1 = Yo + octc * sc;
    var Y2 = Y1 + yoke * sc;
    var Y3 = Y2 + win  * sc;
    var Y4 = Y3 + yoke * sc;
    var Y5 = Y4 + foot * sc;

    /* ── Left vertical axis line ── */
    ctx.save();
    ctx.strokeStyle = "#333"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(colX - 4, Yo); ctx.lineTo(colX - 4, Y5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(colX - 12, Yo); ctx.lineTo(colX + colW + 4, Yo); ctx.stroke();
    ctx.restore();

    /* ── OCTC zone: circle symbol (no bounding box — exactly as in ref) ── */
    var ocCX = colX + colW / 2;
    var ocCY = Yo + octc * sc * 0.44;
    var ocR  = Math.min(14, octc * sc * 0.30);
    ctx.strokeStyle = "#222"; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(ocCX, ocCY, ocR, 0, Math.PI * 2); ctx.stroke();
    /* open arrow inside circle pointing right */
    ctx.fillStyle = "#222"; ctx.beginPath();
    ctx.moveTo(ocCX + ocR, ocCY);
    ctx.lineTo(ocCX + ocR - 7, ocCY - 3.5);
    ctx.lineTo(ocCX + ocR - 7, ocCY + 3.5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(ocCX, ocCY, 1.8, 0, Math.PI * 2); ctx.fill();
    /* thin line from circle bottom down to top yoke */
    ctx.strokeStyle = "#555"; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(ocCX, ocCY + ocR + 1); ctx.lineTo(ocCX, Y1); ctx.stroke();

    /* ── Top yoke box ── */
    ctx.fillStyle = "rgba(155,170,185,0.30)";
    ctx.strokeStyle = "#333"; ctx.lineWidth = 1;
    ctx.fillRect(colX, Y1, colW, yoke * sc);
    ctx.strokeRect(colX, Y1, colW, yoke * sc);

    /* ── Window zone (narrower limb column) ── */
    var lW = colW * 0.50, lX = colX + (colW - lW) / 2;
    ctx.fillStyle = "rgba(170,185,200,0.20)";
    ctx.strokeStyle = "#333"; ctx.lineWidth = 1;
    ctx.fillRect(lX, Y2, lW, win * sc);
    ctx.strokeRect(lX, Y2, lW, win * sc);

    /* ── Bottom yoke box ── */
    ctx.fillStyle = "rgba(155,170,185,0.30)";
    ctx.strokeStyle = "#333"; ctx.lineWidth = 1;
    ctx.fillRect(colX, Y3, colW, yoke * sc);
    ctx.strokeRect(colX, Y3, colW, yoke * sc);

    /* ── Core foot strip ── */
    ctx.fillStyle = "rgba(190,178,130,0.45)";
    ctx.strokeStyle = "#555"; ctx.lineWidth = 0.8;
    ctx.fillRect(colX - 3, Y4, colW + 6, foot * sc);
    ctx.strokeRect(colX - 3, Y4, colW + 6, foot * sc);

    /* ── Leader arrows (right side) — exactly matching Step 66 ── */
    var lX2 = colX + colW + 10;

    leaderArrow(ctx, lX2, (Yo + Y1) / 2, "OCTC to cover = " + octc + " mm");
    leaderArrow(ctx, lX2, (Y1 + Y2) / 2, "Top yoke = " + yoke + " mm");
    leaderArrow(ctx, lX2, (Y2 + Y3) / 2, "Window height = " + win  + " mm");
    leaderArrow(ctx, lX2, (Y3 + Y4) / 2, "Bottom yoke = " + yoke + " mm");
    leaderArrow(ctx, lX2, (Y4 + Y5) / 2, "Core foot with insulation = " + foot + " mm");

    T(ctx, "SIDE ELEVATION", W / 2, mt - 12, "#222", 9.5);
    T(ctx, "Diagram 1", W / 2, H - 7, "#666", 8.5);
}

/* ══════════════════════════════════════════════════════════════════════════
   DIAGRAM 2 — PLAN VIEW (top-down)
   Matches Step 66 reference exactly:
   Formula: L = endC + hvOD×n + iGap×(n-1) + endC
            W = hvOD + 2×sideC + baseplate
   Labels:
     260 (A, limb c-c) — above, between coil 1 & 2 centres
     50  — end clearances left & right (horizontal)
     9   — inter-phase gaps between coils
     249 — HV OD label inside first coil square
     324 — enclosure width on left (vertical)
     50  — top side clearance and bottom side clearance (left vertical)
     25  — base plate (right side vertical)
     total encL — across the very top
   ══════════════════════════════════════════════════════════════════════════ */
function drawPlanView(d) {
    var cv = makeCtx("canvasTop"); if (!cv) return;
    var ctx = cv.ctx, W = cv.W, H = cv.H;

    var n    = d.numLimbs    || 3;
    var hvOD = Math.round(d.hvOD);
    var encL = Math.round(d.encLength);
    var encW = Math.round(d.encWidth);
    var bpT  = Math.round(d.baseplate);
    var endC = Math.round(d.endClearance);
    var sideC = Math.round(d.sideClearance);
    var iGap = Math.round(d.interPhaseGap);
    var A    = Math.round(d.limbSpacing);   /* centre-to-centre */

    var ml = 46, mr = 40, mt = 48, mb = 40;
    var dW = W - ml - mr, dH = H - mt - mb;
    var sc = Math.min(dW / encL, dH / encW);
    var rL = encL * sc, rW = encW * sc;
    var ox = ml + (dW - rL) / 2, oy = mt + (dH - rW) / 2;

    /* ── Enclosure outline ── */
    ctx.fillStyle = "#eeecea";
    ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1.4;
    ctx.fillRect(ox, oy, rL, rW); ctx.strokeRect(ox, oy, rL, rW);

    /* ── Base plate strip (bottom edge inside enclosure) ── */
    var bpH = bpT * sc;
    ctx.fillStyle = "#c8c8be";
    ctx.strokeStyle = "#555"; ctx.lineWidth = 0.7;
    ctx.fillRect(ox, oy + rW - bpH, rL, bpH);
    ctx.strokeRect(ox, oy + rW - bpH, rL, bpH);

    /* ── Coil centre positions ──
       From backend: encL = 2×endC + n×hvOD + (n-1)×iGap
       First coil left edge = ox + endC*sc → centre = ox + endC*sc + hvOD*sc/2
       Subsequent centres spaced by A = hvOD + iGap                       ── */
    var usableH = (encW - bpT) * sc;
    var centY   = oy + usableH / 2;
    var coilS   = hvOD * sc;

    var firstCX = ox + endC * sc + hvOD * sc / 2;
    var cXs = [];
    for (var i = 0; i < n; i++) cXs.push(firstCX + i * A * sc);

    /* ── Draw each coil assembly ── */
    cXs.forEach(function (cx, ci) {
        var x0 = cx - coilS / 2, y0c = centY - coilS / 2;

        /* Coil square — white fill, black border */
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1.1;
        ctx.fillRect(x0, y0c, coilS, coilS);
        ctx.strokeRect(x0, y0c, coilS, coilS);

        /* Core (hatched square) inside coil */
        var coreS = d.coreDia * sc;
        var cx0 = cx - coreS / 2, cy0 = centY - coreS / 2;
        ctx.fillStyle = "#d2d6da";
        ctx.strokeStyle = "#444"; ctx.lineWidth = 0.65;
        ctx.fillRect(cx0, cy0, coreS, coreS);
        ctx.strokeRect(cx0, cy0, coreS, coreS);
        ctx.save();
        ctx.beginPath(); ctx.rect(cx0, cy0, coreS, coreS); ctx.clip();
        ctx.strokeStyle = "rgba(60,80,100,0.22)"; ctx.lineWidth = 0.5;
        for (var t = -coreS; t < coreS * 2; t += 4) {
            ctx.beginPath(); ctx.moveTo(cx0 + t, cy0); ctx.lineTo(cx0 + t + coreS, cy0 + coreS); ctx.stroke();
        }
        ctx.restore();

        /* HV OD label — bottom-left inside first coil square (like "249" in ref) */
        if (ci === 0) {
            ctx.font = "bold 8.5px Arial";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillStyle = "#1a1a1a";
            ctx.fillText("" + hvOD, x0 + coilS * 0.30, y0c + coilS * 0.80);
        }

        /* Core foot bracket below each coil (like ref photo) */
        var ftW = coreS * 0.85, ftH = bpH * 0.80;
        ctx.fillStyle = "#c2c6c0";
        ctx.strokeStyle = "#555"; ctx.lineWidth = 0.6;
        ctx.fillRect(cx - ftW / 2, y0c + coilS, ftW, ftH);
        ctx.strokeRect(cx - ftW / 2, y0c + coilS, ftW, ftH);
    });

    /* ══ Dimension annotations — matching Step 66 exactly ══ */

    /* 1. Limb c-c arrow (A = 260) — above first and second coil, with ←→ */
    if (n >= 2) {
        var topOfCoils = centY - coilS / 2;
        dimLine(ctx, cXs[0], topOfCoils - 20, cXs[1], topOfCoils - 20,
                "" + A, -5, "#1a1a1a", 9);
    }

    /* 2. End clearance LEFT — horizontal at mid-height of coil zone */
    dimLine(ctx, ox, centY, cXs[0] - coilS / 2, centY, "" + endC, 0, "#1a1a1a", 8.5);

    /* 3. End clearance RIGHT */
    dimLine(ctx, cXs[n - 1] + coilS / 2, centY, ox + rL, centY, "" + endC, 0, "#1a1a1a", 8.5);

    /* 4. Inter-phase gaps */
    for (var i = 0; i < n - 1; i++) {
        var gL = cXs[i] + coilS / 2, gR = cXs[i + 1] - coilS / 2;
        if (gR - gL > 2) {
            dimLine(ctx, gL, centY, gR, centY, "" + iGap, 0, "#1a1a1a", 8.5);
        }
    }

    /* 5. Enclosure total length (very top) */
    dimLine(ctx, ox, oy - 26, ox + rL, oy - 26, "" + encL, -5, "#1a1a1a", 8.5);

    /* 6. Enclosure width / depth (left vertical) — "324" in ref */
    dimLine(ctx, ox - 14, oy, ox - 14, oy + rW, "" + encW, -5, "#1a1a1a", 8.5);

    /* 7. Top side clearance (encl top → coil top) — left margin */
    var coilTop = centY - coilS / 2;
    var coilBot = centY + coilS / 2;
    dimLine(ctx, ox - 30, oy, ox - 30, coilTop, "" + sideC, -5, "#1a1a1a", 7.5);

    /* 8. Bottom side clearance (coil bottom → inner bottom above base plate) */
    var innerBot = oy + rW - bpH;
    dimLine(ctx, ox - 30, coilBot, ox - 30, innerBot, "" + sideC, -5, "#1a1a1a", 7.5);

    /* 9. Base plate thickness (right vertical) — "25" in ref */
    dimLine(ctx, ox + rL + 18, oy + rW - bpH, ox + rL + 18, oy + rW, "" + bpT, -4, "#1a1a1a", 7.5);

    /* 10. Right-side top & bottom clearances — matching ref's "50↑" and "50↓" on right */
    dimLine(ctx, ox + rL + 34, oy, ox + rL + 34, coilTop, "" + sideC, -4, "#1a1a1a", 7.5);
    dimLine(ctx, ox + rL + 34, coilBot, ox + rL + 34, innerBot, "" + sideC, -4, "#1a1a1a", 7.5);

    T(ctx, "PLAN VIEW — TOP DOWN (ENCLOSURE FOOTPRINT)", W / 2, mt - 28, "#222", 9.5);
    T(ctx, "Diagram 2", W / 2, H - 10, "#666", 8.5);
}

/* ══════════════════════════════════════════════════════════════════════════
   DIAGRAM 3 — FRONT ELEVATION (3D oblique)
   Matches Step 66 / ref photo 3:
   Box in oblique projection, 2 window openings (H-shaped core).
   D label (top-right corner, diagonal leader)
   A label (horizontal ←→ in window zone)
   L label (vertical up-arrow left of windows)
   Dashed back edges on right side.
   ══════════════════════════════════════════════════════════════════════════ */
function drawFrontElevation(d) {
    var cv = makeCtx("canvasFront"); if (!cv) return;
    var ctx = cv.ctx, W = cv.W, H = cv.H;

    var D  = Math.round(d.yokeHeight);
    var L  = Math.round(d.windowHeight);
    var A  = Math.round(d.limbSpacing);
    var Tg = Math.round(d.coreDia);
    var n  = d.numLimbs || 3;

    var TH = 2 * D + L;
    var TW = (n - 1) * A + Tg;

    /* Shallow oblique angle to match reference style */
    var oblAng = 30 * Math.PI / 180;
    var oblFac = 0.28;
    var depMM  = D;

    var ml = 40, mr = 64, mt = 42, mb = 42;
    var dW = W - ml - mr, dH = H - mt - mb;

    var depEstX = depMM * oblFac * Math.cos(oblAng);
    var depEstY = depMM * oblFac * Math.sin(oblAng);
    var sc = Math.min(dW / (TW + depEstX * 1.2), dH / (TH + depEstY * 1.2)) * 0.83;

    var depPx = depMM * oblFac * sc;
    var dx = Math.cos(oblAng) * depPx;
    var dy = Math.sin(oblAng) * depPx;

    var fW = TW * sc, fH = TH * sc;
    var fx0 = ml, fy0 = mt + dy;

    function poly(pts, fill, stroke, lw) {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath();
        if (fill)   { ctx.fillStyle = fill;   ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
    }

    var FL = fx0, FT = fy0, FR = fx0 + fW, FB = fy0 + fH;

    /* 3 faces: top, right (side), front */
    poly([[FL, FT], [FR, FT], [FR + dx, FT - dy], [FL + dx, FT - dy]], "#dde0db", "#333", 1);
    poly([[FR, FT], [FR + dx, FT - dy], [FR + dx, FB - dy], [FR, FB]],  "#c0c4c8", "#333", 1);
    poly([[FL, FT], [FR, FT], [FR, FB], [FL, FB]],                       "#d2d4d2", "#333", 1.1);

    /* ── 2 window openings (H-core cross section) ── */
    var limbXs = [];
    for (var i = 0; i < n; i++) limbXs.push(fx0 + i * A * sc);

    for (var i = 0; i < n - 1; i++) {
        var wx = limbXs[i] + Tg * sc;
        var wy = fy0 + D * sc;
        var ww = (A - Tg) * sc;
        var wh = L * sc;
        poly([[wx, wy], [wx + ww, wy], [wx + ww, wy + wh], [wx, wy + wh]],
              "#c4ccd0", "#444", 0.8);
        poly([[wx, wy], [wx + ww, wy], [wx + ww + dx, wy - dy], [wx + dx, wy - dy]],
              "rgba(200,214,222,0.55)", "#555", 0.6);
    }

    /* Redraw front-face borders clean on top */
    ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1.1;
    ctx.strokeRect(fx0, fy0, fW, fH);
    for (var i = 0; i < n - 1; i++) {
        ctx.strokeRect(limbXs[i] + Tg * sc, fy0 + D * sc, (A - Tg) * sc, L * sc);
    }
    ctx.beginPath();
    ctx.moveTo(FL, FT); ctx.lineTo(FL + dx, FT - dy); ctx.lineTo(FR + dx, FT - dy); ctx.lineTo(FR, FT); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(FR, FT); ctx.lineTo(FR + dx, FT - dy); ctx.lineTo(FR + dx, FB - dy); ctx.lineTo(FR, FB); ctx.stroke();

    /* Dashed back edges */
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = "#666"; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(FR + dx, FT - dy); ctx.lineTo(FR + dx, FB - dy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(FL + dx, FB - dy); ctx.lineTo(FR + dx, FB - dy); ctx.stroke();
    ctx.restore();

    /* ══ Annotations ══ */

    /* L = window height — vertical arrow left of first window */
    var w0x = limbXs[0] + Tg * sc;
    var wyT = fy0 + D * sc, wyB = fy0 + (D + L) * sc;
    ctx.save();
    ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(w0x - 5, wyT); ctx.lineTo(w0x - 5, wyB); ctx.stroke();
    ctx.fillStyle = "#1a1a1a"; ctx.beginPath();
    ctx.moveTo(w0x - 5, wyT); ctx.lineTo(w0x - 10, wyT + 8); ctx.lineTo(w0x, wyT + 8);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    T(ctx, "L = " + L, w0x - 28, (wyT + wyB) / 2, "#1a1a1a", 9);

    /* A = limb c-c — horizontal ←→ in window zone */
    if (n >= 2) {
        var lc0 = limbXs[0] + Tg * sc / 2;
        var lc1 = limbXs[1] + Tg * sc / 2;
        var ay  = fy0 + D * sc + L * sc / 2;
        ctx.save();
        ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.moveTo(lc0, ay); ctx.lineTo(lc1, ay); ctx.stroke();
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath(); ctx.moveTo(lc0, ay); ctx.lineTo(lc0 + 9, ay - 4); ctx.lineTo(lc0 + 9, ay + 4); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(lc1, ay); ctx.lineTo(lc1 - 9, ay - 4); ctx.lineTo(lc1 - 9, ay + 4); ctx.closePath(); ctx.fill();
        ctx.restore();
        T(ctx, "A = " + A, (lc0 + lc1) / 2, ay + 14, "#1a1a1a", 9);
    }

    /* D = tongue/depth — diagonal leader from top-right oblique corner */
    var trX = FR + dx, trY = FT - dy;
    var dlx = trX + 18, dly = trY - 16;
    ctx.save();
    ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 0.85;
    ctx.beginPath(); ctx.moveTo(trX + 2, trY - 2); ctx.lineTo(dlx, dly); ctx.stroke();
    ctx.font = "bold 9px Arial"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#1a1a1a"; ctx.fillText("D = " + D, dlx + 3, dly);
    ctx.restore();

    T(ctx, "FRONT ELEVATION", W / 2, mt - 22, "#222", 9.5);
    T(ctx, "Diagram 3", W / 2, H - 10, "#666", 8.5);
}

/* ══ Init & event wiring ══════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", function () {
    drawAllDiagrams(ldDims);
    updateLayoutUI(ldDims);
});

document.querySelectorAll(".nav-item").forEach(function (item) {
    if (item.getAttribute("data-page") === "layout-design") {
        item.addEventListener("click", function () {
            setTimeout(function () { drawAllDiagrams(ldDims); }, 60);
        });
    }
});

document.addEventListener("DOMContentLoaded", function () {
    var btn;
    btn = document.getElementById("ldExportPdf");
    if (btn) btn.addEventListener("click", function () { printPage([".ld-export-bar"]); });

    btn = document.getElementById("ldExportSvg");
    if (btn) btn.addEventListener("click", function () {
        var ids = ["canvasSide", "canvasTop", "canvasFront"];
        var parts = ['<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="580">'];
        var yOff = 0;
        ids.forEach(function (id) {
            var c = document.getElementById(id); if (!c) return;
            var url = c.toDataURL("image/png");
            parts.push('<image x="10" y="' + yOff + '" width="' + c.width + '" height="' + c.height + '" xlink:href="' + url + '"/>');
            yOff += c.height + 10;
        });
        parts.push("</svg>");
        var blob = new Blob([parts.join("")], { type: "image/svg+xml" });
        var href = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = href; a.download = "layout_design.svg"; a.click();
        URL.revokeObjectURL(href);
    });
});