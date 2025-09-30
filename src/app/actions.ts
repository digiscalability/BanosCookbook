'use server';

import {
  getNutritionalInformation,
  type NutritionalInformationOutput,
} from '@/ai/flows/nutritional-information-from-ingredients';

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
