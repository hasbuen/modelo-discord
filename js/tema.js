<<<<<<< HEAD
=======
// Alterna o estado desta funcionalidade (alternar tema).
>>>>>>> a0026365360ce715e3d1e15751d8b3a97946f621
export function alternarTema(tema) {
  const html = document.documentElement;
  const botoesTema = document.querySelectorAll('.toggle-theme-btn');
  botoesTema.forEach(btn => btn.classList.remove('active'));

  if (tema === 'system') {
    localStorage.removeItem('theme');
    html.removeAttribute('data-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const botaoPreferido = document.getElementById(prefersDark ?'tema-escuro' : 'tema-claro');
    if (botaoPreferido) botaoPreferido.classList.add('active');
  } else {
    localStorage.setItem('theme', tema);
    html.setAttribute('data-theme', tema);
    const botaoTema = document.getElementById(`tema-${tema}`);
    if (botaoTema) botaoTema.classList.add('active');
  }
}

<<<<<<< HEAD
=======
// Carrega ou restaura dados usados por esta funcionalidade (carregar tema preferido).
>>>>>>> a0026365360ce715e3d1e15751d8b3a97946f621
export function carregarTemaPreferido() {
  const temaSalvo = localStorage.getItem('theme');
  const html = document.documentElement;

  if (temaSalvo) {
    html.setAttribute('data-theme', temaSalvo);
    const botaoTema = document.getElementById(`tema-${temaSalvo}`);
    if (botaoTema) botaoTema.classList.add('active');
  } else {
    html.removeAttribute('data-theme');
    const botaoSistema = document.getElementById('tema-sistema');
    if (botaoSistema) botaoSistema.classList.add('active');
  }
}
