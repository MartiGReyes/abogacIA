FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
ENV VITE_AUTH_URL=/ VITE_ADMIN_CIUDADANOS_URL=/ VITE_ADMIN_ABOGADOS_URL=/
RUN npm run build:admin
FROM nginx:1.27-alpine
COPY docker/admin-habitual/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist-admin /usr/share/nginx/html
EXPOSE 80
