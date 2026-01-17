// ========================================
// МОДЕЛЬ ПОЛЬЗОВАТЕЛЯ
// ========================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // ========================================
  // ОСНОВНАЯ ИНФОРМАЦИЯ
  // ========================================
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 20,
    match: /^[a-z0-9_]+$/  // Только буквы, цифры, подчёркивание
  },
  
  email: {
    type: String,
    required: function() {
      return !this.phone;  // Email обязателен если нет телефона
    },
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  
  phone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    match: /^\+?[1-9]\d{1,14}$/  // E.164 формат
  },
  
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  
  // ========================================
  // ПРОФИЛЬ
  // ========================================
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: 50
    },
    
    lastName: {
      type: String,
      trim: true,
      maxlength: 50
    },
    
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'male'
    },
    
    avatar: {
      type: String,
      default: function() {
        // Дефолтный аватар по полу
        return this.profile.gender === 'female' 
          ? '/avatars/default-female.png'
          : '/avatars/default-male.png';
      }
    },
    
    bio: {
      type: String,
      maxlength: 500,
      trim: true
    },
    
    city: {
      type: String,
      trim: true
    },
    
    country: {
      type: String,
      trim: true
    },
    
    birthday: {
      type: Date
    }
  },
  
  // ========================================
  // ВЕРИФИКАЦИЯ
  // ========================================
  verification: {
    emailVerified: {
      type: Boolean,
      default: false
    },
    
    phoneVerified: {
      type: Boolean,
      default: false
    },
    
    emailVerificationCode: {
      type: String
    },
    
    phoneVerificationCode: {
      type: String
    },
    
    verificationCodeExpires: {
      type: Date
    }
  },
  
  // ========================================
  // НАСТРОЙКИ ПРИВАТНОСТИ
  // ========================================
  privacy: {
    showEmail: {
      type: Boolean,
      default: false
    },
    
    showPhone: {
      type: Boolean,
      default: false
    },
    
    showCity: {
      type: Boolean,
      default: true
    },
    
    whoCanMessage: {
      type: String,
      enum: ['everyone', 'friends', 'nobody'],
      default: 'everyone'
    },
    
    whoCanCall: {
      type: String,
      enum: ['everyone', 'friends', 'nobody'],
      default: 'friends'
    },
    
    whoCanSeeProfile: {
      type: String,
      enum: ['everyone', 'friends', 'nobody'],
      default: 'everyone'
    }
  },
  
  // ========================================
  // НИКНЕЙМ (можно менять раз в 24 часа)
  // ========================================
  usernameLastChanged: {
    type: Date,
    default: Date.now
  },
  
  // ========================================
  // РЕФЕРАЛЬНАЯ СИСТЕМА
  // ========================================
  referral: {
    referralCode: {
      type: String,
      unique: true
    },
    
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    referralCount: {
      type: Number,
      default: 0
    },
    
    bonusPoints: {
      type: Number,
      default: 0
    }
  },
  
  // ========================================
  // ДРУЗЬЯ
  // ========================================
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  friendRequests: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // ========================================
  // ПОДАРКИ
  // ========================================
  gifts: [{
    giftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gift'
    },
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    receivedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // ========================================
  // СТАТИСТИКА
  // ========================================
  stats: {
    postsCount: {
      type: Number,
      default: 0
    },
    
    friendsCount: {
      type: Number,
      default: 0
    },
    
    storageUsed: {
      type: Number,
      default: 0  // В байтах
    }
  },
  
  // ========================================
  // БЕЗОПАСНОСТЬ И МОДЕРАЦИЯ
  // ========================================
  security: {
    isBanned: {
      type: Boolean,
      default: false
    },
    
    bannedUntil: {
      type: Date
    },
    
    banReason: {
      type: String
    },
    
    reportsCount: {
      type: Number,
      default: 0
    },
    
    lastLogin: {
      type: Date
    },
    
    lastIP: {
      type: String
    }
  },
  
  // ========================================
  // РОЛИ
  // ========================================
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  
  // ========================================
  // ОНЛАЙН СТАТУС
  // ========================================
  isOnline: {
    type: Boolean,
    default: false
  },
  
  lastSeen: {
    type: Date,
    default: Date.now
  },
  
  // ========================================
  // НАСТРОЙКИ
  // ========================================
  settings: {
    language: {
      type: String,
      enum: ['ru', 'en', 'de', 'tr'],
      default: 'ru'
    },
    
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    
    notifications: {
      messages: {
        type: Boolean,
        default: true
      },
      
      calls: {
        type: Boolean,
        default: true
      },
      
      mentions: {
        type: Boolean,
        default: true
      },
      
      friendRequests: {
        type: Boolean,
        default: true
      }
    }
  }
  
}, {
  timestamps: true  // Автоматически добавляет createdAt и updatedAt
});

// ========================================
// ИНДЕКСЫ ДЛЯ БЫСТРОГО ПОИСКА
// ========================================

userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ 'referral.referralCode': 1 });
userSchema.index({ createdAt: -1 });

// ========================================
// MIDDLEWARE: ХЕШИРОВАНИЕ ПАРОЛЯ
// ========================================

userSchema.pre('save', async function(next) {
  // Хешируем пароль только если он был изменён
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ========================================
// МЕТОДЫ
// ========================================

// Проверка пароля
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Генерация короткой ссылки профиля
userSchema.methods.getProfileUrl = function() {
  return `/@${this.username}`;
};

// Проверка возможности изменить никнейм (24 часа)
userSchema.methods.canChangeUsername = function() {
  const hoursSinceLastChange = (Date.now() - this.usernameLastChanged) / (1000 * 60 * 60);
  return hoursSinceLastChange >= 24;
};

// Получить статус верификации
userSchema.methods.getVerificationStatus = function() {
  const emailVerified = this.verification.emailVerified;
  const phoneVerified = this.verification.phoneVerified;
  
  if (emailVerified && phoneVerified) {
    return {
      level: 100,
      badges: ['email', 'phone']
    };
  } else if (emailVerified || phoneVerified) {
    return {
      level: 50,
      badges: emailVerified ? ['email'] : ['phone']
    };
  } else {
    return {
      level: 0,
      badges: []
    };
  }
};

// Публичный профиль (без приватных данных)
userSchema.methods.toPublicProfile = function() {
  return {
    id: this._id,
    username: this.username,
    profile: {
      firstName: this.profile.firstName,
      lastName: this.profile.lastName,
      avatar: this.profile.avatar,
      bio: this.profile.bio,
      city: this.privacy.showCity ? this.profile.city : null,
      country: this.privacy.showCity ? this.profile.country : null
    },
    verification: this.getVerificationStatus(),
    stats: this.stats,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    createdAt: this.createdAt
  };
};

// ========================================
// СТАТИЧЕСКИЕ МЕТОДЫ
// ========================================

// Поиск пользователей
userSchema.statics.searchUsers = function(query) {
  return this.find({
    $or: [
      { username: new RegExp(query, 'i') },
      { 'profile.firstName': new RegExp(query, 'i') },
      { 'profile.lastName': new RegExp(query, 'i') }
    ],
    'security.isBanned': false
  })
  .select('username profile.firstName profile.lastName profile.avatar verification stats')
  .limit(20);
};

// ========================================
// ЭКСПОРТ МОДЕЛИ
// ========================================

const User = mongoose.model('User', userSchema);
module.exports = User;
