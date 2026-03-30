(function () {
  const API_BASE = "https://modelo-discord-server.vercel.app/api";
  const state = {
    rows: [],
    filteredRows: [],
    loadedAt: null,
  };

  const formatDate = (value) => {
    if (!value) return "";
    const [day, month, year] = String(value).split("/");
    if (!day || !month || !year) return String(value);
    return `${year}-${month}-${day}`;
  };

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

  const byId = (id) => document.getElementById(id);

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

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
        tipoNome: String(item.tipo) === "0" ? "Erro" : "Sugestão",
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

  function applyFilters() {
    const filters = getFilters();
    let rows = state.rows.filter((row) => {
      if (filters.tipo !== "todos") {
        const wanted = filters.tipo === "erro" ? "erro" : "sugestao";
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
    releaseSelect.value = releases.includes(currentRelease) ? currentRelease : "todas";

    moduloSelect.innerHTML = '<option value="todos">Todos</option>';
    modulos.forEach((modulo) => {
      const option = document.createElement("option");
      option.value = modulo;
      option.textContent = modulo;
      moduloSelect.appendChild(option);
    });
    moduloSelect.value = modulos.includes(currentModulo) ? currentModulo : "todos";
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
        ? `Última carga: ${state.loadedAt?.toLocaleString("pt-BR") || "agora"}`
        : "Nenhum registro no recorte atual.";
    }

    const badge = byId("reports-sync-badge");
    if (badge) {
      badge.textContent = state.loadedAt
        ? `Base atualizada em ${state.loadedAt.toLocaleTimeString("pt-BR")}`
        : "Aguardando carga";
    }
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
      return (row.descricao || "").length > (acc.descricao || "").length ? row : acc;
    }, rows[0]);

    target.innerHTML = `
      <article class="reports-summary-card">
        <h4>Maior concentração por módulo</h4>
        <p>${escapeHtml(topModule?.label || "Sem dados")}\n${topModule?.count || 0} ocorrências no recorte.</p>
      </article>
      <article class="reports-summary-card">
        <h4>Release mais impactado</h4>
        <p>${escapeHtml(topRelease?.label || "Sem dados")}\n${topRelease?.count || 0} protocolos associados.</p>
      </article>
      <article class="reports-summary-card">
        <h4>Descrição mais extensa</h4>
        <p>${escapeHtml(longDesc?.prt || "--")} • ${escapeHtml(longDesc?.modulo || "Sem módulo")}\n${escapeHtml((longDesc?.descricao || "").slice(0, 180) || "Sem descrição.")}</p>
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

    count.textContent = `${rows.length} ${rows.length === 1 ? "linha" : "linhas"}`;

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
        <td>${escapeHtml(row.ticket || "--")}</td>
        <td>${escapeHtml(row.prt)}</td>
        <td>${escapeHtml(row.tipo)}</td>
        <td>${escapeHtml(row.modulo)}</td>
        <td>${escapeHtml(row.release)}</td>
        <td class="reports-desc-cell">${escapeHtml((row.descricao || "Sem descrição.").slice(0, 220))}</td>
      </tr>
    `).join("");
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
        <div>
          <strong>${index + 1}. ${escapeHtml(item.label)}</strong>
          <span>${item.count} ${item.count === 1 ? singular : "ocorrências"}</span>
        </div>
        <span>${item.count}</span>
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

  function buildExecutiveNarrative(rows, topModule, topRelease) {
    const errors = rows.filter((row) => row.tipoRaw === "0").length;
    const suggestions = rows.length - errors;
    const emphasis = errors >= suggestions ? "predomínio de erros" : "predomínio de sugestões";
    return [
      `${rows.length} registros no recorte atual, com ${emphasis}.`,
      topModule ? `Módulo com maior pressão: ${topModule.label}.` : "Sem módulo dominante.",
      topRelease ? `Release mais concentrado: ${topRelease.label}.` : "Sem release dominante.",
    ].join(" ");
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
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
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

  function exportExecutivePdf() {
    const rows = state.filteredRows;
    if (!rows.length) {
      window.showToast?.("Não há dados para exportar no recorte atual.", "warning");
      return;
    }

    const jsPDF = ensurePdf();
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const modules = aggregate(rows, "modulo").slice(0, 5);
    const releases = aggregate(rows, "release").slice(0, 5);
    let y = 44;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Relatório executivo", 40, y);
    y += 22;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 40, y);
    y += 26;

    doc.setFont("helvetica", "bold");
    doc.text("Resumo do recorte", 40, y);
    y += 18;
    doc.setFont("helvetica", "normal");
    const errors = rows.filter((row) => row.tipoRaw === "0").length;
    const suggestions = rows.length - errors;
    const paragraphs = [
      `Total de registros: ${rows.length}`,
      `Erros: ${errors} | Sugestões: ${suggestions}`,
      buildExecutiveNarrative(rows, modules[0], releases[0]),
    ];
    paragraphs.forEach((line) => {
      doc.text(doc.splitTextToSize(line, 500), 40, y);
      y += 18;
    });

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Top módulos", 40, y);
    y += 18;
    doc.setFont("helvetica", "normal");
    modules.forEach((item, index) => {
      doc.text(`${index + 1}. ${item.label} - ${item.count}`, 40, y);
      y += 16;
    });

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Top releases", 40, y);
    y += 18;
    doc.setFont("helvetica", "normal");
    releases.forEach((item, index) => {
      doc.text(`${index + 1}. ${item.label} - ${item.count}`, 40, y);
      y += 16;
    });

    doc.save(`relatorio_executivo_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function exportDetailsPdf() {
    const rows = state.filteredRows;
    if (!rows.length) {
      window.showToast?.("Não há dados para exportar no recorte atual.", "warning");
      return;
    }

    const jsPDF = ensurePdf();
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageHeight = doc.internal.pageSize.getHeight();
    const descWidth = 220;
    let y = 42;

    const drawHeader = (title) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(title, 36, 36);
      doc.setFontSize(9);
      doc.text("Ticket", 36, 58);
      doc.text("PRT", 95, 58);
      doc.text("Tipo", 150, 58);
      doc.text("Módulo", 210, 58);
      doc.text("Release", 360, 58);
      doc.text("Descrição", 430, 58);
      y = 74;
    };

    drawHeader("Relatório detalhado");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.8);

    rows.forEach((row) => {
      const descLines = doc.splitTextToSize(row.descricao || "Sem descrição.", descWidth);
      const blockHeight = Math.max(18, descLines.length * 10);

      if (y + blockHeight > pageHeight - 30) {
        doc.addPage();
        drawHeader("Relatório detalhado (continuação)");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.8);
      }

      doc.text(String(row.ticket || "--"), 36, y);
      doc.text(String(row.prt), 95, y);
      doc.text(String(row.tipo), 150, y);
      doc.text(String(row.modulo).slice(0, 24), 210, y);
      doc.text(String(row.release), 360, y);
      doc.text(descLines, 430, y);
      y += blockHeight;
    });

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
        window.showToast?.("Não há dados para exportar no recorte atual.", "warning");
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
        window.showToast?.("Não há dados para exportar no recorte atual.", "warning");
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
      window.showLoader?.("Atualizando base de relatórios...");
      await loadRows();
      renderFilters();
      applyFilters();
      window.showToast?.("Base de relatórios atualizada.", "success");
    } catch (error) {
      console.error(error);
      window.showToast?.("Falha ao atualizar a base de relatórios.", "error");
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
