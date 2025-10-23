'use client';

import { Film, Image as ImageIcon, Trash2 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminPage() {
  const adminTools = [
    {
      title: 'Video Hub',
      description: 'Create, manage, and generate video content for recipes',
      icon: Film,
      href: '/videohub',
      color: 'bg-blue-50 border-blue-200',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
      iconColor: 'text-blue-600',
      badge: 'Core Feature',
    },
    {
      title: 'Generated Images',
      description: 'View, manage, and cleanup AI-generated recipe images',
      icon: ImageIcon,
      href: '/admin/generated-images',
      color: 'bg-green-50 border-green-200',
      buttonColor: 'bg-green-600 hover:bg-green-700',
      iconColor: 'text-green-600',
      badge: 'Image Management',
    },
    {
      title: 'Database Cleanup',
      description: 'Clean up duplicate recipes and optimize database',
      icon: Trash2,
      href: '/admin/cleanup',
      color: 'bg-orange-50 border-orange-200',
      buttonColor: 'bg-orange-600 hover:bg-orange-700',
      iconColor: 'text-orange-600',
      badge: 'Maintenance',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8 px-4 md:px-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-3 text-4xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-lg text-slate-600">
            Manage recipes, videos, images, and database operations
          </p>
        </div>

        {/* Admin Tools Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {adminTools.map(tool => {
            const IconComponent = tool.icon;
            return (
              <Card
                key={tool.href}
                className={`border-2 transition-all duration-200 hover:shadow-lg hover:scale-105 ${tool.color}`}
              >
                <CardHeader className="pb-3">
                  <div className="mb-3 flex items-start justify-between">
                    <div className={`rounded-lg p-3 ${tool.color}`}>
                      <IconComponent className={`h-6 w-6 ${tool.iconColor}`} />
                    </div>
                    <span className="inline-block rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                      {tool.badge}
                    </span>
                  </div>
                  <CardTitle className="text-xl">{tool.title}</CardTitle>
                  <CardDescription className="mt-2">{tool.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-3">
                  <Link href={tool.href} className="block">
                    <Button
                      className={`w-full text-white transition-all duration-200 ${tool.buttonColor}`}
                      size="sm"
                    >
                      Access →
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Stats Section (Optional) */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="bg-white shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-slate-600">Admin Tools</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{adminTools.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-slate-600">Features Available</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">8+</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-slate-600">Last Updated</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">Today</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Help Section */}
        <div className="mt-12 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-3 font-semibold text-slate-900">Quick Help</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>
              <strong>Video Hub:</strong> Access the full video generation and management suite for recipe videos
            </li>
            <li>
              <strong>Generated Images:</strong> View all AI-generated images and remove unused ones to save storage
            </li>
            <li>
              <strong>Database Cleanup:</strong> Remove duplicate recipes and optimize database performance
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
