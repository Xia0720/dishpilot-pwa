// --- Global Variables and Constants ---
let allRecipes = [];
let model; // Global variable for the loaded AI model
let currentUnitSystem = 'metric'; // Default unit system for international users ('metric' or 'imperial')

const RECIPES_FILE = 'recipes.json';
const LANGUAGE = 'en'; // Default language

// --- 1. Data Fetching and Model Loading Function (Combined) ---
async function fetchRecipes() {
    // --- 1.1 Load Recipes Data ---
    try {
        const response = await fetch(RECIPES_FILE);
        if (!response.ok) {
            document.getElementById('recipes-container').innerHTML = 
                `<p>ERROR: Failed to load recipes data. Check if 'recipes.json' exists and has valid syntax.</p>`;
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allRecipes = await response.json();
        console.log("Recipes loaded successfully:", allRecipes.length, "recipes found.");
    } catch (error) {
        console.error("Could not fetch the recipes:", error);
        return; 
    }
    
    // --- 1.2 Load AI Model ---
    try {
        console.log("Loading MobileNet model...");
        model = await mobilenet.load(); 
        console.log("MobileNet model loaded successfully.");
    } catch (error) {
        console.error("Failed to load MobileNet model:", error);
    }

    // Initialize listeners and simulation after everything is loaded
    initEventListeners();
}

// --- 2. Event Listeners (Triggers) ---
function initEventListeners() {
    document.getElementById('image-upload').addEventListener('change', handleImageUpload);
    // Simulate matching immediately for initial display
    simulateMatching(); 
}

// --- 3. Image Upload Handler (AI Core Logic) ---
async function handleImageUpload(event) {
    if (!model) {
        console.warn("AI model not yet loaded. Please wait.");
        return;
    }

    const file = event.target.files[0];
    if (!file) return;

    // --- 1. Create Image Element ---
    const imageElement = document.createElement('img');
    imageElement.src = URL.createObjectURL(file);
    imageElement.width = 224; 

    imageElement.onload = async () => {
        // --- 2. Run Classification ---
        const predictions = await model.classify(imageElement, 5); 
        console.log('AI Predictions:', predictions);

        // --- 3. Extract and Clean Ingredient Names ---
        let recognizedIngredients = predictions.map(p => {
            return p.className.split(',')[0].trim().toLowerCase();
        });
        
        // --- 4. Custom Mapping (Refinement) ---
        // Map specific AI labels to general ingredient names used in our recipes.json
        const mapping = {
            "acorn squash": "squash",
            "spaghetti squash": "squash",
            "cucumber": "cucumber", // Specific item, kept as is
            "granny smith": "apple",
            "eggnog": "egg"
        };
        
        recognizedIngredients = recognizedIngredients.map(item => mapping[item] || item);
        recognizedIngredients = [...new Set(recognizedIngredients)]; 
        
        console.log("Mapped Ingredients:", recognizedIngredients);
        
        // --- 5. Clean Non-Food Items ---
        const nonFoodTags = ["refrigerator", "plate rack", "table", "chair", "wall", "window", "cabinet", "shelf"];
        
        recognizedIngredients = recognizedIngredients.filter(item => 
            !nonFoodTags.includes(item)
        );
        
        console.log("Filtered Ingredients (Non-Food removed):", recognizedIngredients);
        
        // --- 6. Start Matching ---
        const recommendedRecipes = findMatchingRecipes(recognizedIngredients);
        displayRecipes(recommendedRecipes, recognizedIngredients);
        displayIngredients(recognizedIngredients);
    };
}

// --- 4. Simulation & Matching Function ---
function simulateMatching() {
    // This list will match all 3 recipes now (egg, tomato, squash)
    const availableIngredients = ["egg", "butter", "milk", "tomato", "onion", "parsley", "squash", "thyme"]; 
    console.log("Simulating available ingredients:", availableIngredients);

    const recommendedRecipes = findMatchingRecipes(availableIngredients);
    displayRecipes(recommendedRecipes, availableIngredients);
    displayIngredients(availableIngredients);
}

function findMatchingRecipes(availableList) {
    const recommended = [];
    
    for (const recipe of allRecipes) {
        let matchedCount = 0;
        
        for (const requiredIngredient of recipe.match_ingredients) {
            if (availableList.map(i => i.toLowerCase()).includes(requiredIngredient.toLowerCase())) {
                matchedCount++;
            }
        }

        const requiredCount = recipe.match_ingredients.length;
        const matchPercentage = requiredCount > 0 ? (matchedCount / requiredCount) : 0;
        
        if (matchPercentage >= 0.3) { 
            recommended.push({
                ...recipe,
                matchPercentage: matchPercentage,
                matchedCount: matchedCount
            });
        }
    }

    recommended.sort((a, b) => b.matchPercentage - a.matchPercentage);
    
    return recommended;
}

// --- 5. Display Ingredients ---
function displayIngredients(ingredients) {
    const list = document.getElementById('ingredient-list');
    list.innerHTML = ingredients.map(i => `<li>${i}</li>`).join('');
}

// --- 6. Recipe Card Listeners (Defined before displayRecipes to avoid ReferenceError) ---
function initRecipeCardListeners() {
    document.querySelectorAll('.view-recipe-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const recipeId = e.target.dataset.id;
            viewRecipeDetails(recipeId);
        });
    });
}

// --- 7. Main Recipe Card Display Function ---
function displayRecipes(recipes, availableIngredients) {
    const container = document.getElementById('recipes-container');
    container.innerHTML = ''; 

    if (recipes.length === 0) {
        container.innerHTML = `<p>No recipes found matching at least 70% of the required ingredients.</p>`;
        return;
    }

    recipes.forEach(recipe => {
        const unusedIngredients = availableIngredients.filter(
            item => !recipe.match_ingredients.map(i => i.toLowerCase()).includes(item.toLowerCase())
        );

        const title = recipe.name[LANGUAGE] || recipe.name['en']; 
        
        const recipeCard = document.createElement('div');
        recipeCard.className = 'recipe-card';
        
        recipeCard.innerHTML = `
            <h3>${title}</h3>
            <p><strong>Match:</strong> ${(recipe.matchPercentage * 100).toFixed(0)}% (${recipe.matchedCount}/${recipe.match_ingredients.length} main items)</p>
            <p><strong>Total Time:</strong> ${recipe.prep_time + recipe.cook_time} mins | Difficulty: ${recipe.difficulty}</p>
            
            <button class="view-recipe-btn" data-id="${recipe.id}">View Full Recipe</button>

            <div class="leftover-card">
                <h4>♻️ Zero-Waste Tip:</h4>
                <p>${recipe.leftover_handling[LANGUAGE]}</p>
                <p class="unused-items"><strong>Unused Items:</strong> ${unusedIngredients.join(', ')}</p>
            </div>
        `;

        container.appendChild(recipeCard);
    });

    if (recipes.length > 0) {
        initRecipeCardListeners(); 
    }
}

// --- 8. View Recipe Details Function (Kitchen Mode) ---
function viewRecipeDetails(recipeId) {
    const recipe = allRecipes.find(r => r.id === recipeId);
    if (!recipe) {
        console.error("Recipe not found:", recipeId);
        return;
    }

    const detailContainer = document.createElement('div');
    detailContainer.id = 'recipe-detail-overlay';
    detailContainer.dataset.recipeId = recipeId; 

    const ingredientsHtml = recipe.ingredients.map(ing => {
        const qty = ing.qty[currentUnitSystem]; 
        const name = ing.name[LANGUAGE] || ing.name['en'];
        return `<li><strong>${qty}</strong> ${name}</li>`;
    }).join('');

    const stepsHtml = recipe.steps[LANGUAGE].map((step, index) => {
        return `<p><strong>STEP ${index + 1}:</strong> ${step}</p>`;
    }).join('');

    detailContainer.innerHTML = `
        <div class="detail-content">
            <button id="close-detail-btn">CLOSE [X]</button>
            <button id="toggle-units-btn" data-units="${currentUnitSystem}">Switch to ${currentUnitSystem === 'metric' ? 'Imperial' : 'Metric'}</button>

            <h2>${recipe.name[LANGUAGE]}</h2>
            <p>Prep: ${recipe.prep_time} mins | Cook: ${recipe.cook_time} mins | Difficulty: ${recipe.difficulty}</p>
            
            <div class="sections">
                <div class="ingredients-list">
                    <h3>🛒 Ingredients (${currentUnitSystem})</h3>
                    <ul>${ingredientsHtml}</ul>
                </div>
                <div class="steps-list">
                    <h3>👩‍🍳 Instructions</h3>
                    ${stepsHtml}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(detailContainer);
    
    document.getElementById('close-detail-btn').addEventListener('click', () => {
        document.body.removeChild(detailContainer);
    });
    
    document.getElementById('toggle-units-btn').addEventListener('click', handleUnitToggle);
}

// --- 9. Unit Toggle Function ---
function handleUnitToggle(e) {
    if (currentUnitSystem === 'metric') {
        currentUnitSystem = 'imperial';
    } else {
        currentUnitSystem = 'metric';
    }
    
    const detailOverlay = document.getElementById('recipe-detail-overlay');
    if (detailOverlay) {
        const currentRecipeId = detailOverlay.dataset.recipeId; 
        
        document.body.removeChild(detailOverlay);

        if (currentRecipeId) {
             viewRecipeDetails(currentRecipeId);
        }
    }
}

// --- 10. Register Service Worker (PWA Feature) ---
if ('serviceWorker' in navigator) {
    // Determine the correct scope path for local vs. deployed environment
    const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    const scopePath = isLocal ? '/' : '/dishpilot-pwa/';
    const scriptPath = isLocal ? './service-worker.js' : '/dishpilot-pwa/service-worker.js';

    window.addEventListener('load', () => {
        // Register the Service Worker
        navigator.serviceWorker.register(scriptPath, { scope: scopePath })
            .then(registration => {
                console.log('SW registered with scope: ', registration.scope);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Start the application
fetchRecipes();