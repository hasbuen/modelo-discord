/**
 * Sistema de Autenticação MD5 com Supabase
 * Valida a senha do usuário antes de permitir acesso ao app
 */
const API_ENDPOINT = 'https://modelo-discord-server.vercel.app/api/autenticacao';

/**
 * Converte string para MD5 usando crypto-js
 * @param {string} str - string para converter
 * @returns {string} hash MD5
 */
function toMD5(str) {
  // Assumimos que CryptoJS está carregado via <script> tag no HTML
  return CryptoJS.MD5(str).toString();
}

/**
 * Valida a senha contra a API
 */
async function validarSenha() {
  const senhaInput = document.getElementById('auth-senha');
  const senha = senhaInput.value.trim();
  const btnAuth = document.getElementById('btn-auth-submit');
  const msgErro = document.getElementById('auth-erro');

  if (!senha) {
    msgErro.textContent = 'Por favor, insira a senha.';
    msgErro.classList.remove('hidden');
    return;
  }

  // Desabilita botão e mostra loading
  btnAuth.disabled = true;
  btnAuth.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Autenticando...';
  // Recria os ícones do lucide após a atualização do innerHTML
  lucide.createIcons(); 
  msgErro.classList.add('hidden');

  try {
    // Converte a senha em texto plano para MD5 antes de enviar
    const senhamd5 = toMD5(senha);

    // Faz requisição GET para a API no Vercel, passando o hash MD5 na query string
    const response = await fetch(`${API_ENDPOINT}?pass=${encodeURIComponent(senhamd5)}`, {
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
      document.getElementById('auth-container').classList.add('hidden');
      document.querySelector('.max-w-6xl').classList.remove('hidden');
      
      // Limpa o input
      senhaInput.value = '';
    } else {
      // Autenticação falhou
      msgErro.textContent = 'Senha incorreta. Tente novamente.';
      msgErro.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Erro ao autenticar:', error);
    msgErro.textContent = 'Erro ao conectar com o servidor. Tente novamente.';
    msgErro.classList.remove('hidden');
  } finally {
    // Re-habilita botão
    btnAuth.disabled = false;
    btnAuth.innerHTML = '<i data-lucide="log-in" class="w-4 h-4"></i> Entrar';
    lucide.createIcons();
  }
}

/**
 * Inicializa o sistema de autenticação ao carregar a página
 */
function initAuth() {
  const token = localStorage.getItem('authToken');
  const tempo = localStorage.getItem('authTime');

  if (token && tempo) {
    const agora = new Date();
    const loginTime = new Date(tempo);
    const diffMs = agora - loginTime;
    const diffHoras = diffMs / (1000 * 60 * 60);

    if (diffHoras < 24) {
      document.getElementById('auth-container').classList.add('hidden');
      document.querySelector('.max-w-6xl').classList.remove('hidden');
      return;
    } else {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authTime');
    }
  }

  // Mostra tela de login
  const authContainer = document.getElementById('auth-container');
  const appContainer = document.querySelector('.max-w-6xl');
  
  if (authContainer) authContainer.classList.remove('hidden');
  if (appContainer) appContainer.classList.add('hidden');

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
  location.reload();
}

// Executa ao carregar a página
window.addEventListener('DOMContentLoaded', initAuth);
