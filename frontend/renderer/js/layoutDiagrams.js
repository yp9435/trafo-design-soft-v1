/* layoutDiagrams.js — accurate transformer engineering layout drawings
   matching standard textbook conventions (3-limb core, concentric windings)
   Front Elevation | Side Elevation | Plan View (Top)
   All dimensions from backend response. */

// ── Global layout state — defaults before first calculation ─────────────
let ldDims = {
    coreDia             : 90,    // tongue width (D) mm
    lv1Radial           : 36,    // LV1 radial build mm
    duct1               : 10,    // air duct between LV1 and LV2 mm
    lv2Radial           : 21,    // LV2 radial build mm
    duct2               : 15,    // air duct between LV2 and HV mm
    hvRadial            : 34,    // HV radial build mm
    lv1Height           : 162,   // LV1 winding axial height mm
    lv2Height           : 162,
    hvHeight            : 162,
    yokeHeight          : 90,    // yoke depth (D) mm
    windowHeight        : 198,   // window opening height (L) mm
    coreFootInsulation  : 10,    // core foot pad mm
    limbSpacing         : 412,   // A = c-c between limbs mm
    numLimbs            : 3,
    encLength           : 1084,
    encWidth            : 447,
    encHeight           : 488
};

/* ── Feed all layout dimensions from backend result ────────────────────── */
function updateLayoutDimensions(data) {
    if (!data) return;
    let s       = data.steps       || {};
    let rd      = data.radialDims  || {};
    let ly      = data.layout      || {};
    let lyFront = ly.front_view    || {};
    let lySide  = ly.side_view     || {};
    let lyTop   = ly.top_view      || {};

    ldDims.coreDia      = lyFront.D_core_tongue_width_mm         || s.tongue        || ldDims.coreDia;
    ldDims.yokeHeight   = lyFront.yoke_depth_mm                  || s.yokeHeight    || ldDims.yokeHeight;
    ldDims.windowHeight = lyFront.L_window_height_mm             || s.windowHeight  || ldDims.windowHeight;
    ldDims.limbSpacing  = lyFront.A_limb_center_to_center_mm     || s.limbSpacingA  || ldDims.limbSpacing;
    ldDims.lv1Radial    = lySide.lv1_radial_depth_mm || rd.lv1 || ldDims.lv1Radial;
    ldDims.lv2Radial    = lySide.lv2_radial_depth_mm || rd.lv2 || ldDims.lv2Radial;
    ldDims.hvRadial     = lySide.hv_radial_depth_mm  || rd.hv  || ldDims.hvRadial;
    ldDims.duct1        = rd.duct1 || ldDims.duct1;
    ldDims.duct2        = rd.duct2 || ldDims.duct2;
    ldDims.lv1Height    = s.windingLength_lv1 || s.windingLength || ldDims.windowHeight;
    ldDims.lv2Height    = s.windingLength_lv2 || s.windingLength || ldDims.windowHeight;
    ldDims.hvHeight     = s.windingLength_hv  || s.windingLength || ldDims.windowHeight;
    ldDims.coreFootInsulation = lySide.core_foot_with_insulation_mm || 10;
    ldDims.numLimbs     = lyTop.num_phases || 3;
    ldDims.encLength    = lyTop.enclosure_length_mm || ldDims.encLength;
    ldDims.encWidth     = lyTop.enclosure_width_mm  || ldDims.encWidth;
    ldDims.encHeight    = lyTop.enclosure_height_mm || ldDims.encHeight;

    updateLayoutUI(ldDims);
    drawAllDiagrams(ldDims);
}

function updateLayoutUI(d) {
    d = d || ldDims;
    function safe(id, val) { let el = document.getElementById(id); if (el) el.textContent = val; }
    safe("ldCoreDia",  d.coreDia    + " mm");
    safe("ldLV1rad",   d.lv1Radial  + " mm");
    safe("ldDuct1",    d.duct1      + " mm");
    safe("ldLV2rad",   d.lv2Radial  + " mm");
    safe("ldDuct2",    d.duct2      + " mm");
    safe("ldHVrad",    d.hvRadial   + " mm");
    safe("ldLV1ax",    d.lv1Height  + " mm");
    safe("ldLV2ax",    d.lv2Height  + " mm");
    safe("ldHVax",     d.hvHeight   + " mm");
    safe("ldYokeax",   d.yokeHeight + " mm");
    safe("ldAxLV1",    d.lv1Height  + " mm");
    safe("ldAxLV2",    d.lv2Height  + " mm");
    safe("ldAxHV",     d.hvHeight   + " mm");
    safe("ldAxYoke",   d.yokeHeight + " mm");
}

function drawAllDiagrams(d) {
    d = d || ldDims;
    drawFrontElevation(d);
    drawSideElevation(d);
    drawPlanView(d);
}

/* ══════════════════════════════════════════════════════════════════════
   SHARED DRAWING HELPERS
   ══════════════════════════════════════════════════════════════════════ */

function makeCtx(id) {
    let c = document.getElementById(id);
    if (!c) return null;
    let ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#0e1018";
    ctx.fillRect(0, 0, c.width, c.height);
    return { ctx: ctx, W: c.width, H: c.height };
}

function hatch(ctx, x, y, w, h, step, col) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.strokeStyle = col || "rgba(160,175,210,0.15)";
    ctx.lineWidth   = 0.7;
    let d2 = Math.sqrt(w * w + h * h);
    for (let t = -d2; t < d2 * 2; t += (step || 8)) {
        ctx.beginPath();
        ctx.moveTo(x + t, y);
        ctx.lineTo(x + t + h, y + h);
        ctx.stroke();
    }
    ctx.restore();
}

function dimLine(ctx, x1, y1, x2, y2, label, off, col, fs) {
    col = col || "#7a9bcc"; fs = fs || 9;
    let ang = Math.atan2(y2 - y1, x2 - x1);
    let perpAng = ang - Math.PI / 2;
    let ox = Math.cos(perpAng) * off, oy = Math.sin(perpAng) * off;
    let ax1 = x1 + ox, ay1 = y1 + oy, ax2 = x2 + ox, ay2 = y2 + oy;
    ctx.save();
    ctx.strokeStyle = "rgba(110,140,180,0.35)";
    ctx.lineWidth   = 0.7;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ax1, ay1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(ax2, ay2); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 0.9; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(ax1, ay1); ctx.lineTo(ax2, ay2); ctx.stroke();
    let as = 5;
    function arrow(px, py, a) {
        ctx.fillStyle = col; ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - as * Math.cos(a - 0.4), py - as * Math.sin(a - 0.4));
        ctx.lineTo(px - as * Math.cos(a + 0.4), py - as * Math.sin(a + 0.4));
        ctx.closePath(); ctx.fill();
    }
    arrow(ax1, ay1, ang + Math.PI); arrow(ax2, ay2, ang);
    if (label) {
        let mx = (ax1 + ax2) / 2, my = (ay1 + ay2) / 2;
        ctx.font = "bold " + fs + "px 'Consolas',monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        let tw = ctx.measureText(label).width + 8, th = fs + 6;
        ctx.fillStyle = "rgba(10,13,24,0.88)"; ctx.strokeStyle = "rgba(90,130,180,0.35)"; ctx.lineWidth = 0.6;
        ctx.fillRect(mx - tw / 2, my - th / 2, tw, th);
        ctx.strokeRect(mx - tw / 2, my - th / 2, tw, th);
        ctx.fillStyle = col; ctx.fillText(label, mx, my);
    }
    ctx.restore();
}

function bracketAnnot(ctx, rx, y1, y2, label, fs) {
    fs = fs || 8.5;
    let mid = (y1 + y2) / 2;
    ctx.save();
    ctx.strokeStyle = "#4a5e70"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(rx, y1); ctx.lineTo(rx + 5, y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx, y2); ctx.lineTo(rx + 5, y2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx + 5, y1); ctx.lineTo(rx + 5, y2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx + 5, mid); ctx.lineTo(rx + 12, mid); ctx.stroke();
    ctx.fillStyle = "#8099aa"; ctx.font = fs + "px 'Consolas',monospace";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(label, rx + 15, mid);
    ctx.restore();
}

function canvasTxt(ctx, s, x, y, col, fs, align, baseline) {
    ctx.save();
    ctx.fillStyle    = col      || "#b0c4d8";
    ctx.font         = (fs || 9) + "px 'Consolas',monospace";
    ctx.textAlign    = align    || "center";
    ctx.textBaseline = baseline || "middle";
    ctx.fillText(s, x, y);
    ctx.restore();
}

/* ══════════════════════════════════════════════════════════════════════
   DIAGRAM 1 — FRONT ELEVATION
   3-limb core with concentric windings (LV1 / LV2 / HV).
   Dimensions: A (limb c-c), L (window height), D (yoke depth)
   ══════════════════════════════════════════════════════════════════════ */
function drawFrontElevation(d) {
    let cv = makeCtx("canvasFront");
    if (!cv) return;
    let ctx = cv.ctx, W = cv.W, H = cv.H;

    let D_mm  = d.yokeHeight, L_mm = d.windowHeight, A_mm = d.limbSpacing;
    let Tg_mm = d.coreDia;
    let TH_mm = 2 * D_mm + L_mm;
    let TW_mm = 2 * A_mm + Tg_mm;

    // Half-radii of each winding from limb centre
    let lv1Half = Tg_mm / 2 + d.lv1Radial;
    let lv2Half = lv1Half + d.duct1 + d.lv2Radial;
    let hvHalf  = lv2Half + d.duct2 + d.hvRadial;

    let ml = 68, mr = 72, mt = 42, mb = 54;
    let drawW = W - ml - mr, drawH = H - mt - mb;
    let totalW_mm = 2 * A_mm + hvHalf * 2;
    let sc = Math.min(drawW / totalW_mm, drawH / TH_mm);

    let ox = ml + (drawW - TW_mm * sc) / 2;
    let oy = mt + (drawH - TH_mm * sc) / 2;
    let rD = D_mm * sc, rL = L_mm * sc, rTg = Tg_mm * sc;
    let rA = A_mm * sc, rTW = TW_mm * sc;

    let limbs = [ox + rTg/2, ox + rTg/2 + rA, ox + rTg/2 + rA*2];
    let winTop = oy + rD, winBot = winTop + rL;

    let STEEL = "#3e4860", STEELSTR = "#6878a0";

    function steelRect(x, y, w, h) {
        ctx.fillStyle = STEEL; ctx.strokeStyle = STEELSTR; ctx.lineWidth = 1.1;
        ctx.fillRect(x,y,w,h); ctx.strokeRect(x,y,w,h);
        hatch(ctx, x, y, w, h, 8);
    }

    steelRect(ox, oy, rTW, rD);
    steelRect(ox, winBot, rTW, rD);
    limbs.forEach(function(lx) { steelRect(lx - rTg/2, winTop, rTg, rL); });

    let wData = [
        { radMM: d.lv1Radial, ductMM: 0,     fill:"rgba(230,155,40,0.30)",  str:"#e8a030", name:"LV1" },
        { radMM: d.lv2Radial, ductMM: d.duct1,fill:"rgba(170,80,200,0.26)", str:"#c058d0", name:"LV2" },
        { radMM: d.hvRadial,  ductMM: d.duct2,fill:"rgba(40,140,230,0.28)", str:"#2890e0", name:"HV"  }
    ];

    limbs.forEach(function(lx) {
        let innerPx = rTg / 2;
        wData.forEach(function(wd, wi) {
            if (wi > 0) innerPx += (wData[wi-1].radMM + wd.ductMM) * sc;
            let outerPx = innerPx + wd.radMM * sc;
            let wL = lx - outerPx, wW = outerPx * 2;
            let hL = lx - innerPx, hW = innerPx * 2;
            ctx.fillStyle = wd.fill; ctx.strokeStyle = wd.str; ctx.lineWidth = 1.2;
            ctx.fillRect(wL, winTop, wW, rL);
            ctx.strokeRect(wL, winTop, wW, rL);
            // Clear bore and re-fill with steel
            ctx.fillStyle = STEEL; ctx.fillRect(hL+0.5, winTop+0.5, hW-1, rL-1);
            hatch(ctx, hL, winTop, hW, rL, 8);
            ctx.strokeStyle = STEELSTR; ctx.lineWidth = 0.7;
            ctx.strokeRect(hL, winTop, hW, rL);
            ctx.strokeStyle = wd.str; ctx.lineWidth = 1.2;
            ctx.strokeRect(wL, winTop, wW, rL);
            if (lx === limbs[2]) {
                canvasTxt(ctx, wd.name, wL + wW + 5, winTop + rL*0.5, wd.str, 9, "left","middle");
            }
            innerPx = outerPx;
        });
    });

    // Dimensions
    dimLine(ctx, ox, winTop, ox, winBot, "L="+L_mm+"mm", -38, "#7a9bcc", 9);
    dimLine(ctx, ox, oy,     ox, winTop, "D="+D_mm+"mm", -38, "#7a9bcc", 9);
    dimLine(ctx, limbs[0], winBot+rD, limbs[1], winBot+rD, "A="+A_mm+"mm", 28, "#c09030", 9);
    dimLine(ctx, ox, oy, ox+rTW, oy, TW_mm+"mm", -18, "#6699aa", 8);

    // HV outer width dim on limb[0]
    let hvL0 = limbs[0] - hvHalf * sc, hvR0 = limbs[0] + hvHalf * sc;
    dimLine(ctx, hvL0, oy-10, hvR0, oy-10, "HV OD="+(Math.round(hvHalf*2))+"mm", -10, "#4488cc", 8);

    // Tongue label
    canvasTxt(ctx, "D="+d.coreDia, limbs[1], oy+rD/2, "#a0b4d0", 8);

    canvasTxt(ctx, "FRONT ELEVATION  —  CORE & WINDING ASSEMBLY  (3-LIMB)", W/2, mt-14, "rgba(160,185,220,0.5)", 9);

    let legX = W - mr + 2, legY = mt;
    [
        {col:"rgba(230,155,40,0.5)", str:"#e8a030", nm:"LV1"},
        {col:"rgba(170,80,200,0.4)", str:"#c058d0", nm:"LV2"},
        {col:"rgba(40,140,230,0.45)",str:"#2890e0", nm:"HV"},
        {col:STEEL,                  str:STEELSTR,  nm:"Core"}
    ].forEach(function(li, i) {
        ctx.fillStyle=li.col; ctx.strokeStyle=li.str; ctx.lineWidth=0.9;
        ctx.fillRect(legX, legY+i*17, 12, 10); ctx.strokeRect(legX, legY+i*17, 12, 10);
        canvasTxt(ctx, li.nm, legX+16, legY+i*17+5, "#b8cce0", 8.5, "left","middle");
    });
}

/* ══════════════════════════════════════════════════════════════════════
   DIAGRAM 2 — SIDE ELEVATION
   One limb, viewed from side. Axial stack: core foot, yokes, window.
   Radial bands (LV1/LV2/HV) on both sides of limb.
   ══════════════════════════════════════════════════════════════════════ */
function drawSideElevation(d) {
    let cv = makeCtx("canvasSide");
    if (!cv) return;
    let ctx = cv.ctx, W = cv.W, H = cv.H;

    let foot = d.coreFootInsulation, botY = d.yokeHeight;
    let winH = d.windowHeight,       topY = d.yokeHeight, octc = 100;
    let total = foot + botY + winH + topY + octc;

    let ml = 20, mr = 230, mt = 24, mb = 20;
    let drawH = H - mt - mb;
    let sc = drawH / total;

    let coreW = Math.max(28, d.coreDia * sc * 0.9);
    let ox = ml + 15, oy = mt;

    let yOCTC = oy, yTopY = oy + octc*sc;
    let yWinT = yTopY + topY*sc, yWinB = yWinT + winH*sc;
    let yBotY = yWinB, yFoot = yBotY + botY*sc, yEnd = yFoot + foot*sc;

    let STEEL = "#3e4860", STEELSTR = "#6878a0";

    function steelB(x,y,w,h) {
        ctx.fillStyle=STEEL; ctx.strokeStyle=STEELSTR; ctx.lineWidth=1;
        ctx.fillRect(x,y,w,h); ctx.strokeRect(x,y,w,h); hatch(ctx,x,y,w,h,7);
    }

    // OCTC zone
    ctx.save(); ctx.setLineDash([4,4]);
    ctx.strokeStyle="rgba(100,140,180,0.25)"; ctx.lineWidth=0.8;
    ctx.strokeRect(ox, yOCTC, coreW, octc*sc); ctx.restore();
    let octcY = yOCTC + octc*sc*0.5;
    ctx.strokeStyle="#667788"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(ox+coreW/2, octcY, 8, 0, Math.PI*2); ctx.stroke();
    canvasTxt(ctx, "OCTC", ox+coreW/2, octcY, "#778899", 7);

    steelB(ox, yTopY, coreW, topY*sc);
    steelB(ox, yBotY, coreW, botY*sc);

    let limbW = coreW * 0.65, limbX = ox + (coreW-limbW)/2;
    steelB(limbX, yWinT, limbW, winH*sc);

    ctx.fillStyle="#2e3044"; ctx.strokeStyle="#505470"; ctx.lineWidth=0.8;
    ctx.fillRect(ox-6, yFoot, coreW+12, foot*sc);
    ctx.strokeRect(ox-6, yFoot, coreW+12, foot*sc);

    let wCol = [
        {fill:"rgba(230,155,40,0.35)", str:"#e8a030", nm:"LV1"},
        {fill:"rgba(170,80,200,0.30)", str:"#c058d0", nm:"LV2"},
        {fill:"rgba(40,140,230,0.32)", str:"#2890e0", nm:"HV"}
    ];
    let rads  = [d.lv1Radial, d.lv2Radial, d.hvRadial];
    let ducts = [0, d.duct1, d.duct2];
    let innerR = limbW / 2;
    rads.forEach(function(rad, wi) {
        if (wi > 0) innerR += ducts[wi] * sc;
        let rPx = rad * sc, cx = ox + coreW / 2;
        let wc = wCol[wi];
        ctx.fillStyle=wc.fill; ctx.strokeStyle=wc.str; ctx.lineWidth=1;
        ctx.fillRect(cx-innerR-rPx, yWinT, rPx, winH*sc); ctx.strokeRect(cx-innerR-rPx, yWinT, rPx, winH*sc);
        ctx.fillRect(cx+innerR, yWinT, rPx, winH*sc);     ctx.strokeRect(cx+innerR, yWinT, rPx, winH*sc);
        canvasTxt(ctx, wc.nm, cx+innerR+rPx+4, yWinT+winH*sc*0.5, wc.str, 8, "left","middle");
        innerR += rPx;
    });

    let rx = ox + coreW + 4 + innerR * 2 + 8;
    bracketAnnot(ctx, rx, yOCTC, yTopY, "OCTC = " + octc + " mm");
    bracketAnnot(ctx, rx, yTopY, yWinT, "Top yoke = " + d.yokeHeight + " mm");
    bracketAnnot(ctx, rx, yWinT, yWinB, "Window L = " + d.windowHeight + " mm");
    bracketAnnot(ctx, rx, yBotY, yFoot, "Bot yoke = " + d.yokeHeight + " mm");
    bracketAnnot(ctx, rx, yFoot, yEnd,  "Core foot = " + d.coreFootInsulation + " mm");

    dimLine(ctx, ox-8, yTopY, ox-8, yFoot, (d.yokeHeight*2+d.windowHeight)+"mm", -24, "#7a9bcc", 9);

    canvasTxt(ctx, "SIDE ELEVATION  —  ACTIVE PART", W/2, mt-10, "rgba(160,185,220,0.5)", 9);
}

/* ══════════════════════════════════════════════════════════════════════
   DIAGRAM 3 — PLAN VIEW (top-down)
   Enclosure footprint with 3 limbs as concentric circles.
   ══════════════════════════════════════════════════════════════════════ */
function drawPlanView(d) {
    let cv = makeCtx("canvasTop");
    if (!cv) return;
    let ctx = cv.ctx, W = cv.W, H = cv.H;

    let encL = d.encLength, encWd = d.encWidth;

    let rCore = d.coreDia / 2;
    let rLV1  = rCore + d.lv1Radial;
    let rLV2  = rLV1  + d.duct1 + d.lv2Radial;
    let rHV   = rLV2  + d.duct2 + d.hvRadial;

    let ml=30, mr=30, mt=32, mb=42;
    let drawW=W-ml-mr, drawH=H-mt-mb;
    let sc = Math.min(drawW/encL, drawH/encWd);
    let rEncL=encL*sc, rEncW=encWd*sc;
    let ox=ml+(drawW-rEncL)/2, oy=mt+(drawH-rEncW)/2;

    ctx.fillStyle="rgba(20,26,44,0.55)"; ctx.strokeStyle="#677a8a"; ctx.lineWidth=1.5;
    ctx.fillRect(ox,oy,rEncL,rEncW); ctx.strokeRect(ox,oy,rEncL,rEncW);

    let spS=d.limbSpacing*sc, centY=oy+rEncW/2;
    let firstX=ox+(rEncL-spS*(d.numLimbs-1))/2;
    let limbXs=[];
    for (let i=0;i<d.numLimbs;i++) limbXs.push(firstX+spS*i);

    let rings=[
        {r:rHV*sc,   fill:"rgba(40,140,230,0.22)",  str:"#2890e0"},
        {r:rLV2*sc,  fill:"rgba(170,80,200,0.25)",  str:"#c058d0"},
        {r:rLV1*sc,  fill:"rgba(230,155,40,0.28)",  str:"#e8a030"},
        {r:rCore*sc, fill:"#3e4860",                str:"#6878a0"}
    ];

    limbXs.forEach(function(lx) {
        rings.forEach(function(rg) {
            ctx.beginPath(); ctx.arc(lx,centY,rg.r,0,Math.PI*2);
            ctx.fillStyle=rg.fill; ctx.strokeStyle=rg.str; ctx.lineWidth=1;
            ctx.fill(); ctx.stroke();
        });
        ctx.save(); ctx.beginPath(); ctx.arc(lx,centY,rCore*sc,0,Math.PI*2); ctx.clip();
        hatch(ctx,lx-rCore*sc,centY-rCore*sc,rCore*sc*2,rCore*sc*2,5,"rgba(140,160,200,0.2)");
        ctx.restore();
    });

    dimLine(ctx,limbXs[0],oy-12,limbXs[1],oy-12,"A="+d.limbSpacing+"mm",-4,"#c09030",9);
    dimLine(ctx,ox,oy+rEncW+16,ox+rEncL,oy+rEncW+16,encL+"mm",-4,"#6699aa",9);
    dimLine(ctx,ox+rEncL+16,oy,ox+rEncL+16,oy+rEncW,encWd+"mm",-4,"#6699aa",9);

    let lastX=limbXs[d.numLimbs-1];
    let hvRpx=rHV*sc, hvOD=Math.round(rHV*2);
    ctx.save(); ctx.strokeStyle="rgba(80,130,200,0.5)"; ctx.lineWidth=0.8; ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(lastX+hvRpx*0.7,centY-hvRpx*0.7); ctx.lineTo(lastX+hvRpx+4,centY-hvRpx-10); ctx.stroke();
    ctx.restore();
    canvasTxt(ctx,"HV OD="+hvOD+"mm",lastX+hvRpx+6,centY-hvRpx-14,"#5090d0",8,"left","middle");

    let midX=limbXs[Math.floor(d.numLimbs/2)];
    canvasTxt(ctx,"\u00D8"+d.coreDia+"mm",midX,centY,"#a0b4d0",8);

    let legItems=[
        {col:"rgba(40,140,230,0.5)", str:"#2890e0", nm:"HV"},
        {col:"rgba(170,80,200,0.45)",str:"#c058d0", nm:"LV2"},
        {col:"rgba(230,155,40,0.5)", str:"#e8a030", nm:"LV1"},
        {col:"#3e4860",              str:"#6878a0", nm:"Core"}
    ];
    legItems.forEach(function(li, i) {
        let lx=ox+5, ly=oy+6+i*16;
        ctx.fillStyle=li.col; ctx.strokeStyle=li.str; ctx.lineWidth=0.8;
        ctx.beginPath(); ctx.arc(lx+5,ly+5,5,0,Math.PI*2); ctx.fill(); ctx.stroke();
        canvasTxt(ctx,li.nm,lx+14,ly+5,"#b8cce0",8.5,"left","middle");
    });

    canvasTxt(ctx,"PLAN VIEW  —  TOP DOWN (ENCLOSURE FOOTPRINT)",W/2,mt-14,"rgba(160,185,220,0.5)",9);
}

/* ── Draw defaults on page load ─────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", function() {
    drawAllDiagrams(ldDims);
    updateLayoutUI(ldDims);
});

/* ── Redraw when Layout tab activated ────────────────────────────────────── */
// navItems is declared globally in navigation.js — use it directly
document.querySelectorAll(".nav-item").forEach(function(item) {
    if (item.getAttribute("data-page") === "layout-design") {
        item.addEventListener("click", function() {
            setTimeout(function() { drawAllDiagrams(ldDims); }, 50);
        });
    }
});

/* ── Export buttons ──────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", function() {
    let ldExportPdf = document.getElementById("ldExportPdf");
    if (ldExportPdf) {
        ldExportPdf.addEventListener("click", function() { printPage([".ld-export-bar"]); });
    }
    let ldExportSvg = document.getElementById("ldExportSvg");
    if (ldExportSvg) {
        ldExportSvg.addEventListener("click", function() {
            let ids=["canvasFront","canvasSide","canvasTop"];
            let parts=['<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="580">'];
            let yOff=0;
            ids.forEach(function(id) {
                let c=document.getElementById(id); if(!c) return;
                let url=c.toDataURL("image/png");
                parts.push('<image x="10" y="'+yOff+'" width="'+c.width+'" height="'+c.height+'" xlink:href="'+url+'"/>');
                yOff+=c.height+10;
            });
            parts.push('</svg>');
            let blob=new Blob([parts.join("")],{type:"image/svg+xml"});
            let href=URL.createObjectURL(blob);
            let a=document.createElement("a");
            a.href=href; a.download="layout_design.svg"; a.click();
            URL.revokeObjectURL(href);
        });
    }
});