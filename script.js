// ================================================
// SIMPEG-TIGA - FRONTEND JAVASCRIPT
// Fetch ke Backend Apps Script
// ================================================

// ================================================
// KONFIGURASI
// ================================================
// 🔴 GANTI DENGAN URL APPS SCRIPT ANDA!
const API_URL = 'https://script.google.com/macros/s/AKfycbyZmMAto1AROajPDl_gaN6-feQ-VdV3fyBIDhpxThKB9kZojR7HjPOLItA8wto3I_L1/exec';

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

// ================================================
// INITIALIZATION
// ================================================
document.addEventListener('DOMContentLoaded', () => {
  // Set date and time
  updateDateTime();
  setInterval(updateDateTime, 1000);
  
  // Set year selects
  initYearSelects();
  
  // Generate captcha
  generateCaptcha();
  
  // Check saved session
  checkSession();
  
  // Setup OTP inputs
  setupOTPInputs();
  
  // Setup form toggles
  document.getElementById('showRegisterBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    showForm('register');
  });
  
  document.getElementById('showLoginBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    showForm('login');
  });
  
  document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    showForm('forgot');
  });
});

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
  dateElements.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = dateStr;
  });
  
  const timeElements = ['guruTime', 'adminTime'];
  timeElements.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = timeStr;
  });
}

function initYearSelects() {
  const currentYear = new Date().getFullYear();
  const selects = ['historyYear', 'adminYear'];
  selects.forEach(id => {
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
}

function generateCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  captchaAnswer = a + b;
  const captchaEl = document.getElementById('captchaQuestion');
  if (captchaEl) captchaEl.textContent = `${a} + ${b} = ?`;
}

function setupOTPInputs() {
  const otpDigits = document.querySelectorAll('.otp-digit');
  otpDigits.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      if (e.target.value.length === 1 && idx < 5) {
        otpDigits[idx + 1].focus();
      }
    });
    input.addEventListener('keydown', (e) => {
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
    currentUser = JSON.parse(userStr);
    applyRoleDashboard();
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
    currentCameraStream.getTracks().forEach(t => t.stop());
    currentCameraStream = null;
  }
}

function applyRoleDashboard() {
  if (!currentUser) return;
  
  if (currentUser.role === 'kepsek') {
    document.getElementById('kepsekName').textContent = currentUser.name;
    document.getElementById('kepsekAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
    document.getElementById('pageKepsek').style.display = 'block';
    document.getElementById('pageGuru').style.display = 'none';
    document.getElementById('pageAuth').style.display = 'none';
    loadAdminDashboard();
  } else {
    document.getElementById('guruName').textContent = currentUser.name;
    document.getElementById('guruAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
    document.getElementById('pageGuru').style.display = 'block';
    document.getElementById('pageKepsek').style.display = 'none';
    document.getElementById('pageAuth').style.display = 'none';
    loadGuruDashboard();
  }
}

function showAuthPage() {
  document.getElementById('pageAuth').style.display = 'block';
  document.getElementById('pageGuru').style.display = 'none';
  document.getElementById('pageKepsek').style.display = 'none';
  showForm('login');
}

function showForm(formName) {
  const containers = ['loginFormContainer', 'registerFormContainer', 'verifyContainer', 'forgotContainer'];
  containers.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  
  if (formName === 'login') document.getElementById('loginFormContainer').style.display = 'block';
  if (formName === 'register') document.getElementById('registerFormContainer').style.display = 'block';
  if (formName === 'verify') document.getElementById('verifyContainer').style.display = 'block';
  if (formName === 'forgot') document.getElementById('forgotContainer').style.display = 'block';
  
  // Reset forgot steps
  if (formName === 'forgot') {
    document.getElementById('forgotStep1').style.display = 'block';
    document.getElementById('forgotStep2').style.display = 'none';
    document.getElementById('forgotStep3').style.display = 'none';
    document.getElementById('forgotEmail').value = '';
    document.getElementById('forgotMessage').innerHTML = '';
  }
}

function backToLogin() {
  showForm('login');
}

// ================================================
// API CALL (FETCH)
// ================================================
async function callAPI(action, data = {}) {
  showLoading(true);
  try {
    const payload = { action, ...data };
    if (currentToken && !data.token) payload.token = currentToken;
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    showLoading(false);
    return result;
  } catch (error) {
    showLoading(false);
    console.error('API Error:', error);
    return { status: 'error', message: 'Koneksi gagal: ' + error.message };
  }
}

function showLoading(show) {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    if (show) overlay.classList.remove('hidden');
    else overlay.classList.add('hidden');
  }
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i><span>${message}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showMessage(elementId, message, type = 'error') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = `<div class="${type}">${message}</div>`;
  el.style.display = 'block';
  setTimeout(() => {
    el.style.display = 'none';
  }, 5000);
}

// ================================================
// AUTH: LOGIN
// ================================================
async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const remember = document.getElementById('rememberMe')?.checked || false;
  
  if (!email || !password) {
    showMessage('loginMessage', 'Email dan password wajib diisi', 'error');
    return;
  }
  
  const result = await callAPI('login', { email, password });
  
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
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirm').value;
  const captcha = parseInt(document.getElementById('captchaAnswer').value);
  const selectedRole = document.querySelector('input[name="regRole"]:checked')?.value || 'guru';
  
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
  
  const result = await callAPI('register', { name, email, password, confirm_password: confirm, role: selectedRole });
  
  if (result.status === 'success') {
    showToast(result.message, 'success');
    document.getElementById('verifyMessage').innerHTML = `Link aktivasi telah dikirim ke <strong>${email}</strong>. Silakan cek email Anda.`;
    showForm('verify');
  } else {
    showMessage('registerMessage', result.message, 'error');
  }
}

async function resendActivation() {
  const email = prompt('Masukkan email Anda:');
  if (!email) return;
  
  const result = await callAPI('resend_activation', { email });
  if (result.status === 'success') {
    showToast(result.message, 'success');
  } else {
    showToast(result.message, 'error');
  }
}

async function manualActivate() {
  const token = document.getElementById('manualToken').value.trim();
  if (!token) {
    showToast('Masukkan token aktivasi', 'error');
    return;
  }
  
  const result = await callAPI('activate', { token });
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
  const email = document.getElementById('forgotEmail').value.trim();
  if (!email) {
    showMessage('forgotMessage', 'Masukkan email Anda', 'error');
    return;
  }
  
  forgotEmail = email;
  const result = await callAPI('forgot_password', { email });
  
  if (result.status === 'success') {
    showMessage('forgotMessage', result.message, 'success');
    document.getElementById('forgotStep1').style.display = 'none';
    document.getElementById('forgotStep2').style.display = 'block';
    startOTPTimer(15 * 60);
  } else {
    showMessage('forgotMessage', result.message, 'error');
  }
}

let otpInterval = null;

function startOTPTimer(seconds) {
  if (otpInterval) clearInterval(otpInterval);
  const timerEl = document.getElementById('otpTimer');
  let remaining = seconds;
  
  otpInterval = setInterval(() => {
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    remaining--;
    if (remaining < 0) {
      clearInterval(otpInterval);
      timerEl.textContent = '00:00';
      showMessage('forgotMessage', 'OTP sudah kadaluarsa', 'error');
    }
  }, 1000);
}

async function verifyOTP() {
  const otpDigits = document.querySelectorAll('.otp-digit');
  const otp = Array.from(otpDigits).map(d => d.value).join('');
  
  if (otp.length !== 6) {
    showMessage('forgotMessage', 'Masukkan 6 digit OTP', 'error');
    return;
  }
  
  const result = await callAPI('verify_otp', { email: forgotEmail, otp });
  
  if (result.status === 'success') {
    forgotResetToken = result.data.reset_token;
    if (otpInterval) clearInterval(otpInterval);
    document.getElementById('forgotStep2').style.display = 'none';
    document.getElementById('forgotStep3').style.display = 'block';
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
  const newPass = document.getElementById('newPassword').value;
  const confirmPass = document.getElementById('confirmNewPassword').value;
  
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
  
  const result = await callAPI('reset_password', { email: forgotEmail, reset_token: forgotResetToken, new_password: newPass, confirm_password: confirmPass });
  
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
    (position) => {
      currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
      updateLocationUI('ok', `Lokasi valid (akurasi ±${Math.round(currentLocation.accuracy)}m)`);
      checkAbsenButtons();
    },
    (error) => {
      let msg = 'Gagal dapat lokasi';
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
  locElements.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (status === 'ok') {
      el.innerHTML = `<div class="loc-ok"><i class="fas fa-map-marker-alt"></i> ${message}</div>`;
    } else if (status === 'error') {
      el.innerHTML = `<div class="loc-error"><i class="fas fa-exclamation-triangle"></i> ${message}</div>`;
    } else {
      el.innerHTML = `<div class="loc-loading"><i class="fas fa-spinner fa-spin"></i> Mendeteksi lokasi...</div>`;
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
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast('Browser tidak mendukung kamera', 'error');
    return;
  }
  
  try {
    if (currentCameraStream) {
      currentCameraStream.getTracks().forEach(t => t.stop());
    }
    
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    });
    
    currentCameraStream = stream;
    const video = document.getElementById(`video${type.charAt(0).toUpperCase() + type.slice(1)}`);
    if (video) {
      video.srcObject = stream;
      video.style.display = 'block';
    }
    
    const overlay = document.getElementById(`cameraOverlay${type.charAt(0).toUpperCase() + type.slice(1)}`);
    if (overlay) overlay.style.display = 'none';
    
    document.getElementById(`btnStartCam${type.charAt(0).toUpperCase() + type.slice(1)}`).style.display = 'none';
    document.getElementById(`btnCapture${type.charAt(0).toUpperCase() + type.slice(1)}`).style.display = 'inline-flex';
    document.getElementById(`btnStop${type.charAt(0).toUpperCase() + type.slice(1)}`).style.display = 'inline-flex';
  } catch (err) {
    showToast('Gagal akses kamera: ' + err.message, 'error');
  }
}

function stopCamera(type) {
  if (currentCameraStream) {
    currentCameraStream.getTracks().forEach(t => t.stop());
    currentCameraStream = null;
  }
  
  const video = document.getElementById(`video${type.charAt(0).toUpperCase() + type.slice(1)}`);
  if (video) {
    video.srcObject = null;
    video.style.display = 'none';
  }
  
  const overlay = document.getElementById(`cameraOverlay${type.charAt(0).toUpperCase() + type.slice(1)}`);
  if (overlay) overlay.style.display = 'flex';
  
  document.getElementById(`btnStartCam${type.charAt(0).toUpperCase() + type.slice(1)}`).style.display = 'inline-flex';
  document.getElementById(`btnCapture${type.charAt(0).toUpperCase() + type.slice(1)}`).style.display = 'none';
  document.getElementById(`btnStop${type.charAt(0).toUpperCase() + type.slice(1)}`).style.display = 'none';
}

function startCountdown(type) {
  let count = 3;
  const countdownEl = document.getElementById(`countdown${type.charAt(0).toUpperCase() + type.slice(1)}`);
  countdownEl.style.display = 'flex';
  countdownEl.textContent = count;
  
  const interval = setInterval(() => {
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
  const video = document.getElementById(`video${type.charAt(0).toUpperCase() + type.slice(1)}`);
  const canvas = document.getElementById(`canvas${type.charAt(0).toUpperCase() + type.slice(1)}`);
  if (!video || !canvas) return;
  
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);
  
  // Add timestamp
  const now = new Date();
  const timestamp = now.toLocaleString('id-ID', { timeZone: 'Asia/Jayapura', hour12: false });
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, canvas.height - 28, canvas.width, 28);
  ctx.fillStyle = '#fff';
  ctx.font = '12px monospace';
  ctx.fillText(timestamp + ' WIT', 8, canvas.height - 10);
  
  currentPhotoData[type] = canvas.toDataURL('image/jpeg', 0.8);
  
  stopCamera(type);
  checkAbsenButtons();
  
  // Show preview
  const preview = document.getElementById(`preview${type.charAt(0).toUpperCase() + type.slice(1)}`);
  const previewImg = document.getElementById(`preview${type.charAt(0).toUpperCase() + type.slice(1)}Img`);
  previewImg.src = currentPhotoData[type];
  preview.style.display = 'block';
  
  // Hide camera section
  const cameraSection = document.getElementById(`cameraSection${type.charAt(0).toUpperCase() + type.slice(1)}`);
  cameraSection.style.display = 'none';
  
  showToast(`Foto selfi ${type === 'masuk' ? 'masuk' : 'pulang'} berhasil`, 'success');
}

function retakePhoto(type) {
  currentPhotoData[type] = null;
  
  // Hide preview, show camera section
  const preview = document.getElementById(`preview${type.charAt(0).toUpperCase() + type.slice(1)}`);
  preview.style.display = 'none';
  
  const cameraSection = document.getElementById(`cameraSection${type.charAt(0).toUpperCase() + type.slice(1)}`);
  cameraSection.style.display = 'block';
  
  // Reset buttons
  document.getElementById(`btnStartCam${type.charAt(0).toUpperCase() + type.slice(1)}`).style.display = 'inline-flex';
  document.getElementById(`btnCapture${type.charAt(0).toUpperCase() + type.slice(1)}`).style.display = 'none';
  document.getElementById(`btnStop${type.charAt(0).toUpperCase() + type.slice(1)}`).style.display = 'none';
  
  const overlay = document.getElementById(`cameraOverlay${type.charAt(0).toUpperCase() + type.slice(1)}`);
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
  
  const action = type === 'masuk' ? 'checkin' : 'checkout';
  const result = await callAPI(action, {
    photo_base64: currentPhotoData[type],
    lat: currentLocation.lat,
    lng: currentLocation.lng
  });
  
  if (result.status === 'success') {
    showToast(result.message, 'success');
    currentPhotoData[type] = null;
    
    // Update UI
    const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const statusEl = document.getElementById(`status${type.charAt(0).toUpperCase() + type.slice(1)}`);
    statusEl.innerHTML = `<span class="badge success"><i class="fas fa-check"></i> Sudah Absen ${type === 'masuk' ? 'Masuk' : 'Pulang'} (${timeNow})</span>`;
    
    const btn = document.getElementById(`btnAbsen${type.charAt(0).toUpperCase() + type.slice(1)}`);
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-check"></i> Sudah ${type === 'masuk' ? 'Masuk' : 'Pulang'}`;
    
    // Reload dashboard stats
    if (currentUser?.role === 'guru') loadGuruDashboard();
  } else {
    showToast(result.message, 'error');
  }
}

// ================================================
// GURU DASHBOARD
// ================================================
async function loadGuruDashboard() {
  startGeolocation();
  
  // Set greeting
  const hour = new Date().getHours();
  let greeting = 'Selamat Siang';
  if (hour < 11) greeting = 'Selamat Pagi';
  else if (hour < 15) greeting = 'Selamat Siang';
  else if (hour < 18) greeting = 'Selamat Sore';
  else greeting = 'Selamat Malam';
  document.getElementById('guruGreeting').textContent = `${greeting}, ${currentUser.name.split(' ')[0]}!`;
  
  // Load stats
  const result = await callAPI('get_dashboard_stats', {});
  
  if (result.status === 'success') {
    const data = result.data;
    if (data.month_summary) {
      document.getElementById('statHadir').textContent = data.month_summary.total_hadir || 0;
      document.getElementById('statTerlambat').textContent = data.month_summary.total_terlambat || 0;
      document.getElementById('statSakit').textContent = data.month_summary.total_sakit || 0;
      document.getElementById('statAlfa').textContent = data.month_summary.total_alfa || 0;
    }
    
    if (data.today_attendance?.checkin_time) {
      document.getElementById('statusMasuk').innerHTML = `<span class="badge success"><i class="fas fa-check"></i> Absen Masuk ${data.today_attendance.checkin_time}</span>`;
      document.getElementById('btnAbsenMasuk').disabled = true;
      document.getElementById('btnAbsenMasuk').innerHTML = `<i class="fas fa-check"></i> Sudah Masuk`;
    }
    
    if (data.today_attendance?.checkout_time) {
      document.getElementById('statusPulang').innerHTML = `<span class="badge success"><i class="fas fa-check"></i> Absen Pulang ${data.today_attendance.checkout_time}</span>`;
      document.getElementById('btnAbsenPulang').disabled = true;
      document.getElementById('btnAbsenPulang').innerHTML = `<i class="fas fa-check"></i> Sudah Pulang`;
    }
    
    if (data.checkin_window) {
      document.getElementById('windowMasuk').textContent = `${data.checkin_window.start} – ${data.checkin_window.end} WIT`;
    }
    if (data.checkout_window) {
      document.getElementById('windowPulang').textContent = `${data.checkout_window.start} – ${data.checkout_window.end} WIT`;
    }
  }
  
  await loadSickList();
  await loadHistory();
}

async function loadSickList() {
  const result = await callAPI('get_sick_reports', {});
  const container = document.getElementById('sickList');
  
  if (result.status === 'success' && result.data.reports?.length > 0) {
    container.innerHTML = result.data.reports.map(r => `
      <div class="sick-item ${r.status}">
        <div class="sick-header">
          <span class="sick-date"><i class="fas fa-calendar"></i> ${r.date}</span>
          <span class="sick-status status-badge status-${r.status}">${r.status === 'approved' ? 'Disetujui' : r.status === 'rejected' ? 'Ditolak' : 'Menunggu'}</span>
        </div>
        <div class="sick-reason">${r.reason_detail}</div>
        ${r.proof_url ? `<div class="sick-proof"><a href="${r.proof_url}" target="_blank"><i class="fas fa-image"></i> Lihat Bukti</a></div>` : ''}
      </div>
    `).join('');
  } else {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>Belum ada laporan izin/sakit</p></div>';
  }
}

async function loadHistory() {
  const month = document.getElementById('historyMonth')?.value || new Date().toISOString().slice(5, 7);
  const year = document.getElementById('historyYear')?.value || new Date().getFullYear();
  
  const result = await callAPI('get_attendance_history', { month, year });
  const container = document.getElementById('historyTable');
  
  if (result.status === 'success' && result.data.records?.length > 0) {
    container.innerHTML = `
      <div class="table-container">
        <table>
          <thead>
            <tr><th>Tanggal</th><th>Masuk</th><th>Pulang</th><th>Status</th><th>Foto</th></tr>
          </thead>
          <tbody>
            ${result.data.records.map(r => `
              <tr>
                <td>${r.date}</td>
                <td>${r.checkin_time || '-'}</td>
                <td>${r.checkout_time || '-'}</td>
                <td><span class="status-badge status-${r.status?.toLowerCase()}">${r.status || '-'}</span></td>
                <td>
                  ${r.checkin_photo_url ? `<button class="btn-icon" onclick="showPhoto('${r.checkin_photo_url}')"><i class="fas fa-camera"></i></button>` : '-'}
                  ${r.checkout_photo_url ? `<button class="btn-icon" onclick="showPhoto('${r.checkout_photo_url}')"><i class="fas fa-camera"></i></button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>Belum ada data kehadiran</p></div>';
  }
}

async function submitSick() {
  const date = document.getElementById('sickDate').value;
  const reason = document.getElementById('sickReason').value.trim();
  
  if (!date || !reason) {
    showToast('Tanggal dan alasan wajib diisi', 'error');
    return;
  }
  
  const result = await callAPI('submit_sick', { date, reason_detail: reason, proof_base64: sickFileBase64 || '' });
  
  if (result.status === 'success') {
    showToast(result.message, 'success');
    document.getElementById('sickReason').value = '';
    document.getElementById('sickFile').value = '';
    document.getElementById('sickPreview').style.display = 'none';
    document.getElementById('sickFileName').textContent = 'Belum ada file';
    sickFileBase64 = null;
    await loadSickList();
  } else {
    showToast(result.message, 'error');
  }
}

let sickFileBase64 = null;

function previewSickFile(input) {
  const file = input.files[0];
  if (!file) return;
  document.getElementById('sickFileName').textContent = file.name;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    sickFileBase64 = e.target.result;
    document.getElementById('sickPreviewImg').src = e.target.result;
    document.getElementById('sickPreview').style.display = 'block';
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
    const data = result.data;
    document.getElementById('adminTotalGuru').textContent = data.total_guru_aktif || 0;
    document.getElementById('adminHadirHari').textContent = data.hadir_hari_ini || 0;
    document.getElementById('adminAlfaBulan').textContent = data.alfa_bulan_ini || 0;
    document.getElementById('adminPendingSick').textContent = data.pending_sick || 0;
  }
}

async function loadAdminRecap() {
  const month = document.getElementById('adminMonth')?.value || (new Date().getMonth() + 1).toString().padStart(2, '0');
  const year = document.getElementById('adminYear')?.value || new Date().getFullYear();
  
  const result = await callAPI('get_all_attendance', { month, year });
  const container = document.getElementById('adminRecapTable');
  
  if (result.status === 'success' && result.data.report?.length > 0) {
    container.innerHTML = `
      <div class="table-container">
        <table>
          <thead>
            <tr><th>Nama Guru</th><th>Hadir</th><th>Terlambat</th><th>Sakit</th><th>Alfa</th></tr>
          </thead>
          <tbody>
            ${result.data.report.map(r => `
              <tr>
                <td><strong>${r.full_name}</strong></td>
                <td>${r.summary.total_hadir}</td>
                <td>${r.summary.total_terlambat}</td>
                <td>${r.summary.total_sakit}</td>
                <td class="${r.summary.total_alfa >= 3 ? 'alfa-warning' : ''}">${r.summary.total_alfa}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-chart-line"></i><p>Belum ada data</p></div>';
  }
}

async function loadAdminSick() {
  const result = await callAPI('get_sick_reports', {});
  const container = document.getElementById('adminSickList');
  
  if (result.status === 'success' && result.data.reports?.length > 0) {
    let filtered = result.data.reports;
    if (currentSickFilter !== 'all') {
      filtered = result.data.reports.filter(r => r.status === currentSickFilter);
    }
    
    container.innerHTML = filtered.map(r => `
      <div class="sick-item ${r.status}">
        <div class="sick-header">
          <span class="sick-user"><i class="fas fa-user"></i> ${r.full_name || r.user_id}</span>
          <span class="sick-date"><i class="fas fa-calendar"></i> ${r.date}</span>
        </div>
        <div class="sick-reason"><strong>Alasan:</strong> ${r.reason_detail}</div>
        ${r.proof_url ? `<div class="sick-proof"><a href="${r.proof_url}" target="_blank"><i class="fas fa-image"></i> Lihat Bukti</a></div>` : ''}
        <div class="sick-actions">
          ${r.status === 'pending' ? `
            <button class="btn-sm-success" onclick="approveSick('${r.id}', 'approve')"><i class="fas fa-check"></i> Setujui</button>
            <button class="btn-sm-danger" onclick="approveSick('${r.id}', 'reject')"><i class="fas fa-times"></i> Tolak</button>
          ` : `<span class="status-badge status-${r.status}">${r.status === 'approved' ? 'Disetujui' : 'Ditolak'}</span>`}
        </div>
      </div>
    `).join('');
  } else {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>Belum ada laporan izin</p></div>';
  }
}

function filterSick(filter, btn) {
  currentSickFilter = filter;
  document.querySelectorAll('.filter-sick').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadAdminSick();
}

async function approveSick(reportId, action) {
  const result = await callAPI('approve_sick', { report_id: reportId, action });
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
  
  if (result.status === 'success' && result.data.users?.length > 0) {
    container.innerHTML = `
      <div class="table-container">
        <table>
          <thead>
            <tr><th>Nama</th><th>Email</th><th>Role</th><th>Status</th><th>Aksi</th></tr>
          </thead>
          <tbody>
            ${result.data.users.map(u => `
              <tr>
                <td><strong>${u.full_name}</strong></td>
                <td>${u.email}</td>
                <td><span class="role-badge">${u.role === 'kepsek' ? 'Kepala Sekolah' : 'Guru'}</span></td>
                <td><span class="status-badge ${u.is_active === 'true' ? 'status-hadir' : 'status-alfa'}">${u.is_active === 'true' ? 'Aktif' : 'Nonaktif'}</span></td>
                <td>
                  <button class="btn-icon" onclick="toggleUser('${u.id}', '${u.is_active}')">
                    <i class="fas ${u.is_active === 'true' ? 'fa-ban' : 'fa-check-circle'}"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>Belum ada data guru</p></div>';
  }
}

async function toggleUser(userId, currentStatus) {
  const newStatus = currentStatus === 'true' ? false : true;
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
  
  if (result.status === 'success' && result.data.logs?.length > 0) {
    container.innerHTML = result.data.logs.map(log => `
      <div class="log-item">
        <div class="log-icon"><i class="fas ${getLogIcon(log.action)}"></i></div>
        <div class="log-detail">
          <div class="log-action">${log.action}</div>
          <div class="log-msg">${log.detail || '-'}</div>
          <div class="log-time"><i class="fas fa-clock"></i> ${log.timestamp}</div>
        </div>
        <div class="log-user">${log.email || 'System'}</div>
      </div>
    `).join('');
  } else {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>Belum ada log aktivitas</p></div>';
  }
}

function getLogIcon(action) {
  const icons = {
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
  const month = document.getElementById('adminMonth')?.value || (new Date().getMonth() + 1).toString().padStart(2, '0');
  const year = document.getElementById('adminYear')?.value || new Date().getFullYear();
  
  const result = await callAPI('send_monthly_report', { month, year });
  if (result.status === 'success') {
    showToast(result.message, 'success');
  } else {
    showToast(result.message, 'error');
  }
}

// ================================================
// PDF EXPORTS
// ================================================
async function exportPDF() {
  const month = document.getElementById('historyMonth')?.value || new Date().toISOString().slice(5, 7);
  const year = document.getElementById('historyYear')?.value || new Date().getFullYear();
  
  const result = await callAPI('export_pdf_data', { month, year });
  
  if (result.status === 'success' && window.jspdf && result.data.reports?.[0]) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const data = result.data;
    const report = data.reports[0];
    
    doc.setFontSize(18);
    doc.setTextColor(15, 76, 92);
    doc.text(`Laporan Kehadiran - ${data.school_name}`, 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Nama: ${report.user.full_name}`, 14, 35);
    doc.text(`Periode: ${data.month_name}`, 14, 42);
    doc.text(`Tanggal Cetak: ${data.generated_at}`, 14, 49);
    
    const tableData = report.daily.map(d => [d.date, d.checkin_time || '-', d.checkout_time || '-', d.status || '-']);
    
    doc.autoTable({
      startY: 60,
      head: [['Tanggal', 'Jam Masuk', 'Jam Pulang', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [15, 76, 92], textColor: 255 }
    });
    
    doc.save(`Laporan_${report.user.full_name}_${data.month_name}.pdf`);
    showToast('PDF berhasil diunduh', 'success');
  } else {
    showToast('Gagal generate PDF', 'error');
  }
}

async function exportAdminPDF() {
  const month = document.getElementById('adminMonth')?.value || (new Date().getMonth() + 1).toString().padStart(2, '0');
  const year = document.getElementById('adminYear')?.value || new Date().getFullYear();
  
  const result = await callAPI('export_pdf_data', { month, year });
  
  if (result.status === 'success' && window.jspdf && result.data.reports) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const data = result.data;
    
    doc.setFontSize(18);
    doc.setTextColor(15, 76, 92);
    doc.text(`Rekap Kehadiran Guru - ${data.school_name}`, 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Periode: ${data.month_name}`, 14, 35);
    doc.text(`Tanggal Cetak: ${data.generated_at}`, 14, 42);
    
    const tableData = data.reports.map(r => [r.user.full_name, r.summary.total_hadir, r.summary.total_terlambat, r.summary.total_sakit, r.summary.total_alfa]);
    
    doc.autoTable({
      startY: 55,
      head: [['Nama Guru', 'Hadir', 'Terlambat', 'Sakit', 'Alfa']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [15, 76, 92], textColor: 255 }
    });
    
    doc.save(`Rekap_Kehadiran_${data.month_name}.pdf`);
    showToast('PDF berhasil diunduh', 'success');
  } else {
    showToast('Gagal generate PDF', 'error');
  }
}

// ================================================
// UTILITY
// ================================================
function showPhoto(url) {
  document.getElementById('modalPhotoImg').src = url;
  document.getElementById('photoModal').style.display = 'flex';
}

function closePhotoModal() {
  document.getElementById('photoModal').style.display = 'none';
}

function showTab(tabName) {
  const tabs = ['presensi', 'izin', 'riwayat'];
  tabs.forEach(t => {
    const el = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (el) el.classList.remove('active');
  });
  document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
  
  const btns = document.querySelectorAll('.tab-btn');
  btns.forEach(btn => btn.classList.remove('active'));
  const activeBtn = Array.from(btns).find(btn => btn.getAttribute('data-tab') === tabName);
  if (activeBtn) activeBtn.classList.add('active');
}

function showAdminTab(tabName) {
  const tabs = ['rekap', 'izinAdmin', 'guru', 'log'];
  tabs.forEach(t => {
    const el = document.getElementById(`adminTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (el) el.classList.remove('active');
  });
  document.getElementById(`adminTab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
  
  const btns = document.querySelectorAll('.tab-btn');
  btns.forEach(btn => btn.classList.remove('active'));
  const activeBtn = Array.from(btns).find(btn => btn.textContent.toLowerCase().includes(tabName.toLowerCase()));
  if (activeBtn) activeBtn.classList.add('active');
}

function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const icon = input.parentElement.querySelector('.toggle-password i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}