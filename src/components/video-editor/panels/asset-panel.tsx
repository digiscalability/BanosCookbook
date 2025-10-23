/**
 * Asset Panel Component
 * Browse and manage uploaded assets, drag to timeline
 */

'use client';

import {
  Film,
  Image as ImageIcon,
  Music,
  Plus,
  RefreshCw,
  Search,
  Subtitles,
  Trash2,
} from 'lucide-react';
import NextImage from 'next/image';
import React, { useMemo, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

import type { AssetType, EditorAsset } from '../types';

interface AssetPanelProps {
  recipeId: string;
  assets: EditorAsset[];
  onAssetSelect?: (assetId: string) => void;
  onAssetDelete?: (assetId: string) => Promise<void>;
  onDragStart: (asset: EditorAsset) => void;
  onRefresh: () => void;
  onUploadClick: () => void;
}

const ASSET_ICONS = {
  video: Film,
  audio: Music,
  image: ImageIcon,
  subtitle: Subtitles,
};

const ASSET_COLORS = {
  video: 'text-blue-500',
  audio: 'text-green-500',
  image: 'text-purple-500',
  subtitle: 'text-gray-500',
};

export function AssetPanel({
  recipeId: _recipeId,
  assets,
  onAssetSelect,
  onAssetDelete,
  onDragStart,
  onRefresh,
  onUploadClick,
}: AssetPanelProps) {
  const [selectedTab, setSelectedTab] = useState<AssetType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteAssetId, setDeleteAssetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter assets
  const filteredAssets = useMemo(() => {
    let filtered = assets;

    // Filter by type
    if (selectedTab !== 'all') {
      filtered = filtered.filter(asset => asset.type === selectedTab);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(asset => asset.filename.toLowerCase().includes(query));
    }

    // Sort by creation date (newest first)
    return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [assets, selectedTab, searchQuery]);

  // Count assets by type
  const assetCounts = useMemo(() => {
    const counts = {
      all: assets.length,
      video: 0,
      audio: 0,
      image: 0,
      subtitle: 0,
    };

    assets.forEach(asset => {
      counts[asset.type]++;
    });

    return counts;
  }, [assets]);

  // Handle drag start
  const handleDragStart = (asset: EditorAsset, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        assetId: asset.id,
        assetUrl: asset.url,
        assetType: asset.type,
        duration: asset.duration || 5,
        filename: asset.filename,
      })
    );

    // Set custom drag image if thumbnail available
    if (asset.metadata.thumbnail) {
      const img = new Image();
      img.src = asset.metadata.thumbnail;
      e.dataTransfer.setDragImage(img, 0, 0);
    }

    onDragStart(asset);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteAssetId || !onAssetDelete) return;

    setIsDeleting(true);
    try {
      await onAssetDelete(deleteAssetId);
      setDeleteAssetId(null);
    } catch (error) {
      console.error('🎬 Delete asset error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <div className="flex h-full flex-col bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium">Asset Library</h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onRefresh} className="h-8 w-8 p-0">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="default" size="sm" onClick={onUploadClick} className="h-8">
              <Plus className="mr-1 h-4 w-4" />
              Upload
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-9 border-gray-700 bg-gray-800 pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-800 p-2">
        <Button
          variant={selectedTab === 'all' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setSelectedTab('all')}
          className="flex-shrink-0"
        >
          All ({assetCounts.all})
        </Button>
        {(['video', 'audio', 'image', 'subtitle'] as const).map(type => {
          const Icon = ASSET_ICONS[type];
          return (
            <Button
              key={type}
              variant={selectedTab === type ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTab(type)}
              className="flex-shrink-0"
            >
              <Icon className={`mr-1.5 h-3.5 w-3.5 ${ASSET_COLORS[type]}`} />
              {type.charAt(0).toUpperCase() + type.slice(1)} ({assetCounts[type]})
            </Button>
          );
        })}
      </div>

      {/* Asset Grid */}
      <ScrollArea className="flex-1">
        {filteredAssets.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-gray-500">
            <div className="text-center">
              {searchQuery ? (
                <>
                  <Search className="mx-auto mb-2 h-12 w-12 opacity-50" />
                  <p className="text-sm">No assets found</p>
                </>
              ) : (
                <>
                  {selectedTab === 'all' ? (
                    <Film className="mx-auto mb-2 h-12 w-12 opacity-50" />
                  ) : (
                    React.createElement(ASSET_ICONS[selectedTab], {
                      className: 'h-12 w-12 mx-auto mb-2 opacity-50',
                    })
                  )}
                  <p className="mb-1 text-sm">
                    No {selectedTab === 'all' ? '' : selectedTab} assets yet
                  </p>
                  <p className="text-xs opacity-75">Upload files to get started</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-2">
            {filteredAssets.map(asset => {
              const Icon = ASSET_ICONS[asset.type];
              return (
                <div
                  key={asset.id}
                  draggable
                  onDragStart={e => handleDragStart(asset, e)}
                  onClick={() => onAssetSelect?.(asset.id)}
                  className="hover:bg-gray-750 group relative cursor-grab overflow-hidden rounded-lg bg-gray-800 transition-colors active:cursor-grabbing"
                >
                  {/* Thumbnail/Preview */}
                  <div className="relative flex aspect-video items-center justify-center bg-gray-900">
                    {asset.metadata.thumbnail ? (
                      <NextImage
                        src={asset.metadata.thumbnail}
                        alt={asset.filename}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <Icon className={`h-8 w-8 ${ASSET_COLORS[asset.type]}`} />
                    )}

                    {/* Duration Badge (for video/audio) */}
                    {asset.duration && (
                      <div className="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 py-0.5 text-xs">
                        {formatDuration(asset.duration)}
                      </div>
                    )}

                    {/* Delete Button */}
                    {onAssetDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => {
                          e.stopPropagation();
                          setDeleteAssetId(asset.id);
                        }}
                        className="absolute right-1 top-1 h-6 w-6 bg-black/75 p-0 opacity-0 hover:bg-red-500 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2">
                    <p className="truncate text-xs font-medium" title={asset.filename}>
                      {asset.filename}
                    </p>
                    <p className="text-[10px] text-gray-400">{formatFileSize(asset.fileSize)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteAssetId} onOpenChange={open => !open && setDeleteAssetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this asset? This action cannot be undone.
              {assets.find(a => a.id === deleteAssetId)?.usedInTimelines?.length ? (
                <span className="mt-2 block text-yellow-500">
                  Warning: This asset is used in{' '}
                  {assets.find(a => a.id === deleteAssetId)?.usedInTimelines?.length} timeline(s).
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
