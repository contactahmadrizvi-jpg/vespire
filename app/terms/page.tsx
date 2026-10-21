import Link from "next/link";

export default function MerchantTerms() {
  return <main className="mx-auto max-w-3xl space-y-6 px-6 py-14">
    <h1 className="text-3xl font-bold">Merchant Data Processing Terms</h1>
    <p>Version: October 22, 2026. These terms apply between the connecting merchant and Ahmad Hassan, operator of Vespire. Contact: contactahmadrizvi@gmail.com.</p>
    <p>The merchant determines the purposes and lawful basis of customer data processing. Vespire processes the data described in its <Link className="underline" href="/privacy">Privacy Policy</Link> on the merchant’s instructions solely to provide the dashboard and checkout recovery support.</p>
    <p>The merchant authorizes Shopify and Google Firebase as service providers needed for the connection, authentication and storage, and the merchant’s configured deployment host. Before live use, the parties must confirm applicable provider contracts, processing locations, transfer safeguards, and any additional subprocessors.</p>
    <p>The merchant must provide customer notices, obtain any required consent and honor withdrawal and opt-out requests. Vespire records Shopify’s consent state without treating a phone number or checkout event as marketing consent. This version does not send marketing messages.</p>
    <p>Vespire limits access by account and store ownership, records access actions, applies the stated retention periods, and handles verified Shopify deletion requests. The operator assists the merchant with verified access and deletion requests and security incidents. For an incident, contact the operator immediately; the operator will investigate, contain exposure, preserve necessary evidence and inform affected merchants without undue delay after confirming a relevant breach.</p>
    <p>Disconnecting or uninstalling terminates the store connection and deletes its cached customer records and credentials. The merchant remains responsible for securely fulfilling downloaded data requests and for data exported outside Vespire.</p>
    <p>These terms do not certify regulatory compliance or guarantee Shopify approval. Production use requires the deployment controls and organizational practices documented in the release checklist.</p>
  </main>;
}
