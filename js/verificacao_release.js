function abrirArquivoRTF() {
  document.getElementById('arquivoRTF').click();
}

async function processarRTF(event) {
  const arquivo = event.target.files[0];
  if (!arquivo) return;

  const container = document.getElementById('liberacoes-container');

  mostrarPagina('liberacoes'); 
  
  container.innerHTML = 
    `<div class="flex items-center justify-center h-48 bg-gray-800 rounded-xl p-4">
       <p class="text-lg text-blue-400 flex items-center gap-3">
         <i data-lucide="loader-circle" class="w-6 h-6 animate-spin"></i>
         Processando arquivo e consultando histórico...
       </p>
     </div>`;

  if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
  }
  // -----------------------------------------------------------------------


  const reader = new FileReader();

  reader.onload = async function (e) {
    const texto = e.target.result;

    const matchRelease = texto.match(/release[^0-9]*(\d{2}\/\d{2}\/\d{4})/i);
    const releaseAtual = matchRelease ? matchRelease[1] : null;

    const encontrados = [...new Set([...texto.matchAll(/Protocolo:\s*(\d+)/g)].map(m => m[1]))];
    
    const historicoPRTs = await obterListaPRTs();
    
    const resultados = encontrados.map(protocolo => {
      const registro = historicoPRTs.find(reg => reg.protocolo === protocolo);
      return { protocolo, ...registro, estaRegistrado: !!registro };
    });

    container.innerHTML = "";
    
    const encontradosRegistrados = resultados.filter(r => r.estaRegistrado);

    if (encontradosRegistrados.length) {

      renderizarLiberacoes(encontradosRegistrados, releaseAtual); 

      const protocolosConcat = encontradosRegistrados
        .map(r => `#PRT${r.protocolo}`)
        .join(' ');

      if (releaseAtual) {
        try {
          const res = await fetch("https://modelo-discord-server.vercel.app/api/liberados");
          const liberados = await res.json();

          const jaExiste = liberados.some(r => r.release === releaseAtual);
          if (!jaExiste) {
            await fetch("https://modelo-discord-server.vercel.app/api/liberados", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                release: releaseAtual,
                prts: protocolosConcat
              })
            });
          }
        } catch (err) {
          console.error("Erro ao salvar liberação:", err);
        }
      }
    } else {
      // 7. Renderizar Mensagem de Nenhum Protocolo
      container.innerHTML =
        `<p class="bg-red-900 text-red-200 p-3 rounded-md flex items-center gap-3">
           <i data-lucide="alert-triangle" class="w-5 h-5"></i> Nenhum protocolo registrado foi liberado neste release!
         </p>`;
    }
     // Garante que os ícones do resultado (alerta ou tabela) apareçam
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
    }
  };

  reader.readAsText(arquivo);
}

/**
 * @description Constrói e exibe a tabela de protocolos liberados dentro do container.
 * @param {Array<Object>} registros - Lista de protocolos registrados que foram encontrados no RTF.
 * @param {string} releaseAtual - A data do release encontrada no RTF.
 */
function renderizarLiberacoes(registros, releaseAtual) {
  const container = document.querySelector("#liberacoes-container");

  container.innerHTML = ''; // Limpa antes de renderizar

  const titulo = document.createElement("h2");
  titulo.className = "text-2xl font-bold mb-4 flex items-center gap-2";
  titulo.innerHTML = `
    <i data-lucide="package-check" class="inline w-6 h-6 text-green-400"></i>
    Protocolos Liberados no Release ${releaseAtual || 'Desconhecido'}
  `;
  container.appendChild(titulo);
  
  const resumo = document.createElement("div");
  resumo.className = "bg-gray-800 p-4 rounded-xl shadow-inner mb-4";
  resumo.innerHTML = `<p class="text-sm text-gray-200">${registros.length} protocolo(s) registrado(s) foram encontrados neste release.</p>`;
  container.appendChild(resumo);


  const tabelaContainer = document.createElement("div");
  tabelaContainer.className = "overflow-x-auto max-h-[70vh]";

  const tabela = document.createElement("table");
  tabela.className = "w-full text-sm";
  tabela.innerHTML = `
    <thead class="bg-gray-700 sticky top-0">
      <tr>
        <th class="py-3 px-4 text-left font-semibold text-gray-300">Protocolo</th>
        <th class="py-3 px-4 text-left font-semibold text-gray-300">Ticket</th>
        <th class="py-3 px-4 text-left font-semibold text-gray-300">Tipo</th>
        <th class="py-3 px-4 text-left font-semibold text-gray-300">Descrição (Resumo)</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-gray-700"></tbody>
  `;

  const tbody = tabela.querySelector("tbody");
  registros.forEach(reg => {
    const isSugestao = reg.tipo === '1';
    const tipoClass = isSugestao ? 'text-green-400' : 'text-red-400';
    const tipoIcon = isSugestao ? 'Lightbulb' : 'shield-alert';
    const tipoLabel = isSugestao ? 'Sugestão' : 'Erro';

    const tr = document.createElement("tr");
    tr.className = "hover:bg-gray-800 transition duration-150";
    
    tr.innerHTML = `
      <td class="py-2 px-4 whitespace-nowrap font-mono text-blue-400">#PRT${reg.protocolo}</td>
      <td class="py-2 px-4 whitespace-nowrap">
        <a href="${reg.link || '#'}" target="_blank" class="text-blue-400 hover:text-blue-300">${reg.ticket || 'N/D'}</a>
      </td>
      <td class="py-2 px-4 whitespace-nowrap ${tipoClass} flex items-center gap-2">
          <i data-lucide="${tipoIcon}" class="w-4 h-4"></i>
          ${tipoLabel}
      </td>
      <td class="py-2 px-4 truncate max-w-xs text-gray-300" 
          title="${(reg.descricao || '').replace(/"/g, '&quot;')}"
          onclick="mostrarDescricaoModal('#PRT${reg.protocolo}', '${(reg.descricao || '').replace(/'/g, "\\'")}')"
      >
          ${reg.descricao ? reg.descricao.substring(0, 50) + '...' : 'Descrição indisponível'}
      </td>
    `;
    tbody.appendChild(tr);
  });

  tabelaContainer.appendChild(tabela);
  container.appendChild(tabelaContainer);
  
  // Garante que os ícones Lucide sejam criados na tabela
  if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
  }
}

// -----------------------------------------------------------------------
// --- FUNÇÕES DE HISTÓRICO E MODAL (Mantidas) ---
// -----------------------------------------------------------------------

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

  // Início do loading
  tbody.innerHTML = `
    <tr>
      <td colspan="3" class="text-center py-6 text-gray-400">
        <div class="flex items-center justify-center space-x-2">
          <div class="relative w-8 h-8 rounded-full">
            <div class="absolute inset-0 rounded-full border-2 border-transparent" style="background: linear-gradient(90deg, #1a1a1a 0%, #2e2e2e 20%, #444444 40%, #5a5a5a 60%, #444444 80%, #2e2e2e 90%, #1a1a1a 100%); animation: spin-soft 1.5s ease-in-out infinite;"></div>
            <div class="absolute inset-1 bg-gray-900 rounded-full"></div>
            </div>
          <span class="text-white text-lg">Aguarde, em instantes...</span>
        </div>
      </td>
    </tr>`;

  try {
    const timerPromise = new Promise(resolve => setTimeout(resolve, 2000));

    const [liberadosRes, protocolosRes] = await Promise.all([
      fetch("https://modelo-discord-server.vercel.app/api/liberados"),
      fetch("https://modelo-discord-server.vercel.app/api/protocolos"),
      timerPromise
    ]);

    const dados = await liberadosRes.json();
    const protocolos = await protocolosRes.json();

    tbody.innerHTML = "";

    if (!dados || dados.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="text-center py-6 text-gray-400 italic">
            Nenhuma liberação registrada até o momento.
          </td>
        </tr>`;
      return;
    }

    dados.forEach(reg => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-800";
      const prts = reg.prts.split(/\s+/).filter(Boolean);

      const badgesContainer = document.createElement("div");
      badgesContainer.className = "flex flex-wrap gap-2";

      prts.forEach(prt => {
        const registro = protocolos.find(p => p.prt === prt);

        const badgeSpan = document.createElement("span");
        badgeSpan.className = "px-2 py-1 rounded text-xs font-bold cursor-pointer transition hover:opacity-80";
        badgeSpan.textContent = prt;

        if (!registro) {
          badgeSpan.classList.add("bg-gray-600", "text-gray-100");
        } else {
          const isSugestao = registro.tipo === "1";
          const cor = isSugestao 
            ? "bg-green-700 text-green-100"
            : "bg-red-700 text-red-100";
          const label = isSugestao ? "Sugestão" : "Erro";

          const classes = cor.split(' ');
          badgeSpan.classList.add(...classes);
          
          badgeSpan.title = `${label}: ${registro.descricao || 'Sem descrição.'}`;

          const descricao = registro.descricao || 'Sem descrição.';
          badgeSpan.addEventListener('click', () => {
            mostrarDescricaoModal(prt, descricao);
          });
        }
        badgesContainer.appendChild(badgeSpan);
      });

      const releaseTd = document.createElement("td");
      releaseTd.className = "py-2 px-4 font-semibold whitespace-nowrap";
      releaseTd.textContent = reg.release;

      const protocolosCountTd = document.createElement("td");
      protocolosCountTd.className = "py-2 px-4 text-center whitespace-nowrap";
      protocolosCountTd.textContent = prts.length;

      const protocolosTd = document.createElement("td");
      protocolosTd.className = "py-2 px-4";
      protocolosTd.appendChild(badgesContainer);

      tr.appendChild(releaseTd);
      tr.appendChild(protocolosCountTd);
      tr.appendChild(protocolosTd);
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Erro ao carregar histórico de liberações:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="text-center py-6 text-red-400">
          Erro ao carregar os dados. Por favor, tente novamente.
        </td>
      </tr>`;
  }
}

function mostrarDescricaoModal(prt, descricao) {
  const modal = document.getElementById('descricaoModal');
  const titulo = document.getElementById('descricaoModalTitulo');
  const corpo = document.getElementById('descricaoModalCorpo');

  titulo.textContent = `Descrição do Protocolo ${prt}`;
  corpo.textContent = descricao;

  modal.classList.remove('hidden');
}

function fecharDescricaoModal() {
  const modal = document.getElementById('descricaoModal');
  modal.classList.add('hidden');
}