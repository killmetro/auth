using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class AuthUIController : MonoBehaviour
{
    [Header("UI Panels")]
    [SerializeField] private GameObject loginPanel;
    [SerializeField] private GameObject signupPanel;
    [SerializeField] private GameObject mainMenuPanel;
    [SerializeField] private GameObject profilePanel;
    
    [Header("Login UI Elements")]
    [SerializeField] private TMP_InputField loginEmailInput;
    [SerializeField] private TMP_InputField loginPasswordInput;
    [SerializeField] private Button loginButton;
    [SerializeField] private Button switchToSignupButton;
    
    [Header("Signup UI Elements")]
    [SerializeField] private TMP_InputField signupEmailInput;
    [SerializeField] private TMP_InputField signupUsernameInput;
    [SerializeField] private TMP_InputField signupPasswordInput;
    [SerializeField] private TMP_InputField signupConfirmPasswordInput;
    [SerializeField] private Button signupButton;
    [SerializeField] private Button switchToLoginButton;
    
    [Header("Profile UI Elements")]
    [SerializeField] private TextMeshProUGUI profileUsernameText;
    [SerializeField] private TextMeshProUGUI profileEmailText;
    [SerializeField] private TextMeshProUGUI profileStatsText;
    [SerializeField] private Button logoutButton;
    [SerializeField] private Button updateStatsButton;
    
    [Header("Status Messages")]
    [SerializeField] private TextMeshProUGUI statusMessageText;
    [SerializeField] private GameObject statusMessagePanel;
    
    private AuthManager authManager;
    
    private void Start()
    {
        authManager = AuthManager.Instance;
        if (authManager == null)
        {
            Debug.LogError("AuthManager not found! Make sure it's in the scene.");
            return;
        }
        
        // Subscribe to events
        authManager.OnUserAuthenticated.AddListener(OnUserAuthenticated);
        authManager.OnAuthenticationError.AddListener(OnAuthenticationError);
        authManager.OnUserLoggedOut.AddListener(OnUserLoggedOut);
        
        // Setup button listeners
        SetupButtonListeners();
        
        // Show appropriate panel based on authentication status
        if (authManager.IsAuthenticated)
        {
            ShowMainMenu();
        }
        else
        {
            ShowLoginPanel();
        }
    }
    
    private void SetupButtonListeners()
    {
        // Login panel
        loginButton.onClick.AddListener(OnLoginButtonClicked);
        switchToSignupButton.onClick.AddListener(ShowSignupPanel);
        
        // Signup panel
        signupButton.onClick.AddListener(OnSignupButtonClicked);
        switchToLoginButton.onClick.AddListener(ShowLoginPanel);
        
        // Profile panel
        logoutButton.onClick.AddListener(OnLogoutButtonClicked);
        updateStatsButton.onClick.AddListener(OnUpdateStatsButtonClicked);
    }
    
    #region Panel Management
    
    private void ShowLoginPanel()
    {
        loginPanel.SetActive(true);
        signupPanel.SetActive(false);
        mainMenuPanel.SetActive(false);
        profilePanel.SetActive(false);
        ClearInputFields();
        ShowStatusMessage("", false);
    }
    
    private void ShowSignupPanel()
    {
        loginPanel.SetActive(false);
        signupPanel.SetActive(true);
        mainMenuPanel.SetActive(false);
        profilePanel.SetActive(false);
        ClearInputFields();
        ShowStatusMessage("", false);
    }
    
    private void ShowMainMenu()
    {
        loginPanel.SetActive(false);
        signupPanel.SetActive(false);
        mainMenuPanel.SetActive(true);
        profilePanel.SetActive(false);
        ShowStatusMessage("", false);
    }
    
    private void ShowProfilePanel()
    {
        loginPanel.SetActive(false);
        signupPanel.SetActive(false);
        mainMenuPanel.SetActive(false);
        profilePanel.SetActive(true);
        UpdateProfileDisplay();
        ShowStatusMessage("", false);
    }
    
    #endregion
    
    #region Button Event Handlers
    
    private void OnLoginButtonClicked()
    {
        string email = loginEmailInput.text.Trim();
        string password = loginPasswordInput.text;
        
        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
        {
            ShowStatusMessage("Please fill in all fields", true);
            return;
        }
        
        loginButton.interactable = false;
        ShowStatusMessage("Logging in...", false);
        
        authManager.Login(email, password);
    }
    
    private void OnSignupButtonClicked()
    {
        string email = signupEmailInput.text.Trim();
        string username = signupUsernameInput.text.Trim();
        string password = signupPasswordInput.text;
        string confirmPassword = signupConfirmPasswordInput.text;
        
        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(username) || 
            string.IsNullOrEmpty(password) || string.IsNullOrEmpty(confirmPassword))
        {
            ShowStatusMessage("Please fill in all fields", true);
            return;
        }
        
        if (password != confirmPassword)
        {
            ShowStatusMessage("Passwords do not match", true);
            return;
        }
        
        if (password.Length < 6)
        {
            ShowStatusMessage("Password must be at least 6 characters long", true);
            return;
        }
        
        signupButton.interactable = false;
        ShowStatusMessage("Creating account...", false);
        
        authManager.SignUp(email, username, password, confirmPassword);
    }
    
    private void OnLogoutButtonClicked()
    {
        authManager.Logout();
    }
    
    private void OnUpdateStatsButtonClicked()
    {
        // Example: Update stats with some sample data
        int playTime = Random.Range(100, 1000);
        int gamesPlayed = Random.Range(1, 10);
        int highScore = Random.Range(1000, 10000);
        
        authManager.UpdateGameStats(playTime, gamesPlayed, highScore);
        ShowStatusMessage("Updating stats...", false);
    }
    
    #endregion
    
    #region Event Handlers
    
    private void OnUserAuthenticated(UserData user)
    {
        ShowMainMenu();
        ShowStatusMessage($"Welcome, {user.username}!", false);
        
        // Re-enable buttons
        loginButton.interactable = true;
        signupButton.interactable = true;
    }
    
    private void OnAuthenticationError(string errorMessage)
    {
        ShowStatusMessage(errorMessage, true);
        
        // Re-enable buttons
        loginButton.interactable = true;
        signupButton.interactable = true;
    }
    
    private void OnUserLoggedOut()
    {
        ShowLoginPanel();
        ShowStatusMessage("Logged out successfully", false);
    }
    
    #endregion
    
    #region UI Updates
    
    private void UpdateProfileDisplay()
    {
        if (authManager.CurrentUser != null)
        {
            var user = authManager.CurrentUser;
            profileUsernameText.text = $"Username: {user.username}";
            profileEmailText.text = $"Email: {user.email}";
            
            if (user.gameStats != null)
            {
                profileStatsText.text = $"Play Time: {user.gameStats.totalPlayTime}s\n" +
                                       $"Games Played: {user.gameStats.gamesPlayed}\n" +
                                       $"High Score: {user.gameStats.highScore}";
            }
        }
    }
    
    private void ShowStatusMessage(string message, bool isError)
    {
        if (string.IsNullOrEmpty(message))
        {
            statusMessagePanel.SetActive(false);
            return;
        }
        
        statusMessageText.text = message;
        statusMessageText.color = isError ? Color.red : Color.green;
        statusMessagePanel.SetActive(true);
        
        // Auto-hide after 3 seconds
        Invoke(nameof(HideStatusMessage), 3f);
    }
    
    private void HideStatusMessage()
    {
        statusMessagePanel.SetActive(false);
    }
    
    private void ClearInputFields()
    {
        loginEmailInput.text = "";
        loginPasswordInput.text = "";
        signupEmailInput.text = "";
        signupUsernameInput.text = "";
        signupPasswordInput.text = "";
        signupConfirmPasswordInput.text = "";
    }
    
    #endregion
    
    #region Public Methods for UI Buttons
    
    public void OnProfileButtonClicked()
    {
        ShowProfilePanel();
    }
    
    public void OnBackToMainMenuClicked()
    {
        ShowMainMenu();
    }
    
    #endregion
    
    private void OnDestroy()
    {
        if (authManager != null)
        {
            authManager.OnUserAuthenticated.RemoveListener(OnUserAuthenticated);
            authManager.OnAuthenticationError.RemoveListener(OnAuthenticationError);
            authManager.OnUserLoggedOut.RemoveListener(OnUserLoggedOut);
        }
    }
}
