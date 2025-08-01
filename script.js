document.addEventListener('DOMContentLoaded', () => {
    // --- Referensi Elemen DOM ---
    const elements = {
        headerTitle: document.getElementById('header-title'),
        searchBtn: document.getElementById('search-btn'),
        searchInput: document.getElementById('search-input'),
        stockView: document.getElementById('stock-view'),
        historyView: document.getElementById('history-view'),
        navButtons: document.querySelectorAll('.nav-btn'),
        accountsListDiv: document.getElementById('accounts-list'),
        accountsSkeletonLoader: document.getElementById('accounts-skeleton-loader'),
        loadMoreContainer: document.getElementById('load-more-container'),
        loadMoreBtn: document.getElementById('load-more-btn'),
        fab: document.getElementById('fab-add-account'),
        // Modal Form
        accountModal: document.getElementById('account-modal'),
        modalTitle: document.getElementById('modal-title'),
        closeModalBtn: document.getElementById('close-modal-btn'),
        accountForm: document.getElementById('account-form'),
        editingAccountIdInput: document.getElementById('editing-account-id'),
        gmailAccountInput: document.getElementById('gmail-account'),
        moontonPasswordInput: document.getElementById('moonton-password'),
        mlbbIdInput: document.getElementById('mlbb-id'),
        accountRegionSelect: document.getElementById('account-region'),
        accountTierSelect: document.getElementById('account-tier'),
        hargaBeliInput: document.getElementById('harga-beli'),
        hargaJualInput: document.getElementById('harga-jual'),
        addedDateInput: document.getElementById('added-date'),
        accountPhotoInput: document.getElementById('account-photo'),
        photoBase64Input: document.getElementById('photo-base64'),
        photoPreviewImg: document.getElementById('photo-preview'),
        formSubmitBtn: document.getElementById('form-submit-btn'),
        submitBtnText: document.querySelector('#form-submit-btn .btn-text'),
        submitBtnSpinner: document.querySelector('#form-submit-btn .spinner'),
        // History View
        historyListDiv: document.getElementById('history-list'),
        historyStatsDiv: document.getElementById('history-stats'),
        monthFilterInput: document.getElementById('month-filter'),
        clearHistoryBtn: document.getElementById('clear-history-btn'),
        salesChartCanvas: document.getElementById('sales-chart'),
        // Other Modals
        zoomModal: document.getElementById('zoom-modal'),
        closeZoomBtn: document.getElementById('close-zoom-btn'),
        zoomedImage: document.getElementById('zoomed-image'),
        confirmModal: document.getElementById('confirm-modal'),
        confirmTitle: document.getElementById('confirm-title'),
        confirmMessage: document.getElementById('confirm-message'),
        confirmYesBtn: document.getElementById('confirm-yes-btn'),
        confirmNoBtn: document.getElementById('confirm-no-btn'),
        toastContainer: document.getElementById('toast-container'),
    };

    // --- State Aplikasi Terpusat ---
    const state = {
        accounts: [],
        history: [],
        searchTerm: '',
        visibleAccountsCount: 15,
        accountsPerPage: 15,
        salesChartInstance: null,
        confirmCallback: null,
        activeView: 'stock-view',
    };

    // --- Konstanta ---
    const TIERS = {
        "Sultan": "sultan",
        "Juragan I-V": ["juragan-I", "juragan-II", "juragan-III", "juragan-IV", "juragan-V"],
        "Terhormat I-V": ["terhormat-I", "terhormat-II", "terhormat-III", "terhormat-IV", "terhormat-V"],
        "Ternama I-V": ["ternama-I", "ternama-II", "ternama-III", "ternama-iv", "ternama-V"],
        "Ahli I-V": ["ahli-I", "ahli-II", "ahli-III", "ahli-IV", "ahli-V"],
        "Senior I-V": ["senior-I", "senior-II", "senior-III", "senior-IV", "senior-V"],
    };
    const TIER_ORDER = Object.values(TIERS).flat();
    const COUNTRIES = ["Indonesia", "Malaysia", "Singapura", "Filipina", "Myanmar", "Thailand", "Vietnam", "Kamboja", "Laos", "Brunei", "Timor-Leste", "Lainnya"];
    const DEFAULT_PHOTO = 'https://placehold.co/100x100/262626/a3a3a3?text=No+Img';
    const PREVIEW_PHOTO = 'https://placehold.co/100x100/262626/a3a3a3?text=Preview';

    // --- Fungsi Penyimpanan (Storage) ---
    const saveData = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.error("Gagal menyimpan data:", e); showToast('Gagal menyimpan data. Penyimpanan penuh.'); } };
    const loadData = (key, def = []) => { const d = localStorage.getItem(key); if (!d) return def; try { return JSON.parse(d); } catch (e) { console.error("Gagal memuat data:", key, e); return def; } };

    // --- Fungsi Bantuan (Helpers) ---
    const formatCurrency = (amount) => `Rp${Number(amount || 0).toLocaleString('id-ID')}`;
    const formatDate = (dateString) => { if (!dateString) return 'N/A'; const d = new Date(dateString); return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); };
    const resizeImage = (file, maxWidth, maxHeight) => new Promise((resolve, reject) => { const img = document.createElement('img'); const reader = new FileReader(); reader.onload = (e) => { img.src = e.target.result; }; reader.onerror = error => reject(error); reader.readAsDataURL(file); img.onload = () => { const canvas = document.createElement('canvas'); let { width, height } = img; if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } } else { if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; } } canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height); canvas.toBlob((blob) => { if (blob) { resolve(blob); } else { reject(new Error('Konversi Canvas ke Blob gagal')); } }, file.type, 1); }; img.onerror = error => reject(error); });
    const imageToBase64 = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result); reader.onerror = error => reject(error); });
    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    // --- Fungsi Tampilan (UI) ---
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<span>${message}</span>`;
        elements.toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }

    function showConfirmModal(title, message, callback) {
        elements.confirmTitle.textContent = title;
        elements.confirmMessage.textContent = message;
        state.confirmCallback = callback;
        elements.confirmModal.classList.remove('hidden');
    }

    function hideConfirmModal() {
        elements.confirmModal.classList.add('hidden');
        state.confirmCallback = null;
    }

    function switchView(viewId) {
        state.activeView = viewId;
        document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
        elements.navButtons.forEach(b => b.classList.remove('active'));
        
        document.getElementById(viewId).classList.add('active');
        const activeBtn = document.querySelector(`.nav-btn[data-view="${viewId}"]`);
        activeBtn.classList.add('active');

        elements.headerTitle.textContent = activeBtn.querySelector('.nav-text').textContent;
        elements.fab.classList.toggle('hidden', viewId !== 'stock-view');
        elements.searchBtn.classList.toggle('hidden', viewId !== 'stock-view');
        elements.searchInput.classList.toggle('hidden', viewId !== 'stock-view');


        if (viewId === 'history-view') {
            renderHistoryAndStats();
        } else {
            refreshAccountView();
        }
    }

    function setSubmitButtonLoading(isLoading) {
        elements.formSubmitBtn.disabled = isLoading;
        elements.submitBtnText.classList.toggle('hidden', isLoading);
        elements.submitBtnSpinner.classList.toggle('hidden', !isLoading);
    }
    
    // --- Logika Modal ---
    function openAccountModal(account = null) {
        elements.accountForm.reset();
        if (account) {
            // Edit mode
            elements.modalTitle.textContent = 'Edit Akun';
            elements.editingAccountIdInput.value = account.id;
            elements.gmailAccountInput.value = account.gmail;
            elements.moontonPasswordInput.value = account.moontonPassword;
            elements.mlbbIdInput.value = account.mlbbId;
            elements.accountRegionSelect.value = account.region;
            elements.photoBase64Input.value = account.photoBase64;
            elements.accountTierSelect.value = account.tier;
            elements.addedDateInput.value = account.addedDate;
            elements.hargaBeliInput.value = account.hargaBeli;
            elements.hargaJualInput.value = account.hargaJual;
            elements.photoPreviewImg.src = account.photoBase64 || PREVIEW_PHOTO;
            elements.submitBtnText.textContent = 'Update Akun';
        } else {
            // Add mode
            elements.modalTitle.textContent = 'Tambah Akun Baru';
            elements.editingAccountIdInput.value = '';
            elements.photoPreviewImg.src = PREVIEW_PHOTO;
            elements.addedDateInput.valueAsDate = new Date();
            elements.accountTierSelect.value = 'senior-v';
            elements.accountRegionSelect.value = 'Indonesia';
            elements.submitBtnText.textContent = 'Simpan Akun';
        }
        elements.accountModal.classList.remove('hidden');
    }

    function closeAccountModal() {
        elements.accountModal.classList.add('hidden');
    }

    // --- Logika Render ---
    function renderAccounts() {
        const filtered = state.searchTerm
            ? state.accounts.filter(acc => acc.tier.replace('-', ' ').toLowerCase().includes(state.searchTerm) || acc.gmail.toLowerCase().includes(state.searchTerm))
            : state.accounts;

        elements.accountsListDiv.innerHTML = '';
        elements.accountsSkeletonLoader.classList.add('hidden');

        if (filtered.length === 0) {
            elements.accountsListDiv.innerHTML = getEmptyStateHTML('stock');
            elements.loadMoreContainer.classList.add('hidden');
        } else {
            const accountsToRender = filtered.slice(0, state.visibleAccountsCount);
            accountsToRender.forEach(acc => elements.accountsListDiv.appendChild(createAccountCard(acc)));
            elements.loadMoreContainer.classList.toggle('hidden', state.visibleAccountsCount >= filtered.length);
        }
    }
    
    function renderSkeletons(count) {
        elements.accountsListDiv.innerHTML = '';
        elements.accountsSkeletonLoader.classList.remove('hidden');
        elements.accountsSkeletonLoader.innerHTML = '';
        for (let i = 0; i < count; i++) {
            elements.accountsSkeletonLoader.appendChild(createSkeletonCard());
        }
    }

    function renderHistoryAndStats() {
        const selectedMonth = elements.monthFilterInput.value;
        const filteredHistory = state.history.filter(item => !selectedMonth || (item.soldDate && item.soldDate.startsWith(selectedMonth))).sort((a, b) => new Date(b.soldDate) - new Date(a.soldDate));
        renderHistoryList(filteredHistory);
        renderHistoryStats(filteredHistory);
        renderSalesChart(filteredHistory);
    }
    
    function renderHistoryList(history) {
        elements.historyListDiv.innerHTML = history.length === 0 ? getEmptyStateHTML('history') : '';
        if (history.length > 0) history.forEach(item => elements.historyListDiv.appendChild(createHistoryItem(item)));
    }

    function renderHistoryStats(filteredHistory) {
        const totalRevenue = filteredHistory.reduce((sum, item) => sum + (item.hargaJual || 0), 0);
        const totalCost = filteredHistory.reduce((sum, item) => sum + (item.hargaBeli || 0), 0);
        const totalProfit = totalRevenue - totalCost;
        const soldCount = filteredHistory.filter(i => i.status === 'sold').length;
        
        elements.historyStatsDiv.innerHTML = `
            <div class="stat-card"><p class="stat-label">Pendapatan</p><p class="stat-value revenue">${formatCurrency(totalRevenue)}</p></div>
            <div class="stat-card"><p class="stat-label">Modal</p><p class="stat-value cost">${formatCurrency(totalCost)}</p></div>
            <div class="stat-card"><p class="stat-label">Profit</p><p class="stat-value profit">${formatCurrency(totalProfit)}</p></div>
            <div class="stat-card"><p class="stat-label">Terjual</p><p class="stat-value info">${soldCount} Akun</p></div>
        `;
    }

    /**
     * Renders a bar chart for daily profits.
     * Replaces the previous candlestick implementation for better stability and clarity.
     * @param {Array} filteredHistory - The history items to be rendered in the chart.
     */
    function renderSalesChart(filteredHistory) {
        if (state.salesChartInstance) {
            state.salesChartInstance.destroy();
        }

        // 1. Group sales by day and calculate the total profit for each day.
        const dailyProfit = filteredHistory.reduce((acc, item) => {
            if (!item.soldDate) return acc;
            const day = item.soldDate.substring(0, 10); // YYYY-MM-DD
            if (!acc[day]) {
                acc[day] = 0;
            }
            const profit = (item.hargaJual || 0) - (item.hargaBeli || 0);
            acc[day] += profit;
            return acc;
        }, {});

        // 2. Create data points for the chart and ensure they are sorted by date.
        const chartData = Object.keys(dailyProfit).map(day => {
            // Using a more robust date parsing method to avoid timezone issues.
            const [year, month, d] = day.split('-').map(Number);
            return {
                x: new Date(year, month - 1, d).getTime(),
                y: dailyProfit[day]
            };
        }).sort((a, b) => a.x - b.x); // Data must be sorted for a time scale.

        const ctx = elements.salesChartCanvas.getContext('2d');
        
        // Handle case where there is no data to display.
        if (chartData.length === 0) {
            ctx.clearRect(0, 0, elements.salesChartCanvas.width, elements.salesChartCanvas.height);
            ctx.font = "16px 'Inter'";
            ctx.fillStyle = '#a3a3a3';
            ctx.textAlign = 'center';
            ctx.fillText('Tidak ada data untuk ditampilkan', elements.salesChartCanvas.width / 2, elements.salesChartCanvas.height / 2);
            return;
        }

        // 3. Create the new bar chart instance.
        state.salesChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                datasets: [{
                    label: 'Profit Harian',
                    data: chartData,
                    // Use green for profit and red for loss for better visual feedback.
                    backgroundColor: chartData.map(d => d.y >= 0 ? 'rgba(132, 204, 22, 0.6)' : 'rgba(239, 68, 68, 0.6)'),
                    borderColor: chartData.map(d => d.y >= 0 ? 'rgb(132, 204, 22)' : 'rgb(239, 68, 68)'),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            tooltipFormat: 'dd MMM yyyy'
                        },
                        ticks: { color: '#a3a3a3' },
                        grid: { display: false }
                    },
                    y: {
                        ticks: {
                            color: '#a3a3a3',
                            callback: function(value) {
                               return formatCurrency(value);
                            }
                        },
                        grid: { color: 'rgba(64, 64, 64, 0.5)' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            // Custom title for the tooltip to show the full date.
                            title: function(context) {
                                const date = new Date(context[0].raw.x);
                                return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                            },
                            // Custom label to show "Profit" or "Rugi".
                            label: function(context) {
                                const profit = context.raw.y;
                                const label = profit >= 0 ? 'Profit' : 'Rugi';
                                return ` ${label}: ${formatCurrency(Math.abs(profit))}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // --- Fungsi Pembuat Elemen (Creators) ---
    function createAccountCard(account) {
        const card = document.createElement('div');
        card.className = 'account-card';
        card.dataset.id = account.id;
        const photoSrc = account.photoBase64 || DEFAULT_PHOTO;
        const tierText = account.tier.replace(/-/g, ' ').split(' ').map(capitalize).join(' ');

        card.innerHTML = `
            <div class="account-card-header">
                <img src="${photoSrc}" alt="Foto Profil" class="profile-img" onerror="this.onerror=null;this.src='${DEFAULT_PHOTO}';">
                <div class="account-info">
                    <p class="account-email">${account.gmail}</p>
                    <p class="account-tier">${tierText}</p>
                </div>
                <i class="fa-solid fa-chevron-right expand-icon"></i>
            </div>
            <div class="account-card-details">
                <div class="detail-item">
                    <span class="detail-label">Password</span>
                    <div class="detail-value">
                        <span class="password-text">••••••••</span>
                        <button class="password-toggle-btn"><i class="fa-solid fa-eye"></i></button>
                    </div>
                </div>
                <div class="detail-item"><span class="detail-label">ID MLBB</span><span class="detail-value">${account.mlbbId || 'N/A'}</span></div>
                <div class="detail-item"><span class="detail-label">Region</span><span class="detail-value">${account.region || 'N/A'}</span></div>
                <div class="detail-item"><span class="detail-label">Tanggal</span><span class="detail-value">${formatDate(account.addedDate) || 'N/A'}</span></div>
                <div class="detail-item"><span class="detail-label text-red-500">Harga Beli</span><span class="detail-value font-bold">${formatCurrency(account.hargaBeli)}</span></div>
                <div class="detail-item"><span class="detail-label text-green-500">Harga Jual</span><span class="detail-value font-bold">${formatCurrency(account.hargaJual)}</span></div>
                <div class="detail-actions">
                    <button class="detail-action-btn edit-btn"><i class="fa-solid fa-pencil mr-2"></i>Edit</button>
                    <button class="detail-action-btn sold-btn"><i class="fa-solid fa-sack-dollar mr-2"></i>Terjual</button>
                    <button class="detail-action-btn loss-btn"><i class="fa-solid fa-trash-can mr-2"></i>Hapus</button>
                </div>
            </div>
        `;
        
        // Event Listeners for the card
        card.querySelector('.account-card-header').addEventListener('click', () => {
            const currentlyExpanded = document.querySelector('.account-card.expanded');
            if (currentlyExpanded && currentlyExpanded !== card) {
                currentlyExpanded.classList.remove('expanded');
            }
            card.classList.toggle('expanded');
        });

        card.querySelector('.profile-img').addEventListener('click', (e) => { e.stopPropagation(); elements.zoomedImage.src = photoSrc; elements.zoomModal.classList.remove('hidden'); });
        
        card.querySelector('.password-toggle-btn').addEventListener('click', e => { 
            e.stopPropagation(); 
            const pt = card.querySelector('.password-text'); 
            const icon = e.currentTarget.querySelector('i');
            if(pt.textContent === '••••••••') {
                pt.textContent = account.moontonPassword || '';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                pt.textContent = '••••••••';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });

        card.querySelector('.edit-btn').addEventListener('click', e => { e.stopPropagation(); openAccountModal(account); });
        card.querySelector('.sold-btn').addEventListener('click', e => { e.stopPropagation(); moveAccountToHistory(account.id, 'sold'); });
        card.querySelector('.loss-btn').addEventListener('click', e => { e.stopPropagation(); moveAccountToHistory(account.id, 'loss'); });

        return card;
    }

    function createHistoryItem(item) {
        const result = (item.hargaJual || 0) - (item.hargaBeli || 0);
        const isLoss = item.status === 'loss' || result < 0;
        const resultClass = isLoss ? 'text-red-500' : 'text-lime-500';
        const resultLabel = isLoss ? 'Rugi' : 'Untung';
        const photoSrc = item.photoBase64 || DEFAULT_PHOTO;
        
        const itemEl = document.createElement('div');
        itemEl.className = 'history-item';
        itemEl.innerHTML = `
            <img src="${photoSrc}" alt="Foto Profil" class="profile-img" onerror="this.onerror=null;this.src='${DEFAULT_PHOTO}';">
            <div class="history-info">
                <p class="history-email">${item.gmail}</p>
                <p class="history-date">${isLoss ? 'Dihapus' : 'Terjual'} pada: ${formatDate(item.soldDate)}</p>
            </div>
            <div class="history-profit">
                <p class="profit-value ${resultClass}">${resultLabel}: ${formatCurrency(Math.abs(result))}</p>
                <p class="profit-details">${formatCurrency(item.hargaJual)} - ${formatCurrency(item.hargaBeli)}</p>
            </div>
            <button class="history-delete-btn" title="Hapus item ini"><i class="fa-solid fa-times"></i></button>
        `;

        itemEl.querySelector('.history-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            showConfirmModal('Hapus Riwayat?', `Yakin ingin menghapus riwayat untuk "${item.gmail}"?`, () => deleteHistoryItem(item.id));
        });

        return itemEl;
    }

    function createSkeletonCard() {
        const card = document.createElement('div');
        card.className = 'skeleton-card animate-pulse';
        card.innerHTML = `
            <div class="skeleton-img"></div>
            <div class="skeleton-info">
                <div class="skeleton-line w-3/4"></div>
                <div class="skeleton-line w-1/2"></div>
            </div>`;
        return card;
    }

    function getEmptyStateHTML(type) {
        const icons = { stock: 'fa-box-open', history: 'fa-file-invoice-dollar' };
        const titles = { stock: 'Stok Akun Kosong', history: 'Riwayat Kosong' };
        const texts = { stock: state.searchTerm ? 'Tidak ada akun cocok.' : 'Klik tombol + untuk menambah akun.', history: 'Belum ada data penjualan tercatat.' };
        return `<div class="text-center p-8 mt-4">
            <i class="fa-solid ${icons[type]} fa-3x text-neutral-700 mb-4"></i>
            <h3 class="text-lg font-semibold">${titles[type]}</h3>
            <p class="text-neutral-500 text-sm mt-1">${texts[type]}</p>
        </div>`;
    }

    // --- Logika Aplikasi (Handlers) ---
    function handleFormSubmit(event) {
        event.preventDefault();
        setSubmitButtonLoading(true);
        setTimeout(() => {
            const editingId = elements.editingAccountIdInput.value;
            const gmail = elements.gmailAccountInput.value.trim();
            if (!gmail) { showToast('Akun Gmail wajib diisi!'); setSubmitButtonLoading(false); return; }
            const accountData = { 
                gmail, 
                moontonPassword: elements.moontonPasswordInput.value.trim(), 
                mlbbId: elements.mlbbIdInput.value.trim(), 
                region: elements.accountRegionSelect.value, 
                photoBase64: elements.photoBase64Input.value, 
                tier: elements.accountTierSelect.value, 
                addedDate: elements.addedDateInput.value, 
                hargaBeli: parseFloat(elements.hargaBeliInput.value) || 0, 
                hargaJual: parseFloat(elements.hargaJualInput.value) || 0, 
            };
            if (editingId) {
                const idx = state.accounts.findIndex(acc => acc.id === editingId);
                if (idx > -1) { state.accounts[idx] = { ...state.accounts[idx], ...accountData }; showToast('Akun diperbarui!'); }
            } else {
                accountData.id = `acc-${Date.now()}`;
                state.accounts.unshift(accountData);
                showToast('Akun baru ditambahkan!');
            }
            saveData('accountsDb', state.accounts);
            closeAccountModal();
            refreshAccountView();
            setSubmitButtonLoading(false);
        }, 300);
    }

    function moveAccountToHistory(id, status) {
        const message = status === 'sold' ? 'Pindahkan akun ini ke riwayat sebagai TERJUAL?' : 'Anda yakin ingin MENGHAPUS akun ini dari stok?';
        showConfirmModal('Konfirmasi Aksi', message, () => {
            const accountIndex = state.accounts.findIndex(acc => acc.id === id);
            if (accountIndex === -1) return;
            
            const [accountToMove] = state.accounts.splice(accountIndex, 1);
            const historyData = { ...accountToMove, soldDate: new Date().toISOString(), status };
            if (status === 'loss') historyData.hargaJual = 0;
            
            state.history.unshift(historyData);
            saveData('accountsDb', state.accounts);
            saveData('historyDb', state.history);
            
            showToast(status === 'sold' ? 'Akun berhasil terjual!' : 'Akun dihapus dari stok.');
            refreshAccountView();
        });
    }

    function deleteHistoryItem(id) {
        state.history = state.history.filter(item => item.id !== id);
        saveData('historyDb', state.history);
        showToast('Item riwayat dihapus.');
        renderHistoryAndStats();
    }

    function clearAllHistory() {
        if (state.history.length === 0) { showToast('Tidak ada riwayat untuk dihapus.'); return; }
        showConfirmModal('Hapus SEMUA Riwayat?', 'Tindakan ini akan hilang permanen.', () => {
            state.history = [];
            saveData('historyDb', []);
            showToast('Semua riwayat telah dihapus.');
            renderHistoryAndStats();
        });
    }

    function refreshAccountView() {
        state.visibleAccountsCount = state.accountsPerPage;
        state.accounts.sort((a,b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
        renderAccounts();
    }

    // --- Inisialisasi ---
    function init() {
        state.accounts = loadData('accountsDb');
        state.history = loadData('historyDb');
        
        renderSkeletons(5);
        setTimeout(() => { refreshAccountView(); }, 300);
        
        setupEventListeners();
        populateDropdowns();
        switchView('stock-view');
        elements.monthFilterInput.value = new Date().toISOString().substring(0, 7);
    }

    function setupEventListeners() {
        // Search
        elements.searchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            elements.searchInput.classList.add('active');
            elements.searchInput.focus();
        });
        elements.searchInput.addEventListener('input', e => { state.searchTerm = e.target.value.toLowerCase(); refreshAccountView(); });
        document.addEventListener('click', (e) => {
            if (!elements.searchInput.contains(e.target) && !elements.searchBtn.contains(e.target)) {
                elements.searchInput.classList.remove('active');
            }
        });

        // Modals
        elements.fab.addEventListener('click', () => openAccountModal());
        elements.closeModalBtn.addEventListener('click', closeAccountModal);
        elements.accountModal.addEventListener('click', (e) => { if (e.target === elements.accountModal) closeAccountModal(); });

        // Forms
        elements.accountForm.addEventListener('submit', handleFormSubmit);
        
        // Navigation
        elements.navButtons.forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
        elements.loadMoreBtn.addEventListener('click', () => { state.visibleAccountsCount += state.accountsPerPage; renderAccounts(); });
        
        // History
        elements.monthFilterInput.addEventListener('change', () => renderHistoryAndStats());
        elements.clearHistoryBtn.addEventListener('click', clearAllHistory);
        
        // Image Processing
        elements.accountPhotoInput.addEventListener('change', async (e) => {
            const f = e.target.files[0];
            if (f) {
                try {
                    const resizedBlob = await resizeImage(f, 800, 800);
                    const b64 = await imageToBase64(resizedBlob);
                    elements.photoPreviewImg.src = b64;
                    elements.photoBase64Input.value = b64;
                } catch (err) {
                    showToast("Gagal memproses gambar.");
                }
            }
        });

        // Other Modals
        elements.closeZoomBtn.addEventListener('click', () => elements.zoomModal.classList.add('hidden'));
        elements.zoomModal.addEventListener('click', (e) => { if (e.target === elements.zoomModal) elements.zoomModal.classList.add('hidden'); });
        elements.confirmNoBtn.addEventListener('click', hideConfirmModal);
        elements.confirmYesBtn.addEventListener('click', () => { if (state.confirmCallback) state.confirmCallback(); hideConfirmModal(); });
    }

    function populateDropdowns() {
        elements.accountRegionSelect.innerHTML = COUNTRIES.map(c => `<option value="${c}">${c}</option>`).join('');
        
        elements.accountTierSelect.innerHTML = '';
        for (const groupName in TIERS) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = groupName;
            const tiers = Array.isArray(TIERS[groupName]) ? TIERS[groupName] : [TIERS[groupName]];
            tiers.forEach(tierValue => {
                const option = document.createElement('option');
                option.value = tierValue;
                option.textContent = tierValue.replace(/-/g, ' ').split(' ').map(capitalize).join(' ');
                optgroup.appendChild(option);
            });
            elements.accountTierSelect.appendChild(optgroup);
        }
    }
    
    init();
});
