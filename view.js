(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./logic.js"));
  else root.View = factory(root.GPA);
})(typeof self !== "undefined" ? self : this, function (G) {
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const val = (x) => (x === null || x === undefined || Number.isNaN(x) ? "" : esc(x));
  const f2 = (x) => (x === null || x === undefined ? "–" : Number(x).toFixed(2));

  function effectiveGrade(s) {
    if (s.override && s.override !== "auto") return s.override;
    return G.toGrade(G.predictedPercent(s.assessments, s.assumed), s.cutoffs);
  }

  function resultsHTML(s) {
    const errs = G.validate(s.assessments);
    const earned = G.earned(s.assessments);
    const gw = G.gradedWeight(s.assessments);
    const rw = G.remainingWeight(s.assessments);
    const avg = G.averageSoFar(s.assessments);
    const pred = G.predictedPercent(s.assessments, s.assumed);
    const auto = G.toGrade(pred, s.cutoffs);
    const grade = effectiveGrade(s);
    const tw = G.totalWeight(s.assessments);
    const targetPct = s.cutoffs[s.target];
    let need = "";
    if (s.target && Number.isFinite(targetPct)) {
      const r = G.neededScore(s.assessments, targetPct);
      if (r.done) {
        need = r.possible ? "Target " + esc(s.target) + " reached." : "All work is graded, so " + esc(s.target) + " is out of reach.";
      } else if (!r.possible) {
        need = "To reach " + esc(s.target) + " (" + targetPct + "%) you would need <b>" + r.needed.toFixed(1) + "%</b> on the remaining " + rw.toFixed(1) + "%, which is not possible.";
      } else if (r.needed <= 0) {
        need = esc(s.target) + " is already secured.";
      } else {
        need = "To reach " + esc(s.target) + " (" + targetPct + "%) you need an average of <b>" + r.needed.toFixed(1) + "%</b> on the remaining " + rw.toFixed(1) + "%.";
      }
    }
    const warn = errs.map((e) => '<li>' + esc(e) + '</li>').join("");
    const wnote = errs.length === 0 && Math.abs(tw - 100) > 1e-9
      ? '<p class="hint">Weights currently add up to ' + tw + '%. Unlisted work counts as remaining.</p>' : "";
    return (
      (warn ? '<ul class="errors">' + warn + '</ul>' : "") + wnote +
      '<div class="stats">' +
        '<div><span>Earned</span><b>' + f2(earned) + ' / ' + gw.toFixed(2) + '</b></div>' +
        '<div><span>Average so far</span><b>' + (avg === null ? "–" : avg.toFixed(2) + "%") + '</b></div>' +
        '<div><span>Remaining</span><b>' + rw.toFixed(2) + '%</b></div>' +
      '</div>' +
      '<div class="predict">' +
        '<div class="pct">' + f2(pred) + '<small>%</small></div>' +
        '<div class="pill">' + esc(grade) + '</div>' +
        '<div class="pts">' + f2(G.POINTS[grade]) + ' pts' + (grade !== auto ? ' <em>(manual)</em>' : "") + '</div>' +
      '</div>' +
      '<p class="assume">Assuming <b>' + (s.assumed == null ? 0 : s.assumed) + '%</b> on the remaining work</p>' +
      '<p class="need">' + need + '</p>'
    );
  }

  function assessmentRow(s, a) {
    const b = 'data-sid="' + esc(s.id) + '" data-aid="' + esc(a.id) + '"';
    return '<div class="arow">' +
      '<input ' + b + ' data-f="name" value="' + val(a.name) + '" placeholder="Quiz 1" aria-label="Name">' +
      '<input ' + b + ' data-f="weight" type="number" inputmode="decimal" min="0" step="any" value="' + val(a.weight) + '" placeholder="%" aria-label="Weight %">' +
      '<input ' + b + ' data-f="score" type="number" inputmode="decimal" min="0" step="any" value="' + val(a.score) + '" placeholder="score" aria-label="Score">' +
      '<input ' + b + ' data-f="max" type="number" inputmode="decimal" min="0" step="any" value="' + val(a.max) + '" placeholder="out of" aria-label="Out of">' +
      '<button class="icon" data-act="del-assess" ' + b + ' title="Remove" aria-label="Remove">✕</button>' +
    '</div>';
  }

  function subjectHTML(s) {
    const sid = 'data-sid="' + esc(s.id) + '"';
    const gradeOpts = (sel, withAuto) =>
      (withAuto ? '<option value="auto"' + (sel === "auto" || !sel ? " selected" : "") + '>Auto</option>' : "") +
      G.GRADES.filter((g) => withAuto || g !== "F").map((g) =>
        '<option' + (g === sel ? " selected" : "") + '>' + g + '</option>').join("");
    const cuts = G.GRADES.filter((g) => g !== "F").map((g) =>
      '<label class="cut"><span>' + g + '</span><input ' + sid + ' data-cut="' + g +
      '" type="number" step="any" value="' + val(s.cutoffs[g]) + '"></label>').join("");
    return '<section class="card subject" ' + sid + '>' +
      '<header class="shead">' +
        '<input class="title" ' + sid + ' data-f="name" value="' + val(s.name) + '" placeholder="Subject name" aria-label="Subject name">' +
        '<label class="credits">Credits<input ' + sid + ' data-f="credits" type="number" inputmode="decimal" min="0" step="any" value="' + val(s.credits) + '"></label>' +
        '<button class="icon danger" data-act="del-subject" ' + sid + ' title="Delete subject" aria-label="Delete subject">🗑</button>' +
      '</header>' +
      '<div class="alabels"><span>Item</span><span>Weight %</span><span>Score</span><span>Out of</span><span></span></div>' +
      s.assessments.map((a) => assessmentRow(s, a)).join("") +
      '<button class="ghost" data-act="add-assess" ' + sid + '>+ Add assessment</button>' +
      '<div class="controls">' +
        '<label class="slider">Assumed average on remaining work' +
          '<input ' + sid + ' data-f="assumed" type="range" min="0" max="100" step="1" value="' + (s.assumed == null ? 80 : s.assumed) + '"></label>' +
        '<label>Target grade<select ' + sid + ' data-f="target">' + gradeOpts(s.target, false) + '</select></label>' +
        '<label>Final grade<select ' + sid + ' data-f="override">' + gradeOpts(s.override, true) + '</select></label>' +
      '</div>' +
      '<div class="results" id="res-' + esc(s.id) + '">' + resultsHTML(s) + '</div>' +
      '<details class="cutoffs"><summary>Grade cutoffs (minimum % for each grade)</summary>' +
        '<p class="hint">Copy these from your subject syllabus. They differ between subjects.</p>' +
        '<div class="cutgrid">' + cuts + '</div>' +
        '<button class="ghost" data-act="reset-cutoffs" ' + sid + '>Reset to template</button>' +
      '</details>' +
    '</section>';
  }

  function summaryData(state) {
    const courses = state.subjects.map((s) => ({ credits: s.credits, grade: effectiveGrade(s) }));
    const credits = courses.reduce((t, c) => t + (Number.isFinite(c.credits) ? c.credits : 0), 0);
    return { sem: G.gpa(courses), cum: G.cumulativeGpa(state.prior, courses), credits: credits };
  }

  function summaryHTML(state) {
    const d = summaryData(state);
    return '<div class="gpa-card"><span>Semester GPA</span><b>' + f2(d.sem) + '</b><small>/ 4.30</small></div>' +
           '<div class="gpa-card alt"><span>Cumulative GPA</span><b>' + f2(d.cum) + '</b><small>/ 4.30</small></div>' +
           '<div class="gpa-card dim"><span>Credits this sem</span><b>' + d.credits + '</b></div>';
  }

  function appHTML(state) {
    return '<div class="summary" id="summary">' + summaryHTML(state) + '</div>' +
      '<section class="card prior"><h2>Previous semesters</h2>' +
        '<div class="priorgrid">' +
          '<label>Credits completed<input data-prior="credits" type="number" min="0" step="any" value="' + val(state.prior.credits) + '"></label>' +
          '<label>Cumulative GPA<input data-prior="gpa" type="number" min="0" max="4.3" step="any" value="' + val(state.prior.gpa) + '"></label>' +
        '</div></section>' +
      state.subjects.map(subjectHTML).join("") +
      (state.subjects.length === 0 ? '<p class="empty">No subjects yet. Add your first one below.</p>' : "") +
      '<div class="actions">' +
        '<button class="primary" data-act="add-subject">+ Add subject</button>' +
        '<button class="ghost" data-act="export">Export</button>' +
        '<button class="ghost" data-act="import">Import</button>' +
        '<button class="ghost" data-act="demo">Load example</button>' +
      '</div>';
  }

  return { esc, resultsHTML, subjectHTML, summaryHTML, summaryData, appHTML, effectiveGrade };
});
