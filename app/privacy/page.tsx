import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy - Shelf",
  description: "Privacy policy for Shelf bookmarks",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-12">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-800 transition">
        <Image
          alt="Shelf logo"
          className="rounded-xl"
          height={24}
          src="/icon48.png"
          width={24}
        />
        <span>Back to Shelf</span>
      </Link>

      <h1 className="text-3xl font-medium mb-2">Privacy Policy</h1>
      <p className="text-neutral-500 mb-12">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className="prose prose-neutral max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-medium mb-4">Introduction</h2>
          <p className="text-neutral-700 leading-relaxed">
            Shelf is a bookmark management service that helps you save, organize, and search your bookmarks using semantic search. This privacy policy explains what data we collect, how we use it, and your rights regarding your information.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium mb-4">Data We Collect</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Account Information</h3>
              <p className="text-neutral-700 leading-relaxed">
                When you create an account, we collect your email address for authentication and account management. This information is required to provide you with access to your bookmarks.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">Bookmark Data</h3>
              <p className="text-neutral-700 leading-relaxed">
                We store the bookmarks you save, including:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-neutral-700">
                <li>URLs of web pages you bookmark</li>
                <li>Page titles, descriptions, and metadata (automatically fetched)</li>
                <li>Images and site names from bookmarked pages</li>
                <li>Notes you add to bookmarks</li>
                <li>Tags you assign to organize bookmarks</li>
                <li>Timestamps of when bookmarks were created and last visited</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">Embeddings for Search</h3>
              <p className="text-neutral-700 leading-relaxed">
                To enable semantic search functionality, we generate vector embeddings from your bookmark content (titles, descriptions, notes). These embeddings are stored in our database and used solely to power search within your bookmarks.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-medium mb-4">How We Use Your Data</h2>
          <p className="text-neutral-700 leading-relaxed mb-4">
            We use your data exclusively to provide and improve the Shelf service:
          </p>
          <ul className="list-disc list-inside space-y-1 text-neutral-700">
            <li>Storing and organizing your bookmarks</li>
            <li>Enabling semantic search across your bookmarks</li>
            <li>Providing access to your bookmarks across devices</li>
            <li>Managing your account and authentication</li>
            <li>Improving service functionality and performance</li>
          </ul>
          <p className="text-neutral-700 leading-relaxed mt-4">
            We do not sell, rent, or share your data with third parties for marketing purposes. We do not use your bookmarks to build advertising profiles or track you across other websites.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium mb-4">Data Storage and Security</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Storage</h3>
              <p className="text-neutral-700 leading-relaxed">
                Your data is stored securely in Supabase, a cloud database service. All data is encrypted in transit and at rest. We use row-level security policies to ensure that only you can access your own bookmarks and data.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">Security Measures</h3>
              <ul className="list-disc list-inside space-y-1 text-neutral-700">
                <li>Encryption of data in transit (HTTPS) and at rest</li>
                <li>Row-level security policies restricting data access to account owners</li>
                <li>Secure authentication using industry-standard protocols</li>
                <li>Regular security updates and monitoring</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-medium mb-4">Third-Party Services</h2>
          <p className="text-neutral-700 leading-relaxed mb-4">
            We use the following third-party services to operate Shelf:
          </p>
          <ul className="list-disc list-inside space-y-2 text-neutral-700">
            <li>
              <strong>Supabase</strong>: Hosts our database and provides authentication services. Your data is stored in Supabase's infrastructure, which is SOC 2 Type II certified.
            </li>
            <li>
              <strong>OpenAI</strong>: We use OpenAI's embedding API to generate vector embeddings for semantic search. Bookmark content (titles, descriptions, notes) is sent to OpenAI to create embeddings, but this data is not used to train OpenAI's models or for any other purpose beyond generating embeddings for your account.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-medium mb-4">Cookies</h2>
          <p className="text-neutral-700 leading-relaxed">
            We use authentication cookies to maintain your login session. These cookies are essential for the service to function and are not used for tracking or advertising purposes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium mb-4">Your Rights</h2>
          <p className="text-neutral-700 leading-relaxed mb-4">
            You have the following rights regarding your data:
          </p>
          <ul className="list-disc list-inside space-y-1 text-neutral-700">
            <li><strong>Access</strong>: You can view all your bookmarks and account information through the Shelf interface</li>
            <li><strong>Deletion</strong>: You can delete individual bookmarks or your entire account at any time</li>
            <li><strong>Export</strong>: You can export your bookmarks through the Shelf interface</li>
            <li><strong>Account Deletion</strong>: Deleting your account will permanently remove all your bookmarks, embeddings, and account data</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-medium mb-4">Data Retention</h2>
          <p className="text-neutral-700 leading-relaxed">
            We retain your data for as long as your account is active. When you delete a bookmark, it is immediately removed from our database. When you delete your account, all associated data, including bookmarks and embeddings, is permanently deleted.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium mb-4">Children's Privacy</h2>
          <p className="text-neutral-700 leading-relaxed">
            Shelf is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium mb-4">Changes to This Policy</h2>
          <p className="text-neutral-700 leading-relaxed">
            We may update this privacy policy from time to time. We will notify you of any material changes by updating the "Last updated" date at the top of this page. Your continued use of Shelf after changes become effective constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium mb-4">Contact Us</h2>
          <p className="text-neutral-700 leading-relaxed">
            If you have questions about this privacy policy or how we handle your data, please contact us through the support channels provided in the Shelf application.
          </p>
        </section>
      </div>
    </main>
  );
}
