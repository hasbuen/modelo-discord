let registrosCache = [];

<<<<<<< HEAD
=======
// Carrega ou restaura dados usados por esta funcionalidade (carregar registros protocolos).
>>>>>>> a0026365360ce715e3d1e15751d8b3a97946f621
export async function carregarRegistrosProtocolos() {
  if (registrosCache.length > 0) return registrosCache;
  try {
    const res = await fetch(window.getProtocordApiUrl("/protocolos"));
    const data = await res.json();
    data.sort((a, b) => b.id - a.id);
    registrosCache = data;
    return registrosCache;
  } catch {
    return [];
  }
}

export const resetCache = () => { registrosCache = []; };
