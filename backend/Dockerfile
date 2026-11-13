# ASURA DEFENSE CORE: one lightweight FastAPI worker, no local ML models.
FROM python:3.11-slim-bookworm

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 PORT=10000
WORKDIR /app

# Signed official apt packages and Aqua Security apt repository.
# Trivy is installed for version/health diagnostics ONLY. Never download
# vulnerability DBs or run full scans in this 512 MB coordinator.
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates curl jq yara gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor -o /etc/apt/keyrings/trivy.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb generic main" > /etc/apt/sources.list.d/trivy.list && \
    apt-get update && apt-get install -y --no-install-recommends trivy && \
    apt-get purge -y --auto-remove gnupg && \
    rm -rf /var/lib/apt/lists/* /root/.cache/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . ./
RUN useradd -u 10001 -m asura && chown -R asura:asura /app
USER asura

EXPOSE 10000
HEALTHCHECK --interval=60s --timeout=5s --start-period=20s --retries=2 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:10000/health', timeout=3).read()" || exit 1

CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1 --limit-concurrency 8 --timeout-keep-alive 5"]
