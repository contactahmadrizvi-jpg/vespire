# Protected customer data release checklist

This is a focused readiness report for protected customer data, not a full App Store self-review or certification. Shopify decides approval. No deployment, dashboard subscription, cloud security setting or form submission was performed by this change.

## Implemented locally

- Verified, revocation-checked Firebase session cookies; server-side authentication on store pages and APIs.
- Store ownership enforced for listing, viewing, syncing, disconnecting and customer data exports. A valid Shopify OAuth callback links the store to the signed-in account. Legacy records without an owner are intentionally inaccessible until reconnected.
- OAuth nonce bound to account and shop. Privacy policy and merchant data processing terms accepted before connection, with version and acceptance time stored.
- Public diagnostic APIs disabled. Account/store access and exports generate metadata-only audit events. Credentials and contact values are excluded from these events.
- Customer order/checkout records fetched only for the last 30 days. Expired cached records removed on reads and by the scheduled retention endpoint. Audit metadata expires after 90 days and privacy request metadata after 30 days.
- Raw-body HMAC verified before processing customers/data_request, customers/redact, shop/redact and app/uninstalled. Invalid signatures return 401. Failed processing is retryable. Customer deletion markers prevent subsequent sync from re-importing deleted records. Suppression IDs remain until store disconnection/uninstall to enforce the deletion request.
- Account-scoped data request download and manual fulfillment tracking. Exports exclude credentials. The operator/merchant must verify recipients and deliver exports securely; downloads do not automatically fulfill a request.
- Default-deny Firestore client rules supplied. Test and production collection namespaces separated; production requires an explicit APP_DATA_ENV setting.
- Public /privacy and /terms pages identify Ahmad Hassan and contactahmadrizvi@gmail.com.

## Required before production — do not claim these are verified

1. Deploy with APP_DATA_ENV=production, HTTPS, and a dedicated production Firebase project and Shopify app. Use APP_DATA_ENV=test for preview/testing; never copy live customer records into test. Existing test-store records need reconnecting to establish ownership. Set SHOPIFY_SCOPES=read_products,read_orders,read_customers; remove write_orders in Shopify configuration because the dashboard does not edit orders. Reauthorize the store after changing scopes.
2. Deploy firestore.rules to the intended project after checking no other apps in that project need client database access. Restrict Firebase/Google Cloud IAM to necessary operators and service accounts, require MFA and strong passwords on operator accounts, and configure/enforce Firebase Authentication password policy. Local signup validation alone is not enforcement against direct SDK requests.
3. Verify encryption in transit, Firestore storage encryption, every backup/export location and backup encryption. Record provider contracts, processing regions, cross-border transfer safeguards, and backup retention/deletion procedure. No cloud settings were inspected or changed. Separate application namespaces supplement, but do not replace, restricted projects and credentials.
4. Set a strong CRON_SECRET in the host. Deploy vercel.json and verify the daily /api/maintenance/retention schedule actually executes successfully. Configure Firestore TTL on expiresAt for the audit and privacy request collections as a second cleanup mechanism. Monitor failures. Before expired records are hidden by read cleanup, they may still exist at rest until the scheduled cleanup succeeds.
5. Register these exact HTTPS webhook URLs for the matching Shopify app/environment, using the released APP_URL:
   - customers/data_request → /api/shopify/webhooks/customers-data-request
   - customers/redact → /api/shopify/webhooks/customers-redact
   - shop/redact → /api/shopify/webhooks/shop-redact
   - app/uninstalled → /api/shopify/webhooks/app-uninstalled
   Send Shopify test deliveries, verify invalid HMAC returns 401, and confirm records really disappear. Subscriptions are not created by merely adding route code.
6. Adopt and review SECURITY_OPERATIONS.md with the named operator. Regularly inspect access logs and cloud IAM, test restores without restoring deleted data, and test response to an incident. Keep evidence of these operational checks.
7. Check the Data requests page daily. Verify the requester through the merchant, export and securely deliver the data, then mark the request fulfilled within Shopify's required deadline. Contact support promptly if an export is incomplete. Historical records created before customer IDs were stored may not be attributable in an export; clear legacy caches and resync before production.
8. Request Name, Email and Phone in Shopify protected customer data settings with accurate purposes. Do not request Address. Complete the form based on implemented and verified practices. Accept any applicable provider contracts, and have the published policy/terms reviewed for your business and jurisdictions.
9. This app currently DOES NOT send outbound SMS/email. Consent is fetched and displayed, but there is no sending service, real-time consent recheck, suppression/unsubscribe flow, STOP webhook, delivery handling or messaging-provider contract. Do not claim consent enforcement for outbound campaigns or advertise automated messaging until these exist and are tested. Pending/redacted/unknown/missing consent must never be treated as subscribed.

## Accurate listing draft

Vespire helps merchants view recent products, orders and abandoned checkouts in one dashboard. Where Shopify access permits, it displays customer contact details and recorded SMS marketing consent to support checkout recovery workflows. Merchants can refresh store data, disconnect and delete their cached store data, and handle customer data access requests. This release does not send SMS or email campaigns.

## Form mapping

Purpose/minimization/retention/access logging have supporting code and policy evidence above, but require successful deployment and operation. Encryption, backup encryption, data-loss prevention, staff-password enforcement, environment separation, privacy contracts and incident response require the operator's cloud verification and adoption of the documented procedures. Consent for outbound messaging is not complete. No data sales or legally significant automated decisions are implemented; Not applicable may fit those questions if consistent with business practices. Third-party audits/certifications: none claimed.

## References

- https://shopify.dev/docs/apps/launch/protected-customer-data
- https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance
