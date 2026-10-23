// Visual QA guard — porovnanie dvoch RGBA snímok.
//
// Nepripája sa na produktové routy ani na zákaznícke účty. Prah dodá volajúci.
// Bez prahu je výsledok BLOCKED: subjektívny rozdiel nie je FAIL.
// Playwright balík v repe je; binárka prehliadača v tomto prostredí pri objave chýbala
// a tento modul ju nepredstiera.

export function compareRgba(baseline, candidate, options = {}) {
  const empty = { changedPixels: null, changedRatio: null };
  if (!baseline || !candidate || !baseline.rgba || !candidate.rgba) {
    return { status: "BLOCKED", code: "missing_frame", ...empty };
  }
  const { width, height } = baseline;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    return { status: "BLOCKED", code: "bad_frame", ...empty };
  }
  if (candidate.width !== width || candidate.height !== height) {
    return { status: "FAIL", code: "dimension_mismatch", ...empty };
  }
  const pixels = width * height;
  const a = baseline.rgba;
  const b = candidate.rgba;
  if (a.length !== pixels * 4 || b.length !== pixels * 4) {
    return { status: "BLOCKED", code: "bad_buffer", ...empty };
  }
  if (typeof options.maxChangedRatio !== "number" || !Number.isFinite(options.maxChangedRatio)) {
    return {
      status: "BLOCKED",
      code: "missing_threshold",
      ...empty,
      note: "bez prahu sa rozdiel nehodnotí ako FAIL",
    };
  }
  const tol = Number.isFinite(options.channelTolerance) ? options.channelTolerance : 0;
  let changed = 0;
  for (let i = 0; i < pixels; i++) {
    const o = i * 4;
    if (
      Math.abs(a[o] - b[o]) > tol ||
      Math.abs(a[o + 1] - b[o + 1]) > tol ||
      Math.abs(a[o + 2] - b[o + 2]) > tol ||
      Math.abs(a[o + 3] - b[o + 3]) > tol
    ) changed++;
  }
  const changedRatio = changed / pixels;
  if (changedRatio > options.maxChangedRatio) {
    return { status: "FAIL", code: "visual_regression", changedPixels: changed, changedRatio };
  }
  return { status: "PASS", code: "within_threshold", changedPixels: changed, changedRatio };
}
