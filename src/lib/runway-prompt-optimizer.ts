/**
 * Advanced Runway ML Prompt Optimizer
 *
 * Optimizes video generation prompts for Runway ML with:
 * - Cinematography-first structure
 * - Visual continuity tracking between scenes
 * - Food videography best practices
 * - Intelligent compression (under 1000 char limit)
 */

export interface VisualContinuityContext {
  previousScene?: {
    props: string[];
    lighting: string;
    cameraAngle: string;
    composition: string;
    colorPalette: string;
    endingAction: string; // e.g., "hand stirring mixture"
  };
  sceneNumber: number;
  totalScenes: number;
  transition?: string; // e.g., "match-cut", "fade", "quick-cut"
}

export interface SceneVisualSpec {
  recipeTitle: string;
  script: string;
  description?: string;
  visualElements?: string[];
  cameraWork?: string;
  lighting?: string;
  colorGrading?: string;
  negativePrompt?: string;
  duration?: number;
}

/**
 * Build a Runway-optimized prompt with visual continuity
 *
 * Runway ML Best Practices:
 * - Max 1000 characters (aim for 800 for safety)
 * - Start with camera/composition spec
 * - Be specific about movement, not generic
 * - Include lighting and mood
 * - Mention continuity from previous scene for seamless flow
 */
export function buildRunwayPromptWithContinuity(
  spec: SceneVisualSpec,
  continuity?: VisualContinuityContext
): string {
  const segments: string[] = [];

  // 1. CONTINUITY OPENING (if not first scene)
  if (continuity?.previousScene && continuity.sceneNumber > 1) {
    const prev = continuity.previousScene;

    // Create visual bridge from previous scene
    if (continuity.transition === 'match-cut' && prev.endingAction) {
      segments.push(`Match-cut from ${prev.endingAction}.`);
    } else {
      // Continuity of props/elements
      const continuityElements = prev.props.slice(0, 2);
      if (continuityElements.length > 0) {
        segments.push(`Continuing with ${continuityElements.join(', ')} in frame.`);
      }
    }

    // Lighting consistency
    if (prev.lighting && prev.lighting !== 'default') {
      segments.push(`Maintain ${prev.lighting}.`);
    }
  }

  // 2. CAMERA/COMPOSITION (Most important for Runway)
  const cameraSpec = spec.cameraWork || inferCameraWork(continuity?.sceneNumber || 1, continuity?.totalScenes || 3);
  segments.push(formatCameraSpec(cameraSpec));

  // 3. SUBJECT/ACTION (What's happening)
  const recipeContext = continuity?.sceneNumber === 1
    ? `${spec.recipeTitle} preparation.`
    : '';

  if (recipeContext) segments.push(recipeContext);

  // Clean and compress the script text
  const actionDescription = compressScriptToVisualAction(spec.script, spec.description);
  segments.push(actionDescription);

  // 4. VISUAL ELEMENTS (Key props/ingredients)
  if (spec.visualElements && spec.visualElements.length > 0) {
    const elements = spec.visualElements.slice(0, 4).join(', ');
    segments.push(`Visible: ${elements}.`);
  }

  // 5. LIGHTING & MOOD
  const lighting = spec.lighting || continuity?.previousScene?.lighting || 'warm, natural kitchen lighting';
  segments.push(lighting);

  // 6. CINEMATOGRAPHY STYLE (Food videography essentials)
  const styleElements = [
    'cinematic food videography',
    'shallow depth of field',
    'appetizing composition',
  ];

  if (spec.colorGrading) {
    styleElements.push(spec.colorGrading);
  } else if (continuity?.previousScene?.colorPalette) {
    styleElements.push(continuity.previousScene.colorPalette);
  }

  segments.push(styleElements.join(', '));

  // 7. CAMERA MOVEMENT (if specified)
  const movement = extractCameraMovement(spec.cameraWork);
  if (movement) {
    segments.push(movement);
  }

  // 8. NEGATIVE PROMPT (what to avoid)
  if (spec.negativePrompt) {
    segments.push(`Avoid: ${spec.negativePrompt}.`);
  }

  // Assemble and compress to under 1000 chars
  let finalPrompt = segments.join(' ').replace(/\s+/g, ' ').trim();

  // Intelligent compression if over limit
  if (finalPrompt.length > 1000) {
    finalPrompt = compressPrompt(finalPrompt, 950);
  }

  return finalPrompt;
}

/**
 * Compress script text to essential visual actions only
 */
function compressScriptToVisualAction(script: string, description?: string): string {
  // If description provided, prefer it (should be more visual)
  if (description && description.length > 0 && description.length < 200) {
    return description;
  }

  // Extract visual verbs and nouns from script
  const visualVerbs = ['pour', 'stir', 'mix', 'chop', 'dice', 'sauté', 'sizzle', 'melt', 'drizzle', 'garnish', 'plate', 'serve', 'cook', 'heat', 'add', 'combine', 'whisk', 'fold', 'simmer', 'boil'];

  // Split into sentences, find ones with visual verbs
  const sentences = script.split(/[.!?]+/).filter(Boolean);
  const visualSentences = sentences.filter(s =>
    visualVerbs.some(verb => s.toLowerCase().includes(verb))
  );

  if (visualSentences.length > 0) {
    // Take first 2 visual sentences, max 250 chars
    return visualSentences.slice(0, 2).join('. ').slice(0, 250).trim() + '.';
  }

  // Fallback: first 200 chars of script
  return script.slice(0, 200).trim() + '...';
}

/**
 * Format camera specification in Runway-friendly way
 */
function formatCameraSpec(cameraWork: string): string {
  // Runway prefers specific camera language
  const cameraLower = cameraWork.toLowerCase();

  if (cameraLower.includes('overhead') || cameraLower.includes('top-down')) {
    return 'Overhead shot, looking straight down.';
  } else if (cameraLower.includes('close-up') || cameraLower.includes('closeup')) {
    return 'Extreme close-up, shallow focus.';
  } else if (cameraLower.includes('wide') || cameraLower.includes('establishing')) {
    return 'Wide shot, full scene visible.';
  } else if (cameraLower.includes('dolly') || cameraLower.includes('push in')) {
    return 'Camera slowly pushes in.';
  } else if (cameraLower.includes('pan')) {
    return 'Panning shot, smooth horizontal movement.';
  } else if (cameraLower.includes('static') || cameraLower.includes('locked')) {
    return 'Static frame, no camera movement.';
  }

  return `${cameraWork}.`;
}

/**
 * Extract camera movement details
 */
function extractCameraMovement(cameraWork?: string): string | null {
  if (!cameraWork) return null;

  const lower = cameraWork.toLowerCase();

  if (lower.includes('slow') && lower.includes('zoom')) {
    return 'Slow zoom in for emphasis.';
  } else if (lower.includes('track') || lower.includes('follow')) {
    return 'Camera tracks with the action.';
  } else if (lower.includes('handheld') || lower.includes('shaky')) {
    return 'Subtle handheld movement.';
  }

  return null;
}

/**
 * Infer appropriate camera work based on scene position
 */
function inferCameraWork(sceneNumber: number, totalScenes: number): string {
  if (sceneNumber === 1) {
    return 'Overhead shot, establishing all ingredients';
  } else if (sceneNumber === totalScenes) {
    return 'Close-up on final plated dish';
  } else if (sceneNumber === Math.floor(totalScenes / 2)) {
    return 'Medium shot, cooking action with hands visible';
  }

  return 'Close-up on cooking action';
}

/**
 * Intelligently compress prompt to target length while preserving key info
 */
function compressPrompt(prompt: string, targetLength: number): string {
  if (prompt.length <= targetLength) return prompt;

  // Priority order: Camera > Action > Lighting > Style > Details
  const priorities = [
    { pattern: /(overhead|close-up|wide shot|camera|shot)[^.]*\./i, weight: 10 },
    { pattern: /(pour|stir|mix|cook|heat|add|chop)[^.]*\./i, weight: 9 },
    { pattern: /(lighting|light|warm|natural|dramatic)[^.]*\./i, weight: 7 },
    { pattern: /(cinematic|videography|shallow|appetizing)[^.]*\./i, weight: 5 },
  ];

  // Split into sentences
  const sentences = prompt.split(/(?<=\.)\s+/);

  // Score each sentence
  const scoredSentences = sentences.map(sentence => {
    let score = 1;
    priorities.forEach(({ pattern, weight }) => {
      if (pattern.test(sentence)) score += weight;
    });
    return { sentence, score };
  });

  // Sort by score descending
  scoredSentences.sort((a, b) => b.score - a.score);

  // Rebuild prompt with highest priority sentences until under target
  let compressed = '';
  for (const { sentence } of scoredSentences) {
    if (compressed.length + sentence.length <= targetLength) {
      compressed += (compressed ? ' ' : '') + sentence;
    }
  }

  return compressed || sentences[0].slice(0, targetLength);
}

/**
 * Extract visual continuity data from a scene for use in next scene
 */
export function extractVisualContinuity(scene: {
  script: string;
  visualElements?: string[];
  cameraWork?: string;
  lighting?: string;
  colorGrading?: string;
}): VisualContinuityContext['previousScene'] {
  // Extract ending action from script (last sentence)
  const sentences = scene.script.split(/[.!?]+/).filter(Boolean);
  const lastSentence = sentences[sentences.length - 1] || '';

  return {
    props: scene.visualElements || [],
    lighting: scene.lighting || 'warm, natural lighting',
    cameraAngle: scene.cameraWork || 'medium shot',
    composition: 'balanced, rule of thirds',
    colorPalette: scene.colorGrading || 'warm tones, appetizing colors',
    endingAction: lastSentence.slice(0, 100),
  };
}

/**
 * Validate Runway prompt meets best practices
 */
export function validateRunwayPrompt(prompt: string): {
  valid: boolean;
  warnings: string[];
  score: number; // 0-100
} {
  const warnings: string[] = [];
  let score = 100;

  // Length check
  if (prompt.length > 1000) {
    warnings.push('Prompt exceeds 1000 character limit');
    score -= 30;
  } else if (prompt.length > 900) {
    warnings.push('Prompt is close to 1000 character limit');
    score -= 10;
  }

  // Camera spec check
  const hasCamera = /overhead|close-up|wide|shot|camera|dolly|pan|zoom/i.test(prompt);
  if (!hasCamera) {
    warnings.push('Missing camera/shot specification');
    score -= 20;
  }

  // Lighting check
  const hasLighting = /light|lighting|warm|natural|dramatic|bright|golden/i.test(prompt);
  if (!hasLighting) {
    warnings.push('Missing lighting specification');
    score -= 15;
  }

  // Visual action check
  const hasAction = /pour|stir|mix|cook|heat|chop|dice|add|sizzle|melt/i.test(prompt);
  if (!hasAction) {
    warnings.push('Missing clear visual action verb');
    score -= 15;
  }

  // Negative patterns (vague language)
  const vaguePatterns = [
    { pattern: /\bnice\b|\bgood\b|\bgreat\b/i, deduction: 5, message: 'Avoid vague adjectives (nice, good, great)' },
    { pattern: /\bmake\b|\bcreate\b(?! with)/i, deduction: 5, message: 'Use specific verbs instead of "make/create"' },
  ];

  vaguePatterns.forEach(({ pattern, deduction, message }) => {
    if (pattern.test(prompt)) {
      warnings.push(message);
      score -= deduction;
    }
  });

  return {
    valid: warnings.length === 0 || score >= 70,
    warnings,
    score: Math.max(0, score),
  };
}
