FROM php:8.4-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git curl zip unzip libpq-dev libzip-dev libicu-dev libgd-dev \
    libonig-dev libxml2-dev libcurl4-openssl-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql zip intl gd bcmath opcache pcntl \
    && pecl install redis && docker-php-ext-enable redis \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy existing application
# --chown ishlatiladi: alohida `RUN chown -R` butun daraxtni ikkinchi qatlamga
# qayta yozib, image hajmini ilova hajmicha bekorga oshirardi.
COPY --chown=www-data:www-data ./backend /var/www

USER www-data

EXPOSE 9000
CMD ["php-fpm"]
