# Compila el frontend con Node y lo sirve con nginx (no hace falta instalar Node en la máquina).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV VITE_AUTH_URL=/ VITE_ABOGADOS_URL=/ VITE_CIUDADANOS_URL=/ VITE_ADMIN_CIUDADANOS_URL=/ VITE_ADMIN_ABOGADOS_URL=/
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
