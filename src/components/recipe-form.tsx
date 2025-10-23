'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Loader2, Sparkles, Upload } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import type { ExtractedRecipe } from '@/ai/flows/recipes-from-pdf';
import {
  enhanceUserPhotoAction,
  extractRecipeDataFromImageUrl,
  extractRecipeDataFromPdf,
  generateRecipeImagesAction,
  markImageAsUsedAction,
} from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useFirestoreRecipes } from '@/hooks/use-firestore-recipes';
import { useToast } from '@/hooks/use-toast';

import { AIImagePreview, type AIGeneratedImage } from './ai-image-preview';

// Compress / resize an image File in the browser using a canvas.
// Returns a new File (JPEG) with the requested maximum dimension (preserves aspect ratio).
async function compressImageFile(file: File, maxDim = 1024, quality = 0.8): Promise<File> {
  return new Promise<File>((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file for compression'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Failed to load image for compression'));
        img.onload = () => {
          const { width, height } = img;
          const largest = Math.max(width, height);
          if (largest <= maxDim) {
            // No resizing needed, but convert to JPEG to control quality
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
              blob => {
                if (!blob) return reject(new Error('Compression failed'));
                const outFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
                  type: 'image/jpeg',
                });
                resolve(outFile);
              },
              'image/jpeg',
              quality
            );
            return;
          }

          const ratio = maxDim / largest;
          const targetW = Math.round(width * ratio);
          const targetH = Math.round(height * ratio);

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas not supported'));
          ctx.drawImage(img, 0, 0, targetW, targetH);

          canvas.toBlob(
            blob => {
              if (!blob) return reject(new Error('Compression failed'));
              const outFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
                type: 'image/jpeg',
              });
              resolve(outFile);
            },
            'image/jpeg',
            quality
          );
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      reject(err);
    }
  });
}

const recipeFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  ingredients: z.string().min(10, 'Please list at least one ingredient.'),
  instructions: z.string().min(20, 'Instructions must be at least 20 characters.'),
  prepTime: z.string().min(1, 'Prep time is required.'),
  cookTime: z.string().min(1, 'Cook time is required.'),
  servings: z.coerce.number().min(1, 'Servings must be at least 1.'),
  cuisine: z.string().min(2, 'Cuisine is required.'),
  authorName: z.string().min(2, 'Author name is required.'),
  authorEmail: z.string().email('Please enter a valid email address.').optional().or(z.literal('')),
  photo: z.instanceof(Blob).optional(),
  pdf: z.instanceof(Blob).optional(),
  postToInstagram: z.boolean().optional(),
});

type RecipeFormValues = z.infer<typeof recipeFormSchema>;

export default function RecipeForm() {
  const { toast } = useToast();
  const { addRecipe, recipes } = useFirestoreRecipes();
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState('');
  const [progressValue, setProgressValue] = useState(0);
  const [extractedPdfRecipes, setExtractedPdfRecipes] = useState<ExtractedRecipe[]>([]);
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<AIGeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<AIGeneratedImage | null>(null);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [showImageSelector, setShowImageSelector] = useState(false);

  // Custom photo upload state
  const [customPhoto, setCustomPhoto] = useState<AIGeneratedImage | null>(null);
  const [photoSuggestions, setPhotoSuggestions] = useState<string[]>([]);
  const [isEnhancingPhoto, setIsEnhancingPhoto] = useState(false);

  const handleImageSelection = (image: AIGeneratedImage) => {
    console.warn('Image selected:', image.description);
    setSelectedImage(image);
  };

  const handleCustomPhotoUpload = async (file: File) => {
    try {
      setIsEnhancingPhoto(true);
      toast({
        title: 'Analyzing your photo...',
        description: 'AI is analyzing your dish photo',
      });

      // Compress large user images before sending to AI to reduce payload size
      let uploadFile = file;
      try {
        const compressThreshold = 1 * 1024 * 1024; // 1MB
        if (file.size > compressThreshold) {
          toast({
            title: 'Optimizing photo...',
            description: 'Compressing image before analysis.',
          });
          uploadFile = await compressImageFile(file, 2048, 0.8);
          console.warn('Compressed user photo:', file.size, '->', uploadFile.size);
        }
      } catch (compressErr) {
        console.warn('Image compression failed, using original file', compressErr);
      }

      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(uploadFile);

      await new Promise((resolve, reject) => {
        reader.onload = resolve;
        reader.onerror = reject;
      });

      const imageDataUri = reader.result as string;

      // Get current recipe info
      const formData = form.getValues();
      const recipeInfo = {
        title: formData.title,
        description: formData.description,
        ingredients: formData.ingredients, // Keep as string
        cuisine: formData.cuisine,
      };

      // Call AI enhancement action
      const result = await enhanceUserPhotoAction(imageDataUri, recipeInfo);

      if (result.success && result.data) {
        // Create custom photo object
        const customPhotoObj: AIGeneratedImage = {
          url: result.data.enhancedImage,
          description: `Custom photo: ${formData.title}`,
          style: 'User uploaded photo with AI enhancement',
        };

        setCustomPhoto(customPhotoObj);
        setPhotoSuggestions(result.data.suggestions);
        setSelectedImage(customPhotoObj);

        toast({
          title: 'Photo analyzed!',
          description: `AI provided ${result.data.suggestions.length} suggestions for improvement`,
        });
      } else {
        throw new Error(result.error || 'Failed to enhance photo');
      }
    } catch (error) {
      console.error('Error enhancing photo:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to analyze photo',
        variant: 'destructive',
      });
    } finally {
      setIsEnhancingPhoto(false);
    }
  };

  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      title: '',
      description: '',
      ingredients: '',
      instructions: '',
      prepTime: '',
      cookTime: '',
      servings: 4,
      cuisine: '',
      authorName: '',
      authorEmail: '',
      postToInstagram: false,
    },
  });

  async function onSubmit(data: RecipeFormValues) {
    console.warn('Form submitted with data:', data);
    setIsSubmitting(true);

    try {
      // Check for duplicate recipe titles (case-insensitive)
      const normalizedTitle = data.title.trim().toLowerCase();
      const duplicateRecipe = recipes.find(
        recipe => recipe.title.trim().toLowerCase() === normalizedTitle
      );

      if (duplicateRecipe) {
        toast({
          variant: 'destructive',
          title: 'Duplicate Recipe',
          description: `A recipe with the title "${data.title}" already exists. Please use a different title.`,
        });
        setIsSubmitting(false);
        return;
      }

      // Mark the selected image as used (best-effort, don't block on failure)
      // Prepare image URL to send to server. If the selected image is a data URI
      // or is extremely large, upload it first to our upload endpoint so we only
      // send a compact storage URL in the recipe payload.
      const uploadDataUriToStorage = async (dataUri: string) => {
        try {
          // Convert data URI or remote URL to a Blob via fetch, then send as FormData
          const resp = await fetch(dataUri);
          if (!resp.ok) throw new Error(`Failed to fetch image data: ${resp.status}`);
          const blob = await resp.blob();
          // Create a filename hint
          const ext = blob.type ? blob.type.split('/')[1] : 'png';
          const file = new File([blob], `recipe-image.${ext}`, { type: blob.type || 'image/png' });
          const form = new FormData();
          form.append('file', file);
          // First attempt
          let upload = await fetch('/api/images/upload', { method: 'POST', body: form });
          // If rate-limited, try solving reCAPTCHA (v3) then retry with token header
          if (upload.status === 429) {
            const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
            if (siteKey) {
              try {
                // load grecaptcha (v3)
                await new Promise<void>((resolve, reject) => {
                  if ((window as unknown as { grecaptcha?: unknown }).grecaptcha) return resolve();
                  const s = document.createElement('script');
                  s.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
                  s.async = true;
                  s.onload = () => resolve();
                  s.onerror = () => reject(new Error('Failed to load recaptcha'));
                  document.head.appendChild(s);
                });

                const grecaptcha = (
                  window as unknown as {
                    grecaptcha?: { execute: (k: string, o?: unknown) => Promise<string> };
                  }
                ).grecaptcha;
                if (grecaptcha && typeof grecaptcha.execute === 'function') {
                  const token = await grecaptcha.execute(siteKey, { action: 'upload' });
                  // Retry with captcha token in header
                  upload = await fetch('/api/images/upload', {
                    method: 'POST',
                    body: form,
                    headers: { 'x-captcha-token': token },
                  });
                }
              } catch (rcErr) {
                console.warn('reCAPTCHA failed:', rcErr);
              }
            }
          }

          if (!upload.ok) {
            const txt = await upload.text();
            throw new Error(`Upload failed: ${upload.status} ${txt}`);
          }
          const payload = await upload.json();
          return payload?.url as string | undefined;
        } catch (err) {
          console.warn('Image upload failed:', err);
          return undefined;
        }
      };

      let finalSelectedImageUrl: string | undefined = selectedImage?.url;

      if (finalSelectedImageUrl) {
        const looksLikeData = finalSelectedImageUrl.startsWith('data:');
        const tooLarge =
          typeof finalSelectedImageUrl === 'string' && finalSelectedImageUrl.length > 1000000; // ~1MB
        if (looksLikeData || tooLarge) {
          try {
            toast({
              title: 'Uploading image...',
              description: 'Optimizing image before saving your recipe.',
            });
            const uploadedUrl = await uploadDataUriToStorage(finalSelectedImageUrl);
            if (uploadedUrl) finalSelectedImageUrl = uploadedUrl;
            else {
              // keep fallback (omit image if upload fails)
              finalSelectedImageUrl = undefined;
            }
          } catch (err) {
            console.warn('Failed to upload selected image before submit:', err);
            finalSelectedImageUrl = undefined;
          }
        }

        // Mark as used (best-effort) using the resolved URL
        if (finalSelectedImageUrl) {
          try {
            await markImageAsUsedAction(finalSelectedImageUrl);
            console.warn('✅ Marked selected image as used');
          } catch (error) {
            console.warn('⚠️ Failed to mark image as used, but continuing:', error);
          }
        }
      }

      // Save the recipe using the store
      const newRecipe = await addRecipe({
        title: data.title.trim(),
        description: data.description,
        ingredients: data.ingredients,
        instructions: data.instructions,
        prepTime: data.prepTime,
        cookTime: data.cookTime,
        servings: data.servings,
        cuisine: data.cuisine,
        author: data.authorName, // Use the author name from the form
        authorEmail:
          data.authorEmail && data.authorEmail.trim() !== '' ? data.authorEmail : undefined, // Only include if not empty
        selectedImageUrl: finalSelectedImageUrl, // Include selected image URL (uploaded if needed)
        postToInstagram: (data as unknown as { postToInstagram?: boolean }).postToInstagram,
      });

      // If user requested Instagram posting, show a toast and poll for the Instagram post info
      const wantsInstagram = Boolean(
        (data as unknown as { postToInstagram?: boolean }).postToInstagram
      );
      if (wantsInstagram) {
        const pending = toast({
          title: 'Sharing to Instagram…',
          description:
            'Your recipe is being posted to Instagram. We will notify you when it is available.',
        });

        // Poll the server for instagram post info
        (async () => {
          try {
            const maxAttempts = 12; // ~36 seconds
            const intervalMs = 3000;
            let attempt = 0;
            while (attempt < maxAttempts) {
              attempt++;
              try {
                const res = await fetch(
                  `/api/recipes/${encodeURIComponent(newRecipe.id)}/instagram`
                );
                if (res.ok) {
                  const json = await res.json();
                  if (json?.success && json.post?.permalink) {
                    // Update toast to success
                    pending.update({
                      id: pending.id,
                      title: 'Shared to Instagram',
                      description: (
                        <span>
                          Your recipe was posted:{' '}
                          <a
                            className="underline"
                            href={json.post.permalink}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View on Instagram
                          </a>
                        </span>
                      ),
                    });
                    return;
                  }
                }
              } catch {
                // ignore and retry
              }
              await new Promise(r => setTimeout(r, intervalMs));
            }

            // If we reach here, posting didn't surface in time
            pending.update({
              id: pending.id,
              title: 'Instagram posting pending',
              description:
                'The Instagram post did not appear immediately. It may take a little longer — we will continue to sync it in the background.',
            });
          } catch (err) {
            console.warn('Error while polling instagram info:', err);
          }
        })();
      }

      toast({
        title: 'Recipe Added!',
        description: `"${newRecipe.title}" has been added to your cookbook.`,
      });

      // Reset form and clear image selection
      form.reset();
      setSelectedImage(null);
      setGeneratedImages([]);
      setShowImageSelector(false);
      setCustomPhoto(null);
      setPhotoSuggestions([]);
    } catch (error) {
      console.error('Error submitting recipe:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save recipe. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please select an image smaller than 10MB.',
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please select an image file (JPG, PNG, etc.).',
      });
      return;
    }

    console.warn('Selected file:', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    // If the user selected a large phone photo, compress it before reading
    let workingFile = file;
    try {
      const compressThreshold = 1 * 1024 * 1024; // 1MB
      if (file.size > compressThreshold) {
        toast({
          title: 'Optimizing photo...',
          description: 'Compressing image for faster upload.',
        });
        workingFile = await compressImageFile(file, 2048, 0.8);
        console.warn('Compressed selected photo:', file.size, '->', workingFile.size);
      }
    } catch (compressErr) {
      console.warn('Image compression failed, using original file', compressErr);
    }

    setIsExtracting(true);
    setProgressValue(10);
    setExtractionProgress('Uploading image...');

    try {
      // Upload the image to Firebase Storage first to avoid large base64 payloads
      const formData = new FormData();
      formData.append('file', workingFile);

      const uploadResponse = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }

      const uploadResult = await uploadResponse.json();
      const imageUrl = uploadResult.url;

      if (!imageUrl) {
        throw new Error('No image URL returned from upload');
      }

      console.warn('Image uploaded successfully:', imageUrl);

      setProgressValue(30);
      setExtractionProgress('Processing with AI...');

      // Now send just the URL instead of base64 data
      const result = await extractRecipeDataFromImageUrl(imageUrl);

      if (result.success && result.data) {
        setProgressValue(80);
        setExtractionProgress('Populating form...');
        const {
          title,
          description,
          ingredients,
          instructions,
          prepTime,
          cookTime,
          servings,
          cuisine,
        } = result.data;
        form.reset({
          title,
          description,
          ingredients,
          instructions,
          prepTime,
          cookTime,
          servings,
          cuisine,
        });
        setProgressValue(100);
        setTimeout(() => {
          setIsExtracting(false);
          setExtractionProgress('');
          setProgressValue(0);
        }, 500);

        // Generate images for the extracted recipe
        generateImagesForRecipe({
          title,
          description,
          cuisine,
          ingredients,
        });

        toast({
          title: 'Recipe data extracted!',
          description: 'The form has been pre-filled. Please review and submit.',
        });
      } else {
        console.error('Extraction failed:', result.error);
        toast({
          variant: 'destructive',
          title: 'Oh no! Something went wrong.',
          description: result.error || 'Could not extract recipe data from the image.',
        });
        setIsExtracting(false);
        setExtractionProgress('');
        setProgressValue(0);
      }
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        variant: 'destructive',
        title: 'Error processing image',
        description:
          error instanceof Error ? error.message : 'Could not process the selected image.',
      });
      setIsExtracting(false);
      setExtractionProgress('');
      setProgressValue(0);
    }
  };

  const handlePdfFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    toast({
      title: 'Reading your PDF...',
      description: 'The AI is analyzing the file. This might take a few moments.',
    });

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const pdfDataUri = reader.result as string;
      const result = await extractRecipeDataFromPdf(pdfDataUri);

      if (result.success && result.data?.recipes) {
        if (result.data.recipes.length > 0) {
          setExtractedPdfRecipes(result.data.recipes);
          setIsPdfDialogOpen(true);
        } else {
          toast({
            variant: 'destructive',
            title: 'No Recipes Found',
            description: 'The AI could not find any recipes in this PDF.',
          });
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Oh no! Something went wrong.',
          description: result.error || 'Could not extract recipes from the PDF.',
        });
      }

      setIsExtracting(false);
    };
    reader.onerror = error => {
      console.error('Error reading file:', error);
      toast({
        variant: 'destructive',
        title: 'Error reading file',
        description: 'Could not read the selected PDF file.',
      });
      setIsExtracting(false);
    };
  };

  const generateImagesForRecipe = async (recipeData: {
    title: string;
    description: string;
    cuisine: string;
    ingredients: string;
  }) => {
    setIsGeneratingImages(true);
    try {
      const result = await generateRecipeImagesAction(recipeData);

      if (result.success && result.data?.images) {
        setGeneratedImages(result.data.images);
        // Auto-select the first image to avoid mismatch between selection and saved recipe
        if (result.data.images.length > 0) {
          setSelectedImage(result.data.images[0]);
        }
        setShowImageSelector(true);
        toast({
          title: 'Images Generated!',
          description: `${result.data.images.length} image(s) generated for your recipe.`,
        });
      } else {
        console.error('Image generation failed:', result.error);
        toast({
          variant: 'destructive',
          title: 'Image Generation Failed',
          description: result.error || 'Could not generate images for your recipe.',
        });
      }
    } catch (error) {
      console.error('Error generating images:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate images. Please try again.',
      });
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const handleSelectPdfRecipe = (recipe: ExtractedRecipe) => {
    form.reset({
      title: recipe.title,
      description: recipe.description,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      servings: recipe.servings,
      cuisine: recipe.cuisine,
      authorName: '',
      authorEmail: '',
    });
    setIsPdfDialogOpen(false);

    // Generate images for the selected recipe
    generateImagesForRecipe({
      title: recipe.title,
      description: recipe.description,
      cuisine: recipe.cuisine,
      ingredients: recipe.ingredients,
    });

    toast({
      title: 'Recipe data populated!',
      description: 'The form has been pre-filled. Please review and submit.',
    });
  };

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
            {/* AI Image Preview Section */}
            {showImageSelector && (
              <div className="mb-6">
                <AIImagePreview
                  images={generatedImages}
                  onSelectImage={handleImageSelection}
                  selectedImage={selectedImage}
                  isGenerating={isGeneratingImages}
                />

                {/* Custom Photo Upload Option */}
                <Card className="mt-4 border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <h4 className="mb-1 text-sm font-semibold">Or Upload Your Own Photo</h4>
                        <p className="text-xs text-muted-foreground">
                          Upload a photo of your cooked dish and get AI suggestions for improvement
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = async e => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              await handleCustomPhotoUpload(file);
                            }
                          };
                          input.click();
                        }}
                        disabled={isEnhancingPhoto}
                      >
                        {isEnhancingPhoto ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Photo
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Custom Photo Display with AI Suggestions */}
                {customPhoto && photoSuggestions.length > 0 && (
                  <Card className="mt-4 border-green-200 bg-green-50/50">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start gap-3">
                        {/* User-uploaded image preview - can't use Next.js Image for data URIs */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={customPhoto.url}
                          alt="Your uploaded dish"
                          className="h-24 w-24 rounded-lg border-2 border-green-300 object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold">
                            <Sparkles className="h-4 w-4 text-green-600" />
                            AI Photo Analysis
                          </h4>
                          <p className="mb-2 text-xs text-muted-foreground">
                            Your custom photo has been analyzed. Here are some suggestions:
                          </p>
                          <ul className="space-y-1 text-xs">
                            {photoSuggestions.map((suggestion, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="mt-0.5 text-green-600">•</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Manual Image Generation Button */}
            {form.watch('title') &&
              form.watch('description') &&
              form.watch('cuisine') &&
              !showImageSelector && (
                <div className="mb-6 space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const formData = form.getValues();
                      generateImagesForRecipe({
                        title: formData.title,
                        description: formData.description,
                        cuisine: formData.cuisine,
                        ingredients: formData.ingredients,
                      });
                    }}
                    disabled={isGeneratingImages}
                    className="w-full"
                  >
                    {isGeneratingImages ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating AI Images...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate AI Images
                      </>
                    )}
                  </Button>

                  {/* OR Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  {/* Custom Photo Upload */}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = async e => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          await handleCustomPhotoUpload(file);
                        }
                      };
                      input.click();
                    }}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Your Own Photo
                  </Button>
                </div>
              )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <FormField
                control={form.control}
                name="photo"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Recipe Photo</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="file"
                          id="photo-upload"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          disabled={isExtracting}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 w-full text-xs sm:h-11 sm:text-sm"
                          onClick={() => document.getElementById('photo-upload')?.click()}
                          disabled={isExtracting}
                        >
                          {isExtracting ? (
                            <Loader2 className="mr-2 h-3 w-3 animate-spin sm:h-4 sm:w-4" />
                          ) : (
                            <Sparkles className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          )}
                          {isExtracting
                            ? extractionProgress || 'Reading...'
                            : 'Auto-fill from Photo'}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs sm:text-sm">
                      Upload a photo of one handwritten recipe.
                    </FormDescription>
                    {isExtracting && (
                      <div className="mt-2 space-y-2">
                        <Progress value={progressValue} className="h-2" />
                        <p className="text-xs text-muted-foreground">{extractionProgress}</p>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pdf"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Recipe PDF</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="file"
                          id="pdf-upload"
                          accept="application/pdf"
                          onChange={handlePdfFileChange}
                          disabled={isExtracting}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 w-full text-xs sm:h-11 sm:text-sm"
                          onClick={() => document.getElementById('pdf-upload')?.click()}
                          disabled={isExtracting}
                        >
                          {isExtracting ? (
                            <Loader2 className="mr-2 h-3 w-3 animate-spin sm:h-4 sm:w-4" />
                          ) : (
                            <FileText className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          )}
                          {isExtracting ? 'Reading...' : 'Auto-fill from PDF'}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs sm:text-sm">
                      Upload a PDF with one or more recipes.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Recipe Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Grandma's Apple Pie"
                      className="h-10 sm:h-11"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A short and sweet story about your recipe..."
                      className="min-h-[80px] sm:min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              <FormField
                control={form.control}
                name="authorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Your Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., John Smith" className="h-10 sm:h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="authorEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Your Email (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="e.g., john@example.com"
                        className="h-10 sm:h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="sm:col-span-2">
                <FormField
                  control={form.control}
                  name="postToInstagram"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={Boolean(field.value)}
                        onChange={e => field.onChange(e.target.checked)}
                        id="post-to-instagram"
                        className="h-4 w-4"
                      />
                      <div>
                        <label htmlFor="post-to-instagram" className="text-sm font-medium">
                          Share to Instagram
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Automatically post this recipe to the configured Instagram account after
                          creation.
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-2">
              <FormField
                control={form.control}
                name="ingredients"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Ingredients</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="List each ingredient on a new line."
                        rows={8}
                        className="min-h-[120px] sm:min-h-[160px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs sm:text-sm">
                      One ingredient per line for best results.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Instructions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Step-by-step instructions. One step per line."
                        rows={8}
                        className="min-h-[120px] sm:min-h-[160px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs sm:text-sm">
                      One step per line for a numbered list.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="prepTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Prep Time</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 20 mins" className="h-10 sm:h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cookTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Cook Time</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 45 mins" className="h-10 sm:h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="servings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Servings</FormLabel>
                    <FormControl>
                      <Input type="number" className="h-10 sm:h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cuisine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Cuisine</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Italian" className="h-10 sm:h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full sm:w-auto"
              disabled={isExtracting || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Recipe...
                </>
              ) : (
                'Submit Recipe'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <Dialog open={isPdfDialogOpen} onOpenChange={setIsPdfDialogOpen}>
        <DialogContent className="mx-4 max-w-2xl sm:mx-0">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Recipes Found in PDF</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              We found {extractedPdfRecipes.length} recipes in your PDF. Select one to fill the
              form.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto p-1 sm:space-y-4">
            {extractedPdfRecipes.map((recipe, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">{recipe.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                    {recipe.description}
                  </p>
                  <Button
                    variant="link"
                    className="mt-2 h-auto p-0 text-xs sm:text-sm"
                    onClick={() => handleSelectPdfRecipe(recipe)}
                  >
                    Use this recipe
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
