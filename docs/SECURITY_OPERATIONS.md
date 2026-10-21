# Vespire security operations

Owner: Ahmad Hassan. Privacy/security contact: contactahmadrizvi@gmail.com. Status: procedure prepared for adoption and rehearsal before production; writing this document does not establish that the practices have occurred.

## Access and loss prevention

Grant only necessary production IAM roles and no shared staff accounts. Require MFA, strong unique passwords, a password manager and immediate access removal on role changes. Keep production and test projects, Shopify apps, credentials and datasets separate. Never paste credentials or customer records into tickets, screenshots, development fixtures or logs. Do not put exports in public buckets or send them through unapproved tools. Review access and cloud audit logs at least weekly; investigate unexpected exports, ownership failures and unusual traffic. Configure host/cloud alerts and a named responder before launch. Limit service account credentials to the deployment host's encrypted secret store; rotate on suspected exposure.

## Incident response

1. Report suspected exposure immediately to the owner; record discovery time and systems involved without copying customer records into the incident log.
2. Classify severity. Treat credential leakage, cross-store access or public customer-data exposure as critical. Suspend affected processing or deployment, revoke sessions and exposed credentials, restrict IAM/network paths, and preserve necessary forensic evidence in a restricted location.
3. Determine affected stores, data categories, timestamps and recipients. Inform affected merchants without undue delay after confirming a relevant breach; coordinate any required customer, Shopify, authority or provider notices using applicable contractual and legal deadlines.
4. Fix the cause, test authorization boundaries and privacy workflows, rotate compromised secrets, and restore only verified clean services. Reapply deletion/suppression records when restoring backups.
5. Document decisions, remediation and lessons learned; track corrective work to completion. Rehearse the process before launch and after material security changes.

## Retention and recovery

Check the daily cleanup succeeds. Verify data requests every business day and fulfill them within the required deadline, not just by downloading. Verify account/store deletion in live storage and review backups for deletion implications. Maintain a documented backup schedule, encryption evidence and access policy; test restore in an isolated environment using synthetic data. Retain incident evidence only as necessary for the incident and applicable obligations, with restricted access and a defined deletion date.
