document.addEventListener("DOMContentLoaded", () => {
  /* =========================
     0) DEPENDENCY CHECK
  ========================= */
  if (typeof window.rangeReader !== "function" || typeof window.setHandMix !== "function") {
    console.warn("rangeEdit.js: core API (rangeReader/setHandMix) not found. Check that rangeMaker.js loads first (with defer) and exports to window.");
  }

  /* =========================
     1) LOAD RANGE MODAL (existing HTML)
  ========================= */
  const openBtn  = document.getElementById("btn-load");
  const modal    = document.getElementById("crf-backdrop");
  const input    = document.getElementById("crf-input");
  const errEl    = document.getElementById("crf-error");
  const cancel   = document.getElementById("crf-cancel");
  const loadBtn  = document.getElementById("crf-load");

  function openModal(){
    if (!modal) return;
    errEl && (errEl.style.visibility = "hidden");
    input && (input.value = "");
    modal.style.display = "flex";
    setTimeout(() => input && input.focus(), 0);
  }
  function closeModal(){
    if (modal) modal.style.display = "none";
  }

  openBtn && openBtn.addEventListener("click", openModal);
  cancel  && cancel.addEventListener("click", closeModal);
  modal   && modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  document.addEventListener("keydown", (e) => {
    if (modal && modal.style.display === "flex") {
      if (e.key === "Escape") closeModal();
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") tryLoad();
    }
  });

  loadBtn && loadBtn.addEventListener("click", tryLoad);

  function tryLoad(){
    const crf = (input?.value || "").trim();
    const modules = crf ? crf.split("?") : [];
    if (modules.length !== 169) {
      if (errEl) {
        errEl.textContent = `Expected 169 modules, got ${modules.length || 0}`;
        errEl.style.visibility = "visible";
      } else {
        alert(`Expected 169 modules, got ${modules.length || 0}`);
      }
      return;
    }
    if (typeof window.rangeReader === "function") {
      window.rangeReader(crf);
      closeModal();
      // clear any structured per-cell overrides so Save reads fresh state
      document.querySelectorAll("[data-id]").forEach(cell => {
        delete cell.dataset.a1;
        delete cell.dataset.a2;
        delete cell.dataset.pct;
      });
    } else {
      if (errEl) {
        errEl.textContent = "Core not loaded (rangeReader missing).";
        errEl.style.visibility = "visible";
      } else {
        alert("Core not loaded (rangeReader missing).");
      }
    }
  }

  // kill legacy button if present
  const legacy = document.getElementById("import-crf");
  legacy && legacy.remove();


  /* =========================
     2) RESET BUTTON (left)
  ========================= */
  const resetBtn = document.getElementById("btn-reset");
  resetBtn && resetBtn.addEventListener("click", () => {
    const defaultCrf = window.defaultCrf || Array(169).fill("C00").join("?");
    if (typeof window.rangeReader !== "function") {
      alert("Reset failed: rangeReader missing");
      return;
    }
    window.rangeReader(defaultCrf);
    // Clear per-cell structured data so Save emits C00
    document.querySelectorAll("[data-id]").forEach(cell => {
      delete cell.dataset.a1;
      delete cell.dataset.a2;
      delete cell.dataset.pct;
      cell.dataset.mix = "0% call / 100% fold";
    });
  });


  /* =========================
     3) EDITOR PANEL (RIGHT)
  ========================= */
  // Inject minimal styles for the editor tools + save modal
  const style = document.createElement("style");
  style.textContent = `
    .editor-panel {
      position: fixed;
      top: 50%;
      right: 20px;
      transform: translateY(-50%);
      display: none;
      flex-direction: column;
      gap: 14px;
      z-index: 1500;
      align-items: center;
    }
    .tool {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      border: 2px solid #DDE6ED;
      background: #27374D;
      cursor: pointer;
      box-shadow: 0 4px 10px rgba(0,0,0,.15);
      transition: transform .05s ease, filter .15s ease;
      display: grid;
      place-items: center;
      position: relative;
    }
    .tool:hover { filter: brightness(1.05); transform: translateY(-1px); }
    .tool.active { outline: 2px solid #1f5e7a; }
    .tool swatch {
      display: block;
      width: 70%;
      height: 70%;
      border-radius: 10px;
      background: #526D82;
    }
    .tool.raise swatch { background: var(--raise); }
    .tool.call  swatch { background: var(--call); }
    .tool.fold  swatch { background: var(--fold); }
    .tool.mix-raise-fold swatch { background: linear-gradient(90deg, var(--raise) 50%, var(--fold) 50%); }
    .tool.mix-raise-call swatch { background: linear-gradient(90deg, var(--raise) 50%, var(--call) 50%); }
    .tool.mix-call-fold  swatch { background: linear-gradient(90deg, var(--call) 50%, var(--fold) 50%); }

    .tool-label {
      font-size: 12px;
      color: #1d2a39;
      text-align: center;
      width: 8.5rem;
    }

    .editor-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: center;
      margin-top: 4px;
    }
    .btn-save {
      width: 120px;
      height: 40px;
      border-radius: 10px;
      border: 2px solid #DDE6ED;
      background: #1f5e7a;
      color: #DDE6ED;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-save:hover { filter: brightness(1.05); }

    .crf-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.45);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 0;
    }
    .crf-modal {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: min(800px, 92vw);
      max-height: 92vh;
      overflow: auto;
      background: #13202f;
      border: 2px solid #DDE6ED;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,.35);
      padding: 16px;
      color: #DDE6ED;
    }
    .crf-modal h3 { margin: 0; font-size: 18px; font-weight: 800; }
    .crf-modal textarea {
      width: 100%;
      height: clamp(120px, 40vh, 50vh);
      background: #0e1824;
      color: #e8eef3;
      border: 1px solid #3b4a5b;
      border-radius: 8px;
      padding: 10px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      line-height: 1.35;
      resize: vertical;
    }
    .crf-row { display: flex; gap: 10px; justify-content: flex-end; }
    .crf-btn {
      background: #1f2f43;
      border: 1px solid #DDE6ED;
      color: #e8eef3;
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 700;
    }
    .crf-btn.primary { background: #1f5e7a; }
    .crf-btn:hover { filter: brightness(1.05); }
  `;
  document.head.appendChild(style);

  // Build panel
  const panel = document.createElement("div");
  panel.className = "editor-panel";
  panel.innerHTML = `
    <div class="tool raise" data-tool="pure-raise" title="Raise 100%"><swatch></swatch></div>
    <div class="tool-label">Raise</div>

    <div class="tool call" data-tool="pure-call" title="Call 100%"><swatch></swatch></div>
    <div class="tool-label">Call</div>

    <div class="tool fold" data-tool="pure-fold" title="Fold 100%"><swatch></swatch></div>
    <div class="tool-label">Fold</div>

    <div class="tool mix-raise-fold" data-tool="mix-raise-fold" title="Raise/Fold (mixed)"><swatch></swatch></div>
    <div class="tool-label">Raise / Fold (mix)</div>

    <div class="tool mix-raise-call" data-tool="mix-raise-call" title="Raise/Call (mixed)"><swatch></swatch></div>
    <div class="tool-label">Raise / Call (mix)</div>

    <div class="tool mix-call-fold" data-tool="mix-call-fold" title="Call/Fold (mixed)"><swatch></swatch></div>
    <div class="tool-label">Call / Fold (mix)</div>

    <div class="editor-actions">
      <button id="btn-save-crf" class="btn-save">Save</button>
    </div>
  `;
  document.body.appendChild(panel);

  // Toggle with left Edit button
  const leftEditBtn = document.getElementById("btn-edit");
  leftEditBtn && leftEditBtn.addEventListener("click", () => {
    panel.style.display = (panel.style.display === "flex") ? "none" : "flex";
  });

  // Tool selection / mix prompts
  let currentTool = null;
  const toolEls = Array.from(panel.querySelectorAll(".tool"));
  const mixPct = {
    "mix-raise-fold": 50,
    "mix-raise-call": 50,
    "mix-call-fold":  50
  };

  function selectTool(el) {
    toolEls.forEach(t => t.classList.toggle("active", t === el));
    currentTool = el ? el.getAttribute("data-tool") : null;

    if (currentTool && currentTool.startsWith("mix-")) {
      const first = {
        "mix-raise-fold": "raise",
        "mix-raise-call": "raise",
        "mix-call-fold":  "call"
      }[currentTool];
      const prev = mixPct[currentTool] ?? 50;
      let ans = prompt(`Enter % for ${first} (0–100):`, String(prev));
      if (ans != null) {
        ans = ans.trim().toLowerCase();
        mixPct[currentTool] = (ans === "xx") ? 100 : Math.max(0, Math.min(100, parseInt(ans, 10) || 0));
      }
    }
  }
  toolEls.forEach(el => el.addEventListener("click", () => selectTool(el)));

  // Paint cells based on current tool
  function applyToolToCell(cell) {
    if (!currentTool) return;
    const id = cell.getAttribute("data-id");
    const doSet = (a1, a2, pct) => {
      if (typeof window.setHandMix === "function") window.setHandMix(id, a1, a2, pct);
      cell.dataset.a1 = a1;
      cell.dataset.a2 = a2;
      cell.dataset.pct = String(pct);
    };

    switch (currentTool) {
      case "pure-raise":      return doSet("raise", "call", 100); // encodes to AXX
      case "pure-call":       return doSet("call",  "fold", 100); // encodes to CXX
      case "pure-fold":       return doSet("call",  "fold",   0); // encodes to C00
      case "mix-raise-fold":  return doSet("raise", "fold",  mixPct[currentTool] ?? 50);
      case "mix-raise-call":  return doSet("raise", "call",  mixPct[currentTool] ?? 50);
      case "mix-call-fold":   return doSet("call",  "fold",  mixPct[currentTool] ?? 50);
    }
  }

  // Attach click handlers to cells
  document.querySelectorAll("[data-id]").forEach(cell => {
    cell.addEventListener("click", () => applyToolToCell(cell));
  });


  /* =========================
     4) SAVE (CRF) MODAL
  ========================= */
  // Build modal
  const saveBackdrop = document.createElement("div");
  saveBackdrop.className = "crf-backdrop";
  saveBackdrop.id = "crf-out-backdrop";
  saveBackdrop.innerHTML = `
    <div class="crf-modal" role="dialog" aria-modal="true" aria-labelledby="crf-out-title">
      <h3 id="crf-out-title">Current CRF</h3>
      <textarea id="crf-out" readonly></textarea>
      <div class="crf-row">
        <button id="crf-copy" class="crf-btn">Copy</button>
        <button id="crf-close" class="crf-btn primary">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(saveBackdrop);

  const outBackdrop = document.getElementById("crf-out-backdrop");
  const outArea     = document.getElementById("crf-out");
  const outCopy     = document.getElementById("crf-copy");
  const outClose    = document.getElementById("crf-close");
  const saveBtn     = document.getElementById("btn-save-crf");

  function cellToModule(cell) {
    let a1 = cell.dataset.a1;
    let a2 = cell.dataset.a2;
    let pct = cell.dataset.pct;

    if (!a1 || !a2 || pct == null) {
      // fallback to tooltip text
      const txt = (cell.dataset.mix || "").toLowerCase(); // "60% raise / 40% call"
      const m = txt.match(/(\d+)%\s*(raise|call|fold)\s*\/\s*(\d+)%\s*(raise|call|fold)/);
      if (m) { pct = parseInt(m[1], 10); a1 = m[2]; a2 = m[4]; }
      else { a1 = "call"; a2 = "fold"; pct = 0; }
    }

    pct = Math.max(0, Math.min(100, +pct || 0));
    const pct2 = (pct === 100) ? "XX" : String(pct).padStart(2, "0");

    let letter = "C";
    if (a1 === "raise" && a2 === "call") letter = "A";
    else if (a1 === "raise" && a2 === "fold") letter = "B";
    else if (a1 === "call"  && a2 === "fold") letter = "C";

    return `${letter}${pct2}`;
  }

  function buildCRF() {
    const parts = [];
    for (let i = 1; i <= 169; i++) {
      const cell = document.querySelector(`[data-id="${i}"]`);
      parts.push(cellToModule(cell));
    }
    return parts.join("?");
  }

  function openSaveModal() {
    const crf = buildCRF();
    if (outArea) outArea.value = crf;
    if (outBackdrop) outBackdrop.style.display = "flex";
    panel.style.display = "none"; // hide editor panel while showing CRF
  }

  saveBtn && saveBtn.addEventListener("click", openSaveModal);
  outClose && outClose.addEventListener("click", () => outBackdrop.style.display = "none");
  outBackdrop && outBackdrop.addEventListener("click", (e) => { if (e.target === outBackdrop) outBackdrop.style.display = "none"; });
  outCopy && outCopy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(outArea.value);
      outCopy.textContent = "Copied!";
      setTimeout(() => outCopy.textContent = "Copy", 1000);
    } catch {
      outCopy.textContent = "Select & Ctrl/Cmd+C";
      setTimeout(() => outCopy.textContent = "Copy", 1500);
    }
  });
});
