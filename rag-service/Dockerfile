FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY pyproject.toml ./
RUN pip install --no-cache-dir .

COPY src/ ./src/
COPY data/ ./data/

EXPOSE 8000

CMD ["python", "-m", "src.main"]
