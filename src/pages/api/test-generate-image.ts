import { NextApiRequest, NextApiResponse } from 'next';

import { generateRecipeImagesAction } from '@/app/actions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { title, description, cuisine, ingredients } = req.body;
    const result = await generateRecipeImagesAction({ title, description, cuisine, ingredients });
    return res.status(200).json(result);
  } catch (err) {
    console.error('Test API error:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
}
