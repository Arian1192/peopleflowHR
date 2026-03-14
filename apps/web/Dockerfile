# Usamos slim para evitar el error de certificados TLS de alpine
FROM node:22-slim as base
WORKDIR /app

# Declaramos el ARG para que Next.js pueda "ver" la variable durante el build
ARG NEXT_PUBLIC_API_BASE_URL

COPY package.json ./package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm install

COPY apps/web ./apps/web
WORKDIR /app/apps/web

# Pasamos el ARG a la variable de entorno que Next.js espera
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
# Forzamos a Next.js a escuchar en todas las interfaces
ENV HOSTNAME="0.0.0.0"

RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
