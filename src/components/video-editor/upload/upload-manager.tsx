/**
 * Upload Manager Component
 * Multi-file uploader with drag-and-drop for videos, images, audio, subtitles
 */

'use client';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
    CheckCircle2,
    Film,
    Image as ImageIcon,
    Music,
    Subtitles,
    Upload,
    X,
    XCircle
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import type { AssetType, EditorAsset, UploadTask } from '../types';

interface UploadManagerProps {
  recipeId: string;
  onUploadComplete: (assets: EditorAsset[]) => void;
  maxFileSize?: number; // In bytes (default: 500MB for video)
}

// File type configurations
const FILE_CONFIGS = {
  video: {
    accept: {
      'video/mp4': ['.mp4'],
      'video/webm': ['.webm'],
      'video/quicktime': ['.mov'],
      'video/x-msvideo': ['.avi'],
    },
    maxSize: 500 * 1024 * 1024, // 500MB
    icon: Film,
    color: 'text-blue-500',
    label: 'Video',
  },
  image: {
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    icon: ImageIcon,
    color: 'text-purple-500',
    label: 'Image',
  },
  audio: {
    accept: {
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'audio/aac': ['.aac'],
      'audio/mp4': ['.m4a'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    icon: Music,
    color: 'text-green-500',
    label: 'Audio',
  },
  subtitle: {
    accept: {
      'text/plain': ['.srt', '.vtt'],
      'application/x-subrip': ['.srt'],
    },
    maxSize: 1 * 1024 * 1024, // 1MB
    icon: Subtitles,
    color: 'text-gray-500',
    label: 'Subtitle',
  },
} as const;

export function UploadManager({
  recipeId,
  onUploadComplete,
  maxFileSize,
}: UploadManagerProps) {
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [activeType, setActiveType] = useState<AssetType | 'all'>('all');
  const { toast } = useToast();

  // Detect asset type from file
  const detectAssetType = useCallback((file: File): AssetType | null => {
    const mimeType = file.type;
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (file.name.endsWith('.srt') || file.name.endsWith('.vtt')) return 'subtitle';
    return null;
  }, []);

  // Upload file to Firebase Storage
  const uploadFile = useCallback(async (task: UploadTask) => {
    try {
      // Update status to uploading
      setUploadTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: 'uploading' } : t))
      );

      // Create FormData
      const formData = new FormData();
      formData.append('file', task.file);
      formData.append('recipeId', recipeId);
      formData.append('assetType', task.type);

      // Upload with progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadTasks((prev) =>
            prev.map((t) => (t.id === task.id ? { ...t, progress } : t))
          );
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText);

          // Update to completed
          setUploadTasks((prev) =>
            prev.map((t) =>
              t.id === task.id
                ? { ...t, status: 'completed', progress: 100, url: result.url, assetId: result.assetId }
                : t
            )
          );

          // Notify parent
          onUploadComplete([result.asset]);

          toast({
            title: 'Upload Complete',
            description: `${task.file.name} uploaded successfully!`,
          });
        } else {
          throw new Error(`Upload failed with status ${xhr.status}`);
        }
      });

      xhr.addEventListener('error', () => {
        setUploadTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? { ...t, status: 'error', error: 'Network error occurred' }
              : t
          )
        );

        toast({
          title: 'Upload Failed',
          description: `Failed to upload ${task.file.name}`,
          variant: 'destructive',
        });
      });

      xhr.open('POST', '/api/upload-asset');
      xhr.send(formData);
    } catch (error) {
      console.error('🎬 Upload error:', error);
      setUploadTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
            : t
        )
      );

      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    }
  }, [recipeId, onUploadComplete, toast]);

  // Handle file drop
  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      // Show errors for rejected files
      if (fileRejections.length > 0) {
        fileRejections.forEach((rejection) => {
          const errors = rejection.errors.map((e) => e.message).join(', ');
          toast({
            title: 'Upload Error',
            description: `${rejection.file.name}: ${errors}`,
            variant: 'destructive',
          });
        });
      }

      // Process accepted files
      const newTasks: UploadTask[] = acceptedFiles.map((file) => ({
        id: `upload-${Date.now()}-${Math.random()}`,
        file,
        type: detectAssetType(file) || 'video',
        status: 'pending',
        progress: 0,
      }));

      setUploadTasks((prev) => [...prev, ...newTasks]);

      // Upload each file
      for (const task of newTasks) {
        await uploadFile(task);
      }
    },
    [detectAssetType, toast, uploadFile]
  );

  // Remove upload task
  const removeTask = useCallback((taskId: string) => {
    setUploadTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  // Get all accepted file types
  const getAllAcceptedTypes = useCallback(() => {
    if (activeType === 'all') {
      return Object.values(FILE_CONFIGS).reduce(
        (acc, config) => ({ ...acc, ...config.accept }),
        {}
      );
    }
    return FILE_CONFIGS[activeType].accept;
  }, [activeType]);

  // Get max file size
  const getMaxSize = useCallback(() => {
    if (maxFileSize) return maxFileSize;
    if (activeType === 'all') return FILE_CONFIGS.video.maxSize;
    return FILE_CONFIGS[activeType].maxSize;
  }, [activeType, maxFileSize]);

  // Setup dropzone
  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } =
    useDropzone({
      onDrop,
      accept: getAllAcceptedTypes(),
      maxSize: getMaxSize(),
      multiple: true,
    });

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <div className="space-y-4">
      {/* Type Filter */}
      <div className="flex gap-2">
        <Button
          variant={activeType === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveType('all')}
        >
          All Files
        </Button>
        {Object.entries(FILE_CONFIGS).map(([type, config]) => {
          const Icon = config.icon;
          return (
            <Button
              key={type}
              variant={activeType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveType(type as AssetType)}
            >
              <Icon className={`h-4 w-4 mr-2 ${config.color}`} />
              {config.label}
            </Button>
          );
        })}
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragAccept ? 'border-green-500 bg-green-500/10' : ''}
          ${isDragReject ? 'border-red-500 bg-red-500/10' : ''}
          ${!isDragActive ? 'border-gray-700 hover:border-gray-600 bg-gray-800/50' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        {isDragActive ? (
          <p className="text-lg font-medium">
            {isDragAccept ? 'Drop files here...' : 'Some files will be rejected'}
          </p>
        ) : (
          <>
            <p className="text-lg font-medium mb-2">
              Drag & drop {activeType === 'all' ? 'media files' : FILE_CONFIGS[activeType as AssetType].label.toLowerCase() + ' files'} here
            </p>
            <p className="text-sm text-gray-400 mb-4">or click to browse</p>
            <p className="text-xs text-gray-500">
              Max size: {formatFileSize(getMaxSize())}
            </p>
          </>
        )}
      </div>

      {/* Upload Tasks */}
      {uploadTasks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploads</h4>
          <div className="space-y-2">
            {uploadTasks.map((task) => {
              const config = FILE_CONFIGS[task.type];
              const Icon = config.icon;
              const StatusIcon =
                task.status === 'completed'
                  ? CheckCircle2
                  : task.status === 'error'
                  ? XCircle
                  : Upload;

              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg"
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.file.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={task.progress} className="h-1.5 flex-1" />
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {task.progress}%
                      </span>
                    </div>
                    {task.error && (
                      <p className="text-xs text-red-500 mt-1">{task.error}</p>
                    )}
                  </div>
                  <StatusIcon
                    className={`h-5 w-5 flex-shrink-0 ${
                      task.status === 'completed'
                        ? 'text-green-500'
                        : task.status === 'error'
                        ? 'text-red-500'
                        : 'text-gray-400 animate-pulse'
                    }`}
                  />
                  {(task.status === 'completed' || task.status === 'error') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTask(task.id)}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
