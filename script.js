// ================================================
// SIMPEG-TIGA - FRONTEND JAVASCRIPT
// Versi Fixed - Bug Registration & Tab Switching
// ================================================

const API_URL = 'https://script.google.com/macros/s/AKfycby6VosWb5AaRz0E-1kSsjCLtM-WGm3WORdSgfHZj2l_bTT_vMAOZBev91zADLdHxgpA/exec';

// State variables
let currentUser = null;
let currentToken = null;
let currentPhotoData = { masuk: null, pulang: null };
let currentCameraStream = null;
let currentLocation = { lat: null, lng: null, accuracy: null };
let watchId = null;
let forgotEmail = '';
let forgotResetToken = '';
let currentSickFilter = 'pending';
let captchaAnswer = 0;
let sickFileBase64 = null;
let otpInterval = null;

// ================================================
// LOADING SCREEN
// ================================================
function hideLoadingScreen() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.add('hidden');
}

function showLoadingScreen() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.remove('hidden');
}

// ================================================
// INITIALIZATION
// ================================================
document.addEventListener('DOMContentLoaded', function () {
  setTimeout(hideLoadingScreen, 500);

  updateDateTime();
  setInterval(updateDateTime, 1000);

  initYearSelects();
  generateCaptcha();
  setupOTPInputs();

  // Setup navigasi form
  const showRegisterBtn = document.getElementById('showRegisterBtn');
  if (showRegisterBtn) {
    showRegisterBtn.addEventListener('click', function (e) {
      e.preventDefault();
      showForm('register');
    });
  }

  const showLoginBtn = document.getElementById('showLoginBtn');
  if (showLoginBtn) {
    showLoginBtn.addEventListener('click', function (e) {
      e.preventDefault();
      showForm('login');
    });
  }

  const forgotLink = document.getElementById('forgotPasswordLink');
  if (forgotLink) {
    forgotLink.addEventListener('click', function (e) {
      e.preventDefault();
      showForm('forgot');
    });
  }

  // Enter key support
  document.getElementById('loginPassword') && document.getElementById('loginPassword').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') doLogin();
  });

  checkSession();

  // Fallback hide loading
  setTimeout(hideLoadingScreen, 3000);
});

// ================================================
// UPDATE DATE TIME
// ================================================
function updateDateTime() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  ['guruDate', 'adminDate'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.textContent = dateStr;
  });
  ['guruTime', 'adminTime'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.textContent = timeStr;
  });
}

// ================================================
// INIT YEAR SELECTS
// ================================================
function initYearSelects() {
  const currentYear = new Date().getFullYear();
  ['historyYear', 'adminYear'].forEach(function (id) {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = '';
    for (let y = currentYear; y >= currentYear - 3; y--) {
      const option = document.createElement('option');
      option.value = y;
      option.textContent = y;
      select.appendChild(option);
    }
  });

  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const historyMonth = document.getElementById('historyMonth');
  if (historyMonth) historyMonth.value = currentMonth;
  const adminMonth = document.getElementById('adminMonth');
  if (adminMonth) adminMonth.value = currentMonth;
}

// ================================================
// CAPTCHA
// ================================================
function generateCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  captchaAnswer = a + b;
  const el = document.getElementById('captchaQuestion');
  if (el) el.textContent = a + ' + ' + b + ' = ?';
}

// ================================================
// OTP INPUTS
// ================================================
function setupOTPInputs() {
  const otpDigits = document.querySelectorAll('.otp-digit');
  otpDigits.forEach(function (input, idx) {
    input.addEventListener('input', function (e) {
      // Hanya angka
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
      if (e.target.value.length === 1 && idx < otpDigits.length - 1) {
        otpDigits[idx + 1].focus();
      }
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && !e.target.value && idx > 0) {
        otpDigits[idx - 1].focus();
      }
    });
  });
}

// ================================================
// SESSION MANAGEMENT
// ================================================
function checkSession() {
  const token = localStorage.getItem('simpeg_token');
  const userStr = localStorage.getItem('simpeg_user');
  const expiry = localStorage.getItem('simpeg_expiry');

  if (token && userStr && expiry && Date.now() < parseInt(expiry)) {
    currentToken = token;
    try {
      currentUser = JSON.parse(userStr);
      applyRoleDashboard();
    } catch (e) {
      clearSession();
      showAuthPage();
    }
  } else {
    clearSession();
    showAuthPage();
  }
}

function saveSession(token, user, expiresIn) {
  const expiry = Date.now() + (expiresIn * 1000);
  localStorage.setItem('simpeg_token', token);
  localStorage.setItem('simpeg_user', JSON.stringify(user));
  localStorage.setItem('simpeg_expiry', String(expiry));
  currentToken = token;
  currentUser = user;
}

function clearSession() {
  localStorage.removeItem('simpeg_token');
  localStorage.removeItem('simpeg_user');
  localStorage.removeItem('simpeg_expiry');
  currentToken = null;
  currentUser = null;
  if (watchId) navigator.geolocation.clearWatch(watchId);
  if (currentCameraStream) {
    currentCameraStream.getTracks().forEach(function (t) { t.stop(); });
    currentCameraStream = null;
  }
}

// ================================================
// SHOW FORM - FIXED: pakai display langsung di inline style
// ================================================
function showForm(formName) {
  // Sembunyikan semua container
  const allContainers = [
    'loginFormContainer',
    'registerFormContainer',
    'verifyContainer',
    'forgotContainer'
  ];

  allContainers.forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Tampilkan yang dipilih
  const targetMap = {
    'login': 'loginFormContainer',
    'register': 'registerFormContainer',
    'verify': 'verifyContainer',
    'forgot': 'forgotContainer'
  };

  const targetId = targetMap[formName];
  if (targetId) {
    const el = document.getElementById(targetId);
    if (el) el.style.display = 'block';
  }

  // Reset forgot password steps jika buka forgot
  if (formName === 'forgot') {
    const step1 = document.getElementById('forgotStep1');
    const step2 = document.getElementById('forgotStep2');
    const step3 = document.getElementById('forgotStep3');
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
    if (step3) step3.style.display = 'none';

    const forgotEmailEl = document.getElementById('forgotEmail');
    if (forgotEmailEl) forgotEmailEl.value = '';

    const forgotMsgEl = document.getElementById('forgotMessage');
    if (forgotMsgEl) forgotMsgEl.innerHTML = '';
  }
}

function backToLogin() {
  showForm('login');
}

// ================================================
// PAGE SWITCHING
// ================================================
function applyRoleDashboard() {
  if (!currentUser) return;

  const pageAuth = document.getElementById('pageAuth');
  const pageGuru = document.getElementById('pageGuru');
  const pageKepsek = document.getElementById('pageKepsek');

  if (pageAuth) pageAuth.style.display = 'none';

  if (currentUser.role === 'kepsek') {
    if (pageGuru) pageGuru.style.display = 'none';
    if (pageKepsek) pageKepsek.style.display = 'block';

    const nameEl = document.getElementById('kepsekName');
    const avatarEl = document.getElementById('kepsekAvatar');
    if (nameEl) nameEl.textContent = currentUser.name;
    if (avatarEl) avatarEl.textContent = currentUser.name.charAt(0).toUpperCase();

    loadAdminDashboard();
  } else {
    if (pageKepsek) pageKepsek.style.display = 'none';
    if (pageGuru) pageGuru.style.display = 'block';

    const nameEl = document.getElementById('guruName');
    const avatarEl = document.getElementById('guruAvatar');
    if (nameEl) nameEl.textContent = currentUser.name;
    if (avatarEl) avatarEl.textContent = currentUser.name.charAt(0).toUpperCase();

    loadGuruDashboard();
  }
}

function showAuthPage() {
  const pageAuth = document.getElementById('pageAuth');
  const pageGuru = document.getElementById('pageGuru');
  const pageKepsek = document.getElementById('pageKepsek');

  if (pageAuth) pageAuth.style.display = 'block';
  if (pageGuru) pageGuru.style.display = 'none';
  if (pageKepsek) pageKepsek.style.display = 'none';

  showForm('login');
}

// ================================================
// API CALL
// ================================================
async function callAPI(action, data) {
  data = data || {};
  showLoadingScreen();
  try {
    const payload = Object.assign({ action: action }, data);
    if (currentToken && !data.token) payload.token = currentToken;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const result = await response.json();
    hideLoadingScreen();
    return result;
  } catch (error) {
    hideLoadingScreen();
    console.error('API Error:', error);
    return { status: 'error', message: 'Koneksi gagal. Periksa internet Anda.' };
  }
}

// ================================================
// TOAST & MESSAGE
// ================================================
function showToast(message, type) {
  type = type || 'success';
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;

  const iconMap = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-info-circle' };
  const icon = iconMap[type] || 'fa-info-circle';

  toast.innerHTML = '<i class="fas ' + icon + '"></i><span>' + message + '</span>';
  container.appendChild(toast);

  setTimeout(function () {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(function () { if (toast.parentNode) toast.remove(); }, 300);
  }, 3500);
}

function showMessage(elementId, message, type) {
  type = type || 'error';
  const el = document.getElementById(elementId);
  if (!el) return;

  const colorMap = {
    error: '#fef2f2',
    success: '#f0fdf4',
    warning: '#fffbeb'
  };
  const textColorMap = {
    error: '#dc2626',
    success: '#16a34a',
    warning: '#d97706'
  };

  el.innerHTML = message;
  el.style.display = 'block';
  el.style.padding = '10px 14px';
  el.style.borderRadius = '10px';
  el.style.fontSize = '13px';
  el.style.background = colorMap[type] || colorMap.error;
  el.style.color = textColorMap[type] || textColorMap.error;

  setTimeout(function () {
    el.style.display = 'none';
  }, 6000);
}

// ================================================
// AUTH: LOGIN
// ================================================
async function doLogin() {
  const emailEl = document.getElementById('loginEmail');
  const passEl = document.getElementById('loginPassword');

  if (!emailEl || !passEl) return;

  const email = emailEl.value.trim();
  const password = passEl.value;

  if (!email || !password) {
    showMessage('loginMessage', 'Email dan password wajib diisi', 'error');
    return;
  }

  const result = await callAPI('login', { email: email, password: password });

  if (result.status === 'success') {
    saveSession(result.data.token, result.data.user, result.data.expires_in);
    applyRoleDashboard();
    showToast('Login berhasil! Selamat datang, ' + result.data.user.name.split(' ')[0] + '.', 'success');
  } else {
    showMessage('loginMessage', result.message, 'error');
    if (result.unverified) {
      setTimeout(function () { showForm('verify'); }, 2000);
    }
  }
}

// ================================================
// AUTH: REGISTER - FIXED
// ================================================
async function doRegister() {
  const nameEl = document.getElementById('regName');
  const emailEl = document.getElementById('regEmail');
  const passEl = document.getElementById('regPassword');
  const confirmEl = document.getElementById('regConfirm');
  const captchaEl = document.getElementById('captchaAnswer');

  if (!nameEl || !emailEl || !passEl || !confirmEl) {
    showToast('Form tidak lengkap', 'error');
    return;
  }

  const name = nameEl.value.trim();
  const email = emailEl.value.trim();
  const password = passEl.value;
  const confirm = confirmEl.value;
  const captcha = captchaEl ? parseInt(captchaEl.value) : -1;

  // Ambil role yang dipilih
  let selectedRole = 'guru';
  const roleRadios = document.querySelectorAll('input[name="regRole"]');
  roleRadios.forEach(function (r) {
    if (r.checked) selectedRole = r.value;
  });

  // Validasi
  if (!name) { showMessage('registerMessage', 'Nama lengkap wajib diisi', 'error'); return; }
  if (!email) { showMessage('registerMessage', 'Email wajib diisi', 'error'); return; }
  if (!password) { showMessage('registerMessage', 'Password wajib diisi', 'error'); return; }
  if (password.length < 8) { showMessage('registerMessage', 'Password minimal 8 karakter', 'error'); return; }
  if (password !== confirm) { showMessage('registerMessage', 'Konfirmasi password tidak cocok', 'error'); return; }
  if (captcha !== captchaAnswer) {
    showMessage('registerMessage', 'Jawaban captcha salah', 'error');
    generateCaptcha();
    if (captchaEl) captchaEl.value = '';
    return;
  }

  const result = await callAPI('register', {
    name: name,
    email: email,
    password: password,
    confirm_password: confirm,
    role: selectedRole
  });

  if (result.status === 'success') {
    showToast(result.message, 'success');

    const verifyMsg = document.getElementById('verifyMessage');
    if (verifyMsg) {
      verifyMsg.innerHTML = 'Link aktivasi telah dikirim ke <strong>' + email + '</strong>.<br>Silakan cek inbox atau folder spam.';
    }

    showForm('verify');
  } else {
    showMessage('registerMessage', result.message, 'error');
  }
}

async function resendActivation() {
  const email = prompt('Masukkan email yang terdaftar:');
  if (!email) return;

  const result = await callAPI('resend_activation', { email: email });
  showToast(result.message, result.status === 'success' ? 'success' : 'error');
}

async function manualActivate() {
  const tokenEl = document.getElementById('manualToken');
  if (!tokenEl) return;

  const token = tokenEl.value.trim();
  if (!token) { showToast('Masukkan token aktivasi terlebih dahulu', 'error'); return; }

  const result = await callAPI('activate', { token: token });
  if (result.status === 'success') {
    showToast(result.message, 'success');
    setTimeout(function () { showForm('login'); }, 1500);
  } else {
    showToast(result.message, 'error');
  }
}

// ================================================
// AUTH: FORGOT PASSWORD
// ================================================
async function sendOTP() {
  const emailEl = document.getElementById('forgotEmail');
  if (!emailEl) return;

  const email = emailEl.value.trim();
  if (!email) { showMessage('forgotMessage', 'Masukkan email Anda', 'error'); return; }

  forgotEmail = email;
  const result = await callAPI('forgot_password', { email: email });

  if (result.status === 'success') {
    showMessage('forgotMessage', result.message, 'success');
    document.getElementById('forgotStep1').style.display = 'none';
    document.getElementById('forgotStep2').style.display = 'block';
    startOTPTimer(15 * 60);
  } else {
    showMessage('forgotMessage', result.message, 'error');
  }
}

function startOTPTimer(seconds) {
  if (otpInterval) clearInterval(otpInterval);
  const timerEl = document.getElementById('otpTimer');
  if (!timerEl) return;

  let remaining = seconds;
  otpInterval = setInterval(function () {
    remaining--;
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    timerEl.textContent = mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
    if (remaining <= 0) {
      clearInterval(otpInterval);
      timerEl.textContent = '00:00';
    }
  }, 1000);
}

async function verifyOTP() {
  const otpDigits = document.querySelectorAll('.otp-digit');
  let otp = '';
  otpDigits.forEach(function (d) { otp += d.value; });

  if (otp.length !== 6) {
    showMessage('forgotMessage', 'Masukkan 6 digit OTP', 'error');
    return;
  }

  const result = await callAPI('verify_otp', { email: forgotEmail, otp: otp });

  if (result.status === 'success') {
    forgotResetToken = result.data.reset_token;
    if (otpInterval) clearInterval(otpInterval);
    document.getElementById('forgotStep2').style.display = 'none';
    document.getElementById('forgotStep3').style.display = 'block';
    showMessage('forgotMessage', 'OTP valid! Buat password baru.', 'success');
  } else {
    showMessage('forgotMessage', result.message, 'error');
  }
}

async function resendOTP() {
  const result = await callAPI('forgot_password', { email: forgotEmail });
  if (result.status === 'success') {
    showMessage('forgotMessage', result.message, 'success');
    if (otpInterval) clearInterval(otpInterval);
    startOTPTimer(15 * 60);
  } else {
    showMessage('forgotMessage', result.message, 'error');
  }
}

async function resetPassword() {
  const newPassEl = document.getElementById('newPassword');
  const confirmPassEl = document.getElementById('confirmNewPassword');
  if (!newPassEl || !confirmPassEl) return;

  const newPass = newPassEl.value;
  const confirmPass = confirmPassEl.value;

  if (!newPass) { showMessage('forgotMessage', 'Password baru wajib diisi', 'error'); return; }
  if (newPass.length < 8) { showMessage('forgotMessage', 'Password minimal 8 karakter', 'error'); return; }
  if (newPass !== confirmPass) { showMessage('forgotMessage', 'Konfirmasi password tidak cocok', 'error'); return; }

  const result = await callAPI('reset_password', {
    email: forgotEmail,
    reset_token: forgotResetToken,
    new_password: newPass,
    confirm_password: confirmPass
  });

  if (result.status === 'success') {
    showToast(result.message, 'success');
    setTimeout(function () { showForm('login'); }, 1500);
  } else {
    showMessage('forgotMessage', result.message, 'error');
  }
}

// ================================================
// LOGOUT
// ================================================
async function logout() {
  await callAPI('logout', {});
  clearSession();
  showAuthPage();
  showToast('Logout berhasil', 'success');
}

// ================================================
// GEOLOCATION
// ================================================
function startGeolocation() {
  if (!navigator.geolocation) {
    updateLocationUI('error', 'Browser tidak mendukung GPS');
    return;
  }

  if (watchId) navigator.geolocation.clearWatch(watchId);

  watchId = navigator.geolocation.watchPosition(
    function (position) {
      currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
      updateLocationUI('ok', 'Lokasi terdeteksi (±' + Math.round(currentLocation.accuracy) + 'm)');
      checkAbsenButtons();
    },
    function (error) {
      const msgs = {
        1: 'Izin lokasi ditolak. Aktifkan GPS di browser.',
        2: 'Lokasi tidak tersedia.',
        3: 'Timeout. Coba lagi.'
      };
      updateLocationUI('error', msgs[error.code] || 'Gagal mendapatkan lokasi');
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

function updateLocationUI(status, message) {
  ['locMasuk', 'locPulang'].forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (status === 'ok') {
      el.innerHTML = '<div class="loc-ok"><i class="fas fa-map-marker-alt"></i> ' + message + '</div>';
    } else if (status === 'error') {
      el.innerHTML = '<div class="loc-error"><i class="fas fa-exclamation-triangle"></i> ' + message + '</div>';
    } else {
      el.innerHTML = '<div class="loc-loading"><i class="fas fa-spinner fa-spin"></i> Mendeteksi lokasi...</div>';
    }
  });
}

function checkAbsenButtons() {
  const hasLoc = !!(currentLocation.lat && currentLocation.lng);
  const btnMasuk = document.getElementById('btnAbsenMasuk');
  const btnPulang = document.getElementById('btnAbsenPulang');
  if (btnMasuk) btnMasuk.disabled = !(hasLoc && currentPhotoData.masuk);
  if (btnPulang) btnPulang.disabled = !(hasLoc && currentPhotoData.pulang);
}

// ================================================
// CAMERA
// ================================================
async function startCamera(type) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('Browser tidak mendukung kamera', 'error');
    return;
  }

  try {
    if (currentCameraStream) {
      currentCameraStream.getTracks().forEach(function (t) { t.stop(); });
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    });

    currentCameraStream = stream;
    const suffix = type === 'masuk' ? 'Masuk' : 'Pulang';

    const video = document.getElementById('video' + suffix);
    if (video) { video.srcObject = stream; video.style.display = 'block'; }

    const overlay = document.getElementById('cameraOverlay' + suffix);
    if (overlay) overlay.style.display = 'none';

    const startBtn = document.getElementById('btnStartCam' + suffix);
    const captureBtn = document.getElementById('btnCapture' + suffix);
    const stopBtn = document.getElementById('btnStop' + suffix);

    if (startBtn) startBtn.style.display = 'none';
    if (captureBtn) captureBtn.style.display = 'inline-flex';
    if (stopBtn) stopBtn.style.display = 'inline-flex';

  } catch (err) {
    showToast('Gagal akses kamera: ' + err.message, 'error');
  }
}

function stopCamera(type) {
  if (currentCameraStream) {
    currentCameraStream.getTracks().forEach(function (t) { t.stop(); });
    currentCameraStream = null;
  }

  const suffix = type === 'masuk' ? 'Masuk' : 'Pulang';

  const video = document.getElementById('video' + suffix);
  if (video) { video.srcObject = null; video.style.display = 'none'; }

  const overlay = document.getElementById('cameraOverlay' + suffix);
  if (overlay) overlay.style.display = 'flex';

  const startBtn = document.getElementById('btnStartCam' + suffix);
  const captureBtn = document.getElementById('btnCapture' + suffix);
  const stopBtn = document.getElementById('btnStop' + suffix);

  if (startBtn) startBtn.style.display = 'inline-flex';
  if (captureBtn) captureBtn.style.display = 'none';
  if (stopBtn) stopBtn.style.display = 'none';
}

function startCountdown(type) {
  let count = 3;
  const suffix = type === 'masuk' ? 'Masuk' : 'Pulang';
  const countdownEl = document.getElementById('countdown' + suffix);
  if (!countdownEl) return;

  countdownEl.style.display = 'flex';
  countdownEl.textContent = count;

  const interval = setInterval(function () {
    count--;
    if (count > 0) {
      countdownEl.textContent = count;
    } else {
      clearInterval(interval);
      countdownEl.style.display = 'none';
      capturePhoto(type);
    }
  }, 1000);
}

function capturePhoto(type) {
  const suffix = type === 'masuk' ? 'Masuk' : 'Pulang';
  const video = document.getElementById('video' + suffix);
  const canvas = document.getElementById('canvas' + suffix);
  if (!video || !canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  ctx.drawImage(video, 0, 0);

  // Timestamp overlay
  const now = new Date();
  const timestamp = now.toLocaleString('id-ID', { timeZone: 'Asia/Jayapura', hour12: false });
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
  ctx.fillStyle = '#fff';
  ctx.font = '12px monospace';
  ctx.fillText(timestamp + ' WIT', 8, canvas.height - 10);

  currentPhotoData[type] = canvas.toDataURL('image/jpeg', 0.8);

  stopCamera(type);
  checkAbsenButtons();

  const preview = document.getElementById('preview' + suffix);
  const previewImg = document.getElementById('preview' + suffix + 'Img');
  if (previewImg) previewImg.src = currentPhotoData[type];
  if (preview) preview.style.display = 'block';

  const cameraSection = document.getElementById('cameraSection' + suffix);
  if (cameraSection) cameraSection.style.display = 'none';

  showToast('Foto selfi ' + type + ' berhasil diambil', 'success');
}

function retakePhoto(type) {
  currentPhotoData[type] = null;
  const suffix = type === 'masuk' ? 'Masuk' : 'Pulang';

  const preview = document.getElementById('preview' + suffix);
  if (preview) preview.style.display = 'none';

  const cameraSection = document.getElementById('cameraSection' + suffix);
  if (cameraSection) cameraSection.style.display = 'block';

  const startBtn = document.getElementById('btnStartCam' + suffix);
  const captureBtn = document.getElementById('btnCapture' + suffix);
  const stopBtn = document.getElementById('btnStop' + suffix);
  const overlay = document.getElementById('cameraOverlay' + suffix);

  if (startBtn) startBtn.style.display = 'inline-flex';
  if (captureBtn) captureBtn.style.display = 'none';
  if (stopBtn) stopBtn.style.display = 'none';
  if (overlay) overlay.style.display = 'flex';

  checkAbsenButtons();
}

// ================================================
// PRESENSI SUBMIT
// ================================================
async function submitAbsen(type) {
  if (!currentPhotoData[type]) { showToast('Ambil foto selfi terlebih dahulu', 'error'); return; }
  if (!currentLocation.lat) { showToast('Tunggu deteksi lokasi selesai', 'error'); return; }

  const action = type === 'masuk' ? 'checkin' : 'checkout';
  const result = await callAPI(action, {
    photo_base64: currentPhotoData[type],
    lat: currentLocation.lat,
    lng: currentLocation.lng
  });

  if (result.status === 'success') {
    showToast(result.message, 'success');
    currentPhotoData[type] = null;

    const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const suffix = type === 'masuk' ? 'Masuk' : 'Pulang';
    const statusEl = document.getElementById('status' + suffix);
    const btn = document.getElementById('btnAbsen' + suffix);

    if (statusEl) statusEl.innerHTML = '<span class="badge success"><i class="fas fa-check"></i> Sudah Absen ' + suffix + ' (' + timeNow + ')</span>';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-check"></i> Sudah ' + suffix; }

    loadGuruDashboard();
  } else {
    showToast(result.message, 'error');
  }
}

// ================================================
// GURU DASHBOARD
// ================================================
async function loadGuruDashboard() {
  startGeolocation();

  const hour = new Date().getHours();
  let greeting = 'Selamat Siang';
  if (hour < 11) greeting = 'Selamat Pagi';
  else if (hour < 15) greeting = 'Selamat Siang';
  else if (hour < 18) greeting = 'Selamat Sore';
  else greeting = 'Selamat Malam';

  const greetingEl = document.getElementById('guruGreeting');
  if (greetingEl && currentUser) {
    greetingEl.textContent = greeting + ', ' + currentUser.name.split(' ')[0] + '!';
  }

  const result = await callAPI('get_dashboard_stats', {});

  if (result.status === 'success') {
    const data = result.data;
    if (data.month_summary) {
      const fields = { statHadir: data.month_summary.total_hadir, statTerlambat: data.month_summary.total_terlambat, statSakit: data.month_summary.total_sakit, statAlfa: data.month_summary.total_alfa };
      Object.keys(fields).forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.textContent = fields[id] || 0;
      });
    }

    if (data.today_attendance) {
      const att = data.today_attendance;
      if (att.checkin_time) {
        const statusMasuk = document.getElementById('statusMasuk');
        const btnMasuk = document.getElementById('btnAbsenMasuk');
        if (statusMasuk) statusMasuk.innerHTML = '<span class="badge success"><i class="fas fa-check"></i> Masuk: ' + att.checkin_time + '</span>';
        if (btnMasuk) { btnMasuk.disabled = true; btnMasuk.innerHTML = '<i class="fas fa-check"></i> Sudah Masuk'; }
      }
      if (att.checkout_time) {
        const statusPulang = document.getElementById('statusPulang');
        const btnPulang = document.getElementById('btnAbsenPulang');
        if (statusPulang) statusPulang.innerHTML = '<span class="badge success"><i class="fas fa-check"></i> Pulang: ' + att.checkout_time + '</span>';
        if (btnPulang) { btnPulang.disabled = true; btnPulang.innerHTML = '<i class="fas fa-check"></i> Sudah Pulang'; }
      }
    }

    if (data.checkin_window) {
      const el = document.getElementById('windowMasuk');
      if (el) el.textContent = data.checkin_window.start + ' – ' + data.checkin_window.end + ' WIT';
    }
    if (data.checkout_window) {
      const el = document.getElementById('windowPulang');
      if (el) el.textContent = data.checkout_window.start + ' – ' + data.checkout_window.end + ' WIT';
    }
  }

  await loadSickList();
  await loadHistory();
}

async function loadSickList() {
  const result = await callAPI('get_sick_reports', {});
  const container = document.getElementById('sickList');
  if (!container) return;

  if (result.status === 'success' && result.data.reports && result.data.reports.length > 0) {
    let html = '';
    result.data.reports.forEach(function (r) {
      const statusMap = { approved: ['Disetujui', 'success'], rejected: ['Ditolak', 'danger'], pending: ['Menunggu', 'warning'] };
      const [statusText, statusClass] = statusMap[r.status] || ['Unknown', 'warning'];
      html += '<div class="sick-item ' + r.status + '">';
      html += '<div class="sick-header"><span class="sick-date"><i class="fas fa-calendar"></i> ' + r.date + '</span>';
      html += '<span class="sick-status status-badge status-' + statusClass + '">' + statusText + '</span></div>';
      html += '<div class="sick-reason">' + r.reason_detail + '</div>';
      if (r.proof_url) html += '<div class="sick-proof"><a href="' + r.proof_url + '" target="_blank"><i class="fas fa-image"></i> Lihat Bukti</a></div>';
      html += '</div>';
    });
    container.innerHTML = html;
  } else {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>Belum ada laporan izin/sakit</p></div>';
  }
}

async function loadHistory() {
  const monthEl = document.getElementById('historyMonth');
  const yearEl = document.getElementById('historyYear');
  const month = monthEl ? monthEl.value : (new Date().getMonth() + 1).toString().padStart(2, '0');
  const year = yearEl ? yearEl.value : new Date().getFullYear();

  const result = await callAPI('get_attendance_history', { month: month, year: year });
  const container = document.getElementById('historyTable');
  if (!container) return;

  if (result.status === 'success' && result.data.records && result.data.records.length > 0) {
    let rows = '';
    result.data.records.forEach(function (r) {
      const statusClassMap = { Hadir: 'hadir', Terlambat: 'terlambat', Sakit: 'sakit', Alfa: 'alfa' };
      const cls = 'status-' + (statusClassMap[r.status] || 'alfa');
      rows += '<tr><td>' + r.date + '</td><td>' + (r.checkin_time || '-') + '</td><td>' + (r.checkout_time || '-') + '</td>';
      rows += '<td><span class="status-badge ' + cls + '">' + (r.status || '-') + '</span></td>';
      rows += '<td>';
      if (r.checkin_photo_url) rows += '<button class="btn-icon" onclick="showPhoto(\'' + r.checkin_photo_url + '\')"><i class="fas fa-camera"></i></button> ';
      if (r.checkout_photo_url) rows += '<button class="btn-icon" onclick="showPhoto(\'' + r.checkout_photo_url + '\')"><i class="fas fa-camera"></i></button>';
      if (!r.checkin_photo_url && !r.checkout_photo_url) rows += '-';
      rows += '</td></tr>';
    });
    container.innerHTML = '<div class="table-container"><table><thead><tr><th>Tanggal</th><th>Masuk</th><th>Pulang</th><th>Status</th><th>Foto</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  } else {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>Belum ada data kehadiran bulan ini</p></div>';
  }
}

async function submitSick() {
  const date = document.getElementById('sickDate') ? document.getElementById('sickDate').value : '';
  const reason = document.getElementById('sickReason') ? document.getElementById('sickReason').value.trim() : '';

  if (!date || !reason) { showToast('Tanggal dan alasan wajib diisi', 'error'); return; }

  const result = await callAPI('submit_sick', {
    date: date,
    reason_detail: reason,
    proof_base64: sickFileBase64 || ''
  });

  if (result.status === 'success') {
    showToast(result.message, 'success');
    document.getElementById('sickReason').value = '';
    const fileEl = document.getElementById('sickFile');
    if (fileEl) fileEl.value = '';
    const previewEl = document.getElementById('sickPreview');
    if (previewEl) previewEl.style.display = 'none';
    const fileNameEl = document.getElementById('sickFileName');
    if (fileNameEl) fileNameEl.textContent = 'Belum ada file';
    sickFileBase64 = null;
    await loadSickList();
  } else {
    showToast(result.message, 'error');
  }
}

function previewSickFile(input) {
  const file = input.files[0];
  if (!file) return;
  const fileNameEl = document.getElementById('sickFileName');
  if (fileNameEl) fileNameEl.textContent = file.name;

  const reader = new FileReader();
  reader.onload = function (e) {
    sickFileBase64 = e.target.result;
    const previewImg = document.getElementById('sickPreviewImg');
    const preview = document.getElementById('sickPreview');
    if (previewImg) previewImg.src = e.target.result;
    if (preview) preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

// ================================================
// KEPSEK DASHBOARD
// ================================================
async function loadAdminDashboard() {
  await loadAdminStats();
  await loadAdminRecap();
  await loadAdminSick();
  await loadTeachers();
  await loadLogs();
}

async function loadAdminStats() {
  const result = await callAPI('get_dashboard_stats', {});
  if (result.status === 'success') {
    const d = result.data;
    const map = {
      adminTotalGuru: d.total_guru_aktif,
      adminHadirHari: d.hadir_hari_ini,
      adminAlfaBulan: d.alfa_bulan_ini,
      adminPendingSick: d.pending_sick
    };
    Object.keys(map).forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.textContent = map[id] || 0;
    });
  }
}

async function loadAdminRecap() {
  const monthEl = document.getElementById('adminMonth');
  const yearEl = document.getElementById('adminYear');
  const month = monthEl ? monthEl.value : (new Date().getMonth() + 1).toString().padStart(2, '0');
  const year = yearEl ? yearEl.value : new Date().getFullYear();

  const result = await callAPI('get_all_attendance', { month: month, year: year });
  const container = document.getElementById('adminRecapTable');
  if (!container) return;

  if (result.status === 'success' && result.data.report && result.data.report.length > 0) {
    let rows = '';
    result.data.report.forEach(function (r) {
      const alfaClass = (r.summary.total_alfa >= 3) ? 'style="color:var(--danger);font-weight:700;"' : '';
      rows += '<tr><td><strong>' + r.full_name + '</strong></td>';
      rows += '<td>' + r.summary.total_hadir + '</td>';
      rows += '<td>' + r.summary.total_terlambat + '</td>';
      rows += '<td>' + r.summary.total_sakit + '</td>';
      rows += '<td ' + alfaClass + '>' + r.summary.total_alfa + '</td></tr>';
    });
    container.innerHTML = '<div class="table-container"><table><thead><tr><th>Nama Guru</th><th>Hadir</th><th>Terlambat</th><th>Sakit</th><th>Alfa</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  } else {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-chart-line"></i><p>Belum ada data</p></div>';
  }
}

async function loadAdminSick() {
  const result = await callAPI('get_sick_reports', {});
  const container = document.getElementById('adminSickList');
  if (!container) return;

  if (result.status === 'success' && result.data.reports && result.data.reports.length > 0) {
    let filtered = result.data.reports;
    if (currentSickFilter !== 'all') {
      filtered = filtered.filter(function (r) { return r.status === currentSickFilter; });
    }

    let html = '';
    filtered.forEach(function (r) {
      html += '<div class="sick-item ' + r.status + '">';
      html += '<div class="sick-header"><span class="sick-user"><i class="fas fa-user"></i> ' + (r.full_name || r.user_id) + '</span>';
      html += '<span class="sick-date"><i class="fas fa-calendar"></i> ' + r.date + '</span></div>';
      html += '<div class="sick-reason"><strong>Alasan:</strong> ' + r.reason_detail + '</div>';
      if (r.proof_url) html += '<div class="sick-proof"><a href="' + r.proof_url + '" target="_blank"><i class="fas fa-image"></i> Lihat Bukti</a></div>';
      html += '<div class="sick-actions">';
      if (r.status === 'pending') {
        html += '<button class="btn-sm-success" onclick="approveSick(\'' + r.id + '\', \'approve\')"><i class="fas fa-check"></i> Setujui</button>';
        html += '<button class="btn-sm-danger" onclick="approveSick(\'' + r.id + '\', \'reject\')"><i class="fas fa-times"></i> Tolak</button>';
      } else {
        const [sText, sClass] = r.status === 'approved' ? ['Disetujui', 'success'] : ['Ditolak', 'danger'];
        html += '<span class="status-badge status-' + sClass + '">' + sText + '</span>';
      }
      html += '</div></div>';
    });
    container.innerHTML = html || '<div class="empty-state"><i class="fas fa-inbox"></i><p>Tidak ada data</p></div>';
  } else {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>Belum ada laporan izin</p></div>';
  }
}

function filterSick(filter, btn) {
  currentSickFilter = filter;
  document.querySelectorAll('.filter-sick').forEach(function (b) { b.classList.remove('active'); });
  btn.classList.add('active');
  loadAdminSick();
}

async function approveSick(reportId, action) {
  const result = await callAPI('approve_sick', { report_id: reportId, action: action });
  if (result.status === 'success') {
    showToast(result.message, 'success');
    await loadAdminSick();
    await loadAdminStats();
  } else {
    showToast(result.message, 'error');
  }
}

async function loadTeachers() {
  const result = await callAPI('get_users', {});
  const container = document.getElementById('teachersList');
  if (!container) return;

  if (result.status === 'success' && result.data.users && result.data.users.length > 0) {
    let rows = '';
    result.data.users.forEach(function (u) {
      const isActive = u.is_active === 'true';
      rows += '<tr>';
      rows += '<td><strong>' + u.full_name + '</strong></td>';
      rows += '<td>' + u.email + '</td>';
      rows += '<td><span class="role-badge">' + (u.role === 'kepsek' ? 'Kepala Sekolah' : 'Guru') + '</span></td>';
      rows += '<td><span class="status-badge ' + (isActive ? 'status-hadir' : 'status-alfa') + '">' + (isActive ? 'Aktif' : 'Nonaktif') + '</span></td>';
      rows += '<td><button class="btn-icon" onclick="toggleUser(\'' + u.id + '\', \'' + u.is_active + '\')"><i class="fas ' + (isActive ? 'fa-ban' : 'fa-check-circle') + '"></i></button></td>';
      rows += '</tr>';
    });
    container.innerHTML = '<div class="table-container"><table><thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  } else {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>Belum ada data guru</p></div>';
  }
}

async function toggleUser(userId, currentStatus) {
  const newStatus = currentStatus !== 'true';
  const result = await callAPI('toggle_user_active', { user_id: userId, is_active: newStatus });
  if (result.status === 'success') {
    showToast(result.message, 'success');
    await loadTeachers();
  } else {
    showToast(result.message, 'error');
  }
}

async function loadLogs() {
  const result = await callAPI('get_activity_logs', { limit: 50 });
  const container = document.getElementById('logsList');
  if (!container) return;

  if (result.status === 'success' && result.data.logs && result.data.logs.length > 0) {
    const iconMap = {
      LOGIN: 'fa-sign-in-alt', LOGOUT: 'fa-sign-out-alt',
      CHECKIN: 'fa-fingerprint', CHECKOUT: 'fa-fingerprint',
      SUBMIT_SICK: 'fa-file-medical', APPROVE_SICK: 'fa-check-double',
      REGISTER: 'fa-user-plus', ACTIVATE: 'fa-check-circle'
    };
    let html = '';
    result.data.logs.forEach(function (log) {
      const icon = iconMap[log.action] || 'fa-info-circle';
      html += '<div class="log-item">';
      html += '<div class="log-icon"><i class="fas ' + icon + '"></i></div>';
      html += '<div class="log-detail"><div class="log-action">' + log.action + '</div>';
      html += '<div class="log-msg">' + (log.detail || '-') + '</div>';
      html += '<div class="log-time"><i class="fas fa-clock"></i> ' + log.timestamp + '</div></div>';
      html += '<div class="log-user">' + (log.email || 'System') + '</div>';
      html += '</div>';
    });
    container.innerHTML = html;
  } else {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>Belum ada log aktivitas</p></div>';
  }
}

async function sendMonthlyReport() {
  const monthEl = document.getElementById('adminMonth');
  const yearEl = document.getElementById('adminYear');
  const month = monthEl ? monthEl.value : (new Date().getMonth() + 1).toString().padStart(2, '0');
  const year = yearEl ? yearEl.value : new Date().getFullYear();

  const result = await callAPI('send_monthly_report', { month: month, year: year });
  showToast(result.message, result.status === 'success' ? 'success' : 'error');
}

// ================================================
// TAB SWITCHING - FIXED
// ================================================
function showTab(tabName) {
  // Sembunyikan semua tab content guru
  ['tabPresensi', 'tabIzin', 'tabRiwayat'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Tampilkan tab yang dipilih
  const target = {
    presensi: 'tabPresensi',
    izin: 'tabIzin',
    riwayat: 'tabRiwayat'
  }[tabName];

  if (target) {
    const el = document.getElementById(target);
    if (el) el.style.display = 'block';
  }

  // Update tombol tab aktif
  document.querySelectorAll('#pageGuru .tab-btn').forEach(function (btn) {
    btn.classList.remove('active');
    if (btn.getAttribute('data-tab') === tabName) btn.classList.add('active');
  });
}

function showAdminTab(tabName) {
  // Sembunyikan semua tab content admin
  ['adminTabRekap', 'adminTabIzin', 'adminTabGuru', 'adminTabLog'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Tampilkan tab yang dipilih
  const target = {
    rekap: 'adminTabRekap',
    izinAdmin: 'adminTabIzin',
    guru: 'adminTabGuru',
    log: 'adminTabLog'
  }[tabName];

  if (target) {
    const el = document.getElementById(target);
    if (el) el.style.display = 'block';
  }

  // Update tombol tab aktif
  document.querySelectorAll('#pageKepsek .tab-btn').forEach(function (btn) {
    btn.classList.remove('active');
    if (btn.getAttribute('data-tab') === tabName) btn.classList.add('active');
  });
}

// ================================================
// PDF EXPORT (placeholder)
// ================================================
async function exportPDF() {
  showToast('Fitur ekspor PDF akan segera hadir', 'warning');
}

async function exportAdminPDF() {
  showToast('Fitur ekspor PDF akan segera hadir', 'warning');
}

// ================================================
// UTILITY
// ================================================
function showPhoto(url) {
  const modalImg = document.getElementById('modalPhotoImg');
  const modal = document.getElementById('photoModal');
  if (modalImg) modalImg.src = url;
  if (modal) modal.style.display = 'flex';
}

function closePhotoModal() {
  const modal = document.getElementById('photoModal');
  if (modal) modal.style.display = 'none';
}

function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const icon = input.parentElement ? input.parentElement.querySelector('.toggle-password i') : null;
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
  } else {
    input.type = 'password';
    if (icon) { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
  }
}