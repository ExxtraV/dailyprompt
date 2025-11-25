export const metadata = {
  title: "Terms of Service | Run & Write",
  description: "Terms of Service for Run & Write.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-8 font-serif">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-10 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Terms of Service</h1>
        <p className="mb-4 text-sm text-gray-500">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="prose dark:prose-invert max-w-none">
          <h3>1. Acceptance of Terms</h3>
          <p>By accessing or using Run & Write ("the Service"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the Service.</p>

          <h3>2. User Accounts</h3>
          <p>When you create an account with us, you must provide accurate and complete information. You are responsible for safeguarding the password and for all activities that occur under your account.</p>

          <h3>3. Content</h3>
          <p>Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material ("Content"). You are responsible for the Content that you post to the Service, including its legality, reliability, and appropriateness.</p>
          <p>By posting Content to the Service, you grant us the right and license to use, modify, perform, display, reproduce, and distribute such Content on and through the Service.</p>

          <h3>4. Prohibited Uses</h3>
          <p>You may not use the Service for any illegal or unauthorized purpose. You agree not to violate any laws in your jurisdiction (including but not limited to copyright or trademark laws).</p>

          <h3>5. Termination</h3>
          <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>

          <h3>6. Changes</h3>
          <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.</p>

          <h3>7. Contact Us</h3>
          <p>If you have any questions about these Terms, please contact us.</p>
        </div>
      </div>
    </div>
  );
}
