/* ADP Digital Suite - Smart ID Card Auto Print */

function open_smart_id_print(){
  openModal("Smart ID Card Auto Print", `
    <div class="row-2">
      <div>
        <div class="hint">Front side</div>
        <div class="drop-zone" id="id-front-drop">📤 Upload front photo</div>
        <input type="file" id="id-front-input" accept="image/*" class="hidden">
        <canvas id="id-front-canvas" class="hidden" style="margin-top:8px;"></canvas>
      </div>
      <div>
        <div class="hint">Back side</div>
        <div class="drop-zone" id="id-back-drop">📤 Upload back photo</div>
        <input type="file" id="id-back-input" accept="image/*" class="hidden">
        <canvas id="id-back-canvas" class="hidden" style="margin-top:8px;"></canvas>
      </div>
    </div>
    <div class="hint" style="margin-top:10px;">Both sides are auto-cropped and straightened to remove the background, then placed on one A4 sheet — back on the top-left, front on the top-right, at standard card size (85.6 × 54 mm) — ready to cut and laminate.</div>
    <canvas id="id-sheet" class="hidden" style="margin-top:14px;"></canvas>
    <div style="display:flex;gap:10px;margin-top:14px;">
      <button class="btn btn-outline btn-block hidden" id="id-jpg">Download JPG</button>
      <button class="btn btn-primary btn-block hidden" id="id-pdf">Download PDF</button>
    </div>
  `);

  let frontCanvas = null, backCanvas = null;

  async function processSide(file, previewEl){
    const raw = await fileToCanvas(file);
    const cropped = autoCropCanvas(raw, { threshold: 26 });
    const clean = enhanceCanvas(cropped, { brightness: 8, contrast: 14 });
    previewEl.width = clean.width; previewEl.height = clean.height;
    previewEl.getContext("2d").drawImage(clean, 0, 0);
    previewEl.classList.remove("hidden");
    return clean;
  }

  function buildSheet(){
    if (!frontCanvas && !backCanvas) return;
    const DPI = 300;
    const mmToPx = mm => Math.round(mm / 25.4 * DPI);
    const cardW = mmToPx(85.6), cardH = mmToPx(54);
    const A4W = 2480, A4H = 3508;

    const sheet = document.getElementById("id-sheet");
    sheet.width = A4W; sheet.height = A4H;
    const ctx = sheet.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0,0,A4W,A4H);

    const marginTop = 60, marginSide = 60;
    const drawCard = (canvas, x, y) => {
      if (!canvas) return;
      ctx.drawImage(canvas, x, y, cardW, cardH);
      ctx.strokeStyle = "#bbb"; ctx.lineWidth = 2; ctx.setLineDash([8,6]);
      ctx.strokeRect(x, y, cardW, cardH);
      ctx.setLineDash([]);
    };
    // back = top-left, front = top-right
    drawCard(backCanvas, marginSide, marginTop);
    drawCard(frontCanvas, A4W - marginSide - cardW, marginTop);

    sheet.classList.remove("hidden");
    document.getElementById("id-jpg").classList.remove("hidden");
    document.getElementById("id-pdf").classList.remove("hidden");
  }

  wireDropZone(document.getElementById("id-front-drop"), document.getElementById("id-front-input"), async (files) => {
    const f = files[0]; if (!f) return;
    frontCanvas = await processSide(f, document.getElementById("id-front-canvas"));
    buildSheet();
  });
  wireDropZone(document.getElementById("id-back-drop"), document.getElementById("id-back-input"), async (files) => {
    const f = files[0]; if (!f) return;
    backCanvas = await processSide(f, document.getElementById("id-back-canvas"));
    buildSheet();
  });

  document.getElementById("id-jpg").addEventListener("click", () => downloadDataURL(document.getElementById("id-sheet").toDataURL("image/jpeg",0.95), "id-card-sheet.jpg"));
  document.getElementById("id-pdf").addEventListener("click", async () => {
    const sheet = document.getElementById("id-sheet");
    const { PDFDocument } = PDFLib;
    const doc = await PDFDocument.create();
    const blob = await canvasToBlob(sheet, "image/jpeg", 0.95);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const jpg = await doc.embedJpg(bytes);
    const page = doc.addPage([595.28, 841.89]);
    page.drawImage(jpg, { x:0, y:0, width: 595.28, height: 841.89 });
    const out = await doc.save();
    downloadBlob(new Blob([out], { type:"application/pdf" }), "id-card-sheet.pdf");
  });
}
