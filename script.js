// ============================================================
// SISTEM ABSENSI DIGITAL - FRONTEND (GitHub Pages)
// Versi: 5.0 - FIXED FETCH ERROR
// ============================================================

// ==================== KONFIGURASI ====================
// GANTI DENGAN URL DEPLOY APPS SCRIPT ANDA!!!
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwYOeO1K7kNaeKFjEREA0rvIpmcgHBk1Ev9FCgMyQHcUsFI1JAWY-HhPhOLzBkyU9J6mQ/exec";

// Session management
let currentUser = null;

// Global variables
let stream = null;
let currentLocation = null;
let capturedPhoto = null;
let otpCountdownInterval = null;
let forgotEmail = '';
let forgotOtpVerified = false;

// ==================== UTILITY FUNCTIONS ====================
function showMessage(elementId, type, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.className = `message ${type}`;
        setTimeout(() => {
            if (element.textContent === message) {
                element.textContent = "";
                element.className = "message";
            }
        }, 5000);
    }
}

function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function updateDateTime() {
    const now = new Date();
    const dateElement = document.getElementById('currentDate');
    const timeElement = document.getElementById('currentTime');
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
}

// ==================== API CALLS (DIREK TANPA FETCH) ====================

// Untuk GET request - Menggunakan fetch dengan mode cors
async function apiGet(action, params = {}) {
    try {
        let url = `${APPS_SCRIPT_URL}?action=${action}`;
        
        // Tambahkan parameter tambahan
        Object.keys(params).forEach(key => {
            if (params[key]) {
                url += `&${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`;
            }
        });
        
        console.log("📡 API GET:", url);
        
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log("✅ API Response:", data);
        return data;
        
    } catch (error) {
        console.error('❌ API GET Error:', error);
        return { status: 'error', message: 'Koneksi gagal: ' + error.message };
    }
}

// Untuk POST request - Menggunakan fetch dengan mode cors
async function apiPost(action, data) {
    try {
        const payload = { action, ...data };
        console.log("📡 API POST:", action, payload);
        
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log("✅ API Response:", result);
        return result;
        
    } catch (error) {
        console.error('❌ API POST Error:', error);
        return { status: 'error', message: 'Koneksi gagal: ' + error.message };
    }
}

// ==================== TEST KONEKSI ====================
async function testConnection() {
    console.log("🔌 Testing connection to API...");
    console.log("📡 URL:", APPS_SCRIPT_URL);
    
    const result = await apiGet('test');
    
    if (result.status === 'success') {
        console.log("✅ API Connected successfully!");
        return true;
    } else {
        console.error("❌ API Connection Failed:", result);
        return false;
    }
}

// ==================== AUTHENTICATION ====================
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showMessage('loginMessage', 'error', 'Harap isi email dan password');
        return;
    }
    
    showMessage('loginMessage', 'neutral', 'Memproses...');
    
    const result = await apiPost('login', { email, password });
    
    if (result.status === 'success') {
        currentUser = result.data;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        sessionStorage.setItem('sessionToken', result.data.sessionToken);
        
        showMessage('loginMessage', 'success', 'Login berhasil! Mengalihkan...');
        
        setTimeout(() => {
            if (currentUser.role === 'guru') {
                window.location.href = 'dashboard-guru.html';
            } else if (currentUser.role === 'kepsek') {
                window.location.href = 'dashboard-kepsek.html';
            } else if (currentUser.role === 'admin') {
                window.location.href = 'dashboard-admin.html';
            } else {
                window.location.href = 'index.html';
            }
        }, 1000);
    } else {
        showMessage('loginMessage', 'error', result.message);
        if (result.unverified) {
            const resendContainer = document.getElementById('resendVerificationContainer');
            if (resendContainer) resendContainer.style.display = 'block';
        }
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const nama = document.getElementById('regNama').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const roleSelect = document.getElementById('regRole');
    const role = roleSelect ? roleSelect.value : 'guru';
    
    if (!nama || !email || !password) {
        showMessage('registerMessage', 'error', 'Harap isi semua field');
        return;
    }
    
    if (password.length < 6) {
        showMessage('registerMessage', 'error', 'Password minimal 6 karakter');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('registerMessage', 'error', 'Format email tidak valid');
        return;
    }
    
    showMessage('registerMessage', 'neutral', 'Mendaftarkan...');
    
    const result = await apiPost('signup', { nama, email, password, role });
    
    if (result.status === 'success') {
        showMessage('registerMessage', 'success', result.message);
        
        document.getElementById('regNama').value = '';
        document.getElementById('regEmail').value = '';
        document.getElementById('regPassword').value = '';
        
        setTimeout(() => {
            const loginTab = document.querySelector('.tab-btn[data-tab="login"]');
            if (loginTab) {
                loginTab.click();
            }
            document.getElementById('loginEmail').value = email;
        }, 2000);
    } else {
        showMessage('registerMessage', 'error', result.message);
    }
}

function handleLogout() {
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('sessionToken');
    currentUser = null;
    window.location.href = 'index.html';
}

function checkAuth() {
    const stored = sessionStorage.getItem('currentUser');
    if (stored) {
        currentUser = JSON.parse(stored);
        return true;
    }
    return false;
}

// ==================== CAMERA & GEOLOCATION ====================
async function initCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.getElementById('video');
        if (video) {
            video.srcObject = stream;
            await video.play();
        }
        return true;
    } catch (error) {
        console.error('Camera error:', error);
        showMessage('attendanceMessage', 'error', 'Tidak dapat mengakses kamera.');
        return false;
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

function capturePhoto() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    if (!video || !canvas) return;
    
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const photoData = canvas.toDataURL('image/jpeg', 0.8);
    capturedPhoto = photoData;
    
    const preview = document.getElementById('photoPreview');
    const previewImg = document.getElementById('previewImg');
    if (preview && previewImg) {
        previewImg.src = photoData;
        preview.style.display = 'block';
    }
    
    const cameraContainer = document.querySelector('.camera-container');
    if (cameraContainer) cameraContainer.style.display = 'none';
    
    return photoData;
}

function retakePhoto() {
    capturedPhoto = null;
    const preview = document.getElementById('photoPreview');
    const cameraContainer = document.querySelector('.camera-container');
    if (preview) preview.style.display = 'none';
    if (cameraContainer) cameraContainer.style.display = 'block';
    const captureBtn = document.getElementById('captureBtn');
    if (captureBtn) captureBtn.disabled = false;
}

async function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation tidak didukung'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            (error) => {
                let message = 'Gagal mendapatkan lokasi. ';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        message += 'Izin lokasi ditolak.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message += 'Lokasi tidak tersedia.';
                        break;
                    case error.TIMEOUT:
                        message += 'Waktu habis.';
                        break;
                }
                reject(new Error(message));
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}

// ==================== ATTENDANCE FUNCTIONS ====================
async function loadTodayStatus() {
    if (!currentUser) return;
    
    const result = await apiGet('checkTodayAttendance', { email: currentUser.email });
    
    if (result.status === 'success') {
        const statusDiv = document.getElementById('statusDetails');
        const checkInBtn = document.getElementById('checkInBtn');
        const checkOutBtn = document.getElementById('checkOutBtn');
        
        if (statusDiv) {
            if (result.data.hasCheckedIn) {
                statusDiv.innerHTML = `
                    <p>✅ Sudah absen masuk pada: ${result.data.checkInTime}</p>
                    ${result.data.hasCheckedOut ? `<p>✅ Sudah absen pulang pada: ${result.data.checkOutTime}</p>` : '<p>⏰ Belum absen pulang</p>'}
                `;
                if (checkInBtn) checkInBtn.disabled = true;
                if (checkOutBtn && !result.data.hasCheckedOut) checkOutBtn.disabled = false;
                else if (checkOutBtn && result.data.hasCheckedOut) checkOutBtn.disabled = true;
            } else {
                statusDiv.innerHTML = '<p>📝 Belum melakukan absen hari ini</p>';
                if (checkInBtn) checkInBtn.disabled = false;
            }
        }
    }
}

async function loadTodaySchedule() {
    const result = await apiGet('getSettings');
    if (result.status === 'success') {
        const infoDiv = document.getElementById('todayInfo');
        if (infoDiv) {
            const now = new Date();
            const day = now.getDay();
            let scheduleText = '';
            
            if (day === 0 || day === 6) {
                scheduleText = '<p>🏖️ Hari libur akhir pekan</p>';
            } else if (day >= 1 && day <= 3) {
                scheduleText = `
                    <p>📅 Senin - Rabu</p>
                    <p>⏰ Absen Masuk: ${result.data.senin_rabu_masuk_mulai?.value || '07:30'} - ${result.data.senin_rabu_masuk_selesai?.value || '08:00'}</p>
                    <p>⏰ Absen Pulang: ${result.data.senin_rabu_pulang_mulai?.value || '12:00'} - ${result.data.senin_rabu_pulang_selesai?.value || '12:15'}</p>
                `;
            } else if (day === 4 || day === 5) {
                scheduleText = `
                    <p>📅 Kamis - Jumat</p>
                    <p>⏰ Absen Masuk: ${result.data.kamis_jumat_masuk_mulai?.value || '07:30'} - ${result.data.kamis_jumat_masuk_selesai?.value || '08:00'}</p>
                    <p>⏰ Absen Pulang: ${result.data.kamis_jumat_pulang_mulai?.value || '11:30'} - ${result.data.kamis_jumat_pulang_selesai?.value || '11:45'}</p>
                `;
            }
            infoDiv.innerHTML = scheduleText;
        }
    }
}

async function loadHistory() {
    const month = document.getElementById('historyMonth')?.value;
    const year = document.getElementById('historyYear')?.value;
    
    if (!month || !year) return;
    
    const result = await apiGet('getAttendanceHistory', { email: currentUser.email, month, year });
    
    const tbody = document.getElementById('historyBody');
    if (tbody) {
        if (result.status === 'success' && result.data.length > 0) {
            tbody.innerHTML = result.data.map(record => `
                <tr>
                    <td>${formatDate(record.tanggal)}</td>
                    <td>${record.checkIn || '-'}</td>
                    <td>${record.checkOut || '-'}</td>
                    <td>${record.lokasi || '-'}</td>
                    <td><span class="status-badge success">${record.status || 'Hadir'}</span></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5">Belum ada data absensi</td></tr>';
        }
    }
}

async function handleCheckIn() {
    if (!capturedPhoto) {
        showMessage('attendanceMessage', 'error', 'Harap ambil foto selfie terlebih dahulu');
        return;
    }
    
    if (!currentLocation) {
        showMessage('attendanceMessage', 'error', 'Harap dapatkan lokasi Anda terlebih dahulu');
        return;
    }
    
    showMessage('attendanceMessage', 'neutral', 'Memproses absen masuk...');
    
    const result = await apiPost('checkIn', {
        email: currentUser.email,
        photo: capturedPhoto,
        lat: currentLocation.lat,
        lng: currentLocation.lng
    });
    
    if (result.status === 'success') {
        showMessage('attendanceMessage', 'success', result.message);
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    } else {
        showMessage('attendanceMessage', 'error', result.message);
    }
}

async function handleCheckOut() {
    if (!capturedPhoto) {
        showMessage('attendanceMessage', 'error', 'Harap ambil foto selfie terlebih dahulu');
        return;
    }
    
    if (!currentLocation) {
        showMessage('attendanceMessage', 'error', 'Harap dapatkan lokasi Anda terlebih dahulu');
        return;
    }
    
    showMessage('attendanceMessage', 'neutral', 'Memproses absen pulang...');
    
    const result = await apiPost('checkOut', {
        email: currentUser.email,
        photo: capturedPhoto,
        lat: currentLocation.lat,
        lng: currentLocation.lng
    });
    
    if (result.status === 'success') {
        showMessage('attendanceMessage', 'success', result.message);
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    } else {
        showMessage('attendanceMessage', 'error', result.message);
    }
}

async function handleGetLocation() {
    const locationBtn = document.getElementById('getLocationBtn');
    const locationInfo = document.getElementById('locationInfo');
    
    if (locationBtn) {
        locationBtn.disabled = true;
        locationBtn.textContent = 'Mendapatkan lokasi...';
    }
    
    try {
        const location = await getCurrentLocation();
        currentLocation = location;
        
        if (locationInfo) {
            locationInfo.innerHTML = `✅ Lokasi ditemukan! (Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)})`;
            locationInfo.style.color = '#065f46';
        }
    } catch (error) {
        if (locationInfo) {
            locationInfo.innerHTML = `❌ ${error.message}`;
            locationInfo.style.color = '#991b1b';
        }
    } finally {
        if (locationBtn) {
            locationBtn.disabled = false;
            locationBtn.textContent = 'Dapatkan Lokasi Saya';
        }
    }
}

// ==================== FORGOT PASSWORD ====================
async function sendOTP() {
    const email = document.getElementById('forgotEmail').value;
    if (!email) {
        showMessage('forgotMessage', 'error', 'Masukkan email Anda');
        return;
    }
    
    forgotEmail = email;
    showMessage('forgotMessage', 'neutral', 'Mengirim OTP...');
    
    const result = await apiPost('sendPasswordResetOTP', { email });
    
    if (result.status === 'success') {
        showMessage('forgotMessage', 'success', result.message);
        document.getElementById('forgotStep1').style.display = 'none';
        document.getElementById('forgotStep2').style.display = 'block';
        startOtpTimer(10);
    } else {
        showMessage('forgotMessage', 'error', result.message);
    }
}

function startOtpTimer(minutes) {
    let time = minutes * 60;
    const timerElement = document.getElementById('otpTimer');
    
    if (otpCountdownInterval) clearInterval(otpCountdownInterval);
    
    otpCountdownInterval = setInterval(() => {
        time--;
        const mins = Math.floor(time / 60);
        const secs = time % 60;
        if (timerElement) {
            timerElement.textContent = `OTP berlaku: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        if (time <= 0) {
            clearInterval(otpCountdownInterval);
            if (timerElement) timerElement.textContent = 'OTP telah kadaluarsa';
        }
    }, 1000);
}

async function verifyOTPCode() {
    const otp = document.getElementById('otpCode').value;
    if (!otp || otp.length !== 6) {
        showMessage('forgotMessage', 'error', 'Masukkan 6 digit OTP');
        return;
    }
    
    showMessage('forgotMessage', 'neutral', 'Memverifikasi OTP...');
    
    const result = await apiPost('verifyOTP', { email: forgotEmail, otp });
    
    if (result.status === 'success') {
        forgotOtpVerified = true;
        showMessage('forgotMessage', 'success', result.message);
        document.getElementById('forgotStep2').style.display = 'none';
        document.getElementById('forgotStep3').style.display = 'block';
        if (otpCountdownInterval) clearInterval(otpCountdownInterval);
    } else {
        showMessage('forgotMessage', 'error', result.message);
    }
}

async function resendOTP() {
    if (!forgotEmail) return;
    
    showMessage('forgotMessage', 'neutral', 'Mengirim ulang OTP...');
    
    const result = await apiPost('sendPasswordResetOTP', { email: forgotEmail });
    
    if (result.status === 'success') {
        showMessage('forgotMessage', 'success', result.message);
        startOtpTimer(10);
    } else {
        showMessage('forgotMessage', 'error', result.message);
    }
}

async function resetPassword() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!newPassword || newPassword.length < 6) {
        showMessage('forgotMessage', 'error', 'Password minimal 6 karakter');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showMessage('forgotMessage', 'error', 'Password tidak sama');
        return;
    }
    
    showMessage('forgotMessage', 'neutral', 'Merreset password...');
    
    const result = await apiPost('resetPassword', { email: forgotEmail, newPassword });
    
    if (result.status === 'success') {
        showMessage('forgotMessage', 'success', result.message);
        setTimeout(() => {
            const modal = document.getElementById('forgotModal');
            if (modal) modal.style.display = 'none';
            document.getElementById('forgotStep1').style.display = 'block';
            document.getElementById('forgotStep2').style.display = 'none';
            document.getElementById('forgotStep3').style.display = 'none';
            document.getElementById('forgotEmail').value = '';
            document.getElementById('otpCode').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            forgotOtpVerified = false;
        }, 2000);
    } else {
        showMessage('forgotMessage', 'error', result.message);
    }
}

async function resendVerificationEmail() {
    const email = document.getElementById('loginEmail').value;
    if (!email) {
        showMessage('loginMessage', 'error', 'Masukkan email terlebih dahulu');
        return;
    }
    
    showMessage('loginMessage', 'neutral', 'Mengirim ulang verifikasi...');
    
    const result = await apiPost('resendVerification', { email });
    
    if (result.status === 'success') {
        showMessage('loginMessage', 'success', result.message);
    } else {
        showMessage('loginMessage', 'error', result.message);
    }
}

// ==================== LOAD PROFILE ====================
function loadProfile() {
    if (!currentUser) return;
    
    const nameElements = ['userName', 'profileName'];
    nameElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = currentUser.nama;
    });
    
    const emailElements = ['profileEmail'];
    emailElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = currentUser.email;
    });
    
    const roleElements = ['userRole', 'profileRole'];
    roleElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (currentUser.role === 'guru') el.textContent = 'Guru';
            else if (currentUser.role === 'kepsek') el.textContent = 'Kepala Sekolah';
            else if (currentUser.role === 'admin') el.textContent = 'Administrator';
            else el.textContent = currentUser.role;
        }
    });
}

// ==================== PAGE NAVIGATION ====================
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = item.dataset.page;
            
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            pages.forEach(page => page.classList.remove('active'));
            const targetPage = document.getElementById(`page${pageId.charAt(0).toUpperCase() + pageId.slice(1)}`);
            if (targetPage) targetPage.classList.add('active');
            
            const pageTitle = document.getElementById('pageTitle');
            if (pageTitle) pageTitle.textContent = item.textContent.trim();
            
            if (pageId === 'history') {
                loadHistory();
            } else if (pageId === 'dashboard') {
                loadDashboardStats();
                loadTodaySchedule();
            } else if (pageId === 'attendance') {
                setTimeout(() => {
                    initCamera();
                    loadTodayStatus();
                }, 100);
            }
        });
    });
}

function initMobileMenu() {
    const menuBtn = document.getElementById('mobileMenuToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
        
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('mobile-open') && !sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
                sidebar.classList.remove('mobile-open');
            }
        });
    }
}

// ==================== DASHBOARD STATS ====================
async function loadDashboardStats() {
    const result = await apiGet('getAllUsers');
    if (result.status === 'success') {
        const totalGuru = result.data.filter(u => u.role === 'guru').length;
        const totalGuruElem = document.getElementById('totalGuru');
        if (totalGuruElem) totalGuruElem.textContent = totalGuru;
    }
    
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    if (currentUser) {
        const historyResult = await apiGet('getAttendanceHistory', { email: currentUser.email, month, year });
        if (historyResult.status === 'success') {
            const totalHadir = historyResult.data.length;
            const totalHadirElem = document.getElementById('totalHadir');
            if (totalHadirElem) totalHadirElem.textContent = totalHadir;
            const persen = Math.round((totalHadir / 22) * 100);
            const persenElem = document.getElementById('persenKehadiran');
            if (persenElem) persenElem.textContent = `${persen}%`;
        }
    }
}

// ==================== CHANGE PASSWORD ====================
async function changePassword() {
    const newPassword1 = document.getElementById('newPassword1').value;
    const newPassword2 = document.getElementById('newPassword2').value;
    
    if (!newPassword1 || newPassword1.length < 6) {
        showMessage('changePwMessage', 'error', 'Password minimal 6 karakter');
        return;
    }
    
    if (newPassword1 !== newPassword2) {
        showMessage('changePwMessage', 'error', 'Password tidak sama');
        return;
    }
    
    showMessage('changePwMessage', 'neutral', 'Mengganti password...');
    
    const result = await apiPost('resetPassword', { email: currentUser.email, newPassword: newPassword1 });
    
    if (result.status === 'success') {
        showMessage('changePwMessage', 'success', 'Password berhasil diganti');
        setTimeout(() => {
            const modal = document.getElementById('changePasswordModal');
            if (modal) modal.style.display = 'none';
            document.getElementById('newPassword1').value = '';
            document.getElementById('newPassword2').value = '';
        }, 2000);
    } else {
        showMessage('changePwMessage', 'error', result.message);
    }
}

// ==================== INITIALIZATION ====================
function initYearSelect() {
    const yearSelect = document.getElementById('historyYear');
    if (yearSelect) {
        const currentYear = new Date().getFullYear();
        for (let y = currentYear - 2; y <= currentYear + 1; y++) {
            const option = document.createElement('option');
            option.value = y;
            option.textContent = y;
            if (y === currentYear) option.selected = true;
            yearSelect.appendChild(option);
        }
    }
}

function initModals() {
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// ==================== GENERATE REPORT ====================
async function generateMonthlyReport() {
    const month = document.getElementById('reportMonth')?.value;
    const year = document.getElementById('reportYear')?.value;
    const sendToEmail = document.getElementById('reportEmail')?.value || currentUser.email;
    
    if (!month || !year) return;
    
    showMessage('reportMessage', 'neutral', 'Mengirim laporan...');
    
    const result = await apiPost('generateMonthlyReport', { month, year, sendToEmail });
    
    if (result.status === 'success') {
        showMessage('reportMessage', 'success', `Laporan telah dikirim ke email ${sendToEmail}`);
    } else {
        showMessage('reportMessage', 'error', result.message);
    }
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Aplikasi dimulai...");
    console.log("📡 API URL:", APPS_SCRIPT_URL);
    
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Test koneksi
    const connected = await testConnection();
    if (!connected) {
        console.error("⚠️ Peringatan: Tidak bisa terhubung ke server!");
    }
    
    // Cek auth untuk halaman dashboard
    const isDashboardPage = window.location.pathname.includes('dashboard-');
    if (isDashboardPage) {
        if (!checkAuth()) {
            window.location.href = 'index.html';
            return;
        }
        loadProfile();
        initNavigation();
        initMobileMenu();
        initYearSelect();
        initModals();
        loadTodaySchedule();
        loadDashboardStats();
    }
    
    // Halaman Login/Register
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const loginFormDiv = document.getElementById('loginForm');
            const registerFormDiv = document.getElementById('registerForm');
            
            if (tab === 'login') {
                if (loginFormDiv) loginFormDiv.classList.add('active');
                if (registerFormDiv) registerFormDiv.classList.remove('active');
            } else {
                if (loginFormDiv) loginFormDiv.classList.remove('active');
                if (registerFormDiv) registerFormDiv.classList.add('active');
            }
        });
    });
    
    // Forgot password
    const forgotLink = document.getElementById('forgotPasswordLink');
    const forgotModal = document.getElementById('forgotModal');
    if (forgotLink && forgotModal) {
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            forgotModal.style.display = 'flex';
        });
    }
    
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    if (sendOtpBtn) sendOtpBtn.addEventListener('click', sendOTP);
    
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    if (verifyOtpBtn) verifyOtpBtn.addEventListener('click', verifyOTPCode);
    
    const resendOtpBtn = document.getElementById('resendOtpBtn');
    if (resendOtpBtn) resendOtpBtn.addEventListener('click', resendOTP);
    
    const resetPasswordBtn = document.getElementById('resetPasswordBtn');
    if (resetPasswordBtn) resetPasswordBtn.addEventListener('click', resetPassword);
    
    const resendVerifLink = document.getElementById('resendVerificationLink');
    if (resendVerifLink) resendVerifLink.addEventListener('click', resendVerificationEmail);
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    // Halaman Guru - Absensi
    const captureBtn = document.getElementById('captureBtn');
    const retakeBtn = document.getElementById('retakeBtn');
    const getLocationBtn = document.getElementById('getLocationBtn');
    const checkInBtn = document.getElementById('checkInBtn');
    const checkOutBtn = document.getElementById('checkOutBtn');
    
    if (captureBtn) {
        captureBtn.addEventListener('click', () => {
            capturePhoto();
            captureBtn.disabled = true;
        });
    }
    
    if (retakeBtn) {
        retakeBtn.addEventListener('click', () => {
            retakePhoto();
            const captureBtnEl = document.getElementById('captureBtn');
            if (captureBtnEl) captureBtnEl.disabled = false;
        });
    }
    
    if (getLocationBtn) getLocationBtn.addEventListener('click', handleGetLocation);
    if (checkInBtn) checkInBtn.addEventListener('click', handleCheckIn);
    if (checkOutBtn) checkOutBtn.addEventListener('click', handleCheckOut);
    
    const loadHistoryBtn = document.getElementById('loadHistoryBtn');
    if (loadHistoryBtn) loadHistoryBtn.addEventListener('click', loadHistory);
    
    const generateReportBtn = document.getElementById('generateReportBtn');
    if (generateReportBtn) generateReportBtn.addEventListener('click', generateMonthlyReport);
    
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', () => {
            const modal = document.getElementById('changePasswordModal');
            if (modal) modal.style.display = 'flex';
        });
    }
    
    const confirmChangePassword = document.getElementById('confirmChangePassword');
    if (confirmChangePassword) confirmChangePassword.addEventListener('click', changePassword);
});