/* ADP Digital Suite - shared helpers used by every tool module */

function readAsArrayBuffer(file){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsArrayBuffer(file);
  });
}
function readAsDataURL(file){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function loadImage(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function downloadDataURL(dataUrl, filename){
  const a = document.createElement("a");
  a.href = dataUrl; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}
function fmtBytes(bytes){
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + " KB";
  return (bytes/(1024*1024)).toFixed(2) + " MB";
}
function setProgress(barEl, pct){
  if (barEl) barEl.style.width = Math.min(100, Math.max(0, pct)) + "%";
}
function uid(){ return Math.random().toString(36).slice(2, 9); }

// pdf.js worker (loaded from the same CDN as the main library)
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

/* Canvas-based auto document edge trim:
   Scans inward from each side and stops at the first row/column whose
   average brightness/contrast differs enough from the background corners,
   effectively cropping away scanner/table background around a document. */
function autoCropCanvas(sourceCanvas, options = {}){
  const w = sourceCanvas.width, h = sourceCanvas.height;
  const ctx = sourceCanvas.getContext("2d");
  const data = ctx.getImageData(0, 0, w, h).data;

  const lum = (x, y) => {
    const i = (y * w + x) * 4;
    return 0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2];
  };

  // sample background luminance from the four corners
  const corners = [lum(2,2), lum(w-3,2), lum(2,h-3), lum(w-3,h-3)];
  const bg = corners.reduce((a,b)=>a+b,0) / 4;
  const threshold = options.threshold || 22;

  const rowDiffers = (y) => {
    let hits = 0;
    for (let x = 0; x < w; x += Math.max(1, Math.floor(w/120))) {
      if (Math.abs(lum(x,y) - bg) > threshold) hits++;
    }
    return hits > (w / (Math.max(1, Math.floor(w/120)))) * 0.06;
  };
  const colDiffers = (x) => {
    let hits = 0;
    for (let y = 0; y < h; y += Math.max(1, Math.floor(h/120))) {
      if (Math.abs(lum(x,y) - bg) > threshold) hits++;
    }
    return hits > (h / (Math.max(1, Math.floor(h/120)))) * 0.06;
  };

  let top = 0, bottom = h-1, left = 0, right = w-1;
  const maxScan = Math.floor(Math.min(w,h) * 0.45); // never crop more than 45% from a side

  for (let y = 0; y < maxScan; y++){ if (rowDiffers(y)) { top = y; break; } top = y; }
  for (let y = h-1; y > h-1-maxScan; y--){ if (rowDiffers(y)) { bottom = y; break; } bottom = y; }
  for (let x = 0; x < maxScan; x++){ if (colDiffers(x)) { left = x; break; } left = x; }
  for (let x = w-1; x > w-1-maxScan; x--){ if (colDiffers(x)) { right = x; break; } right = x; }

  if (right - left < 20 || bottom - top < 20) {
    // detection failed / document fills the frame - return original
    return sourceCanvas;
  }
  const pad = 4;
  left = Math.max(0, left - pad); top = Math.max(0, top - pad);
  right = Math.min(w-1, right + pad); bottom = Math.min(h-1, bottom + pad);

  const out = document.createElement("canvas");
  out.width = right - left; out.height = bottom - top;
  out.getContext("2d").drawImage(sourceCanvas, left, top, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

function enhanceCanvas(sourceCanvas, { brightness = 8, contrast = 12 } = {}){
  const out = document.createElement("canvas");
  out.width = sourceCanvas.width; out.height = sourceCanvas.height;
  const ctx = out.getContext("2d");
  ctx.filter = `brightness(${100+brightness}%) contrast(${100+contrast}%) saturate(105%)`;
  ctx.drawImage(sourceCanvas, 0, 0);
  return out;
}

function fileToCanvas(file){
  return readAsDataURL(file).then(loadImage).then(img => {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    return c;
  });
}

function canvasToBlob(canvas, type = "image/jpeg", quality = 0.92){
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}
