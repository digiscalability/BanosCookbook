'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ShoppingBag, ExternalLink } from 'lucide-react';
import Link from 'next/link';

import { useAuth } from '@/lib/auth-context';
import {
  createProduct,
  deleteProduct,
  getProductsByUserId,
  updateProduct,
} from '@/lib/firestore-products';
import type { CreatorProduct, ProductType } from '@/lib/firestore-products';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProductFormData {
  title: string;
  description: string;
  priceInDollars: string;
  type: ProductType;
  isPublished: boolean;
  coverImageUrl: string;
  fileUrl: string;
}

const EMPTY_FORM: ProductFormData = {
  title: '',
  description: '',
  priceInDollars: '0',
  type: 'ebook',
  isPublished: false,
  coverImageUrl: '',
  fileUrl: '',
};

export function StoreManager() {
  const { user } = useAuth();
  const [products, setProducts] = useState<CreatorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CreatorProduct | null>(null);
  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getProductsByUserId(user.uid);
      setProducts(data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [user]);

  const openAddDialog = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (product: CreatorProduct) => {
    setEditingProduct(product);
    setForm({
      title: product.title,
      description: product.description,
      priceInDollars: (product.price / 100).toFixed(2),
      type: product.type,
      isPublished: product.isPublished,
      coverImageUrl: product.coverImageUrl ?? '',
      fileUrl: product.fileUrl ?? '',
    });
    setError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const priceInCents = Math.round(parseFloat(form.priceInDollars || '0') * 100);
      if (isNaN(priceInCents) || priceInCents < 0) {
        setError('Price must be a valid non-negative number');
        setSaving(false);
        return;
      }
      if (!form.title.trim()) {
        setError('Title is required');
        setSaving(false);
        return;
      }

      const productData = {
        userId: user.uid,
        username: (user.displayName ?? user.email ?? user.uid).toLowerCase().replace(/\s+/g, '_'),
        title: form.title.trim(),
        description: form.description.trim(),
        price: priceInCents,
        type: form.type,
        isPublished: form.isPublished,
        coverImageUrl: form.coverImageUrl.trim() || undefined,
        fileUrl: form.fileUrl.trim() || undefined,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
      } else {
        await createProduct(productData);
      }

      setDialogOpen(false);
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteProduct(productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (err) {
      console.error('Failed to delete product:', err);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-orange-500" />
            Your Digital Store
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Sell ebooks, meal plans, and digital products to your audience.
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-xl">
          <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500">No products yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Add your first digital product to start selling to your audience.
          </p>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Product
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <Card key={product.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">{product.title}</CardTitle>
                    <Badge variant="outline" className="text-xs capitalize">
                      {product.type.replace('-', ' ')}
                    </Badge>
                    {product.isPublished ? (
                      <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Draft
                      </Badge>
                    )}
                  </div>
                  <p className="text-lg font-bold">${(product.price / 100).toFixed(2)}</p>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
              </CardContent>
              <CardFooter className="flex gap-2 justify-end pt-0">
                {product.isPublished && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/${product.username}/store`} target="_blank">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View
                    </Link>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => openEditDialog(product)}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:border-red-300"
                  onClick={() => handleDelete(product.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct
                ? 'Update your digital product details.'
                : 'Create a new digital product to sell to your audience.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <Input
                placeholder="e.g. 30-Day Mediterranean Meal Plan"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
                placeholder="Describe what's included in this product…"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Price (USD) *</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="9.99"
                  value={form.priceInDollars}
                  onChange={(e) => setForm((f) => ({ ...f, priceInDollars: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ProductType }))}
                >
                  <option value="ebook">Ebook</option>
                  <option value="meal-plan">Meal Plan</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cover Image URL</label>
              <Input
                placeholder="https://…"
                value={form.coverImageUrl}
                onChange={(e) => setForm((f) => ({ ...f, coverImageUrl: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">File / Download URL</label>
              <Input
                placeholder="https://… (optional)"
                value={form.fileUrl}
                onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublished"
                checked={form.isPublished}
                onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="isPublished" className="text-sm font-medium">
                Published (visible on your store)
              </label>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editingProduct ? 'Save Changes' : 'Add Product'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
