document.addEventListener('DOMContentLoaded', () => {
    // --- Referensi Elemen DOM ---
    const elements = {
        stockView: document.getElementById('stock-view'),
        historyView: document.getElementById('history-view'),
        navButtons: document.querySelectorAll('.nav-btn'),
        appSubtitle: document.getElementById('app-subtitle'),
        addAccountForm: document.getElementById('add-account-form'),
        toggleFormBtn: document.getElementById('toggle-form-btn'),
        formSubmitBtn: document.getElementById('form-submit-btn'),
        submitBtnText: document.querySelector('#form-submit-btn .btn-text'),
        submitBtnSpinner: document.querySelector('#form-submit-btn .spinner'),
        cancelEditBtn: document.getElementById('cancel-edit-btn'),
        editingAccountIdInput: document.getElementById('editing-account-id'),
        gmailAccountInput: document.getElementById('gmail-account'),
        moontonPasswordInput: document.getElementById('moonton-password'),
        mlbbIdInput: document.getElementById('mlbb-id'),
        accountRegionSelect: document.getElementById('account-region'),
        accountPhotoInput: document.getElementById('account-photo'),
        photoBase64Input: document.getElementById('photo-base64'),
        photoPreviewImg: document.getElementById('photo-preview'),
        accountTierSelect: document.getElementById('account-tier'),
        addedDateInput: document.getElementById('added-date'),
        hargaBeliInput: document.getElementById('harga-beli'),
        hargaJualInput: document.getElementById('harga-jual'),
        accountsListDiv: document.getElementById('accounts-list'),
        accountsSkeletonLoader: document.getElementById('accounts-skeleton-loader'),
        totalAccountsSpan: document.getElementById('total-accounts'),
        searchInput: document.getElementById('search-input'),
        loadMoreContainer: document.getElementById('load-more-container'),
        loadMoreBtn: document.getElementById('load-more-btn'),
        historyListDiv: document.getElementById('history-list'),
        historyStatsDiv: document.getElementById('history-stats'),
        monthFilterInput: document.getElementById('month-filter'),
        clearHistoryBtn: document.getElementById('clear-history-btn'),
        salesChartCanvas: document.getElementById('sales-chart'),
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
        visibleAccountsCount: 10,
        accountsPerPage: 10,
        salesChartInstance: null,
        confirmCallback: null,
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
    const COUNTRIES = ["Indonesia", "Malaysia", "Singapura", "Filipina", "Myanmar", "Thailand", "Vietnam", "Kamboja", "Laos", "Brunei", "Timor-Leste", "Amerika Serikat", "Brazil", "Rusia", "Turki", "Jepang", "Korea Selatan", "Arab Saudi"];
    const DEFAULT_PHOTO = 'https://placehold.co/100x100/1e293b/94a3b8?text=No+Img';

    // --- Fungsi Penyimpanan (Storage) ---
    const saveData = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.error("Gagal menyimpan data:", e); showToast('Gagal menyimpan data.', 'fail'); } };
    const loadData = (key, def = []) => { try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : def; } catch (e) { console.error("Gagal memuat data:", e); showToast('Gagal memuat data.', 'fail'); return def; } };

    // --- Fungsi Bantuan (Helpers) ---
    const formatCurrency = (amount) => `Rp${Number(amount || 0).toLocaleString('id-ID')}`;
    const formatDate = (dateString) => { if (!dateString) return 'N/A'; const d = new Date(dateString); return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); };
    const imageToBase64 = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result); reader.onerror = error => reject(error); });
    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    // --- Fungsi Tampilan (UI) ---
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const icons = { success: 'fa-solid fa-check-circle', sold: 'fa-solid fa-sack-dollar', fail: 'fa-solid fa-times-circle', deleted: 'fa-solid fa-trash-can', info: 'fa-solid fa-info-circle', warning: 'fa-solid fa-exclamation-triangle' };
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<i class="${icons[type] || 'fa-solid fa-info-circle'}"></i><span>${message}</span>`;
        elements.toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
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
        document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
        elements.navButtons.forEach(b => b.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        document.querySelector(`.nav-btn[data-view="${viewId}"]`).classList.add('active');
        if (viewId === 'history-view') {
            renderHistoryAndStats();
        } else {
            refreshAccountView();
        }
    }

    function typeWriter(element, text, speed = 50) {
        let i = 0;
        element.innerHTML = "";
        function type() { if (i < text.length) { element.innerHTML += text.charAt(i); i++; setTimeout(type, speed); } }
        type();
    }
    
    function setSubmitButtonLoading(isLoading) {
        elements.formSubmitBtn.disabled = isLoading;
        elements.submitBtnText.classList.toggle('hidden', isLoading);
        elements.submitBtnSpinner.classList.toggle('hidden', !isLoading);
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
            accountsToRender.forEach((acc, index) => elements.accountsListDiv.appendChild(createAccountCard(acc, index)));
            elements.loadMoreContainer.classList.toggle('hidden', state.visibleAccountsCount >= filtered.length);
        }
        elements.totalAccountsSpan.textContent = `Total: ${filtered.length}`;
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

    function renderSalesChart(filteredHistory) {
        const monthlyData = filteredHistory.reduce((acc, item) => {
            if (!item.soldDate) return acc;
            const month = item.soldDate.substring(0, 7);
            if (!acc[month]) acc[month] = { profit: 0 };
            acc[month].profit += (item.hargaJual || 0) - (item.hargaBeli || 0);
            return acc;
        }, {});
        const sortedMonths = Object.keys(monthlyData).sort();
        const labels = sortedMonths.map(month => new Date(month + '-02').toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }));
        const profitData = sortedMonths.map(month => monthlyData[month].profit);
        
        if (state.salesChartInstance) state.salesChartInstance.destroy();

        const ctx = elements.salesChartCanvas.getContext('2d');
        const chartGradient = ctx.createLinearGradient(0, 0, 0, 250);
        chartGradient.addColorStop(0, 'rgba(56, 189, 248, 0.5)');
        chartGradient.addColorStop(1, 'rgba(56, 189, 248, 0)');

        state.salesChartInstance = new Chart(ctx, {
            type: 'line',
            data: { 
                labels, 
                datasets: [{ 
                    label: 'Keuntungan Bulanan', 
                    data: profitData, 
                    backgroundColor: chartGradient, 
                    borderColor: 'rgba(56, 189, 248, 1)', 
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(56, 189, 248, 1)',
                    pointBorderColor: '#0f172a',
                    pointHoverRadius: 7,
                    tension: 0.4,
                    fill: true 
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                scales: { 
                    y: { beginAtZero: true, ticks: { color: '#94A3B8' }, grid: { color: 'rgba(51, 65, 85, 0.5)' } },
                    x: { ticks: { color: '#94A3B8' }, grid: { display: false } }
                }, 
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `Profit: ${formatCurrency(c.raw)}` } } } 
            }
        });
    }

    // --- Fungsi Pembuat Elemen (Creators) ---
    function createAccountCard(account, index) {
        const card = document.createElement('div');
        const tierPrefix = account.tier.split('-')[0];
        card.className = `account-card tier-${tierPrefix}`;
        card.dataset.id = account.id;
        card.style.animationDelay = `${index * 30}ms`;
        const photoSrc = account.photoBase64 || DEFAULT_PHOTO;
        const tierText = account.tier.replace(/-/g, ' ').split(' ').map(capitalize).join(' ');

        card.innerHTML = `
            <div class="flex items-start gap-4 mb-3">
                <img src="${photoSrc}" alt="Foto Profil" class="profile-img w-14 h-14 rounded-full object-cover border-2 border-slate-700 cursor-pointer flex-shrink-0" onerror="this.onerror=null;this.src='${DEFAULT_PHOTO}';">
                <div class="flex-grow min-w-0">
                    <p class="font-semibold text-white truncate" title="${account.gmail}">${account.gmail}</p>
                    <p class="text-sm text-sky-400 font-medium">${tierText}</p>
                </div>
                <div class="relative group">
                    <button class="menu-btn w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-400 transition"><i class="fa-solid fa-ellipsis-v"></i></button>
                    <div class="menu-dropdown">
                        <button class="menu-item edit-btn"><i class="fa-solid fa-pencil w-6"></i>Edit</button>
                        <button class="menu-item sold-btn"><i class="fa-solid fa-sack-dollar w-6"></i>Terjual</button>
                        <button class="menu-item loss-btn"><i class="fa-solid fa-arrow-down-wide-short w-6"></i>Rugi/Hapus</button>
                    </div>
                </div>
            </div>
            <div class="bg-slate-800/50 rounded-lg p-3 space-y-2 text-sm">
                <div class="flex justify-between items-center">
                    <span class="text-slate-400">Password</span>
                    <div class="flex items-center gap-2">
                        <span class="password-text text-slate-200">••••••••</span>
                        <button class="password-toggle-btn text-slate-500 hover:text-sky-400 transition"><i class="fa-solid fa-eye"></i></button>
                    </div>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-slate-400">ID MLBB</span>
                    <span class="text-slate-200 font-medium">${account.mlbbId || 'N/A'}</span>
                </div>
                 <div class="flex justify-between items-center">
                    <span class="text-slate-400">Region</span>
                    <span class="text-slate-200 font-medium">${account.region || 'N/A'}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-slate-400">Tanggal</span>
                    <span class="text-slate-200 font-medium">${formatDate(account.addedDate) || 'N/A'}</span>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2 mt-3 text-center">
                <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                    <p class="text-xs text-red-400">HARGA BELI</p>
                    <p class="font-bold text-white">${formatCurrency(account.hargaBeli)}</p>
                </div>
                <div class="bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                    <p class="text-xs text-green-400">HARGA JUAL</p>
                    <p class="font-bold text-white">${formatCurrency(account.hargaJual)}</p>
                </div>
            </div>`;

        card.querySelector('.profile-img').addEventListener('click', () => { elements.zoomedImage.src = photoSrc; elements.zoomModal.classList.remove('hidden'); });
        card.querySelector('.password-toggle-btn').addEventListener('click', e => { 
            e.stopPropagation(); 
            const pt = card.querySelector('.password-text'); 
            const icon = e.currentTarget.querySelector('i');
            if(pt.textContent === '••••••••') {
                pt.textContent = account.moontonPassword || '';
                pt.classList.add('visible');
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                pt.textContent = '••••••••';
                pt.classList.remove('visible');
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
        card.querySelector('.edit-btn').addEventListener('click', e => { e.stopPropagation(); handleEditAccount(account.id); });
        card.querySelector('.sold-btn').addEventListener('click', e => { e.stopPropagation(); moveAccountToHistory(account.id, 'sold'); });
        card.querySelector('.loss-btn').addEventListener('click', e => { e.stopPropagation(); moveAccountToHistory(account.id, 'loss'); });
        return card;
    }

    function createHistoryItem(item) {
        const result = (item.hargaJual || 0) - (item.hargaBeli || 0);
        const isLoss = item.status === 'loss' || result < 0;
        const resultClass = isLoss ? 'text-red-400' : 'text-lime-400';
        const resultLabel = isLoss ? 'Rugi' : 'Untung';
        
        const itemEl = document.createElement('div');
        itemEl.className = `bg-slate-800 p-3 rounded-lg flex items-center gap-4 border-l-4 ${isLoss ? 'border-red-500' : 'border-sky-500'}`;
        itemEl.innerHTML = `
            <img src="${item.photoBase64 || DEFAULT_PHOTO}" alt="Foto Profil" class="w-10 h-10 rounded-full object-cover flex-shrink-0" onerror="this.onerror=null;this.src='${DEFAULT_PHOTO}';">
            <div class="flex-grow min-w-0">
                <p class="font-medium text-white truncate">${item.gmail}</p>
                <p class="text-xs text-slate-400">${isLoss ? 'Dihapus' : 'Terjual'} pada: ${formatDate(item.soldDate)}</p>
            </div>
            <div class="text-right flex-shrink-0">
                <p class="font-bold ${resultClass}">${resultLabel}: ${formatCurrency(Math.abs(result))}</p>
                <p class="text-xs text-slate-500">${formatCurrency(item.hargaJual)} - ${formatCurrency(item.hargaBeli)}</p>
            </div>
            <button class="delete-history-btn text-slate-500 hover:text-red-500 transition-colors w-8 h-8 rounded-full hover:bg-red-500/10" title="Hapus item ini">
                <i class="fa-solid fa-times"></i>
            </button>`;
        itemEl.querySelector('.delete-history-btn').addEventListener('click', e => { 
            e.stopPropagation(); 
            showConfirmModal('Hapus Riwayat?', `Anda yakin ingin menghapus riwayat untuk akun "${item.gmail}"?`, () => deleteHistoryItem(item.id)); 
        });
        return itemEl;
    }
    
    function createSkeletonCard() {
        const card = document.createElement('div');
        card.className = 'bg-slate-800 p-4 rounded-lg animate-pulse';
        card.innerHTML = `
            <div class="flex items-center gap-4 mb-4">
                <div class="w-14 h-14 rounded-full bg-slate-700"></div>
                <div class="flex-1 space-y-2">
                    <div class="h-4 bg-slate-700 rounded w-3/4"></div>
                    <div class="h-3 bg-slate-700 rounded w-1/2"></div>
                </div>
            </div>
            <div class="space-y-2">
                <div class="h-4 bg-slate-700 rounded"></div>
                <div class="h-4 bg-slate-700 rounded w-5/6"></div>
            </div>`;
        return card;
    }

    function getEmptyStateHTML(type) {
        const icons = {
            stock: 'fa-box-open',
            history: 'fa-file-invoice-dollar'
        };
        const titles = {
            stock: 'Stok Akun Kosong',
            history: 'Riwayat Penjualan Kosong'
        };
        const texts = {
            stock: state.searchTerm ? 'Tidak ada akun yang cocok dengan pencarian Anda.' : 'Anda belum menambahkan akun. Klik tombol tambah untuk memulai.',
            history: 'Belum ada data penjualan yang tercatat untuk periode ini.'
        };
        return `<div class="text-center p-8 bg-slate-800 rounded-lg mt-4">
            <i class="fa-solid ${icons[type]} fa-3x text-slate-600 mb-4"></i>
            <h3 class="text-lg font-semibold text-white">${titles[type]}</h3>
            <p class="text-slate-400 text-sm mt-1">${texts[type]}</p>
        </div>`;
    }

    // --- Logika Aplikasi (Handlers) ---
    function handleFormSubmit(event) {
        event.preventDefault();
        setSubmitButtonLoading(true);
        setTimeout(() => {
            const editingId = elements.editingAccountIdInput.value;
            const gmail = elements.gmailAccountInput.value.trim();
            if (!gmail) { showToast('Akun Gmail tidak boleh kosong!', 'warning'); setSubmitButtonLoading(false); return; }
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
                if (idx > -1) { state.accounts[idx] = { ...state.accounts[idx], ...accountData }; showToast('Akun berhasil diperbarui!', 'success'); }
            } else {
                accountData.id = `acc-${Date.now()}`;
                state.accounts.unshift(accountData);
                showToast('Akun baru berhasil ditambahkan!', 'success');
            }
            saveData('accountsDb', state.accounts);
            resetAndHideForm();
            refreshAccountView();
            setSubmitButtonLoading(false);
        }, 300);
    }
    
    function handleEditAccount(id) {
        const acc = state.accounts.find(a => a.id === id);
        if (!acc) return;
        elements.editingAccountIdInput.value = acc.id;
        elements.gmailAccountInput.value = acc.gmail;
        elements.moontonPasswordInput.value = acc.moontonPassword;
        elements.mlbbIdInput.value = acc.mlbbId;
        elements.accountRegionSelect.value = acc.region;
        elements.photoBase64Input.value = acc.photoBase64;
        elements.accountTierSelect.value = acc.tier;
        elements.addedDateInput.value = acc.addedDate;
        elements.hargaBeliInput.value = acc.hargaBeli;
        elements.hargaJualInput.value = acc.hargaJual;
        elements.photoPreviewImg.src = acc.photoBase64 || DEFAULT_PHOTO;
        elements.submitBtnText.textContent = 'Update Akun';
        elements.cancelEditBtn.classList.remove('hidden');
        elements.addAccountForm.classList.remove('hidden');
        elements.addAccountForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function moveAccountToHistory(id, status) {
        const accountIndex = state.accounts.findIndex(acc => acc.id === id);
        if (accountIndex === -1) return;
        const [accountToMove] = state.accounts.splice(accountIndex, 1);
        const historyData = { ...accountToMove, soldDate: new Date().toISOString(), status };
        if (status === 'loss') historyData.hargaJual = 0;
        
        state.history.unshift(historyData);
        saveData('accountsDb', state.accounts);
        saveData('historyDb', state.history);
        
        const toastMessage = status === 'sold' ? 'Akun berhasil terjual!' : 'Akun dihapus dari stok.';
        showToast(toastMessage, status === 'sold' ? 'sold' : 'deleted');
        
        refreshAccountView();
    }

    function deleteHistoryItem(id) {
        state.history = state.history.filter(item => item.id !== id);
        saveData('historyDb', state.history);
        showToast('Item riwayat dihapus.', 'deleted');
        renderHistoryAndStats();
    }

    function clearAllHistory() {
        if (state.history.length === 0) { showToast('Tidak ada riwayat untuk dihapus.', 'info'); return; }
        showConfirmModal('Hapus SEMUA Riwayat?', 'Tindakan ini tidak dapat diurungkan. Seluruh data riwayat penjualan akan hilang permanen.', () => {
            state.history = [];
            saveData('historyDb', []);
            showToast('Semua riwayat telah dihapus.', 'deleted');
            renderHistoryAndStats();
        });
    }

    function resetForm() {
        elements.addAccountForm.reset();
        elements.editingAccountIdInput.value = '';
        elements.photoBase64Input.value = '';
        elements.photoPreviewImg.src = 'https://placehold.co/100x100/1e293b/94a3b8?text=Preview';
        elements.addedDateInput.valueAsDate = new Date();
        elements.accountTierSelect.value = 'senior-v';
        elements.accountRegionSelect.value = 'Indonesia';
    }

    function resetAndHideForm() {
        resetForm();
        elements.submitBtnText.textContent = 'Simpan Akun';
        elements.cancelEditBtn.classList.add('hidden');
        elements.addAccountForm.classList.add('hidden');
    }

    function refreshAccountView() {
        state.visibleAccountsCount = state.accountsPerPage;
        renderAccounts();
    }

    // --- Inisialisasi ---
    function init() {
        state.accounts = loadData('accountsDb').sort((a,b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
        state.history = loadData('historyDb');
        renderSkeletons(5);
        setTimeout(() => { refreshAccountView(); }, 300);
        typeWriter(elements.appSubtitle, "Kelola stok akun MLBB dengan mudah.");
        setupEventListeners();
        populateDropdowns();
        resetForm();
        switchView('stock-view');
    }

    function setupEventListeners() {
        elements.addAccountForm.addEventListener('submit', handleFormSubmit);
        elements.searchInput.addEventListener('input', e => { state.searchTerm = e.target.value.toLowerCase(); refreshAccountView(); });
        elements.toggleFormBtn.addEventListener('click', () => {
            if (elements.editingAccountIdInput.value) {
                resetAndHideForm();
            } else {
                const isHidden = elements.addAccountForm.classList.contains('hidden');
                elements.addAccountForm.classList.toggle('hidden');
                if (isHidden) {
                    elements.addAccountForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
        elements.cancelEditBtn.addEventListener('click', resetAndHideForm);
        elements.navButtons.forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
        elements.monthFilterInput.addEventListener('change', () => renderHistoryAndStats());
        elements.clearHistoryBtn.addEventListener('click', clearAllHistory);
        elements.loadMoreBtn.addEventListener('click', () => { state.visibleAccountsCount += state.accountsPerPage; renderAccounts(); });
        elements.accountPhotoInput.addEventListener('change', async (e) => { const f = e.target.files[0]; if (f) try { const b64 = await imageToBase64(f); elements.photoPreviewImg.src = b64; elements.photoBase64Input.value = b64; } catch (err) { showToast("Gagal memproses gambar.", "fail"); } });
        elements.closeZoomBtn.addEventListener('click', () => elements.zoomModal.classList.add('hidden'));
        elements.zoomModal.addEventListener('click', (e) => { if (e.target === elements.zoomModal) elements.zoomModal.classList.add('hidden'); });
        elements.confirmNoBtn.addEventListener('click', hideConfirmModal);
        elements.confirmYesBtn.addEventListener('click', () => { if (state.confirmCallback) state.confirmCallback(); hideConfirmModal(); });
    }

    function populateDropdowns() {
        // Populate Regions
        elements.accountRegionSelect.innerHTML = COUNTRIES.map(c => `<option value="${c}">${c}</option>`).join('');
        elements.accountRegionSelect.value = "Indonesia";

        // Populate Tiers
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
