function abrirArquivoRTF() {
  document.getElementById('arquivoRTF').click();
}

async function processarRTF(event) {
  const arquivo = event.target.files[0];
  if (!arquivo) return;
  const reader = new FileReader();

  reader.onload = async function (e) {
    const texto = e.target.result;

    // 1. Extrair data do release (no formato dd/mm/yyyy)
    const matchRelease = texto.match(/release[^0-9]*(\d{2}\/\d{2}\/\d{4})/i);
    const releaseAtual = matchRelease ? matchRelease[1] : null;

    // 2. Encontrar protocolos
    const encontrados = [...new Set([...texto.matchAll(/Protocolo:\s*(\d+)/g)].map(m => m[1]))];
    const historicoPRTs = await obterListaPRTs();
    const resultados = encontrados.map(protocolo => {
      const registro = historicoPRTs.find(reg => reg.protocolo === protocolo);
      return { protocolo, ...registro, estaRegistrado: !!registro };
    });

    const container = document.getElementById('liberacoes-container');
    container.innerHTML = "";
    const encontradosRegistrados = resultados.filter(r => r.estaRegistrado);

    if (encontradosRegistrados.length) {
      renderizarLiberacoes(encontradosRegistrados);

      // 3. Montar string de protocolos concatenados
      const protocolosConcat = encontradosRegistrados
        .map(r => `#PRT${r.protocolo}`)
        .join(' ');

      // 4. Salvar no Supabase (somente se não existir ainda o release)
      if (releaseAtual) {
        try {
          // Buscar os releases existentes
          const res = await fetch("https://modelo-discord-server.vercel.app/api/liberados");
          const liberados = await res.json();

          const jaExiste = liberados.some(r => r.release === releaseAtual);
          console.log("Já existe "+jaExiste+" release "+releaseAtual+"  retorno liberdos "+ liberados);
          if (!jaExiste) {
            await fetch("https://modelo-discord-server.vercel.app/api/liberados", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                release: releaseAtual,
                prts: protocolosConcat
              })
            });
            console.log("Release salvo:", releaseAtual);
          } else {
            console.log("Release já existe, não será duplicado:", releaseAtual);
          }
        } catch (err) {
          console.error("Erro ao salvar liberação:", err);
        }
      } else {
        console.warn("Nenhuma data de release encontrada no arquivo.");
      }

    } else {
      container.innerHTML =
        `<p class="bg-red-900 text-red-200 p-3 rounded-md">
           Nenhum protocolo registrado foi liberado neste release!
         </p>`;
    }
  };

  reader.readAsText(arquivo);
}

async function obterListaPRTs() {
  try {
    const res = await fetch("https://modelo-discord-server.vercel.app/api/protocolos");
    const registros = await res.json();
    return registros.filter(reg => reg.prt).map(reg => ({
      protocolo: reg.prt.replace('#PRT', ''),
      tipo: reg.tipo || '',
      ticket: reg.ticket || '',
      descricao: reg.descricao || '',
      link: reg.link || ''
    }));
  } catch (err) {
    console.error("Erro API:", err);
    return [];
  }
}

async function carregarHistoricoLiberacoes() {
  const tbody = document.getElementById("tabelaLiberados");

  // Início do loading: Insere o HTML de carregamento no corpo da tabela
  tbody.innerHTML = `
    <tr>
      <td colspan="2" class="text-center py-6 text-gray-400">
        <div class="flex items-center justify-center space-x-2">
          <div class="relative w-8 h-8 rounded-full">
            <div class="absolute inset-0 rounded-full border-2 border-transparent" style="background: linear-gradient(90deg, #5EC26A, #10DF29, #009B12, #BE0001, #DC154A, #C02F30, #009dff); animation: spin-neon 2s linear infinite;"></div>
            <div class="absolute inset-1 bg-gray-900 rounded-full"></div>
            <svg class="absolute inset-0 m-auto h-5 w-5 text-transparent animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>
      </td>
    </tr>`;

  try {
    // Cria uma Promise para o timer (2 segundos)
    const timerPromise = new Promise(resolve => setTimeout(resolve, 2000)); // 2000ms = 2 segundos

    // Executa as requisições de fetch e o timer em paralelo
    const [liberadosRes, protocolosRes] = await Promise.all([
      fetch("https://modelo-discord-server.vercel.app/api/liberados"),
      fetch("https://modelo-discord-server.vercel.app/api/protocolos"),
      timerPromise // Espera o timer e as requisições terminarem
    ]);
    
    // Converte as respostas para JSON
    const dados = await liberadosRes.json();
    const protocolos = await protocolosRes.json();
    
    // Limpa o conteúdo de loading antes de renderizar os dados
    tbody.innerHTML = "";

    if (!dados || dados.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="2" class="text-center py-6 text-gray-400 italic">
            Nenhuma liberação registrada até o momento.
          </td>
        </tr>`;
      return;
    }

    dados.forEach(reg => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-800";
      const prts = reg.prts.split(/\s+/).filter(Boolean);

      const badgesHTML = prts.map(prt => {
        const registro = protocolos.find(p => p.prt === prt);
        if (!registro) {
          return `<span class="px-2 py-1 rounded text-xs font-bold bg-gray-600 text-gray-100">${prt}</span>`;
        }
        const cor = registro.tipo === "1"
          ? "bg-green-700 text-green-100"
          : "bg-red-700 text-red-100";
        const label = registro.tipo === "1" ? "Sugestão" : "Erro";
        return `<span class="px-2 py-1 rounded text-xs font-bold ${cor}" title="${label}">${prt}</span>`;
      }).join(" ");

      tr.innerHTML = `
        <td class="py-2 px-3 font-semibold">${reg.release}</td>
        <td class="py-2 px-3 flex flex-wrap gap-2">${badgesHTML}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Erro ao carregar histórico de liberações:", err);
    // Em caso de erro, exibe uma mensagem de erro na tabela
    tbody.innerHTML = `
      <tr>
        <td colspan="2" class="text-center py-6 text-red-400">
          Erro ao carregar os dados. Por favor, tente novamente.
        </td>
      </tr>`;
  }
}

function renderizarLiberacoes(registros) {
  const container = document.querySelector("#liberacoes-container");

  // Cabeçalho
  const header = document.createElement("div");
  header.className = "flex items-center justify-between mb-3";
  header.innerHTML = `
    <div class="font-bold">Protocolos encontrados: <span>${registros.length}</span></div>
  `;
  container.appendChild(header);

  const tabela = document.createElement("table");
  tabela.className = "w-full text-sm bg-gray-900 rounded-lg overflow-hidden shadow-lg";
  tabela.innerHTML = `
    <thead class="bg-gray-800">
      <tr>
        <th class="py-2 px-3 text-left">Ticket</th>
        <th class="py-2 px-3 text-left">Protocolo</th>
        <th class="py-2 px-3 text-left">Tipo</th>
        <th class="py-2 px-3 text-left">Descrição</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-gray-700"></tbody>
  `;

  const tbody = tabela.querySelector("tbody");
  registros.forEach(reg => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-gray-800";
    const badge = reg.tipo === '1'
      ? '<span class="px-3 py-1 text-xs font-bold rounded-full bg-green-700 text-green-100">Sugestão</span>'
      : '<span class="px-3 py-1 text-xs font-bold rounded-full bg-red-700 text-red-100">Erro</span>';
    const descricaoHTML = `<div class="desc-clamp" title="${(reg.descricao || "").replace(/"/g,'&quot;')}">${reg.descricao || ""}</div>`;
    tr.innerHTML = `
      <td class="py-2 px-3"><a href="${reg.link}" target="_blank" class="text-blue-400 underline">${reg.ticket}</a></td>
      <td class="py-2 px-3">#PRT${reg.protocolo}</td>
      <td class="py-2 px-3">${badge}</td>
      <td class="py-2 px-3">${descricaoHTML}</td>
    `;
    tbody.appendChild(tr);
  });

  container.appendChild(tabela);
}
