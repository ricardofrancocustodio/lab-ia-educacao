const fs = require("fs");
const path = require("path");

function estruturaJson(basePath) {
  const resultado = {};
  const itens = fs.readdirSync(basePath);

  itens.forEach(item => {
    const fullPath = path.join(basePath, item);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      resultado[item] = estruturaJson(fullPath); // recursão para subpastas
    } else {
      resultado[item] = "file"; // marca como arquivo
    }
  });

  return resultado;
}

// Caminho do projeto
const projetoPath = "../.qodo";

// Gera a estrutura
const estrutura = estruturaJson(projetoPath);

// Salva em arquivo JSON
fs.writeFileSync("../.qodo/store/data/estrutura.json", JSON.stringify(estrutura, null, 2), "utf-8");

console.log("Estrutura salva em estrutura.json!");
