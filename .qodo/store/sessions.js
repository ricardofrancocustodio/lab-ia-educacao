// 📁 .qodo/store/sessions.js

// Armazenamento em memória (RAM)
// Chave: Telefone (from), Valor: Objeto de Sessão
const sessions = new Map();

// ⏳ TEMPO PARA EXPIRAR A SESSÃO (Ex: 30 minutos)
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; 

function getSession(from) {
  const session = sessions.get(from);
  
  if (!session) return null;

  // VERIFICA SE JÁ EXPIROU ⏰
  const now = Date.now();
  if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
      console.log(`💀 [SESSÃO] Expirada para ${from} (Inatividade > 30min). Limpando...`);
      sessions.delete(from);
      return null; // Retorna nulo, como se fosse uma conversa nova
  }

  return session;
}

function setSession(from, data) {
  // Sempre atualiza o carimbo de tempo (lastActivity)
  sessions.set(from, { 
      ...data, 
      lastActivity: Date.now() // 👇 Marca a hora da última interação
  });
}

function clearSession(from) {
  sessions.delete(from);
}

module.exports = { getSession, setSession, clearSession };

