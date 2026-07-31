/* eslint-disable @next/next/no-html-link-for-pages -- vinext preview currently hydrates next/link with a duplicate React dispatcher. */

const UPDATED = "31 July 2026";

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <nav className="privacy-nav" aria-label="Privacy page navigation">
        <a className="privacy-brand" href="/">FORGE</a>
        <a href="/">Back to FORGE</a>
      </nav>

      <article className="privacy-document">
        <header>
          <p className="privacy-kicker">Privacy at FORGE</p>
          <h1>Your work is personal.<br />We treat it that way.</h1>
          <p>
            This notice explains what the current FORGE private beta keeps,
            why it is needed, and the controls available to you.
          </p>
          <dl>
            <div><dt>Last updated</dt><dd>{UPDATED}</dd></div>
            <div><dt>Current release</dt><dd>Private beta · adults 18+</dd></div>
          </dl>
        </header>

        <section>
          <p className="privacy-index">01 / What FORGE keeps</p>
          <h2>Only what supports your account and your training.</h2>
          <ul>
            <li>Your platform-provided email and display name, plus FORGE account status, role and plan.</li>
            <li>Workouts, sets, meals, hydration, progress and preferences that you choose to save.</li>
            <li>Limited operational and security metadata used to keep the service reliable and investigate abuse.</li>
          </ul>
          <p>
            FORGE does not receive your ChatGPT password. The current product
            does not ask for payment-card details, precise location, or
            unrelated medical records.
          </p>
        </section>

        <section>
          <p className="privacy-index">02 / Why it is used</p>
          <h2>To provide the product—not to build an advertising profile.</h2>
          <p>
            Account information opens the correct athlete workspace. Training
            records power your plan, corrections, export and progress views.
            Operational metadata protects the service and helps diagnose
            failures. FORGE does not sell athlete data or use it for
            third-party advertising.
          </p>
        </section>

        <section>
          <p className="privacy-index">03 / Your controls</p>
          <h2>You can inspect, correct, export and delete your work.</h2>
          <ul>
            <li>Review and correct durable records inside the app.</li>
            <li>Download workouts, meals and hydration from Account → Export my records.</li>
            <li>Delete individual records or permanently delete your FORGE athlete account.</li>
          </ul>
          <p>
            Account deletion removes the account identity, saved preferences
            and athlete-owned records in one operation. A non-identifying
            security marker may remain temporarily; it contains no email,
            name, saved record, request body or account ID.
          </p>
        </section>

        <section>
          <p className="privacy-index">04 / Retention</p>
          <h2>Different data has different lifetimes.</h2>
          <div className="privacy-table" role="table" aria-label="FORGE data retention">
            <div role="row"><strong role="columnheader">Account and training data</strong><span role="cell">Kept while your account is active, or until you delete it.</span></div>
            <div role="row"><strong role="columnheader">Write-limit counters</strong><span role="cell">Short-lived protection windows; expired rows are cleared automatically during later writes.</span></div>
            <div role="row"><strong role="columnheader">Security audit markers</strong><span role="cell">Eligible for deletion after 90 days and cleared during a later authenticated account change or an authorized maintenance run in the current private beta.</span></div>
          </div>
          <p className="privacy-note">
            Scheduled retention enforcement and managed backup expiry must be
            verified before FORGE opens to a wider audience.
          </p>
        </section>

        <section>
          <p className="privacy-index">05 / Infrastructure and access</p>
          <h2>Access is restricted and service providers are kept narrow.</h2>
          <p>
            FORGE currently uses the ChatGPT account flow for verified identity
            and OpenAI Sites infrastructure for application hosting and
            storage. Providers may process data only as needed to operate those
            services. FORGE does not intentionally share athlete records with
            advertisers or data brokers.
          </p>
        </section>

        <section>
          <p className="privacy-index">06 / Age and contact</p>
          <h2>The current beta is for adults.</h2>
          <p>
            FORGE is not yet designed for children. Guardian consent,
            age-appropriate explanations and youth safety controls are required
            before access can be offered to anyone under 18.
          </p>
          <p>
            During this owner-only beta, privacy actions are available through
            the Account panel. A dedicated external privacy contact will be
            published before access is widened.
          </p>
        </section>

        <footer>
          <p>This notice describes the current product. It is not a claim of legal certification.</p>
          <a href="/">Return to FORGE <span>→</span></a>
        </footer>
      </article>
    </main>
  );
}
