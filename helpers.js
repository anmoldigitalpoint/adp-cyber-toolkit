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

/* ---------------- Real document-edge detection (OpenCV.js) ----------------
   The simple corner-brightness trim above (autoCropCanvas) works only for very
   high-contrast, evenly-lit photos. For real phone photos of ID cards / pages on
   a table, proper edge detection + perspective correction is needed. This loads
   OpenCV.js on demand (only when a scanner tool is opened) and finds the largest
   four-corner shape in the photo, then straightens it into a flat rectangle. */

let _cvLoadingPromise = null;
function loadOpenCV(){
  if (window.cv && window.cv.Mat) return Promise.resolve();
  if (_cvLoadingPromise) return _cvLoadingPromise;
  _cvLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://docs.opencv.org/4.8.0/opencv.js";
    script.async = true;
    script.onload = () => {
      if (window.cv && window.cv.Mat) resolve();
      else window.cv["onRuntimeInitialized"] = resolve;
    };
    script.onerror = () => reject(new Error("Could not load the scanner engine - check your internet connection."));
    document.head.appendChild(script);
  });
  return _cvLoadingPromise;
}

function detectAndWarpDocument(sourceCanvas){
  if (!window.cv || !cv.Mat) return null;
  let src, gray, blurred, edges, dilated, contours, hierarchy, bestApprox = null;
  try {
    src = cv.imread(sourceCanvas);
    gray = new cv.Mat(); cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    blurred = new cv.Mat(); cv.GaussianBlur(gray, blurred, new cv.Size(5,5), 0);
    edges = new cv.Mat(); cv.Canny(blurred, edges, 50, 150);
    const kernel = cv.Mat.ones(3,3, cv.CV_8U);
    dilated = new cv.Mat(); cv.dilate(edges, dilated, kernel);
    kernel.delete();
    contours = new cv.MatVector(); hierarchy = new cv.Mat();
    cv.findContours(dilated, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    let maxArea = 0;
    const minArea = src.rows * src.cols * 0.15; // ignore tiny/noise shapes
    for (let i = 0; i < contours.size(); i++){
      const cnt = contours.get(i);
      const peri = cv.arcLength(cnt, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
      if (approx.rows === 4){
        const area = cv.contourArea(approx);
        if (area > maxArea && area > minArea){
          maxArea = area;
          if (bestApprox) bestApprox.delete();
          bestApprox = approx;
        } else approx.delete();
      } else approx.delete();
      cnt.delete();
    }

    if (!bestApprox) return null;

    const pts = [];
    for (let i = 0; i < 4; i++) pts.push({ x: bestApprox.data32S[i*2], y: bestApprox.data32S[i*2+1] });
    pts.sort((a,b) => a.y - b.y);
    const top = pts.slice(0,2).sort((a,b) => a.x - b.x);
    const bottom = pts.slice(2,4).sort((a,b) => a.x - b.x);
    const [tl, tr] = top, [bl, br] = bottom;

    const widthA = Math.hypot(br.x-bl.x, br.y-bl.y), widthB = Math.hypot(tr.x-tl.x, tr.y-tl.y);
    const maxWidth = Math.round(Math.max(widthA, widthB));
    const heightA = Math.hypot(tr.x-br.x, tr.y-br.y), heightB = Math.hypot(tl.x-bl.x, tl.y-bl.y);
    const maxHeight = Math.round(Math.max(heightA, heightB));
    if (maxWidth < 40 || maxHeight < 40) { bestApprox.delete(); return null; }

    const srcTri = cv.matFromArray(4,1,cv.CV_32FC2,[tl.x,tl.y, tr.x,tr.y, br.x,br.y, bl.x,bl.y]);
    const dstTri = cv.matFromArray(4,1,cv.CV_32FC2,[0,0, maxWidth,0, maxWidth,maxHeight, 0,maxHeight]);
    const M = cv.getPerspectiveTransform(srcTri, dstTri);
    const dst = new cv.Mat();
    cv.warpPerspective(src, dst, M, new cv.Size(maxWidth, maxHeight));

    const outCanvas = document.createElement("canvas");
    cv.imshow(outCanvas, dst);

    srcTri.delete(); dstTri.delete(); M.delete(); dst.delete(); bestApprox.delete();
    return outCanvas;
  } catch (e){
    console.error("Document edge detection failed:", e);
    return null;
  } finally {
    if (src) src.delete(); if (gray) gray.delete(); if (blurred) blurred.delete();
    if (edges) edges.delete(); if (dilated) dilated.delete();
    if (contours) contours.delete(); if (hierarchy) hierarchy.delete();
  }
}

/* Tries real edge-detection + perspective correction first; only falls back to the
   simpler background-trim heuristic if OpenCV isn't loaded or no clean 4-corner shape is found. */
function smartDocumentCrop(sourceCanvas, options = {}){
  const warped = detectAndWarpDocument(sourceCanvas);
  if (warped) return warped;
  return autoCropCanvas(sourceCanvas, options);
      }
