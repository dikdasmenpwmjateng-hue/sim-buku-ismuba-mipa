// ============================================
// VALIDASI PEMBAYARAN MODULE
// ============================================

const ValidasiPembayaran = {
    // State
    currentStatus: 'pending',
    payments: [],
    filteredPayments: [],
    currentPayment: null,
    
    // Initialize
    async init() {
        try {
            Auth.showLoading();
            
            // Check user role
            this.checkUserRole();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load kabupaten filter
            await this.loadKabupatenFilter();
            
            // Load payments
            await this.loadPayments();
            
        } catch (error) {
            console.error('Error initializing:', error);
            Auth.showError('Gagal memuat data: ' + error.message);
        } finally {
            Auth.hideLoading();
        }
    },
    
    // Check user role
    checkUserRole() {
        const user = Auth.getUser();
        const roleInfo = document.getElementById('roleInfo');
        const roleMessage = document.getElementById('roleMessage');
        
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        if (user.role !== 'admin') {
            roleInfo.style.display = 'block';
            roleMessage.textContent = 'Hanya admin yang dapat mengakses halaman validasi pembayaran';
            
            // Disable action buttons
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.disabled = true;
            });
            
            document.getElementById('searchValidation').disabled = true;
            document.getElementById('filterKabupaten').disabled = true;
            document.getElementById('filterDate').disabled = true;
            
        } else {
            roleInfo.style.display = 'none';
        }
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Search input
        document.getElementById('searchValidation').addEventListener('input', (e) => {
            this.filterPayments();
        });
        
        // Kabupaten filter
        document.getElementById('filterKabupaten').addEventListener('change', () => {
            this.filterPayments();
        });
        
        // Date filter
        document.getElementById('filterDate').addEventListener('change', () => {
            this.filterPayments();
        });
        
        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            Auth.confirmDialog(
                'Konfirmasi Logout',
                'Apakah Anda yakin ingin logout?',
                () => Auth.logout()
            );
        });
    },
    
    // Load kabupaten filter
    async loadKabupatenFilter() {
        try {
            const response = await fetch(`${Auth.CONFIG.API_URL}?method=getMasterData`);
            const data = await response.json();
            
            if (data.success) {
                const select = document.getElementById('filterKabupaten');
                data.kabupatenList.forEach(kab => {
                    const option = document.createElement('option');
                    option.value = kab;
                    option.textContent = kab;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading kabupaten filter:', error);
        }
    },
    
    // Load payments
    async loadPayments() {
        try {
            const user = Auth.getUser();
            
            // Only admin can load validation data
            if (user.role !== 'admin') {
                this.showNoAccess();
                return;
            }
            
            const response = await fetch(
                `${Auth.CONFIG.API_URL}?method=getPaymentsForValidation&status=${this.currentStatus}`
            );
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Gagal memuat data pembayaran');
            }
            
            this.payments = data.data || [];
            this.filteredPayments = [...this.payments];
            
            this.displayPayments();
            this.updateCounters();
            
        } catch (error) {
            console.error('Error loading payments:', error);
            this.showError(error.message);
        }
    },
    
    // Filter payments
    filterPayments() {
        const searchTerm = document.getElementById('searchValidation').value.toLowerCase();
        const kabupaten = document.getElementById('filterKabupaten').value;
        const filterDate = document.getElementById('filterDate').value;
        
        this.filteredPayments = this.payments.filter(payment => {
            // Search term filter
            if (searchTerm) {
                const searchIn = [
                    payment.idPesanan,
                    payment.sekolah,
                    payment.kabupaten,
                    payment.notaNo
                ].join(' ').toLowerCase();
                
                if (!searchIn.includes(searchTerm)) {
                    return false;
                }
            }
            
            // Kabupaten filter
            if (kabupaten && payment.kabupaten !== kabupaten) {
                return false;
            }
            
            // Date filter
            if (filterDate) {
                const paymentDate = new Date(payment.tanggalBayar).toISOString().split('T')[0];
                if (paymentDate !== filterDate) {
                    return false;
                }
            }
            
            return true;
        });
        
        this.displayPayments();
    },
    
    // Display payments
    displayPayments() {
        const container = document.getElementById('paymentList');
        
        if (this.filteredPayments.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted my-5">
                    <i class="fas fa-inbox fa-2x mb-3"></i>
                    <h5>Tidak ada data pembayaran</h5>
                    <p>Tidak ditemukan data pembayaran dengan status "${this.getStatusText(this.currentStatus)}"</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        this.filteredPayments.forEach(payment => {
            const statusClass = this.getStatusClass(payment.statusValidasi);
            const statusText = payment.statusValidasi;
            const tanggal = Auth.formatDate(payment.tanggalBayar);
            
            html += `
                <div class="validation-card ${statusClass}" onclick="ValidasiPembayaran.showPaymentDetail('${payment.idPesanan}')">
                    <div class="row">
                        <div class="col-md-8">
                            <h6 class="mb-1">${payment.sekolah}</h6>
                            <div class="d-flex flex-wrap gap-3 mb-2">
                                <small><i class="fas fa-barcode"></i> ${payment.idPesanan}</small>
                                <small><i class="fas fa-city"></i> ${payment.kabupaten}</small>
                                <small><i class="fas fa-calendar"></i> ${tanggal}</small>
                            </div>
                            <div class="d-flex gap-3">
                                <span class="badge bg-primary">Tagihan: ${Auth.formatCurrency(payment.totalTagihan)}</span>
                                <span class="badge bg-success">Bayar: ${Auth.formatCurrency(payment.jumlahBayar)}</span>
                                <span class="badge ${payment.sisaKelebihan >= 0 ? 'bg-info' : 'bg-warning'}">
                                    ${payment.sisaKelebihan >= 0 ? 'Kelebihan' : 'Kurang'}: ${Auth.formatCurrency(Math.abs(payment.sisaKelebihan))}
                                </span>
                            </div>
                        </div>
                        <div class="col-md-4 text-end">
                            <div class="status-badge ${this.getStatusBadgeClass(payment.statusValidasi)}">
                                ${statusText}
                            </div>
                            <div class="mt-2">
                                <small class="text-muted">
                                    <i class="fas fa-user"></i> ${payment.userInput}
                                </small>
                            </div>
                            ${payment.validator ? `
                                <div class="mt-1">
                                    <small class="text-muted">
                                        <i class="fas fa-user-check"></i> ${payment.validator}
                                    </small>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    ${payment.catatanAdmin ? `
                        <div class="mt-3 validation-notes">
                            <small><i class="fas fa-sticky-note"></i> <strong>Catatan Admin:</strong> ${payment.catatanAdmin}</small>
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        container.innerHTML = html;
    },
    
    // Show payment detail
    async showPaymentDetail(idPesanan) {
        try {
            Auth.showLoading();
            
            const response = await fetch(`${Auth.CONFIG.API_URL}?method=getPaymentDetail&idPesanan=${encodeURIComponent(idPesanan)}`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Gagal memuat detail pembayaran');
            }
            
            this.currentPayment = data;
            this.displayPaymentDetail();
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('validationModal'));
            modal.show();
            
        } catch (error) {
            console.error('Error showing payment detail:', error);
            Auth.showError('Gagal memuat detail: ' + error.message);
        } finally {
            Auth.hideLoading();
        }
    },
    
    // Display payment detail in modal
    displayPaymentDetail() {
        if (!this.currentPayment) return;
        
        const { payment, order } = this.currentPayment;
        const container = document.getElementById('validationDetail');
        
        // Hide/show action buttons based on status
        const btnVerify = document.getElementById('btnVerify');
        const btnReject = document.getElementById('btnReject');
        
        if (payment.statusValidasi === 'Tervalidasi' || payment.statusValidasi === 'Ditolak') {
            btnVerify.style.display = 'none';
            btnReject.style.display = 'none';
        } else {
            btnVerify.style.display = 'inline-block';
            btnReject.style.display = 'inline-block';
        }
        
        const html = `
            <div class="row">
                <div class="col-md-6">
                    <h6><i class="fas fa-info-circle"></i> Informasi Pembayaran</h6>
                    <div class="payment-details">
                        <div class="detail-row">
                            <span>ID Pesanan:</span>
                            <span><strong>${payment.idPesanan}</strong></span>
                        </div>
                        <div class="detail-row">
                            <span>Tanggal Bayar:</span>
                            <span>${Auth.formatDate(payment.tanggalBayar)}</span>
                        </div>
                        <div class="detail-row">
                            <span>Sekolah:</span>
                            <span>${payment.sekolah}</span>
                        </div>
                        <div class="detail-row">
                            <span>Kabupaten:</span>
                            <span>${payment.kabupaten}</span>
                        </div>
                        <div class="detail-row">
                            <span>Input oleh:</span>
                            <span>${payment.userInput}</span>
                        </div>
                        <div class="detail-row">
                            <span>Status Validasi:</span>
                            <span class="status-badge ${this.getStatusBadgeClass(payment.statusValidasi)}">
                                ${payment.statusValidasi}
                            </span>
                        </div>
                        ${payment.validator ? `
                            <div class="detail-row">
                                <span>Validasi oleh:</span>
                                <span>${payment.validator}</span>
                            </div>
                        ` : ''}
                        ${payment.tanggalValidasi ? `
                            <div class="detail-row">
                                <span>Tanggal Validasi:</span>
                                <span>${Auth.formatDate(payment.tanggalValidasi)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="col-md-6">
                    <h6><i class="fas fa-money-bill-wave"></i> Detail Nominal</h6>
                    <div class="payment-details">
                        <div class="detail-row">
                            <span>Total Tagihan:</span>
                            <span class="text-end">${Auth.formatCurrency(payment.totalTagihan)}</span>
                        </div>
                        <div class="detail-row">
                            <span>Jumlah Bayar:</span>
                            <span class="text-end">${Auth.formatCurrency(payment.jumlahBayar)}</span>
                        </div>
                        <div class="detail-row">
                            <span>Sisa/Kelebihan:</span>
                            <span class="text-end ${payment.sisaKelebihan >= 0 ? 'text-success' : 'text-danger'}">
                                ${Auth.formatCurrency(payment.sisaKelebihan)}
                            </span>
                        </div>
                        ${payment.statusValidasi === 'Tervalidasi' ? `
                            <div class="detail-row">
                                <span>Bagi Hasil Sekolah (7%):</span>
                                <span class="text-end text-info">${Auth.formatCurrency(payment.bagiHasilSekolah)}</span>
                            </div>
                            <div class="detail-row">
                                <span>Bagi Hasil Daerah (6.5%):</span>
                                <span class="text-end text-info">${Auth.formatCurrency(payment.bagiHasilDaerah)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <div class="row mt-4">
                <div class="col-md-12">
                    <h6><i class="fas fa-file-invoice"></i> Bukti Transfer</h6>
                    <div class="bukti-transfer" onclick="ValidasiPembayaran.viewProof('${payment.buktiTransfer}')">
                        ${payment.buktiTransfer ? `
                            <img src="${payment.buktiTransfer}" alt="Bukti Transfer" 
                                 style="max-width: 100%; max-height: 300px;">
                            <div class="mt-2">
                                <small class="text-muted">Klik untuk memperbesar</small>
                            </div>
                        ` : `
                            <div class="text-muted">
                                <i class="fas fa-file-image fa-3x mb-3"></i>
                                <p>Tidak ada bukti transfer</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
            
            ${order ? `
                <div class="row mt-4">
                    <div class="col-md-12">
                        <h6><i class="fas fa-shopping-cart"></i> Detail Pesanan</h6>
                        <div class="table-responsive">
                            <table class="table table-sm table-bordered">
                                <thead>
                                    <tr>
                                        <th>Tanggal Pesan</th>
                                        <th>Jenjang</th>
                                        <th>Jenis Buku</th>
                                        <th>Judul Buku</th>
                                        <th>Kelas</th>
                                        <th>Jumlah</th>
                                        <th>Harga</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>${Auth.formatDate(order.tanggalPesan)}</td>
                                        <td>${order.jenjang}</td>
                                        <td>${order.jenisBuku}</td>
                                        <td>${order.judulBuku}</td>
                                        <td>${order.kelas}</td>
                                        <td class="text-end">${order.jumlah}</td>
                                        <td class="text-end">${Auth.formatCurrency(order.hargaSatuan)}</td>
                                        <td class="text-end">${Auth.formatCurrency(order.total)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <div class="row mt-4">
                <div class="col-md-12">
                    <h6><i class="fas fa-sticky-note"></i> Catatan Validasi</h6>
                    <div class="mb-3">
                        <textarea class="form-control" id="validationNotes" rows="3" 
                                  placeholder="Tambahkan catatan untuk validasi ini...">${payment.catatanAdmin || ''}</textarea>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    },
    
    // View proof in full screen
    viewProof(imageUrl) {
        if (!imageUrl) return;
        
        Swal.fire({
            imageUrl: imageUrl,
            imageAlt: 'Bukti Transfer',
            showCloseButton: true,
            showConfirmButton: false,
            width: '80%',
            padding: '0'
        });
    },
    
    // Verify payment
    async verifyPayment() {
        if (!this.currentPayment) return;
        
        const notes = document.getElementById('validationNotes').value;
        
        Auth.confirmDialog(
            'Validasi Pembayaran',
            'Apakah Anda yakin ingin memvalidasi pembayaran ini?<br><br>' +
            'Setelah divalidasi, sistem akan:<br>' +
            '1. Menghitung bagi hasil otomatis<br>' +
            '2. Generate nota pembayaran<br>' +
            '3. Mengubah status pemesanan menjadi "Lunas"',
            async () => {
                try {
                    Auth.showLoading();
                    
                    const response = await fetch(Auth.CONFIG.API_URL, {
                        method: 'POST',
                        body: JSON.stringify({
                            method: 'validatePayment',
                            idPesanan: this.currentPayment.payment.idPesanan,
                            status: 'Tervalidasi',
                            catatan: notes
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (!data.success) {
                        throw new Error(data.error || 'Gagal memvalidasi pembayaran');
                    }
                    
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('validationModal'));
                    modal.hide();
                    
                    // Show success message
                    let successMessage = 'Pembayaran berhasil divalidasi!';
                    if (data.notaNo) {
                        successMessage += `<br>Nota: <strong>${data.notaNo}</strong>`;
                    }
                    
                    Auth.showSuccess(successMessage, () => {
                        // Refresh data
                        this.loadPayments();
                    });
                    
                } catch (error) {
                    console.error('Error verifying payment:', error);
                    Auth.showError('Gagal memvalidasi: ' + error.message);
                } finally {
                    Auth.hideLoading();
                }
            }
        );
    },
    
    // Reject payment
    async rejectPayment() {
        if (!this.currentPayment) return;
        
        const notes = document.getElementById('validationNotes').value;
        
        if (!notes.trim()) {
            Auth.showError('Harap berikan alasan penolakan');
            return;
        }
        
        Auth.confirmDialog(
            'Tolak Pembayaran',
            'Apakah Anda yakin ingin menolak pembayaran ini?<br><br>' +
            'Pembayaran yang ditolak akan tetap tercatat dalam sistem.',
            async () => {
                try {
                    Auth.showLoading();
                    
                    const response = await fetch(Auth.CONFIG.API_URL, {
                        method: 'POST',
                        body: JSON.stringify({
                            method: 'validatePayment',
                            idPesanan: this.currentPayment.payment.idPesanan,
                            status: 'Ditolak',
                            catatan: notes
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (!data.success) {
                        throw new Error(data.error || 'Gagal menolak pembayaran');
                    }
                    
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('validationModal'));
                    modal.hide();
                    
                    Auth.showSuccess('Pembayaran berhasil ditolak', () => {
                        // Refresh data
                        this.loadPayments();
                    });
                    
                } catch (error) {
                    console.error('Error rejecting payment:', error);
                    Auth.showError('Gagal menolak: ' + error.message);
                } finally {
                    Auth.hideLoading();
                }
            }
        );
    },
    
    // Update counters
    updateCounters() {
        const pending = this.payments.filter(p => p.statusValidasi === 'Menunggu Validasi').length;
        const verified = this.payments.filter(p => p.statusValidasi === 'Tervalidasi').length;
        const rejected = this.payments.filter(p => p.statusValidasi === 'Ditolak').length;
        const all = this.payments.length;
        
        document.getElementById('countPending').textContent = pending;
        document.getElementById('countVerified').textContent = verified;
        document.getElementById('countRejected').textContent = rejected;
        document.getElementById('countAll').textContent = all;
    },
    
    // Get status class
    getStatusClass(status) {
        switch(status) {
            case 'Tervalidasi': return 'verified';
            case 'Ditolak': return 'rejected';
            default: return 'pending';
        }
    },
    
    // Get status badge class
    getStatusBadgeClass(status) {
        switch(status) {
            case 'Tervalidasi': return 'status-verified';
            case 'Ditolak': return 'status-rejected';
            default: return 'status-pending';
        }
    },
    
    // Get status text
    getStatusText(statusKey) {
        switch(statusKey) {
            case 'pending': return 'Menunggu Validasi';
            case 'verified': return 'Tervalidasi';
            case 'rejected': return 'Ditolak';
            default: return 'Semua';
        }
    },
    
    // Filter by status
    filterPayments(status) {
        this.currentStatus = status;
        
        // Update active tab
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.status === status) {
                btn.classList.add('active');
            }
        });
        
        // Load payments with new filter
        this.loadPayments();
    },
    
    // Show no access message
    showNoAccess() {
        const container = document.getElementById('paymentList');
        container.innerHTML = `
            <div class="text-center text-muted my-5">
                <i class="fas fa-lock fa-2x mb-3"></i>
                <h5>Akses Ditolak</h5>
                <p>Hanya admin yang dapat mengakses halaman validasi pembayaran</p>
                <a href="index.html" class="btn btn-primary mt-3">
                    <i class="fas fa-arrow-left"></i> Kembali ke Dashboard
                </a>
            </div>
        `;
    },
    
    // Show error message
    showError(message) {
        const container = document.getElementById('paymentList');
        container.innerHTML = `
            <div class="text-center text-danger my-5">
                <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                <h5>Terjadi Kesalahan</h5>
                <p>${message}</p>
                <button class="btn btn-warning mt-3" onclick="ValidasiPembayaran.loadPayments()">
                    <i class="fas fa-redo"></i> Coba Lagi
                </button>
            </div>
        `;
    },
    
    // Refresh validation list
    refreshValidationList() {
        this.loadPayments();
        Auth.showSuccess('Data berhasil direfresh');
    }
};

// Global functions
function filterPayments(status) {
    ValidasiPembayaran.filterPayments(status);
}

function refreshValidationList() {
    ValidasiPembayaran.refreshValidationList();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('paymentList')) {
        ValidasiPembayaran.init();
    }
});

// Export untuk global access
window.ValidasiPembayaran = ValidasiPembayaran;