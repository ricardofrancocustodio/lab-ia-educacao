# Usa uma imagem leve e estÃ¡vel do Node
FROM node:20-alpine

# DiretÃ³rio dentro do container
WORKDIR /app

# Copia apenas package.json + lock para otimizar build
COPY package*.json ./

# Instala dependÃªncias em modo produÃ§Ã£o
RUN npm ci --omit=dev

# Copia o resto do projeto
COPY . .

# Define ambiente de produÃ§Ã£o
ENV NODE_ENV=production

# Cloud Run vai usar a variÃ¡vel PORT automaticamente
EXPOSE 8084


# Comando de inicializaÃ§Ã£o
CMD ["npm", "start"]

