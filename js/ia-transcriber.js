(function () {
  const STORAGE_KEY = "protocord_ia_transcriber_v1";
  const FALLBACK_API_URL = "https://modelo-discord-server.vercel.app/api";
  const MAX_UPLOAD_BYTES = 2.5 * 1024 * 1024;
  const COMPRESS_FROM_BYTES = 256 * 1024;
  const TARGET_SAMPLE_RATE = 16000;
  const apiBaseUrl = (window.PROTOCORD_TRANSCRIBER_API || localStorage.getItem("PROTOCORD_TRANSCRIBER_API") || FALLBACK_API_URL).replace(/\/$/, "");

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

    window.addEventListener("paste", handlePasteImages);
  }

  function restoreState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      state.tickets = Array.isArray(parsed.tickets) ? parsed.tickets : [];
      state.activeId = parsed.activeId || null;
    } catch (error) {
      state.tickets = [];
      state.activeId = null;
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      tickets: state.tickets,
      activeId: state.activeId,
    }));
  }

  function getActiveTicket() {
    return state.tickets.find((ticket) => ticket.id === state.activeId) || null;
  }

  function createTicket() {
    const id = String(Date.now());
    const ticket = {
      id,
      phone: "Novo Chamado",
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
      els.ticketList.innerHTML = '<div class="ia-image-empty">Nenhum ticket encontrado.</div>';
      return;
    }

    els.ticketList.innerHTML = filtered.map((ticket) => {
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
          ${state.editingTicketId === ticket.id ? `
            <div style="margin-top:10px">
              <input class="ia-ticket-input" data-ticket-edit-input="${ticket.id}" value="${escapeAttribute(ticket.customName || ticket.phone || "")}" />
            </div>
          ` : ""}
        </article>
      `;
    }).join("");

    els.ticketList.querySelectorAll(".ia-ticket-item").forEach((item) => {
      item.addEventListener("click", (event) => {
        if (event.target.closest("[data-action]")) return;
        state.activeId = item.dataset.ticketId;
        state.imageIndex = 0;
        state.editingReport = false;
        state.reportDraft = "";
        persist();
        render();
      });
    });

    els.ticketList.querySelectorAll("[data-action='rename']").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const ticketId = button.dataset.ticketId;

        if (state.editingTicketId === ticketId) {
          commitTicketName(ticketId);
          return;
        }

        state.editingTicketId = ticketId;
        renderTicketList();
        lucide.createIcons();
        const input = els.ticketList.querySelector(`[data-ticket-edit-input="${ticketId}"]`);
        input?.focus();
        input?.addEventListener("keydown", (keyEvent) => {
          if (keyEvent.key === "Enter") {
            keyEvent.preventDefault();
            commitTicketName(ticketId);
          }
        }, { once: true });
      });
    });

    els.ticketList.querySelectorAll("[data-action='delete']").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.stopPropagation();
        const ticketId = button.dataset.ticketId;
        const ticket = state.tickets.find((entry) => entry.id === ticketId);
        if (!ticket) return;

      if (ticket.nomeArquivoNoServidor) {
          await deleteStoredAudio(ticket);
          revokeObjectUrlIfNeeded(ticket.audioUrl);
        }

        state.tickets = state.tickets.filter((entry) => entry.id !== ticketId);

        if (state.activeId === ticketId) {
          state.activeId = state.tickets[0]?.id || null;
          state.imageIndex = 0;
        }

        state.editingTicketId = null;
        persist();
        render();
      });
    });

    els.ticketList.querySelectorAll("[data-ticket-edit-input]").forEach((input) => {
      input.addEventListener("click", (event) => event.stopPropagation());
      input.addEventListener("blur", () => {
        commitTicketName(input.dataset.ticketEditInput);
      });
    });
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

  function renderActiveTicket() {
    const active = getActiveTicket();
    const hasActive = Boolean(active);

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
    if (active?.audioUrl) {
      els.audioCard.classList.remove("hidden");
      els.audioPlayer.src = active.audioUrl;
    } else {
      els.audioCard.classList.add("hidden");
      els.audioPlayer.removeAttribute("src");
    }
  }

  async function uploadAudio(file) {
    const active = getActiveTicket();
    if (!active) {
      notify("Selecione um ticket.", "error");
      return;
    }

    state.uploading = true;
    renderActiveTicket();

    let uploadFile = file;

    const formData = new FormData();

    try {
      if (file.size > COMPRESS_FROM_BYTES || !isAlreadyCompactAudio(file)) {
        notify("Convertendo áudio para Opus reduzido...", "info");
        uploadFile = await compressAudioForUpload(file);
      }

      if (uploadFile.size > MAX_UPLOAD_BYTES) {
        throw new Error("O áudio continua acima do limite de upload. Tente um arquivo menor.");
      }

      formData.append("audio", uploadFile);
      formData.append("modo", "openai");

      const response = await fetch(`${apiBaseUrl}/transcrever`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data?.sucesso) {
        throw new Error(data?.erro || "Falha ao transcrever o áudio.");
      }

      if (active.nomeArquivoNoServidor && active.nomeArquivoNoServidor !== data.nomeArquivoNoServidor) {
        await deleteStoredAudio(active);
        revokeObjectUrlIfNeeded(active.audioUrl);
      }

      active.analysis = data.analise || "";
      active.solucao = data.solucao || "";
      active.resumo = (data.resumo || "").substring(0, 255);
      active.phone = data.telefone || active.phone;
      active.nomeArquivoNoServidor = data.nomeArquivoNoServidor || "";
      active.blobUrl = data.blobUrl || data.audioUrl || "";
      active.audioUrl = data.audioUrl || data.blobUrl || URL.createObjectURL(uploadFile);
      state.editingReport = false;
      state.reportDraft = "";
      persist();
      render();
      notify("Transcrição concluída.", "success");
    } catch (error) {
      notify(error.message || "Falha ao transcrever.", "error");
    } finally {
      state.uploading = false;
      renderActiveTicket();
    }
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
    const problemMatch = normalized.match(/PROBLEMA\s*\/\s*DUVIDA\s*:\s*([\s\S]*?)(?:\n{2,}ENCAMINHAMENTO\s*\/\s*SOLUCAO\s*:|$)/i);
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
    const imageFiles = items.filter((item) => item.type.startsWith("image/")).map((item) => item.getAsFile()).filter(Boolean);
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

  async function deleteStoredAudio(ticket) {
    const target = ticket?.audioUrl || ticket?.blobUrl || ticket?.nomeArquivoNoServidor;
    if (!target) return;

    try {
      await fetch(`${apiBaseUrl}/excluir-audio`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: ticket.audioUrl || ticket.blobUrl || null,
          pathname: ticket.nomeArquivoNoServidor || null,
        }),
      });
    } catch (error) {
      // noop
    }
  }

  async function compressAudioForUpload(file) {
    if (typeof MediaRecorder === "undefined") {
      throw new Error("Seu navegador não suporta conversão local deste áudio.");
    }

    const mimeType = pickRecorderMimeType();
    if (!mimeType) {
      throw new Error("Nenhum codec compatível encontrado para converter o áudio.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const decoderContext = new (window.AudioContext || window.webkitAudioContext)();

    try {
      const decodedBuffer = await decoderContext.decodeAudioData(arrayBuffer.slice(0));
      const normalizedBuffer = await resampleToMono(decodedBuffer, TARGET_SAMPLE_RATE);
      const bitrates = [16000, 12000, 8000, 6000];

      let bestBlob = null;

      for (const bitrate of bitrates) {
        const encodedBlob = await encodeAudioBufferToOpus(normalizedBuffer, mimeType, bitrate);

        if (!bestBlob || encodedBlob.size < bestBlob.size) {
          bestBlob = encodedBlob;
        }

        if (encodedBlob.size <= MAX_UPLOAD_BYTES) {
          bestBlob = encodedBlob;
          break;
        }
      }

      if (!bestBlob) {
        throw new Error("Não foi possível converter o áudio para um formato menor.");
      }

      const extension = mimeType.includes("ogg") ? "ogg" : "webm";
      return new File([bestBlob], replaceExtension(file.name, extension), { type: mimeType });
    } finally {
      try { await decoderContext.close(); } catch (error) { /* noop */ }
    }
  }

  async function resampleToMono(sourceBuffer, targetSampleRate) {
    const frameCount = Math.ceil(sourceBuffer.duration * targetSampleRate);
    const offlineContext = new OfflineAudioContext(1, frameCount, targetSampleRate);
    const monoBuffer = offlineContext.createBuffer(1, sourceBuffer.length, sourceBuffer.sampleRate);
    const monoChannel = monoBuffer.getChannelData(0);
    const channels = sourceBuffer.numberOfChannels;

    for (let channelIndex = 0; channelIndex < channels; channelIndex += 1) {
      const channelData = sourceBuffer.getChannelData(channelIndex);
      for (let sampleIndex = 0; sampleIndex < channelData.length; sampleIndex += 1) {
        monoChannel[sampleIndex] += channelData[sampleIndex] / channels;
      }
    }

    const source = offlineContext.createBufferSource();
    source.buffer = monoBuffer;
    source.connect(offlineContext.destination);
    source.start(0);

    return offlineContext.startRendering();
  }

  async function encodeAudioBufferToOpus(audioBuffer, mimeType, audioBitsPerSecond) {
    const playbackContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: audioBuffer.sampleRate,
    });

    try {
      const destination = playbackContext.createMediaStreamDestination();
      const monitorGain = playbackContext.createGain();
      monitorGain.gain.value = 0;
      const source = playbackContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(destination);
      source.connect(monitorGain);
      monitorGain.connect(playbackContext.destination);

      const chunks = [];
      const recorder = new MediaRecorder(destination.stream, {
        mimeType,
        audioBitsPerSecond,
      });

      await playbackContext.resume();

      return await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          try {
            if (recorder.state !== "inactive") recorder.stop();
          } catch (error) {
            // noop
          }
          reject(new Error("Tempo esgotado ao converter o áudio para Opus."));
        }, Math.max(15000, Math.ceil(audioBuffer.duration * 2000)));

        recorder.addEventListener("dataavailable", (event) => {
          if (event.data?.size) chunks.push(event.data);
        });

        recorder.addEventListener("stop", () => {
          clearTimeout(timeoutId);
          resolve(new Blob(chunks, { type: mimeType }));
        });

        recorder.addEventListener("error", () => {
          clearTimeout(timeoutId);
          reject(new Error("Falha ao codificar o áudio em Opus."));
        });

        source.addEventListener("ended", () => {
          if (recorder.state !== "inactive") recorder.stop();
        });

        recorder.start(250);
        source.start(0);
      });
    } finally {
      try { await playbackContext.close(); } catch (error) { /* noop */ }
    }
  }

  function isAlreadyCompactAudio(file) {
    const type = String(file?.type || "").toLowerCase();
    return type.includes("ogg") || type.includes("opus") || type.includes("webm");
  }

  function pickRecorderMimeType() {
    const mimeTypes = [
      "audio/webm;codecs=opus",
      "audio/ogg;codecs=opus",
      "audio/webm",
      "audio/ogg",
    ];

    return mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  }

  function replaceExtension(filename, extension) {
    const base = String(filename || "audio").replace(/\.[^.]+$/, "");
    return `${base}.${extension}`;
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
