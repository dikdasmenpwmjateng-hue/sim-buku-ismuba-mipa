// ============================================
// COMMON UTILITIES MODULE
// ============================================

const App = {
    // Initialize application
    async init() {
        // Check if API URL is set
        if (!Auth.CONFIG.API_URL || Auth.CONFIG.API_URL.trim() === '') {
            await Auth.initConfig();
        }
        
        // Check session for protected pages
        if (!window.location.pathname.includes('login.html')) {
            if (!Auth.checkSession()) {
                window.location.href = 'login.html';
                return;
            }
            
            // Display user info
            this.displayUserInfo();
        }
        
        // Initialize page-specific modules
        this.initPageModule();
    },
    
    // Display user info in sidebar
    displayUserInfo() {
        const user = Auth.getUser();
        if (!user) return;
        
        // Update all userName elements
        document.querySelectorAll('#userName').forEach(el => {
            el.textContent = user.nama;
        });
        
        // Update all userRole elements
        document.querySelectorAll('#userRole').forEach(el => {
            el.textContent = user.role;
        });
    },
    
    // Initialize page-specific module
    initPageModule() {
        const page = window.location.pathname.split('/').pop();
        
        switch(page) {
            case 'index.html':
                if (typeof Dashboard !== 'undefined') {
                    Dashboard.loadDashboardData();
                }
                break;
            case 'input-pemesanan.html':
                if (typeof InputPemesanan !== 'undefined') {
                    InputPemesanan.init();
                }
                break;
            case 'input-pembayaran.html':
                if (typeof InputPembayaran !== 'undefined') {
                    InputPembayaran.init();
                }
                break;
            case 'cetak-download.html':
                if (typeof CetakDownload !== 'undefined') {
                    CetakDownload.init();
                }
                break;
            case 'nota-pembayaran.html':
                if (typeof NotaPembayaran !== 'undefined') {
                    NotaPembayaran.init();
                }
                break;
        }
    },
    
    // Format functions (re-export from Auth)
    formatCurrency: Auth.formatCurrency,
    formatDate: Auth.formatDate,
    formatDateTime: Auth.formatDateTime,
    
    // Show/hide loading
    showLoading: Auth.showLoading,
    hideLoading: Auth.hideLoading,
    
    // Show messages
    showSuccess: Auth.showSuccess,
    showError: Auth.showError,
    confirmDialog: Auth.confirmDialog
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    App.init();
});

// Global error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    
    // Don't show error for cancelled requests
    if (e.message && e.message.includes('fetch')) {
        return;
    }
    
    // Show user-friendly error message
    if (!window.location.pathname.includes('login.html')) {
        Auth.showError('Terjadi kesalahan dalam aplikasi. Silakan refresh halaman.');
    }
});

// Handle offline/online status
window.addEventListener('offline', function() {
    Auth.showError('Koneksi internet terputus. Beberapa fitur mungkin tidak berfungsi.');
});

window.addEventListener('online', function() {
    Auth.showSuccess('Koneksi internet kembali pulih.');
});

// Export untuk global access
window.App = App;