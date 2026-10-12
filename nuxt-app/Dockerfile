# Frontend Finka (Nuxt 2, mode SPA)
# Node 20 sengaja dipakai: Nuxt 2 / webpack 4 butuh OpenSSL legacy di Node 17+.
FROM node:20-alpine
ENV NODE_ENV=production \
    NODE_OPTIONS=--openssl-legacy-provider \
    HOST=0.0.0.0 \
    NUXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY package.json package-lock.json ./
RUN NODE_ENV=development npm ci
COPY . .
RUN npm run build
EXPOSE 3000
# API_BASE_URL dibaca saat start, tidak perlu build ulang bila berubah.
CMD ["npm", "start"]
