(function () {
  const STORAGE_KEY = "protocord_ia_transcriber_v1";
  const MAX_UPLOAD_BYTES = 128 * 1024 * 1024;
  const AUDIO_DB_NAME = "protocord_ia_audio_v1";
  const AUDIO_STORE_NAME = "ticket_audio";
  const apiBaseUrl = window.getProtocordApiBaseUrl();
  let blobClientPromise = null;
  let audioDbPromise = null;

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
  }

  function injectBaseStyles() {
    if (document.getElementById("protocord-ia-enhanced-style")) return;

    const style = document.createElement("style");
    style.id = "protocord-ia-enhanced-style";
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

      #pagina-ia,
      #pagina-ia * {
        box-sizing: border-box;
      }

      #pagina-ia {
        font-family: 'Inter', sans-serif;
        background:
          radial-gradient(circle at top left, rgba(6,182,212,.07), transparent 28%),
          radial-gradient(circle at top right, rgba(139,92,246,.05), transparent 24%),
          #0a0f18;
        color: #e2e8f0;
        min-height: 100vh;
        width: 100%;
      }

      #pagina-ia button,
      #pagina-ia input,
      #pagina-ia textarea {
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
        border-right: 1px solid rgba(51,65,85,.8);
        background:
          linear-gradient(180deg, rgba(13,19,31,.98), rgba(10,15,24,.98));
        backdrop-filter: blur(10px);
      }

      #pagina-ia .ia-sidebar-header {
        padding: 24px 22px 18px;
        border-bottom: 1px solid rgba(30,41,59,.65);
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
        background: linear-gradient(135deg, #06b6d4, #22d3ee);
        color: #083344;
        font-size: 20px;
        font-weight: 900;
        box-shadow: 0 14px 28px rgba(6,182,212,.18);
        flex-shrink: 0;
      }

      #pagina-ia .ia-brand-copy h1 {
        margin: 0;
        font-size: 18px;
        line-height: 1.1;
        font-weight: 800;
        color: #f8fafc;
        letter-spacing: -.03em;
      }

      #pagina-ia .ia-brand-copy span {
        display: inline-block;
        margin-top: 4px;
        font-size: 10px;
        color: #64748b;
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
      #pagina-ia .ia-icon-btn {
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
        background: linear-gradient(135deg, #06b6d4, #22d3ee);
        color: #083344;
        font-size: 14px;
        font-weight: 800;
        box-shadow: 0 14px 30px rgba(6,182,212,.15);
      }

      #pagina-ia .btn-primary:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 18px 34px rgba(6,182,212,.22);
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
        padding: 12px 14px;
        border-radius: 14px;
        background: rgba(15,23,42,.7);
        border: 1px solid rgba(51,65,85,.95);
        color: #cbd5e1;
        font-size: 12px;
        font-weight: 700;
      }

      #pagina-ia .btn-secondary:hover:not(:disabled) {
        background: rgba(30,41,59,.92);
        border-color: rgba(71,85,105,1);
        transform: translateY(-1px);
      }

      #pagina-ia .btn-secondary:disabled {
        opacity: .5;
        cursor: not-allowed;
        transform: none;
      }

      #pagina-ia .ia-search-wrap {
        position: relative;
      }

      #pagina-ia .ia-search-wrap i {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        color: #64748b;
        width: 16px;
        height: 16px;
      }

      #pagina-ia #ia-search-input,
      #pagina-ia .ia-ticket-input,
      #pagina-ia #ia-report-editor {
        width: 100%;
        border-radius: 14px;
        border: 1px solid rgba(51,65,85,.92);
        background: rgba(15,23,42,.84);
        color: #f1f5f9;
        outline: none;
        transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
      }

      #pagina-ia #ia-search-input {
        padding: 12px 14px 12px 42px;
        font-size: 13px;
      }

      #pagina-ia #ia-search-input:focus,
      #pagina-ia .ia-ticket-input:focus,
      #pagina-ia #ia-report-editor:focus {
        border-color: rgba(6,182,212,.9);
        box-shadow: 0 0 0 4px rgba(6,182,212,.10);
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
        padding: 12px 16px 16px;
        border-top: 1px solid rgba(30,41,59,.65);
      }

      #pagina-ia .ia-sidebar-footer-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        color: #64748b;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .12em;
        text-transform: uppercase;
      }

      #pagina-ia .ia-main {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        background:
          linear-gradient(180deg, rgba(10,15,24,.96), rgba(10,15,24,1));
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
        background: rgba(15,23,42,.55);
        border: 1px solid rgba(30,41,59,.95);
        text-align: center;
        box-shadow: 0 24px 60px rgba(0,0,0,.24);
      }

      #pagina-ia .ia-empty-card-icon {
        width: 88px;
        height: 88px;
        margin: 0 auto 20px;
        border-radius: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(15,23,42,.95);
        color: #475569;
        border: 1px solid rgba(30,41,59,.95);
      }

      #pagina-ia .ia-empty-card h3 {
        margin: 0 0 10px;
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -.03em;
        color: #f8fafc;
      }

      #pagina-ia .ia-empty-card p {
        margin: 0;
        color: #94a3b8;
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
      }

      #pagina-ia .ia-topbar {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 24px;
        padding: 30px 32px 20px;
        border-bottom: 1px solid rgba(30,41,59,.55);
        background: linear-gradient(180deg, rgba(10,15,24,.95), rgba(10,15,24,.82));
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
        padding: 4px 10px;
        border-radius: 999px;
        background: rgba(6,182,212,.12);
        color: #22d3ee;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .12em;
        text-transform: uppercase;
      }

      #pagina-ia #ia-active-date {
        color: #64748b;
        font-size: 12px;
        font-weight: 600;
      }

      #pagina-ia #ia-active-title {
        margin: 0;
        font-size: clamp(28px, 2.8vw, 38px);
        line-height: 1.05;
        letter-spacing: -.045em;
        color: #ffffff;
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
        padding: 26px 32px 32px;
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
        background: rgba(15,23,42,.48);
        border: 1px solid rgba(30,41,59,.92);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.015);
      }

      #pagina-ia .ia-info-card-label {
        margin: 0 0 10px;
        color: #64748b;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: .16em;
      }

      #pagina-ia .ia-info-card-value {
        margin: 0;
        color: #e2e8f0;
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
        grid-template-columns: minmax(360px, 1.02fr) minmax(380px, .98fr);
        gap: 24px;
        align-items: start;
      }

      #pagina-ia .ia-panel {
        display: flex;
        flex-direction: column;
        border-radius: 30px;
        background: rgba(15,23,42,.44);
        border: 1px solid rgba(30,41,59,.92);
        overflow: hidden;
        box-shadow:
          0 16px 46px rgba(0,0,0,.16),
          inset 0 1px 0 rgba(255,255,255,.015);
      }

      #pagina-ia .ia-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 18px 22px;
        border-bottom: 1px solid rgba(30,41,59,.7);
        background: rgba(15,23,42,.58);
      }

      #pagina-ia .ia-panel-title {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }

      #pagina-ia .ia-panel-title h3 {
        margin: 0;
        color: #f1f5f9;
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
        color: #64748b;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .12em;
        text-transform: uppercase;
      }

      #pagina-ia .ia-panel-body {
        padding: 22px;
      }

      #pagina-ia #ia-report-view {
        min-height: 300px;
        white-space: pre-wrap;
        color: #cbd5e1;
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
        color: #22d3ee;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .12em;
        text-transform: uppercase;
        cursor: pointer;
        padding: 0;
      }

      #pagina-ia .ia-text-action:hover {
        color: #67e8f9;
      }

      #pagina-ia .ia-text-danger {
        color: #f87171;
      }

      #pagina-ia .ia-audio-section {
        margin-top: 18px;
      }

      #pagina-ia #ia-audio-card {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 16px;
        border-radius: 22px;
        background:
          linear-gradient(135deg, rgba(6,182,212,.11), rgba(34,211,238,.03)),
          rgba(15,23,42,.55);
        border: 1px solid rgba(6,182,212,.18);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.02);
      }

      #pagina-ia .ia-audio-top {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      #pagina-ia .ia-audio-icon {
        width: 46px;
        height: 46px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(6,182,212,.16);
        color: #67e8f9;
        border: 1px solid rgba(6,182,212,.14);
        flex-shrink: 0;
      }

      #pagina-ia .ia-audio-copy {
        min-width: 0;
      }

      #pagina-ia .ia-audio-copy strong {
        display: block;
        color: #ecfeff;
        font-size: 13px;
        font-weight: 800;
        margin-bottom: 3px;
      }

      #pagina-ia .ia-audio-copy span {
        display: block;
        color: #94a3b8;
        font-size: 12px;
        line-height: 1.45;
      }

      #pagina-ia #ia-audio-player {
        width: 100%;
        min-height: 44px;
        filter: saturate(1.05);
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
        padding: 20px;
      }

      #pagina-ia #ia-image-empty {
        width: 100%;
        min-height: 460px;
        border-radius: 26px;
        border: 1px dashed rgba(71,85,105,.9);
        background:
          radial-gradient(circle at top, rgba(148,163,184,.05), transparent 40%),
          rgba(2,6,23,.18);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 18px;
        text-align: center;
        padding: 28px;
      }

      #pagina-ia .ia-image-empty-icon {
        width: 72px;
        height: 72px;
        border-radius: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #64748b;
        background: rgba(15,23,42,.76);
        border: 1px solid rgba(51,65,85,.95);
      }

      #pagina-ia .ia-image-empty-title {
        margin: 0;
        color: #e2e8f0;
        font-size: 16px;
        font-weight: 800;
      }

      #pagina-ia .ia-image-empty-text {
        margin: 0;
        max-width: 300px;
        color: #94a3b8;
        font-size: 13px;
        line-height: 1.6;
      }

      #pagina-ia .ia-image-empty-text kbd {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 28px;
        padding: 4px 8px;
        border-radius: 8px;
        background: rgba(15,23,42,.95);
        border: 1px solid rgba(51,65,85,.95);
        color: #cbd5e1;
        font-size: 11px;
        font-weight: 700;
      }

      #pagina-ia #ia-image-stage {
        display: flex;
        flex-direction: column;
        gap: 16px;
        height: 100%;
      }

      #pagina-ia .ia-image-preview-shell {
        position: relative;
        width: 100%;
        min-height: 460px;
        border-radius: 24px;
        overflow: hidden;
        background:
          linear-gradient(180deg, rgba(2,6,23,.78), rgba(15,23,42,.88));
        border: 1px solid rgba(30,41,59,.95);
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
        width: 46px;
        height: 46px;
        border-radius: 999px;
        background: rgba(2,6,23,.55);
        border: 1px solid rgba(148,163,184,.12);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #f8fafc;
        backdrop-filter: blur(10px);
        cursor: pointer;
        transition: all .18s ease;
      }

      #pagina-ia .ia-image-nav-btn:hover:not(:disabled) {
        background: rgba(6,182,212,.88);
        color: #062f3b;
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
        color: #94a3b8;
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
        background: rgba(15,23,42,.7);
        border: 1px solid rgba(51,65,85,.95);
        color: #94a3b8;
      }

      #pagina-ia .ia-icon-btn:hover:not(:disabled) {
        color: #e2e8f0;
        background: rgba(30,41,59,.95);
        transform: translateY(-1px);
      }

      #pagina-ia .ia-icon-danger:hover:not(:disabled) {
        color: #f87171;
        border-color: rgba(127,29,29,.45);
        background: rgba(69,10,10,.34);
      }

      #pagina-ia .ia-ticket-item {
        border: 1px solid transparent;
        border-radius: 18px;
        padding: 14px;
        cursor: pointer;
        transition: all .18s ease;
        background: rgba(15,23,42,.36);
        margin-bottom: 10px;
      }

      #pagina-ia .ia-ticket-item:hover {
        background: rgba(15,23,42,.72);
        border-color: rgba(51,65,85,.7);
        transform: translateY(-1px);
      }

      #pagina-ia .ia-ticket-item.active {
        background:
          linear-gradient(180deg, rgba(6,182,212,.10), rgba(15,23,42,.84));
        border-color: rgba(6,182,212,.28);
        box-shadow: 0 10px 24px rgba(6,182,212,.08);
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
        color: #e2e8f0;
        font-size: 14px;
        font-weight: 800;
      }

      #pagina-ia .ia-ticket-meta {
        color: #64748b;
        font-size: 11px;
        font-weight: 600;
        line-height: 1.4;
      }

      #pagina-ia .ia-ticket-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      #pagina-ia .ia-image-empty-list {
        color: #64748b;
        font-size: 12px;
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
        background: linear-gradient(90deg, transparent, #06b6d4, transparent);
        animation: ia-loading-bar 1.4s linear infinite;
        z-index: 4;
      }

      @keyframes ia-loading-bar {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }

      #pagina-ia [aria-busy="true"] .ia-topbar {
        opacity: .92;
      }

      #pagina-ia ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      #pagina-ia ::-webkit-scrollbar-track {
        background: transparent;
      }

      #pagina-ia ::-webkit-scrollbar-thumb {
        background: rgba(51,65,85,.95);
        border-radius: 999px;
      }

      #pagina-ia ::-webkit-scrollbar-thumb:hover {
        background: rgba(71,85,105,1);
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
          border-bottom: 1px solid rgba(51,65,85,.8);
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
                              <div class="ia-audio-top">
                                <div class="ia-audio-icon">
                                  <i data-lucide="volume-2" class="w-5 h-5"></i>
                                </div>
                                <div class="ia-audio-copy">
                                  <strong>Áudio da Transcrição</strong>
                                  <span>Ouça o arquivo enviado diretamente na interface.</span>
                                </div>
                              </div>
                              <audio id="ia-audio-player" controls preload="metadata"></audio>
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
    });

    els.nextImageBtn?.addEventListener("click", () => {
      const active = getActiveTicket();
      if (!active?.images?.length) return;
      state.imageIndex = Math.min(state.imageIndex + 1, active.images.length - 1);
      renderImageViewer(active);
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
    });

    els.cancelReportBtn?.addEventListener("click", () => {
      state.editingReport = false;
      state.reportDraft = "";
      renderReport(getActiveTicket());
    });

    els.reportEditor?.addEventListener("input", (event) => {
      state.reportDraft = event.target.value || "";
    });

    els.ticketList?.addEventListener("click", handleTicketListClick);
    els.ticketList?.addEventListener("keydown", handleTicketListKeydown);
    els.ticketList?.addEventListener("focusout", handleTicketListFocusOut);

    window.addEventListener("paste", handlePasteImages);
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
      els.audioPlayer.removeAttribute("src");
      return;
    }

    if (active.audioUrl) {
      els.audioCard.classList.remove("hidden");
      if (els.audioPlayer.src !== active.audioUrl) {
        els.audioPlayer.src = active.audioUrl;
      }
      return;
    }

    els.audioCard.classList.remove("hidden");
    els.audioPlayer.removeAttribute("src");
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

  document.addEventListener("DOMContentLoaded", init);
})();
