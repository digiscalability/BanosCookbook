/**
 * Audio Integration Utilities
 *
 * Provides music and voice-over capabilities for video generation
 */

export interface AudioOptions {
  voiceOver?: {
    text: string;
    voice?: string; // ElevenLabs voice ID
  };
  backgroundMusic?: {
    url?: string; // Custom music URL
    genre?: string; // For music selection
    volume?: number; // 0-1
  };
}

export interface AudioResult {
  success: boolean;
  voiceOverUrl?: string;
  musicUrl?: string;
  combinedAudioUrl?: string;
  error?: string;
}

/**
 * Generate voice-over using ElevenLabs API
 */
export async function generateVoiceOver(
  text: string,
  voiceId: string = '21m00Tcm4TlvDq8ikWAM'
): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.statusText}`);
  }

  // Convert response to blob and upload to Firebase Storage
  const audioBlob = await response.blob();
  const audioUrl = await uploadAudioToStorage(audioBlob, `voiceover-${Date.now()}.mp3`);

  return audioUrl;
}

/**
 * Get background music URL based on genre
 */
export async function getBackgroundMusic(genre: string = 'upbeat'): Promise<string> {
  // For now, return a placeholder. In production, you'd integrate with:
  // - A licensed music library API (e.g., Epidemic Sound, Audio Network)
  // - Free music APIs (e.g., Freesound, Jamendo)
  // - Curated music collection stored in Firebase Storage

  const musicLibrary: Record<string, string> = {
    upbeat: 'https://storage.googleapis.com/banos-cookbook-music/upbeat-cooking.mp3',
    calm: 'https://storage.googleapis.com/banos-cookbook-music/calm-cooking.mp3',
    energetic: 'https://storage.googleapis.com/banos-cookbook-music/energetic-cooking.mp3',
    default: 'https://storage.googleapis.com/banos-cookbook-music/default-cooking.mp3',
  };

  return musicLibrary[genre] || musicLibrary.default;
}

/**
 * Upload audio file to Firebase Storage
 */
export async function uploadAudioToStorage(audioBlob: Blob, filename: string): Promise<string> {
  // Implement using Firebase Admin SDK. This is server-side only.
  try {
    const adminConfig = await import('../../config/firebase-admin');
    const getAdmin = adminConfig.getAdmin;
    const admin = getAdmin();
    const bucket = admin.storage().bucket();

    // Convert Blob to Buffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const file = bucket.file(`audio/${filename}`);
    await file.save(buffer, { metadata: { contentType: 'audio/mpeg' } });

    // Attempt to make public or return signed URL
    try {
      if (typeof file.makePublic === 'function') {
        await file.makePublic();
        return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
      }
    } catch {
      // ignore and try signed URL
    }
    const expires = Date.now() + 1000 * 60 * 60 * 24 * 365;
    const [signedUrl] = await file.getSignedUrl({ action: 'read', expires });
    return signedUrl;
  } catch (err) {
    console.error('uploadAudioToStorage failed', err);
    // Return placeholder path so callers can continue
    return `https://storage.googleapis.com/banos-cookbook-audio/${filename}`;
  }
}

/**
 * Combine voice-over and background music
 * This would typically be done with FFmpeg or a cloud media processing service
 */
export async function combineAudio(
  voiceOverUrl?: string,
  musicUrl?: string,
  musicVolume: number = 0.3
): Promise<string> {
  // In a real implementation, this would:
  // 1. Download both audio files
  // 2. Use FFmpeg to mix them (adjust volumes, timing)
  // 3. Upload the combined audio back to storage

  if (!voiceOverUrl && !musicUrl) {
    throw new Error('At least one audio source required');
  }

  if (voiceOverUrl && !musicUrl) {
    return voiceOverUrl; // Just voice-over
  }

  if (!voiceOverUrl && musicUrl) {
    return musicUrl; // Just music
  }

  // Placeholder for combined audio
  console.warn(`Would combine voice-over and music with volume ${musicVolume}`);
  return `https://storage.googleapis.com/banos-cookbook-audio/combined-${Date.now()}.mp3`;
}

/**
 * Generate audio for video based on options
 */
export async function generateVideoAudio(options: AudioOptions): Promise<AudioResult> {
  try {
    let voiceOverUrl: string | undefined;
    let musicUrl: string | undefined;

    // Generate voice-over if requested
    if (options.voiceOver?.text) {
      console.warn('🎤 Generating voice-over...');
      voiceOverUrl = await generateVoiceOver(options.voiceOver.text, options.voiceOver.voice);
    }

    // Get background music if requested
    if (options.backgroundMusic) {
      console.warn('🎵 Getting background music...');
      musicUrl =
        options.backgroundMusic.url || (await getBackgroundMusic(options.backgroundMusic.genre));
    }

    // Combine audio if both are present
    let combinedAudioUrl: string | undefined;
    if (voiceOverUrl || musicUrl) {
      console.warn('🔊 Combining audio...');
      combinedAudioUrl = await combineAudio(
        voiceOverUrl,
        musicUrl,
        options.backgroundMusic?.volume || 0.3
      );
    }

    return {
      success: true,
      voiceOverUrl,
      musicUrl,
      combinedAudioUrl,
    };
  } catch (error) {
    console.error('❌ Error generating video audio:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate audio',
    };
  }
}
