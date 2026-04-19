# Usa a imagem oficial do Puppeteer que inclui todas as dependências do Chromium
FROM ghcr.io/puppeteer/puppeteer:22.10.0

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependência e instala
COPY package*.json ./
RUN npm install

# Copia o restante do código da aplicação
COPY . .

# Expõe a porta que o serviço vai usar
EXPOSE 3000

# Comando para iniciar o serviço
CMD ["npm", "start"]