'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import {
  createBrandIntegration,
  getBrandIntegrations,
  updateBrandIntegration,
} from '@/lib/firestore-brands';
import type { BrandIntegration, BrandStatus } from '@/lib/firestore-brands';
import type { CreditTier } from '@/lib/firestore-credits';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const STATUS_COLORS: Record<BrandStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  active: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-gray-100 text-gray-800 border-gray-200',
};

interface FormData {
  brandName: string;
  brandWebsite: string;
  productCategory: string;
  contactEmail: string;
  notes: string;
  targetCreatorTiers: CreditTier[];
}

const EMPTY_FORM: FormData = {
  brandName: '',
  brandWebsite: '',
  productCategory: '',
  contactEmail: '',
  notes: '',
  targetCreatorTiers: [],
};

const ALL_TIERS: CreditTier[] = ['free', 'creator', 'pro'];

export function BrandsAdmin() {
  const [brands, setBrands] = useState<BrandIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBrands = async () => {
    setLoading(true);
    try {
      const data = await getBrandIntegrations();
      setBrands(data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (err) {
      console.error('Failed to load brands:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const toggleTier = (tier: CreditTier) => {
    setForm((f) => ({
      ...f,
      targetCreatorTiers: f.targetCreatorTiers.includes(tier)
        ? f.targetCreatorTiers.filter((t) => t !== tier)
        : [...f.targetCreatorTiers, tier],
    }));
  };

  const handleSubmit = async () => {
    if (!form.brandName.trim()) {
      setError('Brand name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createBrandIntegration({
        brandName: form.brandName.trim(),
        brandWebsite: form.brandWebsite.trim(),
        productCategory: form.productCategory.trim(),
        contactEmail: form.contactEmail.trim(),
        targetCreatorTiers: form.targetCreatorTiers,
        status: 'pending',
        notes: form.notes.trim(),
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await loadBrands();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save brand integration');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: BrandStatus) => {
    try {
      await updateBrandIntegration(id, { status });
      setBrands((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Brand Marketplace</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage brand partnership leads and integrations.
          </p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setError(null); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Brand Lead
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base">New Brand Integration Lead</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Brand Name *</label>
                <Input
                  placeholder="Acme Foods Co."
                  value={form.brandName}
                  onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Website</label>
                <Input
                  placeholder="https://…"
                  value={form.brandWebsite}
                  onChange={(e) => setForm((f) => ({ ...f, brandWebsite: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product Category</label>
                <Input
                  placeholder="e.g. Kitchen Appliances, Spices"
                  value={form.productCategory}
                  onChange={(e) => setForm((f) => ({ ...f, productCategory: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contact Email</label>
                <Input
                  type="email"
                  placeholder="contact@brand.com"
                  value={form.contactEmail}
                  onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Target Creator Tiers</label>
              <div className="flex gap-3">
                {ALL_TIERS.map((tier) => (
                  <label key={tier} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.targetCreatorTiers.includes(tier)}
                      onChange={() => toggleTier(tier)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="capitalize">{tier}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Partnership details, budget, timeline…"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving…' : 'Add Lead'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Brands table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : brands.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No brand integration leads yet. Add one above.
        </div>
      ) : (
        <div className="space-y-3">
          {brands.map((brand) => (
            <Card key={brand.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold">{brand.brandName}</p>
                      <Badge
                        className={`text-xs border ${STATUS_COLORS[brand.status]}`}
                        variant="outline"
                      >
                        {brand.status}
                      </Badge>
                      {brand.targetCreatorTiers.map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs capitalize">
                          {t}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-0.5">
                      {brand.brandWebsite && (
                        <p>
                          <a
                            href={brand.brandWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {brand.brandWebsite}
                          </a>
                        </p>
                      )}
                      {brand.productCategory && <p>Category: {brand.productCategory}</p>}
                      {brand.contactEmail && <p>Contact: {brand.contactEmail}</p>}
                      {brand.notes && (
                        <p className="text-xs mt-1 text-gray-500">{brand.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <select
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                      value={brand.status}
                      onChange={(e) => handleStatusChange(brand.id, e.target.value as BrandStatus)}
                    >
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
