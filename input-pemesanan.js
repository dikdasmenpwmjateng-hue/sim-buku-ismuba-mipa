// ============================================
// INPUT PEMESANAN MODULE
// ============================================

const InputPemesanan = {
    // State
    currentStep: 1,
    selectedBooks: [],
    masterData: null,
    cart: [],
    schoolInfo: {},
    
    // Initialize
    async init() {
        try {
            Auth.showLoading();
            
            // Load master data
            await this.loadMasterData();
            
            // Initialize form
            this.initForm();
            
            // Load kabupaten list
            this.loadKabupatenList();
            
            // Setup event listeners
            this.setupEventListeners();
            
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
            console.log('Master data loaded:', data);
            
        } catch (error) {
            throw error;
        }
    },
    
    // Load kabupaten list
    loadKabupatenList() {
        const select = document.getElementById('kabupaten');
        if (!select || !this.masterData) return;
        
        select.innerHTML = '<option value="">Pilih Kabupaten/Kota</option>';
        
        this.masterData.kabupatenList.forEach(kab => {
            const option = document.createElement('option');
            option.value = kab;
            option.textContent = kab;
            select.appendChild(option);
        });
    },
    
    // Initialize form
    initForm() {
        // Jenjang change event
        document.getElementById('jenjang').addEventListener('change', (e) => {
            this.loadBooksByJenjang(e.target.value);
        });
        
        // Filter events
        document.getElementById('filterJenis').addEventListener('change', () => this.filterBooks());
        document.getElementById('filterKategori').addEventListener('change', () => this.filterBooks());
        document.getElementById('searchBook').addEventListener('input', () => this.filterBooks());
    },
    
    // Load books by jenjang
    loadBooksByJenjang(jenjang) {
        if (!jenjang || !this.masterData) return;
        
        // Reset filters
        document.getElementById('filterJenis').value = '';
        document.getElementById('filterKategori').value = '';
        document.getElementById('searchBook').value = '';
        
        // Load kategori options
        this.loadKategoriOptions(jenjang);
        
        // Combine all books
        const allBooks = [...this.masterData.bukuIsmuba, ...this.masterData.bukuMipa];
        
        // Filter by jenjang
        const filteredBooks = allBooks.filter(book => {
            if (jenjang === 'SD' && (book.judul.includes('SD') || book.judul.includes('MI'))) {
                return true;
            } else if (jenjang === 'SMP' && (book.judul.includes('SMP') || book.judul.includes('MTs'))) {
                return true;
            } else if (jenjang === 'SMA' && (book.judul.includes('SMA') || book.judul.includes('SMK') || book.judul.includes('MA'))) {
                return true;
            }
            return false;
        });
        
        // Display books
        this.displayBooks(filteredBooks);
    },
    
    // Load kategori options
    loadKategoriOptions(jenjang) {
        const select = document.getElementById('filterKategori');
        if (!select) return;
        
        select.innerHTML = '<option value="">Semua Kategori</option>';
        
        const categories = new Set();
        
        // Add categories based on jenjang
        if (this.masterData) {
            const allBooks = [...this.masterData.bukuIsmuba, ...this.masterData.bukuMipa];
            allBooks.forEach(book => {
                if ((jenjang === 'SD' && book.judul.includes('SD')) ||
                    (jenjang === 'SMP' && book.judul.includes('SMP')) ||
                    (jenjang === 'SMA' && book.judul.includes('SMA'))) {
                    categories.add(book.kategori);
                }
            });
        }
        
        // Add options
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });
    },
    
    // Display books
    displayBooks(books) {
        const container = document.getElementById('bookList');
        if (!container) return;
        
        if (!books || books.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> Tidak ada buku tersedia untuk jenjang ini.
                </div>
            `;
            return;
        }
        
        container.innerHTML = '<div class="book-grid"></div>';
        const grid = container.querySelector('.book-grid');
        
        books.forEach(book => {
            const bookCard = this.createBookCard(book);
            grid.appendChild(bookCard);
        });
    },
    
    // Create book card
    createBookCard(book) {
        const card = document.createElement('div');
        card.className = 'book-card';
        card.dataset.bookId = `${book.jenis}_${book.kelas}`;
        
        // Determine price based on jenjang
        let price = 0;
        const jenjang = document.getElementById('jenjang').value;
        
        if (jenjang === 'SD') price = book.hargaSD || 0;
        else if (jenjang === 'SMP') price = book.hargaSMP || 0;
        else if (jenjang === 'SMA') price = book.hargaSMA || 0;
        
        // Check if in cart
        const inCart = this.cart.find(item => 
            item.jenis === book.jenis && 
            item.kelas === book.kelas
        );
        
        if (inCart) {
            card.classList.add('selected');
        }
        
        card.innerHTML = `
            <div class="book-title">${book.judul}</div>
            <div class="book-info">
                <i class="fas fa-tag"></i> ${book.kategori}
            </div>
            <div class="book-info">
                <i class="fas fa-graduation-cap"></i> Kelas ${book.kelas}
            </div>
            <div class="book-info">
                <i class="fas fa-book-open"></i> ${book.jenis}
            </div>
            <div class="book-price">
                ${Auth.formatCurrency(price)}
            </div>
            
            ${inCart ? `
                <div class="quantity-control">
                    <button class="quantity-btn" onclick="InputPemesanan.decreaseQuantity('${book.jenis}', '${book.kelas}')">
                        <i class="fas fa-minus"></i>
                    </button>
                    <input type="number" class="quantity-input" 
                           value="${inCart.jumlah}" min="1" max="1000"
                           onchange="InputPemesanan.updateQuantity('${book.jenis}', '${book.kelas}', this.value)">
                    <button class="quantity-btn" onclick="InputPemesanan.increaseQuantity('${book.jenis}', '${book.kelas}')">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            ` : `
                <button class="btn btn-sm btn-primary w-100 mt-2" 
                        onclick="InputPemesanan.addToCart(${JSON.stringify(book).replace(/"/g, '&quot;')})">
                    <i class="fas fa-cart-plus"></i> Tambah
                </button>
            `}
        `;
        
        return card;
    },
    
    // Filter books
    filterBooks() {
        const jenis = document.getElementById('filterJenis').value;
        const kategori = document.getElementById('filterKategori').value;
        const search = document.getElementById('searchBook').value.toLowerCase();
        const jenjang = document.getElementById('jenjang').value;
        
        if (!jenjang) {
            Auth.showError('Pilih jenjang sekolah terlebih dahulu');
            return;
        }
        
        // Combine all books
        const allBooks = [...this.masterData.bukuIsmuba, ...this.masterData.bukuMipa];
        
        // Filter
        const filteredBooks = allBooks.filter(book => {
            // Filter by jenjang
            let match = false;
            if (jenjang === 'SD' && (book.judul.includes('SD') || book.judul.includes('MI'))) {
                match = true;
            } else if (jenjang === 'SMP' && (book.judul.includes('SMP') || book.judul.includes('MTs'))) {
                match = true;
            } else if (jenjang === 'SMA' && (book.judul.includes('SMA') || book.judul.includes('SMK') || book.judul.includes('MA'))) {
                match = true;
            }
            
            if (!match) return false;
            
            // Filter by jenis
            if (jenis && book.jenis !== jenis) return false;
            
            // Filter by kategori
            if (kategori && book.kategori !== kategori) return false;
            
            // Filter by search
            if (search && !book.judul.toLowerCase().includes(search) && 
                !book.kategori.toLowerCase().includes(search)) {
                return false;
            }
            
            return true;
        });
        
        this.displayBooks(filteredBooks);
    },
    
    // Add book to cart
    addToCart(book) {
        // Determine price
        const jenjang = document.getElementById('jenjang').value;
        let price = 0;
        
        if (jenjang === 'SD') price = book.hargaSD || 0;
        else if (jenjang === 'SMP') price = book.hargaSMP || 0;
        else if (jenjang === 'SMA') price = book.hargaSMA || 0;
        
        // Check if already in cart
        const existingIndex = this.cart.findIndex(item => 
            item.jenis === book.jenis && 
            item.kelas === book.kelas
        );
        
        if (existingIndex >= 0) {
            this.cart[existingIndex].jumlah += 1;
        } else {
            this.cart.push({
                ...book,
                jumlah: 1,
                harga: price
            });
        }
        
        this.updateCart();
        this.updateBookCard(book);
    },
    
    // Remove from cart
    removeFromCart(jenis, kelas) {
        this.cart = this.cart.filter(item => 
            !(item.jenis === jenis && item.kelas === kelas)
        );
        
        this.updateCart();
        this.updateBookCard({ jenis, kelas });
    },
    
    // Update quantity
    updateQuantity(jenis, kelas, quantity) {
        const qty = parseInt(quantity) || 1;
        
        const itemIndex = this.cart.findIndex(item => 
            item.jenis === jenis && 
            item.kelas === kelas
        );
        
        if (itemIndex >= 0) {
            if (qty < 1) {
                this.removeFromCart(jenis, kelas);
            } else {
                this.cart[itemIndex].jumlah = qty;
            }
            
            this.updateCart();
            this.updateBookCard({ jenis, kelas });
        }
    },
    
    // Increase quantity
    increaseQuantity(jenis, kelas) {
        const item = this.cart.find(item => 
            item.jenis === jenis && 
            item.kelas === kelas
        );
        
        if (item) {
            this.updateQuantity(jenis, kelas, item.jumlah + 1);
        }
    },
    
    // Decrease quantity
    decreaseQuantity(jenis, kelas) {
        const item = this.cart.find(item => 
            item.jenis === jenis && 
            item.kelas === kelas
        );
        
        if (item && item.jumlah > 1) {
            this.updateQuantity(jenis, kelas, item.jumlah - 1);
        } else if (item) {
            this.removeFromCart(jenis, kelas);
        }
    },
    
    // Update cart display
    updateCart() {
        const container = document.getElementById('cartItems');
        const summary = document.getElementById('cartSummary');
        
        if (!container || !summary) return;
        
        if (this.cart.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted my-4">
                    <i class="fas fa-shopping-cart fa-3x mb-3"></i>
                    <p>Belum ada buku di keranjang</p>
                </div>
            `;
            summary.style.display = 'none';
            return;
        }
        
        // Calculate totals
        let totalJumlah = 0;
        let totalHarga = 0;
        
        container.innerHTML = '';
        
        this.cart.forEach((item, index) => {
            const subtotal = item.harga * item.jumlah;
            totalJumlah += item.jumlah;
            totalHarga += subtotal;
            
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <div class="cart-item-header">
                    <div class="cart-item-title">${item.judul}</div>
                    <button class="cart-item-remove" 
                            onclick="InputPemesanan.removeFromCart('${item.jenis}', '${item.kelas}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="row">
                    <div class="col-6">
                        <small>Kelas ${item.kelas}</small>
                    </div>
                    <div class="col-3 text-end">
                        <small>${item.jumlah} x ${Auth.formatCurrency(item.harga)}</small>
                    </div>
                    <div class="col-3 text-end">
                        <small><strong>${Auth.formatCurrency(subtotal)}</strong></small>
                    </div>
                </div>
                <div class="quantity-control mt-2">
                    <button class="quantity-btn btn-sm" 
                            onclick="InputPemesanan.decreaseQuantity('${item.jenis}', '${item.kelas}')">
                        <i class="fas fa-minus"></i>
                    </button>
                    <input type="number" class="quantity-input" 
                           value="${item.jumlah}" min="1" max="1000"
                           onchange="InputPemesanan.updateQuantity('${item.jenis}', '${item.kelas}', this.value)">
                    <button class="quantity-btn btn-sm" 
                            onclick="InputPemesanan.increaseQuantity('${item.jenis}', '${item.kelas}')">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            `;
            container.appendChild(cartItem);
        });
        
        // Update summary
        document.getElementById('totalJumlahBuku').textContent = totalJumlah;
        document.getElementById('totalHarga').textContent = Auth.formatCurrency(totalHarga);
        document.getElementById('totalTagihan').textContent = Auth.formatCurrency(totalHarga);
        
        summary.style.display = 'block';
    },
    
    // Update book card
    updateBookCard(book) {
        const card = document.querySelector(`[data-book-id="${book.jenis}_${book.kelas}"]`);
        if (card) {
            const bookData = [...this.masterData.bukuIsmuba, ...this.masterData.bukuMipa]
                .find(b => b.jenis === book.jenis && b.kelas === book.kelas);
            
            if (bookData) {
                const newCard = this.createBookCard(bookData);
                card.parentNode.replaceChild(newCard, card);
            }
        }
    },
    
    // Setup event listeners
    setupEventListeners() {
        // School form submission
        document.getElementById('schoolForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.validateSchoolForm();
        });
        
        // Submit order button
        document.getElementById('submitOrderBtn').addEventListener('click', () => {
            this.submitOrder();
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
    
    // Validate school form
    validateSchoolForm() {
        if (!Auth.validateForm('schoolForm')) {
            return;
        }
        
        // Save school info
        this.schoolInfo = {
            kabupaten: document.getElementById('kabupaten').value,
            jenjang: document.getElementById('jenjang').value,
            namaSekolah: document.getElementById('namaSekolah').value,
            alamatSekolah: document.getElementById('alamatSekolah').value,
            namaPemesan: document.getElementById('namaPemesan').value,
            telepon: document.getElementById('telepon').value,
            email: document.getElementById('email').value
        };
        
        // Move to step 2
        this.goToStep(2);
    },
    
    // Go to step
    goToStep(step) {
        // Hide all steps
        document.querySelectorAll('.step-content').forEach(el => {
            el.style.display = 'none';
        });
        
        // Update step indicator
        document.querySelectorAll('.step').forEach((el, index) => {
            el.classList.remove('active', 'completed');
            if (index + 1 < step) {
                el.classList.add('completed');
            } else if (index + 1 === step) {
                el.classList.add('active');
            }
        });
        
        // Show current step
        document.getElementById(`step${step}Content`).style.display = 'block';
        this.currentStep = step;
        
        // If step 2, load books
        if (step === 2 && this.schoolInfo.jenjang) {
            this.loadBooksByJenjang(this.schoolInfo.jenjang);
        }
        
        // If step 3, update review
        if (step === 3) {
            this.updateReview();
        }
    },
    
    // Next step
    nextStep() {
        if (this.currentStep < 3) {
            this.goToStep(this.currentStep + 1);
        }
    },
    
    // Previous step
    prevStep() {
        if (this.currentStep > 1) {
            this.goToStep(this.currentStep - 1);
        }
    },
    
    // Update review
    updateReview() {
        // Update school info
        document.getElementById('reviewKabupaten').textContent = this.schoolInfo.kabupaten;
        document.getElementById('reviewJenjang').textContent = this.schoolInfo.jenjang;
        document.getElementById('reviewSekolah').textContent = this.schoolInfo.namaSekolah;
        document.getElementById('reviewPemesan').textContent = this.schoolInfo.namaPemesan || '-';
        
        // Update order items
        const tbody = document.getElementById('reviewOrderItems');
        let total = 0;
        
        tbody.innerHTML = '';
        
        this.cart.forEach((item, index) => {
            const subtotal = item.harga * item.jumlah;
            total += subtotal;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.jenis}</td>
                <td>${item.judul}</td>
                <td>${item.kelas}</td>
                <td class="text-end">${item.jumlah}</td>
                <td class="text-end">${Auth.formatCurrency(item.harga)}</td>
                <td class="text-end">${Auth.formatCurrency(subtotal)}</td>
            `;
            tbody.appendChild(row);
        });
        
        // Update total
        document.getElementById('reviewTotal').textContent = Auth.formatCurrency(total);
    },
    
    // Submit order
    async submitOrder() {
        if (this.cart.length === 0) {
            Auth.showError('Tambahkan buku ke keranjang terlebih dahulu');
            return;
        }
        
        Auth.confirmDialog(
            'Konfirmasi Pesanan',
            'Apakah Anda yakin ingin mengirimkan pesanan ini?',
            async () => {
                try {
                    Auth.showLoading();
                    
                    // Submit each book as separate order
                    const promises = this.cart.map(async (item) => {
                        const orderData = {
                            kabupaten: this.schoolInfo.kabupaten,
                            jenjang: this.schoolInfo.jenjang,
                            namaSekolah: this.schoolInfo.namaSekolah,
                            jenisBuku: item.jenis,
                            kelas: item.kelas,
                            judulBuku: item.judul,
                            jumlah: item.jumlah,
                            catatan: document.getElementById('catatanPesanan').value
                        };
                        
                        const response = await fetch(Auth.CONFIG.API_URL, {
                            method: 'POST',
                            body: JSON.stringify({
                                method: 'inputPemesanan',
                                ...orderData
                            })
                        });
                        
                        return response.json();
                    });
                    
                    const results = await Promise.all(promises);
                    
                    // Check for errors
                    const errors = results.filter(r => !r.success);
                    if (errors.length > 0) {
                        throw new Error(errors[0].error || 'Gagal menyimpan beberapa pesanan');
                    }
                    
                    // Show success
                    Auth.showSuccess('Pesanan berhasil disimpan!', () => {
                        // Reset form and go to dashboard
                        this.resetForm();
                        window.location.href = 'index.html';
                    });
                    
                } catch (error) {
                    console.error('Error submitting order:', error);
                    Auth.showError('Gagal menyimpan pesanan: ' + error.message);
                } finally {
                    Auth.hideLoading();
                }
            }
        );
    },
    
    // Reset form
    resetForm() {
        Auth.confirmDialog(
            'Reset Form',
            'Apakah Anda yakin ingin mereset form? Semua data yang belum disimpan akan hilang.',
            () => {
                // Reset state
                this.currentStep = 1;
                this.cart = [];
                this.schoolInfo = {};
                
                // Reset form
                document.getElementById('schoolForm').reset();
                document.getElementById('catatanPesanan').value = '';
                
                // Reset UI
                this.goToStep(1);
                this.updateCart();
                
                // Clear book list
                const bookList = document.getElementById('bookList');
                if (bookList) {
                    bookList.innerHTML = '';
                }
                
                Auth.showSuccess('Form berhasil direset');
            }
        );
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('schoolForm')) {
        InputPemesanan.init();
    }
});

// Export untuk global access
window.InputPemesanan = InputPemesanan;