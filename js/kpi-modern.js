(function () {
  const API_BASE = window.getProtocordApiBaseUrl();

  // Explica a responsabilidade de by id dentro deste modulo.
  function byId(id) {
    return document.getElementById(id);
  }

  // Normaliza, interpreta ou formata dados para uso seguro (parse release date).
  function parseReleaseDate(value) {
    if (!value || typeof value !== "string") return null;
    const parts = value.split("/");
    if (parts.length !== 3) return null;
    const [day, month, year] = parts.map(Number);
    if (!day || !month || !year) return null;
    return new Date(year, month - 1, day);
  }

  // Explica a responsabilidade de sort releases desc dentro deste modulo.
  function sortReleasesDesc(items) {
    return [...items].sort((a, b) => {
      const dateA = parseReleaseDate(a.release);
      const dateB = parseReleaseDate(b.release);
      return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
    });
  }

  // Normaliza, interpreta ou formata dados para uso seguro (format percent).
  function formatPercent(value) {
    if (!Number.isFinite(value)) return "0%";
    return `${value.toFixed(1).replace(".", ",")}%`;
  }

  // Aplica valores, estado visual ou configuracoes no fluxo atual (set text).
  function setText(id, value) {
    const el = byId(id);
    if (el) {
      const nextValue = typeof window.normalizeUiText === "function"
        ? window.normalizeUiText(value)
        : value;
      el.textContent = nextValue;
    }
  }

  // Explica a responsabilidade de escape html dentro deste modulo.
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Normaliza, interpreta ou formata dados para uso seguro (format bytes).
  function formatBytes(value) {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = Number(value) || 0;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }
    return `${size.toFixed(size >= 100 || unitIndex === 0 ? 0 : 1).replace(".", ",")} ${units[unitIndex]}`;
  }

  // Normaliza, interpreta ou formata dados para uso seguro (format count).
  function formatCount(value) {
    return new Intl.NumberFormat("pt-BR").format(Number(value) || 0);
  }

  // Busca ou resolve informacoes necessarias para o fluxo (fetch json).
  async function fetchJson(path) {
    const response = await fetch(`${API_BASE}/${path}`);
    if (!response.ok) {
      throw new Error(`Falha ao carregar ${path}: ${response.status}`);
    }
    return response.json();
  }

  // Explica a responsabilidade de ensure protocols dentro deste modulo.
  async function ensureProtocols() {
    if (window.protocolosIndex && Object.keys(window.protocolosIndex).length) {
      return window.protocolosIndex;
    }

    if (typeof window.carregarProtocolos === "function") {
      await window.carregarProtocolos();
      if (window.protocolosIndex && Object.keys(window.protocolosIndex).length) {
        return window.protocolosIndex;
      }
    }

    const [protocolos, modulos] = await Promise.all([
      fetchJson("protocolos"),
      fetchJson("modulos").catch(() => []),
    ]);

    const moduloMap = {};
    (modulos || []).forEach((item) => {
      moduloMap[String(item.id)] = item.modulo;
    });

    window.protocolosIndex = {};
    (protocolos || []).forEach((item) => {
      const moduloId = String(item.modulo ?? "");
      window.protocolosIndex[item.prt] = {
        modulo: moduloMap[moduloId] || item.modulo || "Desconhecido",
        tipo: item.tipo,
        descricao: item.descricao || "",
        ticket: item.ticket || "",
        link: item.link || "",
      };
    });

    return window.protocolosIndex;
  }

  // Explica a responsabilidade de ensure releases dentro deste modulo.
  async function ensureReleases() {
    if (Array.isArray(window.liberacoesOriginais) && window.liberacoesOriginais.length) {
      return sortReleasesDesc(window.liberacoesOriginais);
    }

    if (typeof window.carregarDadosLiberacoes === "function") {
      const rows = await window.carregarDadosLiberacoes();
      window.liberacoesOriginais = rows;
      return sortReleasesDesc(rows);
    }

    const data = await fetchJson("liberados");
    window.liberacoesOriginais = (data || []).map((item) => ({
      release: item.release,
      protocolos: String(item.prts || "").split(/\s+/).filter(Boolean),
    }));
    return sortReleasesDesc(window.liberacoesOriginais);
  }

  // Monta ou cria a estrutura necessaria para esta etapa (build dataset).
  function buildDataset(protocolIndex, releases) {
    const allProtocols = Object.entries(protocolIndex || {}).map(([prt, info]) => ({
      prt,
      modulo: info.modulo || "Desconhecido",
      tipo: String(info.tipo ?? "1"),
      descricao: info.descricao || "",
      ticket: info.ticket || "",
    }));

    const releasedDetails = [];
    const releasedSet = new Set();

    (releases || []).forEach((releaseItem) => {
      (releaseItem.protocolos || []).forEach((prt) => {
        const info = protocolIndex?.[prt];
        if (!info) return;
        releasedSet.add(prt);
        releasedDetails.push({
          prt,
          release: releaseItem.release,
          modulo: info.modulo || "Desconhecido",
          tipo: String(info.tipo ?? "1"),
          descricao: info.descricao || "",
          ticket: info.ticket || "",
        });
      });
    });

    return { allProtocols, releasedDetails, releasedSet };
  }

  // Busca ou resolve informacoes necessarias para o fluxo (get active kpi filters).
  function getActiveKpiFilters() {
    const module = window.moduloSelecionado && window.moduloSelecionado !== "TODOS"
      ? String(window.moduloSelecionado)
      : "";
    const search = String(window.termoBusca || "").trim().toLowerCase();
    return { module, search };
  }

  // Explica a responsabilidade de protocol matches filters dentro deste modulo.
  function protocolMatchesFilters(prt, info, filters) {
    if (filters.module && info?.modulo !== filters.module) {
      return false;
    }

    if (!filters.search) {
      return true;
    }

    return (
      String(prt || "").toLowerCase().includes(filters.search) ||
      String(info?.modulo || "").toLowerCase().includes(filters.search) ||
      String(info?.descricao || "").toLowerCase().includes(filters.search) ||
      String(info?.ticket || "").toLowerCase().includes(filters.search)
    );
  }

  // Aplica valores, estado visual ou configuracoes no fluxo atual (apply kpi filters).
  function applyKpiFilters(protocolIndex, releases) {
    const filters = getActiveKpiFilters();
    const filteredProtocolIndex = {};

    Object.entries(protocolIndex || {}).forEach(([prt, info]) => {
      if (protocolMatchesFilters(prt, info, filters)) {
        filteredProtocolIndex[prt] = info;
      }
    });

    const filteredReleases = (releases || [])
      .map((release) => ({
        ...release,
        protocolos: (release.protocolos || []).filter((prt) => filteredProtocolIndex[prt]),
      }))
      .filter((release) => release.protocolos.length > 0);

    return {
      filters,
      protocolIndex: filteredProtocolIndex,
      releases: filteredReleases,
    };
  }

  // Explica a responsabilidade de count by dentro deste modulo.
  function countBy(items, getter) {
    const map = new Map();
    items.forEach((item) => {
      const key = getter(item);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()].map(([label, count]) => ({ label, count }));
  }

  // Atualiza a tela, o estado interno ou dados derivados (update hero).
  function updateHero(metrics) {
    setText("kpi-sync-badge", metrics.lastSyncLabel);
    setText("kpi-highlight-module", `Módulo foco: ${metrics.activeModule || metrics.topModule?.label || "--"}`);
    setText("kpi-highlight-release", `Release líder: ${metrics.topRelease?.label || "--"}`);
  }

  // Atualiza a tela, o estado interno ou dados derivados (update cards).
  function updateCards(metrics) {
    setText("card-total-registrado", String(metrics.totalRecords));
    setText("contador-erros", String(metrics.errors));
    setText("contador-sugestoes", String(metrics.suggestions));
    setText("card-releases", `${metrics.releaseCount} RLS`);
    setText("card-protocolos", `${metrics.releasedProtocols} PRT`);
    setText("card-ultima", metrics.latestRelease || "--");

    setText("kpi-delta-total", `${metrics.releasedProtocols} liberados`);
    setText("kpi-delta-erros", formatPercent(metrics.errorRate));
    setText("kpi-delta-sugestoes", formatPercent(metrics.suggestionRate));
    setText("kpi-delta-releases", `${metrics.avgPerRelease.toFixed(1).replace(".", ",")} por release`);
    setText("kpi-delta-protocolos", formatPercent(metrics.coverageRate));
    setText("kpi-delta-ultima", metrics.latestRelease ?"Mais recente" : "Sem data");

    setText("kpi-note-total", "Protocolos consolidados no Supabase.");
    setText("kpi-note-erros", `${metrics.errors} itens classificados como erro na base atual.`);
    setText("kpi-note-sugestoes", `${metrics.suggestions} itens classificados como sugestão na base atual.`);
    setText("kpi-note-releases", `${metrics.releaseCount} datas de release com PRTs associados.`);
    setText("kpi-note-protocolos", `${metrics.releasedProtocols} PRTs únicos em releases, cobrindo ${formatPercent(metrics.coverageRate)} da base.`);
    setText("kpi-note-ultima", metrics.latestRelease ?`Release mais recente detectada: ${metrics.latestRelease}.` : "Nenhuma release disponível.");
  }

  // Atualiza a tela, o estado interno ou dados derivados (update executive summary).
  function updateExecutiveSummary(metrics) {
    const target = byId("kpi-executive-summary");
    if (!target) return;

    const lines = [
      `${metrics.totalRecords} protocolos catalogados, com ${metrics.releasedProtocols} PRTs efetivamente presentes nas releases publicadas.`,
      `${metrics.topRelease?.label || "Sem release líder"} concentra ${metrics.topRelease?.count || 0} protocolos, enquanto ${metrics.topModule?.label || "sem módulo dominante"} lidera a incidência por módulo.`,
      `A base atual mostra ${metrics.errors} erros e ${metrics.suggestions} sugestões, com taxa de cobertura de ${formatPercent(metrics.coverageRate)} sobre os protocolos conhecidos.`,
    ];

    target.innerHTML = lines.map((line) => `<p class="kpi-summary-line">${line}</p>`).join("");
  }

  // Renderiza a interface ou a parte visual correspondente (render ranking).
  function renderRanking(metrics) {
    const canvas = byId("chartRankingModulos");
    if (!canvas || typeof Chart === "undefined") return;
    destroyChart("chartRankingModulos");

    const rows = metrics.moduleRanking.slice(0, 8);
    const labels = rows.map((item, index) => `${index + 1}. ${item.label}`);

    new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Protocolos liberados",
          data: rows.map((item) => item.count),
          backgroundColor: rows.map((_, index) => [
            "rgba(59, 130, 246, 0.86)",
            "rgba(34, 197, 94, 0.82)",
            "rgba(249, 115, 22, 0.82)",
            "rgba(168, 85, 247, 0.82)",
            "rgba(20, 184, 166, 0.82)",
            "rgba(234, 179, 8, 0.82)",
            "rgba(239, 68, 68, 0.82)",
            "rgba(100, 116, 139, 0.82)",
          ][index] || "rgba(59, 130, 246, 0.82)"),
          borderRadius: 12,
          borderSkipped: false,
          maxBarThickness: 24,
        }],
      },
      options: {
        ...commonChartOptions(),
        indexAxis: "y",
        onClick: (_event, elements) => {
          const index = elements?.[0]?.index;
          const selected = Number.isInteger(index) ? rows[index] : null;
          if (selected?.label && typeof window.selecionarModulo === "function") {
            window.selecionarModulo(selected.label, { source: "ranking" });
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${formatCount(context.parsed.x)} protocolos liberados`,
            },
          },
        },
        scales: {
          x: {
            ...commonChartOptions().scales.y,
            ticks: {
              ...commonChartOptions().scales.y.ticks,
              precision: 0,
            },
          },
          y: commonChartOptions().scales.x,
        },
      },
    });
  }

  // Renderiza a interface ou a parte visual correspondente (render table filter state).
  function renderTableFilterState(metrics) {
    const filterList = byId("filtro-modulos");
    if (!filterList) return;

    const filterShell = filterList.closest(".mb-5");
    filterShell?.classList.remove("hidden");
    filterShell?.removeAttribute("hidden");

    let note = byId("kpi-ranking-filter-note");
    if (!note) {
      note = document.createElement("div");
      note.id = "kpi-ranking-filter-note";
      note.className = "kpi-ranking-filter-note hidden";
      filterList.insertAdjacentElement("afterend", note);
    }

    const showRankingFilter =
      window.__kpiModuleFilterSource === "ranking" &&
      metrics.activeModule &&
      metrics.activeModule !== "TODOS";

    if (!showRankingFilter) {
      note.classList.add("hidden");
      note.innerHTML = "";
      return;
    }

    note.classList.remove("hidden");
    note.innerHTML = `
      <span>Recorte aplicado pelo ranking: <strong>${escapeHtml(metrics.activeModule)}</strong></span>
      <button type="button" onclick="selecionarModulo('TODOS')">Limpar</button>
    `;
  }

  // Explica a responsabilidade de destroy chart dentro deste modulo.
  function destroyChart(canvasId) {
    const canvas = byId(canvasId);
    if (!canvas || typeof Chart === "undefined") return;
    const current = Chart.getChart(canvas);
    if (current) current.destroy();
  }

  // Monta ou cria a estrutura necessaria para esta etapa (create gradient).
  function createGradient(canvas, colors) {
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 280);
    colors.forEach(([stop, color]) => gradient.addColorStop(stop, color));
    return gradient;
  }

  // Explica a responsabilidade de common chart options dentro deste modulo.
  function commonChartOptions() {
    const isLight = document.documentElement?.dataset?.theme === "light";
    const textColor = isLight ? "#334155" : "#c7d7f3";
    const mutedColor = isLight ? "#64748b" : "#8fa4c8";
    const gridColor = isLight ? "rgba(148, 163, 184, 0.22)" : "rgba(148, 163, 184, 0.12)";

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor,
            font: { size: 11, weight: "600" },
            usePointStyle: true,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: mutedColor },
          grid: { color: gridColor },
        },
        x: {
          ticks: { color: mutedColor },
          grid: { color: isLight ? "rgba(148, 163, 184, 0.16)" : "rgba(148, 163, 184, 0.08)" },
        },
      },
    };
  }

  // Renderiza a interface ou a parte visual correspondente (render module legend).
  function renderModuleLegend(labels, values, palette) {
    const legend = byId("legenda-modulos");
    if (!legend) return;

    const total = values.reduce((sum, value) => sum + Number(value || 0), 0);
    legend.innerHTML = labels.map((label, index) => {
      const value = Number(values[index] || 0);
      const percent = total ?((value / total) * 100).toFixed(1).replace(".", ",") : "0,0";
      return `
        <button type="button" class="kpi-module-legend-card" data-module="${escapeHtml(label)}">
          <span class="kpi-module-legend-dot" style="--legend-color:${palette[index] || "#60a5fa"}"></span>
          <span class="kpi-module-legend-name">${escapeHtml(label)}</span>
          <strong>${formatCount(value)}</strong>
          <small>${percent}%</small>
        </button>
      `;
    }).join("");
  }

  // Renderiza a interface ou a parte visual correspondente (render top5 chart).
  function renderTop5Chart(metrics) {
    const canvas = byId("chartTop5");
    if (!canvas || typeof Chart === "undefined") return;
    destroyChart("chartTop5");

    const rows = metrics.top5Releases;
    new Chart(canvas, {
      type: "bar",
      data: {
        labels: rows.map((item) => item.label),
        datasets: [{
          label: "Protocolos por release",
          data: rows.map((item) => item.count),
          backgroundColor: rows.map((_, index) => [
            "rgba(56, 189, 248, 0.82)",
            "rgba(59, 130, 246, 0.82)",
            "rgba(34, 197, 94, 0.82)",
            "rgba(249, 115, 22, 0.82)",
            "rgba(168, 85, 247, 0.82)",
          ][index] || "rgba(59, 130, 246, 0.82)"),
          borderRadius: 999,
          borderSkipped: false,
          maxBarThickness: 22,
        }],
      },
      options: {
        ...commonChartOptions(),
        indexAxis: "y",
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
        },
        scales: {
          x: commonChartOptions().scales.y,
          y: commonChartOptions().scales.x,
        },
      },
    });
  }

  // Renderiza a interface ou a parte visual correspondente (render evolution chart).
  function renderEvolutionChart(metrics) {
    const canvas = byId("chartEvolucao");
    if (!canvas || typeof Chart === "undefined") return;
    destroyChart("chartEvolucao");

    const gradient = createGradient(canvas, [
      [0, "rgba(96, 165, 250, 0.36)"],
      [1, "rgba(96, 165, 250, 0.02)"],
    ]);

    new Chart(canvas, {
      type: "line",
      data: {
        labels: metrics.releasesAsc.map((item) => item.release),
        datasets: [{
          label: "Protocolos acumulados",
          data: metrics.cumulativeSeries,
          borderColor: "#60a5fa",
          backgroundColor: gradient,
          fill: true,
          tension: 0.34,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: "#60a5fa",
        }],
      },
      options: commonChartOptions(),
    });
  }

  // Renderiza a interface ou a parte visual correspondente (render release chart).
  function renderReleaseChart(metrics) {
    const canvas = byId("chartLiberacoes");
    if (!canvas || typeof Chart === "undefined") return;
    destroyChart("chartLiberacoes");

    const gradient = createGradient(canvas, [
      [0, "rgba(37, 99, 235, 0.95)"],
      [1, "rgba(59, 130, 246, 0.38)"],
    ]);

    new Chart(canvas, {
      type: "bar",
      data: {
        labels: metrics.releasesAsc.map((item) => item.release),
        datasets: [{
          label: "Protocolos por release",
          data: metrics.releasesAsc.map((item) => item.protocolos.length),
          backgroundColor: gradient,
          borderColor: "#3b82f6",
          borderRadius: 14,
          borderSkipped: false,
          maxBarThickness: 34,
        }],
      },
      options: commonChartOptions(),
    });
  }

  // Renderiza a interface ou a parte visual correspondente (render trend chart).
  function renderTrendChart(metrics) {
    const canvas = byId("chartTrendModulo");
    if (!canvas || typeof Chart === "undefined") return;
    destroyChart("chartTrendModulo");

    const selectedModule = window.moduloSelecionado && window.moduloSelecionado !== "TODOS"
      ?window.moduloSelecionado
      : metrics.topModule?.label;

    // Explica a responsabilidade de series dentro deste modulo.
    const series = metrics.releasesAsc.map((release) =>
      release.protocolos.filter((prt) => window.protocolosIndex?.[prt]?.modulo === selectedModule).length
    );

    setText("trend-modulo-name", selectedModule || "--");

    new Chart(canvas, {
      type: "line",
      data: {
        labels: metrics.releasesAsc.map((item) => item.release),
        datasets: [{
          label: selectedModule ?`Tendência de ${selectedModule}` : "Tendência",
          data: series,
          borderColor: "#34d399",
          backgroundColor: "rgba(52, 211, 153, 0.12)",
          fill: true,
          tension: 0.32,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: "#34d399",
        }],
      },
      options: commonChartOptions(),
    });
  }

  // Renderiza a interface ou a parte visual correspondente (render module chart).
  function renderModuleChart(metrics) {
    const canvas = byId("grafico-modulos");
    if (!canvas || typeof Chart === "undefined") return;
    destroyChart("grafico-modulos");

    const topModules = metrics.moduleRanking.slice(0, 6);
    const rest = metrics.moduleRanking.slice(6).reduce((sum, item) => sum + item.count, 0);
    const labels = topModules.map((item) => item.label);
    const values = topModules.map((item) => item.count);

    if (rest > 0) {
      labels.push("Outros");
      values.push(rest);
    }

    const palette = [
      "#2563eb",
      "#0f766e",
      "#16a34a",
      "#f97316",
      "#7c3aed",
      "#db2777",
      "#475569",
    ];
    const isLight = document.documentElement?.dataset?.theme === "light";
    const total = values.reduce((sum, value) => sum + Number(value || 0), 0);
    const centerTextPlugin = {
      id: "protocordModuleCenter",
      // Explica a responsabilidade de after draw dentro deste modulo.
      afterDraw(chart) {
        const { ctx, chartArea } = chart;
        if (!chartArea) return;
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = isLight ? "#0f172a" : "#e7eef8";
        ctx.font = "800 28px Manrope, Arial, sans-serif";
        ctx.fillText(formatCount(total), (chartArea.left + chartArea.right) / 2, (chartArea.top + chartArea.bottom) / 2 - 8);
        ctx.fillStyle = isLight ? "#64748b" : "#8ea2bd";
        ctx.font = "700 11px Inter, Arial, sans-serif";
        ctx.fillText("PRTs", (chartArea.left + chartArea.right) / 2, (chartArea.top + chartArea.bottom) / 2 + 18);
        ctx.restore();
      },
    };

    renderModuleLegend(labels, values, palette);

    new Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: palette.slice(0, labels.length),
          borderColor: isLight ? "#f8fbff" : "#0b1220",
          borderWidth: 3,
          hoverOffset: 8,
          spacing: 3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "66%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              // Explica a responsabilidade de label dentro deste modulo.
              label(context) {
                const value = Number(context.raw || 0);
                const percent = total ?((value / total) * 100).toFixed(1).replace(".", ",") : "0,0";
                return `${context.label}: ${formatCount(value)} PRTs (${percent}%)`;
              },
            },
          },
        },
      },
      plugins: [centerTextPlugin],
    });
  }

  // Renderiza a interface ou a parte visual correspondente (render chart safely).
  function renderChartSafely(name, renderFn) {
    try {
      renderFn();
    } catch (error) {
      console.error(`Falha ao renderizar grafico KPI: ${name}`, error);
    }
  }

  // Renderiza a interface ou a parte visual correspondente (render kpi charts).
  function renderKpiCharts(metrics) {
    if (typeof Chart === "undefined") return;

    renderChartSafely("Top 5 releases", () => renderTop5Chart(metrics));
    renderChartSafely("Evolucao ao longo do tempo", () => renderEvolutionChart(metrics));
    renderChartSafely("Protocolos por release", () => renderReleaseChart(metrics));
    renderChartSafely("Tendencia por modulo", () => renderTrendChart(metrics));
    renderChartSafely("Ranking de modulos", () => renderRanking(metrics));
    renderChartSafely("Protocolos por modulo", () => renderModuleChart(metrics));
  }

  // Monta ou cria a estrutura necessaria para esta etapa (build metrics).
  function buildMetrics(protocolIndex, releases, dataset) {
    const totalRecords = dataset.allProtocols.length;
    const errors = dataset.allProtocols.filter((item) => item.tipo === "0").length;
    const suggestions = dataset.allProtocols.filter((item) => item.tipo !== "0").length;
    const releasedProtocols = dataset.releasedSet.size;
    const releaseCount = releases.length;
    const latestRelease = releases[0]?.release || "";
    const errorRate = totalRecords ?(errors / totalRecords) * 100 : 0;
    const suggestionRate = totalRecords ?(suggestions / totalRecords) * 100 : 0;
    const coverageRate = totalRecords ?(releasedProtocols / totalRecords) * 100 : 0;
    const avgPerRelease = releaseCount ?releasedProtocols / releaseCount : 0;
    const topRelease = countBy(dataset.releasedDetails, (item) => item.release).sort((a, b) => b.count - a.count)[0] || null;
    const moduleRanking = countBy(dataset.releasedDetails, (item) => item.modulo).sort((a, b) => b.count - a.count);
    const topModule = moduleRanking[0] || null;
    const releasesAsc = [...releases].reverse();
    let running = 0;
    // Explica a responsabilidade de cumulative series dentro deste modulo.
    const cumulativeSeries = releasesAsc.map((item) => {
      running += item.protocolos.length;
      return running;
    });

    return {
      totalRecords,
      errors,
      suggestions,
      releasedProtocols,
      releaseCount,
      latestRelease,
      errorRate,
      suggestionRate,
      coverageRate,
      avgPerRelease,
      topRelease,
      topModule,
      top5Releases: countBy(dataset.releasedDetails, (item) => item.release).sort((a, b) => b.count - a.count).slice(0, 5),
      moduleRanking,
      releasesAsc,
      cumulativeSeries,
      lastSyncLabel: `Base sincronizada às ${new Date().toLocaleTimeString("pt-BR")}`,
    };
  }

  // Busca ou resolve informacoes necessarias para o fluxo (fetch kpi insights).
  async function fetchKpiInsights() {
    if (window.__kpiInsightsPromise) {
      return window.__kpiInsightsPromise;
    }

    window.__kpiInsightsPromise = fetch(window.getProtocordApiUrl("/assistente?action=kpi-insights"))
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Falha ao carregar insights do KPI: ${response.status}`);
        }
        const payload = await response.json();
        return payload.data || {};
      })
      .catch((error) => {
        window.__kpiInsightsPromise = null;
        throw error;
      });

    return window.__kpiInsightsPromise;
  }

  // Explica a responsabilidade de ensure modal shell dentro deste modulo.
  function ensureModalShell() {
    let overlay = byId("kpi-insight-modal-overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "kpi-insight-modal-overlay";
    overlay.className = "kpi-insight-overlay hidden";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="kpi-insight-modal" role="dialog" aria-modal="true" aria-labelledby="kpi-insight-modal-title">
        <div class="kpi-insight-modal-head">
          <div>
            <span id="kpi-insight-modal-eyebrow" class="kpi-insight-eyebrow">Painel detalhado</span>
            <h3 id="kpi-insight-modal-title" class="kpi-insight-title">KPI</h3>
            <p id="kpi-insight-modal-subtitle" class="kpi-insight-subtitle">Aguarde...</p>
          </div>
          <span class="kpi-insight-dismiss-chip">Clique fora para fechar</span>
        </div>
        <div id="kpi-insight-modal-body" class="kpi-insight-body"></div>
      </div>
    `;

    document.body.appendChild(overlay);
    const modal = overlay.querySelector(".kpi-insight-modal");

    modal?.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeInsightModal();
        return;
      }
    });

    modal?.addEventListener("click", (event) => {
      const paginationButton = event.target.closest("[data-kpi-page-action]");
      if (!paginationButton) return;
      event.preventDefault();
      renderInsightModalPage(Number(paginationButton.getAttribute("data-kpi-page")));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeInsightModal();
    });

    return overlay;
  }

  // Abre a interface, recurso ou fluxo solicitado (open insight modal).
  function openInsightModal({ eyebrow, title, subtitle, body, renderBody }) {
    const overlay = ensureModalShell();
    const normalizeText = typeof window.normalizeUiText === "function"
      ? window.normalizeUiText
      : (value) => value;
    const resolvedRenderBody =
      typeof renderBody === "function"
        ? renderBody
        : () => body || '<div class="kpi-insight-empty">Sem conteúdo para exibir.</div>';
    window.__kpiCurrentModalConfig = { eyebrow, title, subtitle, renderBody: resolvedRenderBody };
    byId("kpi-insight-modal-eyebrow").textContent = normalizeText(eyebrow);
    byId("kpi-insight-modal-title").textContent = normalizeText(title);
    byId("kpi-insight-modal-subtitle").textContent = normalizeText(subtitle);
    overlay.classList.remove("hidden", "is-closing");
    overlay.classList.add("is-opening");
    overlay.classList.remove("hidden");
    overlay.style.pointerEvents = "auto";
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    renderInsightModalPage(1);
    queueInsightAnimation("open", overlay);
  }

  // Fecha a interface, recurso ou fluxo solicitado (close insight modal).
  function closeInsightModal() {
    const overlay = byId("kpi-insight-modal-overlay");
    if (!overlay || overlay.classList.contains("hidden") || overlay.dataset.closing === "true") return;

    overlay.dataset.closing = "true";
    overlay.classList.remove("is-opening");
    overlay.classList.add("is-closing");
    overlay.style.pointerEvents = "none";
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    // Explica a responsabilidade de finalize close dentro deste modulo.
    const finalizeClose = () => {
      if (!document.body.contains(overlay)) return;
      overlay.classList.add("hidden");
      overlay.classList.remove("is-closing");
      overlay.dataset.closing = "false";
      overlay.style.pointerEvents = "";
      window.__kpiCurrentModalConfig = null;
      window.__kpiCurrentModalPage = 1;
    };

    const fallbackTimer = window.setTimeout(finalizeClose, 260);
    queueInsightAnimation("close", overlay).finally(() => {
      window.clearTimeout(fallbackTimer);
      finalizeClose();
    });
  }

  window.closeKpiInsightModal = closeInsightModal;

  let insightMotionPromise = null;

  // Carrega ou restaura dados usados por esta funcionalidade (load insight motion).
  function loadInsightMotion() {
    if (insightMotionPromise) return insightMotionPromise;
    insightMotionPromise = import("https://cdn.jsdelivr.net/npm/motion@11.11.13/+esm")
      .catch(() => null);
    return insightMotionPromise;
  }

  // Explica a responsabilidade de run insight fallback animation dentro deste modulo.
  function runInsightFallbackAnimation(type, overlay, modal) {
    if (!overlay || !modal) return Promise.resolve();

    const overlayKeyframes = type === "open"
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ opacity: 1 }, { opacity: 0 }];
    const modalKeyframes = type === "open"
      ? [
        { opacity: 0, transform: "translateY(22px) scale(0.97)" },
        { opacity: 1, transform: "translateY(0) scale(1)" },
      ]
      : [
        { opacity: 1, transform: "translateY(0) scale(1)" },
        { opacity: 0, transform: "translateY(18px) scale(0.985)" },
      ];

    const overlayAnimation = overlay.animate(overlayKeyframes, {
      duration: type === "open" ? 180 : 150,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "forwards",
    });
    const modalAnimation = modal.animate(modalKeyframes, {
      duration: type === "open" ? 240 : 180,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "forwards",
    });

    return Promise.allSettled([overlayAnimation.finished, modalAnimation.finished]);
  }

  // Explica a responsabilidade de queue insight animation dentro deste modulo.
  async function queueInsightAnimation(type, overlay) {
    const modal = overlay?.querySelector(".kpi-insight-modal");
    if (!overlay || !modal) return;

    const motion = await loadInsightMotion();
    if (!motion?.animate) {
      return runInsightFallbackAnimation(type, overlay, modal);
    }

    const overlayAnimation = motion.animate(
      overlay,
      { opacity: type === "open" ? [0, 1] : [1, 0] },
      { duration: type === "open" ? 0.18 : 0.14, easing: [0.22, 1, 0.36, 1] }
    );
    const modalAnimation = motion.animate(
      modal,
      type === "open"
        ? { opacity: [0, 1], y: [20, 0], scale: [0.975, 1] }
        : { opacity: [1, 0], y: [0, 18], scale: [1, 0.985] },
      { duration: type === "open" ? 0.24 : 0.18, easing: [0.22, 1, 0.36, 1] }
    );

    return Promise.allSettled([
      overlayAnimation?.finished,
      modalAnimation?.finished,
    ]);
  }

  // Normaliza, interpreta ou formata dados para uso seguro (normalize insight node).
  function normalizeInsightNode(root) {
    if (!root || typeof window.normalizeUiText !== "function") return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let current;
    while ((current = walker.nextNode())) {
      current.nodeValue = window.normalizeUiText(current.nodeValue);
    }
  }

  // Renderiza a interface ou a parte visual correspondente (render insight modal page).
  function renderInsightModalPage(page) {
    const config = window.__kpiCurrentModalConfig;
    if (!config) return;

    window.__kpiCurrentModalPage = Math.max(1, Number(page) || 1);
    const modalBody = byId("kpi-insight-modal-body");
    modalBody.innerHTML = config.renderBody(window.__kpiCurrentModalPage);
    normalizeInsightNode(modalBody);
  }

  // Monta ou cria a estrutura necessaria para esta etapa (build metric cards).
  function buildMetricCards(cards) {
    return `
      <div class="kpi-insight-metrics">
        ${cards.map((card) => `
          <article class="kpi-insight-metric-card">
            <span>${escapeHtml(card.label)}</span>
            <strong>${escapeHtml(card.value)}</strong>
            <small>${escapeHtml(card.note || "")}</small>
          </article>
        `).join("")}
      </div>
    `;
  }

  // Monta ou cria a estrutura necessaria para esta etapa (build insight loading splash).
  function buildInsightLoadingSplash(title, description) {
    return `
      <section class="kpi-insight-loading">
        <div class="kpi-insight-loading-orbit" aria-hidden="true">
          <span class="kpi-insight-loading-ring kpi-insight-loading-ring-outer"></span>
          <span class="kpi-insight-loading-ring kpi-insight-loading-ring-middle"></span>
          <span class="kpi-insight-loading-ring kpi-insight-loading-ring-inner"></span>
          <span class="kpi-insight-loading-core"></span>
        </div>
        <div class="kpi-insight-loading-copy">
          <strong>${escapeHtml(title)}</strong>
          <p>${escapeHtml(description)}</p>
        </div>
        <div class="kpi-insight-loading-grid" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </section>
    `;
  }

  // Monta ou cria a estrutura necessaria para esta etapa (build table).
  function buildTable(headers, rows, options = {}) {
    const pageSize = options.pageSize || 6;
    const paginate = options.paginate !== false;
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const requestedPage = options.page || window.__kpiCurrentModalPage || 1;
    const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
    const start = (currentPage - 1) * pageSize;
    const pageRows = paginate ? rows.slice(start, start + pageSize) : rows;

    if (!rows.length) {
      return '<div class="kpi-insight-empty">Nenhum dado encontrado para este recorte.</div>';
    }

    return `
      <div class="kpi-insight-table-wrap">
        <table class="kpi-insight-table">
          <thead>
            <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${pageRows.map((row) => `
              <tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      ${paginate ? `<div class="kpi-insight-pagination">
        <span class="kpi-insight-pagination-note">Página ${currentPage} de ${totalPages} · ${formatCount(rows.length)} registros</span>
        <div class="kpi-insight-pagination-actions">
          <button type="button" class="kpi-insight-page-btn" data-kpi-page-action="prev" data-kpi-page="${Math.max(1, currentPage - 1)}" ${currentPage === 1 ? "disabled" : ""}>Anterior</button>
          <button type="button" class="kpi-insight-page-btn" data-kpi-page-action="next" data-kpi-page="${Math.min(totalPages, currentPage + 1)}" ${currentPage === totalPages ? "disabled" : ""}>Próxima</button>
        </div>
      </div>` : ""}
    `;
  }

  // Monta ou cria a estrutura necessaria para esta etapa (build status pill).
  function buildStatusPill(active, positiveLabel, neutralLabel) {
    const label = active ? positiveLabel : neutralLabel;
    const variant = active ? "success" : "neutral";
    return `<span class="kpi-insight-pill kpi-insight-pill-${variant}">${escapeHtml(label)}</span>`;
  }

  // Explica a responsabilidade de clamp percent dentro deste modulo.
  function clampPercent(value) {
    const normalized = Number(value) || 0;
    return Math.max(0, Math.min(100, normalized));
  }

  // Monta ou cria a estrutura necessaria para esta etapa (build storage progress).
  function buildStorageProgress(label, value, note, percent, tone = "cyan") {
    const safePercent = clampPercent(percent);
    return `
      <article class="kpi-storage-progress-card">
        <div class="kpi-storage-progress-copy">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
          <small>${escapeHtml(note)}</small>
        </div>
        <div class="kpi-storage-progress-track">
          <div class="kpi-storage-progress-fill kpi-storage-progress-fill-${tone}" style="width:${safePercent}%"></div>
        </div>
      </article>
    `;
  }

  // Monta ou cria a estrutura necessaria para esta etapa (build storage share row).
  function buildStorageShareRow(label, value, percent, tone = "cyan") {
    const safePercent = clampPercent(percent);
    return `
      <div class="kpi-storage-share-row">
        <div class="kpi-storage-share-head">
          <strong>${escapeHtml(label)}</strong>
          <span>${escapeHtml(value)}</span>
        </div>
        <div class="kpi-storage-share-track">
          <div class="kpi-storage-share-fill kpi-storage-share-fill-${tone}" style="width:${safePercent}%"></div>
        </div>
      </div>
    `;
  }

  // Monta ou cria a estrutura necessaria para esta etapa (build storage modal).
  function buildStorageModal(insights, state) {
    const storage = insights?.storage || {};
    const totalBytes = Math.max(Number(storage.totalBytes) || 0, 1);
    const usedBytes = Number(storage.usedBytes) || 0;
    const freeBytes = Math.max(Number(storage.freeBytes) || 0, 0);
    const usagePercent = clampPercent(Number(storage.usagePercent) || ((usedBytes / totalBytes) * 100));
    const sourceLabel = storage.source === "supabase-management"
      ? "Supabase Management API"
      : "Monitoramento do workspace";
    const tableEntries = Object.entries(storage.tables || {});
    const largestTableBytes = Math.max(1, ...tableEntries.map(([, details]) => Number(details?.usedBytes) || 0));
    const storageLegend = [
      { label: "Usado", value: formatBytes(usedBytes), percent: usagePercent, tone: "cyan" },
      { label: "Livre", value: formatBytes(freeBytes), percent: 100 - usagePercent, tone: "violet" },
    ];
    // Explica a responsabilidade de rows dentro deste modulo.
    const rows = tableEntries.map(([table, details], index) => {
      const tableBytes = Number(details?.usedBytes) || 0;
      const tablePercent = (tableBytes / totalBytes) * 100;
      const relativePercent = (tableBytes / largestTableBytes) * 100;
      const tone = index % 3 === 1 ? "blue" : index % 3 === 2 ? "violet" : "cyan";
      return [
        `<div class="kpi-storage-table-name"><strong>${escapeHtml(table)}</strong><small>${escapeHtml(formatCount(details.rows))} linhas monitoradas</small></div>`,
        `
          <div class="kpi-storage-table-meter">
            <div class="kpi-storage-table-meter-top">
              <strong>${escapeHtml(formatBytes(tableBytes))}</strong>
              <span>${escapeHtml(formatPercent(tablePercent))} do volume</span>
            </div>
            <div class="kpi-storage-share-track">
              <div class="kpi-storage-share-fill kpi-storage-share-fill-${tone}" style="width:${clampPercent(relativePercent)}%"></div>
            </div>
          </div>
        `,
        escapeHtml(formatCount(details.rows)),
      ];
    });

    openInsightModal({
      eyebrow: "Base monitorada",
      title: "Panorama do workspace",
      subtitle: `Leitura consolidada com ${formatCount(state.metrics.totalRecords)} protocolos acompanhados no Supabase.`,
      renderBody: (page) => `
        <section class="kpi-storage-hero">
          <article class="kpi-storage-hero-card">
            <div class="kpi-storage-hero-copy">
              <span>Capacidade acompanhada</span>
              <strong>${escapeHtml(formatBytes(totalBytes))}</strong>
              <small>${escapeHtml(sourceLabel)} com leitura segura apenas de volume operacional.</small>
            </div>
            <div class="kpi-storage-hero-meter">
              <div class="kpi-storage-hero-meter-top">
                <span>Uso atual</span>
                <strong>${escapeHtml(formatPercent(usagePercent))}</strong>
              </div>
              <div class="kpi-storage-hero-track">
                <div class="kpi-storage-hero-fill" style="width:${usagePercent}%"></div>
              </div>
              <div class="kpi-storage-volume-shell" aria-hidden="true">
                <div class="kpi-storage-volume-bar">
                  <div class="kpi-storage-volume-segment kpi-storage-volume-segment-used" style="width:${usagePercent}%"></div>
                  <div class="kpi-storage-volume-segment kpi-storage-volume-segment-free" style="width:${100 - usagePercent}%"></div>
                </div>
                <div class="kpi-storage-volume-scale">
                  <span>0</span>
                  <span>${escapeHtml(formatBytes(totalBytes))}</span>
                </div>
              </div>
              <div class="kpi-storage-hero-foot">
                <span>${escapeHtml(formatBytes(usedBytes))} utilizados</span>
                <span>${escapeHtml(formatBytes(freeBytes))} livres</span>
              </div>
            </div>
            <div class="kpi-storage-volume-legend">
              ${storageLegend.map((item) => `
                <article class="kpi-storage-volume-legend-item">
                  <span class="kpi-storage-volume-dot kpi-storage-volume-dot-${item.tone}"></span>
                  <div>
                    <strong>${escapeHtml(item.label)}</strong>
                    <small>${escapeHtml(item.value)} · ${escapeHtml(formatPercent(item.percent))}</small>
                  </div>
                </article>
              `).join("")}
            </div>
          </article>
          <article class="kpi-storage-sidecard">
            <div class="kpi-storage-sidecard-accent">
              <span>Workspace operacional</span>
              <strong>${escapeHtml(formatCount(tableEntries.length))} origens monitoradas</strong>
              <small>Leitura consolidada do ambiente para visão rápida do banco produtivo.</small>
            </div>
            <div class="kpi-storage-share-stack">
              ${buildStorageShareRow("Espaço em ocupação", formatBytes(usedBytes), usagePercent, "cyan")}
              ${buildStorageShareRow("Margem livre", formatBytes(freeBytes), 100 - usagePercent, "violet")}
            </div>
          </article>
        </section>
        <section class="kpi-storage-progress-grid">
          ${buildStorageProgress("Espaço monitorado", formatBytes(totalBytes), "Faixa total considerada neste painel.", 100, "blue")}
          ${buildStorageProgress("Espaço em uso", formatBytes(usedBytes), `${formatPercent(usagePercent)} ocupado no recorte atual.`, usagePercent, "cyan")}
          ${buildStorageProgress("Espaço livre", formatBytes(freeBytes), "Saldo operacional restante no teto acompanhado.", 100 - usagePercent, "violet")}
        </section>
        ${buildTable(["Origem monitorada", "Volume estimado", "Linhas"], rows, { paginate: false })}
      `,
    });
  }

  // Monta ou cria a estrutura necessaria para esta etapa (build errors modal).
  function buildErrorsModal(state) {
    const errorRows = state.dataset.allProtocols
      .filter((item) => item.tipo === "0")
      .sort((a, b) => Number(state.dataset.releasedSet.has(b.prt)) - Number(state.dataset.releasedSet.has(a.prt)))
      .map((item) => {
        const releaseItem = state.releases.find((release) => release.protocolos.includes(item.prt));
        return [
          `<strong>${escapeHtml(item.prt)}</strong>`,
          escapeHtml(item.modulo),
          escapeHtml(item.ticket || "Sem ticket"),
          buildStatusPill(Boolean(releaseItem), "Liberado", "Pendente"),
          escapeHtml(releaseItem?.release || "Aguardando release"),
        ];
      });

    openInsightModal({
      eyebrow: "Erros monitorados",
      title: "Protocolos de erro",
      subtitle: "Confira quais erros já estão em release e quais seguem pendentes para acompanhamento.",
      renderBody: (page) => `
        ${buildMetricCards([
          { label: "Erros na base", value: formatCount(state.metrics.errors), note: "Itens classificados como erro." },
          { label: "Erros liberados", value: formatCount(errorRows.filter((row) => row[3].includes("Liberado")).length), note: "Já presentes em release." },
          { label: "Erros pendentes", value: formatCount(errorRows.filter((row) => row[3].includes("Pendente")).length), note: "Ainda sem confirmação de release." },
        ])}
        ${buildTable(["PRT", "Módulo", "Ticket", "Confirmação", "Release"], errorRows)}
      `,
    });
  }

  // Monta ou cria a estrutura necessaria para esta etapa (build suggestions modal).
  function buildSuggestionsModal(state) {
    const rows = state.dataset.allProtocols
      .filter((item) => item.tipo !== "0")
      .slice(0, 80)
      .map((item) => {
        const releaseItem = state.releases.find((release) => release.protocolos.includes(item.prt));
        return [
          `<strong>${escapeHtml(item.prt)}</strong>`,
          escapeHtml(item.modulo),
          escapeHtml(item.ticket || "Sem ticket"),
          buildStatusPill(Boolean(releaseItem), "Já liberada", "Backlog"),
          escapeHtml(item.descricao || "Sem resumo"),
        ];
      });

    openInsightModal({
      eyebrow: "Sugestões catalogadas",
      title: "Backlog de melhoria",
      subtitle: "Sugestões com status operacional para leitura rápida do que já entrou em release.",
      renderBody: (page) => `
        ${buildMetricCards([
          { label: "Sugestões", value: formatCount(state.metrics.suggestions), note: "Itens classificados como sugestão." },
          { label: "Cobertura", value: formatPercent(state.metrics.suggestionRate), note: "Participação sobre a base total." },
          { label: "Último RLS", value: state.metrics.latestRelease || "--", note: "Recorte mais recente encontrado." },
        ])}
        ${buildTable(["PRT", "Módulo", "Ticket", "Situação", "Resumo"], rows)}
      `,
    });
  }

  // Monta ou cria a estrutura necessaria para esta etapa (build releases modal).
  function buildReleasesModal(state) {
    const rows = state.releases.map((release) => [
      `<strong>${escapeHtml(release.release)}</strong>`,
      escapeHtml(formatCount(release.protocolos.length)),
      escapeHtml(release.protocolos.slice(0, 5).join(", ") || "Sem PRT"),
    ]);

    openInsightModal({
      eyebrow: "Calendário de releases",
      title: "Releases verificadas",
      subtitle: "Distribuição cronológica das liberações para consulta rápida de volume e cobertura.",
      renderBody: (page) => `
        ${buildMetricCards([
          { label: "Releases", value: formatCount(state.metrics.releaseCount), note: "Datas com PRTs associados." },
          { label: "Média", value: `${state.metrics.avgPerRelease.toFixed(1).replace(".", ",")} PRT`, note: "Densidade média por release." },
          { label: "Mais carregada", value: state.metrics.topRelease?.label || "--", note: `${formatCount(state.metrics.topRelease?.count || 0)} protocolos.` },
        ])}
        ${buildTable(["Release", "Qtd. PRTs", "Amostra"], rows)}
      `,
    });
  }

  // Monta ou cria a estrutura necessaria para esta etapa (build released modal).
  function buildReleasedModal(state) {
    const rows = state.dataset.releasedDetails
      .slice()
      .sort((a, b) => parseReleaseDate(b.release) - parseReleaseDate(a.release))
      .slice(0, 120)
      .map((item) => [
        `<strong>${escapeHtml(item.prt)}</strong>`,
        escapeHtml(item.release),
        escapeHtml(item.modulo),
        escapeHtml(item.ticket || "Sem ticket"),
      ]);

    openInsightModal({
      eyebrow: "Confirmação de entrega",
      title: "PRTs liberados",
      subtitle: "Lista operacional dos PRTs que já constam em release publicada.",
      renderBody: (page) => `
        ${buildMetricCards([
          { label: "PRTs liberados", value: formatCount(state.metrics.releasedProtocols), note: "Únicos nas releases publicadas." },
          { label: "Cobertura", value: formatPercent(state.metrics.coverageRate), note: "Participação sobre a base total." },
          { label: "Módulo foco", value: state.metrics.topModule?.label || "--", note: "Maior incidência no recorte." },
        ])}
        ${buildTable(["PRT", "Release", "Módulo", "Ticket"], rows)}
      `,
    });
  }

  // Monta ou cria a estrutura necessaria para esta etapa (build latest modal).
  function buildLatestModal(state) {
    const latest = state.releases[0];
    // Explica a responsabilidade de rows dentro deste modulo.
    const rows = (latest?.protocolos || []).map((prt) => {
      const info = state.protocolIndex[prt] || {};
      return [
        `<strong>${escapeHtml(prt)}</strong>`,
        escapeHtml(info.modulo || "Desconhecido"),
        buildStatusPill(true, "Confirmado", "Confirmado"),
        escapeHtml(info.ticket || "Sem ticket"),
      ];
    });

    openInsightModal({
      eyebrow: "Última janela liberada",
      title: latest?.release || "Sem release disponível",
      subtitle: "Detalhe da release mais recente para conferência rápida dos protocolos envolvidos.",
      renderBody: (page) => `
        ${buildMetricCards([
          { label: "Release", value: latest?.release || "--", note: "Janela de maior recência detectada." },
          { label: "PRTs na janela", value: formatCount(latest?.protocolos?.length || 0), note: "Itens confirmados nesta release." },
          { label: "Módulos", value: formatCount(new Set((latest?.protocolos || []).map((prt) => state.protocolIndex[prt]?.modulo).filter(Boolean)).size), note: "Áreas impactadas na janela." },
        ])}
        ${buildTable(["PRT", "Módulo", "Status", "Ticket"], rows)}
      `,
    });
  }

  // Trata o evento ou acao do usuario neste fluxo (handle kpi action).
  async function handleKpiAction(action) {
    const state = window.__kpiWorkspaceState;
    if (!state) return;

    try {
      if (action === "storage") {
        const requestId = String(Date.now());
        window.__kpiPendingStorageRequest = requestId;
        openInsightModal({
          eyebrow: "Base monitorada",
          title: "Panorama do workspace",
          subtitle: "Preparando leitura consolidada da base.",
          renderBody: () => buildInsightLoadingSplash(
            "Sincronizando dados do workspace",
            "Estamos consolidando volume, distribuição e capacidade operacional para abrir o painel completo."
          ),
        });
        const insights = await fetchKpiInsights();
        if (
          window.__kpiPendingStorageRequest !== requestId ||
          byId("kpi-insight-modal-overlay")?.classList.contains("hidden")
        ) {
          return;
        }
        buildStorageModal(insights, state);
        return;
      }

      if (action === "errors") {
        buildErrorsModal(state);
        return;
      }

      if (action === "suggestions") {
        buildSuggestionsModal(state);
        return;
      }

      if (action === "releases") {
        buildReleasesModal(state);
        return;
      }

      if (action === "released") {
        buildReleasedModal(state);
        return;
      }

      if (action === "latest") {
        buildLatestModal(state);
      }
    } catch (error) {
      openInsightModal({
        eyebrow: "Falha na consulta",
        title: "Não foi possível abrir o detalhe",
        subtitle: "Tente novamente em instantes.",
        renderBody: () => `<div class="kpi-insight-empty">${escapeHtml(error.message || "Erro inesperado.")}</div>`,
      });
    } finally {
      if (action === "storage") {
        window.__kpiPendingStorageRequest = null;
      }
    }
  }

  // Explica a responsabilidade de bind kpi action buttons dentro deste modulo.
  function bindKpiActionButtons() {
    if (window.__kpiActionButtonsBound) return;

    document.addEventListener("click", (event) => {
      const button = event.target.closest(".kpi-stat-action");
      if (!button) return;
      handleKpiAction(button.getAttribute("data-kpi-action"));
    });

    window.__kpiActionButtonsBound = true;
  }

  // Explica a responsabilidade de bind kpi search input dentro deste modulo.
  function bindKpiSearchInput() {
    const input = byId("busca-modulo");
    if (!input || input.dataset.kpiModernBound === "true") return;

    input.dataset.kpiModernBound = "true";
    input.value = window.termoBusca || input.value || "";

    input.addEventListener("input", (event) => {
      window.termoBusca = event.target.value || "";
      window.clearTimeout(window.__kpiSearchRenderTimer);
      window.__kpiSearchRenderTimer = window.setTimeout(() => {
        renderWorkspace();
      }, 120);
    });

    input.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      input.value = "";
      window.termoBusca = "";
      window.clearTimeout(window.__kpiSearchRenderTimer);
      renderWorkspace();
    });
  }

  // Renderiza a interface ou a parte visual correspondente (render workspace).
  async function renderWorkspace() {
    const page = byId("pagina-historico-liberacoes");
    if (!page) return;

    try {
      if (typeof window.ensureChartJs === "function") {
        await window.ensureChartJs().catch((error) => {
          console.warn("Chart.js indisponivel; KPI sera renderizado sem graficos.", error);
        });
      }

      const [baseProtocolIndex, baseReleases] = await Promise.all([ensureProtocols(), ensureReleases()]);
      const filtered = applyKpiFilters(baseProtocolIndex, baseReleases);
      const protocolIndex = filtered.protocolIndex;
      const releases = filtered.releases;
      const dataset = buildDataset(protocolIndex, releases);
      const metrics = buildMetrics(protocolIndex, releases, dataset);
      metrics.activeModule = filtered.filters.module;
      metrics.activeSearch = filtered.filters.search;
      window.__kpiWorkspaceState = {
        baseProtocolIndex,
        baseReleases,
        filters: filtered.filters,
        protocolIndex,
        releases,
        dataset,
        metrics,
      };

      updateHero(metrics);
      updateCards(metrics);
      updateExecutiveSummary(metrics);
      if (typeof window.renderizarFiltroModulos === "function") {
        window.renderizarFiltroModulos();
      }
      renderTableFilterState(metrics);
      if (typeof window.renderizarTabelaLiberacoes === "function") {
        window.renderizarTabelaLiberacoes(releases);
      }
      bindKpiActionButtons();
      bindKpiSearchInput();
      requestAnimationFrame(() => renderKpiCharts(metrics));

      if (window.lucide?.createIcons) {
        window.lucide.createIcons();
      }
    } catch (error) {
      console.error("Falha ao renderizar KPI moderno:", error);
    }
  }

  window.renderKpiWorkspace = renderWorkspace;

  if (typeof window.selecionarModulo === "function" && !window.__kpiWrappedSelect) {
    const originalSelecionarModulo = window.selecionarModulo;
    window.selecionarModulo = function wrappedSelecionarModulo(modulo, options = {}) {
      originalSelecionarModulo(modulo, options);
      setTimeout(() => {
        renderWorkspace();
      }, 80);
    };
    window.__kpiWrappedSelect = true;
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (byId("pagina-historico-liberacoes") && !byId("pagina-historico-liberacoes").classList.contains("hidden")) {
      renderWorkspace();
    }
  });
})();
