/* ============================================================
   題庫管理後台 — Admin Panel JS
   ============================================================ */

(function () {
  "use strict";

  var LETTERS = ["A", "B", "C", "D", "E", "F"];
  var allData = window.ADMIN_DATA ? window.ADMIN_DATA.slice() : [];
  var currentEdit = null;   // null = new; object = editing
  var isReadOnly  = false;
  var modalOpts   = [];
  var currentAns  = "A";

  /* ── Escape HTML ──────────────────────────────────────── */
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ── Source label HTML ────────────────────────────────── */
  function srcLabel(source) {
    if (source === "user")  return '<span class="tag tag-amber">新增</span>';
    if (source === "group") return '<span class="tag tag-amber">本組設計</span>';
    return "課程題庫";
  }

  /* ── Render table ─────────────────────────────────────── */
  function renderTable(data) {
    var tbody = document.getElementById("q-tbody");
    var noRes = document.getElementById("no-results");
    if (!tbody) return;

    if (data.length === 0) {
      tbody.innerHTML = "";
      if (noRes) noRes.style.display = "";
      return;
    }
    if (noRes) noRes.style.display = "none";

    tbody.innerHTML = data.map(function (q, i) {
      var opBtn = q.source !== "course"
        ? '<button class="btn btn-sm btn-ghost" data-id="' + q.id + '" data-op="edit">編輯</button>'
        : '<button class="btn btn-sm btn-ghost" data-id="' + q.id + '" data-op="view">檢視</button>';
      return "<tr>" +
        "<td class=\"dim\">" + (i + 1) + "</td>" +
        "<td style=\"font-family:var(--font-sans);white-space:normal;max-width:0;\">" +
          "<div style=\"overflow:hidden;text-overflow:ellipsis;white-space:nowrap;\">" + esc(q.stem) + "</div>" +
        "</td>" +
        "<td>" + q.choices.length + "</td>" +
        "<td><span class=\"tag tag-green\">" + esc(q.answer) + "</span></td>" +
        "<td class=\"dim\">" + srcLabel(q.source) + "</td>" +
        "<td>" + opBtn + "</td>" +
        "</tr>";
    }).join("");

    // Delegate clicks on op buttons
    tbody.querySelectorAll("button[data-op]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id  = parseInt(this.dataset.id, 10);
        var op  = this.dataset.op;
        var q   = allData.find(function (x) { return x.id === id; });
        if (!q) return;
        if (op === "edit") openEdit(q);
        else               openView(q);
      });
    });

    updateSidebar();
  }

  function filteredData() {
    var s = (document.getElementById("admin-search").value || "").toLowerCase();
    if (!s) return allData;
    return allData.filter(function (q) {
      return q.stem.toLowerCase().indexOf(s) >= 0 || String(q.id).indexOf(s) >= 0;
    });
  }

  function updateSidebar() {
    var userCount = allData.filter(function (q) { return q.source === "user"; }).length;
    var clearBtn  = document.getElementById("btn-clear");
    var statUser  = document.getElementById("stat-user");
    var statTotal = document.getElementById("stat-total");
    if (clearBtn) clearBtn.style.display = userCount > 0 ? "" : "none";
    if (statUser)  statUser.innerHTML  = userCount + "<span class=\"unit\">題</span>";
    if (statTotal) statTotal.innerHTML = allData.length + "<span class=\"unit\">題</span>";
  }

  /* ── Options editor ───────────────────────────────────── */
  function renderOpts() {
    var list = document.getElementById("opts-list");
    var addBtn = document.getElementById("btn-add-opt");
    if (!list) return;
    list.innerHTML = "";

    modalOpts.forEach(function (opt, i) {
      var row = document.createElement("div");
      row.style.cssText = "display:flex;gap:8px;align-items:center;";

      /* Letter badge */
      var badge = document.createElement("span");
      badge.className = "mono";
      badge.textContent = opt.key;
      badge.style.cssText = "width:28px;height:36px;flex-shrink:0;display:flex;align-items:center;" +
        "justify-content:center;background:var(--bg-elev-2);border:1px solid var(--border);" +
        "border-radius:var(--radius);font-weight:600;";
      badge.style.color = (opt.key === currentAns) ? "var(--green)" : "var(--text-dim)";

      /* Text input */
      var inp = document.createElement("input");
      inp.className = "input";
      inp.value = opt.text;
      inp.placeholder = "選項 " + opt.key + " 內容";
      inp.style.fontFamily = "var(--font-sans)";
      inp.disabled = isReadOnly;
      inp.addEventListener("input", (function (idx) {
        return function () { modalOpts[idx].text = this.value; };
      })(i));

      /* Radio label */
      var lbl = document.createElement("label");
      lbl.style.cssText = "display:flex;align-items:center;gap:4px;font-size:12px;" +
        "font-family:var(--font-mono);cursor:pointer;flex-shrink:0;";
      lbl.style.color = (opt.key === currentAns) ? "var(--green)" : "var(--text-dim)";

      var radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "modal-ans";
      radio.checked = (opt.key === currentAns);
      radio.style.accentColor = "var(--green)";
      radio.disabled = isReadOnly;
      radio.addEventListener("change", (function (key) {
        return function () { currentAns = key; renderOpts(); };
      })(opt.key));

      lbl.appendChild(radio);
      lbl.appendChild(document.createTextNode("正解"));

      row.appendChild(badge);
      row.appendChild(inp);
      row.appendChild(lbl);

      /* Delete option button */
      if (!isReadOnly && modalOpts.length > 2) {
        var delOpt = document.createElement("button");
        delOpt.className = "btn btn-sm btn-ghost";
        delOpt.textContent = "✕";
        delOpt.style.padding = "6px 10px";
        delOpt.title = "刪除選項";
        delOpt.addEventListener("click", (function (idx) {
          return function () { removeOpt(idx); };
        })(i));
        row.appendChild(delOpt);
      }

      list.appendChild(row);
    });

    if (addBtn) addBtn.disabled = isReadOnly || modalOpts.length >= 6;
  }

  function addOpt() {
    if (modalOpts.length >= 6 || isReadOnly) return;
    modalOpts.push({ key: LETTERS[modalOpts.length], text: "" });
    renderOpts();
  }

  function removeOpt(idx) {
    if (modalOpts.length <= 2 || isReadOnly) return;
    modalOpts.splice(idx, 1);
    modalOpts = modalOpts.map(function (o, i) { return { key: LETTERS[i], text: o.text }; });
    if (!modalOpts.find(function (o) { return o.key === currentAns; })) {
      currentAns = modalOpts[0].key;
    }
    renderOpts();
  }

  /* ── Modal open/close ─────────────────────────────────── */
  function openModal(title, q, readOnly) {
    isReadOnly  = !!readOnly;
    currentEdit = q || null;

    document.getElementById("modal-title").textContent = title;
    document.getElementById("f-stem").value  = q ? q.stem  : "";
    document.getElementById("f-block").value = q ? q.block : "";
    document.getElementById("f-hint").value  = q ? q.hint  : "";
    document.getElementById("f-stem").readOnly  = isReadOnly;
    document.getElementById("f-block").readOnly = isReadOnly;
    document.getElementById("f-hint").readOnly  = isReadOnly;

    document.getElementById("modal-err").style.display = "none";
    document.getElementById("btn-save").style.display    = isReadOnly ? "none" : "";
    document.getElementById("btn-add-opt").style.display = isReadOnly ? "none" : "";
    document.getElementById("btn-del-q").style.display   =
      (!isReadOnly && q && q.source !== "course") ? "" : "none";

    modalOpts  = q
      ? q.choices.map(function (c) { return { key: c.key, text: c.text }; })
      : [
          { key: "A", text: "" },
          { key: "B", text: "" },
          { key: "C", text: "" },
          { key: "D", text: "" },
        ];
    currentAns = q ? q.answer : "A";

    renderOpts();
    document.getElementById("modal-backdrop").style.display = "";
  }

  function closeModal() {
    document.getElementById("modal-backdrop").style.display = "none";
    currentEdit = null;
    isReadOnly  = false;
  }

  function openEdit(q) { openModal("edit_question / " + q.id, q, false); }
  function openView(q) { openModal("view_question / " + q.id, q, true);  }
  function openAdd()   { openModal("new_question / 新增題目",  null, false); }

  /* ── Validation & save ────────────────────────────────── */
  function showErr(msg) {
    var el = document.getElementById("modal-err");
    el.textContent = "! " + msg;
    el.style.display = "";
  }

  function saveQuestion() {
    var stem  = document.getElementById("f-stem").value.trim();
    var block = document.getElementById("f-block").value.trim();
    var hint  = document.getElementById("f-hint").value.trim();

    if (!stem) { showErr("題幹不可為空"); return; }
    var emptyOpt = modalOpts.find(function (o) { return !o.text.trim(); });
    if (emptyOpt) { showErr("選項 " + emptyOpt.key + " 不可為空"); return; }
    if (!modalOpts.find(function (o) { return o.key === currentAns; })) {
      showErr("請選擇正確答案"); return;
    }

    var payload = { stem: stem, block: block, hint: hint, options: modalOpts, answer: currentAns };
    if (currentEdit) {
      payload.action      = "edit";
      payload.question_id = currentEdit.id;
    } else {
      payload.action = "add";
    }

    var savedAns = currentAns;
    var savedOpts = modalOpts.slice();

    apiFetch(payload, function (res) {
      if (!res.ok) { showErr(res.error || "儲存失敗"); return; }
      if (payload.action === "add") {
        allData.push({
          id:      parseInt(res.id, 10),
          stem:    stem,
          block:   block,
          hint:    hint,
          choices: savedOpts.map(function (o) {
            return { key: o.key, text: o.text, is_correct: o.key === savedAns };
          }),
          answer: savedAns,
          source: "user",
        });
      } else {
        var idx = allData.findIndex(function (q) { return q.id === currentEdit.id; });
        if (idx >= 0) {
          allData[idx] = Object.assign({}, allData[idx], {
            stem: stem, block: block, hint: hint,
            choices: savedOpts.map(function (o) {
              return { key: o.key, text: o.text, is_correct: o.key === savedAns };
            }),
            answer: savedAns,
          });
        }
      }
      closeModal();
      renderTable(filteredData());
    });
  }

  function deleteQuestion() {
    if (!currentEdit) return;
    if (!confirm("確定刪除題目 " + currentEdit.id + "？此操作無法復原。")) return;
    apiFetch({ action: "delete", question_id: currentEdit.id }, function (res) {
      if (!res.ok) { showErr(res.error || "刪除失敗"); return; }
      allData = allData.filter(function (q) { return q.id !== currentEdit.id; });
      closeModal();
      renderTable(filteredData());
    });
  }

  /* ── AJAX ─────────────────────────────────────────────── */
  function apiFetch(data, cb) {
    fetch(window.ADMIN_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": window.CSRF_TOKEN,
      },
      body: JSON.stringify(data),
    })
      .then(function (r) { return r.json(); })
      .then(cb)
      .catch(function (e) { showErr("網路錯誤：" + e.message); });
  }

  /* ── Init ─────────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", function () {
    renderTable(allData);

    document.getElementById("admin-search").addEventListener("input", function () {
      renderTable(filteredData());
    });

    document.getElementById("btn-add").addEventListener("click", openAdd);
    document.getElementById("btn-add-opt").addEventListener("click", addOpt);
    document.getElementById("btn-save").addEventListener("click", saveQuestion);
    document.getElementById("btn-del-q").addEventListener("click", deleteQuestion);
    document.getElementById("btn-cancel").addEventListener("click", closeModal);
    document.getElementById("btn-modal-close").addEventListener("click", closeModal);

    /* Close on backdrop click */
    document.getElementById("modal-backdrop").addEventListener("click", function (e) {
      if (e.target === this) closeModal();
    });

    /* Clear all custom */
    document.getElementById("btn-clear").addEventListener("click", function () {
      var n = allData.filter(function (q) { return q.source === "user"; }).length;
      if (!confirm("確定清空全部 " + n + " 題自訂題目？此操作無法復原。")) return;
      apiFetch({ action: "clear_custom" }, function (res) {
        if (!res.ok) { alert(res.error || "清空失敗"); return; }
        allData = allData.filter(function (q) { return q.source !== "user"; });
        renderTable(filteredData());
      });
    });
  });
})();
