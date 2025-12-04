/**
 * Sistema de Autenticação MD5 com Supabase
 * Valida a senha do usuário antes de permitir acesso ao app
 */
const API_ENDPOINT = 'https://modelo-discord-server.vercel.app/api/autenticacao';

// Assegure-se de que a biblioteca CryptoJS foi carregada antes deste script
// Isso é garantido pela tag <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script> no seu HTML.

/**
 * Converte string para MD5 usando crypto-js
 * @param {string} str - string para converter
 * @returns {string} hash MD5
 */
function toMD5(str) {
  return CryptoJS.MD5(str).toString();
}

/**
 * Valida a senha contra a API
 * @param {string} password - senha em texto plano
 */
async function validarSenha() {
  const senhaInput = document.getElementById('auth-senha');
  const senha = senhaInput.value.trim();
  const btnAuth = document.querySelector('#auth-form button');
  const msgErro = document.getElementById('auth-erro');

  if (!senha) {
    msgErro.textContent = 'Por favor, insira a senha.';
    msgErro.classList.remove('hidden');
    return;
  }

  // Desabilita botão e mostra loading
  btnAuth.disabled = true;
  btnAuth.textContent = 'Autenticando...';
  msgErro.classList.add('hidden');

  try {
    // Converte para MD5
    const senhamd5 = toMD5(senha);

    // Faz requisição GET para a API Supabase/Vercel
    // OBS: O endpoint do Vercel DEVE estar configurado para aceitar o parâmetro 'pass'
    const response = await fetch(`${API_ENDPOINT}?pass=${encodeURIComponent(senhamd5)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        // Trata erros HTTP (ex: 404, 500) do endpoint Vercel
        throw new Error(`Erro de rede: ${response.status} ${response.statusText}`);
    }

    const resultado = await response.json();

    // resultado é true ou false (conforme o endpoint fornecido)
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
    btnAuth.textContent = 'Entrar';
  }
}

/**
 * Inicializa o sistema de autenticação ao carregar a página
 */
function initAuth() {
  // Verifica se o usuário já está autenticado nesta sessão
  const token = localStorage.getItem('authToken');
  const tempo = localStorage.getItem('authTime');

  if (token && tempo) {
    // Valida se a sessão não expirou (24 horas por padrão)
    const agora = new Date();
    const loginTime = new Date(tempo);
    const diffMs = agora - loginTime;
    const diffHoras = diffMs / (1000 * 60 * 60);

    if (diffHoras < 24) {
      // Sessão válida, esconde login e mostra app
      document.getElementById('auth-container').classList.add('hidden');
      document.querySelector('.max-w-6xl').classList.remove('hidden');
      return;
    } else {
      // Sessão expirada, limpa localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('authTime');
    }
  }

  // Mostra tela de login
  const authContainer = document.getElementById('auth-container');
  const appContainer = document.querySelector('.max-w-6xl');
  
  if (authContainer) authContainer.classList.remove('hidden');
  if (appContainer) appContainer.classList.add('hidden');

  // Adiciona listener para Enter na input de senha
  const senhaInput = document.getElementById('auth-senha');
  if (senhaInput) {
    senhaInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        // Previne a submissão padrão se for um form
        e.preventDefault(); 
        validarSenha();
      }
    });
  }

  // ⭐ NOVO/CORRIGIDO: Adiciona o listener de evento de SUBMIT ao formulário
  const authForm = document.getElementById('auth-form');
  if (authForm) {
      authForm.addEventListener('submit', (e) => {
          e.preventDefault();
          validarSenha();
      });
  }
}

/**
 * Faz logout (limpa a sessão)
 */
function fazerLogout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('authTime');
  // Recarrega a página para voltar à tela de login
  location.reload(); 
}

// Executa ao carregar a página
// O DOMContentLoaded garante que o HTML está pronto antes de tentar manipular elementos
window.addEventListener('DOMContentLoaded', initAuth);
