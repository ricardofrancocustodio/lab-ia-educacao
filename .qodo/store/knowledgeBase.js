// 📁 .qodo/store/knowledgeBase.js
// Esta é a sua base de conhecimento. 
// Basta adicionar novos objetos a esta lista para "ensinar" o bot.

module.exports = [
  {
    // Palavras-chave que o bot procurará
    keywords: ["missão", "valores", "propósito", "filosofia da escola"],
    // A resposta exata que o bot dará
    answer: "A nossa missão na Escola Alvacir Vite Rossi é [texto completo da sua missão aqui]..."
  },
  {
    keywords: ["provas", "avaliações", "exames", "difíceis", "dificuldade da prova"],
    answer: "O nosso sistema de avaliação é [texto sobre como funcionam as provas]. Entendemos que a 'dificuldade' é relativa, mas focamos numa avaliação [contínua/formativa/etc.]."
  },
  {
    keywords: ["horários", "turno", "hora de entrada", "hora de saída"],
    answer: "O turno da manhã (Fundamental I e II) vai das 7h30 às 12h. O turno da tarde (Educação Infantil) vai das 13h às 17h30."
  },
  {
    keywords: ["preço", "mensalidade", "valor", "custo", "caro"],
    answer: "Para informações sobre valores de mensalidade e propóstas pedagógicas, pedimos que agende uma visita. A coordenadora poderá explicar tudo em detalhe."
  }
  // ... adicione quantas perguntas e respostas quiser
];