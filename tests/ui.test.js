const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
let n = 0;
const t = (name, fn) => { fn(); n++; console.log("ok -", name); };

const els = {};
const mk = (id) => (els[id] = { id, innerHTML: "", textContent: "", handlers: {}, classList: { add() {}, remove() {} },
  addEventListener(ev, fn) { this.handlers[ev] = fn; }, click() { this.clicked = true; } });
["app", "summary", "file", "toast"].forEach(mk);
const store = {};
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } };
global.document = { getElementById: (id) => els[id] || (/^res-/.test(id) ? null : null) };
global.confirm = () => true;
global.navigator = {};
global.GPA = require("../logic.js");
global.View = require("../view.js");
const app = require("../app.js");
global.document.getElementById = (id) => {
  if (els[id]) return els[id];
  if (/^res-/.test(id)) return (els[id] = { innerHTML: "" });
  return null;
};
app.init();

const click = (dataset) => app.onClick({ target: { closest: () => ({ dataset }) } });
const input = (dataset, value) => app.onInput({ target: { dataset, value } });
const st = () => app.getState();

t("init renders summary and one starter subject", () => {
  assert.ok(els.app.innerHTML.includes('id="summary"'));
  assert.strictEqual(st().subjects.length, 1);
});
t("no NaN/undefined in initial HTML", () => {
  assert.ok(!/NaN|undefined|null/.test(els.app.innerHTML.replace(/value=""/g, "")), "found bad token");
});
t("load example adds Korean subject with correct numbers", () => {
  click({ act: "demo" });
  assert.strictEqual(st().subjects.length, 2);
  const s = st().subjects[1];
  assert.ok(els.app.innerHTML.includes("Korean (example)"));
  assert.ok(View.resultsHTML(s).includes("23.38"));
});
t("typing a score updates results block and persists", () => {
  const s = st().subjects[1], a = s.assessments[3];
  input({ sid: s.id, aid: a.id, f: "score" }, "80");
  assert.strictEqual(a.score, 80);
  assert.ok(els["res-" + s.id].innerHTML.includes("55.38"));
  assert.ok(JSON.parse(store["polyu-gpa-v1"]).subjects[1].assessments[3].score === 80);
});
t("clearing a score makes it ungraded", () => {
  const s = st().subjects[1], a = s.assessments[3];
  input({ sid: s.id, aid: a.id, f: "score" }, "");
  assert.strictEqual(a.score, null);
});
t("slider changes assumed average and predicted result", () => {
  const s = st().subjects[1];
  input({ sid: s.id, f: "assumed" }, "80");
  assert.ok(els["res-" + s.id].innerHTML.includes("83.38"));
  input({ sid: s.id, f: "assumed" }, "100");
  assert.ok(els["res-" + s.id].innerHTML.includes("98.38"));
});
t("summary GPA appears after setting credits and grade", () => {
  const s = st().subjects[1];
  input({ sid: s.id, f: "assumed" }, "80");
  input({ sid: st().subjects[0].id, f: "credits" }, "0");
  assert.ok(els.summary.innerHTML.includes("3.70"), els.summary.innerHTML);
});
t("manual grade override wins and is labelled", () => {
  const s = st().subjects[1];
  input({ sid: s.id, f: "override" }, "B+");
  assert.ok(els["res-" + s.id].innerHTML.includes("3.30"));
  assert.ok(els["res-" + s.id].innerHTML.includes("manual"));
  input({ sid: s.id, f: "override" }, "auto");
});
t("custom cutoff changes grade", () => {
  const s = st().subjects[1];
  assert.strictEqual(GPA.toGrade(83.38, s.cutoffs), "A-");
  input({ sid: s.id, cut: "A-" }, "84");
  assert.strictEqual(GPA.toGrade(83.38, s.cutoffs), "B+");
  assert.ok(els["res-" + s.id].innerHTML.includes("3.30"));
  click({ act: "reset-cutoffs", sid: s.id });
  assert.strictEqual(st().subjects[1].cutoffs["A-"], 80);
});
t("target grade shows needed score", () => {
  const s = st().subjects[1];
  input({ sid: s.id, f: "target" }, "A");
  assert.ok(/need an average of/.test(els["res-" + s.id].innerHTML) || /already|reached/.test(els["res-" + s.id].innerHTML));
});
t("over-100 weights show a warning", () => {
  const s = st().subjects[1];
  input({ sid: s.id, aid: s.assessments[0].id, f: "weight" }, "90");
  assert.ok(els["res-" + s.id].innerHTML.includes("over 100%"));
  input({ sid: s.id, aid: s.assessments[0].id, f: "weight" }, "10");
});
t("add and delete assessment", () => {
  const s = st().subjects[1], before = s.assessments.length;
  click({ act: "add-assess", sid: s.id });
  assert.strictEqual(st().subjects[1].assessments.length, before + 1);
  click({ act: "del-assess", sid: s.id, aid: st().subjects[1].assessments[before].id });
  assert.strictEqual(st().subjects[1].assessments.length, before);
});
t("previous GPA feeds cumulative GPA", () => {
  input({ prior: "credits" }, "30"); input({ prior: "gpa" }, "3.5");
  assert.strictEqual(st().prior.credits, 30);
  assert.ok(/Cumulative GPA<\/span><b>(\d\.\d\d)/.test(els.summary.innerHTML));
});
t("subject names are HTML-escaped (XSS safe)", () => {
  const s = st().subjects[0];
  input({ sid: s.id, f: "name" }, '<img src=x onerror=alert(1)>');
  click({ act: "add-subject" });
  assert.ok(!els.app.innerHTML.includes("<img src=x"));
  assert.ok(els.app.innerHTML.includes("&lt;img"));
});
t("delete subject", () => {
  const before = st().subjects.length;
  click({ act: "del-subject", sid: st().subjects[0].id });
  assert.strictEqual(st().subjects.length, before - 1);
});
t("state restores from localStorage", () => {
  const d = JSON.parse(store["polyu-gpa-v1"]);
  assert.strictEqual(d.subjects.length, st().subjects.length);
});
t("export click does not throw path (toast element exists)", () => {
  global.URL = { createObjectURL: () => "blob:x", revokeObjectURL() {} };
  global.Blob = function () {};
  const a = { click() {}, remove() {} };
  global.document.createElement = () => a;
  global.document.body = { appendChild() {} };
  click({ act: "export" });
});

console.log("\n-- static checks --");
t("manifest.json is valid and icons exist", () => {
  const m = JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  m.icons.forEach((i) => assert.ok(fs.existsSync(path.join(root, i.src)), i.src));
  assert.strictEqual(m.start_url, "./index.html");
});
t("service worker caches only files that exist", () => {
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const list = JSON.parse(sw.match(/const FILES = (\[[\s\S]*?\]);/)[1]);
  list.filter((f) => f !== "./").forEach((f) => assert.ok(fs.existsSync(path.join(root, f)), f));
});
t("index.html references existing local files", () => {
  const h = fs.readFileSync(path.join(root, "index.html"), "utf8");
  [...h.matchAll(/(?:src|href)="([^"#]+)"/g)].map((m) => m[1]).filter((u) => !/^https?:|^\//.test(u))
    .forEach((u) => assert.ok(fs.existsSync(path.join(root, u)), u));
});
console.log("\nAll " + n + " UI/static tests passed");
