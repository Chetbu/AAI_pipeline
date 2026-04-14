# ── Stage 1: build the React frontend ───────────────────────────────────────
FROM node:22-alpine AS frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python runtime ──────────────────────────────────────────────────
FROM python:3.13-slim

WORKDIR /app

# Install uv for fast dependency resolution
RUN pip install --no-cache-dir uv

# Install Python dependencies (no editable install in prod)
COPY pyproject.toml ./
COPY src/ src/
RUN uv pip install --system --no-cache .

# Copy CLI entry point
COPY main.py ./

# Copy the built frontend into the location FastAPI expects
COPY --from=frontend-builder /frontend/dist ./frontend/dist

# data/ is mounted as a volume at runtime — just ensure the dir exists
RUN mkdir -p data

EXPOSE 8742

CMD ["python", "main.py", "serve", "--host", "0.0.0.0", "--port", "8742"]
