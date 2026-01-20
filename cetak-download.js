// ============================================
// CETAK & DOWNLOAD MODULE
// ============================================

const CetakDownload = {
    // State
    dataTable: null,
    currentData: [],
    masterData: null,
    
    // Initialize
    async init() {
        try {
            Auth.showLoading();
            
            // Load master data
            await this.loadMasterData();
            
            // Initialize kabupaten filter
            this.initKabupatenFilter();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadData();
            
        } catch (error) {
            console.error('Error initializing:', error);
            Auth.showError('Gagal memuat data: ' + error.message);
        } finally {
            Auth.hideLoading();
        }
    },
    
    // Load master data
    async loadMasterData() {
        try {
            const response = await fetch(`${Auth.CONFIG.API_URL}?method=getMasterData`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Gagal memuat data master');
            }
            
            this.masterData = data;
            
        } catch (error) {
            throw error;
        }
    },
    
    // Initialize kabupaten filter
    initKabupatenFilter() {
        const select = document.getElementById('filterKabupaten');
        if (!select || !this.masterData) return;
        
        select.innerHTML = '<option value="">Semua Kab/Kota</option>';
        
        this.masterData.kabupatenList.forEach(kab => {
            const option = document.createElement('option');
            option.value = kab;
            option.textContent = kab;
            select.appendChild(option);
        });
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            Auth.confirmDialog(
                'Konfirmasi Logout',
                'Apakah Anda yakin ingin logout?',
                () => Auth.logout()
            );
        });
        
        // Set end date to today
        document.getElementById('endDate').valueAsDate = new Date();
        
        // Set start date to 30 days ago
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        document.getElementById('startDate').valueAsDate = startDate;
    },
    
    // Load data with filters
    async loadData() {
        try {
            Auth.showLoading();
            
            // Get filter values
            const filters = this.getFilters();
            
            // Build URL
            let url = `${Auth.CONFIG.API_URL}?method=getDataForCetak`;
            if (filters.kabupaten) url += `&kabupaten=${encodeURIComponent(filters.kabupaten)}`;
            if (filters.jenis) url += `&jenis=${encodeURIComponent(filters.jenis)}`;
            if (filters.startDate) url += `&startDate=${filters.startDate}`;
            if (filters.endDate) url += `&endDate=${filters.endDate}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Gagal memuat data');
            }
            
            this.currentData = data.data;
            
            // Apply additional filters
            this.applyAdditionalFilters();
            
            // Initialize or update DataTable
            this.initializeDataTable();
            
            // Update summary
            this.updateSummary();
            
        } catch (error) {
            console.error('Error loading data:', error);
            Auth.showError('Gagal memuat data: ' + error.message);
        } finally {
            Auth.hideLoading();
        }
    },
    
    // Get filter values
    getFilters() {
        return {
            kabupaten: document.getElementById('filterKabupaten').value,
            jenis: document.getElementById('filterJenis').value,
            status: document.getElementById('filterStatus').value,
            jenjang: document.getElementById('filterJenjang').value,
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value
        };
    },
    
    // Apply additional filters (client-side)
    applyAdditionalFilters() {
        const filters = this.getFilters();
        
        if (filters.status) {
            this.currentData = this.currentData.filter(item => 
                item.status === filters.status
            );
        }
        
        if (filters.jenjang) {
            this.currentData = this.currentData.filter(item => 
                item.jenjang === filters.jenjang
            );
        }
    },
    
    // Initialize DataTable
    initializeDataTable() {
        const tableBody = document.getElementById('tableBody');
        
        if (!tableBody) return;
        
        // Clear existing table
        if (this.dataTable) {
            this.dataTable.destroy();
            this.dataTable = null;
        }
        
        tableBody.innerHTML = '';
        
        if (this.currentData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="13" class="text-center text-muted">
                        <i class="fas fa-info-circle me-2"></i>
                        Tidak ada data yang sesuai dengan filter
                    </td>
                </tr>
            `;
            return;
        }
        
        // Populate table
        this.currentData.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.idPesanan}</td>
                <td>${Auth.formatDate(item.tanggal)}</td>
                <td>${item.kabupaten}</td>
                <td>${item.sekolah}</td>
                <td>${item.jenjang}</td>
                <td>${item.jenisBuku}</td>
                <td>${item.judulBuku}</td>
                <td>${item.kelas}</td>
                <td class="text-end">${item.jumlah}</td>
                <td class="text-end">${Auth.formatCurrency(item.hargaSatuan)}</td>
                <td class="text-end">${Auth.formatCurrency(item.total)}</td>
                <td>
                    <span class="status-badge ${this.getStatusClass(item.status)}">
                        ${item.status}
                    </span>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Initialize DataTable
        this.dataTable = $('#dataTable').DataTable({
            pageLength: 25,
            lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Semua"]],
            language: {
                url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/id.json'
            },
            dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rt<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
            buttons: [
                {
                    extend: 'excel',
                    text: '<i class="fas fa-file-excel"></i> Excel',
                    className: 'btn btn-outline-success'
                },
                {
                    extend: 'pdf',
                    text: '<i class="fas fa-file-pdf"></i> PDF',
                    className: 'btn btn-outline-primary'
                },
                {
                    extend: 'print',
                    text: '<i class="fas fa-print"></i> Cetak',
                    className: 'btn btn-outline-secondary'
                }
            ]
        });
    },
    
    // Get status class
    getStatusClass(status) {
        switch(status) {
            case 'Lunas': return 'status-paid';
            case 'Kelebihan': return 'status-overpaid';
            default: return 'status-unpaid';
        }
    },
    
    // Update summary
    updateSummary() {
        if (this.currentData.length === 0) {
            document.getElementById('reportSummary').style.display = 'none';
            return;
        }
        
        const totalData = this.currentData.length;
        const totalBooks = this.currentData.reduce((sum, item) => sum + (parseInt(item.jumlah) || 0), 0);
        const totalValue = this.currentData.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
        const averageValue = totalValue / totalData;
        
        document.getElementById('summaryTotal').textContent = totalData.toLocaleString('id-ID');
        document.getElementById('summaryBooks').textContent = totalBooks.toLocaleString('id-ID');
        document.getElementById('summaryValue').textContent = Auth.formatCurrency(totalValue);
        document.getElementById('summaryAverage').textContent = Auth.formatCurrency(averageValue);
        
        document.getElementById('reportSummary').style.display = 'block';
    },
    
    // Apply filters
    applyFilters() {
        this.loadData();
    },
    
    // Reset filters
    resetFilters() {
        document.getElementById('filterKabupaten').value = '';
        document.getElementById('filterJenis').value = '';
        document.getElementById('filterStatus').value = '';
        document.getElementById('filterJenjang').value = '';
        
        // Reset dates
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        document.getElementById('endDate').valueAsDate = endDate;
        document.getElementById('startDate').valueAsDate = startDate;
        
        this.loadData();
        Auth.showSuccess('Filter berhasil direset');
    },
    
    // Export to Excel
    exportToExcel() {
        if (this.currentData.length === 0) {
            Auth.showError('Tidak ada data untuk diekspor');
            return;
        }
        
        try {
            // Prepare data for Excel
            const exportData = this.currentData.map((item, index) => ({
                'No': index + 1,
                'ID Pesanan': item.idPesanan,
                'Tanggal': Auth.formatDate(item.tanggal),
                'Kabupaten/Kota': item.kabupaten,
                'Sekolah': item.sekolah,
                'Jenjang': item.jenjang,
                'Jenis Buku': item.jenisBuku,
                'Judul Buku': item.judulBuku,
                'Kelas': item.kelas,
                'Jumlah': item.jumlah,
                'Harga Satuan': item.hargaSatuan,
                'Total': item.total,
                'Status': item.status
            }));
            
            // Create workbook
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Pemesanan Buku");
            
            // Generate filename
            const filters = this.getFilters();
            const filename = `Laporan_Pemesanan_${new Date().toISOString().split('T')[0]}.xlsx`;
            
            // Save file
            XLSX.writeFile(wb, filename);
            
            Auth.showSuccess('Data berhasil diekspor ke Excel');
            
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            Auth.showError('Gagal mengekspor ke Excel: ' + error.message);
        }
    },
    
    // Export to PDF
    exportToPDF() {
        if (this.currentData.length === 0) {
            Auth.showError('Tidak ada data untuk diekspor');
            return;
        }
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('landscape');
            
            // Add title
            const filters = this.getFilters();
            let title = 'LAPORAN PEMESANAN BUKU ISMUBA & MIPA';
            
            if (filters.kabupaten) {
                title += ` - ${filters.kabupaten}`;
            }
            
            doc.setFontSize(16);
            doc.text(title, 14, 15);
            
            // Add filter info
            doc.setFontSize(10);
            let filterText = 'Filter: ';
            if (filters.kabupaten) filterText += `Kabupaten: ${filters.kabupaten}, `;
            if (filters.jenis) filterText += `Jenis: ${filters.jenis}, `;
            if (filters.status) filterText += `Status: ${filters.status}`;
            
            if (filterText !== 'Filter: ') {
                doc.text(filterText, 14, 25);
            }
            
            // Add date
            doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 30);
            
            // Prepare table data
            const tableData = this.currentData.map((item, index) => [
                index + 1,
                item.idPesanan,
                Auth.formatDate(item.tanggal),
                item.kabupaten,
                item.sekolah.substring(0, 20), // Limit length
                item.jenjang,
                item.jenisBuku,
                item.judulBuku.substring(0, 20),
                item.kelas,
                item.jumlah,
                Auth.formatCurrency(item.hargaSatuan),
                Auth.formatCurrency(item.total),
                item.status
            ]);
            
            // Add table
            doc.autoTable({
                head: [['No', 'ID Pesanan', 'Tanggal', 'Kab/Kota', 'Sekolah', 'Jenjang', 'Jenis', 'Judul', 'Kelas', 'Jumlah', 'Harga', 'Total', 'Status']],
                body: tableData,
                startY: 35,
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [41, 128, 185] },
                columnStyles: {
                    0: { cellWidth: 10 },
                    1: { cellWidth: 25 },
                    2: { cellWidth: 20 },
                    3: { cellWidth: 25 },
                    4: { cellWidth: 30 },
                    5: { cellWidth: 15 },
                    6: { cellWidth: 20 },
                    7: { cellWidth: 30 },
                    8: { cellWidth: 15 },
                    9: { cellWidth: 15 },
                    10: { cellWidth: 20 },
                    11: { cellWidth: 25 },
                    12: { cellWidth: 20 }
                }
            });
            
            // Add summary
            const totalBooks = this.currentData.reduce((sum, item) => sum + (parseInt(item.jumlah) || 0), 0);
            const totalValue = this.currentData.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
            
            doc.setFontSize(10);
            doc.text(`Total Data: ${this.currentData.length}`, 14, doc.lastAutoTable.finalY + 10);
            doc.text(`Total Buku: ${totalBooks}`, 80, doc.lastAutoTable.finalY + 10);
            doc.text(`Total Nilai: ${Auth.formatCurrency(totalValue)}`, 140, doc.lastAutoTable.finalY + 10);
            
            // Save PDF
            const filename = `Laporan_Pemesanan_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
            
            Auth.showSuccess('Data berhasil diekspor ke PDF');
            
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            Auth.showError('Gagal mengekspor ke PDF: ' + error.message);
        }
    },
    
    // Export to CSV
    exportToCSV() {
        if (this.currentData.length === 0) {
            Auth.showError('Tidak ada data untuk diekspor');
            return;
        }
        
        try {
            // Create CSV content
            const headers = ['No', 'ID Pesanan', 'Tanggal', 'Kabupaten/Kota', 'Sekolah', 'Jenjang', 'Jenis Buku', 'Judul Buku', 'Kelas', 'Jumlah', 'Harga Satuan', 'Total', 'Status'];
            
            const rows = this.currentData.map((item, index) => [
                index + 1,
                `"${item.idPesanan}"`,
                `"${Auth.formatDate(item.tanggal)}"`,
                `"${item.kabupaten}"`,
                `"${item.sekolah}"`,
                `"${item.jenjang}"`,
                `"${item.jenisBuku}"`,
                `"${item.judulBuku}"`,
                `"${item.kelas}"`,
                item.jumlah,
                item.hargaSatuan,
                item.total,
                `"${item.status}"`
            ]);
            
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');
            
            // Create blob and download
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `Laporan_Pemesanan_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            Auth.showSuccess('Data berhasil diekspor ke CSV');
            
        } catch (error) {
            console.error('Error exporting to CSV:', error);
            Auth.showError('Gagal mengekspor ke CSV: ' + error.message);
        }
    },
    
    // Download by kabupaten
    async downloadByKabupaten() {
        try {
            Auth.showLoading();
            
            // Group data by kabupaten
            const groupedData = {};
            
            this.currentData.forEach(item => {
                if (!groupedData[item.kabupaten]) {
                    groupedData[item.kabupaten] = [];
                }
                groupedData[item.kabupaten].push(item);
            });
            
            // Create workbook with multiple sheets
            const wb = XLSX.utils.book_new();
            
            for (const [kabupaten, data] of Object.entries(groupedData)) {
                const exportData = data.map((item, index) => ({
                    'No': index + 1,
                    'ID Pesanan': item.idPesanan,
                    'Tanggal': Auth.formatDate(item.tanggal),
                    'Sekolah': item.sekolah,
                    'Jenjang': item.jenjang,
                    'Jenis Buku': item.jenisBuku,
                    'Judul Buku': item.judulBuku,
                    'Kelas': item.kelas,
                    'Jumlah': item.jumlah,
                    'Harga Satuan': item.hargaSatuan,
                    'Total': item.total,
                    'Status': item.status
                }));
                
                const ws = XLSX.utils.json_to_sheet(exportData);
                XLSX.utils.book_append_sheet(wb, ws, kabupaten.substring(0, 31)); // Sheet name max 31 chars
            }
            
            // Save file
            const filename = `Laporan_Per_Kabupaten_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, filename);
            
            Auth.showSuccess(`Data berhasil diekspor per kabupaten (${Object.keys(groupedData).length} kabupaten)`);
            
        } catch (error) {
            console.error('Error downloading by kabupaten:', error);
            Auth.showError('Gagal mengekspor: ' + error.message);
        } finally {
            Auth.hideLoading();
        }
    },
    
    // Download by school
    async downloadBySchool() {
        try {
            Auth.showLoading();
            
            // Group data by school
            const groupedData = {};
            
            this.currentData.forEach(item => {
                const key = `${item.kabupaten} - ${item.sekolah}`;
                if (!groupedData[key]) {
                    groupedData[key] = {
                        kabupaten: item.kabupaten,
                        sekolah: item.sekolah,
                        data: []
                    };
                }
                groupedData[key].data.push(item);
            });
            
            // Sort by kabupaten then sekolah
            const sortedGroups = Object.values(groupedData).sort((a, b) => {
                if (a.kabupaten === b.kabupaten) {
                    return a.sekolah.localeCompare(b.sekolah);
                }
                return a.kabupaten.localeCompare(b.kabupaten);
            });
            
            // Create workbook
            const wb = XLSX.utils.book_new();
            
            sortedGroups.forEach((group, groupIndex) => {
                const exportData = group.data.map((item, index) => ({
                    'No': index + 1,
                    'ID Pesanan': item.idPesanan,
                    'Tanggal': Auth.formatDate(item.tanggal),
                    'Jenjang': item.jenjang,
                    'Jenis Buku': item.jenisBuku,
                    'Judul Buku': item.judulBuku,
                    'Kelas': item.kelas,
                    'Jumlah': item.jumlah,
                    'Harga Satuan': item.hargaSatuan,
                    'Total': item.total,
                    'Status': item.status
                }));
                
                const ws = XLSX.utils.json_to_sheet(exportData);
                const sheetName = `${group.kabupaten.substring(0, 15)}-${group.sekolah.substring(0, 15)}`;
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });
            
            // Save file
            const filename = `Laporan_Per_Sekolah_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, filename);
            
            Auth.showSuccess(`Data berhasil diekspor per sekolah (${sortedGroups.length} sekolah)`);
            
        } catch (error) {
            console.error('Error downloading by school:', error);
            Auth.showError('Gagal mengekspor: ' + error.message);
        } finally {
            Auth.hideLoading();
        }
    },
    
    // Download summary
    async downloadSummary() {
        try {
            Auth.showLoading();
            
            // Create summary data
            const summaryData = [
                ['LAPORAN RINGKASAN PEMESANAN BUKU'],
                ['Tanggal Cetak', new Date().toLocaleDateString('id-ID')],
                [''],
                ['STATISTIK UMUM'],
                ['Total Data', this.currentData.length],
                ['Total Buku', this.currentData.reduce((sum, item) => sum + (parseInt(item.jumlah) || 0), 0)],
                ['Total Nilai', Auth.formatCurrency(this.currentData.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0))],
                [''],
                ['STATISTIK PER JENIS BUKU']
            ];
            
            // Group by jenis buku
            const jenisSummary = {};
            this.currentData.forEach(item => {
                if (!jenisSummary[item.jenisBuku]) {
                    jenisSummary[item.jenisBuku] = {
                        count: 0,
                        books: 0,
                        value: 0
                    };
                }
                jenisSummary[item.jenisBuku].count++;
                jenisSummary[item.jenisBuku].books += parseInt(item.jumlah) || 0;
                jenisSummary[item.jenisBuku].value += parseFloat(item.total) || 0;
            });
            
            // Add jenis buku data
            summaryData.push(['Jenis Buku', 'Jumlah Pesanan', 'Jumlah Buku', 'Total Nilai']);
            Object.entries(jenisSummary).forEach(([jenis, data]) => {
                summaryData.push([
                    jenis,
                    data.count,
                    data.books,
                    Auth.formatCurrency(data.value)
                ]);
            });
            
            summaryData.push(['']);
            summaryData.push(['STATISTIK PER KABUPATEN']);
            
            // Group by kabupaten
            const kabupatenSummary = {};
            this.currentData.forEach(item => {
                if (!kabupatenSummary[item.kabupaten]) {
                    kabupatenSummary[item.kabupaten] = {
                        count: 0,
                        books: 0,
                        value: 0
                    };
                }
                kabupatenSummary[item.kabupaten].count++;
                kabupatenSummary[item.kabupaten].books += parseInt(item.jumlah) || 0;
                kabupatenSummary[item.kabupaten].value += parseFloat(item.total) || 0;
            });
            
            // Add kabupaten data
            summaryData.push(['Kabupaten/Kota', 'Jumlah Pesanan', 'Jumlah Buku', 'Total Nilai']);
            Object.entries(kabupatenSummary).forEach(([kabupaten, data]) => {
                summaryData.push([
                    kabupaten,
                    data.count,
                    data.books,
                    Auth.formatCurrency(data.value)
                ]);
            });
            
            // Create workbook
            const ws = XLSX.utils.aoa_to_sheet(summaryData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Ringkasan");
            
            // Save file
            const filename = `Ringkasan_Pemesanan_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, filename);
            
            Auth.showSuccess('Ringkasan berhasil diekspor');
            
        } catch (error) {
            console.error('Error downloading summary:', error);
            Auth.showError('Gagal mengekspor ringkasan: ' + error.message);
        } finally {
            Auth.hideLoading();
        }
    },
    
    // Print report
    printReport() {
        // Update print header info
        const filters = this.getFilters();
        let filterInfo = 'Semua Data';
        
        if (filters.kabupaten) filterInfo = `Kabupaten: ${filters.kabupaten}`;
        if (filters.jenis) filterInfo += `, Jenis: ${filters.jenis}`;
        if (filters.status) filterInfo += `, Status: ${filters.status}`;
        
        document.getElementById('printFilterInfo').textContent = filterInfo;
        document.getElementById('printDate').textContent = new Date().toLocaleDateString('id-ID');
        
        // Trigger print
        window.print();
    }
};

// Global functions for button onclick events
function applyFilters() {
    CetakDownload.applyFilters();
}

function resetFilters() {
    CetakDownload.resetFilters();
}

function exportToExcel() {
    CetakDownload.exportToExcel();
}

function exportToPDF() {
    CetakDownload.exportToPDF();
}

function exportToCSV() {
    CetakDownload.exportToCSV();
}

function downloadByKabupaten() {
    CetakDownload.downloadByKabupaten();
}

function downloadBySchool() {
    CetakDownload.downloadBySchool();
}

function downloadSummary() {
    CetakDownload.downloadSummary();
}

function printReport() {
    CetakDownload.printReport();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('dataTable')) {
        CetakDownload.init();
    }
});

// Export untuk global access
window.CetakDownload = CetakDownload;