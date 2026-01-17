#!/bin/bash

#############################################
# АВТОМАТИЧЕСКАЯ УСТАНОВКА CIRCLESPACE
# На Ubuntu 22.04 (Hetzner Cloud)
#############################################

set -e  # Останавливаем при ошибке

echo "========================================="
echo "🚀 CircleSpace Установка"
echo "========================================="
echo ""

# Проверка что запущено от root или sudo
if [ "$EUID" -ne 0 ]; then
  echo "❌ Пожалуйста, запустите с sudo"
  echo "Пример: sudo bash install.sh"
  exit 1
fi

# Получаем имя обычного пользователя (не root)
ACTUAL_USER=${SUDO_USER:-ubuntu}
echo "📝 Пользователь: $ACTUAL_USER"
echo ""

# Обновление системы
echo "📦 Обновление системы..."
apt update
apt upgrade -y

# Базовые утилиты
echo "🔧 Установка базовых утилит..."
apt install -y curl wget git vim htop ufw build-essential

# Node.js
echo "📗 Установка Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PM2
echo "🔄 Установка PM2..."
npm install -g pm2

# MongoDB
echo "🗄️ Установка MongoDB..."
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org
systemctl start mongod
systemctl enable mongod

# Redis
echo "🔴 Установка Redis..."
apt install -y redis-server
sed -i 's/supervised no/supervised systemd/g' /etc/redis/redis.conf
systemctl restart redis
systemctl enable redis

# Nginx
echo "🌐 Установка Nginx..."
apt install -y nginx
systemctl start nginx
systemctl enable nginx

# Firewall
echo "🔒 Настройка Firewall..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Создание директорий
echo "📁 Создание директорий..."
mkdir -p /var/www/frontend
mkdir -p /var/www/backend
mkdir -p /home/$ACTUAL_USER/backups/mongodb
chown -R $ACTUAL_USER:$ACTUAL_USER /var/www
chown -R $ACTUAL_USER:$ACTUAL_USER /home/$ACTUAL_USER/backups

# MongoDB пользователь и база
echo "👤 Создание пользователя MongoDB..."
echo ""
echo "⚠️ ВАЖНО: Сейчас будет создана база данных CircleSpace"
echo "Придумайте надёжный пароль для базы данных!"
echo ""
read -sp "Введите пароль для MongoDB: " MONGO_PASSWORD
echo ""

mongosh <<EOF
use circlespace
db.createUser({
  user: "circlespace_user",
  pwd: "$MONGO_PASSWORD",
  roles: [{ role: "readWrite", db: "circlespace" }]
})
exit
EOF

echo ""
echo "✅ MongoDB пользователь создан"

# Создание .env шаблона
echo "📝 Создание .env файла..."
cat > /var/www/backend/.env.template <<EOF
# СЕРВЕР
PORT=5000
NODE_ENV=production
CLIENT_URL=http://YOUR_SERVER_IP

# MONGODB
MONGODB_URI=mongodb://circlespace_user:$MONGO_PASSWORD@localhost:27017/circlespace

# REDIS
REDIS_URL=redis://localhost:6379

# JWT (ИЗМЕНИТЕ ЭТО!)
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRE=7d

# CLOUDINARY (ЗАПОЛНИТЕ СВОИ ДАННЫЕ!)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# EMAIL (ЗАПОЛНИТЕ СВОИ ДАННЫЕ!)
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
EOF

chown $ACTUAL_USER:$ACTUAL_USER /var/www/backend/.env.template

# Создание скрипта бэкапа
echo "💾 Создание скрипта автоматического бэкапа..."
cat > /home/$ACTUAL_USER/backup-mongodb.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
mongodump --out $BACKUP_DIR/backup_$DATE

# Удаляем бэкапы старше 7 дней
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null

echo "✅ Бэкап создан: backup_$DATE"
EOF

chmod +x /home/$ACTUAL_USER/backup-mongodb.sh
chown $ACTUAL_USER:$ACTUAL_USER /home/$ACTUAL_USER/backup-mongodb.sh

# Добавление в cron (как обычный пользователь)
sudo -u $ACTUAL_USER bash <<EOF
(crontab -l 2>/dev/null || echo ""; echo "0 3 * * * /home/$ACTUAL_USER/backup-mongodb.sh") | crontab -
EOF

echo ""
echo "========================================="
echo "✅ УСТАНОВКА ЗАВЕРШЕНА!"
echo "========================================="
echo ""
echo "📋 Установлено:"
echo "  ✅ Node.js $(node --version)"
echo "  ✅ npm $(npm --version)"
echo "  ✅ PM2"
echo "  ✅ MongoDB 7.0"
echo "  ✅ Redis"
echo "  ✅ Nginx"
echo ""
echo "📝 Следующие шаги:"
echo ""
echo "1. Загрузите код приложения:"
echo "   scp -r backend/* $ACTUAL_USER@YOUR_SERVER:/var/www/backend/"
echo "   scp -r frontend/* $ACTUAL_USER@YOUR_SERVER:/var/www/frontend/"
echo ""
echo "2. Отредактируйте .env файл:"
echo "   nano /var/www/backend/.env.template"
echo "   mv /var/www/backend/.env.template /var/www/backend/.env"
echo ""
echo "3. Установите зависимости Backend:"
echo "   cd /var/www/backend"
echo "   npm install --production"
echo ""
echo "4. Запустите Backend:"
echo "   pm2 start server.js --name circlespace"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "5. Соберите Frontend:"
echo "   cd /var/www/frontend"
echo "   npm install"
echo "   npm run build"
echo "   mv build static"
echo ""
echo "6. Настройте Nginx (см. INSTALL_HETZNER.md)"
echo ""
echo "🔒 MongoDB пароль сохранён в /var/www/backend/.env.template"
echo ""
echo "📖 Полная инструкция: INSTALL_HETZNER.md"
echo ""
echo "========================================="
echo "🎉 Готово!"
echo "========================================="
