# 🚀 Quick Start Guide

## Prerequisites
- Node.js (v14+) installed
- MongoDB running (local or cloud)
- Unity 2021.3+ (for Unity integration)

## ⚡ 5-Minute Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp env.example .env
# Edit .env with your settings
```

### 3. Start MongoDB
```bash
# Local MongoDB
mongod

# OR use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env
```

### 4. Start Backend
```bash
# Option 1: Use startup script
./start.sh

# Option 2: Manual start
npm run dev
```

### 5. Test API
```bash
# Test the backend
node test-api.js
```

## 🎮 Unity Integration

1. Copy `UnityScripts/AuthManager.cs` to your Unity project
2. Copy `UnityScripts/AuthUIController.cs` to your Unity project
3. Create an empty GameObject and attach `AuthManager` script
4. Create UI elements and attach `AuthUIController` script
5. Configure the API URL in the inspector

## 🔗 API Endpoints

- **Health Check**: `GET /health`
- **Signup**: `POST /api/auth/signup`
- **Login**: `POST /api/auth/login`
- **Profile**: `GET /api/user/profile`
- **Stats**: `PUT /api/user/stats`

## 📱 Test with cURL

```bash
# Health check
curl http://localhost:3000/health

# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"testpass123","confirmPassword":"testpass123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

## 🚨 Common Issues

- **Port 3000 in use**: Change PORT in .env
- **MongoDB connection failed**: Check if MongoDB is running
- **CORS errors**: Update CORS origins in server.js for your Unity build

## 📞 Need Help?

- Check the full README.md
- Review the Unity integration examples
- Test with the provided test script
