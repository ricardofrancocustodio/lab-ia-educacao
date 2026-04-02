# Usa uma base Debian slim para evitar incompatibilidades com dependencias nativas.
FROM node:20-bookworm-slim

# DiretÃ³rio dentro do container
WORKDIR /app

# Copia apenas package.json + lock para otimizar build
COPY package*.json ./

# Instala dependencias em modo producao e limpa o cache do npm.
RUN npm ci --omit=dev && npm cache clean --force

# Copia o resto do projeto
COPY . .

# Define ambiente de producao
ENV NODE_ENV=production
ENV PORT=8080

# Cloud Run injeta PORT=8080 por padrao, mas deixamos a imagem consistente.
EXPOSE 8080


# Comando de inicializaÃ§Ã£o
CMD ["npm", "start"]

