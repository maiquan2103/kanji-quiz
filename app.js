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

const STORAGE_KEY_ACCOUNT = "kanji-quiz:currentAccount";
const DONE_CONFIG_PATH = "done-config.json";
const DATA_BASE_URL = "https://raw.githubusercontent.com/maiquan2103/Japanese-file/refs/heads/master";
const BJT_STUDY_BASE_PATH = `${DATA_BASE_URL}/bjt-study`;

function keyDone(accountId, mode, level, partFile) {
  return `done:${accountId}:${mode}:${level}:${partFile}`;
}

function partFileToLabel(partFile, mode) {
  if ((partFile || "").toLowerCase() === "all.json") {
    return mode === "kanji" ? "Tất cả chữ Hán" : "Tất cả từ vựng";
  }
  const m = /part(\d+)\.json/i.exec(partFile || "");
  const n = m ? parseInt(m[1], 10) : 0;
  return n ? `Phần ${n}` : (partFile || "");
}

function setDone(mode, level, partFile, done) {
  if (!state.accountId) return;
  localStorage.setItem(keyDone(state.accountId, mode, level, partFile), done ? "1" : "0");
}

function isDone(mode, level, partFile) {
  if (!state.accountId) return false;
  return localStorage.getItem(keyDone(state.accountId, mode, level, partFile)) === "1";
}

async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Không load được: ${path}`);
  return await res.json();
}

async function loadDoneConfig() {
  try {
    const res = await fetch(DONE_CONFIG_PATH, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (!data || !data.accounts) return;

    for (const accountId of Object.keys(data.accounts)) {
      const acc = data.accounts[accountId];
      if (!acc || typeof acc !== "object") continue;

      for (const mode of Object.keys(acc)) {
        const levels = acc[mode];
        if (!levels || typeof levels !== "object") continue;

        for (const level of Object.keys(levels)) {
          const parts = levels[level];
          if (!Array.isArray(parts)) continue;

          for (const partFile of parts) {
            localStorage.setItem(keyDone(accountId, mode, level, partFile), "1");
          }
        }
      }
    }
  } catch (_) {}
}

// ===== App State =====
const state = {
  config: null,
  accountId: null,
  mode: null, // "vocab" | "kanji"
  level: null, // "N5".."N1"
  partFile: null,
  questions: [],
  order: [],
  idx: 0,
  locked: false,
  currentChoices: null,
  currentCorrectIndex: null
};

btnHome.addEventListener("click", () => routeToHome());
$("#btnLogout")?.addEventListener("click", logout);

function logout() {
  state.accountId = null;
  localStorage.removeItem(STORAGE_KEY_ACCOUNT);
  updateTopbar(false);
  renderLogin();
}

function updateTopbar(loggedIn) {
  const home = $("#btnHome");
  const logoutBtn = $("#btnLogout");
  const userInfo = $("#userInfo");

  if (logoutBtn) logoutBtn.style.display = loggedIn ? "" : "none";
  if (home) home.style.display = loggedIn ? "" : "none";
  if (userInfo) {
    userInfo.textContent = loggedIn ? state.accountId : "";
    userInfo.style.display = loggedIn ? "" : "none";
  }
}

// ===== Views =====
function renderLogin() {
  view.innerHTML = `
    <div class="card cardHome cardLogin">
      <h1 class="h1">Đăng nhập</h1>
      <p class="sub">Nhập tên tài khoản (không cần mật khẩu)</p>
      <form id="loginForm" class="loginForm">
        <input type="text" id="loginInput" class="loginInput" placeholder="Tên tài khoản" autocomplete="username" />
        <button type="submit" class="btn" id="loginBtn">Đăng nhập</button>
      </form>
    </div>
  `;

  const form = $("#loginForm");
  const input = $("#loginInput");

  form.onsubmit = (e) => {
    e.preventDefault();
    const id = input.value.trim();
    if (!id) return;
    state.accountId = id;
    localStorage.setItem(STORAGE_KEY_ACCOUNT, id);
    updateTopbar(true);
    renderHome();
  };

  if (input) input.focus();
}

function routeToHome() {
  state.mode = null;
  state.level = null;
  state.partFile = null;
  renderHome();
}

function renderHome() {
  view.innerHTML = `
    <div class="card cardHome">
      <h1 class="h1">Bạn muốn học gì</h1>
      <div class="grid grid2">
        <button class="btn" id="goVocab">Từ vựng</button>
        <button class="btn" id="goKanji">Chữ Hán</button>
        <button class="btn" id="goNgheBjt">Nghe BJT</button>
      </div>
    </div>
  `;

  $("#goVocab").onclick = () => renderLevels("vocab");
  $("#goKanji").onclick = () => renderLevels("kanji");
  $("#goNgheBjt").onclick = () => renderNgheBjt();
}

function renderNgheBjt() {
  view.innerHTML = `
    <div class="card">
      <div class="cardTitleRow">
        <h1 class="h1">Nghe BJT</h1>
        <button class="btnSmall" id="backHomeBjt">← Home</button>
      </div>
      <p class="sub">Chọn Book</p>
      <div class="grid grid2" id="ngheBjtBooks"></div>
    </div>
  `;

  $("#backHomeBjt").onclick = () => renderHome();
  const box = $("#ngheBjtBooks");

  ["Book1"].forEach((book) => {
    const btn = document.createElement("button");
    btn.className = "btn btnBjtCd";
    btn.textContent = book;
    btn.onclick = () => renderNgheBjtBook(book);
    box.appendChild(btn);
  });
}

function renderNgheBjtBook(book) {
  view.innerHTML = `
    <div class="card">
      <div class="cardTitleRow">
        <h1 class="h1">Nghe BJT — ${book}</h1>
        <button class="btnSmall" id="backBjtBooks">← Book</button>
      </div>
      <p class="sub">Chọn CD</p>
      <div class="grid grid2" id="ngheBjtCds"></div>
    </div>
  `;

  $("#backBjtBooks").onclick = () => renderNgheBjt();
  const box = $("#ngheBjtCds");

  ["CD1", "CD2"].forEach((cd) => {
    const btn = document.createElement("button");
    btn.className = "btn btnBjtCd";
    btn.textContent = cd;
    btn.onclick = () => renderNgheBjtCD(book, cd);
    box.appendChild(btn);
  });
}

async function renderNgheBjtCD(book, cd) {
  view.innerHTML = `
    <div class="card">
      <div class="cardTitleRow">
        <h1 class="h1">Nghe BJT — ${book} / ${cd}</h1>
        <button class="btnSmall" id="backBjtList">← CD</button>
      </div>
      <p class="sub">Đang tải...</p>
      <div id="ngheBjtTracks"></div>
    </div>
  `;

  $("#backBjtList").onclick = () => renderNgheBjtBook(book);
  const box = $("#ngheBjtTracks");

  try {
    const data = await loadJSON(`${BJT_STUDY_BASE_PATH}/${book}/${cd}/list.json`);
    const tracks = Array.isArray(data) ? data : (data.tracks || []);

    document.querySelector(".sub").textContent = tracks.length
      ? "Nhấn play để nghe"
      : `Chưa có file. Thêm file mp3 vào thư mục ${BJT_STUDY_BASE_PATH}/${book}/${cd} và cập nhật list.json (mảng \"tracks\" với tên file).`;

    tracks.forEach((file, i) => {
      const src = `${BJT_STUDY_BASE_PATH}/${book}/${cd}/${encodeURIComponent(file)}`;
      const wrap = document.createElement("div");
      wrap.className = "ngheBjtRow";
      wrap.innerHTML = `
        <span class="ngheBjtLabel">${i + 1}番</span>
        <audio class="ngheBjtAudio" preload="none" controls src="${src}"></audio>
      `;

      const audio = wrap.querySelector("audio");
      audio.addEventListener("play", () => {
        document.querySelectorAll("#ngheBjtTracks .ngheBjtAudio").forEach((el) => {
          if (el !== audio) el.pause();
        });
      });

      box.appendChild(wrap);
    });
  } catch (e) {
    document.querySelector(".sub").textContent = `Không tải được danh sách. Kiểm tra file ${BJT_STUDY_BASE_PATH}/${book}/${cd}/list.json.`;
  }
}

function renderLevels(mode) {
  state.mode = mode;
  const levels = ["N5", "N4", "N3", "N2", "N1"].filter((lv) => state.config[mode]?.[lv]);

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

  levels.forEach((lv) => {
    const parts = state.config[mode][lv];
    const doneCount = parts.filter((p) => isDone(mode, lv, p)).length;
    const wrap = document.createElement("div");
    wrap.className = "btnWrap";
    const allDone = doneCount === parts.length;

    wrap.innerHTML = `
      <button class="btn btnLevel" type="button">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div>
            <div class="choiceLine1">${lv}</div>
            <div class="choiceLine2">${doneCount}/${parts.length} phần đã xong</div>
          </div>
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
        parts.forEach((p) => setDone(mode, lv, p, true));
        renderLevels(mode);
      };
    }

    wrap.querySelector(".btnReset").onclick = (e) => {
      e.stopPropagation();
      parts.forEach((p) => setDone(mode, lv, p, false));
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
      <div class="cardTitleRow">
        <h1 class="h1">${mode === "vocab" ? "Từ vựng" : "Chữ Hán"} — ${level}</h1>
        <button class="btnSmall" id="backLevels">← Cấp</button>
      </div>
      <p class="sub">Chọn phần chơi</p>
      <div class="grid" id="parts"></div>
      <div class="row">
        <button class="btnSmall" id="backLevels2">← Cấp</button>
        <button class="btnSmall" id="backHome">Home</button>
      </div>
    </div>
  `;

  $("#backLevels").onclick = () => renderLevels(mode);
  $("#backLevels2").onclick = () => renderLevels(mode);
  $("#backHome").onclick = () => renderHome();

  const box = $("#parts");

  parts.forEach((file) => {
    const done = isDone(mode, level, file);
    const wrap = document.createElement("div");
    wrap.className = "btnWrap";

    wrap.innerHTML = `
      <button class="btn btnPart" type="button">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div>
            <div class="choiceLine1">${partFileToLabel(file, mode)}</div>
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

  const path = `${DATA_BASE_URL}/${mode}/${level}/${partFile}`;
  const items = await loadJSON(path);

  state.questions = items;
  state.order = shuffle([...Array(items.length).keys()]);
  renderQuestion();
}

function buildChoices(correctItem, poolItems) {
  const others = poolItems.filter((x) =>
    !(x.question === correctItem.question && x.answer1 === correctItem.answer1 && x.answer2 === correctItem.answer2)
  );

  const picked = shuffle(others).slice(0, 3);
  const choices = shuffle([correctItem, ...picked]);

  const correctIndex = choices.findIndex((x) =>
    x.question === correctItem.question && x.answer1 === correctItem.answer1 && x.answer2 === correctItem.answer2
  );

  return { choices, correctIndex };
}

function renderQuestion(feedback = null) {
  const total = state.order.length;
  const qIndex = state.order[state.idx];
  const item = state.questions[qIndex];

  let choices;
  let correctIndex;

  if (!feedback) {
    const built = buildChoices(item, state.questions);
    choices = built.choices;
    correctIndex = built.correctIndex;
    state.currentChoices = choices;
    state.currentCorrectIndex = correctIndex;
  } else {
    choices = state.currentChoices;
    correctIndex = state.currentCorrectIndex;
  }

  const partLabel = partFileToLabel(state.partFile, state.mode);

  view.innerHTML = `
    <div class="card">
      <div class="questionCenter">
        <div class="questionMeta">
          <div class="sub">${state.mode === "vocab" ? "Từ vựng" : "Chữ Hán"} / ${state.level} / ${partLabel}</div>
          <div class="progress">Câu ${state.idx + 1} / ${total}</div>
        </div>
        <div class="bigQ">${escapeHtml(item.question)}</div>
        ${feedback && state.mode !== "kanji" ? `<div class="answer1Reveal">${escapeHtml(item.answer1)}</div>` : ""}
        <div class="grid questionChoices" id="choices"></div>
        ${feedback ? `
          <div class="feedback ${feedback.ok ? "ok" : "ng"}">
            <div class="choiceLine1">${feedback.ok ? "Tuyệt vời!" : "Cố lên, lại lần nữa nào!"}</div>
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

    if (state.mode === "kanji") {
      btn.innerHTML = `<div class="choiceLine1">${escapeHtml(c.answer1 ?? "")}</div><div class="choiceLine2">${escapeHtml(c.answer2 ?? "")}</div>`;
    } else {
      btn.innerHTML = `<div class="choiceLine2">${escapeHtml(c.answer2 ?? "")}</div>`;
    }

    btn.onclick = () => onAnswer(idx === correctIndex, idx, correctIndex);
    box.appendChild(btn);
  });
}

function onAnswer(isCorrect, chosenIndex, correctIndex) {
  if (state.locked) return;
  state.locked = true;

  if (isCorrect) {
    renderQuestion({ ok: true, chosenIndex, correctIndex });

    setTimeout(() => {
      state.idx += 1;
      state.locked = false;

      if (state.idx >= state.order.length) {
        setDone(state.mode, state.level, state.partFile, true);
        renderFinish();
      } else {
        renderQuestion();
      }
    }, state.mode === "kanji" ? 1000 : 1500);
  } else {
    renderQuestion({ ok: false, chosenIndex, correctIndex });
  }
}

function renderFinish() {
  view.innerHTML = `
    <div class="card">
      <h1 class="h1">🎉 Hoàn thành phần!</h1>
      <p class="sub">${state.mode === "vocab" ? "Từ vựng" : "Chữ Hán"} / ${state.level} / ${partFileToLabel(state.partFile, state.mode)}</p>
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
  await loadDoneConfig();
  state.accountId = localStorage.getItem(STORAGE_KEY_ACCOUNT);

  if (state.accountId) {
    updateTopbar(true);
    renderHome();
  } else {
    updateTopbar(false);
    renderLogin();
  }
})();
