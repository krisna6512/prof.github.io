document.addEventListener('DOMContentLoaded', () => {
    // Get references to HTML elements
    const gmailAccountInput = document.getElementById('gmail-account');
    const moontonPasswordInput = document.getElementById('moonton-password');
    const mlbbIdInput = document.getElementById('mlbb-id');
    const accountRegionSelect = document.getElementById('account-region');
    const photoUploadInput = document.getElementById('photo-upload');
    const photoPreviewImg = document.getElementById('photo-preview');
    const accountTierSelect = document.getElementById('account-tier');
    const addedDateInput = document.getElementById('added-date');
    const addAccountBtn = document.getElementById('add-account-btn');
    const accountsListDiv = document.getElementById('accounts-list');
    const messageArea = document.getElementById('message-area');
    const totalAccountsSpan = document.getElementById('total-accounts');
    const searchInput = document.getElementById('search-input');

    // References for the zoom modal
    const zoomModal = document.getElementById('zoom-modal');
    const closeZoomBtn = document.getElementById('close-zoom-btn');
    const zoomedImage = document.getElementById('zoomed-image');
    
    // Key for storing data in localStorage
    const STORAGE_KEY = 'mlbbAccounts';

    // Tier order for sorting
    const TIER_ORDER = [
        'senior-v', 'senior-iv', 'senior-iii', 'senior-ii', 'senior-i',
        'ahli-v', 'ahli-iv', 'ahli-iii', 'ahli-ii', 'ahli-i',
        'ternama-v', 'ternama-iv', 'ternama-iii', 'ternama-ii', 'ternama-i',
        'terhormat-v', 'terhormat-iv', 'terhormat-iii', 'terhormat-ii', 'terhormat-i',
        'juragan-v', 'juragan-iv', 'juragan-iii', 'juragan-ii', 'juragan-i',
        'sultan'
    ];
    
    // Country list for region dropdown
    const countries = ["Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo, Democratic Republic of the","Congo, Republic of the","Costa Rica","Cote d'Ivoire","Croatia","Cuba","Cyprus","Czechia","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States of America","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"];

    /**
     * Menampilkan notifikasi toast di pojok kanan atas.
     * @param {string} message - Pesan yang akan ditampilkan.
     * @param {string} type - Tipe notifikasi ('success' atau 'sold').
     */
    function showToast(message, type) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = type === 'success' ? '✅' : '💰';
        toast.innerHTML = `<span>${icon}</span> ${message}`;

        toastContainer.appendChild(toast);

        // Hapus toast setelah animasi selesai (durasi animasi 4 detik)
        setTimeout(() => {
            toast.remove();
        }, 4000);
    }

    /**
     * Populates the region dropdown with the country list.
     */
    function populateRegions() {
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            accountRegionSelect.appendChild(option);
        });
        if (countries.includes("Indonesia")) {
            accountRegionSelect.value = "Indonesia";
        }
    }

    let messageTimer; // Variabel untuk menampung timer pesan
    /**
     * Displays a temporary message in the message area.
     * @param {string} message - The text message to display.
     * @param {string} type - The type of message ('info', 'success', 'error', 'warning').
     */
    function showMessage(message, type = 'info') {
        clearTimeout(messageTimer); // Hapus timer yang ada jika ada
        messageArea.textContent = message;
        messageArea.className = 'text-center mb-4 p-3 rounded-md'; // Reset classes
        switch (type) {
            case 'success': messageArea.classList.add('bg-green-600', 'text-white'); break;
            case 'error': messageArea.classList.add('bg-red-600', 'text-white'); break;
            case 'warning': messageArea.classList.add('bg-yellow-600', 'text-white'); break;
            default: messageArea.classList.add('bg-blue-600', 'text-white'); break;
        }
        messageArea.classList.remove('hidden');

        // Atur timer untuk menyembunyikan pesan setelah 4 detik
        messageTimer = setTimeout(() => {
            messageArea.classList.add('hidden');
        }, 4000);
    }

    /**
     * Updates the total account count in the UI.
     * @param {number} count - The number of accounts to display.
     */
    function updateAccountCount(count) {
        totalAccountsSpan.textContent = `Total: ${count}`;
    }

    /**
     * Loads accounts, sorts them, filters based on search, and displays them.
     */
    function loadAccounts() {
        try {
            const accounts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
            const searchTerm = searchInput.value.toLowerCase();
            accounts.sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
            const filteredAccounts = accounts.filter(account => 
                account.tier.replace('-', ' ').includes(searchTerm)
            );
            accountsListDiv.innerHTML = '';
            if (filteredAccounts.length === 0) {
                accountsListDiv.innerHTML = `<p class="text-gray-400 text-center col-span-full">${searchTerm ? 'Tidak ada akun yang cocok.' : 'Belum ada akun tersimpan.'}</p>`;
            } else {
                filteredAccounts.forEach(account => displayAccount(account));
            }
            updateAccountCount(filteredAccounts.length);
        } catch (e) {
            console.error('Gagal memuat akun dari localStorage:', e);
            showMessage('Gagal memuat akun. Data mungkin rusak.', 'error');
        }
    }

    /**
     * Saves the list of accounts to localStorage.
     * @param {Array<Object>} accounts - Array of account objects to save.
     */
    function saveAccounts(accounts) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
        } catch (e) {
            console.error('Gagal menyimpan akun ke localStorage:', e);
            showMessage('Gagal menyimpan akun. Kuota penyimpanan mungkin penuh.', 'error');
        }
    }

    /**
     * Displays account details in a card format in the UI.
     * @param {Object} account - The account object to display.
     */
    function displayAccount(account) {
        const accountCard = document.createElement('div');
        accountCard.className = 'account-card bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700 flex flex-col items-center text-center account-card-enter';
        accountCard.dataset.id = account.id;
        const photoSrc = account.photoUrl || 'https://placehold.co/100x100/374151/F9FAFB?text=No+Photo';
        accountCard.innerHTML = `
            <img src="${photoSrc}" alt="Foto Profil" class="w-24 h-24 rounded-full object-cover mb-3 border-2 border-blue-500 cursor-pointer profile-img" onerror="this.onerror=null;this.src='https://placehold.co/100x100/374151/F9FAFB?text=No+Photo';">
            <p class="text-lg font-semibold text-white mb-1 break-all">${account.gmail}</p>
            <p class="text-sm text-gray-400 mb-2">Password: ${account.moontonPassword || 'N/A'}</p>
            <p class="text-sm text-gray-400 mb-2">ID MLBB: ${account.mlbbId || 'N/A'}</p>
            <p class="text-sm text-gray-400 mb-2">Region: ${account.region || 'N/A'}</p>
            <p class="text-md text-blue-400 font-medium mb-1">Tingkatan: <span class="capitalize">${account.tier.replace('-', ' ')}</span></p>
            <p class="text-sm text-gray-400 mb-3">Ditambahkan: ${account.addedDate || 'N/A'}</p>
            <div class="delete-options flex gap-2 mt-auto">
                <button class="delete-btn">Hapus</button>
            </div>`;
        const deleteButton = accountCard.querySelector('.delete-btn');
        const profileImage = accountCard.querySelector('.profile-img');
        profileImage.addEventListener('click', () => {
            zoomedImage.src = profileImage.src;
            zoomModal.classList.remove('hidden');
        });
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const deleteOptionsDiv = accountCard.querySelector('.delete-options');
            deleteButton.classList.add('hidden');
            const soldBtn = document.createElement('button');
            soldBtn.textContent = 'Sold';
            soldBtn.className = 'sold-btn';
            soldBtn.onclick = () => deleteAccount(account.id, 'sold');
            const keepBtn = document.createElement('button');
            keepBtn.textContent = 'Keep';
            keepBtn.className = 'keep-btn';
            keepBtn.onclick = () => {
                deleteOptionsDiv.innerHTML = '';
                deleteOptionsDiv.appendChild(deleteButton);
                deleteButton.classList.remove('hidden');
            };
            deleteOptionsDiv.innerHTML = '';
            deleteOptionsDiv.appendChild(soldBtn);
            deleteOptionsDiv.appendChild(keepBtn);
        });
        accountsListDiv.appendChild(accountCard);
    }

    searchInput.addEventListener('input', loadAccounts);

    photoUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => photoPreviewImg.src = e.target.result;
            reader.readAsDataURL(file);
        } else {
            photoPreviewImg.src = 'https://placehold.co/100x100/374151/F9FAFB?text=No+Photo';
        }
    });

    addAccountBtn.addEventListener('click', async () => {
        const gmail = gmailAccountInput.value.trim();
        if (gmail === '') {
            showMessage('Akun Gmail tidak boleh kosong!', 'error');
            return;
        }
        let photoDataUrl = '';
        const file = photoUploadInput.files[0];
        if (file) {
            try {
                photoDataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = (error) => reject(error);
                    reader.readAsDataURL(file);
                });
            } catch (error) {
                console.error('Error reading file:', error);
                showMessage('Gagal membaca file gambar.', 'error');
                return;
            }
        }
        const newAccount = {
            id: Date.now(),
            gmail: gmail,
            moontonPassword: moontonPasswordInput.value.trim(),
            mlbbId: mlbbIdInput.value.trim(),
            region: accountRegionSelect.value,
            photoUrl: photoDataUrl,
            tier: accountTierSelect.value,
            addedDate: addedDateInput.value
        };
        const accounts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        accounts.push(newAccount);
        saveAccounts(accounts);
        loadAccounts();
        
        showToast('Mantap nyetok trus juragan!', 'success');
        
        // Reset form fields
        gmailAccountInput.value = '';
        moontonPasswordInput.value = '';
        mlbbIdInput.value = '';
        photoUploadInput.value = '';
        photoPreviewImg.src = 'https://placehold.co/100x100/374151/F9FAFB?text=No+Photo';
        accountTierSelect.value = 'senior-v';
        accountRegionSelect.value = 'Indonesia';
        addedDateInput.value = '';
    });

    /**
     * Deletes an account and triggers an animation if it was sold.
     * @param {number} id - The unique ID of the account to delete.
     * @param {string} status - The reason for deletion ('sold' or 'keep').
     */
    function deleteAccount(id, status) {
        let accounts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        accounts = accounts.filter(account => account.id !== id);
        saveAccounts(accounts);
        loadAccounts();
        
        if (status === 'sold') {
            showToast('SOLD, JURAGAN MANTAP!', 'sold');
        }
    }

    closeZoomBtn.addEventListener('click', () => zoomModal.classList.add('hidden'));
    zoomModal.addEventListener('click', (e) => {
        if (e.target === zoomModal) zoomModal.classList.add('hidden');
    });
    zoomedImage.addEventListener('click', () => zoomedImage.classList.toggle('zoom-in'));

    populateRegions();
    loadAccounts();
});
