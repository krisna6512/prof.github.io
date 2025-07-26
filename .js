document.addEventListener('DOMContentLoaded', () => {
    const gmailAccountInput = document.getElementById('gmail-account');
    const mlbbIdInput = document.getElementById('mlbb-id');
    const photoUrlInput = document.getElementById('photo-url');
    const accountTierSelect = document.getElementById('account-tier');
    const addAccountBtn = document.getElementById('add-account-btn');
    const accountsListDiv = document.getElementById('accounts-list');

    // Kunci untuk menyimpan data di localStorage
    const STORAGE_KEY = 'mlbbAccounts';

    // Fungsi untuk memuat akun dari localStorage
    function loadAccounts() {
        const accounts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        accountsListDiv.innerHTML = ''; // Bersihkan daftar sebelum memuat ulang
        accounts.forEach(account => displayAccount(account));
    }

    // Fungsi untuk menyimpan akun ke localStorage
    function saveAccounts(accounts) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    }

    // Fungsi untuk menampilkan akun di UI
    function displayAccount(account) {
        const accountCard = document.createElement('div');
        accountCard.className = 'bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700 flex flex-col items-center text-center';
        accountCard.dataset.id = account.id; // Simpan ID untuk penghapusan

        // Placeholder untuk foto profil jika tidak ada URL yang diberikan atau URL tidak valid
        const photoSrc = account.photoUrl || 'https://placehold.co/100x100/374151/F9FAFB?text=No+Photo';

        accountCard.innerHTML = `
            <img src="${photoSrc}" alt="Foto Profil" class="w-24 h-24 rounded-full object-cover mb-3 border-2 border-blue-500" onerror="this.onerror=null;this.src='https://placehold.co/100x100/374151/F9FAFB?text=No+Photo';">
            <p class="text-lg font-semibold text-white mb-1">${account.gmail}</p>
            <p class="text-sm text-gray-400 mb-2">ID MLBB: ${account.mlbbId || 'Tidak Ada'}</p>
            <p class="text-md text-blue-400 font-medium mb-3">Tingkatan: <span class="capitalize">${account.tier}</span></p>
            <button class="delete-btn px-4 py-2 rounded-md font-semibold hover:bg-red-600 transition-colors duration-200">Hapus</button>
        `;

        // Tambahkan event listener untuk tombol hapus
        const deleteButton = accountCard.querySelector('.delete-btn');
        deleteButton.addEventListener('click', () => {
            deleteAccount(account.id);
        });

        accountsListDiv.appendChild(accountCard);
    }

    // Fungsi untuk menambahkan akun baru
    addAccountBtn.addEventListener('click', () => {
        const gmail = gmailAccountInput.value.trim();
        const mlbbId = mlbbIdInput.value.trim();
        const photoUrl = photoUrlInput.value.trim();
        const tier = accountTierSelect.value;

        if (gmail === '') {
            alert('Akun Gmail tidak boleh kosong!'); // Menggunakan alert sementara, bisa diganti dengan modal kustom
            return;
        }

        const newAccount = {
            id: Date.now(), // ID unik berdasarkan timestamp
            gmail: gmail,
            mlbbId: mlbbId,
            photoUrl: photoUrl,
            tier: tier
        };

        const accounts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        accounts.push(newAccount);
        saveAccounts(accounts);
        displayAccount(newAccount); // Tampilkan akun yang baru ditambahkan

        // Bersihkan input form
        gmailAccountInput.value = '';
        mlbbIdInput.value = '';
        photoUrlInput.value = '';
        accountTierSelect.value = 'senior'; // Reset ke pilihan default
    });

    // Fungsi untuk menghapus akun
    function deleteAccount(id) {
        let accounts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        accounts = accounts.filter(account => account.id !== id);
        saveAccounts(accounts);
        // Muat ulang daftar untuk mencerminkan perubahan
        loadAccounts();
    }

    // Muat akun saat halaman pertama kali dimuat
    loadAccounts();
});
