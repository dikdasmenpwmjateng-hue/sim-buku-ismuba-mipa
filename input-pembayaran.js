// ============================================
// INPUT PEMBAYARAN MODULE
// ============================================

const InputPembayaran = {
    // State
    selectedOrder: null,
    searchResults: [],
    recentPayments: [],
    paymentFile: null,
    filePreview: null,
    
    // Initialize
    async init() {
        try {
            Auth.showLoading();
            
            // Set today's date
            document.getElementById('paymentDate').valueAsDate = new Date();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup file upload
            this.setupFileUpload();
            
            // Load recent payments
            await this.loadRecentPayments();
            
            // Check user role and adjust UI
            this.adjustUIForUserRole();
            
        } catch (error) {
            console.error('Error initializing:', error);
            Auth.showError('Gagal memuat data: ' + error.message);
        } finally {
            Auth.hideLoading();
        }
    },
    
    // Adjust UI based on user role
    adjustUIForUserRole() {
        const user = Auth.getUser();
        if (!user) return;
        
        const role = user.role;
        const titleElement = document.querySelector('.page-title');
        
        if (titleElement) {
            if (role === 'operator_kabupaten') {
                titleElement.innerHTML = '<i class="fas fa-upload"></i> Upload Pembayaran (Operator)';
                document.getElementById('paymentMethod').innerHTML += `
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="Tunai">Tunai</option>
                `;
            } else if (role === 'admin') {
                titleElement.innerHTML = '<i class="fas fa-cash-register"></i> Input Pembayaran (Admin)';
                document.getElementById('paymentMethod').innerHTML += `
                    <option value="Transfer">Transfer</option>
                    <option value="Tunai">Tunai</option>
                    <option value="Cek">Cek</option>
                    <option value="Giro">Giro</option>
                `;
            }
        }
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('searchOrder');
        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchOrders(e.target.value);
            }, 500);
        });
        
        // Filter status
        const filterStatus = document.getElementById('filterStatus');
        if (filterStatus) {
            filterStatus.addEventListener('change', () => {
                this.searchOrders(searchInput.value);
            });
        }
        
        // Payment amount change
        const paymentAmount = document.getElementById('paymentAmount');
        if (paymentAmount) {
            paymentAmount.addEventListener('input', () => {
                this.calculatePayment();
            });
            
            // Quick amount buttons
            this.setupQuickAmountButtons();
        }
        
        // Submit payment button
        const submitBtn = document.getElementById('submitPaymentBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                this.submitPayment();
            });
        }
        
        // Reset button
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetForm();
            });
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                Auth.confirmDialog(
                    'Konfirmasi Logout',
                    'Apakah Anda yakin ingin logout?',
                    () => Auth.logout()
                );
            });
        }
    },
    
    // Setup quick amount buttons
    setupQuickAmountButtons() {
        // Add quick amount buttons if not exists
        if (!document.getElementById('quickAmountButtons')) {
            const container = document.getElementById('paymentAmount').parentElement;
            const quickButtonsHtml = `
                <div class="mt-2" id="quickAmountButtons">
                    <small class="text-muted">Jumlah Cepat:</small>
                    <div class="btn-group btn-group-sm mt-1" role="group">
                        <button type="button" class="btn btn-outline-secondary" onclick="setPaymentAmount(50000)">50K</button>
                        <button type="button" class="btn btn-outline-secondary" onclick="setPaymentAmount(100000)">100K</button>
                        <button type="button" class="btn btn-outline-secondary" onclick="setPaymentAmount(500000)">500K</button>
                        <button type="button" class="btn btn-outline-secondary" onclick="setPaymentAmount(1000000)">1JT</button>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-secondary ms-2" onclick="setPaymentAmount(${this.selectedOrder ? this.selectedOrder.total : 0})">
                        <i class="fas fa-receipt"></i> Pas
                    </button>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', quickButtonsHtml);
        }
    },
    
    // Setup file upload
    setupFileUpload() {
        const user = Auth.getUser();
        if (user.role !== 'operator_kabupaten') {
            return; // Only operators need file upload
        }
        
        // Create hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*,.pdf';
        fileInput.style.display = 'none';
        fileInput.id = 'paymentProofInput';
        document.body.appendChild(fileInput);
        
        // Add upload section to DOM
        const uploadSection = `
            <div class="form-section mt-4 border rounded p-3 bg-light" id="proofUploadSection">
                <h5 class="mb-3"><i class="fas fa-file-upload text-primary"></i> Upload Bukti Transfer</h5>
                
                <div class="mb-3">
                    <label class="form-label fw-semibold">File Bukti Transfer <span class="text-danger">*</span></label>
                    <div class="input-group">
                        <button class="btn btn-outline-primary" type="button" onclick="document.getElementById('paymentProofInput').click()">
                            <i class="fas fa-folder-open me-2"></i> Pilih File
                        </button>
                        <input type="text" class="form-control" id="fileName" 
                               placeholder="Klik tombol untuk memilih file bukti transfer" readonly>
                        <button class="btn btn-outline-danger" type="button" onclick="InputPembayaran.clearFile()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="form-text">
                        <i class="fas fa-info-circle"></i> Format: JPG, PNG, PDF (Maksimal 5MB)
                    </div>
                </div>
                
                <div id="filePreview" class="text-center mt-3" style="display: none;">
                    <!-- File preview will be shown here -->
                </div>
                
                <div class="alert alert-warning mt-3">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Perhatian:</strong> Setelah diupload, pembayaran akan berstatus 
                    <span class="badge bg-warning text-dark">Menunggu Validasi</span> 
                    dan akan dicek manual oleh admin dalam 1-2 hari kerja.
                </div>
            </div>
        `;
        
        // Add after payment form
        const paymentForm = document.querySelector('.form-section');
        if (paymentForm) {
            paymentForm.insertAdjacentHTML('afterend', uploadSection);
        }
        
        // Handle file selection
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e);
        });
    },
    
    // Handle file selection
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            Auth.showError('Ukuran file maksimal 5MB');
            event.target.value = '';
            return;
        }
        
        // Check file type
        const allowedTypes = [
            'image/jpeg', 
            'image/png', 
            'image/gif', 
            'application/pdf'
        ];
        
        if (!allowedTypes.includes(file.type)) {
            Auth.showError('Format file tidak didukung. Gunakan JPG, PNG, atau PDF');
            event.target.value = '';
            return;
        }
        
        this.paymentFile = file;
        document.getElementById('fileName').value = file.name;
        
        // Show preview
        this.showFilePreview(file);
        
        // Enable submit button
        this.updateSubmitButton();
    },
    
    // Show file preview
    showFilePreview(file) {
        const preview = document.getElementById('filePreview');
        
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `
                    <div class="card">
                        <div class="card-header bg-light">
                            <i class="fas fa-image me-2"></i>Preview Gambar
                        </div>
                        <div class="card-body p-3">
                            <img src="${e.target.result}" 
                                 class="img-thumbnail img-fluid" 
                                 style="max-width: 300px; max-height: 300px; object-fit: contain;">
                            <div class="mt-2 text-muted">
                                <small>${file.name} • ${(file.size / 1024).toFixed(0)} KB</small>
                            </div>
                        </div>
                    </div>
                `;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            preview.innerHTML = `
                <div class="card">
                    <div class="card-header bg-light">
                        <i class="fas fa-file me-2"></i>File Preview
                    </div>
                    <div class="card-body p-3">
                        <div class="text-center">
                            <i class="fas fa-file-pdf fa-3x text-danger mb-3"></i>
                            <h6>${file.name}</h6>
                            <small class="text-muted">${(file.size / 1024).toFixed(0)} KB • PDF Document</small>
                        </div>
                    </div>
                </div>
            `;
            preview.style.display = 'block';
        }
    },
    
    // Clear selected file
    clearFile() {
        this.paymentFile = null;
        document.getElementById('fileName').value = '';
        document.getElementById('paymentProofInput').value = '';
        document.getElementById('filePreview').style.display = 'none';
        this.updateSubmitButton();
    },
    
    // Update submit button state
    updateSubmitButton() {
        const user = Auth.getUser();
        const submitBtn = document.getElementById('submitPaymentBtn');
        
        if (!submitBtn) return;
        
        if (user.role === 'operator_kabupaten') {
            // Operators need both file and amount
            const hasFile = this.paymentFile !== null;
            const hasAmount = document.getElementById('paymentAmount').value > 0;
            submitBtn.disabled = !(hasFile && hasAmount);
        } else {
            // Admins only need amount
            const hasAmount = document.getElementById('paymentAmount').value > 0;
            submitBtn.disabled = !hasAmount;
        }
    },
    
    // Search orders
    async searchOrders(query) {
        if (!query || query.trim().length < 3) {
            document.getElementById('searchResults').style.display = 'none';
            return;
        }
        
        try {
            Auth.showLoading();
            
            const filterStatus = document.getElementById('filterStatus').value;
            const url = `${Auth.CONFIG.API_URL}?method=searchOrders&query=${encodeURIComponent(query)}&filterBy=all`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Gagal mencari pesanan');
            }
            
            // Filter by status if specified
            this.searchResults = data.results;
            if (filterStatus && filterStatus !== 'all') {
                this.searchResults = this.searchResults.filter(order => 
                    order.status === filterStatus
                );
            }
            
            // Display results
            this.displaySearchResults();
            
        } catch (error) {
            console.error('Error searching orders:', error);
            Auth.showError('Gagal mencari pesanan: ' + error.message);
        } finally {
            Auth.hideLoading();
        }
    },
    
    // Display search results
    displaySearchResults() {
        const container = document.getElementById('searchResults');
        
        if (!container) return;
        
        if (this.searchResults.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted p-4">
                    <i class="fas fa-search fa-2x mb-3"></i>
                    <p>Tidak ditemukan pesanan yang sesuai</p>
                </div>
            `;
            container.style.display = 'block';
            return;
        }
        
        let html = '';
        this.searchResults.forEach(order => {
            const statusClass = this.getStatusClass(order.status);
            
            html += `
                <div class="order-item list-group-item list-group-item-action" 
                     data-order-id="${order.idPesanan}"
                     style="cursor: pointer;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1 text-primary">${order.sekolah}</h6>
                            <small class="text-muted">
                                <i class="fas fa-hashtag me-1"></i>${order.idPesanan}
                            </small>
                        </div>
                        <div class="text-end">
                            <span class="badge ${statusClass} mb-1">${order.status}</span>
                            <div class="fw-bold">${Auth.formatCurrency(order.total)}</div>
                        </div>
                    </div>
                    <div class="mt-2 small text-muted">
                        <span><i class="fas fa-map-marker-alt me-1"></i> ${order.kabupaten}</span>
                        <span class="ms-3"><i class="fas fa-calendar me-1"></i> ${Auth.formatDate(order.tanggal)}</span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        container.style.display = 'block';
        
        // Add click events
        container.querySelectorAll('.order-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectOrder(item.dataset.orderId);
            });
        });
    },
    
    // Select order
    selectOrder(orderId) {
        const order = this.searchResults.find(o => o.idPesanan === orderId);
        if (!order) return;
        
        this.selectedOrder = order;
        
        // Update UI
        this.updateSelectedOrderUI();
        
        // Hide search results
        document.getElementById('searchResults').style.display = 'none';
        
        // Show selected order section
        document.getElementById('selectedOrderSection').style.display = 'block';
        
        // Calculate initial payment
        this.calculatePayment();
        
        // Setup quick amount buttons
        this.setupQuickAmountButtons();
    },
    
    // Update selected order UI
    updateSelectedOrderUI() {
        if (!this.selectedOrder) return;
        
        document.getElementById('orderId').textContent = this.selectedOrder.idPesanan;
        document.getElementById('orderDate').textContent = Auth.formatDate(this.selectedOrder.tanggal);
        document.getElementById('orderSchool').textContent = this.selectedOrder.sekolah;
        document.getElementById('orderKabupaten').textContent = this.selectedOrder.kabupaten;
        document.getElementById('orderTotal').textContent = Auth.formatCurrency(this.selectedOrder.total);
        
        // Update status badge
        const statusBadge = document.getElementById('orderStatus');
        statusBadge.textContent = this.selectedOrder.status;
        statusBadge.className = `badge ${this.getStatusClass(this.selectedOrder.status)}`;
        
        // Set payment amount to remaining if unpaid
        if (this.selectedOrder.status === 'Belum Lunas') {
            document.getElementById('paymentAmount').value = this.selectedOrder.total;
        } else {
            document.getElementById('paymentAmount').value = 0;
        }
        
        // Update submit button
        this.updateSubmitButton();
    },
    
    // Get status class
    getStatusClass(status) {
        switch(status) {
            case 'Lunas': return 'bg-success';
            case 'Kelebihan': return 'bg-warning text-dark';
            case 'Belum Lunas': return 'bg-danger';
            case 'Menunggu Validasi': return 'bg-secondary';
            default: return 'bg-info';
        }
    },
    
    // Calculate payment
    calculatePayment() {
        if (!this.selectedOrder) return;
        
        const paymentAmount = parseFloat(document.getElementById('paymentAmount').value) || 0;
        const totalTagihan = this.selectedOrder.total;
        const remaining = paymentAmount - totalTagihan;
        
        // Calculate shares (only for verified payments)
        const schoolShare = totalTagihan * 0.07;
        const regionShare = totalTagihan * 0.065;
        
        // Determine status based on user role
        const user = Auth.getUser();
        let status = 'Belum Lunas';
        
        if (user.role === 'operator_kabupaten') {
            status = 'Menunggu Validasi';
        } else if (Math.abs(remaining) < 1000) {
            status = 'Lunas';
        } else if (remaining > 0) {
            status = 'Kelebihan';
        }
        
        // Update UI
        document.getElementById('calcTotal').textContent = Auth.formatCurrency(totalTagihan);
        document.getElementById('calcPaid').textContent = Auth.formatCurrency(paymentAmount);
        document.getElementById('calcRemaining').textContent = Auth.formatCurrency(remaining);
        document.getElementById('calcSchoolShare').textContent = Auth.formatCurrency(schoolShare);
        document.getElementById('calcRegionShare').textContent = Auth.formatCurrency(regionShare);
        
        // Update status badge
        const statusElement = document.getElementById('calcStatus');
        statusElement.textContent = status;
        statusElement.className = `badge ${this.getStatusClass(status)}`;
        
        // Update remaining color
        const remainingElement = document.getElementById('calcRemaining');
        if (remaining > 0) {
            remainingElement.className = 'text-success fw-bold';
        } else if (remaining < 0) {
            remainingElement.className = 'text-danger fw-bold';
        } else {
            remainingElement.className = 'text-success fw-bold';
        }
        
        // Update submit button
        this.updateSubmitButton();
    },
    
    // Submit payment
    async submitPayment() {
        if (!this.selectedOrder) {
            Auth.showError('Pilih pesanan terlebih dahulu');
            return;
        }
        
        // Validate form
        const paymentAmount = parseFloat(document.getElementById('paymentAmount').value);
        const paymentDate = document.getElementById('paymentDate').value;
        
        if (!paymentAmount || paymentAmount <= 0) {
            Auth.showError('Jumlah pembayaran harus lebih dari 0');
            return;
        }
        
        if (!paymentDate) {
            Auth.showError('Tanggal pembayaran harus diisi');
            return;
        }
        
        const user = Auth.getUser();
        const confirmMessage = user.role === 'operator_kabupaten' 
            ? `Upload pembayaran sebesar ${Auth.formatCurrency(paymentAmount)} dengan bukti transfer?`
            : `Simpan pembayaran sebesar ${Auth.formatCurrency(paymentAmount)} untuk pesanan ${this.selectedOrder.idPesanan}?`;
        
        Auth.confirmDialog(
            'Konfirmasi Pembayaran',
            confirmMessage,
            async () => {
                try {
                    Auth.showLoading();
                    
                    if (user.role === 'operator_kabupaten') {
                        // Upload with proof
                        await this.uploadPaymentWithProof(paymentAmount, paymentDate);
                    } else {
                        // Admin can directly process payment
                        await this.processPaymentAsAdmin(paymentAmount, paymentDate);
                    }
                    
                } catch (error) {
                    console.error('Error submitting payment:', error);
                    Auth.showError('Gagal menyimpan pembayaran: ' + error.message);
                } finally {
                    Auth.hideLoading();
                }
            }
        );
    },
    
    // Upload payment with proof (for operators)
    async uploadPaymentWithProof(paymentAmount, paymentDate) {
        try {
            // Validate file
            if (!this.paymentFile) {
                throw new Error('Harap upload bukti transfer terlebih dahulu');
            }
            
            // Prepare payment data
            const paymentData = {
                idPesanan: this.selectedOrder.idPesanan,
                jumlahBayar: paymentAmount,
                tanggalBayar: paymentDate,
                sekolah: this.selectedOrder.sekolah,
                totalTagihan: this.selectedOrder.total,
                buktiTransfer: this.getFileDataURL(), // Convert file to base64
                metodeBayar: document.getElementById('paymentMethod').value,
                keterangan: document.getElementById('paymentNote').value || ''
            };
            
            // Send to API
            const response = await fetch(Auth.CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    method: 'uploadPaymentWithProof',
                    ...paymentData
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Gagal mengupload pembayaran');
            }
            
            // Show success message
            Auth.showSuccess(`
                <h5><i class="fas fa-check-circle text-success me-2"></i>Pembayaran Berhasil Diupload!</h5>
                <p>Pembayaran Anda telah berhasil dikirim dan menunggu validasi admin.</p>
                <div class="alert alert-info mt-3">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Status:</strong> ${data.status}<br>
                    <strong>ID Transaksi:</strong> ${this.selectedOrder.idPesanan}<br>
                    <strong>Jumlah:</strong> ${Auth.formatCurrency(paymentAmount)}<br>
                    <strong>Estimasi Validasi:</strong> 1-2 hari kerja
                </div>
            `, () => {
                this.resetForm();
                this.loadRecentPayments();
            });
            
        } catch (error) {
            throw error;
        }
    },
    
    // Process payment as admin (direct validation)
    async processPaymentAsAdmin(paymentAmount, paymentDate) {
        try {
            const paymentData = {
                idPesanan: this.selectedOrder.idPesanan,
                jumlahBayar: paymentAmount,
                tanggalBayar: paymentDate,
                metodeBayar: document.getElementById('paymentMethod').value,
                keterangan: document.getElementById('paymentNote').value || ''
            };
            
            const response = await fetch(Auth.CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    method: 'inputPembayaran',
                    ...paymentData
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Gagal menyimpan pembayaran');
            }
            
            // Show success with nota number
            Auth.showSuccess(`
                <h5><i class="fas fa-check-circle text-success me-2"></i>Pembayaran Berhasil!</h5>
                <div class="alert alert-success mt-3">
                    <strong><i class="fas fa-receipt me-2"></i>Nota:</strong> ${data.notaNo}<br>
                    <strong>Total Tagihan:</strong> ${Auth.formatCurrency(data.totalTagihan)}<br>
                    <strong>Jumlah Bayar:</strong> ${Auth.formatCurrency(paymentAmount)}<br>
                    <strong>Status:</strong> ${data.status}<br>
                    <strong>Bagi Hasil Sekolah:</strong> ${Auth.formatCurrency(data.bagiHasilSekolah)}<br>
                    <strong>Bagi Hasil Daerah:</strong> ${Auth.formatCurrency(data.bagiHasilDaerah)}
                </div>
                <p class="text-muted">Anda dapat mencetak nota melalui menu Laporan.</p>
            `, () => {
                this.resetForm();
                this.loadRecentPayments();
            });
            
        } catch (error) {
            throw error;
        }
    },
    
    // Get file as base64 data URL
    getFileDataURL() {
        return new Promise((resolve) => {
            if (!this.paymentFile) {
                resolve('');
                return;
            }
            
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve(reader.result);
            };
            reader.readAsDataURL(this.paymentFile);
        });
    },
    
    // Load recent payments
    async loadRecentPayments() {
        try {
            const container = document.getElementById('recentPayments');
            if (!container) return;
            
            // Show loading
            container.innerHTML = `
                <div class="text-center p-4">
                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="text-muted mt-2">Memuat riwayat pembayaran...</p>
                </div>
            `;
            
            // Fetch from API (you need to create this endpoint)
            // const response = await fetch(`${Auth.CONFIG.API_URL}?method=getRecentPayments`);
            // const data = await response.json();
            
            // For now, show empty state
            setTimeout(() => {
                container.innerHTML = `
                    <div class="text-center text-muted p-4">
                        <i class="fas fa-history fa-2x mb-3"></i>
                        <p>Belum ada riwayat pembayaran</p>
                        <small>Riwayat pembayaran akan muncul di sini setelah Anda melakukan transaksi</small>
                    </div>
                `;
            }, 500);
            
        } catch (error) {
            console.error('Error loading recent payments:', error);
            const container = document.getElementById('recentPayments');
            if (container) {
                container.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Gagal memuat riwayat pembayaran
                    </div>
                `;
            }
        }
    },
    
    // Reset form
    resetForm() {
        this.selectedOrder = null;
        this.searchResults = [];
        this.paymentFile = null;
        this.filePreview = null;
        
        // Reset form fields
        document.getElementById('searchOrder').value = '';
        document.getElementById('paymentAmount').value = '';
        document.getElementById('paymentNote').value = '';
        document.getElementById('paymentDate').valueAsDate = new Date();
        document.getElementById('fileName').value = '';
        
        // Hide sections
        document.getElementById('searchResults').style.display = 'none';
        document.getElementById('selectedOrderSection').style.display = 'none';
        document.getElementById('filePreview').style.display = 'none';
        
        // Clear calculations
        this.clearCalculations();
        
        // Clear file input
        const fileInput = document.getElementById('paymentProofInput');
        if (fileInput) fileInput.value = '';
        
        // Update submit button
        this.updateSubmitButton();
        
        Auth.showSuccess('Form telah direset');
    },
    
    // Clear calculations
    clearCalculations() {
        document.getElementById('calcTotal').textContent = 'Rp 0';
        document.getElementById('calcPaid').textContent = 'Rp 0';
        document.getElementById('calcRemaining').textContent = 'Rp 0';
        document.getElementById('calcSchoolShare').textContent = 'Rp 0';
        document.getElementById('calcRegionShare').textContent = 'Rp 0';
        document.getElementById('calcStatus').textContent = 'Belum Lunas';
        document.getElementById('calcStatus').className = 'badge bg-danger';
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Set payment amount from quick buttons
function setPaymentAmount(amount) {
    const input = document.getElementById('paymentAmount');
    if (input && amount > 0) {
        input.value = amount;
        input.dispatchEvent(new Event('input'));
    }
}

// Global reset function
function resetPaymentForm() {
    InputPembayaran.resetForm();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    if (!Auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Check if this is payment page
    if (document.getElementById('searchOrder')) {
        InputPembayaran.init();
    }
});

// Export untuk global access
window.InputPembayaran = InputPembayaran;
window.setPaymentAmount = setPaymentAmount;
window.resetPaymentForm = resetPaymentForm;