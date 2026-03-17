/**
 * Veo 3.1 Prompt Optimizer
 *
 * Builds prompts for Google's Veo 3.1 video model using:
 * - Beat-by-beat sequential action choreography (fixes empty-scoop / skip-pot artifacts)
 * - Explicit source-container anchoring so the model never invents rice origins
 * - Negative cues appended inline to suppress common artifacts
 * - No hard character limit (Veo 3.1 supports rich, descriptive prompts)
 *
 * Core structure per the Veo 3.1 prompting guide:
 *   Subject → Source/Props → Sequential Action Beats → Style → Camera → Lighting → Audio → Negatives
 */

export interface VeoSceneSpec {
  recipeTitle: string;
  stepText: string;           // Raw cooking instruction
  description?: string;       // Optional richer visual description
  visualElements?: string[];  // Key props/ingredients visible on screen
  cameraAngle?: string;       // e.g. "overhead", "close-up", "medium"
  lighting?: string;
  colorGrading?: string;
  negativePrompt?: string;    // Extra things to suppress
  duration?: number;
  // Source container — the vessel that holds the ingredient being transferred.
  // Providing this prevents the model from skipping "pick up from source" beats.
  sourceContainer?: string;   // e.g. "large pot of steamed rice"
  targetContainers?: string[]; // e.g. ["four empty bowls"]
  toolInUse?: string;         // e.g. "wooden serving scoop"
}

/**
 * Detect whether a step involves transferring a substance from one container
 * to multiple targets (fill / scoop / ladle / serve / portion pattern).
 * When detected, we inject a looped beat sequence instead of a vague "fill" instruction.
 */
function detectTransferLoop(spec: VeoSceneSpec): {
  isTransferLoop: boolean;
  count: number;
  substance: string;
  tool: string;
  source: string;
  targets: string[];
} | null {
  const lower = spec.stepText.toLowerCase();
  const fillPatterns = /\b(fill|ladle|scoop|serve|portion|spoon|dish out)\b/;
  const multiplePatterns = /\b(each|every|all|four|three|two|multiple|bowls|plates|cups)\b/;
  if (!fillPatterns.test(lower) || !multiplePatterns.test(lower)) return null;

  // Count the number of target containers
  const countMatch = lower.match(/\b(two|three|four|five|six|2|3|4|5|6)\b/);
  const countMap: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6 };
  const count = countMatch ? (countMap[countMatch[1]] ?? (parseInt(countMatch[1], 10) || 4)) : 4;

  const substance = spec.visualElements?.[0] ?? 'rice';
  const tool = spec.toolInUse ?? 'serving scoop';
  const source = spec.sourceContainer ?? `pot of cooked ${substance}`;
  const targets = spec.targetContainers ?? Array.from({ length: count }, (_, i) => `bowl ${i + 1}`);

  return { isTransferLoop: true, count, substance, tool, source, targets };
}

/**
 * Build a looped beat sequence for transfer actions.
 * This is the key fix for the empty-scoop / skip-source artifacts.
 *
 * Each iteration explicitly states:
 *   1. Dip tool INTO source
 *   2. Lift heaped portion
 *   3. Transfer to numbered target
 *   4. Return tool to source before next iteration
 */
function buildTransferLoopBeats(
  source: string,
  targets: string[],
  tool: string,
  substance: string
): string {
  const beats = targets.map((target, i) => {
    const ordinal = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][i] ?? `${i + 1}th`;
    return `(${i + 1}) The hands dip the ${tool} deep into the ${source}, lift a heaped portion of ${substance}, ` +
      `and place it into the ${target}. The ${tool} visibly returns to the ${source} before the next scoop.`;
  });

  return (
    `This deliberate scoop-from-${source.split(' ').pop()}, serve-to-container rhythm repeats for all ${targets.length} containers:\n` +
    beats.join(' ') +
    ` Each time, the ${tool} gathers fresh ${substance} from the ${source} before moving to the next container.`
  );
}

/**
 * Infer camera description from a short keyword.
 */
function expandCameraAngle(angle: string): string {
  const lower = angle.toLowerCase();
  if (lower.includes('overhead') || lower.includes('top')) return 'Close-up overhead shot looking straight down';
  if (lower.includes('close')) return 'Extreme close-up, shallow focus';
  if (lower.includes('medium') || lower.includes('counter')) return 'Medium shot at counter height';
  if (lower.includes('side') || lower.includes('profile')) return 'Side-profile shot at eye level';
  if (lower.includes('low')) return 'Low angle looking upward';
  return angle;
}

/**
 * Build a Veo 3.1-optimised prompt for a cooking step.
 *
 * Output structure:
 *   [Camera] [Scene setup / props] [Beat-by-beat action] [Style] [Lighting] [Negative cues]
 */
export function buildVeoPrompt(spec: VeoSceneSpec): string {
  const parts: string[] = [];

  // 1. CAMERA — Veo 3.1 responds well to leading with shot type
  const camera = expandCameraAngle(spec.cameraAngle ?? 'overhead top-down shot');
  parts.push(`${camera}.`);

  // 2. SCENE SETUP — establish all props and source containers upfront
  const sceneProps: string[] = [];
  if (spec.sourceContainer) sceneProps.push(spec.sourceContainer);
  if (spec.visualElements?.length) {
    sceneProps.push(...spec.visualElements.filter(v => v !== spec.sourceContainer));
  }
  if (spec.targetContainers?.length) sceneProps.push(...spec.targetContainers);
  if (spec.toolInUse) sceneProps.push(spec.toolInUse);

  if (sceneProps.length > 0) {
    parts.push(`Scene contains: ${sceneProps.join(', ')}, arranged neatly on a kitchen counter.`);
  }

  // 3. ACTION BEATS — use loop choreography if this is a multi-target transfer
  const transferLoop = detectTransferLoop(spec);
  if (transferLoop) {
    parts.push(
      buildTransferLoopBeats(
        transferLoop.source,
        transferLoop.targets,
        transferLoop.tool,
        transferLoop.substance
      )
    );
  } else {
    // Standard description for non-loop steps
    const action = (spec.description ?? spec.stepText)
      .replace(/^\d+[\.\)]\s*/, '')
      .replace(/\b(then|next|now|after that|once done)\b/gi, '')
      .trim();
    parts.push(action);
  }

  // 4. STYLE
  const styleTokens = [
    'food cinematography',
    'shallow depth of field',
    'appetizing composition',
    'professional kitchen',
  ];
  if (spec.colorGrading) styleTokens.push(spec.colorGrading);
  parts.push(styleTokens.join(', ') + '.');

  // 5. LIGHTING
  const lighting = spec.lighting ?? 'warm, soft overhead lighting with gentle shadows';
  parts.push(`Lighting: ${lighting}.`);

  // 6. NEGATIVE CUES — always suppress the most common Veo artifacts for cooking
  const baseNegatives = [
    'no empty scoops',
    'no skipping the source container between servings',
    'no food appearing without being scooped first',
    'no text or labels',
    'no jump cuts',
  ];
  if (spec.negativePrompt) baseNegatives.push(...spec.negativePrompt.split(',').map(s => s.trim()));
  parts.push(`Avoid: ${baseNegatives.join(', ')}.`);

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Build a Veo 3.1 prompt for the rice-bowl-filling use-case.
 * This is the canonical reference implementation for the beat-by-beat scoop pattern.
 */
export function buildRiceBowlFillPrompt(bowlCount: number = 4): string {
  return buildVeoPrompt({
    recipeTitle: 'Rice Bowl Preparation',
    stepText: `Fill ${bowlCount} bowls with rice using a scoop`,
    cameraAngle: 'overhead top-down shot',
    sourceContainer: 'large pot of fluffy steamed rice',
    targetContainers: Array.from({ length: bowlCount }, (_, i) => `empty bowl ${i + 1}`),
    toolInUse: 'wooden serving scoop',
    visualElements: ['fluffy cooked white rice', 'ceramic bowls'],
    lighting: 'soft overhead lighting, gentle shadows',
    colorGrading: 'warm tones',
  });
}

/**
 * Generate a Veo prompt from an existing runwayPrompt (migration helper).
 * Keeps the original prompt but appends Veo-specific sequential beat hints
 * and removes Runway's character-limit compression artifacts.
 */
export function upgradeRunwayPromptToVeo(
  runwayPrompt: string,
  spec?: Partial<VeoSceneSpec>
): string {
  if (!spec) return runwayPrompt;
  // If no loop is detected, just return the runway prompt as-is (it's still valid for Veo)
  const transferLoop = detectTransferLoop({ stepText: runwayPrompt, recipeTitle: '', ...spec });
  if (!transferLoop) return runwayPrompt;

  // For transfer loops, rebuild with proper beat choreography
  return buildVeoPrompt({ recipeTitle: '', stepText: runwayPrompt, ...spec });
}
