// ================================================
// SIMPEG-TIGA - FRONTEND JAVASCRIPT
// Versi Final - Tidak Error
// ================================================

// ================================================
// KONFIGURASI
// ================================================
// 🔴 GANTI DENGAN URL APPS SCRIPT ANDA!
const API_URL = 'https://script.google.com/macros/s/AKfycbzwPy-ROr5yuVTHL9V3o9669XwQzKjX31YEUHqKgK-sGMjfFm_BI_VHTFxFCcj303ui/exec';

// State variables
let currentUser = null;
let currentToken = null;
let currentPhotoData = { masuk: null, pulang: null };
let currentCameraStream = null;
let currentLocation = { lat: null, lng: null, accuracy: null };
let watchId = null;
let forgotEmail = '';
let forgotResetToken = '';
let otpTimer = null;
let currentSickFilter = 'pending';
let captchaAnswer = 0;
let sickFileBase64 = null;
let otpInterval = null;

// ================================================
// HIDE LOADING SCREEN (DIPERBAIKI)
// ================================================
function hideLoadingScreen() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.classList.add('hidden');
    console.log('Loading screen hidden');
  }
}

function showLoadingScreen() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.classList.remove('hidden');
  }
}

// ================================================
// INITIALIZATION (DIPERBAIKI)
// ================================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded');
  
  // Sembunyikan loading setelah 500ms (pasti hilang)
  setTimeout(hideLoadingScreen, 500);
  
  // Set date and time
  updateDateTime();
  setInterval(updateDateTime, 1000);
  
  // Set year selects
  initYearSelects();
  
  // Generate captcha
  generateCaptcha();
  
  // Setup OTP inputs
  setupOTPInputs();
  
  // Check saved session
  checkSession();
  
  // Setup form toggles (dengan pengecekan element)
  const showRegisterBtn = document.getElementById('showRegisterBtn');
  if (showRegisterBtn) {
    showRegisterBtn.addEventListener('click', function(e) {
      e.preventDefault();
      showForm('register');
    });
  }
  
  const showLoginBtn = document.getElementById('showLoginBtn');
  if (showLoginBtn) {
    showLoginBtn.addEventListener('click', function(e) {
      e.preventDefault();
      showForm('login');
    });
  }
  
  const forgotLink = document.getElementById('forgotPasswordLink');
  if (forgotLink) {
    forgotLink.addEventListener('click', function(e) {
      e.preventDefault();
      showForm('forgot');
    });
  }
  
  // Backup: pastikan loading hilang setelah 3 detik
  setTimeout(hideLoadingScreen, 3000);
});

// Fallback jika DOMContentLoaded sudah terlewat
if (document.readyState === 'loading') {
  // masih loading, tunggu event
} else {
  // sudah siap, langsung hide loading
  setTimeout(hideLoadingScreen, 100);
}

// ================================================
// UPDATE DATE TIME
// ================================================
function updateDateTime() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  const dateElements = ['guruDate', 'adminDate'];
  dateElements.forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.textContent = dateStr;
  });
  
  const timeElements = ['guruTime', 'adminTime'];
  timeElements.forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.textContent = timeStr;
  });
}

// ================================================
// INIT YEAR SELECTS
// ================================================
function initYearSelects() {
  const currentYear = new Date().getFullYear();
  const selects = ['historyYear', 'adminYear'];
  selects.forEach(function(id) {
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
  
  // Set default month
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
  const captchaEl = document.getElementById('captchaQuestion');
  if (captchaEl) captchaEl.textContent = a + ' + ' + b + ' = ?';
}

// ================================================
// OTP INPUTS
// ================================================
function setupOTPInputs() {
  const otpDigits = document.querySelectorAll('.otp-digit');
  otpDigits.forEach(function(input, idx) {
    input.addEventListener('input', function(e) {
      if (e.target.value.length === 1 && idx < 5) {
        otpDigits[idx + 1].focus();
      }
    });
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Backspace' && idx > 0 && !e.target.value) {
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
    } catch(e) {
      console.error('Session parse error:', e);
      clearSession();
      showAuthPage();
    }
  } else {
    showAuthPage();
  }
}

function saveSession(token, user, expiresIn) {
  const expiry = Date.now() + (expiresIn * 1000);
  localStorage.setItem('simpeg_token', token);
  localStorage.setItem('simpeg_user', JSON.stringify(user));
  localStorage.setItem('simpeg_expiry', expiry);
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
    currentCameraStream.getTracks().forEach(function(t) { t.stop(); });
    currentCameraStream = null;
  }
}

function applyRoleDashboard() {
  if (!currentUser) return;
  
  if (currentUser.role === 'kepsek') {
    const nameEl = document.getElementById('kepsekName');
    const avatarEl = document.getElementById('kepsekAvatar');
    if (nameEl) nameEl.textContent = currentUser.name;
    if (avatarEl) avatarEl.textContent = currentUser.name.charAt(0).toUpperCase();
    
    const pageKepsek = document.getElementById('pageKepsek');
    const pageGuru = document.getElementById('pageGuru');
    const pageAuth = document.getElementById('pageAuth');
    if (pageKepsek) pageKepsek.style.display = 'block';
    if (pageGuru) pageGuru.style.display = 'none';
    if (pageAuth) pageAuth.style.display = 'none';
    
    loadAdminDashboard();
  } else {
    const nameEl = document.getElementById('guruName');
    const avatarEl = document.getElementById('guruAvatar');
    if (nameEl) nameEl.textContent = currentUser.name;
    if (avatarEl) avatarEl.textContent = currentUser.name.charAt(0).toUpperCase();
    
    const pageGuru = document.getElementById('pageGuru');
    const pageKepsek = document.getElementById('pageKepsek');
    const pageAuth = document.getElementById('pageAuth');
    if (pageGuru) pageGuru.style.display = 'block';
    if (pageKepsek) pageKepsek.style.display = 'none';
    if (pageAuth) pageAuth.style.display = 'none';
    
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

function showForm(formName) {
  const containers = ['loginFormContainer', 'registerFormContainer', 'verifyContainer', 'forgotContainer'];
  containers.forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  
  if (formName === 'login') {
    const el = document.getElementById('loginFormContainer');
    if (el) el.style.display = 'block';
  }
  if (formName === 'register') {
    const el = document.getElementById('registerFormContainer');
    if (el) el.style.display = 'block';
  }
  if (formName === 'verify') {
    const el = document.getElementById('verifyContainer');
    if (el) el.style.display = 'block';
  }
  if (formName === 'forgot') {
    const el = document.getElementById('forgotContainer');
    if (el) el.style.display = 'block';
    const step1 = document.getElementById('forgotStep1');
    const step2 = document.getElementById('forgotStep2');
    const step3 = document.getElementById('forgotStep3');
    const forgotEmailEl = document.getElementById('forgotEmail');
    const forgotMsgEl = document.getElementById('forgotMessage');
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
    if (step3) step3.style.display = 'none';
    if (forgotEmailEl) forgotEmailEl.value = '';
    if (forgotMsgEl) forgotMsgEl.innerHTML = '';
  }
}

function backToLogin() {
  showForm('login');
}

// ================================================
// API CALL (FETCH)
// ================================================
async function callAPI(action, data = {}) {
  showLoadingScreen();
  try {
    const payload = { action: action };
    Object.assign(payload, data);
    if (currentToken && !data.token) payload.token = currentToken;
    
    console.log('API Call:', action, payload);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    hideLoadingScreen();
    console.log('API Response:', result);
    return result;
  } catch (error) {
    hideLoadingScreen();
    console.error('API Error:', error);
    return { status: 'error', message: 'Koneksi gagal: ' + error.message };
  }
}

function showLoading(show) {
  if (show) {
    showLoadingScreen();
  } else {
    hideLoadingScreen();
  }
}

function showToast(message, type) {
  type = type || 'success';
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  
  let icon = 'fa-check-circle';
  if (type === 'error') icon = 'fa-exclamation-circle';
  if (type === 'warning') icon = 'fa-info-circle';
  
  toast.innerHTML = '<i class="fas ' + icon + '"></i><span>' + message + '</span>';
  container.appendChild(toast);
  
  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(function() { toast.remove(); }, 300);
  }, 3000);
}

function showMessage(elementId, message, type) {
  type = type || 'error';
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = '<div class="' + type + '">' + message + '</div>';
  el.style.display = 'block';
  setTimeout(function() {
    el.style.display = 'none';
  }, 5000);
}

// ================================================
// AUTH: LOGIN
// ================================================
async function doLogin() {
  const emailEl = document.getElementById('loginEmail');
  const passEl = document.getElementById('loginPassword');
  
  if (!emailEl || !passEl) {
    showToast('Form login tidak ditemukan', 'error');
    return;
  }
  
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
    showToast('Login berhasil! Selamat datang.', 'success');
  } else {
    showMessage('loginMessage', result.message, 'error');
  }
}

// ================================================
// AUTH: REGISTER
// ================================================
async function doRegister() {
  const nameEl = document.getElementById('regName');
  const emailEl = document.getElementById('regEmail');
  const passEl = document.getElementById('regPassword');
  const confirmEl = document.getElementById('regConfirm');
  const captchaEl = document.getElementById('captchaAnswer');
  const roleRadios = document.querySelectorAll('input[name="regRole"]');
  
  if (!nameEl || !emailEl || !passEl || !confirmEl) {
    showToast('Form registrasi tidak lengkap', 'error');
    return;
  }
  
  const name = nameEl.value.trim();
  const email = emailEl.value.trim();
  const password = passEl.value;
  const confirm = confirmEl.value;
  const captcha = captchaEl ? parseInt(captchaEl.value) : 0;
  
  let selectedRole = 'guru';
  if (roleRadios.length > 0) {
    for (var i = 0; i < roleRadios.length; i++) {
      if (roleRadios[i].checked) {
        selectedRole = roleRadios[i].value;
        break;
      }
    }
  }
  
  if (!name || !email || !password || !confirm) {
    showMessage('registerMessage', 'Semua field wajib diisi', 'error');
    return;
  }
  if (password.length < 8) {
    showMessage('registerMessage', 'Password minimal 8 karakter', 'error');
    return;
  }
  if (password !== confirm) {
    showMessage('registerMessage', 'Konfirmasi password tidak cocok', 'error');
    return;
  }
  if (captcha !== captchaAnswer) {
    showMessage('registerMessage', 'Captcha salah', 'error');
    generateCaptcha();
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
      verifyMsg.innerHTML = 'Link aktivasi telah dikirim ke <strong>' + email + '</strong>. Silakan cek email Anda.';
    }
    showForm('verify');
  } else {
    showMessage('registerMessage', result.message, 'error');
  }
}

async function resendActivation() {
  const email = prompt('Masukkan email Anda:');
  if (!email) return;
  
  const result = await callAPI('resend_activation', { email: email });
  if (result.status === 'success') {
    showToast(result.message, 'success');
  } else {
    showToast(result.message, 'error');
  }
}

async function manualActivate() {
  const tokenEl = document.getElementById('manualToken');
  if (!tokenEl) return;
  
  const token = tokenEl.value.trim();
  if (!token) {
    showToast('Masukkan token aktivasi', 'error');
    return;
  }
  
  const result = await callAPI('activate', { token: token });
  if (result.status === 'success') {
    showToast(result.message, 'success');
    showForm('login');
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
  if (!email) {
    showMessage('forgotMessage', 'Masukkan email Anda', 'error');
    return;
  }
  
  forgotEmail = email;
  const result = await callAPI('forgot_password', { email: email });
  
  if (result.status === 'success') {
    showMessage('forgotMessage', result.message, 'success');
    const step1 = document.getElementById('forgotStep1');
    const step2 = document.getElementById('forgotStep2');
    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'block';
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
  
  otpInterval = setInterval(function() {
    remaining--;
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    timerEl.textContent = (mins.toString().padStart(2, '0')) + ':' + (secs.toString().padStart(2, '0'));
    if (remaining <= 0) {
      clearInterval(otpInterval);
      timerEl.textContent = '00:00';
      showMessage('forgotMessage', 'OTP sudah kadaluarsa', 'error');
    }
  }, 1000);
}

async function verifyOTP() {
  const otpDigits = document.querySelectorAll('.otp-digit');
  let otp = '';
  otpDigits.forEach(function(d) { otp += d.value; });
  
  if (otp.length !== 6) {
    showMessage('forgotMessage', 'Masukkan 6 digit OTP', 'error');
    return;
  }
  
  const result = await callAPI('verify_otp', { email: forgotEmail, otp: otp });
  
  if (result.status === 'success') {
    forgotResetToken = result.data.reset_token;
    if (otpInterval) clearInterval(otpInterval);
    const step2 = document.getElementById('forgotStep2');
    const step3 = document.getElementById('forgotStep3');
    if (step2) step2.style.display = 'none';
    if (step3) step3.style.display = 'block';
    showMessage('forgotMessage', 'OTP valid, silakan buat password baru', 'success');
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
  
  if (!newPass || !confirmPass) {
    showMessage('forgotMessage', 'Password baru wajib diisi', 'error');
    return;
  }
  if (newPass.length < 8) {
    showMessage('forgotMessage', 'Password minimal 8 karakter', 'error');
    return;
  }
  if (newPass !== confirmPass) {
    showMessage('forgotMessage', 'Konfirmasi password tidak cocok', 'error');
    return;
  }
  
  const result = await callAPI('reset_password', { 
    email: forgotEmail, 
    reset_token: forgotResetToken, 
    new_password: newPass, 
    confirm_password: confirmPass 
  });
  
  if (result.status === 'success') {
    showToast(result.message, 'success');
    showForm('login');
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
    function(position) {
      currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
      updateLocationUI('ok', 'Lokasi valid (akurasi ±' + Math.round(currentLocation.accuracy) + 'm)');
      checkAbsenButtons();
    },
    function(error) {
      var msg = 'Gagal dapat lokasi';
      if (error.code === 1) msg = 'Izin lokasi ditolak. Aktifkan GPS.';
      if (error.code === 2) msg = 'Lokasi tidak tersedia.';
      if (error.code === 3) msg = 'Timeout lokasi.';
      updateLocationUI('error', msg);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function updateLocationUI(status, message) {
  const locElements = ['locMasuk', 'locPulang'];
  locElements.forEach(function(id) {
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
  const hasLocation = !!(currentLocation.lat && currentLocation.lng);
  const btnMasuk = document.getElementById('btnAbsenMasuk');
  const btnPulang = document.getElementById('btnAbsenPulang');
  
  if (btnMasuk) btnMasuk.disabled = !(hasLocation && currentPhotoData.masuk);
  if (btnPulang) btnPulang.disabled = !(hasLocation && currentPhotoData.pulang);
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
      currentCameraStream.getTracks().forEach(function(t) { t.stop(); });
    }
    
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    });
    
    currentCameraStream = stream;
    var videoId = 'video' + (type === 'masuk' ? 'Masuk' : 'Pulang');
    var video = document.getElementById(videoId);
    if (video) {
      video.srcObject = stream;
      video.style.display = 'block';
    }
    
    var overlayId = 'cameraOverlay' + (type === 'masuk' ? 'Masuk' : 'Pulang');
    var overlay = document.getElementById(overlayId);
    if (overlay) overlay.style.display = 'none';
    
    var startBtn = document.getElementById('btnStartCam' + (type === 'masuk' ? 'Masuk' : 'Pulang'));
    var captureBtn = document.getElementById('btnCapture' + (type === 'masuk' ? 'Masuk' : 'Pulang'));
    var stopBtn = document.getElementById('btnStop' + (type === 'masuk' ? 'Masuk' : 'Pulang'));
    
    if (startBtn) startBtn.style.display = 'none';
    if (captureBtn) captureBtn.style.display = 'inline-flex';
    if (stopBtn) stopBtn.style.display = 'inline-flex';
  } catch (err) {
    showToast('Gagal akses kamera: ' + err.message, 'error');
  }
}

function stopCamera(type) {
  if (currentCameraStream) {
    currentCameraStream.getTracks().forEach(function(t) { t.stop(); });
    currentCameraStream = null;
  }
  
  var videoId = 'video' + (type === 'masuk' ? 'Masuk' : 'Pulang');
  var video = document.getElementById(videoId);
  if (video) {
    video.srcObject = null;
    video.style.display = 'none';
  }
  
  var overlayId = 'cameraOverlay' + (type === 'masuk' ? 'Masuk' : 'Pulang');
  var overlay = document.getElementById(overlayId);
  if (overlay) overlay.style.display = 'flex';
  
  var startBtn = document.getElementById('btnStartCam' + (type === 'masuk' ? 'Masuk' : 'Pulang'));
  var captureBtn = document.getElementById('btnCapture' + (type === 'masuk' ? 'Masuk' : 'Pulang'));
  var stopBtn = document.getElementById('btnStop' + (type === 'masuk' ? 'Masuk' : 'Pulang'));
  
  if (startBtn) startBtn.style.display = 'inline-flex';
  if (captureBtn) captureBtn.style.display = 'none';
  if (stopBtn) stopBtn.style.display = 'none';
}

function startCountdown(type) {
  var count = 3;
  var countdownId = 'countdown' + (type === 'masuk' ? 'Masuk' : 'Pulang');
  var countdownEl = document.getElementById(countdownId);
  if (!countdownEl) return;
  
  countdownEl.style.display = 'flex';
  countdownEl.textContent = count;
  
  var interval = setInterval(function() {
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
  var videoId = 'video' + (type === 'masuk' ? 'Masuk' : 'Pulang');
  var canvasId = 'canvas' + (type === 'masuk' ? 'Masuk' : 'Pulang');
  var video = document.getElementById(videoId);
  var canvas = document.getElementById(canvasId);
  
  if (!video || !canvas) return;
  
  var ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);
  
  // Add timestamp
  var now = new Date();
  var timestamp = now.toLocaleString('id-ID', { timeZone: 'Asia/Jayapura', hour12: false });
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, canvas.height - 28, canvas.width, 28);
  ctx.fillStyle = '#fff';
  ctx.font = '12px monospace';
  ctx.fillText(timestamp + ' WIT', 8, canvas.height - 10);
  
  currentPhotoData[type] = canvas.toDataURL('image/jpeg', 0.8);
  
  stopCamera(type);
  checkAbsenButtons();
  
  // Show preview
  var previewId = 'preview' + (type === 'masuk' ? 'Masuk' : 'Pulang');
  var preview = document.getElementById(previewId);
  var previewImgId = 'preview' + (type === 'masuk' ? 'Masuk' : 'Pulang') + 'Img';
  var previewImg = document.getElementById(previewImgId);
  
  if (previewImg) previewImg.src = currentPhotoData[type];
  if (preview) preview.style.display = 'block';
  
  // Hide camera section
  var cameraSectionId = 'cameraSection' + (type === 'masuk' ? 'Masuk' : 'Pulang');
  var cameraSection = document.getElementById(cameraSectionId);
  if (cameraSection) cameraSection.style.display = 'none';
  
  showToast('Foto selfi ' + (type === 'masuk' ? 'masuk' : 'pulang') + ' berhasil', 'success');
}

function retakePhoto(type) {
  currentPhotoData[type] = null;
  
  // Hide preview, show camera section
  var previewId = 'preview' + (type === 'masuk' ? 'Masuk' : 'Pulang');
  var preview = document.getElementById(previewId);
  if (preview) preview.style.display = 'none';
  
  var cameraSectionId = 'cameraSection' + (type === 'masuk' ? 'Masuk' : 'Pulang');
  var cameraSection = document.getElementById(cameraSectionId);
  if (cameraSection) cameraSection.style.display = 'block';
  
  // Reset buttons
  var startBtn = document.getElementById('btnStartCam' + (type === 'masuk' ? 'Masuk' : 'Pulang'));
  var captureBtn = document.getElementById('btnCapture' + (type === 'masuk' ? 'Masuk' : 'Pulang'));
  var stopBtn = document.getElementById('btnStop' + (type === 'masuk' ? 'Masuk' : 'Pulang'));
  var overlayId = 'cameraOverlay' + (type === 'masuk' ? 'Masuk' : 'Pulang');
  var overlay = document.getElementById(overlayId);
  
  if (startBtn) startBtn.style.display = 'inline-flex';
  if (captureBtn) captureBtn.style.display = 'none';
  if (stopBtn) stopBtn.style.display = 'none';
  if (overlay) overlay.style.display = 'flex';
  
  checkAbsenButtons();
}

// ================================================
// PRESENSI (CHECKIN/CHECKOUT)
// ================================================
async function submitAbsen(type) {
  if (!currentPhotoData[type]) {
    showToast('Ambil foto selfi dulu', 'error');
    return;
  }
  if (!currentLocation.lat) {
    showToast('Tunggu deteksi lokasi selesai', 'error');
    return;
  }
  
  var action = type === 'masuk' ? 'checkin' : 'checkout';
  var result = await callAPI(action, {
    photo_base64: currentPhotoData[type],
    lat: currentLocation.lat,
    lng: currentLocation.lng
  });
  
  if (result.status === 'success') {
    showToast(result.message, 'success');
    currentPhotoData[type] = null;
    
    var timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    var statusId = 'status' + (type === 'masuk' ? 'Masuk' : 'Pulang');
    var statusEl = document.getElementById(statusId);
    if (statusEl) {
      statusEl.innerHTML = '<span class="badge success"><i class="fas fa-check"></i> Sudah Absen ' + (type === 'masuk' ? 'Masuk' : 'Pulang') + ' (' + timeNow + ')</span>';
    }
    
    var btnId = 'btnAbsen' + (type === 'masuk' ? 'Masuk' : 'Pulang');
    var btn = document.getElementById(btnId);
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-check"></i> Sudah ' + (type === 'masuk' ? 'Masuk' : 'Pulang');
    }
    
    if (currentUser && currentUser.role === 'guru') loadGuruDashboard();
  } else {
    showToast(result.message, 'error');
  }
}

// ================================================
// GURU DASHBOARD (DIPERBAIKI)
// ================================================
async function loadGuruDashboard() {
  startGeolocation();
  
  // Set greeting
  var hour = new Date().getHours();
  var greeting = 'Selamat Siang';
  if (hour < 11) greeting = 'Selamat Pagi';
  else if (hour < 15) greeting = 'Selamat Siang';
  else if (hour < 18) greeting = 'Selamat Sore';
  else greeting = 'Selamat Malam';
  
  var greetingEl = document.getElementById('guruGreeting');
  if (greetingEl && currentUser) {
    greetingEl.textContent = greeting + ', ' + currentUser.name.split(' ')[0] + '!';
  }
  
  var result = await callAPI('get_dashboard_stats', {});
  
  if (result.status === 'success') {
    var data = result.data;
    if (data.month_summary) {
      var hadirEl = document.getElementById('statHadir');
      var telatEl = document.getElementById('statTerlambat');
      var sakitEl = document.getElementById('statSakit');
      var alfaEl = document.getElementById('statAlfa');
      if (hadirEl) hadirEl.textContent = data.month_summary.total_hadir || 0;
      if (telatEl) telatEl.textContent = data.month_summary.total_terlambat || 0;
      if (sakitEl) sakitEl.textContent = data.month_summary.total_sakit || 0;
      if (alfaEl) alfaEl.textContent = data.month_summary.total_alfa || 0;
    }
    
    if (data.today_attendance && data.today_attendance.checkin_time) {
      var statusMasuk = document.getElementById('statusMasuk');
      var btnMasuk = document.getElementById('btnAbsenMasuk');
      if (statusMasuk) statusMasuk.innerHTML = '<span class="badge success"><i class="fas fa-check"></i> Absen Masuk ' + data.today_attendance.checkin_time + '</span>';
      if (btnMasuk) {
        btnMasuk.disabled = true;
        btnMasuk.innerHTML = '<i class="fas fa-check"></i> Sudah Masuk';
      }
    }
    
    if (data.today_attendance && data.today_attendance.checkout_time) {
      var statusPulang = document.getElementById('statusPulang');
      var btnPulang = document.getElementById('btnAbsenPulang');
      if (statusPulang) statusPulang.innerHTML = '<span class="badge success"><i class="fas fa-check"></i> Absen Pulang ' + data.today_attendance.checkout_time + '</span>';
      if (btnPulang) {
        btnPulang.disabled = true;
        btnPulang.innerHTML = '<i class="fas fa-check"></i> Sudah Pulang';
      }
    }
    
    if (data.checkin_window) {
      var windowMasuk = document.getElementById('windowMasuk');
      if (windowMasuk) windowMasuk.textContent = data.checkin_window.start + ' – ' + data.checkin_window.end + ' WIT';
    }
    if (data.checkout_window) {
      var windowPulang = document.getElementById('windowPulang');
      if (windowPulang) windowPulang.textContent = data.checkout_window.start + ' – ' + data.checkout_window.end + ' WIT';
    }
  }
  
  await loadSickList();
  await loadHistory();
}

async function loadSickList() {
  var result = await callAPI('get_sick_reports', {});
  var container = document.getElementById('sickList');
  if (!container) return;
  
  if (result.status === 'success' && result.data.reports && result.data.reports.length > 0) {
    var html = '';
    for (var i = 0; i < result.data.reports.length; i++) {
      var r = result.data.reports[i];
      var statusText = 'Menunggu';
      var statusClass = 'warning';
      if (r.status === 'approved') {
        statusText = 'Disetujui';
        statusClass = 'success';
      } else if (r.status === 'rejected') {
        statusText = 'Ditolak';
        statusClass = 'danger';
      }
      html += '<div class="sick-item ' + r.status + '">';
      html += '<div class="sick-header">';
      html += '<span class="sick-date"><i class="fas fa-calendar"></i> ' + r.date + '</span>';
      html += '<span class="sick-status status-badge status-' + statusClass + '">' + statusText + '</span>';
      html += '</div>';
      html += '<div class="sick-reason">' + r.reason_detail + '</div>';
      if (r.proof_url) {
        html += '<div class="sick-proof"><a href="' + r.proof_url + '" target="_blank"><i class="fas fa-image"></i> Lihat Bukti</a></div>';
      }
      html += '</div>';
    }
    container.innerHTML = html;
  } else {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>Belum ada laporan izin/sakit</p></div>';
  }
}

async function loadHistory() {
  var monthSelect = document.getElementById('historyMonth');
  var yearSelect = document.getElementById('historyYear');
  
  var month = monthSelect ? monthSelect.value : new Date().toISOString().slice(5, 7);
  var year = yearSelect ? yearSelect.value : new Date().getFullYear();
  
  var result = await callAPI('get_attendance_history', { month: month, year: year });
  var container = document.getElementById('historyTable');
  if (!container) return;
  
  if (result.status === 'success' && result.data.records && result.data.records.length > 0) {
    var records = result.data.records;
    var rows = '';
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      var statusClass = 'status-';
      if (r.status === 'Hadir') statusClass += 'hadir';
      else if (r.status === 'Terlambat') statusClass += 'terlambat';
      else if (r.status === 'Sakit') statusClass += 'sakit';
      else statusClass += 'alfa';
      
      rows += '<tr>';
      rows += '<td>' + r.date + '</td>';
      rows += '<td>' + (r.checkin_time || '-') + '</td>';
      rows += '<td>' + (r.checkout_time || '-') + '</td>';
      rows += '<td><span class="status-badge ' + statusClass + '">' + (r.status || '-') + '</span></td>';
      rows += '<td>';
      if (r.checkin_photo_url) rows += '<button class="btn-icon" onclick="showPhoto(\'' + r.checkin_photo_url + '\')"><i class="fas fa-camera"></i></button> ';
      if (r.checkout_photo_url) rows += '<button class="btn-icon" onclick="showPhoto(\'' + r.checkout_photo_url + '\')"><i class="fas fa-camera"></i></button>';
      if (!r.checkin_photo_url && !r.checkout_photo_url) rows += '-';
      rows += '</td>';
      rows += '</tr>';
    }
    container.innerHTML = '<div class="table-container"><table><thead><tr><th>Tanggal</th><th>Masuk</th><th>Pulang</th><th>Status</th><th>Foto</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  } else {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>Belum ada data kehadiran</p></div>';
  }
}

async function submitSick() {
  var date = document.getElementById('sickDate') ? document.getElementById('sickDate').value : '';
  var reason = document.getElementById('sickReason') ? document.getElementById('sickReason').value.trim() : '';
  
  if (!date || !reason) {
    showToast('Tanggal dan alasan wajib diisi', 'error');
    return;
  }
  
  var result = await callAPI('submit_sick', { 
    date: date, 
    reason_detail: reason, 
    proof_base64: sickFileBase64 || '' 
  });
  
  if (result.status === 'success') {
    showToast(result.message, 'success');
    var reasonEl = document.getElementById('sickReason');
    var fileEl = document.getElementById('sickFile');
    var previewEl = document.getElementById('sickPreview');
    var fileNameEl = document.getElementById('sickFileName');
    
    if (reasonEl) reasonEl.value = '';
    if (fileEl) fileEl.value = '';
    if (previewEl) previewEl.style.display = 'none';
    if (fileNameEl) fileNameEl.textContent = 'Belum ada file';
    sickFileBase64 = null;
    await loadSickList();
  } else {
    showToast(result.message, 'error');
  }
}

function previewSickFile(input) {
  var file = input.files[0];
  if (!file) return;
  var fileNameEl = document.getElementById('sickFileName');
  if (fileNameEl) fileNameEl.textContent = file.name;
  
  var reader = new FileReader();
  reader.onload = function(e) {
    sickFileBase64 = e.target.result;
    var previewImg = document.getElementById('sickPreviewImg');
    var preview = document.getElementById('sickPreview');
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
  var result = await callAPI('get_dashboard_stats', {});
  
  if (result.status === 'success') {
    var data = result.data;
    var totalGuru = document.getElementById('adminTotalGuru');
    var hadirHari = document.getElementById('adminHadirHari');
    var alfaBulan = document.getElementById('adminAlfaBulan');
    var pendingSick = document.getElementById('adminPendingSick');
    
    if (totalGuru) totalGuru.textContent = data.total_guru_aktif || 0;
    if (hadirHari) hadirHari.textContent = data.hadir_hari_ini || 0;
    if (alfaBulan) alfaBulan.textContent = data.alfa_bulan_ini || 0;
    if (pendingSick) pendingSick.textContent = data.pending_sick || 0;
  }
}

async function loadAdminRecap() {
  var monthSelect = document.getElementById('adminMonth');
  var yearSelect = document.getElementById('adminYear');
  
  var month = monthSelect ? monthSelect.value : (new Date().getMonth() + 1).toString().padStart(2, '0');
  var year = yearSelect ? yearSelect.value : new Date().getFullYear();
  
  var result = await callAPI('get_all_attendance', { month: month, year: year });
  var container = document.getElementById('adminRecapTable');
  if (!container) return;
  
  if (result.status === 'success' && result.data.report && result.data.report.length > 0) {
    var rows = '';
    for (var i = 0; i < result.data.report.length; i++) {
      var r = result.data.report[i];
      var alfaClass = (r.summary.total_alfa >= 3) ? 'alfa-warning' : '';
      rows += '<tr>';
      rows += '<td><strong>' + r.full_name + '</strong></td>';
      rows += '<td>' + r.summary.total_hadir + '</td>';
      rows += '<td>' + r.summary.total_terlambat + '</td>';
      rows += '<td>' + r.summary.total_sakit + '</td>';
      rows += '<td class="' + alfaClass + '">' + r.summary.total_alfa + '</td>';
      rows += '</tr>';
    }
    container.innerHTML = '<div class="table-container"><table><thead><tr><th>Nama Guru</th><th>Hadir</th><th>Terlambat</th><th>Sakit</th><th>Alfa</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  } else {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-chart-line"></i><p>Belum ada data</p></div>';
  }
}

async function loadAdminSick() {
  var result = await callAPI('get_sick_reports', {});
  var container = document.getElementById('adminSickList');
  if (!container) return;
  
  if (result.status === 'success' && result.data.reports && result.data.reports.length > 0) {
    var filtered = result.data.reports;
    if (currentSickFilter !== 'all') {
      filtered = [];
      for (var i = 0; i < result.data.reports.length; i++) {
        if (result.data.reports[i].status === currentSickFilter) {
          filtered.push(result.data.reports[i]);
        }
      }
    }
    
    var html = '';
    for (var f = 0; f < filtered.length; f++) {
      var r = filtered[f];
      html += '<div class="sick-item ' + r.status + '">';
      html += '<div class="sick-header">';
      html += '<span class="sick-user"><i class="fas fa-user"></i> ' + (r.full_name || r.user_id) + '</span>';
      html += '<span class="sick-date"><i class="fas fa-calendar"></i> ' + r.date + '</span>';
      html += '</div>';
      html += '<div class="sick-reason"><strong>Alasan:</strong> ' + r.reason_detail + '</div>';
      if (r.proof_url) {
        html += '<div class="sick-proof"><a href="' + r.proof_url + '" target="_blank"><i class="fas fa-image"></i> Lihat Bukti</a></div>';
      }
      html += '<div class="sick-actions">';
      if (r.status === 'pending') {
        html += '<button class="btn-sm-success" onclick="approveSick(\'' + r.id + '\', \'approve\')"><i class="fas fa-check"></i> Setujui</button>';
        html += '<button class="btn-sm-danger" onclick="approveSick(\'' + r.id + '\', \'reject\')"><i class="fas fa-times"></i> Tolak</button>';
      } else {
        var statText = r.status === 'approved' ? 'Disetujui' : 'Ditolak';
        var statClass = r.status === 'approved' ? 'success' : 'danger';
        html += '<span class="status-badge status-' + statClass + '">' + statText + '</span>';
      }
      html += '</div></div>';
    }
    container.innerHTML = html;
  } else {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>Belum ada laporan izin</p></div>';
  }
}

function filterSick(filter, btn) {
  currentSickFilter = filter;
  var btns = document.querySelectorAll('.filter-sick');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.remove('active');
  }
  btn.classList.add('active');
  loadAdminSick();
}

async function approveSick(reportId, action) {
  var result = await callAPI('approve_sick', { report_id: reportId, action: action });
  if (result.status === 'success') {
    showToast(result.message, 'success');
    await loadAdminSick();
    await loadAdminStats();
  } else {
    showToast(result.message, 'error');
  }
}

async function loadTeachers() {
  var result = await callAPI('get_users', {});
  var container = document.getElementById('teachersList');
  if (!container) return;
  
  if (result.status === 'success' && result.data.users && result.data.users.length > 0) {
    var rows = '';
    for (var i = 0; i < result.data.users.length; i++) {
      var u = result.data.users[i];
      var statusBadge = u.is_active === 'true' ? 'status-hadir' : 'status-alfa';
      var statusText = u.is_active === 'true' ? 'Aktif' : 'Nonaktif';
      var roleText = u.role === 'kepsek' ? 'Kepala Sekolah' : 'Guru';
      rows += '<tr>';
      rows += '<td><strong>' + u.full_name + '</strong></td>';
      rows += '<td>' + u.email + '</td>';
      rows += '<td><span class="role-badge">' + roleText + '</span></td>';
      rows += '<td><span class="status-badge ' + statusBadge + '">' + statusText + '</span></td>';
      rows += '<td><button class="btn-icon" onclick="toggleUser(\'' + u.id + '\', \'' + u.is_active + '\')"><i class="fas ' + (u.is_active === 'true' ? 'fa-ban' : 'fa-check-circle') + '"></i></button></td>';
      rows += '</tr>';
    }
    container.innerHTML = '<div class="table-container"><table><thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  } else {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>Belum ada data guru</p></div>';
  }
}

async function toggleUser(userId, currentStatus) {
  var newStatus = currentStatus === 'true' ? false : true;
  var result = await callAPI('toggle_user_active', { user_id: userId, is_active: newStatus });
  if (result.status === 'success') {
    showToast(result.message, 'success');
    await loadTeachers();
  } else {
    showToast(result.message, 'error');
  }
}

async function loadLogs() {
  var result = await callAPI('get_activity_logs', { limit: 50 });
  var container = document.getElementById('logsList');
  if (!container) return;
  
  if (result.status === 'success' && result.data.logs && result.data.logs.length > 0) {
    var html = '';
    for (var i = 0; i < result.data.logs.length; i++) {
      var log = result.data.logs[i];
      html += '<div class="log-item">';
      html += '<div class="log-icon"><i class="fas ' + getLogIcon(log.action) + '"></i></div>';
      html += '<div class="log-detail">';
      html += '<div class="log-action">' + log.action + '</div>';
      html += '<div class="log-msg">' + (log.detail || '-') + '</div>';
      html += '<div class="log-time"><i class="fas fa-clock"></i> ' + log.timestamp + '</div>';
      html += '</div>';
      html += '<div class="log-user">' + (log.email || 'System') + '</div>';
      html += '</div>';
    }
    container.innerHTML = html;
  } else {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>Belum ada log aktivitas</p></div>';
  }
}

function getLogIcon(action) {
  var icons = {
    'LOGIN': 'fa-sign-in-alt',
    'LOGOUT': 'fa-sign-out-alt',
    'CHECKIN': 'fa-fingerprint',
    'CHECKOUT': 'fa-fingerprint',
    'SUBMIT_SICK': 'fa-file-medical',
    'APPROVE_SICK': 'fa-check-double',
    'REGISTER': 'fa-user-plus',
    'ACTIVATE': 'fa-check-circle'
  };
  return icons[action] || 'fa-info-circle';
}

async function sendMonthlyReport() {
  var monthSelect = document.getElementById('adminMonth');
  var yearSelect = document.getElementById('adminYear');
  
  var month = monthSelect ? monthSelect.value : (new Date().getMonth() + 1).toString().padStart(2, '0');
  var year = yearSelect ? yearSelect.value : new Date().getFullYear();
  
  var result = await callAPI('send_monthly_report', { month: month, year: year });
  if (result.status === 'success') {
    showToast(result.message, 'success');
  } else {
    showToast(result.message, 'error');
  }
}

// ================================================
// PDF EXPORTS (SEDERHANA AGAR TIDAK ERROR)
// ================================================
async function exportPDF() {
  showToast('Fitur PDF akan segera hadir', 'warning');
}

async function exportAdminPDF() {
  showToast('Fitur PDF akan segera hadir', 'warning');
}

// ================================================
// UTILITY
// ================================================
function showPhoto(url) {
  var modalImg = document.getElementById('modalPhotoImg');
  var modal = document.getElementById('photoModal');
  if (modalImg) modalImg.src = url;
  if (modal) modal.style.display = 'flex';
}

function closePhotoModal() {
  var modal = document.getElementById('photoModal');
  if (modal) modal.style.display = 'none';
}

function showTab(tabName) {
  var tabs = ['presensi', 'izin', 'riwayat'];
  for (var i = 0; i < tabs.length; i++) {
    var el = document.getElementById('tab' + tabs[i].charAt(0).toUpperCase() + tabs[i].slice(1));
    if (el) el.classList.remove('active');
  }
  var activeTab = document.getElementById('tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
  if (activeTab) activeTab.classList.add('active');
  
  var btns = document.querySelectorAll('.tab-btn');
  for (var b = 0; b < btns.length; b++) {
    btns[b].classList.remove('active');
    if (btns[b].getAttribute('data-tab') === tabName) {
      btns[b].classList.add('active');
    }
  }
}

function showAdminTab(tabName) {
  var tabs = ['rekap', 'izinAdmin', 'guru', 'log'];
  for (var i = 0; i < tabs.length; i++) {
    var el = document.getElementById('adminTab' + tabs[i].charAt(0).toUpperCase() + tabs[i].slice(1));
    if (el) el.classList.remove('active');
  }
  var activeTab = document.getElementById('adminTab' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
  if (activeTab) activeTab.classList.add('active');
  
  var btns = document.querySelectorAll('.tab-btn');
  for (var b = 0; b < btns.length; b++) {
    btns[b].classList.remove('active');
    if (btns[b].textContent.toLowerCase().includes(tabName.toLowerCase())) {
      btns[b].classList.add('active');
    }
  }
}

function togglePassword(inputId) {
  var input = document.getElementById(inputId);
  if (!input) return;
  var parent = input.parentElement;
  var icon = parent ? parent.querySelector('.toggle-password i') : null;
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    input.type = 'password';
    if (icon) icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}