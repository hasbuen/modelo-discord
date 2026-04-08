(function () {
  const STORAGE_KEY = "protocord_ia_transcriber_v1";
  const MAX_UPLOAD_BYTES = 128 * 1024 * 1024;
  const AUDIO_DB_NAME = "protocord_ia_audio_v1";
  const AUDIO_STORE_NAME = "ticket_audio";
  const apiBaseUrl = window.getProtocordApiBaseUrl();
  let blobClientPromise = null;
  let audioDbPromise = null;
  let motionClientPromise = null;
  let plyrClientPromise = null;

  const state = {
    tickets: [],
    activeId: null,
    searchTerm: "",
    editingTicketId: null,
    editingReport: false,
    reportDraft: "",
    imageIndex: 0,
    uploading: false,
  };

  const els = {};

  function init() {
    injectBaseStyles();
    ensureLayout();
    bindElements();
    if (!els.page) return;

    restoreState();
    bindEvents();

    if (!state.tickets.length) {
      createTicket();
    } else if (!state.activeId) {
      state.activeId = state.tickets[0].id;
    }

    render();
    primeMotionRuntime();
  }

  function injectBaseStyles() {
    if (document.getElementById("protocord-ia-enhanced-style")) return;

    const style = document.createElement("style");
    style.id = "protocord-ia-enhanced-style";
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
      @import url('https://cdn.jsdelivr.net/npm/plyr@3.7.8/dist/plyr.css');

      #pagina-ia,
      #pagina-ia * {
        box-sizing: border-box;
      }

      #pagina-ia {
        --ia-bg: #07111f;
        --ia-bg-soft: rgba(8, 17, 34, .78);
        --ia-bg-elev: rgba(7, 17, 33, .92);
        --ia-panel: rgba(7, 17, 33, .74);
        --ia-panel-strong: rgba(5, 12, 26, .88);
        --ia-sidebar: linear-gradient(180deg, rgba(6, 14, 28, .96), rgba(7, 17, 33, .98));
        --ia-border: rgba(44, 78, 128, .34);
        --ia-border-strong: rgba(63, 104, 166, .42);
        --ia-text: #e8eefc;
        --ia-text-soft: #9fb1d1;
        --ia-text-faint: #6f84aa;
        --ia-title: #ffffff;
        --ia-accent: #28c6e5;
        --ia-accent-strong: #16b7d8;
        --ia-accent-soft: rgba(40, 198, 229, .14);
        --ia-violet: #8e7bff;
        --ia-danger: #f87171;
        --ia-success: #4ade80;
        --ia-shadow: 0 20px 60px rgba(0, 0, 0, .24);
        --ia-shadow-soft: 0 12px 30px rgba(0, 0, 0, .18);
        --ia-glow: radial-gradient(circle at top center, rgba(40,198,229,.10), transparent 42%);
        font-family: 'Inter', sans-serif;
        min-height: 100vh;
        width: 100%;
        color: var(--ia-text);
        background:
          radial-gradient(circle at 15% 0%, rgba(40,198,229,.09), transparent 26%),
          radial-gradient(circle at 85% 0%, rgba(142,123,255,.08), transparent 24%),
          linear-gradient(180deg, rgba(3,8,18,1), rgba(7,17,31,1));
      }

      html[data-theme="light"] #pagina-ia,
      body[data-theme="light"] #pagina-ia,
      html.light #pagina-ia,
      body.light #pagina-ia,
      .theme-light #pagina-ia,
      [data-bs-theme="light"] #pagina-ia {
        --ia-bg: #eef4fb;
        --ia-bg-soft: rgba(255,255,255,.86);
        --ia-bg-elev: rgba(255,255,255,.92);
        --ia-panel: rgba(255,255,255,.82);
        --ia-panel-strong: rgba(255,255,255,.94);
        --ia-sidebar: linear-gradient(180deg, rgba(250,252,255,.96), rgba(241,246,252,.98));
        --ia-border: rgba(144, 170, 206, .34);
        --ia-border-strong: rgba(120, 155, 204, .44);
        --ia-text: #20314f;
        --ia-text-soft: #5d7398;
        --ia-text-faint: #7f94b4;
        --ia-title: #12213c;
        --ia-accent: #12bddf;
        --ia-accent-strong: #06b6d4;
        --ia-accent-soft: rgba(6,182,212,.10);
        --ia-violet: #6f63ff;
        --ia-danger: #dc5b5b;
        --ia-success: #16a34a;
        --ia-shadow: 0 18px 50px rgba(104, 136, 180, .14);
        --ia-shadow-soft: 0 10px 26px rgba(107, 132, 169, .12);
        --ia-glow: radial-gradient(circle at top center, rgba(40,198,229,.06), transparent 38%);
        background:
          radial-gradient(circle at 18% 0%, rgba(40,198,229,.08), transparent 24%),
          radial-gradient(circle at 80% 0%, rgba(111,99,255,.05), transparent 20%),
          linear-gradient(180deg, #f4f8fc 0%, #edf3fa 100%);
      }

      #pagina-ia button,
      #pagina-ia input,
      #pagina-ia textarea,
      #pagina-ia audio {
        font-family: inherit;
      }

      #pagina-ia .hidden {
        display: none !important;
      }

      #pagina-ia .ia-shell {
        display: flex;
        min-height: 100vh;
        width: 100%;
      }

      #pagina-ia .ia-sidebar {
        width: 340px;
        min-width: 340px;
        display: flex;
        flex-direction: column;
        background: var(--ia-sidebar);
        border-right: 1px solid var(--ia-border);
        backdrop-filter: blur(16px);
        box-shadow: inset -1px 0 0 rgba(255,255,255,.03);
      }

      #pagina-ia .ia-sidebar-header {
        padding: 26px 22px 18px;
        border-bottom: 1px solid var(--ia-border);
      }

      #pagina-ia .ia-brand {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 18px;
      }

      #pagina-ia .ia-brand-badge {
        width: 46px;
        height: 46px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, var(--ia-accent-strong), #43d4ee);
        color: #073345;
        font-size: 20px;
        font-weight: 900;
        box-shadow: 0 16px 32px rgba(18,189,223,.18);
        flex-shrink: 0;
      }

      #pagina-ia .ia-brand-copy h1 {
        margin: 0;
        font-size: 17px;
        line-height: 1.05;
        font-weight: 800;
        color: var(--ia-title);
        letter-spacing: -.03em;
      }

      #pagina-ia .ia-brand-copy span {
        display: inline-block;
        margin-top: 5px;
        font-size: 10px;
        color: var(--ia-text-faint);
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: .18em;
      }

      #pagina-ia .ia-sidebar-actions {
        display: grid;
        gap: 14px;
      }

      #pagina-ia .btn-primary,
      #pagina-ia .btn-secondary,
      #pagina-ia .ia-icon-btn,
      #pagina-ia .ia-image-nav-btn {
        border: none;
        outline: none;
        cursor: pointer;
        transition: all .22s ease;
      }

      #pagina-ia .btn-primary {
        width: 100%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 14px 18px;
        border-radius: 16px;
        background: linear-gradient(135deg, var(--ia-accent-strong), #35cae7);
        color: #072f42;
        font-size: 14px;
        font-weight: 800;
        box-shadow: 0 16px 34px rgba(18,189,223,.18);
      }

      #pagina-ia .btn-primary:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 20px 38px rgba(18,189,223,.24);
      }

      #pagina-ia .btn-primary:disabled {
        opacity: .55;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      #pagina-ia .btn-secondary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 15px;
        border-radius: 14px;
        background: var(--ia-bg-soft);
        border: 1px solid var(--ia-border);
        color: var(--ia-text);
        font-size: 12px;
        font-weight: 700;
        box-shadow: 0 4px 18px rgba(0,0,0,.04);
      }

      #pagina-ia .btn-secondary:hover:not(:disabled) {
        transform: translateY(-1px);
        background: var(--ia-panel-strong);
        border-color: var(--ia-border-strong);
      }

      #pagina-ia .btn-secondary:disabled {
        opacity: .55;
        cursor: not-allowed;
      }

      #pagina-ia .ia-search-wrap {
        position: relative;
      }

      #pagina-ia .ia-search-wrap i {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--ia-text-faint);
        width: 16px;
        height: 16px;
      }

      #pagina-ia #ia-search-input,
      #pagina-ia .ia-ticket-input,
      #pagina-ia #ia-report-editor {
        width: 100%;
        border-radius: 15px;
        border: 1px solid var(--ia-border);
        background: var(--ia-panel-strong);
        color: var(--ia-text);
        outline: none;
        transition: border-color .18s ease, box-shadow .18s ease, background .18s ease, transform .18s ease;
      }

      #pagina-ia #ia-search-input {
        padding: 13px 14px 13px 42px;
        font-size: 13px;
      }

      #pagina-ia #ia-search-input::placeholder,
      #pagina-ia .ia-ticket-input::placeholder,
      #pagina-ia #ia-report-editor::placeholder {
        color: var(--ia-text-faint);
      }

      #pagina-ia #ia-search-input:focus,
      #pagina-ia .ia-ticket-input:focus,
      #pagina-ia #ia-report-editor:focus {
        border-color: rgba(18,189,223,.62);
        box-shadow: 0 0 0 4px rgba(18,189,223,.10);
      }

      #pagina-ia .ia-ticket-input {
        padding: 10px 12px;
        font-size: 13px;
      }

      #pagina-ia .ia-sidebar-list {
        flex: 1;
        overflow-y: auto;
        padding: 14px 12px 18px;
      }

      #pagina-ia .ia-sidebar-footer {
        padding: 14px 16px 16px;
        border-top: 1px solid var(--ia-border);
      }

      #pagina-ia .ia-sidebar-footer-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        color: var(--ia-text-faint);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .16em;
        text-transform: uppercase;
      }

      #pagina-ia .ia-main {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        background: transparent;
      }

      #pagina-ia .ia-empty-state {
        flex: 1;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px;
      }

      #pagina-ia .ia-empty-card {
        width: min(520px, 100%);
        padding: 34px 28px;
        border-radius: 28px;
        background: var(--ia-panel);
        border: 1px solid var(--ia-border);
        text-align: center;
        box-shadow: var(--ia-shadow);
        backdrop-filter: blur(18px);
      }

      #pagina-ia .ia-empty-card-icon {
        width: 88px;
        height: 88px;
        margin: 0 auto 20px;
        border-radius: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--ia-panel-strong);
        color: var(--ia-text-faint);
        border: 1px solid var(--ia-border);
      }

      #pagina-ia .ia-empty-card h3 {
        margin: 0 0 10px;
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -.03em;
        color: var(--ia-title);
      }

      #pagina-ia .ia-empty-card p {
        margin: 0;
        color: var(--ia-text-soft);
        font-size: 14px;
        line-height: 1.65;
      }

      #pagina-ia #ia-content {
        flex: 1;
        min-height: 100vh;
        overflow: hidden;
      }

      #pagina-ia .ia-content-shell {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--ia-glow);
      }

      #pagina-ia .ia-topbar {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 24px;
        padding: 28px 32px 20px;
        border-bottom: 1px solid var(--ia-border);
        background: linear-gradient(180deg, rgba(255,255,255,.015), transparent);
      }

      #pagina-ia .ia-topbar-meta {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }

      #pagina-ia .ia-badge-active {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 5px 10px;
        border-radius: 999px;
        background: rgba(18,189,223,.13);
        color: var(--ia-accent);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .14em;
        text-transform: uppercase;
        box-shadow: inset 0 0 0 1px rgba(18,189,223,.08);
      }

      #pagina-ia #ia-active-date {
        color: var(--ia-text-faint);
        font-size: 12px;
        font-weight: 600;
      }

      #pagina-ia #ia-active-title {
        margin: 0;
        font-size: clamp(28px, 2.8vw, 40px);
        line-height: 1.04;
        letter-spacing: -.05em;
        color: var(--ia-title);
        font-weight: 900;
        max-width: 780px;
        word-break: break-word;
      }

      #pagina-ia .ia-topbar-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      #pagina-ia .ia-workspace-wrap {
        flex: 1;
        overflow-y: auto;
        padding: 24px 32px 32px;
      }

      #pagina-ia .ia-workspace {
        max-width: 1600px;
        margin: 0 auto;
      }

      #pagina-ia .ia-info-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
        margin-bottom: 22px;
      }

      #pagina-ia .ia-info-card {
        padding: 18px 18px 16px;
        border-radius: 22px;
        background: var(--ia-panel);
        border: 1px solid var(--ia-border);
        box-shadow: var(--ia-shadow-soft);
        backdrop-filter: blur(12px);
      }

      #pagina-ia .ia-info-card-label {
        margin: 0 0 10px;
        color: var(--ia-text-faint);
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: .18em;
      }

      #pagina-ia .ia-info-card-value {
        margin: 0;
        color: var(--ia-text);
        font-size: 15px;
        font-weight: 700;
        line-height: 1.35;
      }

      #pagina-ia .ia-actions-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 24px;
      }

      #pagina-ia .ia-actions-bar .btn-primary {
        width: auto;
        min-width: 180px;
      }

      #pagina-ia .ia-grid-main {
        display: grid;
        grid-template-columns: minmax(360px, 1.05fr) minmax(380px, .95fr);
        gap: 24px;
        align-items: start;
      }

      #pagina-ia .ia-panel {
        display: flex;
        flex-direction: column;
        border-radius: 30px;
        background: linear-gradient(180deg, var(--ia-panel), rgba(255,255,255,.01));
        border: 1px solid var(--ia-border);
        overflow: hidden;
        box-shadow: var(--ia-shadow);
        backdrop-filter: blur(16px);
      }

      #pagina-ia .ia-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 18px 22px;
        border-bottom: 1px solid var(--ia-border);
        background: linear-gradient(180deg, rgba(255,255,255,.03), transparent);
      }

      #pagina-ia .ia-panel-title {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }

      #pagina-ia .ia-panel-title h3 {
        margin: 0;
        color: var(--ia-title);
        font-size: 13px;
        line-height: 1;
        font-weight: 800;
        letter-spacing: .13em;
        text-transform: uppercase;
      }

      #pagina-ia .ia-panel-title i {
        width: 16px;
        height: 16px;
      }

      #pagina-ia .ia-panel-meta {
        color: var(--ia-text-faint);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .12em;
        text-transform: uppercase;
      }

      #pagina-ia .ia-panel-body {
        padding: 22px;
      }

      #pagina-ia #ia-report-view {
        min-height: 300px;
        white-space: pre-wrap;
        color: var(--ia-text);
        font-size: 14px;
        line-height: 1.72;
        font-weight: 500;
      }

      #pagina-ia #ia-report-editor {
        min-height: 360px;
        resize: vertical;
        padding: 16px 18px;
        font-size: 13px;
        line-height: 1.7;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      }

      #pagina-ia .ia-panel-tools {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      #pagina-ia .ia-text-action {
        border: none;
        background: transparent;
        color: var(--ia-accent);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .12em;
        text-transform: uppercase;
        cursor: pointer;
        padding: 0;
      }

      #pagina-ia .ia-text-action:hover {
        color: var(--ia-accent-strong);
      }

      #pagina-ia .ia-text-danger {
        color: var(--ia-danger);
      }

      #pagina-ia .ia-audio-section {
        margin-top: 20px;
      }

      #pagina-ia #ia-audio-card {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 18px;
        border-radius: 24px;
        background:
          linear-gradient(135deg, rgba(18,189,223,.12), rgba(18,189,223,.03)),
          var(--ia-panel-strong);
        border: 1px solid rgba(18,189,223,.20);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.04),
          0 12px 36px rgba(18,189,223,.10);
        overflow: hidden;
        position: relative;
      }

      html[data-theme="light"] #pagina-ia #ia-audio-card,
      body[data-theme="light"] #pagina-ia #ia-audio-card,
      html.light #pagina-ia #ia-audio-card,
      body.light #pagina-ia #ia-audio-card,
      .theme-light #pagina-ia #ia-audio-card,
      [data-bs-theme="light"] #pagina-ia #ia-audio-card {
        background:
          linear-gradient(135deg, rgba(18,189,223,.10), rgba(18,189,223,.02)),
          rgba(255,255,255,.92);
        border: 1px solid rgba(18,189,223,.18);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.75),
          0 14px 32px rgba(78, 144, 182, .12);
      }

      #pagina-ia .ia-audio-ambient {
        position: absolute;
        inset: auto -60px -60px auto;
        width: 160px;
        height: 160px;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(18,189,223,.18), transparent 62%);
        pointer-events: none;
      }

      #pagina-ia .ia-audio-top {
        display: flex;
        align-items: center;
        gap: 14px;
        position: relative;
        z-index: 1;
      }

      #pagina-ia .ia-audio-icon {
        width: 50px;
        height: 50px;
        border-radius: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, rgba(18,189,223,.20), rgba(18,189,223,.07));
        color: var(--ia-accent);
        border: 1px solid rgba(18,189,223,.16);
        flex-shrink: 0;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.06);
      }

      #pagina-ia .ia-audio-copy {
        min-width: 0;
      }

      #pagina-ia .ia-audio-copy strong {
        display: block;
        color: var(--ia-title);
        font-size: 14px;
        font-weight: 800;
        margin-bottom: 4px;
      }

      #pagina-ia .ia-audio-copy span {
        display: block;
        color: var(--ia-text-soft);
        font-size: 12px;
        line-height: 1.45;
      }

      #pagina-ia .ia-audio-visualizer {
        display: flex;
        align-items: end;
        gap: 5px;
        height: 28px;
        margin-left: auto;
        opacity: .92;
      }

      #pagina-ia .ia-audio-bar {
        width: 5px;
        border-radius: 999px;
        background: linear-gradient(180deg, #66e3f7, var(--ia-accent-strong));
        box-shadow: 0 0 12px rgba(18,189,223,.16);
        animation: ia-audio-wave 1.2s ease-in-out infinite;
        transform-origin: bottom center;
      }

      #pagina-ia .ia-audio-bar:nth-child(1) { height: 10px; animation-delay: .00s; }
      #pagina-ia .ia-audio-bar:nth-child(2) { height: 18px; animation-delay: .14s; }
      #pagina-ia .ia-audio-bar:nth-child(3) { height: 24px; animation-delay: .28s; }
      #pagina-ia .ia-audio-bar:nth-child(4) { height: 14px; animation-delay: .42s; }

      @keyframes ia-audio-wave {
        0%, 100% { transform: scaleY(.6); opacity: .65; }
        50% { transform: scaleY(1.18); opacity: 1; }
      }

      #pagina-ia .ia-audio-player-wrap {
        position: relative;
        z-index: 1;
        padding: 10px;
        border-radius: 20px;
        background:
          linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.02)),
          rgba(0,0,0,.10);
        border: 1px solid rgba(18,189,223,.14);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
      }

      html[data-theme="light"] #pagina-ia .ia-audio-player-wrap,
      body[data-theme="light"] #pagina-ia .ia-audio-player-wrap,
      html.light #pagina-ia .ia-audio-player-wrap,
      body.light #pagina-ia .ia-audio-player-wrap,
      .theme-light #pagina-ia .ia-audio-player-wrap,
      [data-bs-theme="light"] #pagina-ia .ia-audio-player-wrap {
        background:
          linear-gradient(180deg, rgba(255,255,255,.9), rgba(245,250,255,.82));
        border: 1px solid rgba(18,189,223,.12);
      }

      #pagina-ia .audio-container {
        width: 100%;
      }

      #pagina-ia #ia-audio-player {
        width: 100%;
        display: block;
        min-height: 48px;
        border-radius: 16px;
        overflow: hidden;
      }

      #pagina-ia .plyr {
        --plyr-color-main: #1cc7e8;
        --plyr-audio-controls-background: linear-gradient(180deg, rgba(250,252,255,.98), rgba(237,244,250,.94));
        --plyr-audio-control-color: #0b2436;
        --plyr-audio-control-background-hover: rgba(28,199,232,.14);
        --plyr-range-thumb-background: #16b7d8;
        --plyr-range-fill-background: linear-gradient(90deg, #1cc7e8, #54dcf2);
        --plyr-range-track-background: rgba(10,28,42,.22);
        --plyr-tooltip-background: #092030;
        --plyr-tooltip-color: #e8eefc;
        border-radius: 999px;
        overflow: hidden;
        box-shadow: 0 8px 22px rgba(0,0,0,.12);
      }

      #pagina-ia .plyr--audio {
        width: 100%;
        background: transparent;
      }

      #pagina-ia .plyr--full-ui input[type=range] {
        color: #16b7d8;
      }

      #pagina-ia .plyr__controls {
        padding: 10px 14px;
        gap: 8px;
        border-radius: 999px;
      }

      #pagina-ia .plyr__control {
        border-radius: 999px;
        transition: transform .18s ease, background-color .18s ease, box-shadow .18s ease;
      }

      #pagina-ia .plyr__control:hover {
        transform: translateY(-1px);
      }

      #pagina-ia .plyr__control--overlaid,
      #pagina-ia .plyr__control[data-plyr="play"] {
        background: linear-gradient(135deg, #22cbe9, #11b8d8);
        color: #062536;
        box-shadow: 0 8px 18px rgba(18,189,223,.20);
      }

      #pagina-ia .plyr__control[data-plyr="play"]:hover,
      #pagina-ia .plyr__control[data-plyr="play"][aria-pressed="true"] {
        background: linear-gradient(135deg, #2fd2ee, #18bfdc);
      }

      #pagina-ia .plyr__time {
        color: #16354a;
        font-size: 12px;
        font-weight: 800;
      }

      #pagina-ia .plyr__progress__container,
      #pagina-ia .plyr__volume {
        margin-left: 6px;
        margin-right: 6px;
      }

      #pagina-ia .plyr__menu__container {
        border-radius: 16px;
        background: rgba(6,18,34,.96);
        border: 1px solid rgba(59,130,246,.12);
        color: #e8eefc;
        backdrop-filter: blur(16px);
      }

      #pagina-ia .plyr__menu__container .plyr__control {
        color: #e8eefc;
        border-radius: 12px;
      }

      #pagina-ia .plyr__menu__container .plyr__control:hover {
        background: rgba(28,199,232,.14);
      }

      html[data-theme="light"] #pagina-ia .plyr,
      body[data-theme="light"] #pagina-ia .plyr,
      html.light #pagina-ia .plyr,
      body.light #pagina-ia .plyr,
      .theme-light #pagina-ia .plyr,
      [data-bs-theme="light"] #pagina-ia .plyr {
        --plyr-audio-controls-background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(245,250,255,.96));
        --plyr-audio-control-color: #16354a;
        --plyr-range-track-background: rgba(32,49,79,.18);
        box-shadow: 0 10px 24px rgba(104,136,180,.14);
      }

      #pagina-ia #ia-audio-card.is-playing .plyr {
        box-shadow:
          0 10px 26px rgba(18,189,223,.18),
          0 0 0 1px rgba(18,189,223,.10);
      }

      #pagina-ia .ia-image-stage-wrap {
        min-height: 520px;
        display: flex;
        flex-direction: column;
      }

      #pagina-ia .ia-image-dropzone {
        min-height: 520px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      #pagina-ia #ia-image-empty {
        width: 100%;
        min-height: 460px;
        border-radius: 28px;
        border: 1px dashed rgba(124, 155, 197, .34);
        background:
          radial-gradient(circle at top center, rgba(18,189,223,.06), transparent 36%),
          linear-gradient(180deg, rgba(255,255,255,.015), transparent);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        text-align: center;
        padding: 30px;
      }

      html[data-theme="light"] #pagina-ia #ia-image-empty,
      body[data-theme="light"] #pagina-ia #ia-image-empty,
      html.light #pagina-ia #ia-image-empty,
      body.light #pagina-ia #ia-image-empty,
      .theme-light #pagina-ia #ia-image-empty,
      [data-bs-theme="light"] #pagina-ia #ia-image-empty {
        background:
          radial-gradient(circle at top center, rgba(18,189,223,.05), transparent 34%),
          linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,.38));
      }

      #pagina-ia .ia-image-empty-icon {
        width: 74px;
        height: 74px;
        border-radius: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--ia-text-faint);
        background: var(--ia-panel-strong);
        border: 1px solid var(--ia-border);
      }

      #pagina-ia .ia-image-empty-title {
        margin: 0;
        color: var(--ia-title);
        font-size: 16px;
        font-weight: 800;
      }

      #pagina-ia .ia-image-empty-text {
        margin: 0;
        max-width: 320px;
        color: var(--ia-text-soft);
        font-size: 13px;
        line-height: 1.65;
      }

      #pagina-ia .ia-image-empty-text kbd {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 28px;
        padding: 4px 8px;
        border-radius: 8px;
        background: var(--ia-panel-strong);
        border: 1px solid var(--ia-border);
        color: var(--ia-text);
        font-size: 11px;
        font-weight: 700;
        box-shadow: 0 3px 10px rgba(0,0,0,.05);
      }

      #pagina-ia #ia-image-stage {
        display: flex;
        flex-direction: column;
        gap: 16px;
        width: 100%;
        height: 100%;
      }

      #pagina-ia .ia-image-preview-shell {
        position: relative;
        width: 100%;
        min-height: 460px;
        border-radius: 26px;
        overflow: hidden;
        background:
          radial-gradient(circle at center, rgba(18,189,223,.05), transparent 30%),
          linear-gradient(180deg, rgba(6,13,26,.7), rgba(7,17,33,.9));
        border: 1px solid var(--ia-border);
      }

      html[data-theme="light"] #pagina-ia .ia-image-preview-shell,
      body[data-theme="light"] #pagina-ia .ia-image-preview-shell,
      html.light #pagina-ia .ia-image-preview-shell,
      body.light #pagina-ia .ia-image-preview-shell,
      .theme-light #pagina-ia .ia-image-preview-shell,
      [data-bs-theme="light"] #pagina-ia .ia-image-preview-shell {
        background:
          radial-gradient(circle at center, rgba(18,189,223,.04), transparent 32%),
          linear-gradient(180deg, rgba(245,249,255,.95), rgba(236,243,252,.90));
      }

      #pagina-ia #ia-active-image {
        width: 100%;
        height: 100%;
        min-height: 460px;
        object-fit: contain;
        display: block;
      }

      #pagina-ia .ia-image-nav {
        position: absolute;
        inset: 0;
        pointer-events: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 18px;
      }

      #pagina-ia .ia-image-nav button {
        pointer-events: auto;
      }

      #pagina-ia .ia-image-nav-btn {
        width: 48px;
        height: 48px;
        border-radius: 999px;
        background: rgba(6, 13, 26, .52);
        border: 1px solid rgba(255,255,255,.08);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        backdrop-filter: blur(10px);
        box-shadow: 0 10px 26px rgba(0,0,0,.16);
      }

      html[data-theme="light"] #pagina-ia .ia-image-nav-btn,
      body[data-theme="light"] #pagina-ia .ia-image-nav-btn,
      html.light #pagina-ia .ia-image-nav-btn,
      body.light #pagina-ia .ia-image-nav-btn,
      .theme-light #pagina-ia .ia-image-nav-btn,
      [data-bs-theme="light"] #pagina-ia .ia-image-nav-btn {
        background: rgba(255,255,255,.78);
        color: #20314f;
        border: 1px solid rgba(120,155,204,.24);
      }

      #pagina-ia .ia-image-nav-btn:hover:not(:disabled) {
        background: var(--ia-accent);
        color: #063241;
        transform: translateY(-1px);
      }

      #pagina-ia .ia-image-nav-btn:disabled {
        opacity: .35;
        cursor: not-allowed;
      }

      #pagina-ia .ia-image-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      }

      #pagina-ia .ia-image-footer-copy {
        color: var(--ia-text-soft);
        font-size: 12px;
        line-height: 1.55;
      }

      #pagina-ia .ia-image-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      #pagina-ia .ia-icon-btn {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--ia-bg-soft);
        border: 1px solid var(--ia-border);
        color: var(--ia-text-soft);
        box-shadow: 0 6px 16px rgba(0,0,0,.04);
      }

      #pagina-ia .ia-icon-btn:hover:not(:disabled) {
        color: var(--ia-title);
        background: var(--ia-panel-strong);
        transform: translateY(-1px);
      }

      #pagina-ia .ia-icon-danger:hover:not(:disabled) {
        color: var(--ia-danger);
        border-color: rgba(220,91,91,.24);
        background: rgba(220,91,91,.08);
      }

      #pagina-ia .ia-ticket-item {
        border: 1px solid transparent;
        border-radius: 18px;
        padding: 14px;
        cursor: pointer;
        transition: all .18s ease;
        background: rgba(255,255,255,.02);
        margin-bottom: 10px;
      }

      html[data-theme="light"] #pagina-ia .ia-ticket-item,
      body[data-theme="light"] #pagina-ia .ia-ticket-item,
      html.light #pagina-ia .ia-ticket-item,
      body.light #pagina-ia .ia-ticket-item,
      .theme-light #pagina-ia .ia-ticket-item,
      [data-bs-theme="light"] #pagina-ia .ia-ticket-item {
        background: rgba(255,255,255,.48);
      }

      #pagina-ia .ia-ticket-item:hover {
        background: var(--ia-panel);
        border-color: var(--ia-border);
        transform: translateY(-1px);
      }

      #pagina-ia .ia-ticket-item.active {
        background:
          linear-gradient(180deg, rgba(18,189,223,.10), rgba(255,255,255,.02));
        border-color: rgba(18,189,223,.26);
        box-shadow: 0 12px 26px rgba(18,189,223,.08);
      }

      html[data-theme="light"] #pagina-ia .ia-ticket-item.active,
      body[data-theme="light"] #pagina-ia .ia-ticket-item.active,
      html.light #pagina-ia .ia-ticket-item.active,
      body.light #pagina-ia .ia-ticket-item.active,
      .theme-light #pagina-ia .ia-ticket-item.active,
      [data-bs-theme="light"] #pagina-ia .ia-ticket-item.active {
        background: linear-gradient(180deg, rgba(18,189,223,.10), rgba(255,255,255,.58));
      }

      #pagina-ia .ia-ticket-line {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      #pagina-ia .ia-ticket-main {
        min-width: 0;
        flex: 1;
      }

      #pagina-ia .ia-ticket-title {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 6px;
        min-width: 0;
      }

      #pagina-ia .ia-ticket-title span {
        display: block;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--ia-title);
        font-size: 14px;
        font-weight: 800;
      }

      #pagina-ia .ia-ticket-meta {
        color: var(--ia-text-faint);
        font-size: 11px;
        font-weight: 600;
        line-height: 1.4;
      }

      #pagina-ia .ia-ticket-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      #pagina-ia .is-uploading {
        pointer-events: none;
        position: relative;
      }

      #pagina-ia .is-uploading::before {
        content: "";
        position: absolute;
        inset: 0 0 auto 0;
        height: 3px;
        background: linear-gradient(90deg, transparent, var(--ia-accent), transparent);
        animation: ia-loading-bar 1.35s linear infinite;
        z-index: 4;
      }

      @keyframes ia-loading-bar {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }

      #pagina-ia [aria-busy="true"] .ia-topbar {
        opacity: .94;
      }

      #pagina-ia ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      #pagina-ia ::-webkit-scrollbar-track {
        background: transparent;
      }

      #pagina-ia ::-webkit-scrollbar-thumb {
        background: rgba(111,132,170,.45);
        border-radius: 999px;
      }

      #pagina-ia ::-webkit-scrollbar-thumb:hover {
        background: rgba(111,132,170,.72);
      }

      @media (max-width: 1320px) {
        #pagina-ia .ia-grid-main {
          grid-template-columns: 1fr;
        }

        #pagina-ia .ia-image-stage-wrap,
        #pagina-ia .ia-image-dropzone,
        #pagina-ia #ia-image-empty,
        #pagina-ia .ia-image-preview-shell,
        #pagina-ia #ia-active-image {
          min-height: 380px;
        }
      }

      @media (max-width: 980px) {
        #pagina-ia .ia-shell {
          flex-direction: column;
        }

        #pagina-ia .ia-sidebar {
          width: 100%;
          min-width: 0;
          border-right: none;
          border-bottom: 1px solid var(--ia-border);
        }

        #pagina-ia .ia-sidebar-list {
          max-height: 280px;
        }

        #pagina-ia .ia-topbar,
        #pagina-ia .ia-workspace-wrap {
          padding-left: 18px;
          padding-right: 18px;
        }

        #pagina-ia .ia-topbar {
          flex-direction: column;
          align-items: stretch;
        }

        #pagina-ia .ia-topbar-actions {
          justify-content: flex-start;
        }

        #pagina-ia .ia-info-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 640px) {
        #pagina-ia .ia-sidebar-header {
          padding: 18px 16px 16px;
        }

        #pagina-ia .ia-topbar {
          padding-top: 22px;
          padding-bottom: 16px;
        }

        #pagina-ia .ia-workspace-wrap {
          padding-top: 18px;
          padding-bottom: 20px;
        }

        #pagina-ia .ia-panel-body,
        #pagina-ia .ia-panel-header {
          padding-left: 16px;
          padding-right: 16px;
        }

        #pagina-ia .ia-actions-bar {
          display: grid;
          grid-template-columns: 1fr;
        }

        #pagina-ia .ia-actions-bar .btn-primary,
        #pagina-ia .ia-actions-bar .btn-secondary {
          width: 100%;
        }

        #pagina-ia .ia-image-footer {
          flex-direction: column;
          align-items: stretch;
        }

        #pagina-ia .ia-image-actions {
          justify-content: flex-start;
        }

        #pagina-ia .ia-audio-top {
          align-items: flex-start;
        }

        #pagina-ia .ia-audio-visualizer {
          display: none;
        }
      }
            #pagina-ia .ia-audio-player-custom {
        position: relative;
        display: flex;
        align-items: center;
        gap: 14px;
        width: 100%;
        padding: 12px 14px;
        border-radius: 999px;
        background:
          linear-gradient(135deg, rgba(255,255,255,.96), rgba(238,246,252,.92));
        border: 1px solid rgba(255,255,255,.58);
        box-shadow:
          0 18px 40px rgba(4, 18, 31, .18),
          inset 0 1px 0 rgba(255,255,255,.95),
          inset 0 -1px 0 rgba(16, 52, 74, .05);
        overflow: hidden;
        backdrop-filter: blur(14px);
      }

      #pagina-ia .ia-audio-player-custom::before {
        content: "";
        position: absolute;
        inset: 1px;
        border-radius: inherit;
        background:
          linear-gradient(90deg, rgba(40,198,229,.10), rgba(255,255,255,0) 22%, rgba(255,255,255,0) 78%, rgba(142,123,255,.08));
        pointer-events: none;
      }

      #pagina-ia .ia-audio-player-custom::after {
        content: "";
        position: absolute;
        left: 16px;
        right: 16px;
        top: 0;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,.92), transparent);
        pointer-events: none;
      }

      #pagina-ia .ia-audio-player-custom audio {
        display: none;
      }

      #pagina-ia .ia-audio-play-btn {
        position: relative;
        width: 52px;
        height: 52px;
        border: none;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #32d6ef, #08b6d6);
        color: #04293a;
        font-size: 18px;
        font-weight: 800;
        cursor: pointer;
        box-shadow:
          0 12px 24px rgba(18,189,223,.28),
          inset 0 1px 0 rgba(255,255,255,.55);
        transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
        flex-shrink: 0;
        z-index: 1;
      }

      #pagina-ia .ia-audio-play-btn:hover {
        transform: translateY(-1px) scale(1.03);
        box-shadow:
          0 14px 28px rgba(18,189,223,.34),
          inset 0 1px 0 rgba(255,255,255,.6);
        filter: brightness(1.03);
      }

      #pagina-ia .ia-audio-play-btn:active {
        transform: scale(.98);
      }

      #pagina-ia .ia-audio-play-icon {
        line-height: 1;
      }

      #pagina-ia .ia-audio-time-wrap {
        display: flex;
        align-items: center;
        gap: 5px;
        min-width: 96px;
        flex-shrink: 0;
        padding: 0 2px;
        z-index: 1;
      }

      #pagina-ia .ia-audio-time,
      #pagina-ia .ia-audio-time-separator {
        color: #17364b;
        font-size: 14px;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        letter-spacing: -.01em;
      }

      #pagina-ia .ia-audio-time-separator {
        opacity: .45;
      }

      #pagina-ia .ia-audio-progress-container {
        position: relative;
        flex: 1;
        height: 10px;
        border-radius: 999px;
        background: linear-gradient(180deg, rgba(11, 39, 56, .14), rgba(11, 39, 56, .22));
        cursor: pointer;
        overflow: hidden;
        box-shadow:
          inset 0 1px 2px rgba(0,0,0,.10),
          inset 0 -1px 0 rgba(255,255,255,.35);
        z-index: 1;
      }

      #pagina-ia .ia-audio-progress-fill {
        position: relative;
        width: 0%;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #11b8d8 0%, #41d8ef 55%, #7cecff 100%);
        box-shadow:
          0 0 16px rgba(18,189,223,.26),
          inset 0 1px 0 rgba(255,255,255,.38);
        transition: width .08s linear;
      }

      #pagina-ia .ia-audio-progress-fill::after {
        content: "";
        position: absolute;
        top: 50%;
        right: 0;
        width: 16px;
        height: 16px;
        border-radius: 999px;
        transform: translate(50%, -50%);
        background: radial-gradient(circle at 35% 35%, #ffffff, #b7f4ff 55%, #2ccfe8 100%);
        box-shadow:
          0 0 0 4px rgba(18,189,223,.14),
          0 4px 12px rgba(18,189,223,.26);
      }

      #pagina-ia .ia-audio-mini-btn {
        width: 40px;
        height: 40px;
        border: none;
        background: rgba(18,189,223,.08);
        color: #15364a;
        font-size: 16px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        transition: background-color .18s ease, transform .18s ease, box-shadow .18s ease;
        flex-shrink: 0;
        z-index: 1;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.42);
      }

      #pagina-ia .ia-audio-mini-btn:hover {
        background: rgba(18,189,223,.14);
        transform: translateY(-1px);
        box-shadow: 0 8px 18px rgba(18,189,223,.10);
      }

      #pagina-ia .ia-audio-volume-wrap {
        width: 100px;
        display: flex;
        align-items: center;
        flex-shrink: 0;
        z-index: 1;
      }

      #pagina-ia .ia-audio-volume {
        width: 100%;
        appearance: none;
        height: 6px;
        border-radius: 999px;
        outline: none;
        background: linear-gradient(180deg, rgba(15, 47, 68, .14), rgba(15, 47, 68, .22));
        cursor: pointer;
      }

      #pagina-ia .ia-audio-volume::-webkit-slider-runnable-track {
        height: 6px;
        border-radius: 999px;
        background: linear-gradient(180deg, rgba(15, 47, 68, .14), rgba(15, 47, 68, .22));
      }

      #pagina-ia .ia-audio-volume::-webkit-slider-thumb {
        appearance: none;
        width: 15px;
        height: 15px;
        margin-top: -4.5px;
        border-radius: 999px;
        border: none;
        background: radial-gradient(circle at 35% 35%, #ffffff, #b7f4ff 55%, #16b7d8 100%);
        box-shadow:
          0 0 0 3px rgba(18,189,223,.14),
          0 6px 14px rgba(18,189,223,.20);
      }

      #pagina-ia .ia-audio-volume::-moz-range-track {
        height: 6px;
        border-radius: 999px;
        background: linear-gradient(180deg, rgba(15, 47, 68, .14), rgba(15, 47, 68, .22));
      }

      #pagina-ia .ia-audio-volume::-moz-range-thumb {
        width: 15px;
        height: 15px;
        border: none;
        border-radius: 999px;
        background: radial-gradient(circle at 35% 35%, #ffffff, #b7f4ff 55%, #16b7d8 100%);
        box-shadow:
          0 0 0 3px rgba(18,189,223,.14),
          0 6px 14px rgba(18,189,223,.20);
      }

      html[data-theme="light"] #pagina-ia .ia-audio-player-custom,
      body[data-theme="light"] #pagina-ia .ia-audio-player-custom,
      html.light #pagina-ia .ia-audio-player-custom,
      body.light #pagina-ia .ia-audio-player-custom,
      .theme-light #pagina-ia .ia-audio-player-custom,
      [data-bs-theme="light"] #pagina-ia .ia-audio-player-custom {
        background:
          linear-gradient(135deg, rgba(255,255,255,.99), rgba(243,248,252,.96));
        border: 1px solid rgba(155, 196, 220, .28);
        box-shadow:
          0 18px 38px rgba(92, 129, 168, .14),
          inset 0 1px 0 rgba(255,255,255,.96),
          inset 0 -1px 0 rgba(101, 141, 174, .06);
      }

      html[data-theme="light"] #pagina-ia .ia-audio-play-btn,
      body[data-theme="light"] #pagina-ia .ia-audio-play-btn,
      html.light #pagina-ia .ia-audio-play-btn,
      body.light #pagina-ia .ia-audio-play-btn,
      .theme-light #pagina-ia .ia-audio-play-btn,
      [data-bs-theme="light"] #pagina-ia .ia-audio-play-btn {
        color: #083446;
      }

      html[data-theme="light"] #pagina-ia .ia-audio-mini-btn,
      body[data-theme="light"] #pagina-ia .ia-audio-mini-btn,
      html.light #pagina-ia .ia-audio-mini-btn,
      body.light #pagina-ia .ia-audio-mini-btn,
      .theme-light #pagina-ia .ia-audio-mini-btn,
      [data-bs-theme="light"] #pagina-ia .ia-audio-mini-btn {
        background: rgba(18,189,223,.08);
      }

      #pagina-ia #ia-audio-card.is-playing .ia-audio-player-custom {
        box-shadow:
          0 20px 42px rgba(18,189,223,.18),
          inset 0 1px 0 rgba(255,255,255,.96),
          inset 0 -1px 0 rgba(16, 52, 74, .05);
      }

      #pagina-ia #ia-audio-card.is-playing .ia-audio-play-btn {
        box-shadow:
          0 16px 32px rgba(18,189,223,.38),
          inset 0 1px 0 rgba(255,255,255,.55);
      }

      @media (max-width: 640px) {
        #pagina-ia .ia-audio-player-custom {
          gap: 10px;
          padding: 10px 12px;
        }

        #pagina-ia .ia-audio-play-btn {
          width: 46px;
          height: 46px;
        }

        #pagina-ia .ia-audio-time-wrap {
          min-width: 78px;
        }

        #pagina-ia .ia-audio-time,
        #pagina-ia .ia-audio-time-separator {
          font-size: 12px;
        }

        #pagina-ia .ia-audio-volume-wrap {
          width: 70px;
        }

        #pagina-ia .ia-audio-mini-btn {
          width: 36px;
          height: 36px;
        }
      }

    `;
    document.head.appendChild(style);
  }

  function ensureLayout() {
    const page = document.getElementById("pagina-ia");
    if (!page) return;
    if (page.dataset.iaEnhancedLayout === "true") return;

    page.dataset.iaEnhancedLayout = "true";
    page.innerHTML = `
      <div class="ia-shell">
        <aside class="ia-sidebar">
          <div class="ia-sidebar-header">
            <div class="ia-brand">
              <div class="ia-brand-badge">P</div>
              <div class="ia-brand-copy">
                <h1>ProtoCord IA</h1>
                <span>Workspace</span>
              </div>
            </div>

            <div class="ia-sidebar-actions">
              <button id="ia-new-ticket-btn" class="btn-primary" type="button">
                <i data-lucide="plus" class="w-5 h-5"></i>
                <span>Novo Ticket</span>
              </button>

              <div class="ia-search-wrap">
                <i data-lucide="search"></i>
                <input id="ia-search-input" type="text" placeholder="Buscar ticket..." />
              </div>
            </div>
          </div>

          <div id="ia-ticket-list" class="ia-sidebar-list"></div>

          <div class="ia-sidebar-footer">
            <div class="ia-sidebar-footer-row">
              <span>ProtoCord IA</span>
              <span>Workspace</span>
            </div>
          </div>
        </aside>

        <main class="ia-main">
          <div id="ia-content" class="hidden">
            <div class="ia-content-shell">
              <header class="ia-topbar">
                <div>
                  <div class="ia-topbar-meta">
                    <span class="ia-badge-active">Ativo</span>
                    <span id="ia-active-date">--</span>
                  </div>
                  <h2 id="ia-active-title">Carregando...</h2>
                </div>

                <div class="ia-topbar-actions">
                  <button id="ia-toggle-registered-btn" class="btn-secondary" type="button">
                    <i data-lucide="ticket" class="w-4 h-4"></i>
                    <span>Marcar Registro</span>
                  </button>
                </div>
              </header>

              <div class="ia-workspace-wrap">
                <div class="ia-workspace">
                  <div class="ia-info-grid">
                    <div class="ia-info-card">
                      <p class="ia-info-card-label">Entrada</p>
                      <p class="ia-info-card-value">Transcrição IA</p>
                    </div>
                    <div class="ia-info-card">
                      <p class="ia-info-card-label">Mídia</p>
                      <p class="ia-info-card-value">Snapshot + Áudio</p>
                    </div>
                    <div class="ia-info-card">
                      <p class="ia-info-card-label">Saída</p>
                      <p class="ia-info-card-value">Relatório Estruturado</p>
                    </div>
                  </div>

                  <div class="ia-actions-bar">
                    <button id="ia-upload-audio-btn" class="btn-primary" type="button">
                      <i data-lucide="mic" class="w-4 h-4"></i>
                      <span>Transcrição</span>
                    </button>

                    <button id="ia-copy-znuny-btn" class="btn-secondary" type="button">
                      <i data-lucide="arrow-right-left" class="w-4 h-4"></i>
                      <span>Transportar</span>
                    </button>

                    <button id="ia-copy-html-btn" class="btn-secondary" type="button">
                      <i data-lucide="copy" class="w-4 h-4"></i>
                      <span>Copiar HTML</span>
                    </button>

                    <input type="file" id="ia-audio-input" accept="audio/*" class="hidden" />
                  </div>

                  <div class="ia-grid-main">
                    <section>
                      <div class="ia-panel">
                        <div class="ia-panel-header">
                          <div class="ia-panel-title">
                            <i data-lucide="file-text" class="text-cyan-500"></i>
                            <h3>Relatório Analítico</h3>
                          </div>

                          <div class="ia-panel-tools">
                            <button id="ia-cancel-report-btn" class="ia-text-action ia-text-danger hidden" type="button">Cancelar</button>
                            <button id="ia-edit-report-btn" class="ia-text-action" type="button">
                              <i data-lucide="square-pen" class="w-3.5 h-3.5"></i>
                              <span>Editar</span>
                            </button>
                          </div>
                        </div>

                        <div class="ia-panel-body">
                          <div id="ia-report-view"></div>
                          <textarea id="ia-report-editor" class="hidden"></textarea>

                          <div class="ia-audio-section">
                            <div id="ia-audio-card" class="hidden">
                              <div class="ia-audio-ambient"></div>

                              <div class="ia-audio-top">
                                <div class="ia-audio-icon">
                                  <i data-lucide="volume-2" class="w-5 h-5"></i>
                                </div>

                                <div class="ia-audio-copy">
                                  <strong>Áudio da Transcrição</strong>
                                  <span>Ouça o arquivo enviado diretamente na interface.</span>
                                </div>

                                <div class="ia-audio-visualizer" aria-hidden="true">
                                  <span class="ia-audio-bar"></span>
                                  <span class="ia-audio-bar"></span>
                                  <span class="ia-audio-bar"></span>
                                  <span class="ia-audio-bar"></span>
                                </div>
                              </div>

                              <div class="ia-audio-player-wrap">
                                <div class="audio-container">
                                 <div class="ia-audio-player-custom">
    <audio id="ia-audio-player" preload="metadata"></audio>

    <button id="ia-audio-play-btn" class="ia-audio-play-btn" type="button" aria-label="Play/Pause">
      <span class="ia-audio-play-icon ia-audio-play-icon-play">▶</span>
      <span class="ia-audio-play-icon ia-audio-play-icon-pause hidden">❚❚</span>
    </button>

    <div class="ia-audio-time-wrap">
      <span id="ia-audio-current-time" class="ia-audio-time">0:00</span>
      <span class="ia-audio-time-separator">/</span>
      <span id="ia-audio-duration" class="ia-audio-time">0:00</span>
    </div>

    <div id="ia-audio-progress-container" class="ia-audio-progress-container" role="slider" aria-label="Progresso do áudio">
      <div id="ia-audio-progress-fill" class="ia-audio-progress-fill"></div>
    </div>

    <button id="ia-audio-mute-btn" class="ia-audio-mini-btn" type="button" aria-label="Mutar áudio">
      🔊
    </button>

    <div class="ia-audio-volume-wrap">
      <input id="ia-audio-volume" class="ia-audio-volume" type="range" min="0" max="1" step="0.01" value="1" />
    </div>
  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section>
                      <div class="ia-panel">
                        <div class="ia-panel-header">
                          <div class="ia-panel-title">
                            <i data-lucide="image" class="text-violet-400"></i>
                            <h3>Evidências Visuais</h3>
                          </div>

                          <div class="ia-panel-meta">
                            <span id="ia-image-counter">0 / 0</span>
                          </div>
                        </div>

                        <div class="ia-panel-body ia-image-stage-wrap">
                          <div class="ia-image-dropzone">
                            <div id="ia-image-empty">
                              <div class="ia-image-empty-icon">
                                <i data-lucide="image-plus" class="w-8 h-8"></i>
                              </div>
                              <p class="ia-image-empty-title">Nenhuma evidência adicionada</p>
                              <p class="ia-image-empty-text">
                                Pressione <kbd>Ctrl</kbd> + <kbd>V</kbd> para colar imagens do atendimento e manter o ticket completo.
                              </p>
                            </div>

                            <div id="ia-image-stage" class="hidden">
                              <div class="ia-image-preview-shell">
                                <img id="ia-active-image" src="" alt="Evidência do ticket" />

                                <div class="ia-image-nav">
                                  <button id="ia-prev-image-btn" class="ia-image-nav-btn" type="button" title="Imagem anterior">
                                    <i data-lucide="chevron-left" class="w-5 h-5"></i>
                                  </button>
                                  <button id="ia-next-image-btn" class="ia-image-nav-btn" type="button" title="Próxima imagem">
                                    <i data-lucide="chevron-right" class="w-5 h-5"></i>
                                  </button>
                                </div>
                              </div>

                              <div class="ia-image-footer">
                                <div class="ia-image-footer-copy">
                                  Navegue entre as evidências e gerencie as imagens sem sair do ticket.
                                </div>

                                <div class="ia-image-actions">
                                  <button id="ia-copy-image-btn" class="ia-icon-btn" type="button" title="Copiar imagem">
                                    <i data-lucide="copy" class="w-4 h-4"></i>
                                  </button>
                                  <button id="ia-delete-image-btn" class="ia-icon-btn ia-icon-danger" type="button" title="Excluir imagem">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="ia-empty-state" class="ia-empty-state">
            <div class="ia-empty-card">
              <div class="ia-empty-card-icon">
                <i data-lucide="bot" class="w-11 h-11"></i>
              </div>
              <h3>Central de Inteligência ProtoCord</h3>
              <p>
                Selecione um ticket ao lado ou crie um novo para iniciar o processo
                de transcrição, registro de evidências e geração do relatório.
              </p>
            </div>
          </div>
        </main>
      </div>
    `;

    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function bindElements() {
    els.page = document.getElementById("pagina-ia");
    els.newTicketBtn = document.getElementById("ia-new-ticket-btn");
    els.searchInput = document.getElementById("ia-search-input");
    els.ticketList = document.getElementById("ia-ticket-list");
    els.activeTitle = document.getElementById("ia-active-title");
    els.activeDate = document.getElementById("ia-active-date");
    els.toggleRegisteredBtn = document.getElementById("ia-toggle-registered-btn");
    els.uploadAudioBtn = document.getElementById("ia-upload-audio-btn");
    els.copyZnunyBtn = document.getElementById("ia-copy-znuny-btn");
    els.copyHtmlBtn = document.getElementById("ia-copy-html-btn");
    els.audioInput = document.getElementById("ia-audio-input");
    els.emptyState = document.getElementById("ia-empty-state");
    els.content = document.getElementById("ia-content");
    els.imageEmpty = document.getElementById("ia-image-empty");
    els.imageStage = document.getElementById("ia-image-stage");
    els.activeImage = document.getElementById("ia-active-image");
    els.prevImageBtn = document.getElementById("ia-prev-image-btn");
    els.nextImageBtn = document.getElementById("ia-next-image-btn");
    els.imageCounter = document.getElementById("ia-image-counter");
    els.copyImageBtn = document.getElementById("ia-copy-image-btn");
    els.deleteImageBtn = document.getElementById("ia-delete-image-btn");
    els.editReportBtn = document.getElementById("ia-edit-report-btn");
    els.cancelReportBtn = document.getElementById("ia-cancel-report-btn");
    els.reportView = document.getElementById("ia-report-view");
    els.reportEditor = document.getElementById("ia-report-editor");
    els.audioCard = document.getElementById("ia-audio-card");
    els.audioPlayer = document.getElementById("ia-audio-player");
    els.audioPlayBtn = document.getElementById("ia-audio-play-btn");
    els.audioPlayIconPlay = document.querySelector(".ia-audio-play-icon-play");
    els.audioPlayIconPause = document.querySelector(".ia-audio-play-icon-pause");
    els.audioCurrentTime = document.getElementById("ia-audio-current-time");
    els.audioDuration = document.getElementById("ia-audio-duration");
    els.audioProgressContainer = document.getElementById("ia-audio-progress-container");
    els.audioProgressFill = document.getElementById("ia-audio-progress-fill");
    els.audioMuteBtn = document.getElementById("ia-audio-mute-btn");
    els.audioVolume = document.getElementById("ia-audio-volume");
  }

  function bindEvents() {
    els.newTicketBtn?.addEventListener("click", () => {
      createTicket();
      render();
    });

    els.searchInput?.addEventListener("input", (event) => {
      state.searchTerm = event.target.value || "";
      renderTicketList();
      lucide.createIcons();
      animateTicketList();
    });

    els.toggleRegisteredBtn?.addEventListener("click", () => {
      const active = getActiveTicket();
      if (!active) return;
      active.isRegistered = !active.isRegistered;
      persist();
      render();
      notify("Status atualizado.", "success");
    });

    els.uploadAudioBtn?.addEventListener("click", () => {
      if (!getActiveTicket() || state.uploading) return;
      els.audioInput?.click();
    });

    els.audioInput?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      await uploadAudio(file);
      event.target.value = "";
    });

    els.copyHtmlBtn?.addEventListener("click", async () => {
      const active = getActiveTicketWithDraft(true);
      if (!active) return;

      try {
        await navigator.clipboard.writeText(buildHtml(active));
        notify("HTML copiado.", "success");
      } catch (error) {
        notify("Falha ao copiar HTML.", "error");
      }
    });

    els.copyZnunyBtn?.addEventListener("click", async () => {
      const active = getActiveTicketWithDraft(true);
      if (!active) return;

      const payload = {
        contato: active.customName ? `${active.customName} (${active.phone})` : `(${active.phone})`,
        relatorio: buildHtml(active),
        assunto: active.resumo || "Solicitacao de Suporte",
      };

      try {
        await navigator.clipboard.writeText(JSON.stringify(payload));
        window.open("https://rhede.serviceup.app/znuny/index.pl?Action=AgentTicketPhone", "_blank");
        notify("Payload copiado para o Znuny.", "success");
      } catch (error) {
        notify("Falha ao preparar o transporte.", "error");
      }
    });

    els.prevImageBtn?.addEventListener("click", () => {
      const active = getActiveTicket();
      if (!active?.images?.length) return;
      state.imageIndex = Math.max(state.imageIndex - 1, 0);
      renderImageViewer(active);
      animateImageStage();
    });

    els.nextImageBtn?.addEventListener("click", () => {
      const active = getActiveTicket();
      if (!active?.images?.length) return;
      state.imageIndex = Math.min(state.imageIndex + 1, active.images.length - 1);
      renderImageViewer(active);
      animateImageStage();
    });

    els.copyImageBtn?.addEventListener("click", copyCurrentImage);
    els.deleteImageBtn?.addEventListener("click", deleteCurrentImage);

    els.editReportBtn?.addEventListener("click", () => {
      const active = getActiveTicket();
      if (!active) return;

      if (!state.editingReport) {
        state.reportDraft = buildSingleReportText(active);
        state.editingReport = true;
      } else {
        applyReportDraft();
      }

      renderReport(getActiveTicket());
      animateReportPanel();
    });

    els.cancelReportBtn?.addEventListener("click", () => {
      state.editingReport = false;
      state.reportDraft = "";
      renderReport(getActiveTicket());
      animateReportPanel();
    });

    els.reportEditor?.addEventListener("input", (event) => {
      state.reportDraft = event.target.value || "";
    });

    els.ticketList?.addEventListener("click", handleTicketListClick);
    els.ticketList?.addEventListener("keydown", handleTicketListKeydown);
    els.ticketList?.addEventListener("focusout", handleTicketListFocusOut);

    window.addEventListener("paste", handlePasteImages);

    els.audioPlayer?.addEventListener("play", () => {
      els.audioCard?.classList.add("is-playing");
      animateAudioCard(true);
    });

    els.audioPlayer?.addEventListener("pause", () => {
      els.audioCard?.classList.remove("is-playing");
      animateAudioCard(false);
    });

    els.audioPlayer?.addEventListener("ended", () => {
      els.audioCard?.classList.remove("is-playing");
      animateAudioCard(false);
    });

    els.audioPlayBtn?.addEventListener("click", toggleAudioPlayback);

els.audioMuteBtn?.addEventListener("click", () => {
  if (!els.audioPlayer) return;
  els.audioPlayer.muted = !els.audioPlayer.muted;
  syncAudioUi();
});

els.audioVolume?.addEventListener("input", (event) => {
  if (!els.audioPlayer) return;
  const value = Number(event.target.value || 0);
  els.audioPlayer.volume = value;
  els.audioPlayer.muted = value === 0;
  syncAudioUi();
});

els.audioProgressContainer?.addEventListener("click", (event) => {
  if (!els.audioPlayer || !els.audioPlayer.duration) return;
  const rect = els.audioProgressContainer.getBoundingClientRect();
  const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
  els.audioPlayer.currentTime = els.audioPlayer.duration * ratio;
});

els.audioPlayer?.addEventListener("loadedmetadata", syncAudioUi);
els.audioPlayer?.addEventListener("timeupdate", syncAudioUi);
els.audioPlayer?.addEventListener("volumechange", syncAudioUi);

els.audioPlayer?.addEventListener("play", () => {
  els.audioCard?.classList.add("is-playing");
  syncAudioUi();
  animateAudioCard(true);
});

els.audioPlayer?.addEventListener("pause", () => {
  els.audioCard?.classList.remove("is-playing");
  syncAudioUi();
  animateAudioCard(false);
});

els.audioPlayer?.addEventListener("ended", () => {
  els.audioCard?.classList.remove("is-playing");
  syncAudioUi();
  animateAudioCard(false);
});
  }

  function restoreState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      state.tickets = Array.isArray(parsed.tickets)
        ? parsed.tickets.map((ticket) => ({
            ...ticket,
            audioUrl: "",
            blobUrl: "",
          }))
        : [];
      state.activeId = parsed.activeId || null;
    } catch (error) {
      state.tickets = [];
      state.activeId = null;
    }
  }

  function persist() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        tickets: state.tickets.map((ticket) => ({
          ...ticket,
          audioUrl: "",
          blobUrl: "",
        })),
        activeId: state.activeId,
      })
    );
  }

  function getActiveTicket() {
    return state.tickets.find((ticket) => ticket.id === state.activeId) || null;
  }

  function createTicket() {
    const id = String(Date.now());
    const ticket = {
      id,
      phone: "Novo Ticket",
      customName: "",
      images: [],
      analysis: "",
      solucao: "",
      resumo: "",
      createdAt: new Date().toLocaleString("pt-BR"),
      isRegistered: false,
      audioUrl: "",
      blobUrl: "",
      nomeArquivoNoServidor: "",
      localAudioKey: id,
    };

    state.tickets.unshift(ticket);
    state.activeId = id;
    state.imageIndex = 0;
    state.editingReport = false;
    state.reportDraft = "";
    persist();
    return ticket;
  }

  function render() {
    renderTicketList();
    renderActiveTicket();
    lucide.createIcons();
    animateInterface();
  }

  function renderTicketList() {
    if (!els.ticketList) return;

    const term = state.searchTerm.trim().toLowerCase();
    const filtered = state.tickets.filter((ticket) => {
      const composite = `${ticket.phone || ""} ${ticket.customName || ""}`.toLowerCase();
      return !term || composite.includes(term);
    });

    if (!filtered.length) {
      els.ticketList.innerHTML = `
        <div style="padding:18px">
          <div class="ia-ticket-item" style="cursor:default;text-align:center;padding:22px 16px;">
            <div class="ia-ticket-meta" style="font-size:12px;">Nenhum ticket encontrado.</div>
          </div>
        </div>
      `;
      return;
    }

    els.ticketList.innerHTML = filtered
      .map((ticket) => {
        const title = escapeHtml(ticket.customName || ticket.phone || "Sem nome");
        const activeClass = ticket.id === state.activeId ? "active" : "";
        const statusIcon = ticket.isRegistered
          ? '<i data-lucide="check-circle-2" class="w-4 h-4 text-green-400"></i>'
          : '<i data-lucide="ticket" class="w-4 h-4 text-sky-400"></i>';

        return `
        <article class="ia-ticket-item ${activeClass}" data-ticket-id="${ticket.id}">
          <div class="ia-ticket-line">
            <div class="ia-ticket-main">
              <div class="ia-ticket-title">
                ${statusIcon}
                <span>${title}</span>
              </div>
              <div class="ia-ticket-meta">${escapeHtml(ticket.createdAt || "")}</div>
            </div>

            <div class="ia-ticket-actions">
              <button class="ia-icon-btn" type="button" data-action="rename" data-ticket-id="${ticket.id}" title="Renomear">
                <i data-lucide="square-pen" class="w-4 h-4"></i>
              </button>
              <button class="ia-icon-btn ia-icon-danger" type="button" data-action="delete" data-ticket-id="${ticket.id}" title="Excluir">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
          ${
            state.editingTicketId === ticket.id
              ? `
            <div style="margin-top:12px">
              <input class="ia-ticket-input" data-ticket-edit-input="${ticket.id}" value="${escapeAttribute(
                  ticket.customName || ticket.phone || ""
                )}" />
            </div>
          `
              : ""
          }
        </article>
      `;
      })
      .join("");
  }

  function commitTicketName(ticketId) {
    const ticket = state.tickets.find((entry) => entry.id === ticketId);
    const input = els.ticketList.querySelector(`[data-ticket-edit-input="${ticketId}"]`);
    if (!ticket || !input) return;

    const value = input.value.trim();
    ticket.customName = value;
    state.editingTicketId = null;
    persist();
    render();
  }

  function focusTicketInput(ticketId) {
    const input = els.ticketList?.querySelector(`[data-ticket-edit-input="${ticketId}"]`);
    if (!input) return;
    input.focus();
    input.select();
  }

  function beginTicketRename(ticketId) {
    if (!ticketId) return;

    if (state.editingTicketId === ticketId) {
      commitTicketName(ticketId);
      return;
    }

    state.editingTicketId = ticketId;
    renderTicketList();
    lucide.createIcons();
    focusTicketInput(ticketId);
    animateTicketList();
  }

  async function deleteTicket(ticketId) {
    const ticket = state.tickets.find((entry) => entry.id === ticketId);
    if (!ticket) return;

    try {
      await deleteLocalAudio(ticket.localAudioKey || ticket.id);
    } catch (error) {
      console.warn("Falha ao remover áudio local do ticket:", error);
    }

    revokeObjectUrlIfNeeded(ticket.audioUrl);

    state.tickets = state.tickets.filter((entry) => entry.id !== ticketId);

    if (state.activeId === ticketId) {
      state.activeId = state.tickets[0]?.id || null;
      state.imageIndex = 0;
    }

    state.editingTicketId = null;
    persist();
    render();
  }

  function handleTicketListClick(event) {
    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      event.preventDefault();
      event.stopPropagation();

      const ticketId = actionButton.dataset.ticketId;
      if (actionButton.dataset.action === "rename") {
        beginTicketRename(ticketId);
      }

      if (actionButton.dataset.action === "delete") {
        deleteTicket(ticketId);
      }
      return;
    }

    const input = event.target.closest("[data-ticket-edit-input]");
    if (input) {
      event.stopPropagation();
      return;
    }

    const item = event.target.closest(".ia-ticket-item");
    if (!item || !els.ticketList?.contains(item)) return;

    state.activeId = item.dataset.ticketId;
    state.imageIndex = 0;
    state.editingReport = false;
    state.reportDraft = "";
    persist();
    render();
  }

  function handleTicketListKeydown(event) {
    const input = event.target.closest("[data-ticket-edit-input]");
    if (!input) return;

    if (event.key === "Enter") {
      event.preventDefault();
      commitTicketName(input.dataset.ticketEditInput);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      state.editingTicketId = null;
      render();
    }
  }

  function handleTicketListFocusOut(event) {
    const input = event.target.closest("[data-ticket-edit-input]");
    if (!input) return;

    const ticketId = input.dataset.ticketEditInput;
    window.requestAnimationFrame(() => {
      const activeElement = document.activeElement;
      if (activeElement === input) return;
      if (activeElement?.closest?.(`[data-ticket-id="${ticketId}"][data-action="rename"]`)) return;
      commitTicketName(ticketId);
    });
  }

  function renderActiveTicket() {
    const active = getActiveTicket();
    const hasActive = Boolean(active);
    const workspace = els.page?.querySelector(".ia-workspace");

    workspace?.classList.toggle("is-uploading", state.uploading);
    els.page?.setAttribute("aria-busy", state.uploading ? "true" : "false");

    toggleDisabled(els.toggleRegisteredBtn, !hasActive);
    toggleDisabled(els.uploadAudioBtn, !hasActive || state.uploading);
    toggleDisabled(els.copyZnunyBtn, !hasActive);
    toggleDisabled(els.copyHtmlBtn, !hasActive);

    if (!hasActive) {
      els.activeTitle.textContent = "Selecione ou crie um ticket";
      els.activeDate.textContent = "Nenhum ticket ativo.";
      els.emptyState.classList.remove("hidden");
      els.content.classList.add("hidden");
      return;
    }

    els.emptyState.classList.add("hidden");
    els.content.classList.remove("hidden");
    els.activeTitle.textContent = active.customName || active.phone || "Ticket";
    els.activeDate.textContent = active.createdAt || "";
    els.toggleRegisteredBtn.querySelector("span").textContent = active.isRegistered ? "Registrado" : "Marcar Registro";
    els.uploadAudioBtn.querySelector("span").textContent = state.uploading ? "Processando..." : "Transcrição";

    renderImageViewer(active);
    renderReport(active);
    renderAudio(active);
  }

  function renderImageViewer(active) {
    const images = Array.isArray(active?.images) ? active.images : [];
    if (!images.length) {
      els.imageEmpty.classList.remove("hidden");
      els.imageStage.classList.add("hidden");
      els.imageCounter.textContent = "0 / 0";
      toggleDisabled(els.prevImageBtn, true);
      toggleDisabled(els.nextImageBtn, true);
      return;
    }

    state.imageIndex = Math.min(state.imageIndex, images.length - 1);
    state.imageIndex = Math.max(state.imageIndex, 0);

    els.imageEmpty.classList.add("hidden");
    els.imageStage.classList.remove("hidden");
    els.activeImage.src = images[state.imageIndex];
    els.imageCounter.textContent = `${state.imageIndex + 1} / ${images.length}`;
    toggleDisabled(els.prevImageBtn, state.imageIndex === 0);
    toggleDisabled(els.nextImageBtn, state.imageIndex >= images.length - 1);
  }

  function renderReport(active) {
    const text = state.editingReport ? state.reportDraft : buildSingleReportText(active);

    if (state.editingReport) {
      els.reportView.classList.add("hidden");
      els.reportEditor.classList.remove("hidden");
      els.reportEditor.value = text;
      els.editReportBtn.querySelector("span").textContent = "Salvar Edição";
      els.cancelReportBtn.classList.remove("hidden");
    } else {
      els.reportView.classList.remove("hidden");
      els.reportEditor.classList.add("hidden");
      els.reportView.textContent = text || "Aguardando transcrição...";
      els.editReportBtn.querySelector("span").textContent = "Editar";
      els.cancelReportBtn.classList.add("hidden");
    }
  }

function renderAudio(active) {
  if (!active) {
    els.audioCard.classList.add("hidden");
    els.audioPlayer?.removeAttribute("src");
    syncAudioUi();
    return;
  }

  if (active.audioUrl) {
    els.audioCard.classList.remove("hidden");

    if (els.audioPlayer.src !== active.audioUrl) {
      els.audioPlayer.src = active.audioUrl;
      els.audioPlayer.load();
    }

    syncAudioUi();
    animateAudioCard(!els.audioPlayer.paused);
    return;
  }

  els.audioCard.classList.remove("hidden");
  els.audioPlayer.removeAttribute("src");
  syncAudioUi();
  hydrateLocalAudio(active);
}
  
  async function uploadAudio(file) {
    const active = getActiveTicket();
    if (!active) {
      notify("Selecione um ticket.", "error");
      return;
    }

    state.uploading = true;
    renderActiveTicket();

    try {
      await pingBackendHealth();

      const fileForUpload = await prepareAudioForTranscription(file);

      notify("Enviando áudio temporário para processamento...", "info");
      const blobUpload = await uploadAudioToBlob(fileForUpload);

      notify("Processando áudio no backend...", "info");
      const data = await requestBlobTranscription(blobUpload, fileForUpload);

      if (active.localAudioKey) {
        await deleteLocalAudio(active.localAudioKey);
        revokeObjectUrlIfNeeded(active.audioUrl);
      }

      const localAudioKey = await saveLocalAudio(active.id, fileForUpload);

      active.analysis = data.analise || "";
      active.solucao = data.solucao || "";
      active.resumo = (data.resumo || "").substring(0, 255);
      active.phone = data.telefone || active.phone;
      active.nomeArquivoNoServidor = data.nomeArquivoNoServidor || "";
      active.blobUrl = data.blobUrl || "";
      active.localAudioKey = localAudioKey;
      active.audioUrl = URL.createObjectURL(fileForUpload);
      state.editingReport = false;
      state.reportDraft = "";
      persist();
      render();
      notify("Transcrição concluída.", "success");
    } catch (error) {
      console.error("Falha no fluxo de transcrição:", error);
      notify(error.message || "Falha ao transcrever.", "error");
    } finally {
      state.uploading = false;
      renderActiveTicket();
    }
  }

  async function prepareAudioForTranscription(file) {
    if (!file) {
      throw new Error("Nenhum arquivo de áudio informado.");
    }

    if (!isUploadFriendlyAudio(file)) {
      throw new Error("Formato de áudio não suportado para upload.");
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      throw new Error(`Áudio muito grande para envio (${sizeMb} MB). Envie um arquivo menor que 128 MB.`);
    }

    return file;
  }

  function createHttpError(message, status) {
    const error = new Error(message);
    error.status = status;
    return error;
  }

  async function parseJsonSafe(response) {
    try {
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  async function requestBlobTranscription(blobUpload, file) {
    const response = await fetch(`${apiBaseUrl}/transcrever`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        blobUrl: blobUpload.url,
        pathname: blobUpload.pathname || "",
        filename: file.name,
        contentType: file.type || "application/octet-stream",
      }),
    });

    const data = await parseJsonSafe(response);

    if (!response.ok || !data?.sucesso) {
      throw createHttpError(data?.erro || `Falha ao transcrever o áudio armazenado. Status ${response.status}`, response.status);
    }

    return data;
  }

  function buildSingleReportText(ticket) {
    return [
      "PROBLEMA / DUVIDA:",
      ticket?.analysis || "",
      "",
      "ENCAMINHAMENTO / SOLUCAO:",
      ticket?.solucao || "",
    ].join("\n").trim();
  }

  function parseSingleReportText(text) {
    const normalized = String(text || "").replace(/\r\n/g, "\n");
    const problemMatch = normalized.match(
      /PROBLEMA\s*\/\s*DUVIDA\s*:\s*([\s\S]*?)(?:\n{2,}ENCAMINHAMENTO\s*\/\s*SOLUCAO\s*:|$)/i
    );
    const solutionMatch = normalized.match(/ENCAMINHAMENTO\s*\/\s*SOLUCAO\s*:\s*([\s\S]*)/i);

    return {
      analysis: problemMatch ? problemMatch[1].trim() : normalized.trim(),
      solucao: solutionMatch ? solutionMatch[1].trim() : "",
    };
  }

  function applyReportDraft() {
    const active = getActiveTicket();
    if (!active) return;

    const parsed = parseSingleReportText(state.reportDraft);
    active.analysis = parsed.analysis;
    active.solucao = parsed.solucao;
    state.editingReport = false;
    state.reportDraft = "";
    persist();
    notify("Relatório atualizado.", "success");
  }

  function getActiveTicketWithDraft(persistDraft) {
    const active = getActiveTicket();
    if (!active) return null;

    if (!state.editingReport) return active;

    const parsed = parseSingleReportText(state.reportDraft);
    if (persistDraft) {
      active.analysis = parsed.analysis;
      active.solucao = parsed.solucao;
      state.editingReport = false;
      state.reportDraft = "";
      persist();
      renderReport(active);
      return active;
    }

    return { ...active, analysis: parsed.analysis, solucao: parsed.solucao };
  }

  async function handlePasteImages(event) {
    const active = getActiveTicket();
    if (!active) return;

    const items = Array.from(event.clipboardData?.items || []);
    const imageFiles = items
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter(Boolean);

    if (!imageFiles.length) return;

    const images = await Promise.all(imageFiles.map(readFileAsDataUrl));
    active.images = [...(active.images || []), ...images];
    state.imageIndex = active.images.length - images.length;
    persist();
    renderImageViewer(active);
    animateImageStage();
    notify(`${images.length} imagem(ns) adicionada(s).`, "success");
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function copyCurrentImage() {
    const active = getActiveTicket();
    const image = active?.images?.[state.imageIndex];
    if (!image) return;

    try {
      const blob = await fetch(image).then((response) => response.blob());
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      notify("Imagem copiada.", "success");
    } catch (error) {
      notify("Falha ao copiar imagem.", "error");
    }
  }

  function deleteCurrentImage() {
    const active = getActiveTicket();
    if (!active?.images?.length) return;

    active.images.splice(state.imageIndex, 1);
    state.imageIndex = Math.min(state.imageIndex, Math.max(active.images.length - 1, 0));
    persist();
    renderImageViewer(active);
    animateImageStage();
  }

  function revokeObjectUrlIfNeeded(url) {
    if (url && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  }

  function openAudioDatabase() {
    if (!audioDbPromise) {
      audioDbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(AUDIO_DB_NAME, 1);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) {
            db.createObjectStore(AUDIO_STORE_NAME, { keyPath: "id" });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Falha ao abrir IndexedDB."));
      });
    }

    return audioDbPromise;
  }

  async function saveLocalAudio(ticketId, file) {
    const db = await openAudioDatabase();
    const id = String(ticketId || Date.now());

    await new Promise((resolve, reject) => {
      const tx = db.transaction(AUDIO_STORE_NAME, "readwrite");
      tx.objectStore(AUDIO_STORE_NAME).put({
        id,
        blob: file,
        filename: file.name || "audio",
        type: file.type || "application/octet-stream",
        updatedAt: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Falha ao salvar áudio local."));
    });

    return id;
  }

  async function readLocalAudio(audioKey) {
    if (!audioKey) return null;
    const db = await openAudioDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(AUDIO_STORE_NAME, "readonly");
      const request = tx.objectStore(AUDIO_STORE_NAME).get(audioKey);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("Falha ao ler áudio local."));
    });
  }

  async function deleteLocalAudio(audioKey) {
    if (!audioKey) return;
    const db = await openAudioDatabase();

    await new Promise((resolve, reject) => {
      const tx = db.transaction(AUDIO_STORE_NAME, "readwrite");
      tx.objectStore(AUDIO_STORE_NAME).delete(audioKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Falha ao excluir áudio local."));
    });
  }

  async function hydrateLocalAudio(ticket) {
    if (!ticket?.localAudioKey) {
      els.audioCard.classList.add("hidden");
      return;
    }

    try {
      const localAudio = await readLocalAudio(ticket.localAudioKey);
      if (!localAudio?.blob) {
        els.audioCard.classList.add("hidden");
        return;
      }

      const active = getActiveTicket();
      if (!active || active.id !== ticket.id) return;

      revokeObjectUrlIfNeeded(active.audioUrl);
      active.audioUrl = URL.createObjectURL(localAudio.blob);
      
      els.audioCard.classList.remove("hidden");
els.audioPlayer.src = active.audioUrl;
els.audioPlayer.load();
      
    } catch (error) {
      console.error("Falha ao hidratar áudio local:", error);
      els.audioCard.classList.add("hidden");
    }
  }

  function isUploadFriendlyAudio(file) {
    const type = String(file?.type || "").toLowerCase();
    return (
      type.includes("mpeg") ||
      type.includes("mp3") ||
      type.includes("ogg") ||
      type.includes("opus") ||
      type.includes("webm") ||
      type.includes("wav") ||
      type.includes("mp4") ||
      type.includes("m4a") ||
      type.includes("flac")
    );
  }

  async function uploadAudioToBlob(file) {
    if (!isUploadFriendlyAudio(file)) {
      throw new Error("Formato de áudio não suportado para upload.");
    }

    const { upload } = await loadBlobClient();
    const pathname = `audios/${Date.now()}-${sanitizeBlobFilename(file.name)}`;

    return upload(pathname, file, {
      access: "public",
      handleUploadUrl: `${apiBaseUrl}/blob-upload`,
      multipart: true,
    });
  }

  async function loadBlobClient() {
    if (!blobClientPromise) {
      blobClientPromise = import("https://esm.sh/@vercel/blob/client?target=es2022");
    }

    return blobClientPromise;
  }

  async function loadPlyrClient() {
    if (!plyrClientPromise) {
      plyrClientPromise = import("https://cdn.jsdelivr.net/npm/plyr@3.7.8/+esm").catch(() => null);
    }
    return plyrClientPromise;
  }

  async function ensurePlyrPlayer() {
    const module = await loadPlyrClient();
    if (!module || !els.audioPlayer) return null;

    if (els.audioPlayer.__plyrInstance) {
      return els.audioPlayer.__plyrInstance;
    }

    const Plyr = module.default || module.Plyr || module;
    const instance = new Plyr(els.audioPlayer, {
      controls: ["play", "progress", "current-time", "mute", "volume", "settings"],
      settings: ["speed"],
      speed: { selected: 1, options: [0.75, 1, 1.25, 1.5] },
      volume: 1,
      tooltips: { controls: false, seek: true },
      keyboard: { focused: true, global: false },
      seekTime: 10,
      hideControls: false,
      resetOnEnd: false
    });

    els.audioPlayer.__plyrInstance = instance;
    return instance;
  }

  function sanitizeBlobFilename(filename) {
    return String(filename || "audio.bin")
      .replace(/[^\w.\-]+/g, "_")
      .replace(/_+/g, "_");
  }

  async function pingBackendHealth() {
    try {
      await fetch(`${apiBaseUrl}/health`, {
        method: "GET",
        cache: "no-store",
      });
    } catch (error) {
      // noop
    }
  }

  function buildHtml(ticket) {
    const phone = ticket.phone || "telefone";
    const contact = ticket.customName ? `${ticket.customName} (${phone})` : `(${phone})`;

    return [
      '<span style="color:#f39c12"><strong>PROBLEMA / DUVIDA:</strong></span><br />',
      `<span>Em contato com usuario <b>${escapeHtml(contact)}</b>.</span><br />`,
      `<span>${escapeHtml(ticket.analysis || "Aguardando transcricao...")}</span><br /><br />`,
      '<span style="color:#4dabf7"><strong>ENCAMINHAMENTO / SOLUCAO:</strong></span><br />',
      `<span>${escapeHtml(ticket.solucao || "Aguardando transcricao...")}</span>`,
    ].join("");
  }

  function toggleDisabled(element, disabled) {
    if (!element) return;
    element.disabled = Boolean(disabled);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function notify(message, type) {
    if (typeof window.showToast === "function") {
      window.showToast(message, type);
      return;
    }

    console.log(`[${type || "info"}] ${message}`);
  }

  async function loadMotionClient() {
    if (!motionClientPromise) {
      motionClientPromise = import("https://cdn.jsdelivr.net/npm/motion@11.11.13/+esm").catch(() => null);
    }
    return motionClientPromise;
  }

  function primeMotionRuntime() {
    loadMotionClient();
    loadPlyrClient();
  }

  async function animateInterface() {
    const motion = await loadMotionClient();
    if (!motion) return;

    const { animate, stagger } = motion;

    const topbarTitle = els.activeTitle;
    const infoCards = Array.from(document.querySelectorAll("#pagina-ia .ia-info-card"));
    const panels = Array.from(document.querySelectorAll("#pagina-ia .ia-panel"));
    const buttons = Array.from(document.querySelectorAll("#pagina-ia .ia-actions-bar button"));

    if (topbarTitle) {
      animate(
        topbarTitle,
        { opacity: [0, 1], y: [10, 0], filter: ["blur(8px)", "blur(0px)"] },
        { duration: 0.35, easing: "ease-out" }
      );
    }

    if (infoCards.length) {
      animate(
        infoCards,
        { opacity: [0, 1], y: [16, 0] },
        { duration: 0.4, delay: stagger(0.05), easing: "ease-out" }
      );
    }

    if (buttons.length) {
      animate(
        buttons,
        { opacity: [0, 1], y: [10, 0], scale: [0.98, 1] },
        { duration: 0.32, delay: stagger(0.04), easing: "ease-out" }
      );
    }

    if (panels.length) {
      animate(
        panels,
        { opacity: [0, 1], y: [18, 0] },
        { duration: 0.42, delay: stagger(0.06), easing: "ease-out" }
      );
    }

    animateTicketList();
  }

  async function animateTicketList() {
    const motion = await loadMotionClient();
    if (!motion) return;

    const { animate, stagger } = motion;
    const items = Array.from(document.querySelectorAll("#pagina-ia .ia-ticket-item"));

    if (!items.length) return;

    animate(
      items,
      { opacity: [0, 1], x: [-10, 0] },
      { duration: 0.28, delay: stagger(0.03), easing: "ease-out" }
    );
  }

  async function animateReportPanel() {
    const motion = await loadMotionClient();
    if (!motion) return;

    const { animate } = motion;
    const panel = els.reportView?.closest(".ia-panel");

    if (!panel) return;

    animate(
      panel,
      { scale: [0.992, 1], opacity: [0.75, 1] },
      { duration: 0.28, easing: "ease-out" }
    );
  }

  async function animateImageStage() {
    const motion = await loadMotionClient();
    if (!motion) return;

    const { animate } = motion;
    const stage = els.imageStage?.classList.contains("hidden") ? els.imageEmpty : els.imageStage;

    if (!stage) return;

    animate(
      stage,
      { opacity: [0.55, 1], scale: [0.99, 1] },
      { duration: 0.28, easing: "ease-out" }
    );
  }

  async function animateAudioCard(isPlaying) {
    const motion = await loadMotionClient();
    if (!motion || !els.audioCard) return;

    const { animate } = motion;
    const bars = Array.from(els.audioCard.querySelectorAll(".ia-audio-bar"));
    const icon = els.audioCard.querySelector(".ia-audio-icon");

    animate(
      els.audioCard,
      {
        boxShadow: isPlaying
          ? [
              "0 12px 36px rgba(18,189,223,.08)",
              "0 18px 42px rgba(18,189,223,.18)",
              "0 12px 36px rgba(18,189,223,.10)"
            ]
          : [
              "0 18px 42px rgba(18,189,223,.12)",
              "0 12px 36px rgba(18,189,223,.08)"
            ]
      },
      { duration: 0.8, easing: "ease-in-out" }
    );

    if (icon) {
      animate(
        icon,
        isPlaying
          ? { scale: [1, 1.06, 1], rotate: [0, -2, 2, 0] }
          : { scale: [1.02, 1], rotate: [0, 0] },
        { duration: isPlaying ? 1.2 : 0.3, easing: "ease-in-out" }
      );
    }

    if (bars.length && isPlaying) {
      animate(
        bars,
        { scaleY: [0.55, 1.2, 0.7, 1] },
        { duration: 1.05, repeat: Infinity, delay: 0.08, easing: "ease-in-out" }
      );
    }
  }

  function toggleAudioPlayback() {
  if (!els.audioPlayer) return;

  if (els.audioPlayer.paused) {
    els.audioPlayer.play().catch(() => {
      notify("Falha ao reproduzir áudio.", "error");
    });
    return;
  }

  els.audioPlayer.pause();
}

function syncAudioUi() {
  if (!els.audioPlayer) return;

  const currentTime = Number(els.audioPlayer.currentTime || 0);
  const duration = Number(els.audioPlayer.duration || 0);
  const progress = duration ? (currentTime / duration) * 100 : 0;
  const muted = els.audioPlayer.muted || els.audioPlayer.volume === 0;

  if (els.audioCurrentTime) {
    els.audioCurrentTime.textContent = formatAudioTime(currentTime);
  }

  if (els.audioDuration) {
    els.audioDuration.textContent = formatAudioTime(duration);
  }

  if (els.audioProgressFill) {
    els.audioProgressFill.style.width = `${progress}%`;
  }

  if (els.audioVolume) {
    els.audioVolume.value = String(els.audioPlayer.volume ?? 1);
  }

  if (els.audioMuteBtn) {
    els.audioMuteBtn.textContent = muted ? "🔇" : "🔊";
  }

  if (els.audioPlayIconPlay && els.audioPlayIconPause) {
    if (els.audioPlayer.paused) {
      els.audioPlayIconPlay.classList.remove("hidden");
      els.audioPlayIconPause.classList.add("hidden");
    } else {
      els.audioPlayIconPlay.classList.add("hidden");
      els.audioPlayIconPause.classList.remove("hidden");
    }
  }
}

function formatAudioTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

  document.addEventListener("DOMContentLoaded", init);
})();
