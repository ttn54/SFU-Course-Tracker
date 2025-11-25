# --- Stage 1: The Builder ---
FROM node:18-alpine AS builder

WORKDIR /app

COPY frontend/package*.json ./
COPY frontend/tsconfig.json ./
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate

COPY frontend/ .
RUN npm run build

# --- Stage 2: The Runner ---
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSH and set the password for root user
RUN apk add openssh \
    && echo "root:Docker!" | chpasswd \
    && chmod +x /usr/sbin/sshd

# Copy the sshd_config file to enable SSH
COPY frontend/sshd_config /etc/ssh/

# Copy initialization script
COPY frontend/init.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/init.sh

COPY frontend/package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production
RUN npx prisma generate

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Expose both app and SSH ports
EXPOSE 8000 2222

# Start both SSH and the app
CMD ["/usr/local/bin/init.sh"]