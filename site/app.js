// ===== Helpers =====
const $ = (sel) => document.querySelector(sel);
const view = $("#view");
const btnHome = $("#btnHome");

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function keyDone(mode, level, partFile) {
  return `done:${mode}:${level}:${partFile}`;
}

function partFileToLabel(partFile) {
  const m = /part(\d+)\.json/i.exec(partFile || "");
  const n = m ? parseInt(m[1], 10) : 0;
  return n ? `Phần ${n}` : partFile || "";
}

function setDone(mode, level, partFile, done=true) {
  localStorage.setItem(keyDone(mode, level, partFile), done ? "1" : "0");
}
function isDone(mode, level, partFile) {
  return localStorage.getItem(keyDone(mode, level, partFile)) === "1";
}

async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Không load được: ${path}`);
  return await res.json();
}

// ===== App State =====
const state = {
  config: null,
  mode: null,   // "vocab" | "kanji"
  level: null,  // "N5".."N1"
  partFile: null,
  questions: [],
  order: [],
  idx: 0,
  locked: false
};

btnHome.addEventListener("click", () => routeToHome());

// ===== Views =====
function routeToHome() {
  state.mode = null; state.level = null; state.partFile = null;
  renderHome();
}

function renderHome() {
  view.innerHTML = `
    <div class="card">
      <h1 class="h1">Bạn muốn học gì</h1>
      <p class="sub">Từ vựng hay Chữ Hán</p>
      <div class="grid grid2">
        <button class="btn" id="goVocab">Từ vựng</button>
        <button class="btn" id="goKanji">Chữ Hán</button>
      </div>
    </div>
  `;
  $("#goVocab").onclick = () => renderLevels("vocab");
  $("#goKanji").onclick = () => renderLevels("kanji");
}

function renderLevels(mode) {
  state.mode = mode;
  const levels = ["N5","N4","N3","N2","N1"].filter(lv => state.config[mode]?.[lv]);
  view.innerHTML = `
    <div class="card">
      <h1 class="h1">${mode === "vocab" ? "Từ vựng" : "Chữ Hán"} — chọn cấp</h1>
      <div class="grid grid2" id="levels"></div>
      <div class="row">
        <button class="btnSmall" id="backHome">← Home</button>
      </div>
    </div>
  `;
  $("#backHome").onclick = () => renderHome();

  const box = $("#levels");
  levels.forEach(lv => {
    const parts = state.config[mode][lv];
    const doneCount = parts.filter(p => isDone(mode, lv, p)).length;
    const wrap = document.createElement("div");
    wrap.className = "btnWrap";
    const allDone = doneCount === parts.length;
    wrap.innerHTML = `
      <button class="btn btnLevel" type="button">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div><div class="choiceLine1">${lv}</div><div class="choiceLine2">${doneCount}/${parts.length} phần đã xong</div></div>
          <span class="badge">${parts.length} phần</span>
        </div>
      </button>
      ${!allDone ? `<button class="btnDone" type="button" title="Đánh dấu tất cả đã xong">✓</button>` : ""}
      <button class="btnReset" type="button" title="Reset cấp ${lv}">↺</button>
    `;
    wrap.querySelector(".btnLevel").onclick = () => renderParts(mode, lv);
    const doneBtn = wrap.querySelector(".btnDone");
    if (doneBtn) {
      doneBtn.onclick = (e) => {
        e.stopPropagation();
        parts.forEach(p => setDone(mode, lv, p, true));
        renderLevels(mode);
      };
    }
    wrap.querySelector(".btnReset").onclick = (e) => {
      e.stopPropagation();
      parts.forEach(p => setDone(mode, lv, p, false));
      renderLevels(mode);
    };
    box.appendChild(wrap);
  });
}

function renderParts(mode, level) {
  state.mode = mode;
  state.level = level;
  const parts = state.config[mode][level];

  view.innerHTML = `
    <div class="card">
      <h1 class="h1">${mode === "vocab" ? "Từ vựng" : "Chữ Hán"} — ${level}</h1>
      <p class="sub">Chọn phần chơi</p>
      <div class="grid" id="parts"></div>
      <div class="row">
        <button class="btnSmall" id="backLevels">← Cấp</button>
        <button class="btnSmall" id="backHome">Home</button>
      </div>
    </div>
  `;
  $("#backLevels").onclick = () => renderLevels(mode);
  $("#backHome").onclick = () => renderHome();

  const box = $("#parts");
  parts.forEach((file, i) => {
    const done = isDone(mode, level, file);
    const wrap = document.createElement("div");
    wrap.className = "btnWrap";
    wrap.innerHTML = `
      <button class="btn btnPart" type="button">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div>
            <div class="choiceLine1">Phần ${String(i+1).padStart(2,"0")}</div>
          </div>
          <span class="badge ${done ? "done" : ""}">${done ? "Đã xong" : "Chưa xong"}</span>
        </div>
      </button>
      ${!done ? `<button class="btnDone" type="button" title="Đánh dấu đã xong">✓</button>` : ""}
      <button class="btnReset" type="button" title="Reset phần này">↺</button>
    `;
    wrap.querySelector(".btnPart").onclick = () => startGame(mode, level, file);
    const doneBtn = wrap.querySelector(".btnDone");
    if (doneBtn) {
      doneBtn.onclick = (e) => {
        e.stopPropagation();
        setDone(mode, level, file, true);
        renderParts(mode, level);
      };
    }
    wrap.querySelector(".btnReset").onclick = (e) => {
      e.stopPropagation();
      setDone(mode, level, file, false);
      renderParts(mode, level);
    };
    box.appendChild(wrap);
  });
}

async function startGame(mode, level, partFile) {
  state.mode = mode;
  state.level = level;
  state.partFile = partFile;
  state.idx = 0;
  state.locked = false;

  const path = `data/${mode}/${level}/${partFile}`;
  const items = await loadJSON(path);

  // Trộn thứ tự câu hỏi mỗi lần vào lại
  state.questions = items;
  state.order = shuffle([...Array(items.length).keys()]);
  renderQuestion();
}

function buildChoices(correctItem, poolItems) {
  // correct + 3 distractors từ các item khác
  const others = poolItems.filter(x =>
    !(x.question === correctItem.question && x.answer1 === correctItem.answer1 && x.answer2 === correctItem.answer2)
  );
  const picked = shuffle(others).slice(0, 3);
  const choices = shuffle([correctItem, ...picked]);

  const correctIndex = choices.findIndex(x =>
    x.question === correctItem.question && x.answer1 === correctItem.answer1 && x.answer2 === correctItem.answer2
  );

  return { choices, correctIndex };
}

function renderQuestion(feedback = null) {
  const total = state.order.length;
  const qIndex = state.order[state.idx];
  const item = state.questions[qIndex];

  const { choices, correctIndex } = buildChoices(item, state.questions);

  const partLabel = partFileToLabel(state.partFile);
  view.innerHTML = `
    <div class="card">
      <div class="questionCenter">
        <div class="questionMeta">
          <div class="sub">${state.mode === "vocab" ? "Từ vựng" : "Chữ Hán"} / ${state.level} / ${partLabel}</div>
          <div class="progress">Câu ${state.idx + 1} / ${total}</div>
        </div>
        <div class="bigQ">${escapeHtml(item.question)}</div>
        <div class="grid questionChoices" id="choices"></div>
        ${feedback ? `
          <div class="feedback ${feedback.ok ? "ok" : "ng"}">
            <div class="choiceLine1">${feedback.ok ? "✅ Đúng" : "❌ Sai"}</div>
            <div class="choiceLine2">Đáp án đúng:</div>
            <div class="choiceLine1">${escapeHtml(item.answer1)}</div>
            <div class="choiceLine2">${escapeHtml(item.answer2 ?? "")}</div>
          </div>
        ` : ""}
      </div>
      <div class="row">
        ${feedback && !feedback.ok
          ? `<button class="btnSmall" id="retry">Chơi lại phần này</button><button class="btnSmall" id="toList">Về danh sách phần</button>`
          : `<button class="btnSmall" id="backList">← Danh sách phần</button>`
        }
      </div>
    </div>
  `;

  if (feedback && !feedback.ok) {
    $("#retry").onclick = () => startGame(state.mode, state.level, state.partFile);
    $("#toList").onclick = () => renderParts(state.mode, state.level);
  } else {
    $("#backList").onclick = () => renderParts(state.mode, state.level);
  }

  const box = $("#choices");
  choices.forEach((c, idx) => {
    const btn = document.createElement("button");
    let cls = "btn";
    if (feedback) {
      if (feedback.ok && idx === feedback.correctIndex) cls += " choiceCorrect";
      if (!feedback.ok && idx === feedback.chosenIndex) cls += " choiceWrong";
      if (!feedback.ok && idx === feedback.correctIndex) cls += " choiceCorrect";
    }
    btn.className = cls;
    btn.innerHTML = `
      <div class="choiceLine1">${escapeHtml(c.answer1)}</div>
      <div class="choiceLine2">${escapeHtml(c.answer2 ?? "")}</div>
    `;
    btn.onclick = () => onAnswer(idx === correctIndex, item, idx, correctIndex);
    box.appendChild(btn);
  });
}

function onAnswer(isCorrect, correctItem, chosenIndex, correctIndex) {
  if (state.locked) return;
  state.locked = true;

  if (isCorrect) {
    // Hiển thị đúng + đáp án đúng, tự sang câu tiếp
    renderQuestion({ ok: true, chosenIndex, correctIndex });

    setTimeout(() => {
      state.idx += 1;
      state.locked = false;

      if (state.idx >= state.order.length) {
        // Xong phần
        setDone(state.mode, state.level, state.partFile, true);
        renderFinish();
      } else {
        renderQuestion();
      }
    }, 650);
  } else {
    // Sai: giữ câu hỏi, hiển thị đáp án đúng bên dưới
    renderQuestion({ ok: false, chosenIndex, correctIndex });
  }
}

function renderFinish() {
  view.innerHTML = `
    <div class="card">
      <h1 class="h1">🎉 Hoàn thành phần!</h1>
      <p class="sub">${state.mode === "vocab" ? "Từ vựng" : "Chữ Hán"} / ${state.level} / ${state.partFile}</p>
      <div class="row">
        <button class="btnSmall" id="again">Chơi lại phần này</button>
        <button class="btnSmall" id="toList">Về danh sách phần</button>
        <button class="btnSmall" id="toLevels">Về chọn cấp</button>
      </div>
    </div>
  `;
  $("#again").onclick = () => startGame(state.mode, state.level, state.partFile);
  $("#toList").onclick = () => renderParts(state.mode, state.level);
  $("#toLevels").onclick = () => renderLevels(state.mode);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ===== Boot =====
(async function boot() {
  state.config = await loadJSON("config.json");
  renderHome();
})();
