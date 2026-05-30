# ─────────────────────────────────────────────────────────────
# Docling AI — Node / Express backend (backend)
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS base

WORKDIR /app

# Copy package files first (layer cache — only re-runs npm install
# when package.json actually changes, not on every code change)
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev

# Copy the rest of the Express source
COPY backend/ .

EXPOSE 3000
CMD ["npm", "start"]
