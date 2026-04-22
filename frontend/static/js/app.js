// NiftyGroceries - Frontend JavaScript

const API_BASE = window.location.origin + '/api';
let categories = [];
let currentList = 'active';

// Touch tracking for swipe
let touchStartX = 0;
let touchStartY = 0;
let currentSwipedCard = null;

// DOM Elements (will be set on DOM load)
let searchInput, autocompleteDropdown, autocompleteResults;
let newItemPopup, newItemName, newItemCategory, newItemQuantity;
let listToggle, activeList, completeList, emptyState;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM elements
    searchInput = document.getElementById('search-input');
    autocompleteDropdown = document.getElementById('autocomplete-dropdown');
    autocompleteResults = document.getElementById('autocomplete-results');
    newItemPopup = document.getElementById('new-item-popup');
    newItemName = document.getElementById('new-item-name');
    newItemCategory = document.getElementById('new-item-category');
    newItemQuantity = document.getElementById('new-item-quantity');
    listToggle = document.getElementById('list-toggle');
    activeList = document.getElementById('active-list');
    completeList = document.getElementById('complete-list');
    emptyState = document.getElementById('empty-state');
    
    loadCategories();
    setupEventListeners();
    renderItems();
    
    // Check if there are any items
    checkEmptyState();
});

// Load categories from API
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories/`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        categories = await response.json();
        populateCategorySelect();
    } catch (error) {
        console.error('Error loading categories:', error);
        // Use default categories if API fails
        categories = [
            { id: 1, name: 'Zuivel', order: 1 },
            { id: 2, name: 'Groenten', order: 2 },
            { id: 3, name: 'Fruit', order: 3 },
            { id: 11, name: 'Overig', order: 11 }
        ];
        populateCategorySelect();
    }
}

// Populate category dropdown in new item popup
function populateCategorySelect() {
    newItemCategory.innerHTML = '<option value="">-- Selecteer categorie --</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        newItemCategory.appendChild(option);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Search input
    searchInput.addEventListener('input', debounce(handleSearchInput, 300));
    searchInput.addEventListener('focus', () => {
        if (searchInput.value.length >= 1) {
            handleSearchInput();
        }
    });
    
    // Hide autocomplete when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#search-input') && !e.target.closest('#autocomplete-dropdown')) {
            autocompleteDropdown.classList.add('hidden');
        }
    });
    
    // List toggle - update visual state
    listToggle.addEventListener('change', () => {
        toggleList();
        updateToggleButtons();
    });
    
    // Initialize toggle buttons
    updateToggleButtons();
    
    // Touch events for swipe
    document.querySelectorAll('.item-card').forEach(card => {
        setupSwipeListeners(card);
    });
}

// Handle search input with debounce
function handleSearchInput() {
    const query = searchInput.value.trim();
    if (query.length < 1) {
        autocompleteDropdown.classList.add('hidden');
        return;
    }
    
    searchItems(query);
}

// Search items via API
async function searchItems(query) {
    try {
        const response = await fetch(`${API_BASE}/items/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const items = await response.json();
        
        if (items.length === 0) {
            // Show option to create new item
            showNewItemOption(query);
        } else {
            showAutocompleteResults(items);
        }
    } catch (error) {
        console.error('Error searching items:', error);
        autocompleteDropdown.classList.add('hidden');
    }
}

// Show autocomplete results
function showAutocompleteResults(items) {
    autocompleteResults.innerHTML = '';
    
    // Group by category
    const grouped = {};
    items.forEach(item => {
        const cat = item.category_name || 'Overig';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
    });
    
    for (const [category, categoryItems] of Object.entries(grouped)) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'px-4 py-2 bg-gray-50 font-medium text-sm text-gray-700';
        categoryDiv.textContent = category;
        autocompleteResults.appendChild(categoryDiv);
        
        categoryItems.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'autocomplete-item';
            const itemNameEscaped = item.item_name.replace(/'/g, "&#39;");
            itemDiv.innerHTML = `
                <div class="flex justify-between items-center autocomplete-item-content">
                    <div class="flex-1 cursor-pointer" onclick="selectAutocompleteItem(${item.id}, parseInt(this.closest('.autocomplete-item').querySelector('.quantity-value').textContent), '${itemNameEscaped}')">
                        <p class="font-medium text-gray-800">${item.item_name}</p>
                        <p class="text-sm text-gray-500">Huidige hoeveelheid: ${item.quantity}</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="quantity-controls">
                            <button onclick="event.stopPropagation(); decreaseQuantity(${item.id}, this)" class="quantity-btn">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="quantity-value">${item.quantity}</span>
                            <button onclick="event.stopPropagation(); increaseQuantity(${item.id}, this)" class="quantity-btn">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <button onclick="event.stopPropagation(); selectAutocompleteItem(${item.id}, parseInt(this.closest('.autocomplete-item').querySelector('.quantity-value').textContent), '${itemNameEscaped}')" class="confirm-btn" title="Voeg toe">
                            <i class="fas fa-check"></i>
                        </button>
                    </div>
                </div>
            `;
            autocompleteResults.appendChild(itemDiv);
        });
    }
    
    // Show dropdown
    autocompleteDropdown.classList.remove('hidden');
}

// Show option to create new item
function showNewItemOption(query) {
    autocompleteResults.innerHTML = `
        <div class="autocomplete-item text-center py-4">
            <p class="text-gray-500 mb-2">Geen resultaten voor "${query}"</p>
            <button onclick="openNewItemPopup('${query}')" class="btn-primary px-4 py-2">
                <i class="fas fa-plus mr-2"></i>Nieuw item aanmaken
            </button>
        </div>
    `;
    autocompleteDropdown.classList.remove('hidden');
}

// Reactivate item from complete list
async function reactivateItem(itemId) {
    try {
        const response = await fetch(`${API_BASE}/items/${itemId}/reactivate`, {
            method: 'PUT'
        });
        
        if (!response.ok) throw new Error('Failed to reactivate item');
        
        // Reload items
        await renderItems();
        checkEmptyState();
    } catch (error) {
        console.error('Error reactivating item:', error);
    }
}

// Select item from autocomplete
function selectAutocompleteItem(itemId, quantity, itemName) {
    addItemToList(itemId, quantity, itemName);
    autocompleteDropdown.classList.add('hidden');
    searchInput.value = '';
    searchInput.focus();
}

// Add item to list via API
async function addItemToList(itemId, quantity, itemName) {
    try {
        const response = await fetch(`${API_BASE}/items/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                item_name: itemName,
                category_id: null,
                quantity: quantity
            })
        });
        
        if (!response.ok) throw new Error('Failed to add item');
        
        // Reload items
        await renderItems();
        checkEmptyState();
    } catch (error) {
        console.error('Error adding item:', error);
    }
}

// Increase quantity in autocomplete
function increaseQuantity(itemId, buttonElement) {
    event.stopPropagation();
    const quantitySpan = buttonElement.closest('.autocomplete-item').querySelector('.quantity-value');
    const currentQuantity = parseInt(quantitySpan.textContent);
    const newQuantity = currentQuantity + 1;
    quantitySpan.textContent = newQuantity;
}

// Decrease quantity in autocomplete
function decreaseQuantity(itemId, buttonElement) {
    event.stopPropagation();
    const quantitySpan = buttonElement.closest('.autocomplete-item').querySelector('.quantity-value');
    const currentQuantity = parseInt(quantitySpan.textContent);
    const newQuantity = Math.max(1, currentQuantity - 1);
    quantitySpan.textContent = newQuantity;
}

// Open new item popup
function openNewItemPopup(prefilledName = '') {
    newItemName.value = prefilledName;
    newItemQuantity.textContent = '1';
    newItemPopup.classList.remove('hidden');
    newItemName.focus();
}

// Close new item popup
function closeNewItemPopup() {
    newItemPopup.classList.add('hidden');
}

// Increase new item quantity
function increaseNewItemQuantity() {
    let qty = parseInt(newItemQuantity.textContent);
    newItemQuantity.textContent = qty + 1;
}

// Decrease new item quantity
function decreaseNewItemQuantity() {
    let qty = parseInt(newItemQuantity.textContent);
    newItemQuantity.textContent = Math.max(1, qty - 1);
}

// Save new item
async function saveNewItem() {
    const name = newItemName.value.trim();
    const categoryId = newItemCategory.value;
    const quantity = parseInt(newItemQuantity.textContent);
    
    if (!name) {
        alert('Voer een itemnaam in');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/items/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                item_name: name,
                category_id: categoryId || null,
                quantity: quantity
            })
        });
        
        if (!response.ok) throw new Error('Failed to create item');
        
        closeNewItemPopup();
        searchInput.value = '';
        autocompleteDropdown.classList.add('hidden');
        await renderItems();
        checkEmptyState();
    } catch (error) {
        console.error('Error creating new item:', error);
        alert('Fout bij aanmaken item');
    }
}

// Update visual state of toggle buttons
function updateToggleButtons() {
    const isComplete = listToggle.checked;
    const lijstBtn = document.getElementById('toggle-lijst');
    const compleetBtn = document.getElementById('toggle-compleet');
    
    if (isComplete) {
        lijstBtn.classList.remove('bg-[#c36322]', 'text-white');
        lijstBtn.classList.add('text-gray-600');
        compleetBtn.classList.add('bg-[#c36322]', 'text-white');
        compleetBtn.classList.remove('text-gray-600');
    } else {
        lijstBtn.classList.add('bg-[#c36322]', 'text-white');
        lijstBtn.classList.remove('text-gray-600');
        compleetBtn.classList.remove('bg-[#c36322]', 'text-white');
        compleetBtn.classList.add('text-gray-600');
    }
}

// Toggle between active and complete list
function toggleList() {
    currentList = listToggle.checked ? 'complete' : 'active';
    if (currentList === 'complete') {
        activeList.classList.add('hidden');
        completeList.classList.remove('hidden');
    } else {
        activeList.classList.remove('hidden');
        completeList.classList.add('hidden');
    }
    checkEmptyState();
}

// Render items from API
async function renderItems() {
    try {
        const activeResponse = await fetch(`${API_BASE}/items/`);
        if (!activeResponse.ok) throw new Error(`HTTP ${activeResponse.status}`);
        const activeItems = await activeResponse.json();
        
        const completeResponse = await fetch(`${API_BASE}/items/complete`);
        if (!completeResponse.ok) throw new Error(`HTTP ${completeResponse.status}`);
        const completeItems = await completeResponse.json();
        
        renderItemList(activeList, activeItems, 'active');
        renderItemList(completeList, completeItems, 'complete');
    } catch (error) {
        console.error('Error loading items:', error);
    }
}

// Render item list
function renderItemList(container, items, listType) {
    container.innerHTML = '';
    
    if (items.length === 0) return;
    
    // Group by category
    const grouped = {};
    items.forEach(item => {
        const cat = item.category_name || 'Overig';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
    });
    
    // Sort categories by order
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
        const catA = categories.find(c => c.name === a);
        const catB = categories.find(c => c.name === b);
        const orderA = catA ? catA.order : 999;
        const orderB = catB ? catB.order : 999;
        return orderA - orderB;
    });
    
    for (const category of sortedCategories) {
        const categoryItems = grouped[category];
        
        // Category header
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category-header sticky top-0 z-10';
        categoryDiv.textContent = category;
        container.appendChild(categoryDiv);
        
        // Items in this category
        categoryItems.forEach(item => {
            const itemCard = createItemCard(item, listType);
            container.appendChild(itemCard);
        });
    }
    
    // Setup swipe listeners for new rows
    document.querySelectorAll('.item-row').forEach(row => {
        const card = row.querySelector('.item-card');
        if (card) {
            setupSwipeListeners(row, card);
        }
    });
}

// Create item card element
function createItemCard(item, listType) {
    const isComplete = listType === 'complete';
    
    // Create row wrapper
    const row = document.createElement('div');
    row.className = 'item-row';
    row.dataset.id = item.id;
    row.dataset.categoryOrder = item.category_order || 999;
    
    // Create action left
    const actionLeft = document.createElement('div');
    actionLeft.className = 'item-actions-left bg-red-100 text-red-600';
    actionLeft.innerHTML = `
        <i class="fas fa-trash text-xl"></i>
        <span class="ml-2 text-sm">Verwijderen</span>
    `;
    
    // Create card
    const card = document.createElement('div');
    card.className = 'item-card' + (isComplete ? ' complete' : '');
    
    card.innerHTML = `
        <div class="item-content">
            <div class="flex items-center space-x-3">
                <div class="w-5 h-5 border-2 border-gray-300 rounded ${isComplete ? 'bg-green-500 border-green-500' : ''}">
                    ${isComplete ? '<i class="fas fa-check text-white text-xs flex items-center justify-center w-full h-full"></i>' : ''}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-baseline gap-2">
                        <span class="quantity-display text-lg font-bold text-[#c36322] min-w-[3rem] text-right ${isComplete ? 'line-through' : ''}">${item.quantity}</span>
                        <span class="separator text-gray-400">•</span>
                        <div class="min-w-0">
                            <h4 class="font-medium text-gray-800 ${isComplete ? 'line-through' : ''}">${item.item_name}</h4>
                            <p class="text-xs text-gray-500">${item.category_name || 'Overig'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add recycle button for complete items (right-aligned on card)
    if (isComplete) {
        const recycleBtn = document.createElement('button');
        recycleBtn.className = 'recycle-btn absolute';
        recycleBtn.style.right = '0.75rem';
        recycleBtn.style.top = '50%';
        recycleBtn.style.transform = 'translateY(-50%)';
        recycleBtn.innerHTML = '<i class="fas fa-recycle"></i>';
        recycleBtn.title = 'Terug naar boodschappenlijst';
        recycleBtn.onclick = (e) => {
            e.stopPropagation();
            reactivateItem(item.id);
        };
        card.appendChild(recycleBtn);
    }
    
    // Add swipe indicators to card
    const indicatorRight = document.createElement('div');
    indicatorRight.className = 'swipe-indicator-right';
    card.appendChild(indicatorRight);
    
    const indicatorLeft = document.createElement('div');
    indicatorLeft.className = 'swipe-indicator-left';
    card.appendChild(indicatorLeft);
    
    // Create action right
    const actionRight = document.createElement('div');
    if (isComplete) {
        actionRight.className = 'item-actions-right bg-green-100 text-green-600';
        actionRight.innerHTML = `
            <i class="fas fa-undo text-xl"></i>
            <span class="ml-2 text-sm">Terugzetten</span>
        `;
    } else {
        actionRight.className = 'item-actions-right bg-green-100 text-green-600';
        actionRight.innerHTML = `
            <i class="fas fa-check text-xl"></i>
            <span class="ml-2 text-sm">Compleet</span>
        `;
    }
    
    // Assemble row
    row.appendChild(actionLeft);
    row.appendChild(card);
    row.appendChild(actionRight);
    
    return row;
}

// Setup swipe listeners for a row - NEW IMPLEMENTATION
function setupSwipeListeners(row, card) {
    const content = card.querySelector('.item-content');
    const isComplete = card.classList.contains('complete');
    const cardRect = card.getBoundingClientRect();
    const cardWidth = cardRect.width;
    const threshold = cardWidth * 0.3; // 30% of card width to trigger action
    let startX = 0;
    let isSwiping = false;
    
    // Reset card position
    function resetCard() {
        card.style.transform = '';
        card.classList.remove('swiping', 'swiping-left', 'swiping-right');
        row.classList.remove('swiping');
    }
    
    function updateSwipe(diffX) {
        // Limit the translate to card width
        const translateX = Math.max(-cardWidth, Math.min(cardWidth, diffX));
        card.style.transform = `translateX(${translateX}px)`;
        
        // Add swiping class to row to show actions
        row.classList.add('swiping');
        
        // Show action indicators based on direction:
        // - Finger right (diffX positive) -> card moves right -> shows RIGHT action (complete/green)
        // - Finger left (diffX negative) -> card moves left -> shows LEFT action (delete/red)
        if (diffX > 20 && !isComplete) {
            // Swiping right: show complete action on RIGHT side
            row.classList.add('swiping-right');
            row.classList.remove('swiping-left');
        } else if (diffX < -20) {
            // Swiping left: show delete action on LEFT side
            row.classList.add('swiping-left');
            row.classList.remove('swiping-right');
        } else {
            row.classList.remove('swiping-left', 'swiping-right');
        }
    }
    
    // Touch events
    row.addEventListener('touchstart', (e) => {
        startX = e.changedTouches[0].clientX;
        currentSwipedCard = row;
        isSwiping = true;
        resetCard();
        e.preventDefault();
    }, { passive: false });
    
    row.addEventListener('touchmove', (e) => {
        if (!isSwiping) return;
        
        const currentX = e.changedTouches[0].clientX;
        const diffX = currentX - startX; // Positive = finger moved right, Negative = finger moved left
        const diffY = Math.abs(e.changedTouches[0].clientY - e.changedTouches[0].screenY);
        
        // Only horizontal swipes
        if (diffY > 30) {
            isSwiping = false;
            resetCard();
            return;
        }
        
        // Prevent scrolling when swiping horizontally
        e.preventDefault();
        
        // Card moves in SAME direction as finger:
        // - Finger right (diffX positive) -> card moves right -> shows DELETE (left action)
        // - Finger left (diffX negative) -> card moves left -> shows COMPLETE (right action)
        updateSwipe(diffX);
    }, { passive: false });
    
    row.addEventListener('touchend', (e) => {
        if (!isSwiping) {
            resetCard();
            currentSwipedCard = null;
            return;
        }
        
        const endX = e.changedTouches[0].clientX;
        const diffX = endX - startX; // Positive = finger moved right
        
        // Trigger action if swipe is significant
        if (diffX > threshold && !isComplete) {
            // Finger moved right enough -> complete
            handleSwipeAction(row, card, 'complete');
            return; // Don't reset - let the action handle it
        } else if (diffX < -threshold) {
            // Finger moved left enough -> delete
            handleSwipeAction(row, card, 'delete');
            return; // Don't reset - let the action handle it
        }
        
        // If swipe didn't trigger action, animate back
        card.style.transition = 'transform 0.2s ease-out';
        resetCard();
        
        setTimeout(() => {
            card.style.transition = '';
        }, 200);
        
        currentSwipedCard = null;
        isSwiping = false;
    });
    
    // Mouse events for desktop
    row.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        currentSwipedCard = row;
        isSwiping = true;
        resetCard();
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isSwiping || currentSwipedCard !== row) return;
        
        const currentX = e.clientX;
        const diffX = currentX - startX; // Positive = mouse moved right
        
        updateSwipe(diffX);
    });
    
    document.addEventListener('mouseup', (e) => {
        if (!isSwiping || currentSwipedCard !== row) return;
        
        const endX = e.clientX;
        const diffX = endX - startX; // Positive = mouse moved right
        
        // For mouse: positive diffX = moved right -> complete
        if (diffX > threshold && !isComplete) {
            handleSwipeAction(row, card, 'complete');
            return;
        } else if (diffX < -threshold) {
            handleSwipeAction(row, card, 'delete');
            return;
        }
        
        // Animate back
        card.style.transition = 'transform 0.2s ease-out';
        resetCard();
        
        setTimeout(() => {
            card.style.transition = '';
        }, 200);
        
        currentSwipedCard = null;
        isSwiping = false;
    });
}

// Handle swipe action
async function handleSwipeAction(row, card, action) {
    const itemId = parseInt(row.dataset.id);
    const originalTransform = card.style.transform;
    
    // Animate the card in the direction of the swipe
    if (action === 'complete') {
        card.style.transition = 'transform 0.2s ease-out';
        card.style.transform = `translateX(${-window.innerWidth}px)`;
    } else if (action === 'delete') {
        card.style.transition = 'transform 0.2s ease-out';
        card.style.transform = `translateX(${window.innerWidth}px)`;
    }
    
    try {
        let endpoint = '';
        if (action === 'complete') {
            endpoint = `${API_BASE}/items/${itemId}/complete`;
        } else if (action === 'delete') {
            endpoint = `${API_BASE}/items/${itemId}/delete`;
        } else if (action === 'reactivate') {
            endpoint = `${API_BASE}/items/${itemId}/reactivate`;
        }
        
        const response = await fetch(endpoint, { method: 'PUT' });
        
        if (!response.ok) throw new Error('Action failed');
        
        // Reload items
        await renderItems();
        
        // Reset card after reload (it will be re-rendered)
        setTimeout(() => {
            card.style.transition = '';
            card.style.transform = '';
            card.classList.remove('swiping', 'swiping-left', 'swiping-right');
            row.classList.remove('swiping');
        }, 100);
        
        checkEmptyState();
    } catch (error) {
        console.error('Error handling swipe:', error);
        // Reset card
        card.classList.remove('swipe-left', 'swipe-right');
    }
}

// Check if list is empty
function checkEmptyState() {
    const activeItems = activeList.querySelectorAll('.item-card');
    const completeItems = completeList.querySelectorAll('.item-card');
    
    if (currentList === 'active' && activeItems.length === 0) {
        emptyState.classList.remove('hidden');
    } else if (currentList === 'complete' && completeItems.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Open settings page
function openSettings() {
    window.location.href = '/settings';
}
