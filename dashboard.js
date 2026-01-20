// ============================================
// DASHBOARD MODULE
// ============================================

// Chart instances
let monthlyChart = null;
let bookTypeChart = null;

// Load dashboard data
async function loadDashboardData(kabupaten = '') {
    try {
        Auth.showLoading();
        
        const response = await fetch(`${Auth.CONFIG.API_URL}?method=getDashboardData&kabupaten=${encodeURIComponent(kabupaten)}`);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Gagal memuat data');
        }
        
        // Update stat cards
        document.getElementById('totalBuku').textContent = data.totalBuku.toLocaleString('id-ID');
        document.getElementById('totalIsmuba').textContent = Auth.formatCurrency(data.totalUangIsmuba);
        document.getElementById('totalMipa').textContent = Auth.formatCurrency(data.totalUangMipa);
        document.getElementById('totalSekolah').textContent = data.totalSekolah.toLocaleString('id-ID');
        
        // Update recent orders
        updateRecentOrders(data.recentOrders);
        
        // Update summary
        updateOrderSummary(data.recentOrders);
        
        // Update charts
        updateCharts(data);
        
        // Update kabupaten filter
        updateKabupatenFilter(data.kabupatenList);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        Auth.showError('Gagal memuat data dashboard: ' + error.message);
    } finally {
        Auth.hideLoading();
    }
}

// Update recent orders table
function updateRecentOrders(orders) {
    const tbody = document.getElementById('recentOrders');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    <i class="fas fa-info-circle me-2"></i>
                    Tidak ada data pemesanan
                </td>
            </tr>
        `;
        return;
    }
    
    orders.forEach(order => {
        const statusClass = order.status === 'Lunas' ? 'badge bg-success' : 
                          order.status === 'Kelebihan' ? 'badge bg-warning' : 
                          'badge bg-danger';
        
        const row = `
            <tr>
                <td><small>${order.id}</small></td>
                <td>${Auth.formatDate(order.tanggal)}</td>
                <td>${order.sekolah}</td>
                <td class="text-end">${order.jumlahBuku}</td>
                <td class="text-end">${Auth.formatCurrency(order.total)}</td>
                <td><span class="${statusClass}">${order.status}</span></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Update order summary
function updateOrderSummary(orders) {
    if (!orders || orders.length === 0) {
        document.getElementById('totalOrders').textContent = '0';
        document.getElementById('unpaidOrders').textContent = '0';
        document.getElementById('paidOrders').textContent = '0';
        document.getElementById('overpaidOrders').textContent = '0';
        return;
    }
    
    const totalOrders = orders.length;
    const unpaidOrders = orders.filter(o => o.status === 'Belum Lunas').length;
    const paidOrders = orders.filter(o => o.status === 'Lunas').length;
    const overpaidOrders = orders.filter(o => o.status === 'Kelebihan').length;
    
    document.getElementById('totalOrders').textContent = totalOrders;
    document.getElementById('unpaidOrders').textContent = unpaidOrders;
    document.getElementById('paidOrders').textContent = paidOrders;
    document.getElementById('overpaidOrders').textContent = overpaidOrders;
}

// Update charts
function updateCharts(data) {
    // Monthly Chart
    const monthlyCtx = document.getElementById('monthlyChart');
    if (monthlyCtx) {
        if (monthlyChart) {
            monthlyChart.destroy();
        }
        
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 
                       'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        
        monthlyChart = new Chart(monthlyCtx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'ISMUBA',
                    data: data.monthlyData?.Ismuba || Array(12).fill(0),
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'MIPA',
                    data: data.monthlyData?.Mipa || Array(12).fill(0),
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${Auth.formatCurrency(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'Rp ' + (value / 1000000).toLocaleString('id-ID') + ' jt';
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Book Type Chart
    const bookTypeCtx = document.getElementById('bookTypeChart');
    if (bookTypeCtx) {
        if (bookTypeChart) {
            bookTypeChart.destroy();
        }
        
        bookTypeChart = new Chart(bookTypeCtx, {
            type: 'doughnut',
            data: {
                labels: ['ISMUBA', 'MIPA'],
                datasets: [{
                    data: [data.totalUangIsmuba, data.totalUangMipa],
                    backgroundColor: ['#3498db', '#e74c3c'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${context.label}: ${Auth.formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

// Update kabupaten filter dropdown
function updateKabupatenFilter(kabupatenList) {
    const select = document.getElementById('filterKabupaten');
    if (!select) return;
    
    // Simpan value yang sedang dipilih
    const currentValue = select.value;
    
    // Clear existing options except first
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Sort kabupaten list
    kabupatenList.sort();
    
    // Add new options
    kabupatenList.forEach(kab => {
        const option = document.createElement('option');
        option.value = kab;
        option.textContent = kab;
        select.appendChild(option);
    });
    
    // Kembalikan value yang sebelumnya dipilih jika masih ada
    if (currentValue && kabupatenList.includes(currentValue)) {
        select.value = currentValue;
    }
}

// Refresh dashboard
function refreshDashboard() {
    const kabupaten = document.getElementById('filterKabupaten').value;
    loadDashboardData(kabupaten);
    Auth.showSuccess('Dashboard berhasil diperbarui');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on dashboard page
    if (!document.getElementById('filterKabupaten')) return;
    
    // Load initial data
    loadDashboardData();
    
    // Filter change event
    const filterSelect = document.getElementById('filterKabupaten');
    if (filterSelect) {
        filterSelect.addEventListener('change', function() {
            loadDashboardData(this.value);
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            Auth.confirmDialog(
                'Konfirmasi Logout',
                'Apakah Anda yakin ingin logout?',
                () => Auth.logout()
            );
        });
    }
});

// Export functions
window.Dashboard = {
    loadDashboardData,
    refreshDashboard
};