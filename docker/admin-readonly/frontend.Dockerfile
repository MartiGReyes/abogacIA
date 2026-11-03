# Separate frontend entrypoint: no public portal, Lexi, n8n or registration pages.
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
COPY docker/admin-readonly/frontend/index.html ./index.html
COPY docker/admin-readonly/frontend/main.tsx ./src/adminIsolatedMain.tsx
ENV VITE_AUTH_URL=/
ENV VITE_ADMIN_CIUDADANOS_URL=/
ENV VITE_ADMIN_ABOGADOS_URL=/
RUN npm run build

FROM nginx:1.27-alpine
COPY docker/admin-readonly/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
