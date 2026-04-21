// NiftyGroceries - Frontend JavaScript

const API_BASE = window.location.origin + '/api';
let categories = [];
let currentList = 'active';

// DOM Elements
const searchInput = document.getElementById('search-input');
const autocompleteDropdown = document.getElementById('autocomplete-dropdown');
const autocompleteResults = document.getElementById('autocomplete-results');
const newItemPopup = document.getElementById('new-item-popup');
const newItemName = document.getElementById('new-item-name');
const newItemCategory = document.getElementById('new-item-category');
const newItemQuantity = document.getElementById('new-item-quantity');
const listToggle = document.getElementById('list-toggle');
const activeList = document.getElementById('active-list');
const completeList = document.getElementById('complete-list');
const emptyState = document.getElementById('empty-state');

// Touch tracking for swipe
let touchStartX = 0;
let touchStartY = 0;
let currentSwipedCard = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    setupEventListeners();
    renderItems();
    
    // Check if there are any items
    checkEmptyState();
});

// Load categories from API
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
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
    
    // List toggle
    listToggle.addEventListener('change', toggleList);
    
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
            itemDiv.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <p class="font-medium text-gray-800">${item.item_name}</p>
                        <p class="text-sm text-gray-500">Huidige hoeveelheid: ${item.quantity}</p>
                    </div>
                    <div class="quantity-controls">
                        <button onclick="event.stopPropagation(); decreaseQuantity(${item.id}, ${item.quantity})" class="quantity-btn">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="quantity-value">${item.quantity}</span>
                        <button onclick="event.stopPropagation(); increaseQuantity(${item.id}, ${item.quantity})" class="quantity-btn">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            `;
            itemDiv.addEventListener('click', () => selectAutocompleteItem(item.id, item.quantity));
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

// Select item from autocomplete
function selectAutocompleteItem(itemId, quantity) {
    addItemToList(itemId, quantity);
    autocompleteDropdown.classList.add('hidden');
    searchInput.value = '';
    searchInput.focus();
}

// Add item to list via API
async function addItemToList(itemId, quantity) {
    try {
        const response = await fetch(`${API_BASE}/items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: itemId,
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
function increaseQuantity(itemId, currentQuantity) {
    const newQuantity = currentQuantity + 1;
    updateQuantityInAutocomplete(itemId, newQuantity);
}

// Decrease quantity in autocomplete
function decreaseQuantity(itemId, currentQuantity) {
    const newQuantity = Math.max(1, currentQuantity - 1);
    updateQuantityInAutocomplete(itemId, newQuantity);
}

// Update quantity display in autocomplete
function updateQuantityInAutocomplete(itemId, newQuantity) {
    // This would require re-rendering the autocomplete, but for now we'll just add the item
    // In a real implementation, we'd update the displayed quantity
    selectAutocompleteItem(itemId, newQuantity);
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
        const response = await fetch(`${API_BASE}/items`, {
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
        const activeResponse = await fetch(`${API_BASE}/items`);
        const activeItems = await activeResponse.json();
        
        const completeResponse = await fetch(`${API_BASE}/items/complete`);
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
    
    // Setup swipe listeners for new cards
    document.querySelectorAll('.item-card').forEach(card => {
        setupSwipeListeners(card);
    });
}

// Create item card element
function createItemCard(item, listType) {
    const card = document.createElement('div');
    card.className = 'item-card' + (listType === 'complete' ? ' complete' : '');
    card.dataset.id = item.id;
    card.dataset.categoryOrder = item.category_order || 999;
    
    const isComplete = listType === 'complete';
    
    card.innerHTML = `
        <div class="item-content">
            <div class="flex items-center space-x-3">
                <div class="w-5 h-5 border-2 border-gray-300 rounded ${isComplete ? 'bg-green-500 border-green-500' : ''}">
                    ${isComplete ? '<i class="fas fa-check text-white text-xs flex items-center justify-center w-full h-full"></i>' : ''}
                </div>
                <div class="flex-1">
                    <h4 class="font-medium text-gray-800 ${isComplete ? 'line-through' : ''}">${item.item_name}</h4>
                    <p class="text-sm text-gray-500">${item.category_name || 'Overig'} • ${item.quantity}</p>
                </div>
            </div>
        </div>
        ${isComplete ? `
            <div class="item-actions-right bg-green-100 text-green-600">
                <i class="fas fa-undo text-xl"></i>
                <span class="ml-2 text-sm">Terugzetten</span>
            </div>
        ` : `
            <div class="item-actions-right bg-green-100 text-green-600">
                <i class="fas fa-check text-xl"></i>
                <span class="ml-2 text-sm">Compleet</span>
            </div>
            <div class="item-actions-left bg-red-100 text-red-600">
                <i class="fas fa-trash text-xl"></i>
                <span class="ml-2 text-sm">Verwijderen</span>
            </div>
        `}
    `;
    
    // Add swipe indicators
    const indicatorRight = document.createElement('div');
    indicatorRight.className = 'swipe-indicator-right';
    card.appendChild(indicatorRight);
    
    const indicatorLeft = document.createElement('div');
    indicatorLeft.className = 'swipe-indicator-left';
    card.appendChild(indicatorLeft);
    
    return card;
}

// Setup swipe listeners for a card
function setupSwipeListeners(card) {
    const content = card.querySelector('.item-content');
    const isComplete = card.classList.contains('complete');
    
    // Touch events
    card.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        currentSwipedCard = card;
    }, { passive: true });
    
    card.addEventListener('touchmove', (e) => {
        if (!touchStartX) return;
        
        const touchX = e.changedTouches[0].screenX;
        const diffX = touchStartX - touchX;
        const diffY = Math.abs(touchStartY - e.changedTouches[0].screenY);
        
        // Only horizontal swipes
        if (diffY > 50) return;
        
        // Prevent scrolling when swiping horizontally
        if (Math.abs(diffX) > 10) {
            e.preventDefault();
        }
        
        const threshold = 50;
        
        if (diffX > threshold && !isComplete) {
            // Swipe left - show delete action
            card.classList.add('swipe-left');
            card.classList.remove('swipe-right');
        } else if (diffX < -threshold) {
            // Swipe right - show complete action
            card.classList.add('swipe-right');
            card.classList.remove('swipe-left');
        } else {
            // Reset
            card.classList.remove('swipe-left', 'swipe-right');
        }
    }, { passive: false });
    
    card.addEventListener('touchend', (e) => {
        const touchX = e.changedTouches[0].screenX;
        const diffX = touchStartX - touchX;
        const threshold = 100;
        
        if (diffX > threshold && !isComplete) {
            // Swipe left completed - delete
            handleSwipeAction(card, 'delete');
        } else if (diffX < -threshold) {
            // Swipe right completed - complete/reactivate
            handleSwipeAction(card, isComplete ? 'reactivate' : 'complete');
        }
        
        // Reset swipe state
        card.classList.remove('swipe-left', 'swipe-right');
        touchStartX = 0;
        currentSwipedCard = null;
    });
    
    // Mouse events for desktop
    let mouseStartX = 0;
    let isDragging = false;
    
    card.addEventListener('mousedown', (e) => {
        mouseStartX = e.clientX;
        isDragging = true;
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging || !currentSwipedCard) return;
        
        const diffX = mouseStartX - e.clientX;
        const threshold = 50;
        
        if (diffX > threshold && !currentSwipedCard.classList.contains('complete')) {
            currentSwipedCard.classList.add('swipe-left');
            currentSwipedCard.classList.remove('swipe-right');
        } else if (diffX < -threshold) {
            currentSwipedCard.classList.add('swipe-right');
            currentSwipedCard.classList.remove('swipe-left');
        } else {
            currentSwipedCard.classList.remove('swipe-left', 'swipe-right');
        }
    });
    
    document.addEventListener('mouseup', (e) => {
        if (!isDragging || !currentSwipedCard) return;
        
        const diffX = mouseStartX - e.clientX;
        const threshold = 100;
        
        if (diffX > threshold && !currentSwipedCard.classList.contains('complete')) {
            handleSwipeAction(currentSwipedCard, 'delete');
        } else if (diffX < -threshold) {
            handleSwipeAction(currentSwipedCard, currentSwipedCard.classList.contains('complete') ? 'reactivate' : 'complete');
        }
        
        currentSwipedCard.classList.remove('swipe-left', 'swipe-right');
        currentSwipedCard = null;
        isDragging = false;
    });
}

// Handle swipe action
async function handleSwipeAction(card, action) {
    const itemId = parseInt(card.dataset.id);
    
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
