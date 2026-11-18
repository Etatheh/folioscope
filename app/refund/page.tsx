import LegalPage from "@/components/legal/LegalPage";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata = {
  title: "Refund Policy",
  description:
    "FolioScope refund policy covering the 7-day first-time purchase guarantee, cancellation and renewals.",
};

export default function RefundPage() {
  return (
    <LegalPage title="Refund Policy">
      <h2>1. 7-Day First-Time Purchase Guarantee</h2>
      <p>
        We want you to be confident in the research tools provided by
        FolioScope. If you purchase a FolioScope Pro subscription for the first
        time and are not satisfied for any reason, you may request a full refund
        within 7 calendar days of your initial transaction date.
      </p>

      <h2>2. Subscription Cancellation</h2>
      <p>
        You can cancel your recurring Pro subscription at any time with no
        cancellation fees:
      </p>
      <ol>
        <li>
          Log in to your FolioScope account and open Account Settings.
        </li>
        <li>Click Manage Subscription to open the Creem Customer Portal.</li>
        <li>Select Cancel Subscription.</li>
      </ol>
      <p>
        Your cancellation stops all future recurring charges, and you will
        continue to have full access to Pro features until the end of your
        current billing period.
      </p>

      <h2>3. Renewals &amp; Exceptions</h2>
      <ul>
        <li>
          <strong>Recurring Renewals:</strong> Once the initial 7-day refund
          window has passed, subsequent automatic monthly or annual renewal
          charges are generally non-refundable once the new billing cycle has
          commenced.
        </li>
        <li>
          <strong>Exceptional Circumstances:</strong> If you experience a
          verified technical outage that prevents access to paid Pro features, or
          if you were billed in error due to a duplicate transaction, please
          contact us within 14 days of the charge and we will issue a full or
          pro-rated refund as appropriate.
        </li>
      </ul>

      <h2>4. How to Request a Refund</h2>
      <p>
        To request an eligible refund, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with the
        email address registered to your FolioScope account and your Creem
        order/receipt reference. Approved refunds are processed back to your
        original payment method via Creem within 5 to 10 business days, depending
        on your card issuer or bank.
      </p>
    </LegalPage>
  );
}