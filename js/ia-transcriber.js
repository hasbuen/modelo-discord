<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ProtoCord IA - Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        
        body {
            font-family: 'Inter', sans-serif;
            background-color: #0a0f18;
            color: #e2e8f0;
            overflow: hidden;
        }

        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #334155; }

        /* Estados de Animação e Interação */
        .ia-ticket-item {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            border: 1px solid transparent;
        }
        .ia-ticket-item.active {
            background-color: rgba(6, 182, 212, 0.1);
            border-color: rgba(6, 182, 212, 0.3);
        }
        .ia-ticket-item:hover:not(.active) {
            background-color: rgba(30, 41, 59, 0.5);
        }

        /* Botões Estilizados */
        .btn-primary {
            background-color: #06b6d4;
            color: #083344;
            transition: all 0.2s;
        }
        .btn-primary:hover { background-color: #22d3ee; transform: translateY(-1px); }
        .btn-primary:active { transform: translateY(0); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .btn-secondary {
            background-color: rgba(30, 41, 59, 0.7);
            border: 1px solid #334155;
            transition: all 0.2s;
        }
        .btn-secondary:hover:not(:disabled) { background-color: #334155; border-color: #475569; }

        /* Input Custom */
        .ia-ticket-input {
            background: #0f172a;
            border: 1px solid #334155;
            color: #f1f5f9;
            padding: 8px 12px;
            border-radius: 8px;
            width: 100%;
            outline: none;
        }
        .ia-ticket-input:focus { border-color: #06b6d4; box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.2); }

        /* Loader */
        .is-uploading { pointer-events: none; opacity: 0.7; position: relative; }
        .is-uploading::after {
            content: "";
            position: absolute;
            top: 0; left: 0; width: 100%; height: 2px;
            background: linear-gradient(90deg, transparent, #06b6d4, transparent);
            animation: loading-bar 1.5s infinite;
        }
        @keyframes loading-bar {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }

        .hidden { display: none !important; }
    </style>
</head>
<body id="pagina-ia">
    <div class="flex h-screen w-full">
        
        <!-- Sidebar: Lista de Tickets -->
        <aside class="w-80 flex flex-col border-r border-slate-800 bg-[#0d131f]">
            <div class="p-6">
                <div class="flex items-center gap-3 mb-8">
                    <div class="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center text-cyan-950 font-black text-xl shadow-lg shadow-cyan-500/20">P</div>
                    <div>
                        <h1 class="text-lg font-bold tracking-tight leading-none">ProtoCord IA</h1>
                        <span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Workspace</span>
                    </div>
                </div>

                <button id="ia-new-ticket-btn" class="btn-primary w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10 mb-6">
                    <i data-lucide="plus" class="w-5 h-5"></i> Novo Ticket
                </button>

                <div class="relative">
                    <i data-lucide="search" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4"></i>
                    <input id="ia-search-input" type="text" placeholder="Buscar ticket..." 
                        class="w-full bg-slate-900/50 border border-slate-800 text-sm py-2.5 pl-10 pr-4 rounded-xl focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all">
                </div>
            </div>

            <!-- Lista Scrollável -->
            <div id="ia-ticket-list" class="flex-1 overflow-y-auto px-3 pb-6 space-y-2 custom-scrollbar">
                <!-- Injetado via JS -->
            </div>

            <div class="p-4 border-t border-slate-800/50">
                <div class="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>v2.5.0-PRO</span>
                    <span id="current-time-display">07/04/2026</span>
                </div>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 flex flex-col bg-[#0a0f18] overflow-hidden">
            
            <!-- Workspace Area -->
            <div id="ia-content" class="flex-1 flex flex-col overflow-hidden hidden">
                
                <!-- Header -->
                <header class="p-8 pb-4 flex items-start justify-between">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="px-2 py-0.5 bg-cyan-500/10 text-cyan-500 text-[10px] font-bold rounded uppercase tracking-tighter">Ativo</span>
                            <span id="ia-active-date" class="text-xs text-slate-500 font-medium">--</span>
                        </div>
                        <h2 id="ia-active-title" class="text-3xl font-black tracking-tight text-white">Carregando...</h2>
                    </div>

                    <div class="flex gap-2">
                        <button id="ia-toggle-registered-btn" class="btn-secondary px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 text-slate-300">
                            <i data-lucide="ticket" class="w-4 h-4"></i>
                            <span>Marcar Registro</span>
                        </button>
                    </div>
                </header>

                <div class="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar ia-workspace">
                    
                    <!-- GRID DE STATUS -->
                    <div class="grid grid-cols-3 gap-4 mb-8">
                        <div class="p-5 rounded-2xl bg-slate-900/40 border border-slate-800">
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Entrada</p>
                            <p class="font-semibold text-slate-200">Transcrição IA</p>
                        </div>
                        <div class="p-5 rounded-2xl bg-slate-900/40 border border-slate-800">
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Mídia</p>
                            <p class="font-semibold text-slate-200">Snapshot + Áudio</p>
                        </div>
                        <div class="p-5 rounded-2xl bg-slate-900/40 border border-slate-800">
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Saída</p>
                            <p class="font-semibold text-slate-200">Relatório Estruturado</p>
                        </div>
                    </div>

                    <!-- ACTIONS BAR -->
                    <div class="flex flex-wrap gap-3 mb-8">
                        <button id="ia-upload-audio-btn" class="btn-primary px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                            <i data-lucide="mic" class="w-4 h-4"></i>
                            <span>Transcrição</span>
                        </button>
                        <button id="ia-copy-znuny-btn" class="btn-secondary px-5 py-3 rounded-xl font-bold flex items-center gap-2 text-amber-400 border-amber-400/20">
                            <i data-lucide="arrow-right-left" class="w-4 h-4"></i> Transportar
                        </button>
                        <button id="ia-copy-html-btn" class="btn-secondary px-5 py-3 rounded-xl font-bold flex items-center gap-2 text-slate-300">
                            <i data-lucide="copy" class="w-4 h-4"></i> Copiar HTML
                        </button>
                        <input type="file" id="ia-audio-input" accept="audio/*" class="hidden">
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        <!-- Coluna Esquerda: Relatório -->
                        <div class="space-y-6">
                            <div class="bg-slate-900/30 border border-slate-800 rounded-3xl overflow-hidden flex flex-col">
                                <div class="px-6 py-4 border-b border-slate-800/50 flex items-center justify-between bg-slate-900/50">
                                    <div class="flex items-center gap-2">
                                        <i data-lucide="file-text" class="w-4 h-4 text-cyan-500"></i>
                                        <h3 class="font-bold text-sm uppercase tracking-wider">Relatório Analítico</h3>
                                    </div>
                                    <div class="flex gap-2">
                                        <button id="ia-cancel-report-btn" class="hidden text-[10px] font-bold text-red-400 hover:text-red-300 uppercase">Cancelar</button>
                                        <button id="ia-edit-report-btn" class="text-[10px] font-bold text-cyan-500 hover:text-cyan-400 uppercase flex items-center gap-1">
                                            <i data-lucide="edit-3" class="w-3 h-3"></i> <span>Editar</span>
                                        </button>
                                    </div>
                                </div>
                                <div class="p-6">
                                    <div id="ia-report-view" class="text-sm leading-relaxed text-slate-300 whitespace-pre-wrap font-medium min-h-[200px]"></div>
                                    <textarea id="ia-report-editor" class="hidden w-full h-[300px] bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:ring-1 focus:ring-cyan-500/50 outline-none font-mono"></textarea>
                                </div>
                            </div>

                            <!-- Player de Áudio -->
                            <div id="ia-audio-card" class="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-4 hidden">
                                <div class="flex items-center gap-4">
                                    <div class="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center text-cyan-950 animate-pulse">
                                        <i data-lucide="play" class="w-5 h-5 fill-current"></i>
                                    </div>
                                    <audio id="ia-audio-player" controls class="flex-1 h-8"></audio>
                                </div>
                            </div>
                        </div>

                        <!-- Coluna Direita: Evidências -->
                        <div class="space-y-6">
                            <div class="bg-slate-900/30 border border-slate-800 rounded-3xl overflow-hidden flex flex-col h-full">
                                <div class="px-6 py-4 border-b border-slate-800/50 flex items-center justify-between bg-slate-900/50">
                                    <div class="flex items-center gap-2">
                                        <i data-lucide="image" class="w-4 h-4 text-purple-500"></i>
                                        <h3 class="font-bold text-sm uppercase tracking-wider">Evidências Visual</h3>
                                    </div>
                                    <span id="ia-image-counter" class="text-[10px] font-mono text-slate-500">0 / 0</span>
                                </div>

                                <div class="flex-1 min-h-[400px] relative flex flex-col items-center justify-center p-6 group">
                                    <!-- Estado Vazio -->
                                    <div id="ia-image-empty" class="flex flex-col items-center justify-center text-center space-y-4">
                                        <div class="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center text-slate-600 border border-slate-700 border-dashed">
                                            <i data-lucide="plus" class="w-8 h-8"></i>
                                        </div>
                                        <p class="text-sm text-slate-500 max-w-[200px]">Pressione <kbd class="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">Ctrl+V</kbd> para colar evidências aqui.</p>
                                    </div>

                                    <!-- Visualizador -->
                                    <div id="ia-image-stage" class="hidden w-full h-full flex flex-col items-center justify-center space-y-4">
                                        <div class="relative w-full aspect-video rounded-xl overflow-hidden bg-black/40 border border-slate-800">
                                            <img id="ia-active-image" src="" class="w-full h-full object-contain">
                                            
                                            <!-- Controles Flutuantes -->
                                            <div class="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button id="ia-prev-image-btn" class="w-10 h-10 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-cyan-500">
                                                    <i data-lucide="chevron-left" class="w-6 h-6"></i>
                                                </button>
                                                <button id="ia-next-image-btn" class="w-10 h-10 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-cyan-500">
                                                    <i data-lucide="chevron-right" class="w-6 h-6"></i>
                                                </button>
                                            </div>
                                        </div>

                                        <div class="flex gap-2">
                                            <button id="ia-copy-image-btn" class="btn-secondary p-2.5 rounded-lg text-slate-400 hover:text-cyan-400" title="Copiar Imagem">
                                                <i data-lucide="copy" class="w-4 h-4"></i>
                                            </button>
                                            <button id="ia-delete-image-btn" class="btn-secondary p-2.5 rounded-lg text-slate-400 hover:text-red-400 border-red-900/20" title="Excluir Imagem">
                                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty State Principal -->
            <div id="ia-empty-state" class="flex-1 flex flex-col items-center justify-center text-center p-12">
                <div class="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center text-slate-700 mb-6 border border-slate-800">
                    <i data-lucide="bot" class="w-12 h-12"></i>
                </div>
                <h3 class="text-2xl font-bold text-white mb-2">Central de Inteligência ProtoCord</h3>
                <p class="text-slate-500 max-w-sm">Selecione um ticket ao lado ou crie um novo para iniciar o processo de transcrição e análise automática.</p>
            </div>

        </main>
    </div>

    <!-- O SEU JAVASCRIPT ORIGINAL (SEM ALTERAÇÕES DE LÓGICA) -->
    <script>
    (function () {
      const STORAGE_KEY = "protocord_ia_transcriber_v1";
      const MAX_UPLOAD_BYTES = 128 * 1024 * 1024;
      const AUDIO_DB_NAME = "protocord_ia_audio_v1";
      const AUDIO_STORE_NAME = "ticket_audio";
      const apiBaseUrl = typeof window.getProtocordApiBaseUrl === 'function' ? window.getProtocordApiBaseUrl() : "";
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
          els.ticketList.innerHTML = '<div class="text-center py-10 text-slate-600 text-xs font-medium">Nenhum ticket encontrado.</div>';
          return;
        }

        els.ticketList.innerHTML = filtered
          .map((ticket) => {
            const title = escapeHtml(ticket.customName || ticket.phone || "Sem nome");
            const activeClass = ticket.id === state.activeId ? "active" : "";
            
            // Layout de item da lista melhorado
            const statusIcon = ticket.isRegistered
              ? '<i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400"></i>'
              : '<i data-lucide="ticket" class="w-4 h-4 text-cyan-400"></i>';

            return `
            <article class="ia-ticket-item p-4 rounded-xl cursor-pointer ${activeClass}" data-ticket-id="${ticket.id}">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    ${statusIcon}
                    <span class="font-bold text-sm text-slate-200 truncate">${title}</span>
                  </div>
                  <div class="text-[10px] text-slate-500 font-medium">${escapeHtml(ticket.createdAt || "")}</div>
                </div>

                <div class="flex items-center gap-1">
                  <button class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-500 hover:text-cyan-400 transition-colors" type="button" data-action="rename" data-ticket-id="${ticket.id}" title="Renomear">
                    <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                  </button>
                  <button class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-950/30 text-slate-500 hover:text-red-400 transition-colors" type="button" data-action="delete" data-ticket-id="${ticket.id}" title="Excluir">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>
              ${
                state.editingTicketId === ticket.id
                  ? `
                <div class="mt-3">
                  <input class="ia-ticket-input text-xs" data-ticket-edit-input="${ticket.id}" value="${escapeAttribute(
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
    </script>
</body>
</html>
