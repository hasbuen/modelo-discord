(function () {
  function initMetaFlowUltra(mountSelector = "#metas-app") {
    const THEMES = {
      aurora: {
        id: "aurora",
        name: "Aurora Light",
        type: "light",
        panel: "rgba(255,255,255,0.82)",
        panel2: "rgba(255,255,255,0.65)",
        text: "#0f172a",
        muted: "#64748b",
        border: "rgba(15,23,42,0.08)",
        primary: "#3b82f6",
        primaryHover: "#2563eb",
      },
      minimalist: {
        id: "minimalist",
        name: "Minimalist",
        type: "light",
        panel: "rgba(255,255,255,0.98)",
        panel2: "rgba(255,255,255,0.92)",
        text: "#111827",
        muted: "#6b7280",
        border: "rgba(17,24,39,0.08)",
        primary: "#111827",
        primaryHover: "#000000",
      },
      midnight: {
        id: "midnight",
        name: "Midnight Navy",
        type: "dark",
        panel: "rgba(18, 28, 55, 0.72)",
        panel2: "rgba(10, 17, 35, 0.62)",
        text: "#f1f5f9",
        muted: "#9fb0cc",
        border: "rgba(113, 136, 185, 0.16)",
        primary: "#60a5fa",
        primaryHover: "#3b82f6",
      },
      oled: {
        id: "oled",
        name: "OLED Black",
        type: "dark",
        panel: "rgba(18,18,18,0.92)",
        panel2: "rgba(12,12,12,0.8)",
        text: "#e5e7eb",
        muted: "#8b8b95",
        border: "rgba(255,255,255,0.08)",
        primary: "#3f3f46",
        primaryHover: "#52525b",
      },
      ametista: {
        id: "ametista",
        name: "Ametista",
        type: "dark",
        panel: "rgba(76,29,149,0.28)",
        panel2: "rgba(59,7,100,0.22)",
        text: "#faf5ff",
        muted: "#d8b4fe",
        border: "rgba(216,180,254,0.18)",
        primary: "#c026d3",
        primaryHover: "#a21caf",
      },
    };

    const STATUS_COLORS = {
      naoAtingida: { label: "Não atingida", color: "#ef4444", soft: "rgba(239,68,68,.15)" },
      toleravel: { label: "Tolerável", color: "#eab308", soft: "rgba(234,179,8,.15)" },
      atingida: { label: "Atingida", color: "#22c55e", soft: "rgba(34,197,94,.15)" },
      otimo: { label: "Ótimo", color: "#3b82f6", soft: "rgba(59,130,246,.15)" },
    };

    const DB_NAME = "MetaFlowUltraDB_v5_embed";
    const DB_VERSION = 1;

    const mount =
      typeof mountSelector === "string"
        ?document.querySelector(mountSelector)
        : mountSelector;

    if (!mount) throw new Error("Container do MetaFlow não encontrado.");

    if (mount.dataset.metaflowMounted === "true") {
      return mount.__metaflowApi || null;
    }

    const db = {
      db: null,
      async init() {
        return new Promise((resolve, reject) => {
          const req = indexedDB.open(DB_NAME, DB_VERSION);
          req.onupgradeneeded = (e) => {
            const idb = e.target.result;

            if (!idb.objectStoreNames.contains("goals")) {
              idb.createObjectStore("goals", { keyPath: "id" });
            }

            if (!idb.objectStoreNames.contains("entries")) {
              const store = idb.createObjectStore("entries", { keyPath: "id" });
              store.createIndex("goalId", "goalId", { unique: false });
              store.createIndex("date", "date", { unique: false });
            }

            if (!idb.objectStoreNames.contains("tasks")) {
              idb.createObjectStore("tasks", { keyPath: "id" });
            }

            if (!idb.objectStoreNames.contains("settings")) {
              idb.createObjectStore("settings", { keyPath: "id" });
            }
          };

          req.onsuccess = (e) => {
            this.db = e.target.result;
            resolve();
          };

          req.onerror = (e) => reject(e.target.error);
        });
      },

      async get(store, id) {
        return new Promise((resolve, reject) => {
          const tx = this.db.transaction(store, "readonly");
          const req = tx.objectStore(store).get(id);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      },

      async getAll(store) {
        return new Promise((resolve, reject) => {
          const tx = this.db.transaction(store, "readonly");
          const req = tx.objectStore(store).getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
      },

      async put(store, data) {
        return new Promise((resolve, reject) => {
          const tx = this.db.transaction(store, "readwrite");
          const req = tx.objectStore(store).put(data);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      },

      async delete(store, id) {
        return new Promise((resolve, reject) => {
          const tx = this.db.transaction(store, "readwrite");
          const req = tx.objectStore(store).delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      },
    };

    const state = {
      goals: [],
      entries: [],
      tasks: [],
      themeId: "midnight",
      currentView: "dashboard",
      pendingKanbanAction: null,
    };

    function getTodayStr() {
      const d = new Date();
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().split("T")[0];
    }

    function generateId() {
      return Math.random().toString(36).slice(2, 15);
    }

    function calculateStatus(value, min, tol, ceiling) {
      if (value < min) return "naoAtingida";
      if (value >= min && value < tol) return "toleravel";
      if (value >= tol && value <= ceiling) return "atingida";
      return "otimo";
    }

    function getTheme() {
      return THEMES[state.themeId] || THEMES.midnight;
    }

    function escapeHtml(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function entryFor(goalId, date) {
      return state.entries.find((e) => e.id === `${goalId}_${date}`);
    }

    function streakForGoal(goal) {
      const today = getTodayStr();
      let streak = 0;
      const checkDate = new Date(today + "T12:00:00");

      while (true) {
        const dateStr = checkDate.toISOString().split("T")[0];
        if (dateStr < goal.startDate) break;

        const entry = state.entries.find((en) => en.id === `${goal.id}_${dateStr}`);
        const value = entry ?Number(entry.value || 0) : 0;

        if (value >= Number(goal.min)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          if (dateStr === today) {
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
          break;
        }
      }

      return streak;
    }

    function injectBase() {
      mount.innerHTML = `
        <style>
          .mfu * { box-sizing: border-box; }

          .mfu {
            --panel: rgba(18, 28, 55, 0.72);
            --panel-2: rgba(10, 17, 35, 0.62);
            --text: #f1f5f9;
            --muted: #9fb0cc;
            --border: rgba(113, 136, 185, 0.16);
            --primary: #60a5fa;
            --primary-hover: #3b82f6;
            --radius-xl: 24px;
            --radius-lg: 18px;
            --radius-md: 14px;
            --shadow: 0 18px 40px rgba(0,0,0,.22);
            width: 100%;
            color: var(--text);
            margin-top: 0;
          }

          .mfu-shell {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 18px;
          }

          .mfu-compactbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 14px;
            flex-wrap: wrap;
            padding: 14px 18px;
            border-radius: 20px;
            border: 1px solid var(--border);
            background: var(--panel);
            backdrop-filter: blur(18px);
            box-shadow: var(--shadow);
          }

          .mfu-compactbar-left {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }

          .mfu-tab {
            border: 1px solid var(--border);
            background: rgba(255,255,255,.04);
            color: var(--muted);
            padding: 10px 14px;
            border-radius: 999px;
            font-weight: 700;
            transition: .18s ease;
          }

          .mfu-tab:hover {
            color: var(--text);
            transform: translateY(-1px);
          }

          .mfu-tab.active {
            background: linear-gradient(135deg, var(--primary), var(--primary-hover));
            color: #fff;
            border-color: transparent;
            box-shadow: 0 14px 28px rgba(59,130,246,.24);
          }

          .mfu-theme-select {
            min-width: 180px;
            background: rgba(255,255,255,.04);
            border: 1px solid var(--border);
            color: var(--text);
            border-radius: 14px;
            padding: 10px 14px;
            outline: none;
          }

          .mfu-panel {
            background: var(--panel);
            border: 1px solid var(--border);
            border-radius: var(--radius-xl);
            backdrop-filter: blur(18px);
            box-shadow: var(--shadow);
          }

          .mfu-pad { padding: 24px; }

          .mfu-title {
            margin: 0 0 8px;
            font-size: clamp(1.8rem, 3vw, 2.8rem);
            font-weight: 900;
            letter-spacing: -.04em;
            text-align: center;
          }

          .mfu-subtitle {
            margin: 0;
            color: var(--muted);
            font-size: 1rem;
            text-align: center;
          }

          .mfu-field {
            display: grid;
            gap: 8px;
          }

          .mfu-field label {
            font-size: .92rem;
            color: var(--muted);
            font-weight: 600;
          }

          .mfu-field input,
          .mfu-field select,
          .mfu-field textarea {
            width: 100%;
            background: rgba(255,255,255,.04);
            border: 1px solid var(--border);
            color: var(--text);
            border-radius: 14px;
            padding: 14px 15px;
            outline: none;
          }

          .mfu-field input:focus,
          .mfu-field select:focus,
          .mfu-field textarea:focus {
            border-color: rgba(96,165,250,.65);
            box-shadow: 0 0 0 3px rgba(96,165,250,.16);
          }

          .mfu-grid {
            display: grid;
            gap: 18px;
          }

          .mfu-grid-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .mfu-grid-3 {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .mfu-btn {
            border: 0;
            border-radius: 16px;
            padding: 13px 16px;
            background: rgba(255,255,255,.06);
            color: var(--text);
            transition: .18s ease;
            font-weight: 700;
          }

          .mfu-btn:hover {
            transform: translateY(-1px);
          }

          .mfu-btn-primary {
            background: linear-gradient(135deg, var(--primary), var(--primary-hover));
            color: #fff;
            box-shadow: 0 14px 28px rgba(59,130,246,.22);
          }

          .mfu-btn-danger {
            background: rgba(239,68,68,.12);
            color: #fca5a5;
            border: 1px solid rgba(239,68,68,.2);
          }

          .mfu-btn-ghost {
            border: 1px solid var(--border);
            background: transparent;
          }

          .mfu-onboarding-wrap {
            display: flex;
            justify-content: center;
            width: 100%;
          }

          .mfu-onboarding-card {
            width: 100%;
            max-width: 940px;
          }

          .mfu-center-head {
            text-align: center;
            margin-bottom: 28px;
          }

          .mfu-center-icon {
            width: 76px;
            height: 76px;
            border-radius: 24px;
            margin: 0 auto 18px;
            display: grid;
            place-items: center;
            font-size: 32px;
            background: linear-gradient(135deg, var(--primary), var(--primary-hover));
            color: white;
            box-shadow: 0 18px 34px rgba(59,130,246,.26);
          }

          .mfu-goals {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 20px;
          }

          .mfu-goal-card {
            position: relative;
            overflow: hidden;
            padding: 24px;
            border-radius: 28px;
            background: var(--panel);
            border: 1px solid var(--border);
            box-shadow: var(--shadow);
          }

          .mfu-goal-glow {
            position: absolute;
            width: 220px;
            height: 220px;
            border-radius: 999px;
            right: -70px;
            top: -70px;
            filter: blur(70px);
            opacity: .18;
          }

          .mfu-goal-head {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
            position: relative;
            z-index: 1;
          }

          .mfu-goal-name {
            margin: 0 0 8px;
            font-size: 1.4rem;
            font-weight: 800;
          }

          .mfu-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            align-items: center;
          }

          .mfu-badge {
            padding: 8px 12px;
            border-radius: 999px;
            font-size: .85rem;
            font-weight: 700;
          }

          .mfu-goal-value {
            text-align: right;
          }

          .mfu-goal-value strong {
            display: block;
            font-size: 2.7rem;
            line-height: 1;
            font-weight: 900;
          }

          .mfu-goal-value span {
            display: block;
            color: var(--muted);
            font-size: .9rem;
            margin-top: 4px;
          }

          .mfu-progress {
            position: relative;
            z-index: 1;
            margin-top: 20px;
          }

          .mfu-progress-track {
            height: 16px;
            border-radius: 999px;
            background: rgba(255,255,255,.06);
            border: 1px solid var(--border);
            overflow: hidden;
            position: relative;
          }

          .mfu-progress-bar {
            height: 100%;
            border-radius: 999px;
            transition: width .25s ease;
          }

          .mfu-progress-mark {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 2px;
            background: rgba(255,255,255,.2);
          }

          .mfu-progress-labels {
            margin-top: 8px;
            display: flex;
            justify-content: space-between;
            color: var(--muted);
            font-size: .78rem;
            gap: 8px;
            flex-wrap: wrap;
          }

          .mfu-actions {
            position: relative;
            z-index: 1;
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px;
            margin-top: 18px;
          }

          .mfu-actions button {
            padding: 14px 10px;
            border-radius: 16px;
            border: 1px solid var(--border);
            background: rgba(255,255,255,.05);
            color: var(--text);
            font-weight: 800;
          }

          .mfu-actions button.neg {
            background: rgba(239,68,68,.12);
            color: #fca5a5;
            border-color: rgba(239,68,68,.2);
          }

          .mfu-kanban-top {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            align-items: end;
          }

          .mfu-kanban-cols {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 18px;
            margin-top: 20px;
          }

          .mfu-col {
            min-height: 360px;
            background: var(--panel-2);
            border: 1px solid var(--border);
            border-radius: 24px;
            padding: 16px;
          }

          .mfu-col h3 {
            margin: 0 0 14px;
            font-size: 1.05rem;
          }

          .mfu-col-list {
            min-height: 200px;
            display: grid;
            gap: 12px;
          }

          .mfu-task {
            padding: 14px;
            border-radius: 16px;
            background: var(--panel);
            border: 1px solid var(--border);
          }

          .mfu-task p {
            margin: 0 0 10px;
            font-weight: 600;
          }

          .mfu-task small {
            color: var(--muted);
            display: inline-block;
            margin-bottom: 10px;
          }

          .mfu-task-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }

          .mfu-stats {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 18px;
          }

          .mfu-stat-card h3 {
            margin: 0 0 8px;
            font-size: 1rem;
          }

          .mfu-stat-card strong {
            font-size: 2rem;
            font-weight: 900;
          }

          .mfu-history-list,
          .mfu-settings-list {
            display: grid;
            gap: 14px;
          }

          .mfu-item-row {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            align-items: center;
            padding: 16px;
            border: 1px solid var(--border);
            border-radius: 18px;
            background: rgba(255,255,255,.03);
          }

          .mfu-item-row h4 {
            margin: 0 0 4px;
            font-size: 1rem;
          }

          .mfu-item-row p {
            margin: 0;
            color: var(--muted);
            font-size: .92rem;
          }

          .mfu-modal {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,.55);
            backdrop-filter: blur(6px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            z-index: 9999;
          }

          .mfu-modal-card {
            width: 100%;
            max-width: 460px;
            background: var(--panel);
            border: 1px solid var(--border);
            border-radius: 24px;
            padding: 24px;
            box-shadow: var(--shadow);
          }

          .mfu-empty {
            text-align: center;
            padding: 42px 22px;
            color: var(--muted);
          }

          .mfu-loader {
            min-height: 220px;
            display: grid;
            place-items: center;
          }

          .mfu-spinner {
            width: 52px;
            height: 52px;
            border-radius: 999px;
            border: 4px solid rgba(255,255,255,.12);
            border-top-color: var(--primary);
            animation: mfu-spin 1s linear infinite;
          }

          @keyframes mfu-spin {
            to { transform: rotate(360deg); }
          }

          @media (max-width: 1100px) {
            .mfu-goals,
            .mfu-kanban-cols,
            .mfu-stats,
            .mfu-grid-2,
            .mfu-grid-3 {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 720px) {
            .mfu-actions {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .mfu-goal-head,
            .mfu-item-row,
            .mfu-compactbar {
              flex-direction: column;
              align-items: stretch;
            }

            .mfu-goal-value {
              text-align: left;
            }

            .mfu-pad {
              padding: 18px;
            }
          }
        </style>

        <div class="mfu">
          <div class="mfu-loader">
            <div class="mfu-spinner"></div>
          </div>
        </div>
      `;
    }

    function applyThemeVars() {
      const theme = getTheme();
      const root = mount.querySelector(".mfu");
      if (!root) return;

      root.style.setProperty("--panel", theme.panel);
      root.style.setProperty("--panel-2", theme.panel2);
      root.style.setProperty("--text", theme.text);
      root.style.setProperty("--muted", theme.muted);
      root.style.setProperty("--border", theme.border);
      root.style.setProperty("--primary", theme.primary);
      root.style.setProperty("--primary-hover", theme.primaryHover);
    }

    async function saveTheme(themeId) {
      state.themeId = themeId;
      await db.put("settings", { id: "theme", value: themeId });
      render();
    }

    async function saveGoal(goalData) {
      const goal = {
        ...goalData,
        id: goalData.id || generateId(),
        min: Number(goalData.min),
        tol: Number(goalData.tol),
        ceiling: Number(goalData.ceiling),
      };

      await db.put("goals", goal);
      state.goals = await db.getAll("goals");

      if (state.currentView === "onboarding") {
        state.currentView = "dashboard";
      }

      render();
    }

    async function deleteGoal(goalId) {
      await db.delete("goals", goalId);
      state.goals = await db.getAll("goals");

      if (!state.goals.length) {
        state.currentView = "onboarding";
      }

      render();
    }

    async function updateEntry(goalId, date, incrementValue) {
      const id = `${goalId}_${date}`;
      let entry = await db.get("entries", id);

      if (!entry) {
        entry = { id, goalId, date, value: 0 };
      }

      let newValue = Number(entry.value || 0) + Number(incrementValue || 0);
      if (newValue < 0) newValue = 0;

      entry.value = newValue;

      await db.put("entries", entry);
      state.entries = await db.getAll("entries");
      render();
    }

    async function addTask(text, goalId) {
      const task = {
        id: generateId(),
        text: String(text || "").trim(),
        status: "todo",
        goalId: goalId || null,
        createdAt: new Date().toISOString(),
      };

      if (!task.text) return;

      await db.put("tasks", task);
      state.tasks = await db.getAll("tasks");
      render();
    }

    async function moveTask(taskId, status) {
      const task = state.tasks.find((t) => t.id === taskId);
      if (!task || task.status === status) return;

      const updated = { ...task, status };
      await db.put("tasks", updated);
      state.tasks = await db.getAll("tasks");

      if (status === "done" && updated.goalId) {
        const goal = state.goals.find((g) => g.id === updated.goalId);
        if (goal) {
          state.pendingKanbanAction = { goalId: goal.id, goalName: goal.name };
        }
      }

      render();
    }

    async function deleteTask(taskId) {
      await db.delete("tasks", taskId);
      state.tasks = await db.getAll("tasks");
      render();
    }

    function statsSummary() {
      const trackedDays = new Set(state.entries.map((e) => e.date)).size;
      let total = 0;
      let atingidas = 0;
      let otimos = 0;
      let naoAtingidas = 0;

      state.goals.forEach((goal) => {
        const goalEntries = state.entries.filter((e) => e.goalId === goal.id);

        goalEntries.forEach((e) => {
          total++;
          const status = calculateStatus(
            Number(e.value || 0),
            Number(goal.min),
            Number(goal.tol),
            Number(goal.ceiling)
          );

          if (status === "atingida") atingidas++;
          if (status === "otimo") otimos++;
          if (status === "naoAtingida") naoAtingidas++;
        });
      });

      return {
        trackedDays,
        totalEntries: total,
        atingidas,
        otimos,
        naoAtingidas,
      };
    }

    function renderCompactBar() {
      return `
        <div class="mfu-compactbar">
          <div class="mfu-compactbar-left">
            <button class="mfu-tab ${state.currentView === "dashboard" ?"active" : ""}" data-action="view" data-view="dashboard">Dashboard</button>
            <button class="mfu-tab ${state.currentView === "kanban" ?"active" : ""}" data-action="view" data-view="kanban">Kanban</button>
            <button class="mfu-tab ${state.currentView === "stats" ?"active" : ""}" data-action="view" data-view="stats">Estatísticas</button>
            <button class="mfu-tab ${state.currentView === "settings" ?"active" : ""}" data-action="view" data-view="settings">Configurações</button>
          </div>

          <select class="mfu-theme-select" data-action="theme-select">
            ${Object.values(THEMES)
              .map(
                (item) => `
                  <option value="${item.id}" ${item.id === state.themeId ?"selected" : ""}>${escapeHtml(item.name)}</option>
                `
              )
              .join("")}
          </select>
        </div>
      `;
    }

    function renderOnboarding() {
      return `
        <div class="mfu-onboarding-wrap">
          <section class="mfu-panel mfu-pad mfu-onboarding-card">
            <div class="mfu-center-head">
              <div class="mfu-center-icon">🎯</div>
              <h2 class="mfu-title">Defina sua primeira meta</h2>
              <p class="mfu-subtitle">Configure seu objetivo inicial para começar o acompanhamento diário.</p>
            </div>

            <form id="mfu-goal-form" class="mfu-grid mfu-grid-2">
              <div class="mfu-field">
                <label>Nome da Meta</label>
                <input name="name" required placeholder="Ex: Leitura, Vendas, Ligações" />
              </div>

              <div class="mfu-field">
                <label>Unidade</label>
                <input name="unit" required placeholder="Ex: páginas, tickets, R$" />
              </div>

              <div class="mfu-field">
                <label>Data de Início</label>
                <input type="date" name="startDate" value="${getTodayStr()}" required />
              </div>

              <div class="mfu-field">
                <label>Data de Término (opcional)</label>
                <input type="date" name="endDate" />
              </div>

              <div class="mfu-grid mfu-grid-2">
                <div class="mfu-field">
                  <label>Hora Início</label>
                  <input type="time" name="startTime" value="08:00" required />
                </div>

                <div class="mfu-field">
                  <label>Hora Fim</label>
                  <input type="time" name="endTime" value="22:00" required />
                </div>
              </div>

              <div class="mfu-field">
                <label>Mínimo</label>
                <input type="number" min="0" name="min" value="1" required />
              </div>

              <div class="mfu-field">
                <label>Tolerável</label>
                <input type="number" min="0" name="tol" value="5" required />
              </div>

              <div class="mfu-field">
                <label>Teto</label>
                <input type="number" min="0" name="ceiling" value="10" required />
              </div>

              <div style="grid-column: 1 / -1;">
                <button class="mfu-btn mfu-btn-primary" style="width:100%;" type="submit">
                  Criar Meta e Iniciar
                </button>
              </div>
            </form>
          </section>
        </div>
      `;
    }

    function renderDashboard() {
      const today = getTodayStr();

      if (!state.goals.length) {
        return renderOnboarding();
      }

      return `
        <section class="mfu-goals">
          ${state.goals
            .map((goal) => {
              const entry = entryFor(goal.id, today);
              const value = entry ?Number(entry.value || 0) : 0;
              const statusKey = calculateStatus(value, Number(goal.min), Number(goal.tol), Number(goal.ceiling));
              const status = STATUS_COLORS[statusKey];
              const streak = streakForGoal(goal);
              const progress = Math.min(100, Math.max(0, (value / Number(goal.ceiling || 1)) * 100));
              const minPercent = Math.min(100, (Number(goal.min || 0) / Number(goal.ceiling || 1)) * 100);
              const tolPercent = Math.min(100, (Number(goal.tol || 0) / Number(goal.ceiling || 1)) * 100);
              const remaining = Math.max(0, Number(goal.ceiling) - value);
              const todayProgress = progress > 0 ?`${progress.toFixed(0)}%` : "0%";
              const daysUntilEnd = calculateDaysRemaining(goal);

              return `
                <article class="mfu-goal-card">
                  <div class="mfu-goal-glow" style="background:${status.color}"></div>

                  <div class="mfu-goal-head">
                    <div>
                      <h3 class="mfu-goal-name">${escapeHtml(goal.name)}</h3>
                      <div class="mfu-badges">
                        <span class="mfu-badge" style="background:${status.soft};color:${status.color};">
                          ${status.label}
                        </span>
                        <span class="mfu-badge" style="background:rgba(255,255,255,.05);color:var(--muted);">
                          =% ${streak} dia${streak !== 1 ?'s' : ''}
                        </span>
                      </div>
                    </div>

                    <div class="mfu-goal-value">
                      <strong>${value}/${goal.ceiling}</strong>
                      <span>${escapeHtml(goal.unit)}</span>
                    </div>
                  </div>

                  <div class="mfu-progress">
                    <div class="mfu-progress-track">
                      <div class="mfu-progress-bar" style="width:${progress}%;background:linear-gradient(90deg, ${status.color}, ${status.color}dd);"></div>
                      <div class="mfu-progress-mark" style="left:${minPercent}%;background:rgba(255,255,255,.35);"></div>
                      <div class="mfu-progress-mark" style="left:${tolPercent}%;background:rgba(255,255,255,.35);"></div>
                    </div>

                    <div class="mfu-progress-labels">
                      <span>0</span>
                      <span style="color:${status.color};font-weight:700;">${todayProgress}</span>
                      <span>Min ${goal.min}</span>
                      <span>Tol ${goal.tol}</span>
                      <span>Teto ${goal.ceiling}</span>
                    </div>
                  </div>

                  <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
                    <div style="flex:1;min-width:100px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid var(--border);text-align:center;">
                      <small style="color:var(--muted);font-size:.75rem;display:block;margin-bottom:4px;">Restante</small>
                      <strong style="font-size:1.1rem;">${remaining}</strong>
                    </div>
                    <div style="flex:1;min-width:100px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid var(--border);text-align:center;">
                      <small style="color:var(--muted);font-size:.75rem;display:block;margin-bottom:4px;">Período</small>
                      <strong style="font-size:.95rem;">${goal.startTime || '--'} - ${goal.endTime || '--'}</strong>
                    </div>
                    ${daysUntilEnd > 0 ?`
                    <div style="flex:1;min-width:100px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid var(--border);text-align:center;">
                      <small style="color:var(--muted);font-size:.75rem;display:block;margin-bottom:4px;">Dias restantes</small>
                      <strong style="font-size:1.1rem;">${daysUntilEnd}</strong>
                    </div>
                    ` : ''}
                  </div>

                  <div class="mfu-actions">
                    <button class="neg" data-action="entry" data-goal-id="${goal.id}" data-inc="-1">−1</button>
                    <button data-action="entry" data-goal-id="${goal.id}" data-inc="1">+1</button>
                    <button data-action="entry" data-goal-id="${goal.id}" data-inc="5">+5</button>
                    <button data-action="entry" data-goal-id="${goal.id}" data-inc="10">+10</button>
                  </div>
                </article>
              `;
            })
            .join("")}
        </section>
      `;
    }

    function calculateDaysRemaining(goal) {
      if (!goal.endDate) return 0;
      const today = getTodayStr();
      const end = new Date(goal.endDate + "T12:00:00");
      const now = new Date(today + "T12:00:00");
      const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      return Math.max(0, diff);
    }

    function renderKanban() {
      const groups = {
        todo: state.tasks.filter((t) => t.status === "todo"),
        inprogress: state.tasks.filter((t) => t.status === "inprogress"),
        done: state.tasks.filter((t) => t.status === "done"),
      };

      function columnHtml(id, title, items) {
        return `
          <div class="mfu-col">
            <h3>${title} (${items.length})</h3>
            <div class="mfu-col-list">
              ${
                items.length
                  ?items
                      .map((task) => {
                        const linkedGoal = state.goals.find((g) => g.id === task.goalId);

                        return `
                          <div class="mfu-task">
                            <p>${escapeHtml(task.text)}</p>
                            ${
                              linkedGoal
                                ?`<small>Meta vinculada: ${escapeHtml(linkedGoal.name)}</small>`
                                : `<small>Sem meta vinculada</small>`
                            }

                            <div class="mfu-task-actions">
                              ${
                                id !== "todo"
                                  ?`<button class="mfu-btn" data-action="move-task" data-task-id="${task.id}" data-status="${id === "done" ?"inprogress" : "todo"}">${id === "done" ? "Voltar" : "Retornar"}</button>`
                                  : ""
                              }

                              ${
                                id !== "done"
                                  ?`<button class="mfu-btn" data-action="move-task" data-task-id="${task.id}" data-status="${id === "todo" ?"inprogress" : "done"}">${id === "todo" ? "Iniciar" : "Concluir"}</button>`
                                  : ""
                              }

                              <button class="mfu-btn mfu-btn-danger" data-action="delete-task" data-task-id="${task.id}">Excluir</button>
                            </div>
                          </div>
                        `;
                      })
                      .join("")
                  : `<div class="mfu-empty">Sem tarefas aqui.</div>`
              }
            </div>
          </div>
        `;
      }

      return `
        <section class="mfu-panel mfu-pad">
          <form id="mfu-task-form" class="mfu-kanban-top">
            <div class="mfu-field" style="flex:1;min-width:240px;">
              <label>Nova tarefa</label>
              <input name="text" placeholder="Digite a tarefa..." required />
            </div>

            <div class="mfu-field" style="min-width:260px;">
              <label>Meta vinculada</label>
              <select name="goalId">
                <option value="">Nenhuma meta vinculada</option>
                ${state.goals.map((g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join("")}
              </select>
            </div>

            <div>
              <button type="submit" class="mfu-btn mfu-btn-primary">Adicionar</button>
            </div>
          </form>

          <div class="mfu-kanban-cols">
            ${columnHtml("todo", "A Fazer", groups.todo)}
            ${columnHtml("inprogress", "Em Progresso", groups.inprogress)}
            ${columnHtml("done", "Concluído", groups.done)}
          </div>
        </section>
      `;
    }

    function renderStats() {
      const stats = statsSummary();

      const topGoals = state.goals
        .map((goal) => {
          const total = state.entries
            .filter((e) => e.goalId === goal.id)
            .reduce((sum, e) => sum + Number(e.value || 0), 0);

          return { ...goal, total };
        })
        .sort((a, b) => b.total - a.total);

      return `
        <section class="mfu-stats">
          <div class="mfu-panel mfu-pad mfu-stat-card">
            <h3>Dias rastreados</h3>
            <strong>${stats.trackedDays}</strong>
          </div>

          <div class="mfu-panel mfu-pad mfu-stat-card">
            <h3>Registros totais</h3>
            <strong>${stats.totalEntries}</strong>
          </div>

          <div class="mfu-panel mfu-pad mfu-stat-card">
            <h3>Metas cadastradas</h3>
            <strong>${state.goals.length}</strong>
          </div>
        </section>

        <section class="mfu-grid mfu-grid-2" style="margin-top:18px;">
          <div class="mfu-panel mfu-pad">
            <h3 style="margin-top:0;">Distribuição de desempenho</h3>
            <div class="mfu-history-list">
              <div class="mfu-item-row"><div><h4>Atingidas</h4><p>Dias dentro da faixa boa</p></div><strong>${stats.atingidas}</strong></div>
              <div class="mfu-item-row"><div><h4>Ótimo</h4><p>Dias acima do teto</p></div><strong>${stats.otimos}</strong></div>
              <div class="mfu-item-row"><div><h4>Não atingidas</h4><p>Dias abaixo do mínimo</p></div><strong>${stats.naoAtingidas}</strong></div>
            </div>
          </div>

          <div class="mfu-panel mfu-pad">
            <h3 style="margin-top:0;">Ranking de metas</h3>
            <div class="mfu-history-list">
              ${
                topGoals.length
                  ?topGoals
                      .map(
                        (goal, index) => `
                          <div class="mfu-item-row">
                            <div>
                              <h4>#${index + 1} ${escapeHtml(goal.name)}</h4>
                              <p>Unidade: ${escapeHtml(goal.unit)}</p>
                            </div>
                            <strong>${goal.total}</strong>
                          </div>
                        `
                      )
                      .join("")
                  : `<div class="mfu-empty">Sem dados suficientes ainda.</div>`
              }
            </div>
          </div>
        </section>
      `;
    }

    function renderSettings() {
      return `
        <section class="mfu-panel mfu-pad">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:18px;">
            <div>
              <h3 style="margin:0;">Metas Cadastradas</h3>
              <p style="margin:4px 0 0;color:var(--muted);font-size:.92rem;">Gerencie suas metas ativas e histórico.</p>
            </div>
            <button class="mfu-btn mfu-btn-primary" data-action="new-goal">Nova meta</button>
          </div>

          <div class="mfu-settings-list">
            ${
              state.goals.length
                ?state.goals
                    .map(
                      (goal) => {
                        const today = getTodayStr();
                        const todayEntry = entryFor(goal.id, today);
                        const todayValue = todayEntry ?Number(todayEntry.value || 0) : 0;
                        const statusKey = calculateStatus(todayValue, Number(goal.min), Number(goal.tol), Number(goal.ceiling));
                        const status = STATUS_COLORS[statusKey];
                        const totalEntries = state.entries.filter(e => e.goalId === goal.id);
                        const totalValue = totalEntries.reduce((sum, e) => sum + Number(e.value || 0), 0);
                        const avgDaily = totalEntries.length > 0 ?(totalValue / totalEntries.length).toFixed(1) : 0;

                        return `
                          <div class="mfu-item-row">
                            <div style="flex:1;">
                              <h4 style="display:flex;align-items:center;gap:8px;">
                                <span style="display:inline-block;width:8px;height:8px;border-radius:999px;background:${status.color};"></span>
                                ${escapeHtml(goal.name)}
                              </h4>
                              <p style="margin-top:4px;">
                                ${escapeHtml(goal.unit)} · Min ${goal.min} · Tol ${goal.tol} · Teto ${goal.ceiling}
                              </p>
                              <div style="display:flex;gap:12px;margin-top:6px;flex-wrap:wrap;font-size:.85rem;color:var(--muted);">
                                <span>📊 Hoje: <strong style="color:var(--text);">${todayValue}</strong></span>
                                <span>📈 Total: <strong style="color:var(--text);">${totalValue}</strong></span>
                                <span>📉 Média/dia: <strong style="color:var(--text);">${avgDaily}</strong></span>
                                ${goal.endDate ?`<span>Fim: <strong style="color:var(--text);">${goal.endDate}</strong></span>` : ''}
                              </div>
                            </div>
                            <div style="display:flex;gap:10px;flex-wrap:wrap;">
                              <button class="mfu-btn mfu-btn-danger" data-action="delete-goal" data-goal-id="${goal.id}">
                                Excluir
                              </button>
                            </div>
                          </div>
                        `;
                      }
                    )
                    .join("")
                : `<div class="mfu-empty">Nenhuma meta cadastrada ainda.<br /><small>Clique em "Nova meta" para começar.</small></div>`
            }
          </div>
        </section>
      `;
    }

    function renderModal() {
      if (!state.pendingKanbanAction) return "";

      return `
        <div class="mfu-modal">
          <div class="mfu-modal-card">
            <h3 style="margin-top:0;">Tarefa concluída</h3>
            <p style="color:var(--muted);margin-bottom:18px;">
              Deseja adicionar +1 de progresso à meta
              <strong style="color:var(--text);">${escapeHtml(state.pendingKanbanAction.goalName)}</strong>
            </p>
            <div style="display:flex;gap:12px;">
              <button class="mfu-btn mfu-btn-ghost" style="flex:1;" data-action="modal-ignore">Ignorar</button>
              <button class="mfu-btn mfu-btn-primary" style="flex:1;" data-action="modal-apply">Adicionar +1</button>
            </div>
          </div>
        </div>
      `;
    }

    function renderCurrentView() {
      if (!state.goals.length || state.currentView === "onboarding") {
        return renderOnboarding();
      }

      if (state.currentView === "kanban") return renderKanban();
      if (state.currentView === "stats") return renderStats();
      if (state.currentView === "settings") return renderSettings();
      return renderDashboard();
    }

    function render() {
      applyThemeVars();

      const root = mount.querySelector(".mfu");
      if (!root) return;

      root.innerHTML = `
        <div class="mfu-shell">
          ${state.goals.length ?renderCompactBar() : ""}
          ${renderCurrentView()}
        </div>
        ${renderModal()}
      `;

      applyThemeVars();
      bindEvents();
    }

    function bindEvents() {
      const goalForm = mount.querySelector("#mfu-goal-form");
      if (goalForm) {
        goalForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const fd = new FormData(goalForm);

          await saveGoal({
            name: fd.get("name"),
            unit: fd.get("unit"),
            startDate: fd.get("startDate"),
            endDate: fd.get("endDate") || null,
            startTime: fd.get("startTime"),
            endTime: fd.get("endTime"),
            min: fd.get("min"),
            tol: fd.get("tol"),
            ceiling: fd.get("ceiling"),
          });
        });
      }

      const taskForm = mount.querySelector("#mfu-task-form");
      if (taskForm) {
        taskForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const fd = new FormData(taskForm);
          await addTask(fd.get("text"), fd.get("goalId"));
        });
      }

      mount.querySelectorAll("[data-action='view']").forEach((el) => {
        el.addEventListener("click", () => {
          state.currentView = el.dataset.view;
          render();
        });
      });

      mount.querySelectorAll("[data-action='entry']").forEach((el) => {
        el.addEventListener("click", async () => {
          await updateEntry(el.dataset.goalId, getTodayStr(), Number(el.dataset.inc));
        });
      });

      mount.querySelectorAll("[data-action='delete-goal']").forEach((el) => {
        el.addEventListener("click", async () => {
          if (confirm("Deseja excluir esta meta?")) {
            await deleteGoal(el.dataset.goalId);
          }
        });
      });

      mount.querySelectorAll("[data-action='move-task']").forEach((el) => {
        el.addEventListener("click", async () => {
          await moveTask(el.dataset.taskId, el.dataset.status);
        });
      });

      mount.querySelectorAll("[data-action='delete-task']").forEach((el) => {
        el.addEventListener("click", async () => {
          await deleteTask(el.dataset.taskId);
        });
      });

      const themeSelect = mount.querySelector("[data-action='theme-select']");
      if (themeSelect) {
        themeSelect.addEventListener("change", async () => {
          await saveTheme(themeSelect.value);
        });
      }

      const newGoalBtn = mount.querySelector("[data-action='new-goal']");
      if (newGoalBtn) {
        newGoalBtn.addEventListener("click", () => {
          state.currentView = "onboarding";
          render();
        });
      }

      const ignore = mount.querySelector("[data-action='modal-ignore']");
      if (ignore) {
        ignore.addEventListener("click", () => {
          state.pendingKanbanAction = null;
          render();
        });
      }

      const apply = mount.querySelector("[data-action='modal-apply']");
      if (apply) {
        apply.addEventListener("click", async () => {
          const action = state.pendingKanbanAction;
          if (action) {
            await updateEntry(action.goalId, getTodayStr(), 1);
          }
          state.pendingKanbanAction = null;
          render();
        });
      }
    }

    async function bootstrap() {
      injectBase();
      await db.init();

      state.goals = await db.getAll("goals");
      state.entries = await db.getAll("entries");
      state.tasks = await db.getAll("tasks");

      const savedTheme = await db.get("settings", "theme");
      if (savedTheme?.value && THEMES[savedTheme.value]) {
        state.themeId = savedTheme.value;
      }

      state.currentView = state.goals.length ?"dashboard" : "onboarding";
      render();
    }

    const api = {
      state,
      render,
      saveGoal,
      deleteGoal,
      updateEntry,
      addTask,
      moveTask,
      deleteTask,
      saveTheme,
    };

    mount.dataset.metaflowMounted = "true";
    mount.__metaflowApi = api;

    bootstrap();
    return api;
  }

  window.initMetaFlowUltra = initMetaFlowUltra;
  
  if (!window.__metasAutoInitDisabled) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        const mountEl = document.querySelector("#metas-app");
        if (mountEl && !mountEl.dataset.metaflowMounted) {
          initMetaFlowUltra("#metas-app");
        }
      });
    } else {
      const mountEl = document.querySelector("#metas-app");
      if (mountEl && !mountEl.dataset.metaflowMounted) {
        initMetaFlowUltra("#metas-app");
      }
    }
  }
})();
