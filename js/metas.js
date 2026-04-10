function initMetaFlowUltra(mountSelector = "body") {
  const THEMES = {
    aurora: {
      id: "aurora",
      name: "Aurora Light",
      type: "light",
      bg: "linear-gradient(135deg, #eff6ff 0%, #ecfeff 45%, #dbeafe 100%)",
      panel: "rgba(255,255,255,0.78)",
      panel2: "rgba(255,255,255,0.58)",
      sidebar: "rgba(255,255,255,0.88)",
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
      bg: "#f8fafc",
      panel: "rgba(255,255,255,0.96)",
      panel2: "rgba(255,255,255,0.88)",
      sidebar: "rgba(255,255,255,0.98)",
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
      bg: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
      panel: "rgba(30,41,59,0.60)",
      panel2: "rgba(15,23,42,0.42)",
      sidebar: "rgba(2,6,23,0.80)",
      text: "#f1f5f9",
      muted: "#94a3b8",
      border: "rgba(148,163,184,0.14)",
      primary: "#6366f1",
      primaryHover: "#4f46e5",
    },
    oled: {
      id: "oled",
      name: "OLED Black",
      type: "dark",
      bg: "#000000",
      panel: "rgba(20,20,20,0.90)",
      panel2: "rgba(14,14,14,0.70)",
      sidebar: "rgba(0,0,0,0.98)",
      text: "#e5e7eb",
      muted: "#71717a",
      border: "rgba(255,255,255,0.08)",
      primary: "#3f3f46",
      primaryHover: "#52525b",
    },
    ametista: {
      id: "ametista",
      name: "Ametista",
      type: "dark",
      bg: "linear-gradient(135deg, #4a044e 0%, #3b0764 45%, #1e1b4b 100%)",
      panel: "rgba(88,28,135,0.28)",
      panel2: "rgba(76,29,149,0.18)",
      sidebar: "rgba(59,7,100,0.62)",
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

  const DB_NAME = "MetaFlowUltraDB_v3";
  const DB_VERSION = 1;

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

  const mount =
    typeof mountSelector === "string"
      ? document.querySelector(mountSelector)
      : mountSelector;

  if (!mount) {
    throw new Error("Container não encontrado.");
  }

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
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function injectBase() {
    mount.innerHTML = `
      <style id="metaflow-ultra-style">
        .mfu * { box-sizing: border-box; }
        .mfu {
          --bg: #0f172a;
          --panel: rgba(30,41,59,.6);
          --panel-2: rgba(15,23,42,.42);
          --sidebar: rgba(2,6,23,.8);
          --text: #f1f5f9;
          --muted: #94a3b8;
          --border: rgba(148,163,184,.14);
          --primary: #6366f1;
          --primary-hover: #4f46e5;
          --radius-xl: 28px;
          --radius-lg: 20px;
          --radius-md: 14px;
          --shadow: 0 20px 50px rgba(0,0,0,.25);
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          min-height: 100vh;
          color: var(--text);
          background: var(--bg);
        }
        .mfu button, .mfu input, .mfu select { font: inherit; }
        .mfu button { cursor: pointer; }
        .mfu-app {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 260px 1fr;
          background: var(--bg);
          color: var(--text);
        }
        .mfu-sidebar {
          background: var(--sidebar);
          backdrop-filter: blur(16px);
          border-right: 1px solid var(--border);
          padding: 28px 18px;
          position: sticky;
          top: 0;
          height: 100vh;
        }
        .mfu-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
        }
        .mfu-brand-badge {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          display: grid;
          place-items: center;
          font-weight: 800;
          color: #fff;
          box-shadow: 0 18px 32px rgba(59,130,246,.25);
        }
        .mfu-brand-title {
          font-size: 1.12rem;
          font-weight: 800;
          letter-spacing: -.02em;
        }
        .mfu-brand-title span { font-weight: 300; }
        .mfu-nav {
          display: grid;
          gap: 10px;
        }
        .mfu-nav button {
          width: 100%;
          text-align: left;
          border: 1px solid transparent;
          background: transparent;
          color: var(--muted);
          padding: 14px 16px;
          border-radius: 16px;
          transition: .18s ease;
        }
        .mfu-nav button:hover {
          background: rgba(255,255,255,.05);
          color: var(--text);
        }
        .mfu-nav button.active {
          background: var(--primary);
          color: #fff;
          box-shadow: 0 12px 30px rgba(79,70,229,.28);
        }
        .mfu-main {
          padding: 24px;
          min-width: 0;
        }
        .mfu-header {
          margin-bottom: 22px;
        }
        .mfu-title {
          margin: 0;
          font-size: clamp(2rem, 3vw, 2.8rem);
          font-weight: 900;
          letter-spacing: -.04em;
        }
        .mfu-subtitle {
          margin: 8px 0 0;
          color: var(--muted);
        }
        .mfu-panel {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          backdrop-filter: blur(18px);
          box-shadow: var(--shadow);
        }
        .mfu-pad { padding: 24px; }
        .mfu-grid { display: grid; gap: 20px; }
        .mfu-grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .mfu-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .mfu-grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .mfu-field { display: grid; gap: 8px; }
        .mfu-field label { font-size: .92rem; color: var(--muted); }
        .mfu-field input, .mfu-field select {
          width: 100%;
          background: rgba(255,255,255,.04);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 14px;
          padding: 14px 15px;
          outline: none;
        }
        .mfu-field input:focus, .mfu-field select:focus {
          border-color: rgba(99,102,241,.6);
          box-shadow: 0 0 0 3px rgba(99,102,241,.16);
        }
        .mfu-btn {
          border: 0;
          border-radius: 16px;
          padding: 13px 16px;
          background: rgba(255,255,255,.06);
          color: var(--text);
          transition: .18s ease;
        }
        .mfu-btn:hover { transform: translateY(-1px); }
        .mfu-btn-primary {
          background: linear-gradient(135deg, var(--primary), var(--primary-hover));
          color: #fff;
        }
        .mfu-btn-danger {
          background: rgba(239,68,68,.12);
          color: #fca5a5;
          border: 1px solid rgba(239,68,68,.2);
        }
        .mfu-btn-ghost {
          background: transparent;
          border: 1px solid var(--border);
        }
        .mfu-btn-small {
          padding: 10px 12px;
          border-radius: 14px;
        }
        .mfu-btn-full { width: 100%; }
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
          gap: 20px;
          margin-top: 20px;
        }
        .mfu-col {
          min-height: 420px;
          background: var(--panel2);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 16px;
        }
        .mfu-col h3 {
          margin: 0 0 14px;
          font-size: 1.05rem;
        }
        .mfu-col-list {
          min-height: 300px;
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
          gap: 20px;
        }
        .mfu-stat-card h3 {
          margin: 0 0 8px;
          font-size: 1rem;
        }
        .mfu-stat-card strong {
          font-size: 2rem;
          font-weight: 900;
        }
        .mfu-history-list, .mfu-settings-list {
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
        .mfu-theme-list {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 14px;
        }
        .mfu-theme-btn {
          text-align: center;
          border: 2px solid transparent;
          border-radius: 20px;
          padding: 14px;
          background: rgba(255,255,255,.04);
          color: var(--text);
        }
        .mfu-theme-btn.active {
          border-color: var(--primary);
          transform: translateY(-2px);
        }
        .mfu-swatch {
          width: 40px;
          height: 40px;
          border-radius: 999px;
          margin: 0 auto 10px;
          box-shadow: inset 0 0 0 2px rgba(255,255,255,.18);
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
          min-height: 100vh;
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
          .mfu-goals, .mfu-kanban-cols, .mfu-stats, .mfu-theme-list { grid-template-columns: 1fr; }
          .mfu-grid-2, .mfu-grid-3, .mfu-grid-4 { grid-template-columns: 1fr; }
        }
        @media (max-width: 860px) {
          .mfu-app { grid-template-columns: 1fr; }
          .mfu-sidebar { position: static; height: auto; }
          .mfu-goal-head, .mfu-item-row { flex-direction: column; align-items: stretch; }
          .mfu-actions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
      </style>
      <div class="mfu">
        <div class="mfu-loader"><div class="mfu-spinner"></div></div>
      </div>
    `;
  }

  function applyThemeVars() {
    const theme = getTheme();
    const root = mount.querySelector(".mfu");
    root.style.setProperty("--bg", theme.bg);
    root.style.setProperty("--panel", theme.panel);
    root.style.setProperty("--panel-2", theme.panel2);
    root.style.setProperty("--sidebar", theme.sidebar);
    root.style.setProperty("--text", theme.text);
    root.style.setProperty("--muted", theme.muted);
    root.style.setProperty("--border", theme.border);
    root.style.setProperty("--primary", theme.primary);
    root.style.setProperty("--primary-hover", theme.primaryHover);
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
      const value = entry ? Number(entry.value || 0) : 0;
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
    if (!entry) entry = { id, goalId, date, value: 0 };

    const goal = state.goals.find((g) => g.id === goalId);
    if (!goal) return;

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
        const status = calculateStatus(Number(e.value || 0), Number(goal.min), Number(goal.tol), Number(goal.ceiling));
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

  function renderSidebar() {
    if (!state.goals.length && state.currentView === "onboarding") return "";

    const items = [
      { id: "dashboard", label: "Dashboard" },
      { id: "kanban", label: "Kanban" },
      { id: "stats", label: "Estatísticas" },
      { id: "settings", label: "Configurações" },
    ];

    return `
      <aside class="mfu-sidebar">
        <div class="mfu-brand">
          <div class="mfu-brand-badge">M</div>
          <div class="mfu-brand-title">MetaFlow <span>Ultra</span></div>
        </div>
        <nav class="mfu-nav">
          ${items
            .map(
              (item) => `
            <button
              class="${state.currentView === item.id ? "active" : ""}"
              data-action="nav"
              data-view="${item.id}"
            >${item.label}</button>
          `
            )
            .join("")}
        </nav>
      </aside>
    `;
  }

  function renderOnboarding() {
    return `
      <section class="mfu-panel mfu-pad">
        <div class="mfu-header">
          <h1 class="mfu-title">Defina sua primeira meta</h1>
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
            <button class="mfu-btn mfu-btn-primary mfu-btn-full" type="submit">Criar Meta e Iniciar</button>
          </div>
        </form>
      </section>
    `;
  }

  function renderDashboard() {
    const today = getTodayStr();

    if (!state.goals.length) {
      return `<div class="mfu-panel mfu-pad mfu-empty">Nenhuma meta cadastrada.</div>`;
    }

    return `
      <section class="mfu-header">
        <h1 class="mfu-title">Seu Progresso</h1>
        <p class="mfu-subtitle">Hoje é ${new Date().toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}.</p>
      </section>

      <section class="mfu-goals">
        ${state.goals
          .map((goal) => {
            const entry = entryFor(goal.id, today);
            const value = entry ? Number(entry.value || 0) : 0;
            const statusKey = calculateStatus(value, Number(goal.min), Number(goal.tol), Number(goal.ceiling));
            const status = STATUS_COLORS[statusKey];
            const streak = streakForGoal(goal);
            const progress = Math.min(100, Math.max(0, (value / Number(goal.ceiling || 1)) * 100));
            const minPercent = Math.min(100, (Number(goal.min || 0) / Number(goal.ceiling || 1)) * 100);
            const tolPercent = Math.min(100, (Number(goal.tol || 0) / Number(goal.ceiling || 1)) * 100);

            return `
              <article class="mfu-goal-card">
                <div class="mfu-goal-glow" style="background:${status.color}"></div>
                <div class="mfu-goal-head">
                  <div>
                    <h3 class="mfu-goal-name">${escapeHtml(goal.name)}</h3>
                    <div class="mfu-badges">
                      <span class="mfu-badge" style="background:${status.soft};color:${status.color};">${status.label}</span>
                      <span class="mfu-badge" style="background:rgba(255,255,255,.05);color:var(--muted);">Streak: ${streak} dias</span>
                    </div>
                  </div>
                  <div class="mfu-goal-value">
                    <strong>${value}</strong>
                    <span>${escapeHtml(goal.unit)}</span>
                  </div>
                </div>

                <div class="mfu-progress">
                  <div class="mfu-progress-track">
                    <div class="mfu-progress-bar" style="width:${progress}%;background:${status.color};"></div>
                    <div class="mfu-progress-mark" style="left:${minPercent}%;"></div>
                    <div class="mfu-progress-mark" style="left:${tolPercent}%;"></div>
                  </div>
                  <div class="mfu-progress-labels">
                    <span>0</span>
                    <span>Min ${goal.min}</span>
                    <span>Tol ${goal.tol}</span>
                    <span>Teto ${goal.ceiling}</span>
                  </div>
                </div>

                <div class="mfu-actions">
                  <button class="neg" data-action="entry" data-goal-id="${goal.id}" data-inc="-1">-1</button>
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
                ? items
                    .map((task) => {
                      const linkedGoal = state.goals.find((g) => g.id === task.goalId);
                      return `
                        <div class="mfu-task">
                          <p>${escapeHtml(task.text)}</p>
                          ${
                            linkedGoal
                              ? `<small>Meta vinculada: ${escapeHtml(linkedGoal.name)}</small>`
                              : `<small>Sem meta vinculada</small>`
                          }
                          <div class="mfu-task-actions">
                            ${
                              id !== "todo"
                                ? `<button class="mfu-btn mfu-btn-small" data-action="move-task" data-task-id="${task.id}" data-status="${id === "done" ? "inprogress" : "todo"}">←</button>`
                                : ""
                            }
                            ${
                              id !== "done"
                                ? `<button class="mfu-btn mfu-btn-small" data-action="move-task" data-task-id="${task.id}" data-status="${id === "todo" ? "inprogress" : "done"}">→</button>`
                                : ""
                            }
                            <button class="mfu-btn mfu-btn-danger mfu-btn-small" data-action="delete-task" data-task-id="${task.id}">Excluir</button>
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
      <section class="mfu-header">
        <h1 class="mfu-title">Quadro de Ações</h1>
        <p class="mfu-subtitle">Organize tarefas e vincule ações às suas metas.</p>
      </section>

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
              ${state.goals
                .map((g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`)
                .join("")}
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
      <section class="mfu-header">
        <h1 class="mfu-title">Estatísticas</h1>
        <p class="mfu-subtitle">Resumo geral de consistência e volume acumulado.</p>
      </section>

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

      <section class="mfu-grid mfu-grid-2" style="margin-top:20px;">
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
                ? topGoals
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
      <section class="mfu-header">
        <h1 class="mfu-title">Configurações</h1>
        <p class="mfu-subtitle">Personalize o tema e gerencie suas metas.</p>
      </section>

      <section class="mfu-panel mfu-pad" style="margin-bottom:20px;">
        <h3 style="margin-top:0;">Temas</h3>
        <div class="mfu-theme-list">
          ${Object.values(THEMES)
            .map(
              (theme) => `
            <button class="mfu-theme-btn ${theme.id === state.themeId ? "active" : ""}" data-action="theme" data-theme-id="${theme.id}">
              <div class="mfu-swatch" style="background:${theme.primary}"></div>
              ${escapeHtml(theme.name)}
            </button>
          `
            )
            .join("")}
        </div>
      </section>

      <section class="mfu-panel mfu-pad">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">
          <h3 style="margin:0;">Metas</h3>
          <button class="mfu-btn mfu-btn-primary" data-action="nav" data-view="onboarding">Nova meta</button>
        </div>

        <div class="mfu-settings-list" style="margin-top:18px;">
          ${
            state.goals.length
              ? state.goals
                  .map(
                    (goal) => `
                <div class="mfu-item-row">
                  <div>
                    <h4>${escapeHtml(goal.name)}</h4>
                    <p>${escapeHtml(goal.unit)} · Min ${goal.min} · Tol ${goal.tol} · Teto ${goal.ceiling}</p>
                  </div>
                  <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <button class="mfu-btn mfu-btn-danger mfu-btn-small" data-action="delete-goal" data-goal-id="${goal.id}">Excluir</button>
                  </div>
                </div>
              `
                  )
                  .join("")
              : `<div class="mfu-empty">Nenhuma meta cadastrada.</div>`
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
            <strong style="color:var(--text);">${escapeHtml(state.pendingKanbanAction.goalName)}</strong>?
          </p>
          <div style="display:flex;gap:12px;">
            <button class="mfu-btn mfu-btn-ghost" style="flex:1;" data-action="modal-ignore">Ignorar</button>
            <button class="mfu-btn mfu-btn-primary" style="flex:1;" data-action="modal-apply">Adicionar +1</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderView() {
    if (state.currentView === "onboarding") return renderOnboarding();
    if (state.currentView === "kanban") return renderKanban();
    if (state.currentView === "stats") return renderStats();
    if (state.currentView === "settings") return renderSettings();
    return renderDashboard();
  }

  function render() {
    applyThemeVars();

    mount.querySelector(".mfu").innerHTML = `
      <div class="mfu-app">
        ${renderSidebar()}
        <main class="mfu-main">
          ${renderView()}
        </main>
      </div>
      ${renderModal()}
    `;

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

    mount.querySelectorAll("[data-action='nav']").forEach((el) => {
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

    mount.querySelectorAll("[data-action='theme']").forEach((el) => {
      el.addEventListener("click", async () => {
        await saveTheme(el.dataset.themeId);
      });
    });

    mount.querySelectorAll("[data-action='delete-goal']").forEach((el) => {
      el.addEventListener("click", async () => {
        const ok = confirm("Deseja excluir esta meta?");
        if (ok) await deleteGoal(el.dataset.goalId);
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

    if (!state.goals.length) {
      state.currentView = "onboarding";
    }

    render();
  }

  bootstrap();

  return {
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
}
