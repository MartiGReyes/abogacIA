FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
ENV VITE_AUTH_URL=/ VITE_ABOGADOS_URL=/ VITE_CIUDADANOS_URL=/
RUN npm run build
FROM nginx:1.27-alpine
COPY docker/contacto-operativo-test/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
