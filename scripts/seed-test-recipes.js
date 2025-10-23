/**
 * Seed test recipes into Firestore for testing
 * Run: node scripts/seed-test-recipes.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Load Firebase Admin config
const firebaseAdminConfig = require('../config/firebase-admin');

const testRecipes = [
  {
    title: 'Classic Spaghetti Carbonara',
    description: 'Traditional Italian pasta with creamy egg sauce and crispy bacon',
    author: 'Maria Romano',
    authorEmail: 'maria@example.com',
    imageId: '1',
    ingredients: [
      '400g spaghetti',
      '200g guanciale or bacon, diced',
      '4 large eggs',
      '100g Pecorino Romano cheese, grated',
      'Black pepper',
      'Salt'
    ],
    instructions: [
      'Bring a large pot of salted water to boil and cook spaghetti according to package directions.',
      'While pasta cooks, heat oil in a large skillet over medium heat.',
      'Add guanciale/bacon and cook until crispy, about 5-7 minutes.',
      'In a bowl, whisk together eggs, cheese, and black pepper.',
      'Drain pasta, reserving 1 cup of pasta water.',
      'Add hot pasta to the skillet with guanciale.',
      'Remove from heat and quickly stir in egg mixture, adding pasta water as needed for creamy sauce.',
      'Serve immediately with extra cheese and pepper.'
    ],
    prepTime: '15 minutes',
    cookTime: '20 minutes',
    servings: 4,
    cuisine: 'Italian',
    rating: 4.8,
    ratingCount: 156,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
  },
  {
    title: 'Thai Green Curry',
    description: 'Aromatic coconut curry with fresh vegetables and herbs',
    author: 'Niran Patel',
    authorEmail: 'niran@example.com',
    imageId: '2',
    ingredients: [
      '2 tbsp green curry paste',
      '400ml coconut milk',
      '300g chicken or tofu, cubed',
      '100g Thai eggplant, chopped',
      '1 bell pepper, sliced',
      '50g fresh basil',
      '2 Thai chilies',
      '2 tbsp fish sauce',
      '1 tbsp lime juice',
      '1 tbsp sugar'
    ],
    instructions: [
      'Heat a wok or large pan over medium-high heat.',
      'Add curry paste and stir-fry for 1-2 minutes until fragrant.',
      'Pour in half the coconut milk and stir to combine.',
      'Add chicken/tofu and cook until nearly done, about 5 minutes.',
      'Add eggplant and bell pepper, cook for 3 minutes.',
      'Pour in remaining coconut milk and add fish sauce, lime juice, and sugar.',
      'Simmer for 5 minutes until vegetables are tender.',
      'Stir in fresh basil and garnish with chilies.',
      'Serve with jasmine rice.'
    ],
    prepTime: '20 minutes',
    cookTime: '15 minutes',
    servings: 3,
    cuisine: 'Thai',
    rating: 4.6,
    ratingCount: 98
  },
  {
    title: 'Homemade Chocolate Chip Cookies',
    description: 'Soft and chewy cookies loaded with dark chocolate chips',
    author: 'Sarah Johnson',
    authorEmail: 'sarah@example.com',
    imageId: '3',
    ingredients: [
      '225g butter, softened',
      '200g brown sugar',
      '100g white sugar',
      '2 large eggs',
      '2 tsp vanilla extract',
      '280g all-purpose flour',
      '1 tsp baking soda',
      '1 tsp salt',
      '340g dark chocolate chips',
      '100g walnuts, chopped'
    ],
    instructions: [
      'Preheat oven to 375°F (190°C).',
      'In a large bowl, cream together butter and sugars until light and fluffy.',
      'Beat in eggs and vanilla extract.',
      'In another bowl, combine flour, baking soda, and salt.',
      'Gradually blend the dry ingredients into the creamed mixture.',
      'Stir in chocolate chips and walnuts.',
      'Drop rounded tablespoons of dough onto ungreased baking sheets.',
      'Bake for 9-11 minutes or until golden brown.',
      'Cool on baking sheets for 2 minutes, then transfer to wire racks.'
    ],
    prepTime: '15 minutes',
    cookTime: '10 minutes',
    servings: 24,
    cuisine: 'American',
    rating: 4.9,
    ratingCount: 245
  },
  {
    title: 'Mediterranean Quinoa Salad',
    description: 'Healthy salad with quinoa, feta, and fresh vegetables',
    author: 'Elena Garcia',
    authorEmail: 'elena@example.com',
    imageId: '4',
    ingredients: [
      '1 cup quinoa, uncooked',
      '2 cups vegetable broth',
      '1 cucumber, diced',
      '1 bell pepper, diced',
      '200g cherry tomatoes, halved',
      '100g feta cheese, crumbled',
      '50g kalamata olives',
      '50g fresh parsley',
      '3 tbsp olive oil',
      '2 tbsp lemon juice',
      'Salt and pepper to taste'
    ],
    instructions: [
      'Rinse quinoa under cold water.',
      'In a saucepan, bring vegetable broth to a boil.',
      'Add quinoa, reduce heat to low, cover, and simmer for 15 minutes.',
      'Remove from heat and let stand for 5 minutes, then fluff with a fork.',
      'Transfer quinoa to a large bowl and let cool slightly.',
      'Add cucumber, bell pepper, tomatoes, olives, and feta.',
      'In a small bowl, whisk together olive oil and lemon juice.',
      'Pour dressing over salad and toss to combine.',
      'Season with salt and pepper to taste.',
      'Chill until ready to serve.'
    ],
    prepTime: '15 minutes',
    cookTime: '20 minutes',
    servings: 4,
    cuisine: 'Mediterranean',
    rating: 4.5,
    ratingCount: 67
  },
  {
    title: 'Korean Beef Bibimbap',
    description: 'Mixed rice bowl with seasoned vegetables and marinated beef',
    author: 'Jun Kim',
    authorEmail: 'jun@example.com',
    imageId: '5',
    ingredients: [
      '500g beef sirloin, thinly sliced',
      '3 cups cooked rice',
      '2 carrots, julienned',
      '100g spinach',
      '100g mushrooms, sliced',
      '100g zucchini, julienned',
      '1 cup bean sprouts',
      '4 eggs',
      '3 tbsp soy sauce',
      '2 tbsp sesame oil',
      '1 tbsp gochujang (Korean chili paste)',
      '2 tsp sugar',
      '2 cloves garlic, minced'
    ],
    instructions: [
      'Marinate beef with 1.5 tbsp soy sauce, 1 tbsp sesame oil, 1 tsp sugar, and garlic for 30 minutes.',
      'Blanch spinach and season with remaining sesame oil and soy sauce.',
      'Sauté mushrooms and zucchini separately; season each with salt and pepper.',
      'Lightly pan-fry carrots and bean sprouts.',
      'Cook beef in a hot skillet until done, about 3-4 minutes.',
      'Fry eggs sunny-side up.',
      'Divide rice into 4 bowls.',
      'Arrange beef and vegetables on top of rice.',
      'Top with a fried egg and a dollop of gochujang mixed with sesame oil.',
      'Mix everything together before eating.'
    ],
    prepTime: '40 minutes',
    cookTime: '15 minutes',
    servings: 4,
    cuisine: 'Korean',
    rating: 4.7,
    ratingCount: 124
  }
];

async function seedRecipes() {
  try {
    const { getDb } = firebaseAdminConfig;
    const db = getDb();

    console.log('🌱 Starting to seed test recipes...\n');

    for (const recipe of testRecipes) {
      const docRef = await db.collection('recipes').add({
        ...recipe,
        comments: [],
        createdAt: recipe.createdAt || new Date(),
        updatedAt: new Date()
      });

      console.log(`✅ Added: "${recipe.title}" (ID: ${docRef.id})`);
    }

    console.log(`\n🎉 Successfully added ${testRecipes.length} test recipes!`);
    console.log('📍 Check http://localhost:9002 to see them on the home page.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding recipes:', error.message);
    process.exit(1);
  }
}

seedRecipes();
