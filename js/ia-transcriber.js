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

  // --- CSS DINÂMICO PARA MANTER O VISUAL ---
  function injectStyles() {
    if (document.getElementById('ia-transcriber-styles')) return;
    const style = document.createElement('style');
    style.id = 'ia-transcriber-styles';
    style.textContent = `
      #pagina-ia {
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        color: #e2e8f0;
        background: #0f172a;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }
      .ia-sidebar {
        background: #1e293b;
        border-right: 1px solid #334155;
        width: 320px;
        display: flex;
        flex-direction: column;
      }
      .ia-ticket-item {
        padding: 1rem;
        margin: 0.5rem;
        border-radius: 0.75rem;
        transition: all 0.2s;
        cursor: pointer;
        border: 1px solid transparent;
        background: #33415540;
      }
      .ia-ticket-item:hover {
        background: #33415580;
      }
      .ia-ticket-item.active {
        background: #3b82f620;
        border-color: #3b82f6;
      }
      .ia-workspace {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: #0f172a;
        overflow-y: auto;
      }
      .ia-card {
        background: #1e293b;
        border-radius: 1rem;
        border: 1px solid #334155;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      .ia-icon-btn {
        padding: 0.5rem;
        border-radius: 0.5rem;
        color: #94a3b8;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .ia-icon-btn:hover {
        background: #334155;
        color: #f1f5f9;
      }
      .ia-btn-primary {
        background: #3b82f6;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: filter 0.2s;
      }
      .ia-btn-primary:hover {
        filter: brightness(1.1);
      }
      .ia-btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .ia-report-editor {
        width: 100%;
        min-height: 200px;
        background: #0f172a;
        color: #f1f5f9;
        border: 1px solid #334155;
        border-radius: 0.5rem;
        padding: 1rem;
        font-family: inherit;
        resize: vertical;
      }
      .hidden { display: none !important; }
      .is-uploading { opacity: 0.7; pointer-events: none; }
      
      /* Viewer de Imagens */
      .ia-image-stage {
        background: #000;
        border-radius: 0.75rem;
        position: relative;
        overflow: hidden;
        aspect-ratio: 16/9;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .ia-active-image {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
    `;
    document.head.appendChild(style);
  }

  function init() {
    injectStyles();
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
      if (window.lucide) lucide.createIcons();
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
        assunto: active.resumo || "Solicitação de Suporte",
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

  // --- PERSISTÊNCIA E ESTADO ---
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

  // --- RENDERIZAÇÃO ---
  function render() {
    renderTicketList();
    renderActiveTicket();
    if (window.lucide) lucide.createIcons();
  }

  function renderTicketList() {
    if (!els.ticketList) return;

    const term = state.searchTerm.trim().toLowerCase();
    const filtered = state.tickets.filter((ticket) => {
      const composite = `${ticket.phone || ""} ${ticket.customName || ""}`.toLowerCase();
      return !term || composite.includes(term);
    });

    if (!filtered.length) {
      els.ticketList.innerHTML = '<div class="ia-image-empty p-4 text-center text-slate-500">Nenhum ticket encontrado.</div>';
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
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 font-medium truncate">
                ${statusIcon}
                <span class="truncate">${title}</span>
              </div>
              <div class="text-xs text-slate-500 mt-1">${escapeHtml(ticket.createdAt || "")}</div>
            </div>
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button class="ia-icon-btn" type="button" data-action="rename" data-ticket-id="${ticket.id}">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
              </button>
              <button class="ia-icon-btn hover:text-red-400" type="button" data-action="delete" data-ticket-id="${ticket.id}">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
          ${
            state.editingTicketId === ticket.id
              ? `
            <div class="mt-2">
              <input class="w-full bg-slate-900 border border-blue-500 rounded px-2 py-1 text-sm outline-none" 
                     data-ticket-edit-input="${ticket.id}" 
                     value="${escapeAttribute(ticket.customName || ticket.phone || "")}" />
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

  function beginTicketRename(ticketId) {
    if (!ticketId) return;
    if (state.editingTicketId === ticketId) {
      commitTicketName(ticketId);
      return;
    }
    state.editingTicketId = ticketId;
    renderTicketList();
    if (window.lucide) lucide.createIcons();
    const input = els.ticketList?.querySelector(`[data-ticket-edit-input="${ticketId}"]`);
    input?.focus();
    input?.select();
  }

  async function deleteTicket(ticketId) {
    const ticket = state.tickets.find((entry) => entry.id === ticketId);
    if (!ticket) return;

    try {
      await deleteLocalAudio(ticket.localAudioKey || ticket.id);
    } catch (error) { console.warn(error); }

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
      if (actionButton.dataset.action === "rename") beginTicketRename(ticketId);
      if (actionButton.dataset.action === "delete") deleteTicket(ticketId);
      return;
    }

    const input = event.target.closest("[data-ticket-edit-input]");
    if (input) { event.stopPropagation(); return; }

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
    
    if (els.toggleRegisteredBtn) {
       els.toggleRegisteredBtn.querySelector("span").textContent = active.isRegistered ? "Registrado" : "Marcar Registro";
    }
    
    if (els.uploadAudioBtn) {
       els.uploadAudioBtn.querySelector("span").textContent = state.uploading ? "Processando..." : "Transcrição";
    }

    renderImageViewer(active);
    renderReport(active);
    renderAudio(active);
  }

  function renderImageViewer(active) {
    const images = Array.isArray(active?.images) ? active.images : [];
    if (!images.length) {
      els.imageEmpty.classList.remove("hidden");
      els.imageStage.classList.add("hidden");
      if (els.imageCounter) els.imageCounter.textContent = "0 / 0";
      toggleDisabled(els.prevImageBtn, true);
      toggleDisabled(els.nextImageBtn, true);
      return;
    }

    state.imageIndex = Math.max(0, Math.min(state.imageIndex, images.length - 1));

    els.imageEmpty.classList.add("hidden");
    els.imageStage.classList.remove("hidden");
    els.activeImage.src = images[state.imageIndex];
    if (els.imageCounter) els.imageCounter.textContent = `${state.imageIndex + 1} / ${images.length}`;
    
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

  // --- LOGICA DE TRANSCRIÇÃO ---
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
      
      notify("Iniciando processamento...", "info");
      const blobUpload = await uploadAudioToBlob(fileForUpload);
      
      notify("Transcrevendo...", "info");
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
      active.localAudioKey = localAudioKey;
      active.audioUrl = URL.createObjectURL(fileForUpload);
      
      state.editingReport = false;
      persist();
      render();
      notify("Transcrição concluída.", "success");
    } catch (error) {
      console.error(error);
      notify(error.message || "Falha ao transcrever.", "error");
    } finally {
      state.uploading = false;
      renderActiveTicket();
    }
  }

  async function prepareAudioForTranscription(file) {
    if (!file) throw new Error("Nenhum arquivo informado.");
    if (!isUploadFriendlyAudio(file)) throw new Error("Formato não suportado.");
    if (file.size > MAX_UPLOAD_BYTES) throw new Error(`Arquivo muito grande.`);
    return file;
  }

  async function requestBlobTranscription(blobUpload, file) {
    const response = await fetch(`${apiBaseUrl}/transcrever`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blobUrl: blobUpload.url,
        pathname: blobUpload.pathname || "",
        filename: file.name,
        contentType: file.type || "audio/mpeg",
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.sucesso) {
      throw new Error(data?.erro || `Erro no servidor (${response.status})`);
    }
    return data;
  }

  // --- HELPERS DE TEXTO / HTML ---
  function buildSingleReportText(ticket) {
    return [
      "PROBLEMA / DÚVIDA:",
      ticket?.analysis || "",
      "",
      "ENCAMINHAMENTO / SOLUÇÃO:",
      ticket?.solucao || "",
    ].join("\n").trim();
  }

  function parseSingleReportText(text) {
    const normalized = String(text || "").replace(/\r\n/g, "\n");
    const problemMatch = normalized.match(/PROBLEMA\s*\/\s*DÚVIDA\s*:\s*([\s\S]*?)(?:\n{2,}ENCAMINHAMENTO\s*\/\s*SOLUÇÃO\s*:|$)/i);
    const solutionMatch = normalized.match(/ENCAMINHAMENTO\s*\/\s*SOLUÇÃO\s*:\s*([\s\S]*)/i);

    return {
      analysis: problemMatch ? problemMatch[1].trim() : normalized.split('\n\n')[0].trim(),
      solucao: solutionMatch ? solutionMatch[1].trim() : (normalized.split('\n\n')[1] || "").trim(),
    };
  }

  function applyReportDraft() {
    const active = getActiveTicket();
    if (!active) return;
    const parsed = parseSingleReportText(state.reportDraft);
    active.analysis = parsed.analysis;
    active.solucao = parsed.solucao;
    state.editingReport = false;
    persist();
    notify("Relatório atualizado.", "success");
  }

  function getActiveTicketWithDraft(persistDraft) {
    const active = getActiveTicket();
    if (!active || !state.editingReport) return active;

    const parsed = parseSingleReportText(state.reportDraft);
    if (persistDraft) {
      active.analysis = parsed.analysis;
      active.solucao = parsed.solucao;
      state.editingReport = false;
      persist();
      renderReport(active);
      return active;
    }
    return { ...active, ...parsed };
  }

  function buildHtml(ticket) {
    const phone = ticket.phone || "telefone";
    const contact = ticket.customName ? `${ticket.customName} (${phone})` : `(${phone})`;
    return [
      '<div style="font-family:sans-serif; line-height:1.5;">',
      '<p><strong style="color:#f39c12">PROBLEMA / DÚVIDA:</strong><br>',
      `Em contato com usuário <b>${escapeHtml(contact)}</b>.<br>`,
      `${escapeHtml(ticket.analysis || "...")}</p>`,
      '<p><strong style="color:#4dabf7">ENCAMINHAMENTO / SOLUÇÃO:</strong><br>',
      `${escapeHtml(ticket.solucao || "...")}</p>`,
      '</div>'
    ].join("");
  }

  // --- IMAGENS ---
  async function handlePasteImages(event) {
    const active = getActiveTicket();
    if (!active) return;
    const items = Array.from(event.clipboardData?.items || []);
    const imageFiles = items.filter(i => i.type.startsWith("image/")).map(i => i.getAsFile()).filter(Boolean);
    if (!imageFiles.length) return;

    const images = await Promise.all(imageFiles.map(readFileAsDataUrl));
    active.images = [...(active.images || []), ...images];
    state.imageIndex = active.images.length - images.length;
    persist();
    renderImageViewer(active);
    notify(`${images.length} imagem(ns) colada(s).`, "success");
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
      const blob = await fetch(image).then(r => r.blob());
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      notify("Imagem copiada.", "success");
    } catch (e) { notify("Erro ao copiar imagem.", "error"); }
  }

  function deleteCurrentImage() {
    const active = getActiveTicket();
    if (!active?.images?.length) return;
    active.images.splice(state.imageIndex, 1);
    state.imageIndex = Math.max(0, state.imageIndex - 1);
    persist();
    renderImageViewer(active);
  }

  // --- INDEXEDDB (AUDIOS) ---
  function openAudioDatabase() {
    if (!audioDbPromise) {
      audioDbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(AUDIO_DB_NAME, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) db.createObjectStore(AUDIO_STORE_NAME, { keyPath: "id" });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return audioDbPromise;
  }

  async function saveLocalAudio(ticketId, file) {
    const db = await openAudioDatabase();
    const id = String(ticketId);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(AUDIO_STORE_NAME, "readwrite");
      tx.objectStore(AUDIO_STORE_NAME).put({ id, blob: file, updatedAt: Date.now() });
      tx.oncomplete = () => resolve(id);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function readLocalAudio(audioKey) {
    const db = await openAudioDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(AUDIO_STORE_NAME, "readonly");
      const req = tx.objectStore(AUDIO_STORE_NAME).get(audioKey);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  async function deleteLocalAudio(audioKey) {
    const db = await openAudioDatabase();
    return new Promise(r => {
      const tx = db.transaction(AUDIO_STORE_NAME, "readwrite");
      tx.objectStore(AUDIO_STORE_NAME).delete(audioKey);
      tx.oncomplete = r;
    });
  }

  async function hydrateLocalAudio(ticket) {
    if (!ticket?.localAudioKey) return;
    const local = await readLocalAudio(ticket.localAudioKey);
    if (!local?.blob) return;
    const active = getActiveTicket();
    if (!active || active.id !== ticket.id) return;
    revokeObjectUrlIfNeeded(active.audioUrl);
    active.audioUrl = URL.createObjectURL(local.blob);
    els.audioCard.classList.remove("hidden");
    els.audioPlayer.src = active.audioUrl;
  }

  // --- UTILS ---
  function isUploadFriendlyAudio(file) {
    return /\.(mp3|wav|m4a|ogg|webm|opus)$/i.test(file.name) || file.type.startsWith('audio/');
  }

  async function loadBlobClient() {
    if (!blobClientPromise) blobClientPromise = import("https://esm.sh/@vercel/blob/client?target=es2022");
    return blobClientPromise;
  }

  async function uploadAudioToBlob(file) {
    const { upload } = await loadBlobClient();
    const pathname = `audios/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
    return upload(pathname, file, {
      access: "public",
      handleUploadUrl: `${apiBaseUrl}/blob-upload`,
    });
  }

  async function pingBackendHealth() {
    try { await fetch(`${apiBaseUrl}/health`, { cache: "no-store" }); } catch (e) {}
  }

  function revokeObjectUrlIfNeeded(url) {
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
  }

  function toggleDisabled(el, disabled) {
    if (el) el.disabled = !!disabled;
  }

  function escapeHtml(v) {
    return String(v||"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]));
  }

  function escapeAttribute(v) {
    return escapeHtml(v).replace(/`/g, "&#96;");
  }

  function notify(msg, type) {
    if (window.showToast) window.showToast(msg, type);
    else console.log(`[${type}] ${msg}`);
  }

  // Inicialização
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
