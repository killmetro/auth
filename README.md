# Unity Game Authentication Backend

A robust, secure authentication backend designed specifically for Unity games. This backend handles user registration, login, profile management, and game statistics with JWT-based authentication.

## 🚀 Features

- **User Authentication**: Signup, login, logout with JWT tokens
- **Security**: Password hashing, rate limiting, input validation
- **Profile Management**: Update profile, change password, account deactivation
- **Game Statistics**: Track play time, games played, high scores
- **Leaderboard System**: Public leaderboard with pagination
- **Session Management**: Game session tracking and management
- **RESTful API**: Clean, well-documented endpoints
- **MongoDB Integration**: Scalable database with Mongoose ODM

## 🛠️ Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - Object Data Modeling
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **helmet** - Security middleware
- **cors** - Cross-origin resource sharing

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or cloud service)
- npm or yarn package manager

## 🚀 Installation

1. **Clone or download the project**
   ```bash
   cd unity-auth-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/unity_auth_db
   JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production
   JWT_EXPIRES_IN=7d
   BCRYPT_ROUNDS=12
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

4. **Start MongoDB**
   ```bash
   # Local MongoDB
   mongod
   
   # Or use MongoDB Atlas (cloud)
   # Update MONGODB_URI in .env
   ```

5. **Run the server**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

## 📚 API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| `POST` | `/signup` | Register new user | Public |
| `POST` | `/login` | User login | Public |
| `POST` | `/logout` | User logout | Private |
| `POST` | `/change-password` | Change password | Private |
| `GET` | `/me` | Get current user | Private |
| `POST` | `/refresh` | Refresh JWT token | Private |

### User Routes (`/api/user`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| `GET` | `/profile` | Get user profile | Private |
| `PUT` | `/profile` | Update profile | Private |
| `DELETE` | `/profile` | Deactivate account | Private |
| `GET` | `/stats` | Get game statistics | Private |
| `PUT` | `/stats` | Update game statistics | Private |
| `GET` | `/leaderboard` | Get leaderboard | Public |
| `POST` | `/session-start` | Start game session | Private |

## 🔐 Authentication

### JWT Token Format
```
Authorization: Bearer <your_jwt_token>
```

### Token Structure
```json
{
  "userId": "user_id_here",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## 📝 Request/Response Examples

### User Signup
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "player@example.com",
  "username": "GamePlayer123",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "_id": "user_id_here",
    "email": "player@example.com",
    "username": "GamePlayer123",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt_token_here",
  "expiresIn": "7d"
}
```

### User Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "player@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "_id": "user_id_here",
    "email": "player@example.com",
    "username": "GamePlayer123",
    "lastLogin": "2024-01-01T00:00:00.000Z",
    "loginCount": 5
  },
  "token": "jwt_token_here",
  "expiresIn": "7d"
}
```

### Update Game Statistics
```http
PUT /api/user/stats
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "totalPlayTime": 3600,
  "gamesPlayed": 10,
  "highScore": 15000
}
```

## 🎮 Unity Integration

### C# Example - Authentication Manager
```csharp
using UnityEngine;
using UnityEngine.Networking;
using System.Collections;
using System.Text;

public class AuthManager : MonoBehaviour
{
    [Header("API Configuration")]
    public string baseUrl = "http://localhost:3000/api";
    
    [Header("User Data")]
    public string userToken;
    public UserData currentUser;
    
    [System.Serializable]
    public class UserData
    {
        public string _id;
        public string email;
        public string username;
        public GameStats gameStats;
    }
    
    [System.Serializable]
    public class GameStats
    {
        public int totalPlayTime;
        public int gamesPlayed;
        public int highScore;
    }
    
    public void SignUp(string email, string username, string password, string confirmPassword)
    {
        StartCoroutine(SignUpCoroutine(email, username, password, confirmPassword));
    }
    
    private IEnumerator SignUpCoroutine(string email, string username, string password, string confirmPassword)
    {
        var signupData = new
        {
            email = email,
            username = username,
            password = password,
            confirmPassword = confirmPassword
        };
        
        string jsonData = JsonUtility.ToJson(signupData);
        
        using (UnityWebRequest request = new UnityWebRequest($"{baseUrl}/auth/signup", "POST"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonData);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = JsonUtility.FromJson<SignupResponse>(request.downloadHandler.text);
                userToken = response.token;
                currentUser = response.user;
                Debug.Log("Signup successful!");
            }
            else
            {
                Debug.LogError($"Signup failed: {request.error}");
            }
        }
    }
    
    public void Login(string email, string password)
    {
        StartCoroutine(LoginCoroutine(email, password));
    }
    
    private IEnumerator LoginCoroutine(string email, string password)
    {
        var loginData = new
        {
            email = email,
            password = password
        };
        
        string jsonData = JsonUtility.ToJson(loginData);
        
        using (UnityWebRequest request = new UnityWebRequest($"{baseUrl}/auth/login", "POST"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonData);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = JsonUtility.FromJson<LoginResponse>(request.downloadHandler.text);
                userToken = response.token;
                currentUser = response.user;
                Debug.Log("Login successful!");
            }
            else
            {
                Debug.LogError($"Login failed: {request.error}");
            }
        }
    }
    
    public void UpdateGameStats(int totalPlayTime, int gamesPlayed, int highScore)
    {
        StartCoroutine(UpdateStatsCoroutine(totalPlayTime, gamesPlayed, highScore));
    }
    
    private IEnumerator UpdateStatsCoroutine(int totalPlayTime, int gamesPlayed, int highScore)
    {
        var statsData = new
        {
            totalPlayTime = totalPlayTime,
            gamesPlayed = gamesPlayed,
            highScore = highScore
        };
        
        string jsonData = JsonUtility.ToJson(statsData);
        
        using (UnityWebRequest request = new UnityWebRequest($"{baseUrl}/user/stats", "PUT"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonData);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            request.SetRequestHeader("Authorization", $"Bearer {userToken}");
            
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                Debug.Log("Stats updated successfully!");
            }
            else
            {
                Debug.LogError($"Stats update failed: {request.error}");
            }
        }
    }
    
    [System.Serializable]
    private class SignupResponse
    {
        public string message;
        public UserData user;
        public string token;
        public string expiresIn;
    }
    
    [System.Serializable]
    private class LoginResponse
    {
        public string message;
        public UserData user;
        public string token;
        public string expiresIn;
    }
}
```

## 🔒 Security Features

- **Password Hashing**: bcrypt with configurable salt rounds
- **JWT Tokens**: Secure, stateless authentication
- **Rate Limiting**: Prevents abuse and brute force attacks
- **Input Validation**: Comprehensive validation for all inputs
- **CORS Protection**: Configurable cross-origin settings
- **Helmet Security**: Various HTTP security headers
- **Soft Delete**: Account deactivation instead of hard deletion

## 📊 Database Schema

### User Collection
```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  username: String (unique, required),
  password: String (hashed, required),
  isActive: Boolean (default: true),
  lastLogin: Date,
  loginCount: Number (default: 0),
  gameStats: {
    totalPlayTime: Number (default: 0),
    gamesPlayed: Number (default: 0),
    highScore: Number (default: 0)
  },
  createdAt: Date,
  updatedAt: Date
}
```

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/unity_auth_db
JWT_SECRET=very_long_random_secret_key_here
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### PM2 Process Manager
```bash
npm install -g pm2
pm2 start server.js --name "unity-auth-backend"
pm2 save
pm2 startup
```

## 🧪 Testing

### Health Check
```bash
curl http://localhost:3000/health
```

### Test Signup
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "testpass123",
    "confirmPassword": "testpass123"
  }'
```

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Check the API documentation
- Review the Unity integration examples

---

**Happy Gaming! 🎮**
