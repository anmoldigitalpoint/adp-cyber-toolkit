/* ADP Digital Suite - Passport Photo Maker */

const PHOTO_SIZES_MM = {
  "35x45": [35,45],
  "passport_us": [51,51],
  "visa_51x51": [51,51],
  "2x2_in": [50.8,50.8],
};

function open_passport_photo(){
  openModal("Passport Photo Maker", `
    <div class="drop-zone" id="pp-drop">🖼️ Click or drop a passport-style photo here</div>
    <input type="file" id="pp-input" accept="image/*" class="hidden">
    <div class="row-2" style="margin-top:14px;">
      <div class="field"><label>Photo size</label>
        <select id="pp-size">
          <option value="35x45">35 × 45 mm (India passport)</option>
          <option value="passport_us">2 × 2 in (US passport)</option>
          <option value="visa_51x51">51 × 51 mm (Visa size)</option>
        </select>
      </div>
      <div class="field"><label>Copies on A4 sheet</label>
        <select id="pp-count"><option value="4">4 Photos</option><option value="8" selected>8 Photos</option><option value="16">16 Photos</option><option value="32">32 Photos</option></select>
      </div>
    </div>
    <div class="hint">Center your face in the square preview below — this uses a simple center-crop, not AI face detection, so recheck alignment before printing.</div>
    <canvas id="pp-crop-canvas" class="hidden" style="margin-top:10px;"></canvas>
    <div class="field" style="margin-top:10px;"><label>Zoom / fine-crop</label><input type="range" id="pp-zoom" min="1" max="2.5" step="0.05" value="1"></div>
    <canvas id="pp-sheet" class="hidden" style="margin-top:14px;"></canvas>
    <div style="display:flex;gap:10px;margin-top:14px;">
      <button class="btn btn-outline btn-block hidden" id="pp-jpg">Download JPG</button>
      <button class="btn btn-primary btn-block hidden" id="pp-pdf">Download PDF</button>
    </div>
  `);

  let img = null;
  const previewCanvas = document.getElementById("pp-crop-canvas");
  const sheetCanvas = document.getElementById("pp-sheet");

  function buildSheet(){
    if (!img) return;
    const [wmm, hmm] = PHOTO_SIZES_MM[document.getElementById("pp-size").value];
    const count = parseInt(document.getElementById("pp-count").value, 10);
    const zoom = parseFloat(document.getElementById("pp-zoom").value);

    const DPI = 300;
    const mmToPx = mm => Math.round(mm / 25.4 * DPI);
    const photoW = mmToPx(wmm), photoH = mmToPx(hmm);

    // square (or given ratio) center-crop of the uploaded image, respecting zoom
    const srcAspect = photoW / photoH;
    let cropW, cropH;
    if (img.naturalWidth / img.naturalHeight > srcAspect) { cropH = img.naturalHeight / zoom; cropW = cropH * srcAspect; }
    else { cropW = img.naturalWidth / zoom; cropH = cropW / srcAspect; }
    const cx = img.naturalWidth/2, cy = img.naturalHeight/2;

    previewCanvas.width = photoW; previewCanvas.height = photoH;
    const pctx = previewCanvas.getContext("2d");
    pctx.drawImage(img, cx-cropW/2, cy-cropH/2, cropW, cropH, 0, 0, photoW, photoH);
    previewCanvas.classList.remove("hidden");

    // A4 sheet at 300 DPI = 2480 x 3508 px
    const A4W = 2480, A4H = 3508;
    sheetCanvas.width = A4W; sheetCanvas.height = A4H;
    const sctx = sheetCanvas.getContext("2d");
    sctx.fillStyle = "#fff"; sctx.fillRect(0,0,A4W,A4H);

    const margin = 40, gap = 20;
    const cols = Math.max(1, Math.floor((A4W - margin*2) / (photoW + gap)));
    let x = margin, y = margin;
    for (let i = 0; i < count; i++){
      if (x + photoW > A4W - margin) { x = margin; y += photoH + gap; }
      if (y + photoH > A4H - margin) break; // stop if sheet is full
      sctx.drawImage(previewCanvas, x, y);
      sctx.strokeStyle = "#ccc"; sctx.lineWidth = 1; sctx.strokeRect(x,y,photoW,photoH);
      x += photoW + gap;
    }
    sheetCanvas.classList.remove("hidden");
    document.getElementById("pp-jpg").classList.remove("hidden");
    document.getElementById("pp-pdf").classList.remove("hidden");
  }

  wireDropZone(document.getElementById("pp-drop"), document.getElementById("pp-input"), async (files) => {
    const f = files[0]; if (!f) return;
    img = await loadImage(await readAsDataURL(f));
    buildSheet();
  });
  ["pp-size","pp-count","pp-zoom"].forEach(id => document.getElementById(id).addEventListener("input", buildSheet));

  document.getElementById("pp-jpg").addEventListener("click", () => downloadDataURL(sheetCanvas.toDataURL("image/jpeg",0.95), "passport-photo-sheet.jpg"));
  document.getElementById("pp-pdf").addEventListener("click", async () => {
    const { PDFDocument } = PDFLib;
    const doc = await PDFDocument.create();
    const blob = await canvasToBlob(sheetCanvas, "image/jpeg", 0.95);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const jpg = await doc.embedJpg(bytes);
    const page = doc.addPage([595.28, 841.89]); // A4 in points
    page.drawImage(jpg, { x:0, y:0, width: 595.28, height: 841.89 });
    const out = await doc.save();
    downloadBlob(new Blob([out], { type:"application/pdf" }), "passport-photo-sheet.pdf");
  });
}
