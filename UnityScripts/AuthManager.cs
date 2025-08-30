using UnityEngine;
using UnityEngine.Networking;
using System.Collections;
using System.Text;
using System;

[System.Serializable]
public class UserData
{
    public string _id;
    public string email;
    public string username;
    public bool isActive;
    public DateTime lastLogin;
    public int loginCount;
    public GameStats gameStats;
    public DateTime createdAt;
    public DateTime updatedAt;
}

[System.Serializable]
public class GameStats
{
    public int totalPlayTime;
    public int gamesPlayed;
    public int highScore;
}

[System.Serializable]
public class AuthResponse
{
    public string message;
    public UserData user;
    public string token;
    public string expiresIn;
}

[System.Serializable]
public class ErrorResponse
{
    public string error;
    public string message;
    public ErrorDetail[] details;
}

[System.Serializable]
public class ErrorDetail
{
    public string field;
    public string message;
    public string value;
}

public class AuthManager : MonoBehaviour
{
    [Header("API Configuration")]
    [SerializeField] private string baseUrl = "http://localhost:3000/api";
    [SerializeField] private bool useHttps = false;
    
    [Header("User Data")]
    [SerializeField] private string userToken = "";
    [SerializeField] private UserData currentUser;
    
    [Header("Events")]
    public UnityEvent<UserData> OnUserAuthenticated;
    public UnityEvent<string> OnAuthenticationError;
    public UnityEvent OnUserLoggedOut;
    
    // Singleton pattern
    public static AuthManager Instance { get; private set; }
    
    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }
    
    private void Start()
    {
        // Load saved token if exists
        LoadSavedToken();
        
        // Check if token is still valid
        if (!string.IsNullOrEmpty(userToken))
        {
            StartCoroutine(ValidateToken());
        }
    }
    
    #region Public Methods
    
    /// <summary>
    /// Register a new user account
    /// </summary>
    public void SignUp(string email, string username, string password, string confirmPassword)
    {
        StartCoroutine(SignUpCoroutine(email, username, password, confirmPassword));
    }
    
    /// <summary>
    /// Login with existing credentials
    /// </summary>
    public void Login(string email, string password)
    {
        StartCoroutine(LoginCoroutine(email, password));
    }
    
    /// <summary>
    /// Logout current user
    /// </summary>
    public void Logout()
    {
        StartCoroutine(LogoutCoroutine());
    }
    
    /// <summary>
    /// Get current user profile
    /// </summary>
    public void GetProfile()
    {
        if (string.IsNullOrEmpty(userToken))
        {
            OnAuthenticationError?.Invoke("No authentication token");
            return;
        }
        
        StartCoroutine(GetProfileCoroutine());
    }
    
    /// <summary>
    /// Update user profile
    /// </summary>
    public void UpdateProfile(string username = null, string email = null)
    {
        if (string.IsNullOrEmpty(userToken))
        {
            OnAuthenticationError?.Invoke("No authentication token");
            return;
        }
        
        StartCoroutine(UpdateProfileCoroutine(username, email));
    }
    
    /// <summary>
    /// Update game statistics
    /// </summary>
    public void UpdateGameStats(int totalPlayTime = -1, int gamesPlayed = -1, int highScore = -1)
    {
        if (string.IsNullOrEmpty(userToken))
        {
            OnAuthenticationError?.Invoke("No authentication token");
            return;
        }
        
        StartCoroutine(UpdateGameStatsCoroutine(totalPlayTime, gamesPlayed, highScore));
    }
    
    /// <summary>
    /// Get user game statistics
    /// </summary>
    public void GetGameStats()
    {
        if (string.IsNullOrEmpty(userToken))
        {
            OnAuthenticationError?.Invoke("No authentication token");
            return;
        }
        
        StartCoroutine(GetGameStatsCoroutine());
    }
    
    /// <summary>
    /// Get leaderboard
    /// </summary>
    public void GetLeaderboard(int limit = 10, int page = 1)
    {
        StartCoroutine(GetLeaderboardCoroutine(limit, page));
    }
    
    /// <summary>
    /// Start a new game session
    /// </summary>
    public void StartGameSession()
    {
        if (string.IsNullOrEmpty(userToken))
        {
            OnAuthenticationError?.Invoke("No authentication token");
            return;
        }
        
        StartCoroutine(StartGameSessionCoroutine());
    }
    
    #endregion
    
    #region Private Methods
    
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
        
        using (UnityWebRequest request = new UnityWebRequest($"{GetFullUrl()}/auth/signup", "POST"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonData);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = JsonUtility.FromJson<AuthResponse>(request.downloadHandler.text);
                userToken = response.token;
                currentUser = response.user;
                SaveToken();
                OnUserAuthenticated?.Invoke(currentUser);
                Debug.Log($"Signup successful! Welcome {currentUser.username}!");
            }
            else
            {
                HandleError(request.downloadHandler.text, "Signup failed");
            }
        }
    }
    
    private IEnumerator LoginCoroutine(string email, string password)
    {
        var loginData = new
        {
            email = email,
            password = password
        };
        
        string jsonData = JsonUtility.ToJson(loginData);
        
        using (UnityWebRequest request = new UnityWebRequest($"{GetFullUrl()}/auth/login", "POST"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonData);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = JsonUtility.FromJson<AuthResponse>(request.downloadHandler.text);
                userToken = response.token;
                currentUser = response.user;
                SaveToken();
                OnUserAuthenticated?.Invoke(currentUser);
                Debug.Log($"Login successful! Welcome back {currentUser.username}!");
            }
            else
            {
                HandleError(request.downloadHandler.text, "Login failed");
            }
        }
    }
    
    private IEnumerator LogoutCoroutine()
    {
        if (string.IsNullOrEmpty(userToken))
        {
            OnUserLoggedOut?.Invoke();
            return null;
        }
        
        using (UnityWebRequest request = new UnityWebRequest($"{GetFullUrl()}/auth/logout", "POST"))
        {
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Authorization", $"Bearer {userToken}");
            
            yield return request.SendWebRequest();
            
            // Always logout locally regardless of server response
            userToken = "";
            currentUser = null;
            ClearSavedToken();
            OnUserLoggedOut?.Invoke();
            Debug.Log("Logged out successfully");
        }
    }
    
    private IEnumerator ValidateToken()
    {
        using (UnityWebRequest request = new UnityWebRequest($"{GetFullUrl()}/auth/me", "GET"))
        {
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Authorization", $"Bearer {userToken}");
            
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = JsonUtility.FromJson<AuthResponse>(request.downloadHandler.text);
                currentUser = response.user;
                OnUserAuthenticated?.Invoke(currentUser);
                Debug.Log($"Token validated. Welcome back {currentUser.username}!");
            }
            else
            {
                // Token is invalid, clear it
                userToken = "";
                currentUser = null;
                ClearSavedToken();
                Debug.Log("Saved token is invalid, please login again");
            }
        }
    }
    
    private IEnumerator GetProfileCoroutine()
    {
        using (UnityWebRequest request = new UnityWebRequest($"{GetFullUrl()}/user/profile", "GET"))
        {
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Authorization", $"Bearer {userToken}");
            
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = JsonUtility.FromJson<AuthResponse>(request.downloadHandler.text);
                currentUser = response.user;
                Debug.Log($"Profile retrieved for {currentUser.username}");
            }
            else
            {
                HandleError(request.downloadHandler.text, "Failed to get profile");
            }
        }
    }
    
    private IEnumerator UpdateProfileCoroutine(string username, string email)
    {
        var profileData = new { username, email };
        string jsonData = JsonUtility.ToJson(profileData);
        
        using (UnityWebRequest request = new UnityWebRequest($"{GetFullUrl()}/user/profile", "PUT"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonData);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            request.SetRequestHeader("Authorization", $"Bearer {userToken}");
            
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = JsonUtility.FromJson<AuthResponse>(request.downloadHandler.text);
                currentUser = response.user;
                Debug.Log("Profile updated successfully");
            }
            else
            {
                HandleError(request.downloadHandler.text, "Failed to update profile");
            }
        }
    }
    
    private IEnumerator UpdateGameStatsCoroutine(int totalPlayTime, int gamesPlayed, int highScore)
    {
        var statsData = new
        {
            totalPlayTime = totalPlayTime >= 0 ? totalPlayTime : currentUser.gameStats.totalPlayTime,
            gamesPlayed = gamesPlayed >= 0 ? gamesPlayed : currentUser.gameStats.gamesPlayed,
            highScore = highScore >= 0 ? highScore : currentUser.gameStats.highScore
        };
        
        string jsonData = JsonUtility.ToJson(statsData);
        
        using (UnityWebRequest request = new UnityWebRequest($"{GetFullUrl()}/user/stats", "PUT"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonData);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            request.SetRequestHeader("Authorization", $"Bearer {userToken}");
            
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                Debug.Log("Game statistics updated successfully");
            }
            else
            {
                HandleError(request.downloadHandler.text, "Failed to update game statistics");
            }
        }
    }
    
    private IEnumerator GetGameStatsCoroutine()
    {
        using (UnityWebRequest request = new UnityWebRequest($"{GetFullUrl()}/user/stats", "GET"))
        {
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Authorization", $"Bearer {userToken}");
            
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = JsonUtility.FromJson<AuthResponse>(request.downloadHandler.text);
                currentUser.gameStats = response.user.gameStats;
                Debug.Log($"Game stats retrieved: Play time: {currentUser.gameStats.totalPlayTime}s, Games: {currentUser.gameStats.gamesPlayed}, High Score: {currentUser.gameStats.highScore}");
            }
            else
            {
                HandleError(request.downloadHandler.text, "Failed to get game statistics");
            }
        }
    }
    
    private IEnumerator GetLeaderboardCoroutine(int limit, int page)
    {
        using (UnityWebRequest request = new UnityWebRequest($"{GetFullUrl()}/user/leaderboard?limit={limit}&page={page}", "GET"))
        {
            request.downloadHandler = new DownloadHandlerBuffer();
            
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                Debug.Log($"Leaderboard retrieved: {limit} players from page {page}");
                // You can parse the response and create a leaderboard UI here
            }
            else
            {
                HandleError(request.downloadHandler.text, "Failed to get leaderboard");
            }
        }
    }
    
    private IEnumerator StartGameSessionCoroutine()
    {
        using (UnityWebRequest request = new UnityWebRequest($"{GetFullUrl()}/user/session-start", "POST"))
        {
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Authorization", $"Bearer {userToken}");
            
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                Debug.Log("Game session started successfully");
            }
            else
            {
                HandleError(request.downloadHandler.text, "Failed to start game session");
            }
        }
    }
    
    private void HandleError(string responseText, string defaultMessage)
    {
        try
        {
            var errorResponse = JsonUtility.FromJson<ErrorResponse>(responseText);
            string errorMessage = !string.IsNullOrEmpty(errorResponse.message) ? errorResponse.message : errorResponse.error;
            OnAuthenticationError?.Invoke(errorMessage);
            Debug.LogError($"{defaultMessage}: {errorMessage}");
        }
        catch
        {
            OnAuthenticationError?.Invoke(defaultMessage);
            Debug.LogError(defaultMessage);
        }
    }
    
    private string GetFullUrl()
    {
        string protocol = useHttps ? "https" : "http";
        return $"{protocol}://{baseUrl}";
    }
    
    #endregion
    
    #region Token Persistence
    
    private void SaveToken()
    {
        if (!string.IsNullOrEmpty(userToken))
        {
            PlayerPrefs.SetString("AuthToken", userToken);
            PlayerPrefs.Save();
        }
    }
    
    private void LoadSavedToken()
    {
        userToken = PlayerPrefs.GetString("AuthToken", "");
    }
    
    private void ClearSavedToken()
    {
        PlayerPrefs.DeleteKey("AuthToken");
        PlayerPrefs.Save();
    }
    
    #endregion
    
    #region Public Properties
    
    public bool IsAuthenticated => !string.IsNullOrEmpty(userToken) && currentUser != null;
    public UserData CurrentUser => currentUser;
    public string UserToken => userToken;
    
    #endregion
}
