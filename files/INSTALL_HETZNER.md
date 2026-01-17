# 🚀 УСТАНОВКА CIRCLESPACE НА HETZNER CLOUD (UBUNTU)

Полная инструкция по установке социальной сети CircleSpace на выделенный сервер Hetzner Cloud с Ubuntu.

---

## 📋 ПРЕДВАРИТЕЛЬНЫЕ ТРЕБОВАНИЯ

- Hetzner Cloud аккаунт
- Домен (опционально, можно использовать IP)
- Базовые знания Linux (будут команды)
- SSH доступ к серверу

---

## 🖥️ ШАГ 1: СОЗДАНИЕ СЕРВЕРА В HETZNER

1. Зайти в Hetzner Cloud Console: https://console.hetzner.cloud
2. Создать новый проект: "CircleSpace"
3. Добавить сервер:
   - **Локация:** Нюрнберг (Германия) или Хельсинки (Финляндия)
   - **Image:** Ubuntu 22.04
   - **Type:** CX21 (2 vCPU, 4GB RAM) - для начала достаточно
   - **SSH Key:** Добавить свой публичный ключ
   - **Имя:** circlespace-server

4. Дождаться создания сервера (1-2 минуты)
5. Записать IP адрес сервера (например: 188.34.123.45)

---

## 🔐 ШАГ 2: ПЕРВОЕ ПОДКЛЮЧЕНИЕ

```bash
# Подключаемся к серверу через SSH
ssh root@188.34.123.45

# Обновляем систему
apt update && apt upgrade -y

# Устанавливаем базовые утилиты
apt install -y curl wget git vim htop ufw
```

---

## 🔒 ШАГ 3: НАСТРОЙКА БЕЗОПАСНОСТИ

```bash
# Настраиваем Firewall (UFW)
ufw allow OpenSSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw enable
ufw status

# Создаём нового пользователя (не root!)
adduser ubuntu
usermod -aG sudo ubuntu

# Копируем SSH ключ для нового пользователя
mkdir -p /home/ubuntu/.ssh
cp ~/.ssh/authorized_keys /home/ubuntu/.ssh/
chown -R ubuntu:ubuntu /home/ubuntu/.ssh
chmod 700 /home/ubuntu/.ssh
chmod 600 /home/ubuntu/.ssh/authorized_keys

# Отключаем вход под root через SSH (опционально, для безопасности)
# vim /etc/ssh/sshd_config
# Найти: PermitRootLogin yes
# Заменить на: PermitRootLogin no
# systemctl restart sshd
```

**Теперь выходим и подключаемся под новым пользователем:**

```bash
exit
ssh ubuntu@188.34.123.45
```

---

## 📦 ШАГ 4: УСТАНОВКА NODE.JS

```bash
# Устанавливаем Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Проверяем версии
node --version    # Должно быть v20.x.x
npm --version     # Должно быть 10.x.x

# Устанавливаем PM2 глобально (для управления процессами)
sudo npm install -g pm2
```

---

## 🗄️ ШАГ 5: УСТАНОВКА MONGODB

```bash
# Импортируем ключ MongoDB
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Добавляем репозиторий
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Обновляем и устанавливаем
sudo apt update
sudo apt install -y mongodb-org

# Запускаем MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Проверяем статус
sudo systemctl status mongod

# Создаём базу данных и пользователя
mongosh
```

В MongoDB shell выполняем:

```javascript
use circlespace

db.createUser({
  user: "circlespace_user",
  pwd: "YOUR_STRONG_PASSWORD_HERE",  // Придумайте надёжный пароль!
  roles: [
    { role: "readWrite", db: "circlespace" }
  ]
})

exit
```

**ВАЖНО:** Запомните пароль! Он нужен для .env файла.

---

## 🔴 ШАГ 6: УСТАНОВКА REDIS

```bash
# Устанавливаем Redis
sudo apt install -y redis-server

# Настраиваем Redis
sudo vim /etc/redis/redis.conf

# Найти и изменить:
# supervised no → supervised systemd

# Запускаем Redis
sudo systemctl restart redis
sudo systemctl enable redis

# Проверяем
redis-cli ping    # Должно вернуть: PONG
```

---

## 🌐 ШАГ 7: УСТАНОВКА NGINX

```bash
# Устанавливаем Nginx
sudo apt install -y nginx

# Запускаем и добавляем в автозагрузку
sudo systemctl start nginx
sudo systemctl enable nginx

# Проверяем
sudo systemctl status nginx
```

Теперь если открыть IP в браузере (http://188.34.123.45), должна появиться страница Nginx.

---

## 📁 ШАГ 8: ЗАГРУЗКА КОДА НА СЕРВЕР

```bash
# Создаём директории
sudo mkdir -p /var/www/frontend
sudo mkdir -p /var/www/backend
sudo chown -R ubuntu:ubuntu /var/www

# Переходим в директорию
cd /var/www

# Клонируем репозиторий (если код в Git)
# git clone https://github.com/yourusername/circlespace.git
# ИЛИ загружаем через SCP с локального компьютера:
```

**На локальном компьютере (в папке проекта):**

```bash
# Загружаем backend
scp -r backend/* ubuntu@188.34.123.45:/var/www/backend/

# Загружаем frontend
scp -r frontend/* ubuntu@188.34.123.45:/var/www/frontend/
```

---

## ⚙️ ШАГ 9: НАСТРОЙКА BACKEND

```bash
# Переходим в backend
cd /var/www/backend

# Устанавливаем зависимости
npm install --production

# Создаём .env файл
vim .env
```

**Содержимое .env:**

```env
# СЕРВЕР
PORT=5000
NODE_ENV=production
CLIENT_URL=http://188.34.123.45

# MONGODB
MONGODB_URI=mongodb://circlespace_user:YOUR_STRONG_PASSWORD_HERE@localhost:27017/circlespace

# REDIS
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long_change_this
JWT_EXPIRE=7d

# CLOUDINARY
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# EMAIL
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# ADMIN
ADMIN_EMAIL=admin@circlespace.com
ADMIN_PASSWORD=change_this_immediately

# ЛИМИТЫ
MAX_IMAGE_SIZE=5
MAX_VOICE_SIZE=2
MAX_VIDEO_SIZE=10
MAX_IMAGES_PER_POST=5
MAX_VOICE_DURATION=60
MAX_VIDEO_DURATION=30
```

**Сохраняем файл (ESC → :wq → ENTER)**

```bash
# Проверяем что всё работает
npm start

# Если всё ОК, видим:
# 🚀 CircleSpace Server запущен на порту 5000
# Нажимаем Ctrl+C для остановки
```

---

## 🚀 ШАГ 10: ЗАПУСК BACKEND ЧЕРЕЗ PM2

```bash
cd /var/www/backend

# Запускаем через PM2
pm2 start server.js --name circlespace

# Добавляем в автозагрузку
pm2 startup
# Выполнить команду которую выдаст PM2

pm2 save

# Проверяем статус
pm2 status
pm2 logs circlespace    # Просмотр логов (Ctrl+C для выхода)
```

---

## 🎨 ШАГ 11: СБОРКА FRONTEND

```bash
cd /var/www/frontend

# Устанавливаем зависимости
npm install

# Создаём production build
npm run build

# Копируем в директорию для Nginx
sudo rm -rf /var/www/frontend/build_old
sudo mv /var/www/frontend/build /var/www/frontend/static
```

---

## 🌐 ШАГ 12: НАСТРОЙКА NGINX

```bash
# Создаём конфигурацию
sudo vim /etc/nginx/sites-available/circlespace
```

**Содержимое файла:**

```nginx
# Upstream для Backend API
upstream backend {
    server localhost:5000;
}

# HTTP → HTTPS редирект (если есть SSL)
# server {
#     listen 80;
#     server_name your-domain.com;
#     return 301 https://$server_name$request_uri;
# }

# Главный сервер
server {
    listen 80;
    server_name 188.34.123.45;  # Замените на ваш IP или домен
    
    # Логи
    access_log /var/log/nginx/circlespace_access.log;
    error_log /var/log/nginx/circlespace_error.log;
    
    # Максимальный размер загружаемых файлов
    client_max_body_size 10M;
    
    # Frontend (React статика)
    location / {
        root /var/www/frontend/static;
        try_files $uri $uri/ /index.html;
        
        # Кеширование статики
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket (Socket.io)
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # WebSocket таймауты
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
    
    # Дефолтные аватары
    location /avatars {
        root /var/www/frontend/static;
        expires 1y;
    }
    
    # Безопасность
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

**Сохраняем файл**

```bash
# Активируем сайт
sudo ln -s /etc/nginx/sites-available/circlespace /etc/nginx/sites-enabled/

# Удаляем дефолтный сайт
sudo rm /etc/nginx/sites-enabled/default

# Проверяем конфигурацию
sudo nginx -t

# Если OK, перезапускаем Nginx
sudo systemctl restart nginx
```

---

## 🎉 ШАГ 13: ПРОВЕРКА РАБОТЫ

Откройте в браузере:
```
http://188.34.123.45
```

Должен открыться сайт CircleSpace! 🎉

---

## 🔒 ШАГ 14: УСТАНОВКА SSL (HTTPS) - ОПЦИОНАЛЬНО

Если у вас есть домен (например: circlespace.com):

```bash
# Устанавливаем Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получаем сертификат
sudo certbot --nginx -d circlespace.com -d www.circlespace.com

# Следуем инструкциям Certbot
# Автопродление настроится автоматически
```

Теперь сайт доступен по HTTPS! 🔒

---

## 📊 ШАГ 15: МОНИТОРИНГ И ОБСЛУЖИВАНИЕ

### Просмотр логов:

```bash
# Логи Backend
pm2 logs circlespace

# Логи Nginx
sudo tail -f /var/log/nginx/circlespace_access.log
sudo tail -f /var/log/nginx/circlespace_error.log

# Статус всех сервисов
pm2 status
sudo systemctl status nginx
sudo systemctl status mongod
sudo systemctl status redis
```

### Мониторинг ресурсов:

```bash
# Использование CPU/RAM
htop

# Место на диске
df -h

# Размер MongoDB
du -sh /var/lib/mongodb
```

### Бэкап MongoDB (автоматический):

```bash
# Создаём скрипт бэкапа
vim ~/backup-mongodb.sh
```

**Содержимое:**

```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
mongodump --out $BACKUP_DIR/backup_$DATE

# Удаляем бэкапы старше 7 дней
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \;
```

```bash
# Делаем исполняемым
chmod +x ~/backup-mongodb.sh

# Добавляем в cron (каждый день в 3:00)
crontab -e

# Добавить строку:
0 3 * * * /home/ubuntu/backup-mongodb.sh
```

---

## 🔄 ОБНОВЛЕНИЕ ПРИЛОЖЕНИЯ

Когда есть новый код:

```bash
# 1. Загружаем новый код
cd /var/www/backend
git pull   # Если используете Git
# ИЛИ загружаем через SCP

# 2. Устанавливаем новые зависимости (если есть)
npm install --production

# 3. Перезапускаем Backend
pm2 restart circlespace

# 4. Обновляем Frontend
cd /var/www/frontend
npm install
npm run build
sudo rm -rf /var/www/frontend/static_old
sudo mv /var/www/frontend/static /var/www/frontend/static_old
sudo mv /var/www/frontend/build /var/www/frontend/static

# 5. Перезагружаем Nginx
sudo systemctl reload nginx
```

---

## 🚨 УСТРАНЕНИЕ ПРОБЛЕМ

### Backend не запускается:

```bash
pm2 logs circlespace    # Смотрим ошибки
pm2 restart circlespace
```

### Nginx показывает 502:

```bash
# Проверяем что Backend работает
pm2 status

# Проверяем логи Nginx
sudo tail -f /var/log/nginx/circlespace_error.log
```

### MongoDB не работает:

```bash
sudo systemctl status mongod
sudo journalctl -u mongod    # Смотрим логи
```

### Не хватает места на диске:

```bash
# Очищаем логи
sudo journalctl --vacuum-time=7d

# Удаляем старые npm кеши
npm cache clean --force

# Удаляем неиспользуемые Docker образы (если используете)
docker system prune -a
```

---

## 📈 МАСШТАБИРОВАНИЕ

Когда пользователей станет много:

1. **Апгрейд сервера** в Hetzner Cloud (больше RAM/CPU)
2. **Отдельный сервер для MongoDB** (Hetzner + MongoDB Replica Set)
3. **Load Balancer** (несколько Backend серверов)
4. **CDN** для статики (Cloudflare)

---

## ✅ ЧЕКЛИСТ ПОСЛЕ УСТАНОВКИ

- [ ] Сервер создан в Hetzner
- [ ] Ubuntu обновлена
- [ ] Firewall настроен
- [ ] Node.js установлен
- [ ] MongoDB установлена и настроена
- [ ] Redis установлен
- [ ] Nginx установлен
- [ ] Backend запущен через PM2
- [ ] Frontend собран
- [ ] Nginx настроен
- [ ] Сайт открывается в браузере
- [ ] SSL установлен (если есть домен)
- [ ] Бэкапы настроены
- [ ] Мониторинг работает

---

## 🎯 ПОЛЕЗНЫЕ КОМАНДЫ

```bash
# Перезапуск всего
pm2 restart all
sudo systemctl restart nginx

# Просмотр процессов
pm2 list
ps aux | grep node

# Очистка памяти
sync; echo 3 > /proc/sys/vm/drop_caches

# Проверка портов
sudo netstat -tulpn | grep LISTEN
```

---

## 📞 ПОДДЕРЖКА

Если что-то не работает - проверьте логи!

```bash
pm2 logs
sudo tail -f /var/log/nginx/error.log
sudo journalctl -u mongod
```

---

**🎉 Готово! Ваш CircleSpace запущен на Hetzner Cloud!**

Теперь можно регистрироваться и пользоваться! 🚀
