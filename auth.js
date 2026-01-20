// ============================================
// AUTHENTICATION MODULE
// ============================================

// Konfigurasi
const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbyai0O_34XusfWcaBoBz06laiNfKZF4m5VLnJ2fw3SvhNCIcKv-gHq2epZWfyUMhIMygw/exec', // Isi dengan URL Web App Google Apps Script
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 menit
    APP_NAME: 'SIM Pemesanan Buku ISMUBA & MIPA'
};

// Cek dan set API URL
function initConfig() {
    // Coba dapatkan dari localStorage
    let savedUrl = localStorage.getItem('api_url');
    
    if (savedUrl && savedUrl.trim() !== '') {
        CONFIG.API_URL = savedUrl;
        console.log('API URL loaded from storage:', CONFIG.API_URL);
        return;
    }
    
    // Jika tidak ada, minta input dari user
    Swal.fire({
        title: 'Konfigurasi Aplikasi',
        html: `
            <div class="mb-3">
                <label class="form-label">Masukkan URL Web App:</label>
                <input type="url" id="apiUrl" class="form-control" 
                       placeholder="https://script.google.com/macros/s/..." required>
                <small class="form-text text-muted">
                    URL Web App Google Apps Script yang sudah dideploy
                </small>
            </div>
        `,
        showCancelButton: false,
        confirmButtonText: 'Simpan',
        preConfirm: () => {
            const url = document.getElementById('apiUrl').value;
            if (!url) {
                Swal.showValidationMessage('URL harus diisi');
            }
            return url;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            CONFIG.API_URL = result.value;
            localStorage.setItem('api_url', result.value);
            checkApiConnection();
        }
    });
}

// Cek koneksi API
async function checkApiConnection() {
    try {
        showLoading();
        const response = await fetch(`${CONFIG.API_URL}?method=getMasterData`);
        const data = await response.json();
        
        if (data.success) {
            console.log('API connection successful');
            return true;
        } else {
            throw new Error(data.error || 'API error');
        }
    } catch (error) {
        console.error('API connection failed:', error);
        Swal.fire({
            icon: 'error',
            title: 'Koneksi Gagal',
            text: 'Tidak dapat terhubung ke server. Periksa URL API Anda.',
            confirmButtonText: 'Ubah URL'
        }).then(() => {
            localStorage.removeItem('api_url');
            localStorage.removeItem('user');
            initConfig();
        });
        return false;
    } finally {
        hideLoading();
    }
}

// Cek session
function checkSession() {
    const user = getUser();
    const lastActivity = localStorage.getItem('last_activity');
    const currentTime = new Date().getTime();
    
    if (!user) {
        return false;
    }
    
    // Cek timeout
    if (lastActivity && (currentTime - parseInt(lastActivity) > CONFIG.SESSION_TIMEOUT)) {
        logout();
        Swal.fire({
            icon: 'warning',
            title: 'Session Expired',
            text: 'Session Anda telah habis. Silakan login kembali.',
            confirmButtonText: 'OK'
        });
        return false;
    }
    
    // Update last activity
    localStorage.setItem('last_activity', currentTime.toString());
    return true;
}

// Login function
async function login(username, password) {
    try {
        showLoading();
        
        const response = await fetch(`${CONFIG.API_URL}?method=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`);
        const data = await response.json();
        
        if (data.success) {
            // Simpan user data
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('last_activity', new Date().getTime().toString());
            
            Swal.fire({
                icon: 'success',
                title: 'Login Berhasil',
                text: `Selamat datang, ${data.user.nama}!`,
                timer: 1500,
                showConfirmButton: false
            });
            
            return data.user;
        } else {
            throw new Error(data.error || 'Login gagal');
        }
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    } finally {
        hideLoading();
    }
}

// Logout function
function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('last_activity');
    window.location.href = 'login.html';
}

// Get current user
function getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Update user activity
function updateActivity() {
    localStorage.setItem('last_activity', new Date().getTime().toString());
}

// Show loading overlay
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

// Hide loading overlay
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Format currency
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'Rp 0';
    return 'Rp ' + parseInt(amount).toLocaleString('id-ID');
}

// Format date
function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Format datetime
function formatDateTime(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Validasi form
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;
    
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('is-invalid');
            isValid = false;
        } else {
            field.classList.remove('is-invalid');
        }
    });
    
    return isValid;
}

// Show success message
function showSuccess(message, callback = null) {
    Swal.fire({
        icon: 'success',
        title: 'Sukses!',
        text: message,
        timer: 2000,
        showConfirmButton: false
    }).then(() => {
        if (callback && typeof callback === 'function') {
            callback();
        }
    });
}

// Show error message
function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: message,
        confirmButtonText: 'OK'
    });
}

// Confirm dialog
function confirmDialog(title, text, callback) {
    Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya',
        cancelButtonText: 'Tidak'
    }).then((result) => {
        if (result.isConfirmed && callback) {
            callback();
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Update activity on user interaction
    document.addEventListener('click', updateActivity);
    document.addEventListener('keypress', updateActivity);
    
    // Check session every minute
    setInterval(checkSession, 60000);
    
    // Initialize config if on login page
    if (window.location.pathname.includes('login.html')) {
        initConfig();
    }
    
    // Check session for other pages
    if (!window.location.pathname.includes('login.html')) {
        if (!checkSession()) {
            window.location.href = 'login.html';
        } else {
            // Display user info
            const user = getUser();
            const userNameElements = document.querySelectorAll('#userName');
            const userRoleElements = document.querySelectorAll('#userRole');
            
            if (user) {
                userNameElements.forEach(el => {
                    if (el) el.textContent = user.nama;
                });
                userRoleElements.forEach(el => {
                    if (el) el.textContent = user.role;
                });
            }
        }
    }
});

// Export functions
window.Auth = {
    login,
    logout,
    getUser,
    checkSession,
    formatCurrency,
    formatDate,
    formatDateTime,
    showLoading,
    hideLoading,
    validateForm,
    showSuccess,
    showError,
    confirmDialog,
    CONFIG
};