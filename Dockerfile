# Multi-stage build: QuestKids unified image
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json .
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM python:3.12-slim
WORKDIR /app

# Install nginx and supervisor
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx supervisor \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .

# Copy frontend build
COPY --from=frontend-build /app/dist /usr/share/nginx/html

# Configure nginx
RUN rm /etc/nginx/sites-enabled/default 2>/dev/null || true
COPY nginx-app.conf /etc/nginx/conf.d/default.conf

# Setup supervisord
COPY supervisord-app.conf /etc/supervisor/conf.d/supervisord.conf

ENV PYTHONPATH=/app
RUN mkdir -p /app/persistent /app/uploads

EXPOSE 80

CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
