document.addEventListener('DOMContentLoaded', () => {
    const accessTokenInput = document.getElementById('accessToken');
    const saveTokenButton = document.getElementById('saveToken');
    const cancelTokenButton = document.getElementById('cancelToken');
    const botList = document.getElementById('bot-list');
    const accountButton = document.getElementById('account-button');
    const accountName = document.getElementById('account-name');
    const accountAvatar = document.getElementById('account-avatar');

    // Bot Details Popup Elements
    const botDetailsForm = document.getElementById('bot-details-form');
    const botNameInput = document.getElementById('bot-name-input');
    const botIdDisplay = document.getElementById('bot-id-display');
    const botGroupSelect = document.getElementById('bot-group-select');
    const botCallbackInput = document.getElementById('bot-callback-input');
    const cancelUpdateBotButton = document.getElementById('cancelUpdateBot');
    const botAvatar = document.getElementById('bot-avatar');
    const avatarUploadInput = document.getElementById('avatar-upload-input');
    const deleteAvatarButton = document.getElementById('delete-avatar-button');

    const GROUPME_API_URL = 'https://api.groupme.com/v3';
    let currentBot = null;

    // Bootstrap Modal Instances
    const accessTokenModal = new bootstrap.Modal(document.getElementById('accessTokenModal'));
    const botDetailsModal = new bootstrap.Modal(document.getElementById('botDetailsModal'));

    // --- Popup Handling ---
    const showTokenPopup = () => accessTokenModal.show();
    const hideTokenPopup = () => accessTokenModal.hide();
    const showBotDetailsPopup = () => botDetailsModal.show();
    const hideBotDetailsPopup = () => {
        botDetailsModal.hide();
        currentBot = null;
    };

    // --- Token and User Functions ---
    const loadToken = () => {
        const token = localStorage.getItem('groupmeAccessToken');
        if (token) {
            fetchUser(token);
            fetchBots(token);
        } else {
            showTokenPopup();
        }
    };

    const saveToken = () => {
        const token = accessTokenInput.value.trim();
        if (token) {
            localStorage.setItem('groupmeAccessToken', token);
            hideTokenPopup();
            fetchUser(token);
            fetchBots(token);
        } else {
            alert('Please enter a token.');
        }
    };

    const fetchUser = async (token) => {
        try {
            const response = await fetch(`${GROUPME_API_URL}/users/me?token=${token}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const userData = await response.json();
            const user = userData.response;
            accountName.textContent = user.name;
            accountAvatar.src = user.image_url || 'Assets/account avatar.jpg';
        } catch (error) {
            console.error('Error fetching user:', error);
            accountName.textContent = 'Account';
            accountAvatar.src = 'Assets/Error Avatar.png';
            showTokenPopup(); // If user fetch fails, token is likely bad
        }
    };

    // --- Group Functions ---
    const fetchGroups = async (token) => {
        try {
            const response = await fetch(`${GROUPME_API_URL}/groups?token=${token}&per_page=100`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const groupsData = await response.json();
            return groupsData.response;
        } catch (error) {
            console.error('Error fetching groups:', error);
            alert('Could not load your groups. Please check your connection and token.');
            return [];
        }
    };

    // --- Bot Functions ---
    const fetchBots = async (token) => {
        if (!token) {
            botList.innerHTML = '<div class="col text-center"><p class="text-muted">Please save your access token to see your bots.</p></div>';
            return;
        }
        botList.innerHTML = '<div class="col text-center"><p class="text-muted">Loading bots...</p></div>';
        try {
            const response = await fetch(`${GROUPME_API_URL}/bots?token=${token}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const botsData = await response.json();
            displayBots(botsData.response);
        } catch (error) {
            console.error('Error fetching bots:', error);
            botList.innerHTML = '<div class="col text-center"><p class="text-muted">Error fetching bots. Check your token and network connection.</p></div>';
        }
    };

    const displayBots = (bots) => {
        botList.innerHTML = '';
        if (bots.length === 0) {
            const noBotsMessage = document.createElement('div');
            noBotsMessage.classList.add('col', 'text-center');
            noBotsMessage.innerHTML = '<p class="text-muted">No bots found for this account.</p>';
            botList.appendChild(noBotsMessage);
            return;
        }
        bots.sort((a, b) => a.name.localeCompare(b.name));
        bots.forEach(bot => {
            const colDiv = document.createElement('div');
            colDiv.classList.add('col');

            const card = document.createElement('div');
            card.classList.add('card', 'h-100', 'shadow-sm', 'bot-card');
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => openBotDetails(bot));

            const avatarContainer = document.createElement('div');
            avatarContainer.classList.add('d-flex', 'justify-content-center', 'pt-3');

            const avatar = document.createElement('img');
            avatar.src = bot.avatar_url || 'Assets/Sample Avatar.png';
            avatar.onerror = () => { avatar.src = 'Assets/Error Avatar.png'; };
            avatar.alt = `${bot.name} avatar`;
            avatar.classList.add('rounded-circle');
            avatar.style.width = '80px';
            avatar.style.height = '80px';
            avatar.style.objectFit = 'cover';

            avatarContainer.appendChild(avatar);

            const cardBody = document.createElement('div');
            cardBody.classList.add('card-body', 'text-center');

            const botName = document.createElement('h5');
            botName.classList.add('card-title', 'fw-bold');
            botName.textContent = bot.name;

            const groupName = document.createElement('p');
            groupName.classList.add('card-text', 'text-muted', 'small');
            groupName.textContent = bot.group_name;

            cardBody.appendChild(botName);
            cardBody.appendChild(groupName);
            card.appendChild(avatarContainer);
            card.appendChild(cardBody);
            colDiv.appendChild(card);
            botList.appendChild(colDiv);
        });
    };

    const openBotDetails = async (bot) => {
        currentBot = bot;
        botAvatar.src = bot.avatar_url && bot.avatar_url !== '' ? bot.avatar_url : 'Assets/Sample Avatar.png';
        botAvatar.onerror = () => { botAvatar.src = 'Assets/Error Avatar.png'; };

        if (bot.avatar_url && bot.avatar_url !== '') {
            deleteAvatarButton.classList.remove('hidden');
        } else {
            deleteAvatarButton.classList.add('hidden');
        }
        botNameInput.value = bot.name;
        botIdDisplay.textContent = bot.bot_id;
        botCallbackInput.value = bot.callback_url || '';

        const token = localStorage.getItem('groupmeAccessToken');
        const groups = await fetchGroups(token);
        groups.sort((a, b) => a.name.localeCompare(b.name)); // Sort groups alphabetically
        botGroupSelect.innerHTML = '';
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name;
            if (group.id === bot.group_id) {
                option.selected = true;
            }
            botGroupSelect.appendChild(option);
        });

        showBotDetailsPopup();
    };

    const convertImageToJpegBlob = (imageFileOrBlob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Canvas to Blob conversion failed.'));
                        }
                    }, 'image/jpeg', 0.9); // Convert to JPEG with 90% quality
                };
                img.onerror = (error) => reject(new Error('Image loading failed: ' + error.message));
                img.src = event.target.result;
            };
            reader.onerror = (error) => reject(new Error('FileReader failed: ' + error.message));
            reader.readAsDataURL(imageFileOrBlob);
        });
    };

    const uploadAvatar = async (file) => {
        const token = localStorage.getItem('groupmeAccessToken');
        if (!token) {
            alert('Authentication error. Please save your token again.');
            return;
        }

        try {
            const jpegBlob = await convertImageToJpegBlob(file);

            // The GroupMe image service endpoint
            const response = await fetch('https://image.groupme.com/pictures', {
                method: 'POST',
                headers: {
                    'X-Access-Token': token,
                    'Content-Type': jpegBlob.type // Should be 'image/jpeg'
                },
                body: jpegBlob
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to upload image: ${errorText}`);
            }

            const data = await response.json();
            const newAvatarUrl = data.payload.url;

            // Update the bot's avatar in the UI immediately
            botAvatar.src = newAvatarUrl;
            // Store the new URL in our currentBot object to be saved
            currentBot.avatar_url = newAvatarUrl;

        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert(`Error uploading avatar: ${error.message}`);
        }
    };

    const updateBotAvatar = async (botId, newAvatarUrl, token) => {
        const botPayload = {
            bot_id: botId,
            avatar_url: newAvatarUrl
        };

        const response = await fetch(`${GROUPME_API_URL}/bots/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Access-Token': token
            },
            body: JSON.stringify({ bot: botPayload })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update bot avatar: ${errorText}`);
        }
        return await response.json();
    };

    const handleBotUpdate = async (event) => {
        event.preventDefault();
        const token = localStorage.getItem('groupmeAccessToken');
        if (!token || !currentBot) {
            alert('Authentication error or no bot selected.');
            return;
        }

        const newGroupId = botGroupSelect.value;
        const name = botNameInput.value.trim();
        const callbackUrl = botCallbackInput.value.trim();
        const avatarUrl = currentBot.avatar_url; // Use the potentially updated avatar_url

        // Check if the group has changed
        if (newGroupId !== currentBot.group_id) {
            // --- Group has changed: Delete and recreate bot ---
            try {
                let avatarBlobToUpload = null;
                // 1. Fetch the current bot's avatar as a Blob if it exists
                if (currentBot.avatar_url) {
                    try {
                        avatarBlobToUpload = await fetchAvatarAsBlob(currentBot.avatar_url);
                    } catch (avatarError) {
                        console.warn('Could not fetch avatar, proceeding without it for now:', avatarError);
                    }
                }

                // 2. Delete the old bot
                await deleteBot(currentBot.bot_id, token);

                // 3. Create a new bot without the avatar initially
                const newBotResponse = await createBot(name, newGroupId, null, callbackUrl, token);
                const newBotId = newBotResponse.response.bot.bot_id;

                // 4. If an avatar was fetched, upload it and update the new bot
                if (avatarBlobToUpload && newBotId) {
                    try {
                        const uploadedAvatarUrl = await uploadAvatarBlob(avatarBlobToUpload, token);
                        if (uploadedAvatarUrl) {
                            await updateBotAvatar(newBotId, uploadedAvatarUrl, token);
                        }
                    } catch (uploadError) {
                        console.warn('Could not re-upload avatar for new bot:', uploadError);
                    }
                }

                alert('Bot successfully moved to the new group!');
                hideBotDetailsPopup();
                fetchBots(token); // Refresh the main bot list

            } catch (error) {
                console.error('Error moving bot:', error);
                alert(`Error moving bot: ${error.message}`);
                // Try to refresh the list anyway, in case the bot was deleted but not recreated
                fetchBots(token);
            }

        } else {
            // --- Group is the same: Just update details ---
            try {
                const botPayload = {
                    bot_id: currentBot.bot_id,
                    name: name,
                    avatar_url: avatarUrl
                };
                // Only include callback_url if it has changed or is being set
                if (callbackUrl !== (currentBot.callback_url || '')) {
                    botPayload.callback_url = callbackUrl;
                }

                const response = await fetch(`${GROUPME_API_URL}/bots/update`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Access-Token': token
                    },
                    body: JSON.stringify({ bot: botPayload })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to update bot: ${errorText}`);
                }

                alert('Bot updated successfully!');
                hideBotDetailsPopup();
                fetchBots(token); // Refresh bot list

            } catch (error) {
                console.error('Error updating bot:', error);
                alert(`Error updating bot: ${error.message}`);
            }
        }
    };

    const createBot = async (name, groupId, avatarUrl, callbackUrl, token) => {
        const botPayload = {
            name: name,
            group_id: groupId
        };
        if (avatarUrl) botPayload.avatar_url = avatarUrl;
        if (callbackUrl) botPayload.callback_url = callbackUrl;

        const response = await fetch(`${GROUPME_API_URL}/bots`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Access-Token': token
            },
            body: JSON.stringify({ bot: botPayload })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create new bot: ${errorText}`);
        }
        return await response.json();
    };

    const deleteBot = async (botId, token) => {
        const response = await fetch(`${GROUPME_API_URL}/bots/destroy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Access-Token': token
            },
            body: JSON.stringify({ bot_id: botId })
        });

        if (!response.ok) {
            const errorText = await response.text();
            // It's possible the bot is already gone, so we can be a bit lenient.
            if (response.status !== 404) {
                 throw new Error(`Failed to delete old bot: ${errorText}`);
            }
        }
    };

    // New function to fetch avatar as Blob
    const fetchAvatarAsBlob = async (avatarUrl) => {
        try {
            // Prepend CORS proxy to the avatarUrl
            const proxiedAvatarUrl = `https://corsproxy.io/?${encodeURIComponent(avatarUrl)}`;
            const response = await fetch(proxiedAvatarUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch avatar: ${response.statusText}`);
            }
            return await response.blob();
        } catch (error) {
            console.error('Error fetching avatar as blob:', error);
            return null;
        }
    };

    // New function to upload avatar Blob
    const uploadAvatarBlob = async (avatarBlob, token) => {
        if (!token) {
            alert('Authentication error. Please save your token again.');
            return null;
        }

        try {
            const jpegBlob = await convertImageToJpegBlob(avatarBlob);

            const response = await fetch('https://image.groupme.com/pictures', {
                method: 'POST',
                headers: {
                    'X-Access-Token': token,
                    'Content-Type': jpegBlob.type
                },
                body: jpegBlob
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to upload image: ${errorText}`);
            }

            const data = await response.json();
            return data.payload.url;

        } catch (error) {
            console.error('Error uploading avatar blob:', error);
            alert(`Error uploading avatar: ${error.message}`);
            return null;
        }
    };

    const deleteBotAvatar = async () => {
        if (!currentBot) return;

        currentBot.avatar_url = ''; // Set avatar_url to empty string
        botAvatar.src = 'Assets/Sample Avatar.png'; // Set to default placeholder
        deleteAvatarButton.classList.add('hidden'); // Hide the delete button

        // Persist the change by calling handleBotUpdate
        // We need to simulate the event object for handleBotUpdate
        await handleBotUpdate({ preventDefault: () => {} });
    };


    // --- Event Listeners ---
    avatarUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            uploadAvatar(file);
        }
    });
    accountButton.addEventListener('click', showTokenPopup);
    saveTokenButton.addEventListener('click', saveToken);
    cancelTokenButton.addEventListener('click', hideTokenPopup);
    botDetailsForm.addEventListener('submit', handleBotUpdate);
    cancelUpdateBotButton.addEventListener('click', hideBotDetailsPopup);
    deleteAvatarButton.addEventListener('click', deleteBotAvatar);

    // --- Initial Load ---
    loadToken();
});