# Estágio 1: Builder - Instala dependências em um ambiente virtual
FROM python:3.10-slim AS builder

WORKDIR /app

# Cria um ambiente virtual para isolar as dependências
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copia e instala as dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Estágio 2: Final - Imagem de produção leve
FROM python:3.10-slim

WORKDIR /app

# Copia o ambiente virtual com as dependências já instaladas
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copia o código da aplicação
COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]