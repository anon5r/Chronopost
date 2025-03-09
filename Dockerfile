FROM node:20-slim AS base

# Install pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install system dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS development
WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy packages
COPY packages/ ./packages/

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Generate Prisma client
RUN cd packages/database && pnpm prisma generate

# Expose ports
# Cloudflare Workers
EXPOSE 8787
# Prisma Studio
EXPOSE 5555

# Set development environment
ENV NODE_ENV=development

# Start development server
CMD ["pnpm", "dev"]
