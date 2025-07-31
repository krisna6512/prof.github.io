document.addEventListener('DOMContentLoaded', () => {
    // --- Referensi Elemen DOM ---
    const elements = {
        body: document.body,
        stockView: document.getElementById('stock-view'),
        historyView: document.getElementById('history-view'),
        stockTab: document.getElementById('stock-tab'),
        historyTab: document.getElementById('history-tab'),
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
    const TIER_ORDER = ['sultan', 'juragan-i', 'juragan-ii', 'juragan-iii', 'juragan-iv', 'juragan-v', 'terhormat-i', 'terhormat-ii', 'terhormat-iii', 'terhormat-iv', 'terhormat-v', 'ternama-i', 'ternama-ii', 'ternama-iii', 'ternama-iv', 'ternama-v', 'ahli-i', 'ahli-ii', 'ahli-iii', 'ahli-iv', 'ahli-v', 'senior-i', 'senior-ii', 'senior-iii', 'senior-iv', 'senior-v'];
    const COUNTRIES = ["Indonesia", "Malaysia", "Singapore", "Philippines", "Myanmar", "Thailand", "Vietnam", "Cambodia", "Laos", "Brunei", "Timor-Leste", "United States", "Brazil", "Russia", "Turkey", "Japan", "South Korea", "Saudi Arabia"];
    const DEFAULT_PHOTO = 'https://placehold.co/100x100/334155/E5E7EB?text=No+Photo';

    // --- Fungsi Penyimpanan (Storage) ---
    const saveData = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.error(e); showToast('Gagal menyimpan data.', 'fail'); } };
    const loadData = (key, def = []) => { try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : def; } catch (e) { console.error(e); showToast('Gagal memuat data.', 'fail'); return def; } };

    // --- Fungsi Bantuan (Helpers) ---
    const formatCurrency = (amount) => `Rp ${Number(amount || 0).toLocaleString('id-ID')}`;
    const formatDate = (dateString) => { if (!dateString) return 'N/A'; const d = new Date(dateString); return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }); };
    const imageToBase64 = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result); reader.onerror = error => reject(error); });

    // --- Fungsi Tampilan (UI) ---
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const icons = { success: '✅', sold: '💰', fail: '❌', deleted: '🗑️', info: 'ℹ️', warning: '⚠️' };
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;
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
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        document.querySelector(`.tab-btn[data-view="${viewId}"]`).classList.add('active');
        if (viewId === 'history-view') {
            renderHistoryAndStats();
        } else {
            refreshAccountView();
        }
    }

    function typeWriter(element, text, speed = 75) {
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
            const groupedAccounts = groupAccountsByTier(accountsToRender);
            const sortedTiers = Object.keys(groupedAccounts).sort((a, b) => {
                const tierA_sample = groupedAccounts[a][0].tier;
                const tierB_sample = groupedAccounts[b][0].tier;
                return TIER_ORDER.indexOf(tierA_sample) - TIER_ORDER.indexOf(tierB_sample);
            });

            sortedTiers.forEach(tier => {
                const accountsInGroup = groupedAccounts[tier];
                accountsInGroup.sort((a,b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
                const groupElement = document.createElement('div');
                groupElement.className = 'account-group';
                groupElement.innerHTML = `<div class="account-group-summary"><span class="account-group-title">Pangkat: ${tier}</span><span class="account-group-count">${accountsInGroup.length} Akun</span></div>`;
                const grid = document.createElement('div');
                grid.className = 'account-group-grid';
                accountsInGroup.forEach((acc, index) => grid.appendChild(createAccountCard(acc, index)));
                groupElement.appendChild(grid);
                elements.accountsListDiv.appendChild(groupElement);
            });

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
        const avgProfit = soldCount > 0 ? totalProfit / soldCount : 0;
        const stats = [
            { label: 'Total Pendapatan', value: formatCurrency(totalRevenue), class: 'revenue' },
            { label: 'Total Modal', value: formatCurrency(totalCost), class: 'cost' },
            { label: 'Keuntungan Bersih', value: formatCurrency(totalProfit), class: totalProfit >= 0 ? 'profit' : 'loss' },
            { label: 'Rata-rata Profit', value: formatCurrency(avgProfit), class: 'info' }
        ];
        elements.historyStatsDiv.innerHTML = '';
        stats.forEach((stat, index) => {
            const statCard = document.createElement('div');
            statCard.className = 'stat-card';
            statCard.style.animationDelay = `${index * 100}ms`;
            statCard.innerHTML = `<p class="stat-label">${stat.label}</p><p class="stat-value ${stat.class}">${stat.value}</p>`;
            elements.historyStatsDiv.appendChild(statCard);
        });
    }

    function renderSalesChart(filteredHistory) {
        const monthlyData = filteredHistory.reduce((acc, item) => {
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
        const chartGradient = ctx.createLinearGradient(0, 0, 0, 300);
        chartGradient.addColorStop(0, 'rgba(56, 189, 248, 0.6)');
        chartGradient.addColorStop(1, 'rgba(56, 189, 248, 0.05)');

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
                    pointBorderColor: '#fff',
                    pointHoverRadius: 7,
                    tension: 0.4,
                    fill: true 
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        ticks: { 
                            callback: (v) => formatCurrency(v),
                            color: '#94A3B8'
                        },
                        grid: {
                            color: 'rgba(71, 85, 105, 0.5)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#94A3B8'
                        },
                        grid: {
                            display: false
                        }
                    }
                }, 
                plugins: { 
                    legend: { display: false }, 
                    tooltip: { 
                        callbacks: { 
                            label: (c) => `Keuntungan: ${formatCurrency(c.raw)}` 
                        } 
                    } 
                } 
            }
        });
    }

    // --- Fungsi Pembuat Elemen (Creators) ---
    function createAccountCard(account, index) {
        const card = document.createElement('div');
        const tierPrefix = account.tier.split('-')[0];
        card.className = `account-card tier-${tierPrefix}`;
        card.dataset.id = account.id;
        card.style.animationDelay = `${index * 50}ms`;
        const photoSrc = account.photoBase64 || DEFAULT_PHOTO;
        card.innerHTML = `
            <div class="card-header"><img src="${photoSrc}" alt="Foto Profil" class="profile-img" onerror="this.onerror=null;this.src='${DEFAULT_PHOTO}';"><div class="card-info"><p class="card-gmail">${account.gmail}</p><p class="card-tier">${account.tier.replace(/-/g, ' ')}</p></div></div>
            <div class="card-pricing"><div class="price-item"><span class="price-label">Beli</span><span class="price-value buy-price">${formatCurrency(account.hargaBeli)}</span></div><div class="price-item"><span class="price-label">Jual</span><span class="price-value sell-price">${formatCurrency(account.hargaJual)}</span></div></div>
            <div class="card-details"><div class="detail-label">Password</div><div class="detail-value password-wrapper"><span class="password-text">••••••••</span><button class="password-toggle-btn"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" /></svg></button></div><div class="detail-label">ID MLBB</div><div class="detail-value">${account.mlbbId || 'N/A'}</div><div class="detail-label">Region</div><div class="detail-value">${account.region || 'N/A'}</div><div class="detail-label">Tanggal</div><div class="detail-value">${formatDate(account.addedDate) || 'N/A'}</div></div>
            <div class="card-actions"><button class="action-btn edit-btn" title="Edit Akun"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button><button class="action-btn delete-btn" title="Hapus/Jual Akun"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg></button></div>`;
        card.querySelector('.profile-img').addEventListener('click', () => { elements.zoomedImage.src = photoSrc; elements.zoomModal.classList.remove('hidden'); });
        card.querySelector('.password-toggle-btn').addEventListener('click', e => { e.stopPropagation(); const pt = card.querySelector('.password-text'); pt.textContent = pt.textContent === '••••••••' ? (account.moontonPassword || '') : '••••••••'; });
        card.querySelector('.edit-btn').addEventListener('click', e => { e.stopPropagation(); handleEditAccount(account.id); });
        card.querySelector('.delete-btn').addEventListener('click', e => { e.stopPropagation(); showDeletePrompt(card, account.id); });
        return card;
    }

    function createHistoryItem(item) {
        const result = (item.hargaJual || 0) - (item.hargaBeli || 0);
        const isLoss = item.status === 'loss' || result < 0;
        const resultClass = isLoss ? 'loss' : 'profit';
        const resultLabel = isLoss ? 'Rugi' : 'Untung';
        const itemEl = document.createElement('div');
        itemEl.className = `history-item ${isLoss ? 'loss' : ''}`;
        itemEl.innerHTML = `<div class="history-info"><img src="${item.photoBase64 || DEFAULT_PHOTO}" alt="Foto Profil" onerror="this.onerror=null;this.src='${DEFAULT_PHOTO}';"><div class="history-details"><p class="history-gmail">${item.gmail}</p><p class="history-date">${isLoss ? 'Dikembalikan' : 'Terjual'} pada: ${formatDate(item.soldDate)}</p></div></div><div class="history-pricing"><p class="history-result ${resultClass}">${resultLabel}: ${formatCurrency(Math.abs(result))}</p><p class="history-price-breakdown">${formatCurrency(item.hargaJual)} - ${formatCurrency(item.hargaBeli)}</p></div><button class="delete-history-btn" title="Hapus item ini"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg></button>`;
        itemEl.querySelector('.delete-history-btn').addEventListener('click', e => { e.stopPropagation(); showConfirmModal('Hapus Riwayat?', `Anda yakin ingin menghapus riwayat untuk akun "${item.gmail}"?`, () => deleteHistoryItem(item.id)); });
        return itemEl;
    }
    
    function createSkeletonCard() {
        const card = document.createElement('div');
        card.className = 'skeleton-card';
        card.innerHTML = `<div class="flex items-center gap-4 mb-4"><div class="skeleton circle"></div><div class="flex-1"><div class="skeleton text w-3/4"></div><div class="skeleton text-sm w-1/2"></div></div></div><div class="flex justify-around bg-gray-700/20 rounded-lg p-3 mb-4"><div class="w-1/3"><div class="skeleton text-sm w-full"></div></div><div class="w-1/3"><div class="skeleton text-sm w-full"></div></div></div><div class="skeleton text-sm w-full mb-2"></div><div class="skeleton text-sm w-3/4"></div>`;
        return card;
    }

    function getEmptyStateHTML(type) {
        if (type === 'stock') return `<div class="empty-state"><svg class="empty-state-icon w-16 h-16" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg><h3 class="empty-state-title">Stok Akun Kosong</h3><p class="empty-state-text">${state.searchTerm ? 'Tidak ada akun yang cocok dengan pencarian Anda.' : 'Anda belum menambahkan akun apapun. Klik tombol di atas untuk memulai.'}</p></div>`;
        if (type === 'history') return `<div class="empty-state"><svg class="empty-state-icon w-16 h-16" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><h3 class="empty-state-title">Riwayat Penjualan Kosong</h3><p class="empty-state-text">Belum ada data penjualan yang tercatat untuk periode ini.</p></div>`;
    }

    // --- Logika Aplikasi (Handlers) ---
    function handleFormSubmit(event) {
        event.preventDefault();
        setSubmitButtonLoading(true);
        setTimeout(() => {
            const editingId = elements.editingAccountIdInput.value;
            const gmail = elements.gmailAccountInput.value.trim();
            if (!gmail) { showToast('Akun Gmail tidak boleh kosong!', 'warning'); setSubmitButtonLoading(false); return; }
            const accountData = { gmail, moontonPassword: elements.moontonPasswordInput.value.trim(), mlbbId: elements.mlbbIdInput.value.trim(), region: elements.accountRegionSelect.value, photoBase64: elements.photoBase64Input.value, tier: elements.accountTierSelect.value, addedDate: elements.addedDateInput.value, hargaBeli: parseFloat(elements.hargaBeliInput.value) || 0, hargaJual: parseFloat(elements.hargaJualInput.value) || 0, };
            if (editingId) {
                const idx = state.accounts.findIndex(acc => acc.id === editingId);
                if (idx > -1) { state.accounts[idx] = { ...state.accounts[idx], ...accountData }; showToast('Akun berhasil diperbarui!', 'success'); }
            } else {
                accountData.id = `acc-${Date.now()}`;
                state.accounts.unshift(accountData);
                showToast('Mantap nyetok trus juragan!', 'success');
            }
            saveData('accountsDb', state.accounts);
            resetAndHideForm();
            refreshAccountView();
            setSubmitButtonLoading(false);
        }, 500);
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function showDeletePrompt(card, accountId) {
        const actionsDiv = card.querySelector('.card-actions');
        const originalButtons = actionsDiv.innerHTML;
        actionsDiv.innerHTML = `<button class="action-btn sold-btn">Terjual</button><button class="action-btn hb-btn">Ke HB</button><button class="action-btn keep-btn">Batal</button>`;
        actionsDiv.querySelector('.sold-btn').onclick = () => moveAccountToHistory(accountId, 'sold');
        actionsDiv.querySelector('.hb-btn').onclick = () => moveAccountToHistory(accountId, 'loss');
        actionsDiv.querySelector('.keep-btn').onclick = () => { actionsDiv.innerHTML = originalButtons; setupCardEventListeners(card, accountId); };
    }

    function setupCardEventListeners(card, accountId) {
        const account = state.accounts.find(a => a.id === accountId);
        if(!account) return;
        card.querySelector('.edit-btn').addEventListener('click', e => { e.stopPropagation(); handleEditAccount(accountId); });
        card.querySelector('.delete-btn').addEventListener('click', e => { e.stopPropagation(); showDeletePrompt(card, accountId); });
    }

    function moveAccountToHistory(id, status) {
        const accountIndex = state.accounts.findIndex(acc => acc.id === id);
        if (accountIndex === -1) return;
        const [accountToMove] = state.accounts.splice(accountIndex, 1);
        const historyData = { ...accountToMove, soldDate: new Date().toISOString(), status };
        if (status === 'loss') {
            historyData.hargaJual = 0;
        }
        state.history.unshift(historyData);
        saveData('accountsDb', state.accounts);
        saveData('historyDb', state.history);
        
        const toastType = status === 'sold' ? 'sold' : 'fail';
        const toastMessage = status === 'sold' ? 'SOLD, JURAGAN MANTAP!' : 'Gagal? Coba lagi bos.';
        showToast(toastMessage, toastType);
        
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
        showConfirmModal('Hapus SEMUA Riwayat?', 'Anda yakin ingin menghapus seluruh data riwayat penjualan? Ini permanen.', () => {
            state.history = [];
            saveData('historyDb', []);
            showToast('Semua riwayat telah dihapus.', 'deleted');
            renderHistoryAndStats();
        });
    }

    function resetForm() {
        elements.editingAccountIdInput.value = '';
        elements.addAccountForm.reset();
        elements.photoBase64Input.value = '';
        elements.photoPreviewImg.src = DEFAULT_PHOTO;
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

    function groupAccountsByTier(accounts) {
        return accounts.reduce((acc, account) => {
            const tier = account.tier.split('-')[0];
            if (!acc[tier]) acc[tier] = [];
            acc[tier].push(account);
            return acc;
        }, {});
    }

    function refreshAccountView() {
        state.visibleAccountsCount = state.accountsPerPage;
        renderAccounts();
    }

    // --- Inisialisasi ---
    function init() {
        state.accounts = loadData('accountsDb');
        state.history = loadData('historyDb');
        renderSkeletons(5);
        setTimeout(() => { refreshAccountView(); }, 500);
        typeWriter(elements.appSubtitle, "Thanks to prof delavie");
        setupEventListeners();
        populateDropdowns();
        resetForm();
        switchView('stock-view');
    }

    function setupEventListeners() {
        elements.addAccountForm.addEventListener('submit', handleFormSubmit);
        elements.searchInput.addEventListener('input', e => { state.searchTerm = e.target.value.toLowerCase(); refreshAccountView(); });
        elements.toggleFormBtn.addEventListener('click', () => { if (elements.editingAccountIdInput.value) { resetAndHideForm(); } else { elements.addAccountForm.classList.toggle('hidden'); } });
        elements.cancelEditBtn.addEventListener('click', resetAndHideForm);
        elements.stockTab.addEventListener('click', () => switchView('stock-view'));
        elements.historyTab.addEventListener('click', () => switchView('history-view'));
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
        elements.accountRegionSelect.innerHTML = '';
        COUNTRIES.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            elements.accountRegionSelect.appendChild(option);
        });
        elements.accountRegionSelect.value = "Indonesia";
    }
    
    init();
});
