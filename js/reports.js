(function () {
  const API_BASE = window.getProtocordApiBaseUrl();
  const state = {
    rows: [],
    filteredRows: [],
    loadedAt: null,
  };

  const byId = (id) => document.getElementById(id);

  const normalize = (value) => {
    if (!value) return "";
    try {
      return String(value)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
    } catch (_) {
      return String(value).toLowerCase().trim();
    }
  };

  const escapeHtml = (value) =>
    String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const formatDate = (value) => {
    if (!value) return "";
    const [day, month, year] = String(value).split("/");
    if (!day || !month || !year) return String(value);
    return `${year}-${month}-${day}`;
  };

  async function fetchJson(path) {
    const response = await fetch(`${API_BASE}${path}`);
    if (!response.ok) {
      throw new Error(`Falha ao carregar ${path}: ${response.status}`);
    }
    return response.json();
  }

  async function loadRows() {
    const [protocolos, modulos, liberados] = await Promise.all([
      fetchJson("/protocolos"),
      fetchJson("/modulos"),
      fetchJson("/liberados"),
    ]);

    const moduloMap = {};
    modulos.forEach((item) => {
      moduloMap[String(item.id)] = item.modulo;
    });

    const protocoloMap = {};
    protocolos.forEach((item) => {
      protocoloMap[item.prt] = {
        ...item,
        moduloNome: moduloMap[String(item.modulo)] || item.modulo || "Desconhecido",
        tipoNome: String(item.tipo) === "0" ?"Erro" : "Sugest?o",
      };
    });

    const rows = [];
    liberados.forEach((releaseItem) => {
      const release = releaseItem.release || "Sem release";
      const prts = String(releaseItem.prts || "")
        .split(/\s+/)
        .map((part) => part.trim())
        .filter(Boolean);

      prts.forEach((prt) => {
        const protocolo = protocoloMap[prt] || {};
        rows.push({
          ticket: protocolo.ticket || "",
          prt,
          tipo: protocolo.tipoNome || "Sugestão",
          tipoRaw: protocolo.tipo ?? "1",
          descricao: protocolo.descricao || "",
          modulo: protocolo.moduloNome || "Desconhecido",
          release,
          releaseSort: formatDate(release),
          link: protocolo.link || "",
        });
      });
    });

    state.rows = rows;
    state.loadedAt = new Date();
    window.reportsRows = rows;
    return rows;
  }

  function getFilters() {
    return {
      tipo: byId("relatorio-tipo-select")?.value || "todos",
      release: byId("relatorio-release-select")?.value || "todas",
      modulo: byId("reports-modulo-select")?.value || "todos",
      search: normalize(byId("reports-search-input")?.value || ""),
      order: byId("reports-order-select")?.value || "recentes",
    };
  }

  function aggregate(rows, key) {
    const map = new Map();
    rows.forEach((row) => {
      const label = row[key] || "Sem classificação";
      map.set(label, (map.get(label) || 0) + 1);
    });
    return [...map.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"));
  }

  function applyFilters() {
    const filters = getFilters();

    let rows = state.rows.filter((row) => {
      if (filters.tipo !== "todos") {
        const wanted = filters.tipo === "erro" ?"erro" : "sugestao";
        if (normalize(row.tipo) !== wanted) return false;
      }

      if (filters.release !== "todas" && row.release !== filters.release) return false;
      if (filters.modulo !== "todos" && row.modulo !== filters.modulo) return false;

      if (filters.search) {
        const haystack = normalize(
          `${row.ticket} ${row.prt} ${row.tipo} ${row.modulo} ${row.release} ${row.descricao}`
        );
        if (!haystack.includes(filters.search)) return false;
      }

      return true;
    });

    rows = rows.sort((a, b) => {
      if (filters.order === "ticket") return String(a.ticket).localeCompare(String(b.ticket), "pt-BR");
      if (filters.order === "modulo") return String(a.modulo).localeCompare(String(b.modulo), "pt-BR");
      if (filters.order === "maior-descricao") return (b.descricao || "").length - (a.descricao || "").length;
      return String(b.releaseSort).localeCompare(String(a.releaseSort), "pt-BR");
    });

    state.filteredRows = rows;
    renderWorkspace();
    return rows;
  }

  function renderFilters() {
    const releaseSelect = byId("relatorio-release-select");
    const moduloSelect = byId("reports-modulo-select");
    if (!releaseSelect || !moduloSelect) return;

    const currentRelease = releaseSelect.value;
    const currentModulo = moduloSelect.value;

    const releases = [...new Set(state.rows.map((row) => row.release))].sort((a, b) =>
      formatDate(b).localeCompare(formatDate(a), "pt-BR")
    );
    const modulos = [...new Set(state.rows.map((row) => row.modulo))].sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );

    releaseSelect.innerHTML = '<option value="todas">Todas</option>';
    releases.forEach((release) => {
      const option = document.createElement("option");
      option.value = release;
      option.textContent = release;
      releaseSelect.appendChild(option);
    });
    releaseSelect.value = releases.includes(currentRelease) ?currentRelease : "todas";

    moduloSelect.innerHTML = '<option value="todos">Todos</option>';
    modulos.forEach((modulo) => {
      const option = document.createElement("option");
      option.value = modulo;
      option.textContent = modulo;
      moduloSelect.appendChild(option);
    });
    moduloSelect.value = modulos.includes(currentModulo) ?currentModulo : "todos";
  }

  function renderKpis(rows) {
    const releases = new Set(rows.map((row) => row.release));
    const erros = rows.filter((row) => row.tipoRaw === "0").length;
    const sugestoes = rows.filter((row) => row.tipoRaw !== "0").length;

    byId("reports-kpi-total").textContent = String(rows.length);
    byId("reports-kpi-erros").textContent = String(erros);
    byId("reports-kpi-sugestoes").textContent = String(sugestoes);
    byId("reports-kpi-releases").textContent = String(releases.size);

    const note = byId("reports-kpi-total-note");
    if (note) {
      note.textContent = rows.length
        ?`?ltima carga: ${state.loadedAt?.toLocaleString("pt-BR") || "agora"}`
        : "Nenhum registro no recorte atual.";
    }

    const badge = byId("reports-sync-badge");
    if (badge) {
      badge.textContent = state.loadedAt
        ?`Base atualizada em ${state.loadedAt.toLocaleTimeString("pt-BR")}`
        : "Aguardando carga";
    }
  }

  function buildExecutiveNarrative(rows, topModule, topRelease) {
    const errors = rows.filter((row) => row.tipoRaw === "0").length;
    const suggestions = rows.length - errors;
    const emphasis = errors >= suggestions ?"predom?nio de erros" : "predom?nio de sugest�es";
    return [
      `${rows.length} registros no recorte atual, com ${emphasis}.`,
      topModule ?`M?dulo com maior press?o: ${topModule.label}.` : "Sem m?dulo dominante.",
      topRelease ?`Release mais concentrado: ${topRelease.label}.` : "Sem release dominante.",
    ].join(" ");
  }

  function renderSummary(rows) {
    const target = byId("reports-summary-grid");
    if (!target) return;

    if (!rows.length) {
      target.innerHTML = `
        <article class="reports-summary-card">
          <h4>Sem dados para exibir</h4>
          <p>Ajuste os filtros ou recarregue a base para gerar um recorte válido.</p>
        </article>
      `;
      return;
    }

    const byModule = aggregate(rows, "modulo");
    const byRelease = aggregate(rows, "release");
    const topModule = byModule[0];
    const topRelease = byRelease[0];
    const longDesc = rows.reduce((acc, row) => {
      return (row.descricao || "").length > (acc.descricao || "").length ?row : acc;
    }, rows[0]);

    target.innerHTML = `
      <article class="reports-summary-card">
        <h4>Maior concentração por módulo</h4>
        <p>${escapeHtml(topModule?.label || "Sem dados")}\n${topModule?.count || 0} ocorr?ncias no recorte.</p>
      </article>
      <article class="reports-summary-card">
        <h4>Release mais impactado</h4>
        <p>${escapeHtml(topRelease?.label || "Sem dados")}\n${topRelease?.count || 0} protocolos associados.</p>
      </article>
      <article class="reports-summary-card">
        <h4>Descrição mais extensa</h4>
        <p>${escapeHtml(longDesc?.prt || "--")} " ${escapeHtml(longDesc?.modulo || "Sem m?dulo")}\n${escapeHtml((longDesc?.descricao || "").slice(0, 180) || "Sem descri��o.")}</p>
      </article>
      <article class="reports-summary-card">
        <h4>Leitura gerencial</h4>
        <p>${buildExecutiveNarrative(rows, topModule, topRelease)}</p>
      </article>
    `;
  }

  function renderPreview(rows) {
    const body = byId("reports-preview-body");
    const count = byId("reports-preview-count");
    if (!body || !count) return;

    count.textContent = `${rows.length} ${rows.length === 1 ?"linha" : "linhas"}`;

    if (!rows.length) {
      body.innerHTML = `
        <tr>
          <td colspan="6" class="reports-desc-cell">Nenhum resultado para os filtros atuais.</td>
        </tr>
      `;
      return;
    }

    body.innerHTML = rows.slice(0, 14).map((row) => `
      <tr>
        <td class="reports-cell-ticket">${escapeHtml(row.ticket || "--")}</td>
        <td class="reports-cell-prt">${escapeHtml(row.prt)}</td>
        <td class="reports-cell-tipo">
          <span class="reports-pill ${row.tipoRaw === "0" ?"reports-pill-error" : "reports-pill-suggestion"}">
            ${escapeHtml(row.tipo)}
          </span>
        </td>
        <td class="reports-cell-modulo">${escapeHtml(row.modulo)}</td>
        <td class="reports-cell-release">${escapeHtml(row.release)}</td>
        <td class="reports-desc-cell reports-cell-desc">
          <div class="reports-cell-desc-text">${escapeHtml(row.descricao || "Sem descrição.")}</div>
        </td>
      </tr>
    `).join("");
  }

  function renderRanking(rows, targetId, key, singular) {
    const target = byId(targetId);
    if (!target) return;

    const ranking = aggregate(rows, key).slice(0, 8);
    if (!ranking.length) {
      target.innerHTML = `<div class="reports-ranking-item"><strong>Sem dados</strong><span>Nenhum ${singular} encontrado.</span></div>`;
      return;
    }

    target.innerHTML = ranking.map((item, index) => `
      <div class="reports-ranking-item">
        <div class="reports-ranking-copy">
          <strong>${index + 1}. ${escapeHtml(item.label)}</strong>
          <span>${item.count} ${item.count === 1 ?singular : "ocorr?ncias"}</span>
        </div>
        <span class="reports-ranking-count">${item.count}</span>
      </div>
    `).join("");
  }

  function renderWorkspace() {
    const rows = state.filteredRows;
    renderKpis(rows);
    renderSummary(rows);
    renderPreview(rows);
    renderRanking(rows, "reports-module-ranking", "modulo", "registro");
    renderRanking(rows, "reports-release-ranking", "release", "release");
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 500);
  }

  function exportRowsAsCsv(rows, filename) {
    const header = ["Ticket", "PRT", "Tipo", "Módulo", "Release", "Descrição"];
    const csv = [
      "\uFEFF" + header.join(";"),
      ...rows.map((row) =>
        [row.ticket, row.prt, row.tipo, row.modulo, row.release, row.descricao]
      .map((value) => `"${String(value || "").replace(/"/g, '""')}"`)
          .join(";")
      ),
    ].join("\n");

    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename);
  }

  function exportMatrixCsv(rows) {
    const releases = [...new Set(rows.map((row) => row.release))].sort((a, b) =>
      formatDate(b).localeCompare(formatDate(a), "pt-BR")
    );
    const modules = [...new Set(rows.map((row) => row.modulo))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const matrix = new Map();

    rows.forEach((row) => {
      const key = `${row.release}|||${row.modulo}`;
      matrix.set(key, (matrix.get(key) || 0) + 1);
    });

    const lines = [
      "\uFEFFRelease;" + modules.join(";"),
      ...releases.map((release) => {
        const counts = modules.map((module) => matrix.get(`${release}|||${module}`) || 0);
        return [release, ...counts].join(";");
      }),
    ].join("\n");

    downloadBlob(
      new Blob([lines], { type: "text/csv;charset=utf-8;" }),
      `matriz_release_modulo_${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  function ensurePdf() {
    if (!window.jspdf?.jsPDF) {
      throw new Error("jsPDF não disponível");
    }
    return window.jspdf.jsPDF;
  }

  function drawPageLabel(doc, pageWidth, pageHeight, pageNumber) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(115, 133, 167);
    doc.text(`Página ${pageNumber}`, pageWidth - 82, pageHeight - 18);
  }

  function exportExecutivePdf() {
    const rows = state.filteredRows;
    if (!rows.length) {
      window.showToast?.("N?o h� dados para exportar no recorte atual.", "warning");
      return;
    }

    const jsPDF = ensurePdf();
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 40;
    const marginRight = 40;
    const maxWidth = pageWidth - marginLeft - marginRight;
    let y = 44;
    let pageNumber = 1;

    const ensureSpace = (needed) => {
      if (y + needed <= pageHeight - 34) return;
      drawPageLabel(doc, pageWidth, pageHeight, pageNumber);
      doc.addPage();
      pageNumber += 1;
      y = 44;
    };

    const writeParagraph = (text, spacing = 18) => {
      const lines = doc.splitTextToSize(text, maxWidth);
      ensureSpace(lines.length * 13 + 8);
      doc.text(lines, marginLeft, y);
      y += lines.length * 13 + spacing;
    };

    const modules = aggregate(rows, "modulo").slice(0, 5);
    const releases = aggregate(rows, "release").slice(0, 5);
    const errors = rows.filter((row) => row.tipoRaw === "0").length;
    const suggestions = rows.length - errors;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(17, 24, 39);
    doc.text("Relatório executivo", marginLeft, y);
    y += 22;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, marginLeft, y);
    y += 28;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text("Resumo do recorte", marginLeft, y);
    y += 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(31, 41, 55);
    [
      `Total de registros: ${rows.length}`,
      `Erros: ${errors} | Sugestões: ${suggestions}`,
      buildExecutiveNarrative(rows, modules[0], releases[0]),
    ].forEach((line) => writeParagraph(line, 14));

    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    ensureSpace(26);
    doc.text("Top módulos", marginLeft, y);
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(31, 41, 55);
    modules.forEach((item, index) => writeParagraph(`${index + 1}. ${item.label} - ${item.count}`, 10));

    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    ensureSpace(26);
    doc.text("Top releases", marginLeft, y);
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(31, 41, 55);
    releases.forEach((item, index) => writeParagraph(`${index + 1}. ${item.label} - ${item.count}`, 10));

    drawPageLabel(doc, pageWidth, pageHeight, pageNumber);
    doc.save(`relatorio_executivo_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function exportDetailsPdf() {
    const rows = state.filteredRows;
    if (!rows.length) {
      window.showToast?.("N?o h� dados para exportar no recorte atual.", "warning");
      return;
    }

    const jsPDF = ensurePdf();
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 28;
    const marginRight = 28;
    const bottomMargin = 26;
    const lineHeight = 11;
    let pageNumber = 1;
    let y = 38;

    const columns = {
      ticket: { x: 28, width: 74, title: "Ticket" },
      prt: { x: 108, width: 68, title: "PRT" },
      tipo: { x: 182, width: 76, title: "Tipo" },
      modulo: { x: 264, width: 170, title: "Módulo" },
      release: { x: 440, width: 82, title: "Release" },
      descricao: { x: 528, width: pageWidth - 528 - marginRight, title: "Descrição" },
    };

    const drawHeader = (title) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(17, 24, 39);
      doc.text(title, marginLeft, 32);

      doc.setDrawColor(201, 210, 226);
      doc.setLineWidth(0.6);
      doc.line(marginLeft, 40, pageWidth - marginRight, 40);

      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      Object.values(columns).forEach((column) => {
        doc.text(column.title, column.x, 56);
      });

      doc.setDrawColor(226, 232, 240);
      doc.line(marginLeft, 62, pageWidth - marginRight, 62);
      y = 78;
    };

    const ensureSpace = (needed) => {
      if (y + needed <= pageHeight - bottomMargin) return;
      drawPageLabel(doc, pageWidth, pageHeight, pageNumber);
      doc.addPage();
      pageNumber += 1;
      drawHeader("Relatório detalhado (continuação)");
    };

    drawHeader("Relatório detalhado");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(31, 41, 55);

    rows.forEach((row) => {
      const ticketLines = doc.splitTextToSize(String(row.ticket || "--"), columns.ticket.width);
      const prtLines = doc.splitTextToSize(String(row.prt), columns.prt.width);
      const tipoLines = doc.splitTextToSize(String(row.tipo), columns.tipo.width);
      const moduloLines = doc.splitTextToSize(String(row.modulo || "Desconhecido"), columns.modulo.width);
      const releaseLines = doc.splitTextToSize(String(row.release || "--"), columns.release.width);
      const descricaoLines = doc.splitTextToSize(String(row.descricao || "Sem descrição."), columns.descricao.width);

      const blockHeight =
        Math.max(
          ticketLines.length,
          prtLines.length,
          tipoLines.length,
          moduloLines.length,
          releaseLines.length,
          descricaoLines.length
        ) *
          lineHeight +
        10;

      ensureSpace(blockHeight);

      doc.text(ticketLines, columns.ticket.x, y);
      doc.text(prtLines, columns.prt.x, y);
      doc.text(tipoLines, columns.tipo.x, y);
      doc.text(moduloLines, columns.modulo.x, y);
      doc.text(releaseLines, columns.release.x, y);
      doc.text(descricaoLines, columns.descricao.x, y);

      const separatorY = y + blockHeight - 4;
      doc.setDrawColor(232, 238, 247);
      doc.line(marginLeft, separatorY, pageWidth - marginRight, separatorY);

      y += blockHeight;
    });

    drawPageLabel(doc, pageWidth, pageHeight, pageNumber);
    doc.save(`relatorio_detalhado_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function bindEvents() {
    byId("reports-refresh-btn")?.addEventListener("click", async () => {
      await refreshReports();
    });

    byId("reports-export-summary-btn")?.addEventListener("click", () => {
      exportExecutivePdf();
    });

    byId("reports-export-details-pdf-btn")?.addEventListener("click", () => {
      exportDetailsPdf();
    });

    byId("reports-export-details-csv-btn")?.addEventListener("click", () => {
      if (!state.filteredRows.length) {
        window.showToast?.("N?o h� dados para exportar no recorte atual.", "warning");
        return;
      }
      exportRowsAsCsv(state.filteredRows, `relatorio_detalhado_${new Date().toISOString().slice(0, 10)}.csv`);
    });

    byId("reports-export-json-btn")?.addEventListener("click", () => {
      const payload = JSON.stringify(state.filteredRows, null, 2);
      downloadBlob(
        new Blob([payload], { type: "application/json;charset=utf-8;" }),
        `relatorio_bruto_${new Date().toISOString().slice(0, 10)}.json`
      );
    });

    byId("reports-export-matrix-btn")?.addEventListener("click", () => {
      if (!state.filteredRows.length) {
        window.showToast?.("N?o h� dados para exportar no recorte atual.", "warning");
        return;
      }
      exportMatrixCsv(state.filteredRows);
    });

    byId("reports-export-ranking-btn")?.addEventListener("click", () => {
      window.exportarRankingPDF?.();
    });

    byId("reports-export-top5-btn")?.addEventListener("click", () => {
      window.exportarTop5PDF?.();
    });

    byId("reports-clear-filters-btn")?.addEventListener("click", () => {
      byId("relatorio-tipo-select").value = "todos";
      byId("relatorio-release-select").value = "todas";
      byId("reports-modulo-select").value = "todos";
      byId("reports-search-input").value = "";
      byId("reports-order-select").value = "recentes";
      applyFilters();
    });

    byId("reports-apply-filters-btn")?.addEventListener("click", () => {
      applyFilters();
    });

    ["relatorio-tipo-select", "relatorio-release-select", "reports-modulo-select", "reports-order-select"].forEach((id) => {
      byId(id)?.addEventListener("change", applyFilters);
    });

    byId("reports-search-input")?.addEventListener("input", () => {
      applyFilters();
    });
  }

  async function refreshReports() {
    try {
      window.showLoader?.("Atualizando base de relat�rios...");
      await loadRows();
      renderFilters();
      applyFilters();
      window.showToast?.("Base de relat�rios atualizada.", "success");
    } catch (error) {
      console.error(error);
      window.showToast?.("Falha ao atualizar a base de relat�rios.", "error");
    } finally {
      window.hideLoader?.();
      if (window.lucide?.createIcons) window.lucide.createIcons();
    }
  }

  window.populateRelatoriosFilters = refreshReports;
  window.exportarDetalhesCSV = () =>
    exportRowsAsCsv(state.filteredRows, `relatorio_detalhado_${new Date().toISOString().slice(0, 10)}.csv`);
  window.exportarDetalhesPDF = exportDetailsPdf;
  window.exportarProtocolosPDF = exportExecutivePdf;
  window.exportarTop5PDF = () => {
    const topRows = aggregate(state.filteredRows, "release").slice(0, 5).map((item) => ({
      ticket: "--",
      prt: "--",
      tipo: "Resumo",
      modulo: "Resumo",
      release: item.label,
      descricao: `${item.count} protocolos associados`,
    }));
    const previous = state.filteredRows;
    state.filteredRows = topRows;
    exportDetailsPdf();
    state.filteredRows = previous;
    renderWorkspace();
  };
  window.exportarRankingPDF = () => {
    const rankingRows = aggregate(state.filteredRows, "modulo").map((item) => ({
      ticket: "--",
      prt: "--",
      tipo: "Resumo",
      modulo: item.label,
      release: "--",
      descricao: `${item.count} ocorrências no recorte atual`,
    }));
    const previous = state.filteredRows;
    state.filteredRows = rankingRows;
    exportDetailsPdf();
    state.filteredRows = previous;
    renderWorkspace();
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (!byId("pagina-relatorios")) return;
    bindEvents();
    refreshReports();
  });
})();
