// METROSTATE // NEURAL GATE CORE v3.0

const API_BASE = '/api';

// --- State Management ---
let currentStep = 'EMAIL';
let currentEmail = '';
let currentIsNewUser = false;

// --- UI Elements ---
const authContainer = document.getElementById('auth-container');
const serverContainer = document.getElementById('server-container');
const errorBox = document.getElementById('error-box');
const errorMessage = document.getElementById('error-message');
const authStatusText = document.getElementById('auth-status-text');

const emailForm = document.getElementById('email-form');
const otpForm = document.getElementById('otp-form');
const usernameForm = document.getElementById('username-form');

const emailInput = document.getElementById('email-input');
const otpInput = document.getElementById('otp-input');
const usernameInput = document.getElementById('username-input');

const otpSentTo = document.getElementById('otp-sent-to');
const logoutBtn = document.getElementById('logout-btn');
const serverList = document.getElementById('server-list');

const iconMail = document.getElementById('icon-mail');
const iconKey = document.getElementById('icon-key');
const iconUser = document.getElementById('icon-user');

// --- Initialization ---
// --- Initialization ---
// --- Initialization ---
// Immediate Session Check to prevent flash
const introShown = sessionStorage.getItem('intro_shown');
if (introShown) {
    const style = document.createElement('style');
    style.innerHTML = '#loading-screen { display: none !important; } #app { opacity: 1 !important; }';
    document.head.appendChild(style);
}

function init() {
    // Hide App initially if not shown
    const appEl = document.getElementById('app');

    // If we inserted the style above, we can skip the intro logic
    if (introShown) {
        if (localStorage.getItem('auth_token')) {
            showServerList();
            handleNavigation();
        }
        return;
    }

    appEl.style.opacity = '0';

    // Simulate Loading Sequence
    const loaderBar = document.getElementById('loader-bar');
    const loadingScreen = document.getElementById('loading-screen');
    let progress = 0;

    const interval = setInterval(() => {
        progress += Math.random() * 5;
        if (progress > 100) progress = 100;

        loaderBar.style.width = `${progress}%`;

        if (progress === 100) {
            clearInterval(interval);
            setTimeout(() => {
                loadingScreen.classList.add('fade-out');
                appEl.style.opacity = '1';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    sessionStorage.setItem('intro_shown', 'true'); // Flag as shown
                    // Resume Normal Init
                    const token = localStorage.getItem('auth_token');
                    if (token) {
                        showServerList();
                        handleNavigation();
                    }
                }, 1000);
            }, 500);
        }
    }, 50); // Speed of loading bar
}

// --- Visual Feedback Helpers ---
function showError(msg) {
    errorMessage.textContent = msg.toUpperCase();
    errorBox.classList.remove('hidden');
    // Vibration effect on the container
    authContainer.style.animation = 'none';
    authContainer.offsetHeight; // trigger reflow
    authContainer.style.animation = 'glitch-bounce 0.2s 3';

    setTimeout(() => {
        errorBox.classList.add('hidden');
    }, 5000);
}

function setStep(step) {
    currentStep = step;

    // Smooth Transition Effect
    authContainer.style.opacity = '0.5';

    setTimeout(() => {
        [emailForm, otpForm, usernameForm].forEach(f => f.classList.add('hidden'));
        [iconMail, iconKey, iconUser].forEach(i => i.classList.add('hidden'));

        if (step === 'EMAIL') {
            emailForm.classList.remove('hidden');
            iconMail.classList.remove('hidden');
            authStatusText.textContent = 'PLEASE LOG IN';
        } else if (step === 'OTP') {
            otpForm.classList.remove('hidden');
            iconKey.classList.remove('hidden');
            authStatusText.textContent = 'ENTER VERIFICATION CODE';
            otpSentTo.textContent = `CODE SENT TO: ${currentEmail}`;
        } else if (step === 'USERNAME') {
            usernameForm.classList.remove('hidden');
            iconUser.classList.remove('hidden');
            authStatusText.textContent = 'CREATE USERNAME';
        }

        authContainer.style.opacity = '1';
    }, 200);
}

// --- Step 1: Send OTP ---
emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!email) return;

    const btn = emailForm.querySelector('button');
    const btnSpan = btn.querySelector('span');
    btn.disabled = true;
    btnSpan.textContent = 'SENDING...';

    try {
        const res = await fetch(`${API_BASE}/otp/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (res.ok) {
            currentEmail = email;
            currentIsNewUser = data.isNewUser;
            setStep('OTP');
        } else {
            showError(data.message || 'Failed to send code');
        }
    } catch (err) {
        showError('Network Error');
    } finally {
        btn.disabled = false;
        btnSpan.textContent = 'SEND LOGIN CODE';
    }
});

// --- Step 2 & 3: Authorization Flow ---
async function handleVerify(e) {
    e.preventDefault();
    const otp = otpInput.value.trim();
    const username = usernameInput.value.trim();

    if (!otp) return;

    const activeForm = currentStep === 'OTP' ? otpForm : usernameForm;
    const btn = activeForm.querySelector('button');
    const btnSpan = btn.querySelector('span');
    btn.disabled = true;
    btnSpan.textContent = 'VERIFYING...';

    try {
        const payload = { email: currentEmail, otp };
        if (currentStep === 'USERNAME') payload.username = username;

        const res = await fetch(`${API_BASE}/otp/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok) {
            if (data.needsUsername && currentStep === 'OTP') {
                setStep('USERNAME');
            } else {
                localStorage.setItem('auth_token', data.token);
                console.log('User Data Received:', data.user);
                // Use _id or id, fallback to parsing token if needed.
                const accId = data.user._id || data.user.id || data.user.accountId;
                console.log('Login successful. Account ID:', accId);
                localStorage.setItem('account_id', accId);
                localStorage.setItem('auth_username', data.user.username);
                // Store Email for Profile
                localStorage.setItem('auth_email', currentEmail);
                showServerList();
            }
        } else {
            showError(data.message || 'Invalid Code');
        }
    } catch (err) {
        showError('System Error');
    } finally {
        btn.disabled = false;
        btnSpan.textContent = activeForm.id === 'otp-form' ? 'VERIFY CODE' : 'CREATE ACCOUNT';
    }
}

otpForm.addEventListener('submit', handleVerify);
usernameForm.addEventListener('submit', handleVerify);

// --- Return Logic ---
document.querySelectorAll('.back-link').forEach(btn => {
    btn.addEventListener('click', () => setStep('EMAIL'));
});

// --- Disconnect Logic ---
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('account_id');
    serverContainer.classList.add('hidden');
    authContainer.classList.remove('hidden');
    setStep('EMAIL');
});

// --- DASHBOARD: Game Launcher Logic ---
let globalServers = []; // Store fetched servers to allow filtering without re-fetching

async function showServerList() {
    authContainer.classList.add('hidden');
    serverContainer.classList.remove('hidden');
    serverContainer.style.display = 'flex'; // Ensure flex layout for new design

    const serverListEl = document.getElementById('server-list');
    serverListEl.innerHTML = '<p class="status-label animate-pulse" style="grid-column: 1/-1; text-align: center;">Loading Server List...</p>';

    // Set Username in Nav
    const username = localStorage.getItem('auth_username') || 'User';
    const navUserEl = document.getElementById('nav-username');
    if (navUserEl) navUserEl.textContent = username;

    try {
        const res = await fetch(`${API_BASE}/servers`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        const data = await res.json();
        globalServers = data.servers || [];

        if (globalServers.length === 0) {
            serverListEl.innerHTML = '<p class="status-label" style="grid-column: 1/-1; text-align: center;">No Servers Available</p>';
            return;
        }

        // 1. Populate Region Selector
        const regions = ['ALL', ...new Set(globalServers.map(s => s.region.toUpperCase()))];
        const regionSelect = document.getElementById('region-selector');

        // Preserve selection if rerendering, otherwise default to ALL
        const currentSelection = regionSelect.value;

        regionSelect.innerHTML = regions.map(r =>
            `<option value="${r}">${r === 'ALL' ? 'GLOBAL (ALL)' : r}</option>`
        ).join('');

        if (regions.includes(currentSelection)) {
            regionSelect.value = currentSelection;
        }

        // Add Event Listener for Filtering
        regionSelect.onchange = () => renderServers();

        // 2. Initial Render
        renderServers();

    } catch (err) {
        showError('NETWORK_FAILURE');
    }
}

function renderServers() {
    const serverListEl = document.getElementById('server-list');
    const regionSelect = document.getElementById('region-selector');
    const filter = regionSelect.value;
    const accountId = localStorage.getItem('account_id');

    const filtered = filter === 'ALL'
        ? globalServers
        : globalServers.filter(s => s.region.toUpperCase() === filter);

    if (filtered.length === 0) {
        serverListEl.innerHTML = '<p class="status-label" style="grid-column: 1/-1; text-align: center;">NO SERVERS IN REGION</p>';
        return;
    }

    serverListEl.innerHTML = filtered.map(server => {
        // Status Color for dot (optional, let's keep it subtle next to server name)
        const isOnline = server.status === 'online';

        return `
            <div class="server-module" id="server-${server.id}" onclick="selectServer('${server.id}', '${server.backendUrl}')">
                
                <!-- 2. Main Character Area -->
                <div class="char-main-info" id="char-main-${server.id}">
                    <span class="char-placeholder">Checking...</span>
                </div>

                <!-- 3. Footer: Server Name & Level -->
                <div class="server-footer">
                    <div class="flex items-center">
                        <div class="pulse-dot ${isOnline ? 'online' : 'offline'}" style="width: 4px; height: 4px; margin-right: 0.5rem;"></div>
                        <span class="server-name-text">${server.name}</span>
                    </div>
                    <span class="char-level-text" id="char-level-${server.id}"></span>
                </div>
            </div>
        `;
    }).join('');

    // Async Character Fetch for Rendered Servers
    filtered.forEach(async (server) => {
        try {
            const charMain = document.getElementById(`char-main-${server.id}`);
            const charLevel = document.getElementById(`char-level-${server.id}`);
            const module = document.getElementById(`server-${server.id}`);

            if (!charMain) return;

            // Fallback: Use backendUrl if available, otherwise construct from IP:PORT
            const backendBase = server.backendUrl || `http://${server.ip}:${server.port}`;

            const res = await fetch(`${backendBase}/api/players/${accountId}/characters`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.character) {
                    const char = data.character;
                    // Populate Character Data
                    charMain.innerHTML = `<span class="char-name-highlight">${char.firstName} ${char.lastName}</span>`;
                    charLevel.textContent = `LVL ${char.level || 0}`;

                    // Highlight card border to show owned character
                    module.style.borderColor = 'var(--accent-secondary)';
                    module.classList.add('has-character');
                } else {
                    // No Character
                    charMain.innerHTML = `<span class="char-create-text">Create New Operative</span>`;
                    charLevel.textContent = '';
                }
            } else {
                // Error / 404
                charMain.innerHTML = `<span class="char-create-text">Create New Operative</span>`;
            }
        } catch (e) {
            console.warn(`Failed to fetch char for ${server.serverName}`, e);
            const charMain = document.getElementById(`char-main-${server.id}`);
            if (charMain) charMain.innerHTML = `<span class="char-create-text">Connection Failed</span>`;
        }
    });
}

window.selectServer = function (id, url) {
    console.log(`Neural Link Established with Sector: ${id}`);
    const module = event.currentTarget;
    module.style.borderColor = 'var(--accent-primary)';
    module.style.boxShadow = '0 0 50px var(--accent-glow)';
};

// --- Add Glitch Pulse Animation to CSS ---
const style = document.createElement('style');
style.textContent = `
    @keyframes glitch-bounce {
        0% { transform: translateX(0); }
        20% { transform: translateX(-5px) skewX(5deg); }
        40% { transform: translateX(5px) skewX(-5deg); }
        60% { transform: translateX(-2px); }
        100% { transform: translateX(0); }
    }
`;
document.head.append(style);

// --- Account Profile Modal Logic ---
const viewPlay = document.getElementById('view-play');
const viewAccount = document.getElementById('view-account');
const viewStore = document.getElementById('view-store');
const navAccountBtn = document.getElementById('nav-account-btn');

function switchTab(tab, updateHash = true) {
    if (!viewPlay || !viewAccount) return;

    // Default to 'play' if no tab specified
    if (!tab) tab = 'play';

    viewPlay.classList.add('hidden');
    viewAccount.classList.add('hidden');
    if (viewStore) viewStore.classList.add('hidden');
    if (document.getElementById('view-news')) document.getElementById('view-news').classList.add('hidden');
    document.querySelectorAll('.nav-links a').forEach(el => el.classList.remove('active'));

    if (tab === 'play' || tab === 'characters') {
        viewPlay.classList.remove('hidden');
        const playBtn = document.querySelector('.nav-links a:first-child');
        if (playBtn) playBtn.classList.add('active');
        if (updateHash) window.location.hash = 'characters';
    } else if (tab === 'account') {
        viewAccount.classList.remove('hidden');
        if (navAccountBtn) navAccountBtn.classList.add('active');
        const profileUsername = document.getElementById('profile-username');
        const profileEmail = document.getElementById('profile-email');
        if (profileUsername) profileUsername.textContent = localStorage.getItem('auth_username') || 'Unknown';
        if (profileEmail) profileEmail.textContent = localStorage.getItem('auth_email') || 'Not Available';
        if (updateHash) window.location.hash = 'account';
    } else if (tab === 'news') {
        const viewNews = document.getElementById('view-news');
        if (viewNews) {
            viewNews.classList.remove('hidden');
            const newsBtn = document.querySelector('.nav-links a[href="#news"]');
            if (newsBtn) newsBtn.classList.add('active');
            if (updateHash) window.location.hash = 'news';
        }
    } else if (tab === 'store') {
        if (viewStore) {
            viewStore.classList.remove('hidden');
            const storeBtn = document.querySelector('.nav-links a[href="#store"]');
            if (storeBtn) storeBtn.classList.add('active');
            if (updateHash) window.location.hash = 'store';
        }
    }
}

// --- Navigation Persistence ---
function handleNavigation() {
    const hash = window.location.hash.replace('#', '');
    const [tab, subId] = hash.split('/');

    if (!localStorage.getItem('auth_token')) return;

    if (tab) {
        switchTab(tab, false);
        if (tab === 'news' && subId) {
            // Wait for DOM to ensure news cards are rendered if needed, 
            // but for simple logic we can just call showArticle
            showArticle(subId);
        }
    } else {
        switchTab('play', false);
    }
}

window.addEventListener('hashchange', handleNavigation);

if (navAccountBtn) {
    navAccountBtn.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('account');
    });
}

// --- NEWS ARTICLE SWITCHING ---
function showArticle(id) {
    const gridView = document.getElementById('news-grid-view');
    const articleView = document.getElementById('news-article-view');

    if (gridView && articleView) {
        gridView.classList.add('hidden');
        articleView.classList.remove('hidden');
        window.location.hash = `news/${id}`;

        // Scroll to top of the view section
        const parentView = articleView.closest('.view-section');
        if (parentView) parentView.scrollTop = 0;

        // Optionally update content based on ID
        if (id === 'season') {
            document.getElementById('article-title').textContent = "SEASON'S GREETINGS";
            document.getElementById('article-date').textContent = "18.12.2025";
            document.getElementById('article-subtitle').textContent = "Winter has arrived in Metrostate.";
        } else if (id === 'patch') {
            document.getElementById('article-title').textContent = "BALANCE PATCH 2.4";
            document.getElementById('article-date').textContent = "11.12.2025";
            document.getElementById('article-subtitle').textContent = "Tactical gear and operative skill adjustments.";
        }
    }
}

function hideArticle() {
    const gridView = document.getElementById('news-grid-view');
    const articleView = document.getElementById('news-article-view');

    if (gridView && articleView) {
        articleView.classList.add('hidden');
        gridView.classList.remove('hidden');
        window.location.hash = 'news';
    }
}

const allNavLinks = document.querySelectorAll('.nav-links a');
allNavLinks.forEach(link => {
    const text = link.textContent.trim();
    if (text === 'CHARACTERS') {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('play');
        });
    } else if (text === 'NEWS') {
        link.href = '#news';
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('news');
        });
    } else if (text === 'STORE') {
        link.href = '#store';
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('store');
        });
    }
});

init();
