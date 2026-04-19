# Estágio de Build (Node)
# Usando uma versão LTS (Long-Term Support) do Node para estabilidade.
FROM node:20-alpine AS build

# Define o diretório de trabalho dentro do container.
WORKDIR /app

# 1. Copia os arquivos de manifesto de pacotes.
# O '*' garante que tanto package.json quanto package-lock.json sejam copiados.
# Isso otimiza o cache do Docker. A camada de 'npm install' só será reconstruída
# se houver mudanças nesses arquivos.
COPY package*.json ./

# 2. Instala as dependências.
# 'npm install' é mais robusto para ambientes de build onde o package-lock.json pode não estar presente.
# Ele irá criar um se necessário, com base no package.json.
RUN npm install

# 3. Copia o restante dos arquivos da aplicação.
# Isso inclui o código-fonte, vite.config.js, etc.
COPY . .

# 4. Executa o build da aplicação.
# O Vite irá compilar o React e gerar os arquivos estáticos na pasta /app/dist.
RUN npm run build

# Estágio de Produção (Nginx)
# Usando uma imagem leve do Nginx.
FROM nginx:1.25-alpine

# Copia os arquivos estáticos gerados no estágio de build para o diretório do Nginx.
COPY --from=build /app/dist /usr/share/nginx/html

# Copia o arquivo de configuração do Nginx que foi copiado para o estágio de build.
COPY --from=build /app/src/nginx.conf /etc/nginx/conf.d/default.conf

# Expõe a porta 80 para o tráfego HTTP.
EXPOSE 80

# Comando para iniciar o servidor Nginx em primeiro plano.
CMD ["nginx", "-g", "daemon off;"]