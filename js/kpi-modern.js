(function () {
  const API_BASE = "https://modelo-discord-server.vercel.app/api";

  function byId(id) {
    return document.getElementById(id);
  }

  function parseReleaseDate(value) {
    if (!value || typeof value !== "string") return null;
    const parts = value.split("/");
    if (parts.length !== 3) return null;
    const [day, month, year] = parts.map(Number);
    if (!day || !month || !year) return null;
    return new Date(year, month - 1, day);
  }

  function sortReleasesDesc(items) {
    return [...items].sort((a, b) => {
      const dateA = parseReleaseDate(a.release);
      const dateB = parseReleaseDate(b.release);
      return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
    });
  }

  function formatPercent(value) {
    if (!Number.isFinite(value)) return "0%";
    return `${value.toFixed(1).replace(".", ",")}%`;
  }

  function setText(id, value) {
    const el = byId(id);
    if (el) el.textContent = value;
  }

  async function fetchJson(path) {
    const response = await fetch(`${API_BASE}/${path}`);
    if (!response.ok) {
      throw new Error(`Falha ao carregar ${path}: ${response.status}`);
    }
    return response.json();
  }

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

  function countBy(items, getter) {
    const map = new Map();
    items.forEach((item) => {
      const key = getter(item);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()].map(([label, count]) => ({ label, count }));
  }

  function updateHero(metrics) {
    setText("kpi-sync-badge", metrics.lastSyncLabel);
    setText("kpi-highlight-module", `Módulo foco: ${metrics.topModule?.label || "--"}`);
    setText("kpi-highlight-release", `Release líder: ${metrics.topRelease?.label || "--"}`);
  }

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
    setText("kpi-delta-ultima", metrics.latestRelease ? "Mais recente" : "Sem data");

    setText("kpi-note-total", "Protocolos consolidados no Supabase.");
    setText("kpi-note-erros", `${metrics.errors} itens classificados como erro na base atual.`);
    setText("kpi-note-sugestoes", `${metrics.suggestions} itens classificados como sugestão na base atual.`);
    setText("kpi-note-releases", `${metrics.releaseCount} datas de release com PRTs associados.`);
    setText("kpi-note-protocolos", `${metrics.releasedProtocols} PRTs únicos em releases, cobrindo ${formatPercent(metrics.coverageRate)} da base.`);
    setText("kpi-note-ultima", metrics.latestRelease ? `Release mais recente detectada: ${metrics.latestRelease}.` : "Nenhuma release disponível.");
  }

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

  function renderRanking(metrics) {
    const container = byId("ranking-modulos");
    if (!container) return;

    if (!metrics.moduleRanking.length) {
      container.innerHTML = '<p class="kpi-summary-line">Nenhum dado encontrado para o ranking atual.</p>';
      return;
    }

    container.innerHTML = metrics.moduleRanking.slice(0, 8).map((item, index) => {
      const safeLabel = String(item.label).replace(/'/g, "\\'");
      return `
        <div class="reports-ranking-item" title="${item.count} PRTs em releases">
          <div class="reports-ranking-copy">
            <strong>${index + 1}. ${item.label}</strong>
            <span>${item.count} protocolos liberados</span>
          </div>
          <button onclick="selecionarModulo('${safeLabel}')" class="reports-ranking-count reports-pill reports-pill-suggestion" type="button">
            Filtrar
          </button>
        </div>
      `;
    }).join("");
  }

  function destroyChart(canvasId) {
    const canvas = byId(canvasId);
    if (!canvas || typeof Chart === "undefined") return;
    const current = Chart.getChart(canvas);
    if (current) current.destroy();
  }

  function createGradient(canvas, colors) {
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 280);
    colors.forEach(([stop, color]) => gradient.addColorStop(stop, color));
    return gradient;
  }

  function commonChartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#c7d7f3",
            font: { size: 11, weight: "600" },
            usePointStyle: true,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: "#8fa4c8" },
          grid: { color: "rgba(148, 163, 184, 0.12)" },
        },
        x: {
          ticks: { color: "#8fa4c8" },
          grid: { color: "rgba(148, 163, 184, 0.08)" },
        },
      },
    };
  }

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

  function renderTrendChart(metrics) {
    const canvas = byId("chartTrendModulo");
    if (!canvas || typeof Chart === "undefined") return;
    destroyChart("chartTrendModulo");

    const selectedModule = window.moduloSelecionado && window.moduloSelecionado !== "TODOS"
      ? window.moduloSelecionado
      : metrics.topModule?.label;

    const series = metrics.releasesAsc.map((release) =>
      release.protocolos.filter((prt) => window.protocolosIndex?.[prt]?.modulo === selectedModule).length
    );

    setText("trend-modulo-name", selectedModule || "--");

    new Chart(canvas, {
      type: "line",
      data: {
        labels: metrics.releasesAsc.map((item) => item.release),
        datasets: [{
          label: selectedModule ? `Tendência de ${selectedModule}` : "Tendência",
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

  function renderModuleChart(metrics) {
    const canvas = byId("grafico-modulos");
    if (!canvas || typeof Chart === "undefined") return;
    destroyChart("grafico-modulos");

    const topModules = metrics.moduleRanking.slice(0, 7);
    const rest = metrics.moduleRanking.slice(7).reduce((sum, item) => sum + item.count, 0);
    const labels = topModules.map((item) => item.label);
    const values = topModules.map((item) => item.count);

    if (rest > 0) {
      labels.push("Outros");
      values.push(rest);
    }

    const palette = [
      "#3b82f6",
      "#22c55e",
      "#f97316",
      "#a855f7",
      "#14b8a6",
      "#eab308",
      "#ef4444",
      "#64748b",
    ];

    new Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: palette.slice(0, labels.length),
          borderColor: "#0b1220",
          borderWidth: 4,
          hoverOffset: 10,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "64%",
        plugins: {
          legend: { display: false },
        },
      },
    });
  }

  function buildMetrics(protocolIndex, releases, dataset) {
    const totalRecords = dataset.allProtocols.length;
    const errors = dataset.allProtocols.filter((item) => item.tipo === "0").length;
    const suggestions = dataset.allProtocols.filter((item) => item.tipo !== "0").length;
    const releasedProtocols = dataset.releasedSet.size;
    const releaseCount = releases.length;
    const latestRelease = releases[0]?.release || "";
    const errorRate = totalRecords ? (errors / totalRecords) * 100 : 0;
    const suggestionRate = totalRecords ? (suggestions / totalRecords) * 100 : 0;
    const coverageRate = totalRecords ? (releasedProtocols / totalRecords) * 100 : 0;
    const avgPerRelease = releaseCount ? releasedProtocols / releaseCount : 0;
    const topRelease = countBy(dataset.releasedDetails, (item) => item.release).sort((a, b) => b.count - a.count)[0] || null;
    const moduleRanking = countBy(dataset.releasedDetails, (item) => item.modulo).sort((a, b) => b.count - a.count);
    const topModule = moduleRanking[0] || null;
    const releasesAsc = [...releases].reverse();
    let running = 0;
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

  async function renderWorkspace() {
    const page = byId("pagina-historico-liberacoes");
    if (!page) return;

    try {
      const [protocolIndex, releases] = await Promise.all([ensureProtocols(), ensureReleases()]);
      const dataset = buildDataset(protocolIndex, releases);
      const metrics = buildMetrics(protocolIndex, releases, dataset);

      updateHero(metrics);
      updateCards(metrics);
      updateExecutiveSummary(metrics);
      renderRanking(metrics);
      renderTop5Chart(metrics);
      renderEvolutionChart(metrics);
      renderReleaseChart(metrics);
      renderTrendChart(metrics);
      renderModuleChart(metrics);

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
    window.selecionarModulo = function wrappedSelecionarModulo(modulo) {
      originalSelecionarModulo(modulo);
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
