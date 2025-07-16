FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.13.0

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy shared package files
COPY packages/shared/package.json ./packages/shared/
COPY packages/frontend/package.json ./packages/frontend/

# Install dependencies using pnpm
RUN pnpm install

# Copy application code
COPY packages/shared ./packages/shared
COPY packages/frontend ./packages/frontend

# Expose port
EXPOSE 5173

# Command to run the application
CMD ["pnpm", "--filter", "frontend", "dev", "--host"]