FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (needed for compiling certain python packages like pandas/numpy if no wheels exist)
RUN apt-get update && apt-get install -y gcc g++ libc-dev libffi-dev && rm -rf /var/lib/apt/lists/*

# Install python dependencies first for caching purposes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Ensure yfinance and other implicit requirements are met
RUN pip install yfinance pandas scipy statsmodels pypdf2 tabulate

# Copy application source
COPY . .

# Expose port
EXPOSE 8000

# Start server
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
