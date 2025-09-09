let registrosCache = [];

export async function carregarRegistrosProtocolos() {
  if (registrosCache.length > 0) return registrosCache;
  try {
    const res = await fetch("https://modelo-discord-server.vercel.app/api/protocolos");
    const data = await res.json();
    data.sort((a, b) => b.id - a.id);
    registrosCache = data;
    return registrosCache;
  } catch {
    return [];
  }
}

export const resetCache = () => { registrosCache = []; };
