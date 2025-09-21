document.addEventListener('DOMContentLoaded', () => {
    const accessTokenInput = document.getElementById('accessToken');
    const saveTokenButton = document.getElementById('saveToken');
    const botList = document.getElementById('bot-list');
    const accountButton = document.getElementById('account-button');
    const accountName = document.getElementById('account-name');
    const accountAvatar = document.getElementById('account-avatar');
    const popupContainer = document.getElementById('popup-container');
    const cancelTokenButton = document.getElementById('cancelToken');

    // Bot Details Popup Elements
    const botDetailsPopup = document.getElementById('bot-details-popup');
    const botDetailsForm = document.getElementById('bot-details-form');
    const botNameInput = document.getElementById('bot-name-input');
    const botIdDisplay = document.getElementById('bot-id-display');
    const botGroupSelect = document.getElementById('bot-group-select');
    const botCallbackInput = document.getElementById('bot-callback-input');
    const cancelUpdateBotButton = document.getElementById('cancelUpdateBot');
    const botAvatar = document.getElementById('bot-avatar');
    const avatarUploadInput = document.getElementById('avatar-upload-input');

    const GROUPME_API_URL = 'https://api.groupme.com/v3';
    let currentBot = null;

    // --- Popup Handling ---
    const showTokenPopup = () => popupContainer.classList.remove('hidden');
    const hideTokenPopup = () => popupContainer.classList.add('hidden');
    const showBotDetailsPopup = () => botDetailsPopup.classList.remove('hidden');
    const hideBotDetailsPopup = () => {
        botDetailsPopup.classList.add('hidden');
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
            accountAvatar.src = user.image_url || '../Assets/Sample Avatar.png';
        } catch (error) {
            console.error('Error fetching user:', error);
            accountName.textContent = 'Account';
            accountAvatar.src = '../Assets/Error Avatar.png';
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
            botList.innerHTML = '<li>Please save your access token to see your bots.</li>';
            return;
        }
        botList.innerHTML = '<li>Loading bots...</li>';
        try {
            const response = await fetch(`${GROUPME_API_URL}/bots?token=${token}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const botsData = await response.json();
            displayBots(botsData.response);
        } catch (error) {
            console.error('Error fetching bots:', error);
            botList.innerHTML = '<li>Error fetching bots. Check your token and network connection.</li>';
        }
    };

    const displayBots = (bots) => {
        botList.innerHTML = '';
        if (bots.length === 0) {
            botList.innerHTML = '<li>No bots found for this account.</li>';
            return;
        }
        bots.sort((a, b) => a.name.localeCompare(b.name));
        bots.forEach(bot => {
            const listItem = document.createElement('li');
            listItem.addEventListener('click', () => openBotDetails(bot));

            const avatar = document.createElement('img');
            avatar.src = bot.avatar_url || '../Assets/Sample Avatar.png';
            avatar.onerror = () => { avatar.src = '../Assets/Error Avatar.png'; };
            avatar.alt = `${bot.name} avatar`;

            const botInfo = document.createElement('div');
            botInfo.className = 'bot-info';

            const botName = document.createElement('div');
            botName.className = 'bot-name';
            botName.textContent = bot.name;

            const groupName = document.createElement('div');
            groupName.textContent = bot.group_name;

            botInfo.appendChild(botName);
            botInfo.appendChild(groupName);
            listItem.appendChild(avatar);
            listItem.appendChild(botInfo);
            botList.appendChild(listItem);
        });
    };

    const openBotDetails = async (bot) => {
        currentBot = bot;
        botAvatar.src = bot.avatar_url || '../Assets/Sample Avatar.png';
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

    const uploadAvatar = async (file) => {
        const token = localStorage.getItem('groupmeAccessToken');
        if (!token) {
            alert('Authentication error. Please save your token again.');
            return;
        }

        try {
            // The GroupMe image service endpoint
            const response = await fetch('https://image.groupme.com/pictures', {
                method: 'POST',
                headers: {
                    'X-Access-Token': token,
                    'Content-Type': file.type
                },
                body: file
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

        console.log('handleBotUpdate called. Current Bot:', currentBot);
        console.log('New Group ID:', newGroupId);
        console.log('Current Bot Group ID:', currentBot.group_id);

        // Check if the group has changed
        if (newGroupId !== currentBot.group_id) {
            console.log('Group has changed. Initiating move process.');
            // --- Group has changed: Delete and recreate bot ---
            try {
                let avatarBlobToUpload = null;
                // 1. Fetch the current bot's avatar as a Blob if it exists
                if (currentBot.avatar_url) {
                    console.log('Attempting to fetch avatar from:', currentBot.avatar_url);
                    try {
                        avatarBlobToUpload = await fetchAvatarAsBlob(currentBot.avatar_url);
                        console.log('Avatar Blob fetched:', avatarBlobToUpload);
                    } catch (avatarError) {
                        console.warn('Could not fetch avatar, proceeding without it for now:', avatarError);
                    }
                }

                // 2. Delete the old bot
                console.log('Deleting old bot with ID:', currentBot.bot_id);
                await deleteBot(currentBot.bot_id, token);
                console.log('Old bot deleted.');

                // 3. Create a new bot without the avatar initially
                console.log('Creating new bot in group:', newGroupId);
                const newBotResponse = await createBot(name, newGroupId, null, callbackUrl, token);
                const newBotId = newBotResponse.response.bot.bot_id;
                console.log('New bot created. Response:', newBotResponse);
                console.log('New Bot ID:', newBotId);

                // 4. If an avatar was fetched, upload it and update the new bot
                if (avatarBlobToUpload && newBotId) {
                    console.log('Avatar Blob exists and new Bot ID is available. Attempting to upload and update avatar.');
                    try {
                        const uploadedAvatarUrl = await uploadAvatarBlob(avatarBlobToUpload, token);
                        console.log('Uploaded Avatar URL:', uploadedAvatarUrl);
                        if (uploadedAvatarUrl) {
                            console.log('Updating new bot with avatar URL:', uploadedAvatarUrl);
                            await updateBotAvatar(newBotId, uploadedAvatarUrl, token);
                            console.log('New bot avatar updated successfully.');
                        } else {
                            console.warn('Uploaded avatar URL is null or empty.');
                        }
                    } catch (uploadError) {
                        console.warn('Could not re-upload avatar for new bot:', uploadError);
                    }
                } else {
                    console.log('No avatar blob to upload or new bot ID is missing.');
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
            console.log('Group is the same. Updating bot details.');
            try {
                const botPayload = {
                    bot_id: currentBot.bot_id,
                    name: name,
                    callback_url: callbackUrl,
                    avatar_url: avatarUrl
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
            const response = await fetch(avatarUrl);
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
            const response = await fetch('https://image.groupme.com/pictures', {
                method: 'POST',
                headers: {
                    'X-Access-Token': token,
                    'Content-Type': avatarBlob.type
                },
                body: avatarBlob
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

    // --- Initial Load ---
    loadToken();
});
