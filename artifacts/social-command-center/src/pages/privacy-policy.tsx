import { Link } from "wouter";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="text-base font-semibold tracking-tight">Command Center</span>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to app
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: June 24, 2026</p>
        </div>

        <div className="space-y-8 text-[15px] leading-relaxed text-foreground/90">
          <p>
            This Privacy Policy explains how Command Center ("the App", "we", "us", or "our")
            collects, uses, and protects information when you use our social media management
            dashboard. The App is operated by Teak Decking Systems. By connecting your accounts
            and using the App, you agree to the practices described below.
          </p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">1. Who this applies to</h2>
            <p>
              The App is an internal tool used by our team to manage social media presence for
              accounts and Pages that we own or are authorized to administer. We do not provide
              the App as a public service to third parties.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">2. Information we collect</h2>
            <ul className="list-disc space-y-2 pl-5 marker:text-primary">
              <li>
                <span className="font-medium text-foreground">Account connection data:</span> When
                you connect a Facebook Page (or other social account), we receive identifiers, the
                Page name, and access tokens provided by the platform's authentication flow. These
                tokens let the App act on your behalf to publish and manage content.
              </li>
              <li>
                <span className="font-medium text-foreground">Content data:</span> Posts, captions,
                images, videos, scheduling details, comments, and replies that you create, import,
                or manage through the App.
              </li>
              <li>
                <span className="font-medium text-foreground">Engagement data:</span> Comments,
                basic engagement metrics, and post performance information retrieved from connected
                platforms to power analytics and the inbox.
              </li>
              <li>
                <span className="font-medium text-foreground">Usage data:</span> Standard technical
                information such as log data and timestamps generated while operating the App.
              </li>
            </ul>
            <p>
              We do <span className="font-medium text-foreground">not</span> collect payment card
              details, government IDs, or sensitive personal categories through the App.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">3. How we use information</h2>
            <p>We use the information solely to operate the App's features, including to:</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-primary">
              <li>Publish, schedule, and manage posts to connected Pages and accounts;</li>
              <li>Read, display, and reply to comments and messages;</li>
              <li>Show analytics and performance dashboards;</li>
              <li>Maintain, secure, and troubleshoot the App.</li>
            </ul>
            <p>We do not sell your information, and we do not use it for advertising or profiling.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">4. How information is shared</h2>
            <p>
              Information is shared only as needed to provide the App's functionality — primarily
              with the social platforms' official APIs (e.g., the Meta Graph API) when you publish
              or retrieve content. We may also share information with service providers that host or
              support the App, bound by confidentiality obligations, and where required by law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">5. Data retention</h2>
            <p>
              We retain connection tokens and content data for as long as the relevant account
              remains connected and the data is needed to provide the App's features. Access tokens
              are removed when you disconnect an account. We delete or anonymize data when it is no
              longer needed.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">6. Data deletion</h2>
            <p>
              You may request deletion of data associated with your account at any time. To do so,
              disconnect the account within the App, or email us at{" "}
              <a
                href="mailto:customerservice@teakdecking.com?subject=Data%20Deletion%20Request"
                className="font-medium text-primary underline underline-offset-2"
              >
                customerservice@teakdecking.com
              </a>{" "}
              with the subject line "Data Deletion Request" and the account/Page name. We will
              process verified requests promptly and confirm when complete. This page also serves as
              our data deletion instructions for the Meta App platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">7. Security</h2>
            <p>
              We use reasonable technical and organizational measures to protect information,
              including encrypted transport (HTTPS) and restricted access to credentials and tokens.
              No method of transmission or storage is completely secure, but we work to safeguard
              your data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">8. Your rights</h2>
            <p>
              Depending on your location, you may have rights to access, correct, or delete your
              personal information, or to object to or restrict certain processing. To exercise these
              rights, contact us using the details below.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">9. Children's privacy</h2>
            <p>
              The App is not directed to children under 13 (or the minimum age in your jurisdiction)
              and we do not knowingly collect their information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">10. Changes to this policy</h2>
            <p>
              We may update this Privacy Policy from time to time. The "Last updated" date reflects
              the most recent revision. Continued use of the App after changes constitutes acceptance
              of the updated policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">11. Contact us</h2>
            <p>
              For questions or requests regarding this Privacy Policy, contact:
              <br />
              Teak Decking Systems —{" "}
              <a
                href="mailto:customerservice@teakdecking.com"
                className="font-medium text-primary underline underline-offset-2"
              >
                customerservice@teakdecking.com
              </a>
            </p>
          </section>
        </div>

        <footer className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Teak Decking Systems. All rights reserved.
        </footer>
      </main>
    </div>
  );
}
