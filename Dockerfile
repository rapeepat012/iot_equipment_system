FROM php:8.2-cli

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev default-libmysqlclient-dev \
    && docker-php-ext-install pdo pdo_mysql pdo_pgsql \
    && rm -rf /var/lib/apt/lists/*

COPY . .

ENV PORT=10000

CMD ["sh", "-c", "php -S 0.0.0.0:${PORT} -t ."]

