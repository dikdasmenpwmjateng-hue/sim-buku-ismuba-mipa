// ============================================
// NOTA PEMBAYARAN MODULE
// ============================================

const NotaPembayaran = {
    // State
    currentNota: null,
    recentNotas: [],
    
    // Initialize
    async init() {
        try {
            Auth.showLoading();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load recent notas
            await this.loadRecentNotas();
            
            // Check for nota number in URL
            this.checkUrlParams();
            
        } catch (error) {
            console.error('Error initializing:', error);
            Auth.showError('Gagal memuat data: ' + error.message);
        } finally {
            Auth.hideLoading();
        }
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Enter key in search input
        document.getElementById('searchNota').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchNota();
            }
        });
        
        document.getElementById('searchOrderId').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchByOrderId();
            }
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
    
    // Check URL parameters for nota number
    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const notaNo = urlParams.get('nota');
        
        if (notaNo) {
            document.getElementById('searchNota').value = notaNo;
            this.searchNota(notaNo);
        }
    },
    
    // Search nota by number
    async searchNota(notaNo = null) {
        const searchValue = notaNo || document.getElementById('searchNota').value.trim();
        
        if (!searchValue) {
            Auth.showError('Masukkan nomor nota terlebih dahulu');
            return;
        }
        
        try {
            Auth.showLoading();
            
            const response = await fetch(`${Auth.CONFIG.API_URL}?method=generateNota&notaNo=${encodeURIComponent(searchValue)}`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Nota tidak ditemukan');
            }
            
            this.currentNota = data.data;
            this.displayNota();
            
            // Add to URL without reloading page
            const url = new URL(window.location);
            url.searchParams.set('nota', searchValue);
            window.history.pushState({}, '', url);
            
        } catch (error) {
            console.error('Error searching nota:', error);
            this.showNotFound();
            Auth.showError('Nota tidak ditemukan: ' + error.message);
        } finally {
            Auth.hideLoading();
        }
    },
    
    // Search by order ID
    async searchByOrderId() {
        const orderId = document.getElementById('searchOrderId').value.trim();
        
        if (!orderId) {
            Auth.showError('Masukkan ID Pesanan terlebih dahulu');
            return;
        }
        
        try {
            Auth.showLoading();
            
            // First, search for orders with this ID
            const searchResponse = await fetch(`${Auth.CONFIG.API_URL}?method=searchOrders&query=${encodeURIComponent(orderId)}&filterBy=id`);
            const searchData = await searchResponse.json();
            
            if (!searchData.success || searchData.results.length === 0) {
                throw new Error('ID Pesanan tidak ditemukan');
            }
            
            // Get payment data for this order
            // Note: This would require a new API method
            // For now, we'll search recent notas
            const recentResponse = await fetch(`${Auth.CONFIG.API_URL}?method=getDataForCetak`);
            const recentData = await recentResponse.json();
            
            if (recentData.success) {
                // Find order in recent data
                const order = recentData.data.find(item => item.idPesanan === orderId);
                if (order) {
                    // Try to find nota for this order
                    // This is a simplified approach - in real implementation,
                    // you would need an API method to get nota by order ID
                    Auth.showInfo('Fitur pencarian nota berdasarkan ID Pesanan akan segera tersedia');
                    document.getElementById('searchOrderId').value = '';
                }
            }
            
        } catch (error) {
            console.error('Error searching by order ID:', error);
            Auth.showError('Gagal mencari: ' + error.message);
        } finally {
            Auth.hideLoading();
        }
    },
    
    // Display nota
    displayNota() {
        if (!this.currentNota) return;
        
        // Format currency values
        const totalTagihan = parseFloat(this.currentNota.totalTagihan) || 0;
        const jumlahBayar = parseFloat(this.currentNota.jumlahBayar) || 0;
        const sisaKelebihan = parseFloat(this.currentNota.sisaKelebihan) || 0;
        const bagiHasilSekolah = parseFloat(this.currentNota.bagiHasilSekolah) || 0;
        const bagiHasilDaerah = parseFloat(this.currentNota.bagiHasilDaerah) || 0;
        const totalBagiHasil = bagiHasilSekolah + bagiHasilDaerah;
        
        // Update nota information
        document.getElementById('notaNumber').textContent = this.currentNota.notaNo;
        document.getElementById('notaDate').textContent = Auth.formatDate(this.currentNota.tanggal);
        document.getElementById('notaOrderId').textContent = this.currentNota.idPesanan;
        document.getElementById('notaKabupaten').textContent = this.currentNota.kabupaten || '-';
        document.getElementById('notaSekolah').textContent = this.currentNota.sekolah || '-';
        document.getElementById('notaUser').textContent = this.currentNota.userInput || '-';
        document.getElementById('notaPenyetor').textContent = this.currentNota.sekolah || '-';
        
        // Update amounts
        document.getElementById('notaTotalTagihan').textContent = Auth.formatCurrency(totalTagihan);
        document.getElementById('notaJumlahBayar').textContent = Auth.formatCurrency(jumlahBayar);
        document.getElementById('notaSisaKelebihan').textContent = Auth.formatCurrency(sisaKelebihan);
        document.getElementById('notaBagiHasilSekolah').textContent = Auth.formatCurrency(bagiHasilSekolah);
        document.getElementById('notaBagiHasilDaerah').textContent = Auth.formatCurrency(bagiHasilDaerah);
        document.getElementById('notaTotalBagiHasil').textContent = Auth.formatCurrency(totalBagiHasil);
        
        // Update status
        const status = this.currentNota.status || 'Belum Lunas';
        const statusBadge = document.getElementById('notaStatusBadge');
        statusBadge.textContent = status;
        statusBadge.className = 'status-badge ';
        
        switch(status) {
            case 'Lunas':
                statusBadge.className += 'status-lunas';
                break;
            case 'Kelebihan':
                statusBadge.className += 'status-kelebihan';
                break;
            default:
                statusBadge.className += 'status-belum';
        }
        
        // Update keterangan
        const keterangan = sisaKelebihan >= 0 ? 
            'Pembayaran sudah diterima dengan lengkap.' :
            'Masih terdapat kekurangan pembayaran.';
        
        document.getElementById('notaKeterangan').textContent = keterangan;
        
        // Show nota display
        document.getElementById('notaDisplay').style.display = 'block';
        document.getElementById('notaNotFound').style.display = 'none';
        
        // Scroll to nota
        document.getElementById('notaDisplay').scrollIntoView({ behavior: 'smooth' });
    },
    
    // Show not found message
    showNotFound() {
        document.getElementById('notaDisplay').style.display = 'none';
        document.getElementById('notaNotFound').style.display = 'block';
    },
    
    // Load recent notas
    async loadRecentNotas() {
        try {
            // Get recent payment data
            // Note: This would need a new API method for recent payments
            // For now, we'll simulate with existing data
            
            const response = await fetch(`${Auth.CONFIG.API_URL}?method=getDataForCetak&startDate=${this.getDateDaysAgo(7)}`);
            const data = await response.json();
            
            if (data.success && data.data.length > 0) {
                // Take last 10 orders as recent "notas"
                this.recentNotas = data.data.slice(-10).reverse();
                this.displayRecentNotas();
            }
            
        } catch (error) {
            console.error('Error loading recent notas:', error);
            this.displayRecentNotasError();
        }
    },
    
    // Display recent notas
    displayRecentNotas() {
        const container = document.getElementById('recentNotaList');
        
        if (this.recentNotas.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted my-4">
                    <i class="fas fa-info-circle fa-2x mb-3"></i>
                    <p>Belum ada nota terbaru</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        this.recentNotas.forEach((nota, index) => {
            const statusClass = this.getStatusClass(nota.status);
            
            html += `
                <div class="nota-item" onclick="NotaPembayaran.selectRecentNota(${index})">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${nota.sekolah || 'Sekolah'}</h6>
                            <small class="text-muted">${nota.idPesanan}</small>
                        </div>
                        <div class="text-end">
                            <div class="${statusClass} status-badge">${nota.status}</div>
                        </div>
                    </div>
                    <div class="mt-2">
                        <small><i class="fas fa-calendar"></i> ${Auth.formatDate(nota.tanggal)}</small>
                        <small class="ms-3"><i class="fas fa-money-bill"></i> ${Auth.formatCurrency(nota.total)}</small>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    },
    
    // Display error in recent notas
    displayRecentNotasError() {
        const container = document.getElementById('recentNotaList');
        container.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <p class="mb-0">Gagal memuat data nota terbaru</p>
            </div>
        `;
    },
    
    // Get date days ago
    getDateDaysAgo(days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.toISOString().split('T')[0];
    },
    
    // Get status class
    getStatusClass(status) {
        switch(status) {
            case 'Lunas': return 'status-lunas';
            case 'Kelebihan': return 'status-kelebihan';
            default: return 'status-belum';
        }
    },
    
    // Select recent nota
    selectRecentNota(index) {
        const nota = this.recentNotas[index];
        
        // Show loading
        Auth.showLoading();
        
        // Simulate searching for this nota
        // In real implementation, you would need the actual nota number
        setTimeout(() => {
            Auth.hideLoading();
            
            // Create a simulated nota based on order data
            this.currentNota = {
                notaNo: `NOTA-${new Date(nota.tanggal).getTime()}`,
                tanggal: nota.tanggal,
                idPesanan: nota.idPesanan,
                kabupaten: nota.kabupaten,
                sekolah: nota.sekolah,
                totalTagihan: nota.total,
                jumlahBayar: nota.total,
                sisaKelebihan: 0,
                status: nota.status,
                bagiHasilSekolah: nota.total * 0.07,
                bagiHasilDaerah: nota.total * 0.065,
                userInput: 'System'
            };
            
            this.displayNota();
            
            // Update search input
            document.getElementById('searchNota').value = this.currentNota.notaNo;
            
        }, 1000);
    },
    
    // Print nota
    printNota() {
        if (!this.currentNota) {
            Auth.showError('Tidak ada nota untuk dicetak');
            return;
        }
        
        // Show print dialog
        window.print();
    },
    
    // Download nota as PDF
    async downloadNotaPDF() {
        if (!this.currentNota) {
            Auth.showError('Tidak ada nota untuk didownload');
            return;
        }
        
        try {
            Auth.showLoading();
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Add watermark
            doc.setTextColor(200, 200, 200);
            doc.setFontSize(60);
            doc.text('NOTA', 105, 150, { angle: 45, align: 'center' });
            doc.setTextColor(0, 0, 0);
            
            // Header
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('NOTA PEMBAYARAN', 105, 20, { align: 'center' });
            
            doc.setFontSize(14);
            doc.setFont('helvetica', 'normal');
            doc.text('BUKU ISMUBA & MIPA', 105, 28, { align: 'center' });
            
            doc.setFontSize(10);
            doc.text('Sistem Informasi Manajemen Pemesanan Buku', 105, 34, { align: 'center' });
            
            // Line
            doc.setDrawColor(0);
            doc.setLineWidth(0.5);
            doc.line(20, 40, 190, 40);
            
            // Nota Info
            let y = 50;
            
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Informasi Nota:', 20, y);
            
            y += 8;
            doc.setFont('helvetica', 'normal');
            doc.text(`Nomor Nota: ${this.currentNota.notaNo}`, 20, y);
            y += 7;
            doc.text(`Tanggal: ${Auth.formatDate(this.currentNota.tanggal)}`, 20, y);
            y += 7;
            doc.text(`ID Pesanan: ${this.currentNota.idPesanan}`, 20, y);
            y += 7;
            doc.text(`Kabupaten/Kota: ${this.currentNota.kabupaten || '-'}`, 20, y);
            y += 7;
            doc.text(`Sekolah: ${this.currentNota.sekolah || '-'}`, 20, y);
            
            // Table header
            y += 15;
            doc.setFont('helvetica', 'bold');
            doc.text('Keterangan', 20, y);
            doc.text('Jumlah (Rp)', 150, y, { align: 'right' });
            
            // Table rows
            y += 8;
            doc.setFont('helvetica', 'normal');
            
            const rows = [
                ['Total Tagihan', this.currentNota.totalTagihan],
                ['Jumlah Pembayaran', this.currentNota.jumlahBayar],
                ['Sisa/Kelebihan', this.currentNota.sisaKelebihan],
                ['', ''],
                ['Bagi Hasil Sekolah (7%)', this.currentNota.bagiHasilSekolah],
                ['Bagi Hasil Daerah (6.5%)', this.currentNota.bagiHasilDaerah]
            ];
            
            rows.forEach(row => {
                if (row[0] === '') {
                    y += 3;
                } else {
                    doc.text(row[0], 20, y);
                    doc.text(Auth.formatCurrency(row[1]), 190, y, { align: 'right' });
                    y += 7;
                }
            });
            
            // Total
            y += 5;
            doc.setFont('helvetica', 'bold');
            const totalBagiHasil = parseFloat(this.currentNota.bagiHasilSekolah) + parseFloat(this.currentNota.bagiHasilDaerah);
            doc.text('Total Bagi Hasil:', 20, y);
            doc.text(Auth.formatCurrency(totalBagiHasil), 190, y, { align: 'right' });
            
            // Status
            y += 15;
            doc.setFontSize(12);
            doc.text(`Status: ${this.currentNota.status}`, 20, y);
            
            // Signatures
            y += 30;
            doc.setFontSize(10);
            doc.text('Penerima,', 50, y);
            doc.text('Penyetor,', 140, y);
            
            y += 20;
            doc.setLineWidth(0.5);
            doc.line(40, y, 90, y);
            doc.line(130, y, 180, y);
            
            y += 15;
            doc.setFont('helvetica', 'bold');
            doc.text('Bagian Keuangan', 40, y, { align: 'center' });
            doc.text(this.currentNota.sekolah || 'Sekolah', 130, y, { align: 'center' });
            
            y += 5;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text('Sistem Informasi Manajemen', 40, y, { align: 'center' });
            doc.text('Perwakilan Sekolah', 130, y, { align: 'center' });
            
            // Footer
            y += 25;
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text('Nota ini sah dan diterbitkan otomatis oleh Sistem Informasi Manajemen Pemesanan Buku', 105, y, { align: 'center' });
            y += 4;
            doc.text('Contact: 021-12345678 | Email: admin@sim-buku.sch.id', 105, y, { align: 'center' });
            
            // Save PDF
            const filename = `Nota_${this.currentNota.notaNo}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
            
            Auth.showSuccess('Nota berhasil didownload sebagai PDF');
            
        } catch (error) {
            console.error('Error downloading PDF:', error);
            Auth.showError('Gagal mendownload PDF: ' + error.message);
        } finally {
            Auth.hideLoading();
        }
    },
    
    // Share nota
    shareNota() {
        if (!this.currentNota) {
            Auth.showError('Tidak ada nota untuk dibagikan');
            return;
        }
        
        // Create share text
        const shareText = `Nota Pembayaran Buku ISMUBA & MIPA\n\n` +
                         `Nomor: ${this.currentNota.notaNo}\n` +
                         `Tanggal: ${Auth.formatDate(this.currentNota.tanggal)}\n` +
                         `Sekolah: ${this.currentNota.sekolah}\n` +
                         `Total: ${Auth.formatCurrency(this.currentNota.totalTagihan)}\n` +
                         `Status: ${this.currentNota.status}`;
        
        // Check if Web Share API is available
        if (navigator.share) {
            navigator.share({
                title: `Nota ${this.currentNota.notaNo}`,
                text: shareText,
                url: window.location.href
            }).catch(error => {
                console.error('Error sharing:', error);
                this.copyToClipboard(shareText);
            });
        } else {
            this.copyToClipboard(shareText);
        }
    },
    
    // Copy to clipboard
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            Auth.showSuccess('Informasi nota berhasil disalin ke clipboard');
        }).catch(err => {
            console.error('Failed to copy:', err);
            Auth.showError('Gagal menyalin ke clipboard');
        });
    },
    
    // Generate sample nota (for demo)
    generateSampleNota() {
        const sampleNota = {
            notaNo: `NOTA-SAMPLE-${new Date().getTime()}`,
            tanggal: new Date(),
            idPesanan: 'ORD-SAMPLE-123',
            kabupaten: 'Kabupaten Contoh',
            sekolah: 'SD Muhammadiyah Contoh',
            totalTagihan: 2500000,
            jumlahBayar: 2500000,
            sisaKelebihan: 0,
            status: 'Lunas',
            bagiHasilSekolah: 175000,
            bagiHasilDaerah: 162500,
            userInput: 'Demo User'
        };
        
        this.currentNota = sampleNota;
        this.displayNota();
        
        // Update search input
        document.getElementById('searchNota').value = sampleNota.notaNo;
        
        Auth.showInfo('Nota contoh berhasil dibuat');
    },
    
    // View today's notas
    async viewTodayNota() {
        try {
            Auth.showLoading();
            
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`${Auth.CONFIG.API_URL}?method=getDataForCetak&startDate=${today}&endDate=${today}`);
            const data = await response.json();
            
            if (data.success && data.data.length > 0) {
                // Use the first order of today as sample
                const order = data.data[0];
                
                this.currentNota = {
                    notaNo: `NOTA-TODAY-${new Date().getTime()}`,
                    tanggal: new Date(),
                    idPesanan: order.idPesanan,
                    kabupaten: order.kabupaten,
                    sekolah: order.sekolah,
                    totalTagihan: order.total,
                    jumlahBayar: order.total,
                    sisaKelebihan: 0,
                    status: 'Lunas',
                    bagiHasilSekolah: order.total * 0.07,
                    bagiHasilDaerah: order.total * 0.065,
                    userInput: 'System Today'
                };
                
                this.displayNota();
                document.getElementById('searchNota').value = this.currentNota.notaNo;
                
                Auth.showSuccess('Menampilkan contoh nota hari ini');
            } else {
                Auth.showInfo('Tidak ada data pemesanan hari ini');
            }
            
        } catch (error) {
            console.error('Error viewing today nota:', error);
            Auth.showError('Gagal memuat data hari ini');
        } finally {
            Auth.hideLoading();
        }
    },
    
    // Open bulk print (placeholder)
    openBulkPrint() {
        Auth.showInfo('Fitur cetak massal akan segera tersedia');
    },
    
    // Reset search
    resetSearch() {
        document.getElementById('searchNota').value = '';
        document.getElementById('searchOrderId').value = '';
        document.getElementById('notaDisplay').style.display = 'none';
        document.getElementById('notaNotFound').style.display = 'none';
        
        // Clear URL parameter
        const url = new URL(window.location);
        url.searchParams.delete('nota');
        window.history.pushState({}, '', url);
        
        Auth.showSuccess('Pencarian direset');
    }
};

// Global functions for button onclick events
function searchNota() {
    NotaPembayaran.searchNota();
}

function searchByOrderId() {
    NotaPembayaran.searchByOrderId();
}

function printNota() {
    NotaPembayaran.printNota();
}

function downloadNotaPDF() {
    NotaPembayaran.downloadNotaPDF();
}

function shareNota() {
    NotaPembayaran.shareNota();
}

function generateSampleNota() {
    NotaPembayaran.generateSampleNota();
}

function viewTodayNota() {
    NotaPembayaran.viewTodayNota();
}

function openBulkPrint() {
    NotaPembayaran.openBulkPrint();
}

function resetSearch() {
    NotaPembayaran.resetSearch();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('searchNota')) {
        NotaPembayaran.init();
    }
});

// Export untuk global access
window.NotaPembayaran = NotaPembayaran;