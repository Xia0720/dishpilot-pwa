// Global variable to store all recipes
let allRecipes = [];
const RECIPES_FILE = 'recipes.json';
const LANGUAGE = 'en'; // Default language for international users

// --- 1. Data Fetching Function ---
async function fetchRecipes() {
    try {
        const response = await fetch(RECIPES_FILE);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        allRecipes = await response.json();
        console.log("Recipes loaded successfully:", allRecipes.length, "recipes found.");

        // Initialize listeners and simulation
        initEventListeners();
        
    } catch (error) {
        console.error("Could not fetch the recipes:", error);
        document.getElementById('recipes-container').innerHTML = 
            `<p>ERROR: Failed to load recipes data. Please check the console (F12) for details.</p>`;
    }
}

// --- 2. Event Listeners (Triggers) ---
function initEventListeners() {
    // We bind the matching process to the image upload input for now
    document.getElementById('image-upload').addEventListener('change', handleImageUpload);
    
    // For demonstration, let's show a simulated result right away
    simulateMatching(); 
}

// --- 3. Image Upload Handler (Will be extended with AI) ---
function handleImageUpload(event) {
    // In the final PWA, the image file is processed by TensorFlow.js here.
    // For now, we only log the action.
    console.log("Image uploaded. Starting AI recognition simulation...");
    simulateMatching(); 
}

// --- 4. Simulation & Matching Function ---
function simulateMatching() {
    // === SIMULATION: Replace this array with the AI recognition result later ===
    // This list will match recipe R001 (egg, butter) and R002 (tomato)
    const availableIngredients = ["egg", "butter", "milk", "tomato", "onion", "parsley"]; 
    console.log("Simulating available ingredients:", availableIngredients);
    // =================================================================================

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

        // Rule: Recommend if at least 70% of main ingredients are available.
        const requiredCount = recipe.match_ingredients.length;
        const matchPercentage = requiredCount > 0 ? (matchedCount / requiredCount) : 0;
        
        if (matchPercentage >= 0.7) { 
            recommended.push({
                ...recipe,
                matchPercentage: matchPercentage,
                matchedCount: matchedCount
            });
        }
    }

    // Sort by best match percentage (best utilization first)
    recommended.sort((a, b) => b.matchPercentage - a.matchPercentage);
    
    return recommended;
}

// --- 5. Display Functions ---
function displayIngredients(ingredients) {
    const list = document.getElementById('ingredient-list');
    list.innerHTML = ingredients.map(i => `<li>${i}</li>`).join('');
}

function displayRecipes(recipes, availableIngredients) {
    const container = document.getElementById('recipes-container');
    container.innerHTML = ''; 

    if (recipes.length === 0) {
        container.innerHTML = `<p>No recipes found matching at least 70% of the required ingredients.</p>`;
        return;
    }

    recipes.forEach(recipe => {
        // Find ingredients NOT used in this recipe (for the leftover card)
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
}

// Start the application
fetchRecipes();