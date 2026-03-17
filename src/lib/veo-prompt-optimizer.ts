/**
 * Veo 3.1 Prompt Optimizer
 *
 * Builds accurate, cinematically rich prompts for Google's Veo 3.1.
 *
 * Key principles learned from real output failures:
 * 1. Every action needs beat-by-beat choreography — not just transfer loops
 * 2. Physical accuracy matters: no steam from cold liquid, no instant boiling, etc.
 * 3. Strip recipe measurements ("2 cups") — replace with visual descriptions
 * 4. Name ingredient appearance (color, texture, shape) — "pale-cream quinoa", "golden broth"
 * 5. Audio cues leverage Veo 3.1's native audio capability
 * 6. Negative cues must be step-specific — "no empty scoops" on a rinse step confuses the model
 *
 * Structure per Veo 3.1 best practices:
 *   [Camera] → [Scene setup + props] → [Beat-by-beat action] → [Physical state] → [Style] → [Lighting] → [Audio] → [Negatives]
 */

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface VeoSceneSpec {
  recipeTitle: string;
  stepText: string;            // Raw cooking instruction (preferred) or runway prompt
  description?: string;        // Optional richer visual description override
  visualElements?: string[];   // Key props / ingredients visible on screen
  cameraAngle?: string;        // e.g. "overhead", "close-up", "medium"
  lighting?: string;
  colorGrading?: string;
  negativePrompt?: string;     // Extra step-specific things to suppress
  duration?: number;
  sourceContainer?: string;    // e.g. "large pot of steamed rice"
  targetContainers?: string[]; // e.g. ["four empty bowls"]
  toolInUse?: string;          // e.g. "wooden serving scoop"
}

// ---------------------------------------------------------------------------
// Action type detection
// ---------------------------------------------------------------------------

type ActionType =
  | 'rinse'
  | 'pour'
  | 'stir'
  | 'chop'
  | 'sauté'
  | 'boil'
  | 'transfer_loop'  // fill multiple targets from one source
  | 'season'
  | 'plate'
  | 'bake'
  | 'whisk'
  | 'simmer'
  | 'generic';

function detectActionType(stepText: string): ActionType {
  const lower = stepText.toLowerCase();

  // Transfer loop first (most specific)
  const fillPatterns = /\b(fill|ladle|scoop|serve|portion|spoon out|dish out)\b/;
  const multiplePatterns = /\b(each|every|all|four|three|two|multiple|bowls|plates|cups)\b/;
  if (fillPatterns.test(lower) && multiplePatterns.test(lower)) return 'transfer_loop';

  if (/\b(rinse|wash|drain)\b/.test(lower)) return 'rinse';
  if (/\b(pour|add.*to|transfer.*to|tip.*into)\b/.test(lower)) return 'pour';
  if (/\b(chop|dice|slice|mince|cut|julienne|peel)\b/.test(lower)) return 'chop';
  if (/\b(whisk|beat)\b/.test(lower)) return 'whisk';
  if (/\b(stir|mix|fold|combine|toss)\b/.test(lower)) return 'stir';
  if (/\b(sauté|fry|sear|brown|cook.*pan)\b/.test(lower)) return 'sauté';
  if (/\b(simmer|reduce|low heat)\b/.test(lower)) return 'simmer';
  if (/\b(boil|bring to a boil)\b/.test(lower)) return 'boil';
  if (/\b(season|salt|pepper|sprinkle|drizzle)\b/.test(lower)) return 'season';
  if (/\b(plate|serve|garnish|present|arrange)\b/.test(lower)) return 'plate';
  if (/\b(bake|roast|oven)\b/.test(lower)) return 'bake';

  return 'generic';
}

// ---------------------------------------------------------------------------
// Ingredient visual descriptors
// Veo needs to know what things LOOK like, not just their names.
// ---------------------------------------------------------------------------

const INGREDIENT_VISUALS: Record<string, string> = {
  quinoa: 'pale-cream, tiny round quinoa grains',
  rice: 'fluffy white cooked rice grains',
  'brown rice': 'nutty brown cooked rice grains',
  onion: 'translucent white onion pieces',
  'red onion': 'purple-red onion rings',
  garlic: 'finely minced pale-yellow garlic',
  carrot: 'bright orange carrot pieces',
  celery: 'pale-green celery slices',
  tomato: 'vivid red tomato chunks',
  spinach: 'dark leafy green spinach',
  'chicken broth': 'pale golden chicken broth',
  'vegetable broth': 'amber-golden vegetable broth',
  'beef broth': 'deep brown beef stock',
  'olive oil': 'golden-green olive oil',
  butter: 'pale yellow butter',
  flour: 'fine white flour',
  egg: 'golden-yolk egg',
  milk: 'white milk',
  cream: 'thick white cream',
  'soy sauce': 'dark brown soy sauce',
  'coconut milk': 'thick white coconut milk',
  pasta: 'dry pale pasta',
  lemon: 'bright yellow lemon',
  lime: 'vivid green lime',
  avocado: 'creamy green avocado flesh',
  'bell pepper': 'shiny red, yellow, or green bell pepper strips',
  mushroom: 'earthy brown mushroom slices',
  zucchini: 'pale green zucchini slices',
  water: 'clear water',
};

function describeIngredient(name: string): string {
  const lower = name.toLowerCase().trim();
  for (const [key, visual] of Object.entries(INGREDIENT_VISUALS)) {
    if (lower.includes(key)) return visual;
  }
  return name;
}

// ---------------------------------------------------------------------------
// Strip recipe measurements — these confuse Veo (it can't visualise "2 cups")
// ---------------------------------------------------------------------------

function sanitizeMeasurements(text: string): string {
  return text
    // Remove fractional + unit combos: "2 cups", "1/2 teaspoon", "200ml", etc.
    .replace(/\b\d+\/?\d*\s*(cups?|tablespoons?|tbsp|teaspoons?|tsp|ml|liters?|litres?|oz|ounces?|lbs?|pounds?|grams?|g\b|kg)\b/gi, 'a measured amount of')
    // Remove standalone numbers before ingredients: "2 cloves garlic" → "garlic"
    .replace(/\b\d+\s+(?=[a-z])/gi, '')
    .replace(/a measured amount of\s+a measured amount of/gi, 'a measured amount of')
    .trim();
}

// ---------------------------------------------------------------------------
// Physical accuracy helpers
// ---------------------------------------------------------------------------

/** Return true if the step describes adding cold liquid to a pan before heating. */
function isColdToPan(stepText: string): boolean {
  const lower = stepText.toLowerCase();
  const addingLiquid = /\b(pour|add|transfer)\b/.test(lower);
  const coldLiquids = /\b(broth|stock|water|juice|milk|cream)\b/.test(lower);
  // If the step says "heat" or "bring to a boil" it might heat up during the clip
  const heatsUp = /\b(heat|bring to|boil|warm)\b/.test(lower);
  return addingLiquid && coldLiquids && !heatsUp;
}

/** Determine the physical state description for the start of the clip. */
function getPhysicalState(actionType: ActionType, stepText: string): string | null {
  switch (actionType) {
    case 'rinse':
      return 'Ingredients are dry at the start. Water runs over them during rinsing.';
    case 'pour':
      if (isColdToPan(stepText)) {
        return 'Liquid is cold — no steam, no boiling. Pan is at room temperature.';
      }
      return null;
    case 'sauté':
      return 'Pan is already hot with a thin film of oil shimmering on the surface.';
    case 'boil':
      return 'Water or liquid starts cold or warm and gradually reaches a rolling boil with vigorous bubbles.';
    case 'simmer':
      return 'Liquid is hot, producing gentle slow bubbles only — not a rolling boil.';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Beat-by-beat action sequences per action type
// ---------------------------------------------------------------------------

function buildActionBeats(actionType: ActionType, spec: VeoSceneSpec): string {
  const step = sanitizeMeasurements(spec.stepText);
  const ingredient = spec.visualElements?.[0]
    ? describeIngredient(spec.visualElements[0])
    : 'the ingredient';

  switch (actionType) {

    case 'rinse': {
      const strainer = spec.toolInUse ?? 'fine mesh strainer';
      const ingVisual = describeIngredient(
        step.match(/\b(quinoa|rice|beans?|lentils?|vegetables?|berries|herbs?)\b/i)?.[0] ?? ingredient
      );
      return (
        `Beat 1: Hands hold a ${strainer} filled with dry ${ingVisual} under the kitchen faucet. ` +
        `Beat 2: Cold water streams through the strainer, initially running cloudy with starch, then gradually clearing to clean water. ` +
        `Beat 3: Hands gently tilt and rotate the strainer to rinse all sides evenly. ` +
        `Beat 4: Water becomes fully clear — rinsing complete. Hands lift the strainer away from the flow.`
      );
    }

    case 'pour': {
      const liquid = step.match(/\b(broth|stock|water|oil|sauce|milk|cream|juice|vinegar)\b/i)?.[0] ?? 'liquid';
      const liquidVisual = describeIngredient(liquid);
      const container = spec.toolInUse ?? 'glass measuring cup';
      const target = spec.targetContainers?.[0] ?? spec.sourceContainer ?? 'saucepan';
      return (
        `Beat 1: Hands pick up a ${container} filled with ${liquidVisual}. ` +
        `Beat 2: Hands tilt the ${container} steadily over the ${target}. ` +
        `Beat 3: A smooth, unbroken stream of ${liquidVisual} pours into the ${target}, swirling as it pools. ` +
        `Beat 4: Hands set the ${container} down once the pour is complete.`
      );
    }

    case 'chop': {
      const item = step.match(/\b(onion|garlic|carrot|celery|pepper|herb|parsley|cilantro|tomato|mushroom|zucchini|potato)\b/i)?.[0] ?? 'vegetable';
      const itemVisual = describeIngredient(item);
      return (
        `Beat 1: Hands place ${itemVisual} on a clean wooden cutting board. ` +
        `Beat 2: A sharp chef's knife halves the ${item} with a clean cut. ` +
        `Beat 3: Hands dice the ${item} into uniform pieces with steady downward strokes of the knife. ` +
        `Beat 4: Pieces accumulate on the board — the ${item} fully chopped.`
      );
    }

    case 'whisk': {
      return (
        `Beat 1: Ingredients are combined in the bowl. ` +
        `Beat 2: A metal whisk dips into the mixture. ` +
        `Beat 3: Rapid circular whisking motion creates a smooth vortex in the bowl. ` +
        `Beat 4: Mixture transforms from separate ingredients into a smooth, uniform blend.`
      );
    }

    case 'stir': {
      return (
        `Beat 1: A wooden spoon rests in the pot or pan. ` +
        `Beat 2: Hands grip the spoon and begin slow, deliberate circular stirring. ` +
        `Beat 3: Ingredients move and combine with each sweep. ` +
        `Beat 4: The mixture looks evenly blended.`
      );
    }

    case 'sauté': {
      const item = spec.visualElements?.[0] ?? 'vegetables';
      return (
        `Beat 1: Pan is on medium-high heat with oil shimmering across the surface. ` +
        `Beat 2: Hands add ${describeIngredient(item)} to the hot pan — immediate sizzle as they hit the oil. ` +
        `Beat 3: Ingredients cook, edges browning and softening, steam rising naturally from the heat. ` +
        `Beat 4: Hands toss or stir the pan to cook evenly.`
      );
    }

    case 'boil': {
      return (
        `Beat 1: Pot on the stove contains liquid — starting cold or warm. ` +
        `Beat 2: Heat intensifies — small bubbles form on the bottom of the pot. ` +
        `Beat 3: Bubbles multiply and rise, reaching a vigorous rolling boil. ` +
        `Beat 4: Steam rises freely from the surface of the actively boiling liquid.`
      );
    }

    case 'simmer': {
      return (
        `Beat 1: Liquid in the pot is hot and active. ` +
        `Beat 2: Gentle, slow bubbles break the surface — a calm simmer, not a boil. ` +
        `Beat 3: Hands adjust the stove knob to maintain low heat. ` +
        `Beat 4: Pot simmers steadily — ingredients melding together in the low heat.`
      );
    }

    case 'season': {
      const seasoning = step.match(/\b(salt|pepper|cumin|paprika|oregano|thyme|spice|herb)\b/i)?.[0] ?? 'seasoning';
      return (
        `Beat 1: Hands pinch or hold a small bowl of ${seasoning}. ` +
        `Beat 2: Hands sprinkle the ${seasoning} evenly over the dish from a height. ` +
        `Beat 3: Fine crystals or flakes settle across the surface of the food. ` +
        `Beat 4: An even, appetizing dusting of ${seasoning} covers the dish.`
      );
    }

    case 'plate': {
      return (
        `Beat 1: A clean white plate is placed on the counter. ` +
        `Beat 2: Hands carefully portion and arrange the food onto the plate. ` +
        `Beat 3: Garnish or final touches are added with precision. ` +
        `Beat 4: The finished, plated dish sits beautifully composed.`
      );
    }

    case 'bake': {
      return (
        `Beat 1: Prepared dish is placed in the oven. ` +
        `Beat 2: Oven door closes. Timer is set. ` +
        `Beat 3: Time-lapse view through oven window — dish browning and rising. ` +
        `Beat 4: Hands remove the golden, cooked dish from the oven with oven mitts.`
      );
    }

    case 'transfer_loop': {
      const countMatch = spec.stepText.toLowerCase().match(/\b(two|three|four|five|six|2|3|4|5|6)\b/);
      const countMap: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6 };
      const count = countMatch
        ? (countMap[countMatch[1]] ?? (parseInt(countMatch[1], 10) || 4))
        : 4;
      const substance = spec.visualElements?.[0] ?? 'food';
      const tool = spec.toolInUse ?? 'serving scoop';
      const source = spec.sourceContainer ?? `pot of ${substance}`;
      const targets = spec.targetContainers ?? Array.from({ length: count }, (_, i) => `bowl ${i + 1}`);

      const beats = targets.map((target, i) =>
        `(${i + 1}) Hands dip the ${tool} into the ${source}, lift a heaped portion of ${describeIngredient(substance)}, ` +
        `and place it into ${target}. The ${tool} visibly returns to the ${source} before the next scoop.`
      );
      return (
        `Deliberate scoop-from-source, transfer-to-bowl rhythm — repeated for all ${count} containers: ` +
        beats.join(' ') +
        ` Each time, the ${tool} gathers fresh ${substance} from the ${source} before the next transfer.`
      );
    }

    default: {
      // Generic: use the sanitized step text as-is, stripped of measurements
      return sanitizeMeasurements(spec.description ?? spec.stepText)
        .replace(/^\d+[\.\)]\s*/, '')
        .replace(/\b(then|next|now|after that|once done)\b/gi, '')
        .trim();
    }
  }
}

// ---------------------------------------------------------------------------
// Audio cues per action type
// ---------------------------------------------------------------------------

function buildAudioCue(actionType: ActionType): string {
  switch (actionType) {
    case 'rinse':   return 'Sound of cold water running, grains or vegetables rustling softly in the strainer.';
    case 'pour':    return 'Sound of liquid splashing and pooling as it is poured.';
    case 'chop':    return 'Sound of knife tapping rhythmically on the cutting board.';
    case 'whisk':   return 'Sound of metal whisk clinking against the bowl in rapid circular strokes.';
    case 'stir':    return 'Sound of spoon scraping gently along the bottom of the pot.';
    case 'sauté':   return 'Sound of immediate sizzle as ingredients hit hot oil.';
    case 'boil':    return 'Sound of vigorous bubbling and rushing boiling water.';
    case 'simmer':  return 'Sound of gentle, intermittent bubbling — soft and rhythmic.';
    case 'season':  return 'Subtle sound of seasoning grains hitting the surface of the food.';
    case 'plate':   return 'Quiet, clean sounds of plating — dish set down, garnish placed.';
    case 'bake':    return 'Soft hum of oven fan in background; quiet kitchen ambience.';
    default:        return 'Ambient professional kitchen sounds — quiet, clean.';
  }
}

// ---------------------------------------------------------------------------
// Step-specific negative cues
// ---------------------------------------------------------------------------

function buildNegativeCues(actionType: ActionType, extraNegatives?: string): string {
  const base = ['no text or labels', 'no jump cuts', 'no unrelated food items'];

  switch (actionType) {
    case 'rinse':
      base.push('no steam', 'no dry ingredients after water starts flowing', 'no soapy water');
      break;
    case 'pour':
      base.push('no steam from cold liquid', 'no boiling before heat is applied', 'no spilling');
      break;
    case 'chop':
      base.push('no pre-chopped ingredients at start', 'no blurred hands', 'no off-screen knife');
      break;
    case 'sauté':
      base.push('no cold oil without heat', 'no raw ingredients staying raw throughout entire clip');
      break;
    case 'boil':
      base.push('no instant boiling without progression', 'no cold liquid appearing to boil');
      break;
    case 'simmer':
      base.push('no vigorous rolling boil', 'no cold unmoving liquid');
      break;
    case 'transfer_loop':
      base.push(
        'no empty scoops', 'no skipping the source container between servings',
        'no food appearing in bowl without being scooped first'
      );
      break;
    case 'season':
      base.push('no seasoning appearing pre-applied', 'no excessive amounts');
      break;
    default:
      base.push('no impossible physics', 'no abrupt unexplained changes');
  }

  if (extraNegatives) base.push(...extraNegatives.split(',').map(s => s.trim()).filter(Boolean));

  return `Avoid: ${base.join(', ')}.`;
}

// ---------------------------------------------------------------------------
// Camera angle expander
// ---------------------------------------------------------------------------

function expandCameraAngle(angle: string): string {
  const lower = angle.toLowerCase();
  if (lower.includes('overhead') || lower.includes('top')) return 'Close-up overhead shot looking straight down';
  if (lower.includes('macro') || lower.includes('extreme close')) return 'Extreme close-up macro shot, very shallow focus';
  if (lower.includes('close')) return 'Close-up shot, shallow depth of field';
  if (lower.includes('medium') || lower.includes('counter')) return 'Medium shot at counter height';
  if (lower.includes('side') || lower.includes('profile')) return 'Side-profile shot at eye level';
  if (lower.includes('low')) return 'Low angle looking upward';
  return angle;
}

// ---------------------------------------------------------------------------
// Lighting per action
// ---------------------------------------------------------------------------

function inferLighting(actionType: ActionType, supplied?: string): string {
  if (supplied) return supplied;
  switch (actionType) {
    case 'rinse':   return 'bright, even natural kitchen lighting — no warm tones';
    case 'chop':    return 'sharp, clear overhead kitchen lighting';
    case 'sauté':   return 'warm kitchen lighting with natural glow from the hot pan';
    case 'boil':    return 'warm steam-lit kitchen atmosphere';
    case 'plate':   return 'warm golden studio lighting, appetizing and glamorous';
    default:        return 'warm, soft overhead lighting with gentle shadows';
  }
}

// ---------------------------------------------------------------------------
// Main export: buildVeoPrompt
// ---------------------------------------------------------------------------

/**
 * Build a Veo 3.1-optimised prompt for any cooking step.
 *
 * Output structure:
 *   [Camera] [Scene setup] [Beat-by-beat action] [Physical state] [Style] [Lighting] [Audio] [Negatives]
 */
export function buildVeoPrompt(spec: VeoSceneSpec): string {
  const actionType = detectActionType(spec.stepText);
  const parts: string[] = [];

  // 1. CAMERA
  const camera = expandCameraAngle(spec.cameraAngle ?? inferDefaultCamera(actionType));
  parts.push(`${camera}.`);

  // 2. SCENE SETUP — name every visible prop explicitly
  const sceneProps: string[] = [];
  if (spec.sourceContainer) sceneProps.push(spec.sourceContainer);
  if (spec.visualElements?.length) {
    spec.visualElements
      .filter(v => v !== spec.sourceContainer)
      .slice(0, 4)
      .forEach(v => sceneProps.push(describeIngredient(v)));
  }
  if (spec.targetContainers?.length) sceneProps.push(...spec.targetContainers);
  if (spec.toolInUse) sceneProps.push(spec.toolInUse);

  if (sceneProps.length > 0) {
    parts.push(`Scene: ${sceneProps.join(', ')}.`);
  }

  // 3. BEAT-BY-BEAT ACTION
  parts.push(buildActionBeats(actionType, spec));

  // 4. PHYSICAL STATE (accuracy guard)
  const physicalState = getPhysicalState(actionType, spec.stepText);
  if (physicalState) parts.push(physicalState);

  // 5. STYLE
  const styleTokens = ['food cinematography', 'shallow depth of field', 'appetizing composition', 'professional kitchen'];
  if (spec.colorGrading) styleTokens.push(spec.colorGrading);
  parts.push(styleTokens.join(', ') + '.');

  // 6. LIGHTING
  parts.push(`Lighting: ${inferLighting(actionType, spec.lighting)}.`);

  // 7. AUDIO (Veo 3.1 native support)
  parts.push(buildAudioCue(actionType));

  // 8. NEGATIVES
  parts.push(buildNegativeCues(actionType, spec.negativePrompt));

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function inferDefaultCamera(actionType: ActionType): string {
  switch (actionType) {
    case 'rinse':         return 'close-up macro shot';
    case 'chop':          return 'overhead top-down shot';
    case 'pour':          return 'medium shot at counter height';
    case 'sauté':         return 'medium shot at counter height';
    case 'boil':          return 'medium shot at counter height';
    case 'simmer':        return 'medium shot at counter height';
    case 'season':        return 'close-up macro shot';
    case 'plate':         return 'overhead top-down shot';
    case 'transfer_loop': return 'overhead top-down shot';
    default:              return 'medium shot at counter height';
  }
}

// ---------------------------------------------------------------------------
// Reference implementation: rice bowl fill
// ---------------------------------------------------------------------------

export function buildRiceBowlFillPrompt(bowlCount: number = 4): string {
  return buildVeoPrompt({
    recipeTitle: 'Rice Bowl Preparation',
    stepText: `Fill ${bowlCount} bowls with rice using a scoop`,
    cameraAngle: 'overhead top-down shot',
    sourceContainer: 'large pot of fluffy steamed white rice',
    targetContainers: Array.from({ length: bowlCount }, (_, i) => `empty ceramic bowl ${i + 1}`),
    toolInUse: 'wooden serving scoop',
    visualElements: ['fluffy white cooked rice', 'ceramic bowls'],
    lighting: 'soft overhead lighting, gentle shadows',
    colorGrading: 'warm tones',
  });
}

// ---------------------------------------------------------------------------
// Migration helper for existing runwayPrompts
// ---------------------------------------------------------------------------

export function upgradeRunwayPromptToVeo(
  runwayPrompt: string,
  spec?: Partial<VeoSceneSpec>
): string {
  if (!spec?.stepText && !spec) return runwayPrompt;
  const merged: VeoSceneSpec = { recipeTitle: '', stepText: runwayPrompt, ...spec };
  return buildVeoPrompt(merged);
}
