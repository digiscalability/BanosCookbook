/**
 * Text Pruning & Cleaning Utilities
 *
 * Intelligently removes unnecessary cues, markers, and meta-text from
 * scene descriptions, voiceover scripts, and video prompts.
 */

/**
 * Remove video/audio production cues and markers
 * Examples: "[INTRO]", "(voiceover)", "On-Screen Text:", "Scene 1:", etc.
 */
export function removeProductionCues(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // Remove bracketed scene markers: [INTRO], [SCENE 1], [OUTRO], etc.
  cleaned = cleaned.replace(/\[[A-Z][A-Za-z0-9 _\-:]*\]/g, '');

  // Remove parenthetical cues: (voiceover), (narration), (on-screen), etc.
  cleaned = cleaned.replace(/\([vV]oice[-\s]?over\)/gi, '');
  cleaned = cleaned.replace(/\([nN]arrat(ion|or)\)/gi, '');
  cleaned = cleaned.replace(/\([oO]n[-\s]?screen\)/gi, '');
  cleaned = cleaned.replace(/\([bB]ackground\s+music\)/gi, '');

  // Remove "On-Screen Text:", "Narrator:", "Voiceover:", prefixes
  cleaned = cleaned.replace(/^(On[-\s]Screen\s+Text|Narrator|Voiceover|Voice\s+Over)\s*:\s*/gim, '');

  // Remove generic scene cues
  cleaned = cleaned.replace(/^(Start\s+of\s+recipe|Final\s+step|End\s+of\s+recipe)\s*\(no\s+generic\s+(intro|outro)\)[.:]?\s*/gim, '');
  cleaned = cleaned.replace(/^(no\s+generic\s+(intro|outro))[.:]?\s*/gim, '');

  // Remove step numbering at start: "1.", "Step 2.", "2)", etc.
  cleaned = cleaned.replace(/^(Step\s+)?\d+[.):]\s*/gim, '');

  // Remove timestamp markers: [00:05], (0:10), etc.
  cleaned = cleaned.replace(/\[?\d{1,2}:\d{2}\]?/g, '');

  // Clean up multiple spaces and trim
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  return cleaned;
}

/**
 * Extract only the visual/action description from scene text,
 * removing all meta commentary and cues
 */
export function extractVisualDescription(text: string): string {
  if (!text) return '';

  let visual = removeProductionCues(text);

  // Remove phrases that are meta-instructions, not visual descriptions
  const metaPhrases = [
    /Let's\s+get\s+started/gi,
    /Welcome\s+(to|back)/gi,
    /Thanks?\s+for\s+watching/gi,
    /Don't\s+forget\s+to\s+subscribe/gi,
    /See\s+you\s+next\s+time/gi,
    /That's\s+(it|all)/gi,
    /Enjoy!?/gi,
    /Bon\s+app[ée]tit/gi,
  ];

  metaPhrases.forEach(pattern => {
    visual = visual.replace(pattern, '');
  });

  // Clean up and trim
  visual = visual.replace(/\s{2,}/g, ' ').trim();

  // Remove trailing punctuation if sentence fragments
  if (visual.length < 30) {
    visual = visual.replace(/[.!?;:]+$/, '');
  }

  return visual;
}

/**
 * Prepare text specifically for voiceover generation
 * Removes cues but keeps natural speech patterns
 */
export function prepareForVoiceover(text: string): string {
  if (!text) return '';

  let voiceText = removeProductionCues(text);

  // Remove camera directions (not meant to be spoken)
  voiceText = voiceText.replace(/\b(camera|shot|frame|zoom|pan|tilt|overhead|close-up|wide\s+shot)[^.!?]*[.!?]?/gi, '');

  // Remove lighting directions
  voiceText = voiceText.replace(/\b(lighting|light|natural\s+light|window\s+light|dramatic\s+lighting)[^.!?]*[.!?]?/gi, '');

  // Remove composition directions
  voiceText = voiceText.replace(/\b(composition|centered|in\s+frame|at\s+\d+\s+o'clock)[^.!?]*[.!?]?/gi, '');

  // Remove visual style directions
  voiceText = voiceText.replace(/\b(cinematic|appetizing|warm\s+atmosphere|inviting)[^.!?]*[.!?]?/gi, '');

  // Clean up
  voiceText = voiceText.replace(/\s{2,}/g, ' ').trim();

  // Ensure ends with proper punctuation for natural speech
  if (voiceText && !/[.!?]$/.test(voiceText)) {
    voiceText += '.';
  }

  return voiceText;
}

/**
 * Prepare text for Runway ML video generation
 * Removes cues but keeps cinematic descriptions
 */
export function prepareForVideoGeneration(text: string): string {
  if (!text) return '';

  let videoText = removeProductionCues(text);

  // Remove voiceover/narration text (visual only for Runway)
  videoText = videoText.replace(/\b(narrator\s+says?|voice\s*over|narrat(ion|or))[^.!?]*[.!?]?/gi, '');

  // Remove spoken instructions (actions only, not speech)
  videoText = videoText.replace(/["']([^"']+)["']/g, ''); // Remove quoted speech

  // Clean up
  videoText = videoText.replace(/\s{2,}/g, ' ').trim();

  return videoText;
}

/**
 * Check if text contains production cues that need cleaning
 */
export function hasProductionCues(text: string): boolean {
  if (!text) return false;

  const cuePatterns = [
    /\[[A-Z][A-Za-z0-9 _\-:]*\]/,
    /\(voiceover\)/i,
    /On[-\s]Screen\s+Text:/i,
    /Narrator:/i,
    /Start\s+of\s+recipe\s*\(no\s+generic/i,
    /Final\s+step\s*\(no\s+generic/i,
    /^Step\s+\d+[.:]?/im,
  ];

  return cuePatterns.some(pattern => pattern.test(text));
}

/**
 * Clean text for display in UI (removes cues but keeps readability)
 */
export function cleanForDisplay(text: string): string {
  if (!text) return '';

  let display = removeProductionCues(text);

  // Capitalize first letter
  display = display.charAt(0).toUpperCase() + display.slice(1);

  // Ensure proper sentence ending
  if (display && !/[.!?]$/.test(display)) {
    display += '.';
  }

  return display;
}

/**
 * Batch clean multiple text fields in a scene object
 */
export function cleanSceneText<T extends {
  script?: string;
  description?: string;
  promptSummary?: string;
  subtitleLines?: string[];
}>(scene: T): T {
  return {
    ...scene,
    script: scene.script ? cleanForDisplay(scene.script) : scene.script,
    description: scene.description ? extractVisualDescription(scene.description) : scene.description,
    promptSummary: scene.promptSummary ? cleanForDisplay(scene.promptSummary) : scene.promptSummary,
    subtitleLines: scene.subtitleLines?.map(line => removeProductionCues(line)),
  };
}

/**
 * Extract key action verbs from scene description (for transition planning)
 */
export function extractKeyActions(text: string): string[] {
  if (!text) return [];

  const cleaned = removeProductionCues(text);

  // Common cooking action verbs
  const actionPatterns = [
    /\b(mix|stir|whisk|beat|fold|pour|drizzle|sprinkle|chop|dice|slice|cut|blend|puree|saut[eé]|fry|bake|roast|grill|broil|simmer|boil|steam|plate|garnish|serve)\w*\b/gi,
  ];

  const actions: string[] = [];
  actionPatterns.forEach(pattern => {
    const matches = cleaned.match(pattern);
    if (matches) {
      actions.push(...matches.map(m => m.toLowerCase()));
    }
  });

  // Deduplicate and return
  return Array.from(new Set(actions));
}

/**
 * Validate that cleaned text is substantial (not just cues/markers)
 */
export function isSubstantialText(text: string): boolean {
  if (!text) return false;

  const cleaned = removeProductionCues(text);

  // Must have at least 10 chars of real content
  if (cleaned.length < 10) return false;

  // Must have at least one alphabetic word (not just numbers/punctuation)
  if (!/[a-zA-Z]{3,}/.test(cleaned)) return false;

  return true;
}
