# Multi-stage build: QuestKids unified image
# Stage 1: Build backend (Python)
FROM python:3.12-slim AS backend-build
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
ENV PYTHONPATH=/app
RUN mkdir -p /app/data /app/uploads
RUN chmod +x docker-entrypoint.sh

# Stage 2: Build frontend (Node/TypeScript)
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json .
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 3: Final nginx with backend + frontend
FROM nginx:alpine

# Install supervisord to run nginx + uvicorn
RUN apk add --no-cache python3 py3-pip supervisor

# Copy backend
COPY --from=backend-build /app /app/backend
RUN pip install --no-cache-dir --break-system-packages -r /app/backend/requirements.txt

# Copy frontend build
COPY --from=frontend-build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Supervisord config to run both services
RUN mkdir -p /etc/supervisor/conf.d
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
