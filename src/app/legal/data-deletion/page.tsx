import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Mail, Phone, Trash2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Data Deletion Instructions | Banos Cookbook',
  description: 'How to request deletion of your data from Banos Cookbook.',
};

export default function DataDeletionPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* eslint-disable react/no-unescaped-entities */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <Trash2 className="h-8 w-8 text-destructive" />
            <CardTitle className="font-headline text-4xl">Data Deletion Instructions</CardTitle>
          </div>
          <CardDescription>Last Updated: October 12, 2025</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Data deletion is permanent and cannot be undone. Please review this page carefully before submitting a deletion request.
            </AlertDescription>
          </Alert>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. What Data Will Be Deleted?</h2>
            <p className="text-muted-foreground mb-4">
              When you request data deletion, we will remove the following information from our systems:
            </p>

            <h3 className="text-xl font-semibold mb-3">Personal Information</h3>
            <ul className="list-disc pl-6 mb-4 text-muted-foreground space-y-2">
              <li>Your name and email address</li>
              <li>Account credentials and authentication data</li>
              <li>User preferences and settings</li>
              <li>Session data and cookies</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">Content You Created</h3>
            <ul className="list-disc pl-6 mb-4 text-muted-foreground space-y-2">
              <li>All recipes you uploaded or created</li>
              <li>Recipe images (uploaded or AI-generated)</li>
              <li>Comments and replies you posted</li>
              <li>Recipe ratings and likes</li>
              <li>Saved or bookmarked recipes</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">Integration Data</h3>
            <ul className="list-disc pl-6 mb-4 text-muted-foreground space-y-2">
              <li>Instagram connection and authorization tokens</li>
              <li>Instagram post IDs and sync data</li>
              <li>Third-party service connections</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Data Retention Exceptions</h2>
            <p className="text-muted-foreground mb-4">
              Some data may be retained for legal or operational reasons:
            </p>
            <ul className="list-disc pl-6 mb-4 text-muted-foreground space-y-2">
              <li><strong>Legal Compliance:</strong> Data required by law (e.g., financial records, abuse reports)</li>
              <li><strong>Backup Systems:</strong> Data in backup systems (deleted within 90 days)</li>
              <li><strong>Aggregated Analytics:</strong> Anonymized usage statistics (no personal identifiers)</li>
              <li><strong>Dispute Resolution:</strong> Data related to ongoing disputes or investigations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. How to Request Data Deletion</h2>

            <h3 className="text-xl font-semibold mb-3">Method 1: Email Request (Recommended)</h3>
            <div className="bg-muted p-6 rounded-lg mb-4">
              <div className="flex items-center gap-3 mb-3">
                <Mail className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-lg">Send Email Request</h4>
              </div>
              <p className="text-muted-foreground mb-3">
                Send an email to our data protection team with the subject line "Data Deletion Request":
              </p>
              <div className="space-y-2 text-sm">
                <p><strong>Email:</strong> <a href="mailto:privacy@banoscookbook.com?subject=Data Deletion Request" className="underline">privacy@banoscookbook.com</a></p>
                <p><strong>Subject:</strong> Data Deletion Request</p>
                <p><strong>Include:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Your full name</li>
                  <li>Email address associated with your account</li>
                  <li>Username (if applicable)</li>
                  <li>Reason for deletion (optional)</li>
                  <li>Confirmation: "I confirm I want to permanently delete my account and all associated data"</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-semibold mb-3">Method 2: Phone Request</h3>
            <div className="bg-muted p-6 rounded-lg mb-4">
              <div className="flex items-center gap-3 mb-3">
                <Phone className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-lg">Call Us</h4>
              </div>
              <p className="text-muted-foreground mb-2">
                Contact our support team directly:
              </p>
              <p className="text-lg font-semibold">
                <a href="tel:+61483210312" className="underline">+61 4 8321 0312</a>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Business Hours: Monday-Friday, 9:00 AM - 5:00 PM AEST
              </p>
            </div>

            <h3 className="text-xl font-semibold mb-3">Method 3: Instagram App (If Connected)</h3>
            <div className="bg-muted p-6 rounded-lg mb-4">
              <p className="text-muted-foreground mb-3">
                If you connected your Instagram Business account:
              </p>
              <ol className="list-decimal pl-6 space-y-2 text-sm text-muted-foreground">
                <li>Go to your Instagram app settings</li>
                <li>Navigate to <strong>Security → Apps and Websites</strong></li>
                <li>Find <strong>Banos Cookbook</strong> in the list</li>
                <li>Tap <strong>Remove</strong> to revoke access</li>
                <li>Then submit a deletion request via email or phone</li>
              </ol>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Verification Process</h2>
            <p className="text-muted-foreground mb-4">
              To protect your privacy and security, we verify your identity before processing deletion requests:
            </p>
            <ol className="list-decimal pl-6 mb-4 text-muted-foreground space-y-2">
              <li><strong>Identity Verification:</strong> We may ask you to confirm details about your account or recent activity</li>
              <li><strong>Email Confirmation:</strong> You'll receive a confirmation email with a verification link</li>
              <li><strong>Waiting Period:</strong> 24-hour cooling-off period before deletion begins</li>
              <li><strong>Final Confirmation:</strong> One last chance to cancel before permanent deletion</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Deletion Timeline</h2>
            <div className="space-y-4">
              <div className="border-l-4 border-primary pl-4">
                <p className="font-semibold">Within 24 Hours</p>
                <p className="text-sm text-muted-foreground">Initial review and identity verification</p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <p className="font-semibold">1-2 Business Days</p>
                <p className="text-sm text-muted-foreground">Account deactivation and immediate data removal</p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <p className="font-semibold">Up to 30 Days</p>
                <p className="text-sm text-muted-foreground">Complete removal from all systems and databases</p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <p className="font-semibold">Up to 90 Days</p>
                <p className="text-sm text-muted-foreground">Purging from backup systems and archives</p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. What Happens After Deletion?</h2>
            <ul className="list-disc pl-6 mb-4 text-muted-foreground space-y-2">
              <li>You will immediately lose access to your account</li>
              <li>All your recipes will be removed from the platform</li>
              <li>Comments you made on other recipes will show as "Deleted User"</li>
              <li>Likes and ratings you gave will be removed</li>
              <li>Instagram posts created via our platform will remain on Instagram (you must delete them manually)</li>
              <li>You will not be able to recover your data after deletion</li>
              <li>You can create a new account, but previous data cannot be restored</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Alternative Options</h2>
            <p className="text-muted-foreground mb-4">
              Before deleting your account, consider these alternatives:
            </p>

            <h3 className="text-xl font-semibold mb-3">Account Deactivation</h3>
            <p className="text-muted-foreground mb-3">
              Temporarily disable your account without deleting data. You can reactivate later.
            </p>

            <h3 className="text-xl font-semibold mb-3">Data Export</h3>
            <p className="text-muted-foreground mb-3">
              Request a copy of your data before deletion. We'll provide a downloadable archive of your recipes and content.
            </p>

            <h3 className="text-xl font-semibold mb-3">Selective Deletion</h3>
            <p className="text-muted-foreground mb-3">
              Delete specific recipes or comments instead of your entire account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Third-Party Data Deletion</h2>
            <p className="text-muted-foreground mb-4">
              If you used third-party integrations, you must also delete data from those services:
            </p>

            <h3 className="text-xl font-semibold mb-3">Instagram</h3>
            <ul className="list-disc pl-6 mb-4 text-muted-foreground space-y-2">
              <li>Revoke Banos Cookbook access in Instagram settings</li>
              <li>Manually delete any posts created via our platform</li>
              <li>Instagram retains data per their own policy</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">Google Services</h3>
            <ul className="list-disc pl-6 mb-4 text-muted-foreground space-y-2">
              <li>AI-processed data is not stored by Google beyond processing</li>
              <li>Firebase data is deleted with your account</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Contact Information</h2>
            <div className="bg-muted p-6 rounded-lg">
              <p className="font-semibold mb-3">Banos Cookbook - Data Protection Team</p>
              <div className="space-y-2 text-muted-foreground">
                <p><strong>ABN:</strong> 51 256 011 991</p>
                <p><strong>Email:</strong> <a href="mailto:privacy@banoscookbook.com" className="underline">privacy@banoscookbook.com</a></p>
                <p><strong>Phone:</strong> <a href="tel:+61483210312" className="underline">+61 4 8321 0312</a></p>
                <p><strong>Response Time:</strong> Within 1-2 business days</p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Complaints and Disputes</h2>
            <p className="text-muted-foreground mb-4">
              If you're not satisfied with how we handle your deletion request, you can:
            </p>
            <ul className="list-disc pl-6 mb-4 text-muted-foreground space-y-2">
              <li>Escalate to our Data Protection Officer: <a href="mailto:dpo@banoscookbook.com" className="underline">dpo@banoscookbook.com</a></li>
              <li>Contact the Australian Privacy Commissioner: <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer" className="underline">www.oaic.gov.au</a></li>
              <li>Seek legal advice regarding your privacy rights</li>
            </ul>
          </section>

          <div className="mt-8 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Related Documents:</strong>
            </p>
            <ul className="list-disc pl-6 mt-2 text-sm space-y-1">
              <li><Link href="/legal/privacy" className="underline">Privacy Policy</Link></li>
              <li><Link href="/legal/terms" className="underline">Terms of Service</Link></li>
              <li><Link href="/legal/cookies" className="underline">Cookie Policy</Link></li>
            </ul>
          </div>

          <Alert className="mt-8 border-destructive">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription>
              <strong>Final Warning:</strong> Data deletion is permanent and irreversible. Make sure to export any recipes or data you want to keep before submitting a deletion request.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
