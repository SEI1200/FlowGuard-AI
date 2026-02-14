FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends wget fontconfig fonts-ipaexfont \
    && mkdir -p /app/fonts \
    && ( wget -q -O /app/fonts/NotoSansCJK.ttc "https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/OTC/NotoSansCJK-Regular.ttc" && test -s /app/fonts/NotoSansCJK.ttc ) \
    || ( apt-get install -y --no-install-recommends fonts-noto-cjk 2>/dev/null && fc-cache -fv && F=$(find /usr/share/fonts -type f -name "NotoSansCJK*.ttc" 2>/dev/null | head -1) && [ -n "$F" ] && cp "$F" /app/fonts/NotoSansCJK.ttc ) \
    || true \
    && ( F=$(find /usr/share/fonts -type f -name "*.ttf" -path "*ipaex*" 2>/dev/null | head -1) && [ -n "$F" ] && cp "$F" /app/fonts/ipaex.ttf ) || true \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

ENV PORT=8080
EXPOSE 8080

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
