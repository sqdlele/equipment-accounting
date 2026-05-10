# Stage 1: Build React
FROM node:20-alpine AS frontend_builder
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Nginx serving React + proxy to Django
FROM nginx:alpine
COPY --from=frontend_builder /app/frontend/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
