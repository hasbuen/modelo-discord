/**
 * Sistema de autenticação MD5 com Supabase
 * Valida a senha do usuário antes de permitir acesso ao app
 */

function toMD5(str) {
  function cmn(q, a, b, x, s, t) {
    a = (((a + q) | 0) + ((x + t) | 0)) | 0;
    return (((a << s) | (a >>> (32 - s))) + b) | 0;
  }

  function ff(a, b, c, d, x, s, t) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }

  function gg(a, b, c, d, x, s, t) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }

  function hh(a, b, c, d, x, s, t) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function ii(a, b, c, d, x, s, t) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  function md5cycle(state, block) {
    let [a, b, c, d] = state;

    a = ff(a, b, c, d, block[0], 7, -680876936);
    d = ff(d, a, b, c, block[1], 12, -389564586);
    c = ff(c, d, a, b, block[2], 17, 606105819);
    b = ff(b, c, d, a, block[3], 22, -1044525330);
    a = ff(a, b, c, d, block[4], 7, -176418897);
    d = ff(d, a, b, c, block[5], 12, 1200080426);
    c = ff(c, d, a, b, block[6], 17, -1473231341);
    b = ff(b, c, d, a, block[7], 22, -45705983);
    a = ff(a, b, c, d, block[8], 7, 1770035416);
    d = ff(d, a, b, c, block[9], 12, -1958414417);
    c = ff(c, d, a, b, block[10], 17, -42063);
    b = ff(b, c, d, a, block[11], 22, -1990404162);
    a = ff(a, b, c, d, block[12], 7, 1804603682);
    d = ff(d, a, b, c, block[13], 12, -40341101);
    c = ff(c, d, a, b, block[14], 17, -1502002290);
    b = ff(b, c, d, a, block[15], 22, 1236535329);

    a = gg(a, b, c, d, block[1], 5, -165796510);
    d = gg(d, a, b, c, block[6], 9, -1069501632);
    c = gg(c, d, a, b, block[11], 14, 643717713);
    b = gg(b, c, d, a, block[0], 20, -373897302);
    a = gg(a, b, c, d, block[5], 5, -701558691);
    d = gg(d, a, b, c, block[10], 9, 38016083);
    c = gg(c, d, a, b, block[15], 14, -660478335);
    b = gg(b, c, d, a, block[4], 20, -405537848);
    a = gg(a, b, c, d, block[9], 5, 568446438);
    d = gg(d, a, b, c, block[14], 9, -1019803690);
    c = gg(c, d, a, b, block[3], 14, -187363961);
    b = gg(b, c, d, a, block[8], 20, 1163531501);
    a = gg(a, b, c, d, block[13], 5, -1444681467);
    d = gg(d, a, b, c, block[2], 9, -51403784);
    c = gg(c, d, a, b, block[7], 14, 1735328473);
    b = gg(b, c, d, a, block[12], 20, -1926607734);

    a = hh(a, b, c, d, block[5], 4, -378558);
    d = hh(d, a, b, c, block[8], 11, -2022574463);
    c = hh(c, d, a, b, block[11], 16, 1839030562);
    b = hh(b, c, d, a, block[14], 23, -35309556);
    a = hh(a, b, c, d, block[1], 4, -1530992060);
    d = hh(d, a, b, c, block[4], 11, 1272893353);
    c = hh(c, d, a, b, block[7], 16, -155497632);
    b = hh(b, c, d, a, block[10], 23, -1094730640);
    a = hh(a, b, c, d, block[13], 4, 681279174);
    d = hh(d, a, b, c, block[0], 11, -358537222);
    c = hh(c, d, a, b, block[3], 16, -722521979);
    b = hh(b, c, d, a, block[6], 23, 76029189);
    a = hh(a, b, c, d, block[9], 4, -640364487);
    d = hh(d, a, b, c, block[12], 11, -421815835);
    c = hh(c, d, a, b, block[15], 16, 530742520);
    b = hh(b, c, d, a, block[2], 23, -995338651);

    a = ii(a, b, c, d, block[0], 6, -198630844);
    d = ii(d, a, b, c, block[7], 10, 1126891415);
    c = ii(c, d, a, b, block[14], 15, -1416354905);
    b = ii(b, c, d, a, block[5], 21, -57434055);
    a = ii(a, b, c, d, block[12], 6, 1700485571);
    d = ii(d, a, b, c, block[3], 10, -1894986606);
    c = ii(c, d, a, b, block[10], 15, -1051523);
    b = ii(b, c, d, a, block[1], 21, -2054922799);
    a = ii(a, b, c, d, block[8], 6, 1873313359);
    d = ii(d, a, b, c, block[15], 10, -30611744);
    c = ii(c, d, a, b, block[6], 15, -1560198380);
    b = ii(b, c, d, a, block[13], 21, 1309151649);
    a = ii(a, b, c, d, block[4], 6, -145523070);
    d = ii(d, a, b, c, block[11], 10, -1120210379);
    c = ii(c, d, a, b, block[2], 15, 718787259);
    b = ii(b, c, d, a, block[9], 21, -343485551);

    state[0] = (state[0] + a) | 0;
    state[1] = (state[1] + b) | 0;
    state[2] = (state[2] + c) | 0;
    state[3] = (state[3] + d) | 0;
  }

  function md5blk(bytes, start) {
    const out = new Array(16);
    for (let i = 0; i < 16; i += 1) {
      const offset = start + i * 4;
      out[i] = bytes[offset]
        | (bytes[offset + 1] << 8)
        | (bytes[offset + 2] << 16)
        | (bytes[offset + 3] << 24);
    }
    return out;
  }

  function md51(input) {
    const bytes = new TextEncoder().encode(String(input));
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i;

    for (i = 64; i <= bytes.length; i += 64) {
      md5cycle(state, md5blk(bytes, i - 64));
    }

    const tail = new Array(16).fill(0);
    const remaining = bytes.length - (i - 64);
    for (let j = 0; j < remaining; j += 1) {
      tail[j >> 2] |= bytes[i - 64 + j] << ((j % 4) << 3);
    }
    tail[remaining >> 2] |= 0x80 << ((remaining % 4) << 3);

    if (remaining > 55) {
      md5cycle(state, tail);
      tail.fill(0);
    }

    const bitLength = bytes.length * 8;
    tail[14] = bitLength & 0xffffffff;
    tail[15] = Math.floor(bitLength / 0x100000000);
    md5cycle(state, tail);
    return state;
  }

  function toHex(value) {
    let output = "";
    for (let i = 0; i < 4; i += 1) {
      output += (`0${((value >> (i * 8)) & 0xff).toString(16)}`).slice(-2);
    }
    return output;
  }

  return md51(str).map(toHex).join("");
}

function hasActiveAuthSession() {
  const token = localStorage.getItem('authToken');
  const tempo = localStorage.getItem('authTime');

  if (!token || !tempo) {
    return false;
  }

  const agora = new Date();
  const loginTime = new Date(tempo);
  const diffMs = agora - loginTime;
  const diffHoras = diffMs / (1000 * 60 * 60);
  return diffHoras < 24;
}

function broadcastAuthState(authenticated) {
  window.dispatchEvent(new CustomEvent('protocord:auth-changed', {
    detail: { authenticated: Boolean(authenticated) },
  }));
}

/**
 * Valida a senha contra a API
 */
async function validarSenha() {
  const senhaInput = document.getElementById('auth-senha');
  const senha = senhaInput.value.trim();
  const btnAuth = document.getElementById('btn-auth-submit');
  const msgErro = document.getElementById('auth-erro');

  if (!btnAuth) {
      return; // Sai da função para evitar o erro de null
  }
  
  if (!senha) {
    msgErro.textContent = 'Por favor, insira a senha.';
    msgErro.classList.remove('hidden');
    return;
  }

  // Desabilita botão e mostra loading
  btnAuth.disabled = true;
  btnAuth.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Autenticando...';
  // Recria os ícones do lucide após a atualização do innerHTML
  window.requestLucideIcons?.();
  msgErro.classList.add('hidden');

  try {
    // Converte a senha em texto plano para MD5 antes de enviar
    const senhamd5 = toMD5(senha);

    // Faz requisição GET para a API no Vercel, passando o hash MD5 na query string
    const response = await fetch(window.getProtocordApiUrl(`/autenticacao?pass=${encodeURIComponent(senhamd5)}`), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        throw new Error(`Erro de rede: ${response.status} ${response.statusText}`);
    }

    // A API retorna um booleano (true ou false)
    const resultado = await response.json(); 

    if (resultado === true) {
      // Autenticação bem-sucedida
      localStorage.setItem('authToken', 'authenticated-' + Date.now());
      localStorage.setItem('authTime', new Date().toISOString());
      
      // Esconde a tela de login e mostra o app
      const authContainer = document.getElementById('auth-container');
      if (authContainer) authContainer.classList.add('hidden');
      
      // Limpa o input
      senhaInput.value = '';
      broadcastAuthState(true);
    } else {
      // Autenticação falhou
      msgErro.textContent = 'Senha incorreta. Tente novamente.';
      msgErro.classList.remove('hidden');
      broadcastAuthState(false);
    }
  } catch (error) {
    msgErro.textContent = 'Erro ao conectar com o servidor. Tente novamente.';
    msgErro.classList.remove('hidden');
    broadcastAuthState(false);
  } finally {
    // Re-habilita bot?o
    btnAuth.disabled = false;
    btnAuth.innerHTML = '<i data-lucide="log-in" class="w-4 h-4"></i> Entrar';
    window.requestLucideIcons?.();
  }
}

/**
 * Inicializa o sistema de autenticação ao carregar a página
 */
function initAuth() {
  const authContainer = document.getElementById('auth-container');
  const appContainers = [
    document.getElementById('desktop-header'),
    document.getElementById('sidebar'),
    document.getElementById('mobile-sidebar'),
    document.getElementById('main-content')
  ].filter(Boolean);

  if (hasActiveAuthSession()) {
    if (authContainer) authContainer.classList.add('hidden');
    appContainers.forEach((el) => el.classList.remove('hidden'));
    broadcastAuthState(true);
    return;
  } else {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authTime');
  }

  // Mostra tela de login
  if (authContainer) authContainer.classList.remove('hidden');
  appContainers.forEach((el) => el.classList.remove('hidden'));
  broadcastAuthState(false);

  // Adiciona listener de SUBMIT ao formulário
  const authForm = document.getElementById('auth-form');
  if (authForm) {
      authForm.addEventListener('submit', (e) => {
          e.preventDefault(); // Previne o comportamento padrão do form
          validarSenha();
      });
  }

  // Adiciona listener para Enter na input de senha (redundância segura)
  const senhaInput = document.getElementById('auth-senha');
  if (senhaInput) {
    senhaInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault(); 
        validarSenha();
      }
    });
  }
}

/**
 * Faz logout (limpa a sessão)
 */
function fazerLogout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('authTime');
  broadcastAuthState(false);
  location.reload();
}

window.hasActiveAuthSession = hasActiveAuthSession;

// Executa ao carregar a p?gina
window.addEventListener('DOMContentLoaded', initAuth);

