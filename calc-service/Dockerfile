# Verdict Astrology — PyJHora calculation service
# Build from the REPO ROOT (needs the PyJHora-main folder, which is not in
# git — download it next to this repo first):
#   docker build -f calc-service/Dockerfile -t astroapp-calc .

FROM python:3.12-slim
WORKDIR /srv

# pyswisseph ships no wheel for this platform; it compiles from source and
# needs a full C toolchain incl. the libc headers (math.h etc.)
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY calc-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# PyJHora library source (incl. its ephemeris data files)
COPY PyJHora-main/PyJHora-main/src/jhora /srv/pyjhora/jhora
ENV PYJHORA_SRC=/srv/pyjhora

COPY calc-service/app.py .

EXPOSE 8087
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8087"]
