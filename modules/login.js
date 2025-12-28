
// modules/login.js

function typewriter(element, text, speed = 50, callback = null) {
  if (!element) return;
  element.textContent = '';
  element.classList.add('typewriter');
  let i = 0;
  
  // Clear any existing interval
  if (element.dataset.typewriterInterval) {
    clearInterval(parseInt(element.dataset.typewriterInterval));
  }

  const interval = setInterval(() => {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
    } else {
      clearInterval(interval);
      delete element.dataset.typewriterInterval;
      element.classList.remove('typewriter'); // Remove cursor after done (optional)
      if (callback) callback();
    }
  }, speed);
  
  element.dataset.typewriterInterval = interval.toString();
}

export function initLoginSystem() {
  const overlay = document.getElementById('login-overlay');
  if (!overlay) return;

  const savedUser = localStorage.getItem('fog_station_user');
  let userData = savedUser ? JSON.parse(savedUser) : null;

  const inputUser = document.getElementById('login-user');
  const inputPass = document.getElementById('login-pass');
  const stepAuth = document.getElementById('step-auth');
  const stepProfile = document.getElementById('step-profile');
  const btnVerify = document.getElementById('btn-verify');
  const statusLine = document.getElementById('login-status');
  
  const inputDesc = document.getElementById('login-desc');
  const btnComplete = document.getElementById('btn-complete-login');
  
  const avatarUpload = document.getElementById('avatar-upload');
  const avatarPreview = document.getElementById('avatar-preview-img');
  const btnUseDefault = document.getElementById('btn-avatar-default');
  
  let currentAvatar = userData?.avatar || 'arts/派蒙1.jpeg';

  if (userData) {
    updateGameUI(userData);
    overlay.style.display = 'none';
    if (typeof window.resetPaimonWidget === 'function') {
      window.resetPaimonWidget();
    }
    return;
  }

  // Initial Typewriter Status
  typewriter(statusLine, '系统待机中... 正在初始化安全协议...', 50);

  // Pre-fill if exists
  if (userData) {
    inputUser.value = userData.username || '';
    inputDesc.value = userData.description || '';
    currentAvatar = userData.avatar;
    avatarPreview.src = currentAvatar;
  } else {
    avatarPreview.src = currentAvatar;
  }

  // --- Step 1: Auth ---
  
  function handleAuth() {
    const user = inputUser.value.trim();
    const pass = inputPass.value.trim();
    
    if (!user || !pass) {
      showError('错误：请输入完整凭据');
      return;
    }
    
    // Simulate verification delay
    btnVerify.textContent = '验证中...';
    btnVerify.disabled = true;
    typewriter(statusLine, '正在连接中央数据库... 验证身份哈希...', 40);
    
    setTimeout(() => {
        typewriter(statusLine, '身份验证通过。需要完善档案信息。', 50);
        
        // "Success" - reveal step 2 with fade
        stepAuth.style.opacity = '0';
        setTimeout(() => {
            stepAuth.classList.add('hidden');
            stepProfile.classList.remove('hidden');
            stepProfile.style.opacity = '0';
            requestAnimationFrame(() => {
                stepProfile.style.transition = 'opacity 0.5s ease';
                stepProfile.style.opacity = '1';
            });
            inputDesc.focus();
        }, 400); // Wait for opacity transition
    }, 1200);
  }

  btnVerify.addEventListener('click', handleAuth);
  inputPass.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAuth();
  });

  // --- Step 2: Profile & Avatar ---

  avatarUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        currentAvatar = evt.target.result;
        avatarPreview.src = currentAvatar;
      };
      reader.readAsDataURL(file);
    }
  });

  btnUseDefault.addEventListener('click', () => {
    currentAvatar = 'arts/派蒙1.jpeg';
    avatarPreview.src = currentAvatar;
    avatarUpload.value = '';
  });

  function completeLogin() {
    const desc = inputDesc.value.trim();
    if (!desc) {
      showError('错误：请填写描述');
      return;
    }

    const finalUserData = {
      username: inputUser.value.trim(),
      description: desc,
      avatar: currentAvatar,
      lastLogin: new Date().toISOString()
    };

    localStorage.setItem('fog_station_user', JSON.stringify(finalUserData));
    updateGameUI(finalUserData);

    // Animation Out
    typewriter(statusLine, '配置完成。欢迎回来，研究员。', 50);
    document.querySelector('.terminal-window').classList.add('success');
    
    setTimeout(() => {
        overlay.classList.add('access-granted');
        setTimeout(() => {
            overlay.style.display = 'none';
            if (typeof window.resetPaimonWidget === 'function') {
              window.resetPaimonWidget();
            }
        }, 800); // Faster exit
    }, 1000);
  }

  btnComplete.addEventListener('click', completeLogin);
  inputDesc.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') completeLogin();
  });
}

function showError(text) {
  const el = document.getElementById('login-status');
  if (el) {
    // Stop any existing typewriter
    if (el.dataset.typewriterInterval) clearInterval(parseInt(el.dataset.typewriterInterval));
    el.classList.remove('typewriter');
    
    el.textContent = text;
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
