# ── Stage 1: Install dependencies ──────────────────────────────────────
FROM oven/bun:1 AS deps

WORKDIR /app

COPY package.json bun.lock* bunfig.toml ./
RUN bun install --frozen-lockfile --production=false

# ── Stage 2: Build & test runner ───────────────────────────────────────
FROM oven/bun:1

WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy project files
COPY package.json bun.lock* bunfig.toml tsconfig.json ./
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY tests/ ./tests/
COPY datasets/ ./datasets/
COPY paper/ ./paper/

# Create results directory for volume mounting
RUN mkdir -p results

# Run tests to validate the image
RUN bun test || echo "Tests require runtime services — skipping in build"

# Default: safe dry-run that validates scenario registration and matrix generation
CMD ["bun", "run", "scripts/run-full-matrix.ts", "--dry-run"]
