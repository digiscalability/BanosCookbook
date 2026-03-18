FROM node:20-slim

# Install FFmpeg from apt — real binary, no bundling hacks
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --no-fund --no-audit

COPY server.js ./

ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080
CMD ["node", "server.js"]
