'use server';

import {
  getNutritionalInformation,
  type NutritionalInformationOutput,
} from '@/ai/flows/nutritional-information-from-ingredients';
import {
  extractRecipeFromImage,
  type RecipeFromImageOutput,
} from '@/ai/flows/recipe-from-image';


export async function getNutritionalData(
  ingredients: string[]
): Promise<{
  success: boolean;
  data?: NutritionalInformationOutput;
  error?: string;
}> {
  try {
    const ingredientsString = ingredients.join(', ');
    if (!ingredientsString) {
      return { success: false, error: 'No ingredients provided.' };
    }
    
    const nutritionalInfo = await getNutritionalInformation({
      ingredients: ingredientsString,
    });
    
    return { success: true, data: nutritionalInfo };
  } catch (error) {
    console.error('Error fetching nutritional information:', error);
    return {
      success: false,
      error: 'Failed to get nutritional information. Please try again later.',
    };
  }
}

export async function extractRecipeDataFromImage(
  photoDataUri: string
): Promise<{
  success: boolean;
  data?: RecipeFromImageOutput;
  error?: string;
}> {
  try {
    if (!photoDataUri) {
      return { success: false, error: 'No image provided.' };
    }

    const extractedData = await extractRecipeFromImage({
      photoDataUri,
    });

    return { success: true, data: extractedData };
  } catch (error) {
    console.error('Error extracting recipe from image:', error);
    return {
      success: false,
      error: 'Failed to extract recipe from image. Please try again later.',
    };
  }
}
