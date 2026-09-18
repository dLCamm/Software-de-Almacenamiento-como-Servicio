FROM python:3.12-slim

# Evita archivos .pyc
ENV PYTHONDONTWRITEBYTECODE=1

# Hace que los logs aparezcan inmediatamente
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Dependencias
COPY requirements.txt .

RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Código fuente
COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]