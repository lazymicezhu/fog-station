
// modules/login.js

export function initLoginSystem() {
  const overlay = document.getElementById('login-overlay');
  if (!overlay) return;

  // Check if already logged in (optional: strictly speaking the prompt implies a login screen every time, 
  // but usually "terminals" remember sessions. Let's do a quick check: 
  // If user exists, maybe pre-fill or show "Welcome back". 
  // For this request, let's force the cool login sequence but pre-fill if available.)
  const savedUser = localStorage.getItem('fog_station_user');
  let userData = savedUser ? JSON.parse(savedUser) : null;

  const inputUser = document.getElementById('login-user');
  const inputPass = document.getElementById('login-pass');
  const stepAuth = document.getElementById('step-auth');
  const stepProfile = document.getElementById('step-profile');
  const btnVerify = document.getElementById('btn-verify');
  
  const inputDesc = document.getElementById('login-desc');
  const btnComplete = document.getElementById('btn-complete-login');
  
  const avatarUpload = document.getElementById('avatar-upload');
  const avatarPreview = document.getElementById('avatar-preview-img');
  const btnUseDefault = document.getElementById('btn-avatar-default');
  
  let currentAvatar = userData?.avatar || 'arts/派蒙1.jpeg';

  // Pre-fill if exists
  if (userData) {
    inputUser.value = userData.username || '';
    // Don't pre-fill password for "security" theater
    inputDesc.value = userData.description || '';
    currentAvatar = userData.avatar;
    avatarPreview.src = currentAvatar;
  } else {
    // Default avatar state
    avatarPreview.src = currentAvatar;
  }

  // --- Step 1: Auth ---
  
  function handleAuth() {
    const user = inputUser.value.trim();
    const pass = inputPass.value.trim();
    
    if (!user || !pass) {
      showError('请输入完整凭据');
      return;
    }
    
    // Simulate verification delay
    btnVerify.textContent = 'VERIFYING...';
    btnVerify.disabled = true;
    
    setTimeout(() => {
        // "Success" - reveal step 2
        stepAuth.classList.add('hidden');
        stepProfile.classList.remove('hidden');
        // Focus next input
        inputDesc.focus();
    }, 800);
  }

  btnVerify.addEventListener('click', handleAuth);
  inputPass.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAuth();
  });

  // --- Step 2: Profile & Avatar ---

  // Avatar: Upload
  avatarUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        currentAvatar = evt.target.result; // Base64
        avatarPreview.src = currentAvatar;
      };
      reader.readAsDataURL(file);
    }
  });

  // Avatar: Default
  btnUseDefault.addEventListener('click', () => {
    currentAvatar = 'arts/派蒙1.jpeg';
    avatarPreview.src = currentAvatar;
    // Reset file input
    avatarUpload.value = '';
  });

  function completeLogin() {
    const desc = inputDesc.value.trim();
    if (!desc) {
      showError('请填写描述');
      return;
    }

    const finalUserData = {
      username: inputUser.value.trim(),
      description: desc,
      avatar: currentAvatar,
      lastLogin: new Date().toISOString()
    };

    // Save
    localStorage.setItem('fog_station_user', JSON.stringify(finalUserData));
    
    // Update global UI (Paimon/User info if applicable)
    updateGameUI(finalUserData);

    // Animation Out
    overlay.classList.add('access-granted');
    
    setTimeout(() => {
        overlay.style.display = 'none';
        // Trigger any game start logic if needed
        if (typeof window.resetPaimonWidget === 'function') {
          window.resetPaimonWidget();
        }
    }, 1500);
  }

  btnComplete.addEventListener('click', completeLogin);
  inputDesc.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') completeLogin();
  });
}

function showError(code) {
  const el = document.getElementById('login-status');
  if (el) {
    el.textContent = `错误：${code}`;
    el.classList.add('blink');
    setTimeout(() => el.classList.remove('blink'), 500);
  }
}

function updateGameUI(userData) {
    // If we want to show the user avatar in the main UI, we can do it here.
    // For now, let's update the Paimon widget or just console log.
    // The prompt asked for "Select Assistant Avatar", but the main game uses Paimon.
    // Let's assume the floating widget icon changes to this selection.
    
    const paimonAvatar = document.querySelector('#paimon-avatar img');
    if (paimonAvatar) {
        paimonAvatar.src = userData.avatar;
    }
    
    // Also update the Paimon message to welcome the user
    const paimonMsg = document.getElementById('paimon-message');
    if (paimonMsg) {
        paimonMsg.textContent = `欢迎回来，研究员 ${userData.username}`;
    }
}
