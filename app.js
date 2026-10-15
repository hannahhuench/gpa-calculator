(function () {
  const KEY = "polyu-gpa-v1";
  const uid = () => Math.random().toString(36).slice(2, 9);
  const num = (v) => { if (v === "" || v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

  const newAssessment = () => ({ id: uid(), name: "", weight: null, score: null, max: 100 });
  const newSubject = (name) => ({
    id: uid(), name: name || "", credits: 3, assessments: [newAssessment()],
    cutoffs: Object.assign({}, GPA.DEFAULT_CUTOFFS), assumed: 80, target: "A", override: "auto",
  });

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = GPA.parseImport(raw);
        d.subjects.forEach((s) => {
          s.id = s.id || uid();
          s.assessments.forEach((a) => (a.id = a.id || uid()));
          if (s.assumed === undefined) s.assumed = 80;
          s.target = s.target || "A";
          s.override = s.override || "auto";
        });
        return d;
      }
    } catch (e) { /* fall through to fresh state */ }
    return { subjects: [newSubject("")], prior: { credits: 0, gpa: 0 } };
  }

  let state = load();
  const $ = (id) => document.getElementById(id);
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };
  const find = (sid) => state.subjects.find((s) => s.id === sid);

  function render() { $("app").innerHTML = View.appHTML(state); }
  function refresh() {
    state.subjects.forEach((s) => { const el = $("res-" + s.id); if (el) el.innerHTML = View.resultsHTML(s); });
    $("summary").innerHTML = View.summaryHTML(state);
    save();
  }
  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2200);
  }

  function onInput(e) {
    const el = e.target, d = el.dataset;
    if (d.prior) { state.prior[d.prior] = num(el.value) || 0; return refresh(); }
    const s = d.sid && find(d.sid);
    if (!s) return;
    if (d.cut) { s.cutoffs[d.cut] = num(el.value); return refresh(); }
    if (d.aid) {
      const a = s.assessments.find((x) => x.id === d.aid);
      if (!a) return;
      a[d.f] = d.f === "name" ? el.value : num(el.value);
      return refresh();
    }
    if (d.f === "name") s.name = el.value;
    else if (d.f === "credits" || d.f === "assumed") s[d.f] = num(el.value);
    else if (d.f === "target" || d.f === "override") s[d.f] = el.value;
    refresh();
  }

  function download(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function demo() {
    const s = newSubject("Korean (example)");
    s.assessments = [
      { id: uid(), name: "Quiz 1", weight: 10, score: 98.83, max: 100 },
      { id: uid(), name: "Composition 1", weight: 5, score: 90, max: 100 },
      { id: uid(), name: "Video message", weight: 10, score: 90, max: 100 },
      { id: uid(), name: "Final exam", weight: 40, score: null, max: 100 },
    ];
    state.subjects.push(s);
  }

  function onClick(e) {
    const el = e.target.closest ? e.target.closest("[data-act]") : null;
    if (!el) return;
    const act = el.dataset.act, s = el.dataset.sid && find(el.dataset.sid);
    if (act === "add-subject") state.subjects.push(newSubject(""));
    else if (act === "demo") demo();
    else if (act === "del-subject" && s) {
      if (!confirm("Delete " + (s.name || "this subject") + "?")) return;
      state.subjects = state.subjects.filter((x) => x !== s);
    }
    else if (act === "add-assess" && s) s.assessments.push(newAssessment());
    else if (act === "del-assess" && s) s.assessments = s.assessments.filter((a) => a.id !== el.dataset.aid);
    else if (act === "reset-cutoffs" && s) s.cutoffs = Object.assign({}, GPA.DEFAULT_CUTOFFS);
    else if (act === "export") { download("gpa-data.json", JSON.stringify(state, null, 2)); return toast("Exported"); }
    else if (act === "import") return $("file").click();
    else return;
    save(); render();
  }

  function onFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = GPA.parseImport(String(r.result));
        d.subjects.forEach((s) => {
          s.id = s.id || uid();
          s.assessments.forEach((a) => (a.id = a.id || uid()));
          if (s.assumed === undefined) s.assumed = 80;
          s.target = s.target || "A"; s.override = s.override || "auto";
        });
        state = d; save(); render(); toast("Imported");
      } catch (err) { toast("Could not read that file"); }
    };
    r.readAsText(f);
    e.target.value = "";
  }

  function init() {
    render();
    $("app").addEventListener("input", onInput);
    $("app").addEventListener("change", onInput);
    $("app").addEventListener("click", onClick);
    $("file").addEventListener("change", onFile);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  if (typeof module === "object" && module.exports) module.exports = { init, getState: () => state, onInput, onClick };
  else init();
})();
