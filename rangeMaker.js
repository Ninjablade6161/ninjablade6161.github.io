// Build a guaranteed 169-module default (all fold)
const defaultCrf = Array(169).fill("C00").join("?");

let tooltip = null;

/* ---------- color one cell (2-action mix) ---------- */
function setHandMix(id, action1, action2, pct1) {
  const cell = document.querySelector(`[data-id="${id}"]`);
  if (!cell) return;

  const root = getComputedStyle(document.documentElement);
  const colors = {
    raise: root.getPropertyValue("--raise").trim(),
    call:  root.getPropertyValue("--call").trim(),
    fold:  root.getPropertyValue("--fold").trim()
  };

  const color1 = colors[action1] || colors.fold;
  const color2 = colors[action2] || colors.fold;

  pct1 = Math.max(0, Math.min(100, +pct1 || 0));
  const pct2 = 100 - pct1;

  if (pct1 === 100) {
    cell.style.background = color1;
  } else if (pct1 === 0) {
    cell.style.background = color2;
  } else {
    cell.style.background = `linear-gradient(90deg,
      ${color1} 0%,
      ${color1} ${pct1}%,
      ${color2} ${pct1}%,
      ${color2} 100%)`;
  }

  cell.dataset.mix = `${pct1}% ${action1} / ${pct2}% ${action2}`;
}

/* ---------- read full CRF (169) and paint ---------- */
function rangeReader(crf) {
  if (!crf) return;

  const modules = crf.split("?");
  if (modules.length !== 169) {
    alert(`Invalid CRF: expected 169 hands, we got ${modules.length}`);
    return;
  }

  modules.forEach((raw, index) => {
    const mod = (raw || "").trim().toUpperCase();
    const kind = mod[0];      // A | B | C
    const val  = mod.slice(1); // "60" | "XX"
    let pct = (val === "XX") ? 100 : parseInt(val, 10);
    if (isNaN(pct)) pct = 0;

    const id = index + 1;

    if (kind === "A") {
      setHandMix(id, "raise", "call", pct);
    } else if (kind === "B") {
      setHandMix(id, "raise", "fold", pct);
    } else if (kind === "C") {
      setHandMix(id, "call", "fold", pct);
    } else {
      setHandMix(id, "fold", "fold", 0);
    }
  });
}

/* ---------- expose for other files ---------- */
window.setHandMix  = setHandMix;
window.defaultCrf  = defaultCrf;   // <-- add this line
window.rangeReader = rangeReader;

/* ---------- wire after DOM exists ---------- */
document.addEventListener("DOMContentLoaded", () => {
  tooltip = document.getElementById("tooltip");

  // Tooltip hover
  document.querySelectorAll("[data-id]").forEach(cell => {
    cell.addEventListener("mousemove", (e) => {
      if (!tooltip || !cell.dataset.mix) return;
      tooltip.textContent = cell.dataset.mix;
      tooltip.style.left = e.pageX + 10 + "px";
      tooltip.style.top  = e.pageY + 10 + "px";
      tooltip.style.opacity = 1;
    });
    cell.addEventListener("mouseleave", () => {
      if (tooltip) tooltip.style.opacity = 0;
    });
  });

  // Paint default range on load
  rangeReader(defaultCrf);
});

