const assert = require("assert");
const G = require("../logic.js");
const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, a + " != " + b);
let n = 0;
const t = (name, fn) => { fn(); n++; console.log("ok -", name); };

const korean = [
  { name: "Quiz 1", weight: 10, score: 98.83, max: 100 },
  { name: "Composition 1", weight: 5, score: 90, max: 100 },
  { name: "Video message", weight: 10, score: 90, max: 100 },
];

t("earned matches earlier Python result (23.383)", () => near(G.earned(korean), 23.383));
t("remaining weight is 75", () => near(G.remainingWeight(korean), 75));
t("predicted with 80% remaining is 83.383", () => near(G.predictedPercent(korean, 80), 83.383));
t("no assumption returns earned only", () => near(G.predictedPercent(korean, null), 23.383));
t("average so far is 93.532", () => near(G.averageSoFar(korean), 93.532));
t("different max scores convert correctly", () => {
  const l = [
    { weight: 5, score: 18, max: 20 },
    { weight: 5, score: 45, max: 50 },
    { weight: 5, score: 85, max: 100 },
  ];
  near(G.earned(l), 13.25);
});
t("ungraded items are ignored", () => {
  const l = [{ weight: 10, score: 5, max: 10 }, { weight: 20, score: null, max: 100 }];
  near(G.earned(l), 5); near(G.remainingWeight(l), 90);
});
t("validate catches over 100 weight", () =>
  assert.ok(G.validate([{ weight: 60, max: 100 }, { weight: 50, max: 100 }]).length > 0));
t("validate catches score above max", () =>
  assert.ok(G.validate([{ weight: 5, score: 21, max: 20 }]).some(e => e.includes("above max"))));
t("validate catches zero max", () =>
  assert.ok(G.validate([{ weight: 5, score: 1, max: 0 }]).length > 0));
t("validate passes clean data", () => assert.deepStrictEqual(G.validate(korean), []));
t("toGrade boundaries", () => {
  assert.strictEqual(G.toGrade(90, G.DEFAULT_CUTOFFS), "A+");
  assert.strictEqual(G.toGrade(89.99, G.DEFAULT_CUTOFFS), "A");
  assert.strictEqual(G.toGrade(40, G.DEFAULT_CUTOFFS), "D");
  assert.strictEqual(G.toGrade(39.9, G.DEFAULT_CUTOFFS), "F");
  assert.strictEqual(G.toGrade(0, G.DEFAULT_CUTOFFS), "F");
});
t("toGrade respects custom cutoffs", () =>
  assert.strictEqual(G.toGrade(93, Object.assign({}, G.DEFAULT_CUTOFFS, { "A+": 93 })), "A+"));
t("toGrade floating point safe", () =>
  assert.strictEqual(G.toGrade(0.1 + 0.2 + 79.7, G.DEFAULT_CUTOFFS), "A-"));
t("neededScore: 80 target from 23.383 with 75 left = 75.489", () => {
  const r = G.neededScore(korean, 80);
  assert.ok(r.possible); near(r.needed, 75.4893333, 1e-4);
});
t("neededScore: impossible target", () => {
  const r = G.neededScore(korean, 99.5);
  assert.strictEqual(r.possible, false); assert.ok(r.needed > 100);
});
t("neededScore: already secured gives 0", () => {
  const l = [{ weight: 90, score: 90, max: 90 }, { weight: 10, score: null, max: 100 }];
  const r = G.neededScore(l, 85);
  assert.ok(r.possible); near(r.needed, 0);
});
t("neededScore: nothing remaining", () => {
  const l = [{ weight: 100, score: 70, max: 100 }];
  const r = G.neededScore(l, 80);
  assert.strictEqual(r.done, true); assert.strictEqual(r.possible, false);
});
t("gpa weighted by credits (4.01)", () => {
  const c = [{ credits: 3, grade: "A" }, { credits: 3, grade: "A-" }, { credits: 4, grade: "A+" }];
  near(G.gpa(c), (4.0 * 3 + 3.7 * 3 + 4.3 * 4) / 10);
});
t("gpa counts F as zero", () =>
  near(G.gpa([{ credits: 3, grade: "A" }, { credits: 3, grade: "F" }]), 2.0));
t("gpa ignores invalid rows and returns null when empty", () => {
  assert.strictEqual(G.gpa([]), null);
  assert.strictEqual(G.gpa([{ credits: 0, grade: "A" }]), null);
});
t("cumulative GPA blends prior", () => {
  const v = G.cumulativeGpa({ credits: 30, gpa: 3.5 }, [{ credits: 3, grade: "A" }]);
  near(v, (30 * 3.5 + 12) / 33);
});
t("cumulative GPA without prior equals semester GPA", () =>
  near(G.cumulativeGpa(null, [{ credits: 3, grade: "B" }]), 3.0));
t("parseImport fills defaults", () => {
  const d = G.parseImport(JSON.stringify({ subjects: [{ name: "X", credits: 3 }] }));
  assert.strictEqual(d.subjects[0].cutoffs["A+"], 90);
  assert.deepStrictEqual(d.subjects[0].assessments, []);
});
t("parseImport rejects bad data", () => {
  assert.throws(() => G.parseImport("{}"));
  assert.throws(() => G.parseImport("nope"));
});
console.log("\nAll " + n + " tests passed");
