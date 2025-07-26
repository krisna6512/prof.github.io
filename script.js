document.addEventListener('DOMContentLoaded', () => {
    // Get references to HTML elements
    const gmailAccountInput = document.getElementById('gmail-account');
    const moontonPasswordInput = document.getElementById('moonton-password');
    const mlbbIdInput = document.getElementById('mlbb-id');
    const photoUploadInput = document.getElementById('photo-upload');
    const photoPreviewImg = document.getElementById('photo-preview');
    const accountTierSelect = document.getElementById('account-tier');
    const addedDateInput = document.getElementById('added-date'); // Reference for date input
    const addAccountBtn = document.getElementById('add-account-btn');
    const accountsListDiv = document.getElementById('accounts-list');
    const messageArea = document.getElementById('message-area');

    // References for the zoom modal
    const zoomModal = document.getElementById('zoom-modal');
    const closeZoomBtn = document.getElementById('close-zoom-btn');
    const zoomedImage = document.getElementById('zoomed-image');

    // Key for storing data in localStorage
    const STORAGE_KEY = 'mlbbAccounts';

    /**
     * Displays a temporary message in the message area.
     * @param {string} message - The text message to display.
     * @param {string} type - The type of message ('info', 'success', 'error', 'warning').
     */
    function showMessage(message, type = 'info') {
        messageArea.textContent = message;
        // Remove all color-related classes and hide previously
        messageArea.classList.remove('hidden', 'bg-green-600', 'bg-red-600', 'bg-blue-600', 'bg-yellow-600', 'text-white');
        
        // Add color classes based on message type
        if (type === 'success') {
            messageArea.classList.add('bg-green-600', 'text-white');
        } else if (type === 'error') {
            messageArea.classList.add('bg-red-600', 'text-white');
        } else if (type === 'warning') {
            messageArea.classList.add('bg-yellow-600', 'text-white');
        } else {
            messageArea.classList.add('bg-blue-600', 'text-white');
        }
        messageArea.classList.remove('hidden'); // Show the message area
        
        // Hide the message after 3 seconds
        setTimeout(() => {
            messageArea.classList.add('hidden');
        }, 3000);
    }

    /**
     * Loads the list of accounts from localStorage and displays them in the UI.
     */
    function loadAccounts() {
        try {
            const accounts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
            console.log('Memuat akun dari localStorage:', accounts); // Log for debugging
            accountsListDiv.innerHTML = ''; // Clear the list before reloading
            
            // Display message if no accounts are saved
            if (accounts.length === 0) {
                accountsListDiv.innerHTML = '<p class="text-gray-400 text-center col-span-full">Belum ada akun yang tersimpan.</p>';
            }
            // Display each loaded account
            accounts.forEach(account => displayAccount(account));
        } catch (e) {
            console.error('Gagal memuat akun dari localStorage:', e); // Log error
            showMessage('Gagal memuat akun. Data mungkin rusak atau browser memblokir akses penyimpanan.', 'error');
        }
    }

    /**
     * Saves the list of accounts to localStorage.
     * @param {Array<Object>} accounts - Array of account objects to save.
     */
    function saveAccounts(accounts) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
            console.log('Akun disimpan ke localStorage:', accounts); // Log for debugging
        } catch (e) {
            console.error('Gagal menyimpan akun ke localStorage:', e); // Log error
            showMessage('Gagal menyimpan akun. Browser mungkin memblokir penyimpanan atau kuota penuh.', 'error');
        }
    }

    /**
     * Displays account details in a card format in the UI.
     * @param {Object} account - The account object to display.
     */
    function displayAccount(account) {
        const accountCard = document.createElement('div');
        accountCard.className = 'bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700 flex flex-col items-center text-center';
        accountCard.dataset.id = account.id; // Store account ID as a data-attribute for deletion

        // Determine profile photo URL or use a placeholder if none/invalid
        const photoSrc = account.photoUrl || 'https://placehold.co/100x100/374151/F9FAFB?text=No+Photo';

        accountCard.innerHTML = `
            <img src="${photoSrc}" alt="Foto Profil" class="w-24 h-24 rounded-full object-cover mb-3 border-2 border-blue-500 cursor-pointer profile-img" onerror="this.onerror=null;this.src='https://placehold.co/100x100/374151/F9FAFB?text=No+Photo';">
            <p class="text-lg font-semibold text-white mb-1">${account.gmail}</p>
            <p class="text-sm text-gray-400 mb-2">Password Moonton: ${account.moontonPassword || 'Tidak Ada'}</p>
            <p class="text-sm text-gray-400 mb-2">ID MLBB: ${account.mlbbId || 'Tidak Ada'}</p>
            <p class="text-md text-blue-400 font-medium mb-1">Tingkatan: <span class="capitalize">${account.tier}</span></p>
            <p class="text-sm text-gray-400 mb-3">Ditambahkan: ${account.addedDate || 'Tidak Ada'}</p>
            <div class="delete-options flex gap-2">
                <button class="delete-btn px-4 py-2 rounded-md font-semibold hover:bg-red-600 transition-colors duration-200">Hapus</button>
            </div>
        `;

        const deleteButton = accountCard.querySelector('.delete-btn');
        const deleteOptionsDiv = accountCard.querySelector('.delete-options');
        const profileImage = accountCard.querySelector('.profile-img'); // Get the profile image element

        // Add event listener for profile image click to open zoom modal
        profileImage.addEventListener('click', () => {
            zoomedImage.src = profileImage.src; // Set the source of the zoomed image
            zoomModal.classList.remove('hidden'); // Show the modal
            zoomedImage.classList.remove('zoom-in'); // Reset zoom state
        });

        // Add event listener for the 'Hapus' button
        deleteButton.addEventListener('click', () => {
            // Hide the original delete button
            deleteButton.classList.add('hidden');

            // Create 'Sold' button
            const soldBtn = document.createElement('button');
            soldBtn.textContent = 'Sold';
            soldBtn.className = 'sold-btn'; // Use predefined CSS class
            soldBtn.addEventListener('click', () => {
                deleteAccount(account.id, 'sold'); // Call deleteAccount function with 'sold' status
            });

            // Create 'Keep' button
            const keepBtn = document.createElement('button');
            keepBtn.textContent = 'Keep';
            keepBtn.className = 'keep-btn'; // Use predefined CSS class
            keepBtn.addEventListener('click', () => {
                // When 'Keep' is pressed, do not delete the account, restore UI
                deleteOptionsDiv.removeChild(soldBtn); // Remove Sold button
                deleteOptionsDiv.removeChild(keepBtn); // Remove Keep button
                deleteButton.classList.remove('hidden'); // Show original Hapus button again
                showMessage('Akun disimpan kembali!', 'info'); // Provide an info message
            });

            // Add 'Sold' and 'Keep' buttons to the delete options div
            deleteOptionsDiv.appendChild(soldBtn);
            deleteOptionsDiv.appendChild(keepBtn);
        });

        accountsListDiv.appendChild(accountCard);
    }

    // Event listener for file input to display image preview
    photoUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                photoPreviewImg.src = e.target.result; // Display image preview
            };
            reader.readAsDataURL(file); // Read file as Data URL (Base64)
        } else {
            photoPreviewImg.src = 'https://placehold.co/100x100/374151/F9FAFB?text=No+Photo'; // Reset to placeholder if no file
        }
    });

    /**
     * Adds a new account to the list.
     */
    addAccountBtn.addEventListener('click', async () => { // Change function to async
        const gmail = gmailAccountInput.value.trim();
        const moontonPassword = moontonPasswordInput.value.trim();
        const mlbbId = mlbbIdInput.value.trim();
        const tier = accountTierSelect.value;
        const addedDate = addedDateInput.value; // Get the date value

        // Get the uploaded file
        let photoDataUrl = '';
        const file = photoUploadInput.files[0];
        if (file) {
            try {
                // Read the file as a Data URL asynchronously
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

        // Validate Gmail input
        if (gmail === '') {
            showMessage('Akun Gmail tidak boleh kosong!', 'error');
            return;
        }

        // Create new account object
        const newAccount = {
            id: Date.now(), // Unique ID based on timestamp
            gmail: gmail,
            moontonPassword: moontonPassword,
            mlbbId: mlbbId,
            photoUrl: photoDataUrl, // Store Data URL (Base64) of the image
            tier: tier,
            addedDate: addedDate // Store the added date
        };

        // Load existing accounts, add new account, then save again
        const accounts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        accounts.push(newAccount);
        saveAccounts(accounts);
        displayAccount(newAccount); // Display the newly added account in the UI
        showMessage('Akun berhasil ditambahkan!', 'success');

        // Clear form inputs after adding
        gmailAccountInput.value = '';
        moontonPasswordInput.value = '';
        mlbbIdInput.value = '';
        photoUploadInput.value = ''; // Clear file input
        photoPreviewImg.src = 'https://placehold.co/100x100/374151/F9FAFB?text=No+Photo'; // Reset preview
        accountTierSelect.value = 'senior-v'; // Reset to default selection (first option)
        addedDateInput.value = ''; // Clear the date input
    });

    /**
     * Deletes an account from the list and localStorage.
     * @param {number} id - Unique ID of the account to delete.
     * @param {string} status - Deletion status ('sold' or 'kept').
     */
    function deleteAccount(id, status) {
        let accounts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        const initialLength = accounts.length;
        // Filter accounts, keeping only those whose ID does not match the one to be deleted
        accounts = accounts.filter(account => account.id !== id);

        if (accounts.length < initialLength) {
            saveAccounts(accounts); // Save the updated list
            loadAccounts(); // Reload the list in the UI to reflect changes
            showMessage(`Akun berhasil dihapus (${status === 'sold' ? 'Sold' : 'Keep'})!`, 'success');
        } else {
            showMessage('Gagal menghapus akun.', 'error');
        }
    }

    // --- Zoom Modal Functionality ---
    // Close modal when close button is clicked
    closeZoomBtn.addEventListener('click', () => {
        zoomModal.classList.add('hidden');
    });

    // Close modal when clicking outside the image (on the modal background)
    zoomModal.addEventListener('click', (e) => {
        if (e.target === zoomModal) { // Only close if the click is directly on the modal background
            zoomModal.classList.add('hidden');
        }
    });

    // Toggle zoom level when zoomed image is clicked
    zoomedImage.addEventListener('click', () => {
        zoomedImage.classList.toggle('zoom-in');
    });

    // Load accounts when the page is first loaded
    loadAccounts();
});
