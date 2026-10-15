(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GPA = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const GRADES = ["A+","A","A-","B+","B","B-","C+","C","C-","D+","D","F"];
  const POINTS = { "A+":4.3,"A":4.0,"A-":3.7,"B+":3.3,"B":3.0,"B-":2.7,
                   "C+":2.3,"C":2.0,"C-":1.7,"D+":1.3,"D":1.0,"F":0 };
  const DEFAULT_CUTOFFS = { "A+":90,"A":85,"A-":80,"B+":75,"B":70,"B-":65,
                            "C+":60,"C":55,"C-":50,"D+":45,"D":40 };
  const EPS = 1e-9;

  const isNum = (x) => typeof x === "number" && Number.isFinite(x);
  const graded = (a) => isNum(a.score) && isNum(a.max) && a.max > 0;

  function totalWeight(list) {
    return list.reduce((s, a) => s + (isNum(a.weight) ? a.weight : 0), 0);
  }
  function validate(list) {
    const errors = [];
    list.forEach((a, i) => {
      const n = a.name || "Item " + (i + 1);
      if (!isNum(a.weight) || a.weight < 0) errors.push(n + ": weight must be 0 or more");
      if (!isNum(a.max) || a.max <= 0) errors.push(n + ": max score must be above 0");
      if (isNum(a.score) && a.score < 0) errors.push(n + ": score cannot be negative");
      if (isNum(a.score) && isNum(a.max) && a.score > a.max) errors.push(n + ": score is above max");
    });
    const tw = totalWeight(list);
    if (tw > 100 + EPS) errors.push("Weights add up to " + tw + "% (over 100%)");
    return errors;
  }
  function earned(list) {
    return list.filter(graded).reduce((s, a) => s + (a.score / a.max) * a.weight, 0);
  }
  function gradedWeight(list) {
    return list.filter(graded).reduce((s, a) => s + a.weight, 0);
  }
  function remainingWeight(list) {
    return Math.max(0, 100 - gradedWeight(list));
  }
  function averageSoFar(list) {
    const w = gradedWeight(list);
    return w > 0 ? (earned(list) / w) * 100 : null;
  }
  function predictedPercent(list, assumedRemaining) {
    const e = earned(list);
    if (!isNum(assumedRemaining)) return e;
    return e + (assumedRemaining * remainingWeight(list)) / 100;
  }
  function toGrade(pct, cutoffs) {
    const c = cutoffs || DEFAULT_CUTOFFS;
    const p = Math.round(pct * 1e6) / 1e6;
    for (const g of GRADES) {
      if (g === "F") break;
      if (isNum(c[g]) && p >= c[g]) return g;
    }
    return "F";
  }
  function neededScore(list, targetPct) {
    const rw = remainingWeight(list);
    const gap = targetPct - earned(list);
    if (rw <= EPS) return { possible: gap <= EPS, needed: null, done: true };
    const needed = (gap / rw) * 100;
    return { possible: needed <= 100 + EPS, needed: Math.max(0, needed), done: false };
  }
  function gpa(courses) {
    let credits = 0, pts = 0;
    courses.forEach((c) => {
      if (!isNum(c.credits) || c.credits <= 0 || !(c.grade in POINTS)) return;
      credits += c.credits;
      pts += POINTS[c.grade] * c.credits;
    });
    return credits ? pts / credits : null;
  }
  function cumulativeGpa(prior, courses) {
    const cur = courses.filter((c) => isNum(c.credits) && c.credits > 0 && c.grade in POINTS);
    let credits = cur.reduce((s, c) => s + c.credits, 0);
    let pts = cur.reduce((s, c) => s + POINTS[c.grade] * c.credits, 0);
    if (prior && isNum(prior.credits) && prior.credits > 0 && isNum(prior.gpa)) {
      credits += prior.credits;
      pts += prior.gpa * prior.credits;
    }
    return credits ? pts / credits : null;
  }
  function parseImport(text) {
    const d = JSON.parse(text);
    if (!d || !Array.isArray(d.subjects)) throw new Error("Invalid file");
    d.subjects.forEach((s) => {
      if (!Array.isArray(s.assessments)) s.assessments = [];
      s.cutoffs = Object.assign({}, DEFAULT_CUTOFFS, s.cutoffs || {});
    });
    d.prior = d.prior || { credits: 0, gpa: 0 };
    return d;
  }
  return { GRADES, POINTS, DEFAULT_CUTOFFS, validate, totalWeight, earned, gradedWeight,
           remainingWeight, averageSoFar, predictedPercent, toGrade, neededScore,
           gpa, cumulativeGpa, parseImport };
});
