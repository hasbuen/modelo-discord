function abrirArquivoRTF() {
  document.getElementById('arquivoRTF').click();
}

async function processarRTF(event) {
  const arquivo = event.target.files[0];
  if (!arquivo) return;
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

    const container = document.getElementById('liberacoes-container');
    container.innerHTML = "";
    const encontradosRegistrados = resultados.filter(r => r.estaRegistrado);

    if (encontradosRegistrados.length) {
      renderizarLiberacoes(encontradosRegistrados);

      const protocolosConcat = encontradosRegistrados
        .map(r => `#PRT${r.protocolo}`)
        .join(' ');

      if (releaseAtual) {
        try {
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

  // Início do loading
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center py-6 text-gray-400">
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

      const badgesContainer = document.createElement("div");
      badgesContainer.className = "flex flex-wrap gap-2";

      prts.forEach(prt => {
        const registro = protocolos.find(p => p.prt === prt);
        
        const badgeSpan = document.createElement("span");
        badgeSpan.className = "px-2 py-1 rounded text-xs font-bold";
        badgeSpan.textContent = prt;

        if (!registro) {
          badgeSpan.classList.add("bg-gray-600", "text-gray-100");
        } else {
          const cor = registro.tipo === "1"
            ? "bg-green-700 text-green-100"
            : "bg-red-700 text-red-100";
          const label = registro.tipo === "1" ? "Sugestão" : "Erro";
          badgeSpan.classList.add(cor);
          badgeSpan.title = label;

          const descricao = registro.descricao || 'Sem descrição.';
          badgeSpan.addEventListener('click', () => {
            mostrarDescricaoModal(prt, descricao);
          });
        }
        badgesContainer.appendChild(badgeSpan);
      });

      const releaseTd = document.createElement("td");
      releaseTd.className = "py-2 px-3 font-semibold";
      releaseTd.textContent = reg.release;

      const protocolosTd = document.createElement("td");
      protocolosTd.className = "py-2 px-3 flex flex-wrap gap-2";
      protocolosTd.appendChild(badgesContainer);

      tr.appendChild(releaseTd);
      tr.appendChild(protocolosTd);
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Erro ao carregar histórico de liberações:", err);
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

// ARQUIVO: seu modal deve estar aqui
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
