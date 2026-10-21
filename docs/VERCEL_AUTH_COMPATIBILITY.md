# Vercel authentication dependency compatibility

The Firebase Admin 14.5.0 → jwks-rsa 4.1.0 → jose 6 chain synchronously requires an ESM-only package. It fails during module initialization when require(ESM) support is disabled, including the reported Vercel runtime. This breaks authenticated pages and server actions before request handling starts.

package.json contains a narrowly scoped npm override: jwks-rsa uses jose 5.10.0, which exposes a compatible CommonJS entry point. Other consumers are unaffected. Commit/deploy package.json and package-lock.json together; do not edit files under node_modules.

The privacy test suite starts a subprocess with --no-experimental-require-module, imports firebase-admin/auth and resolves a generated RSA JWK through jwks-rsa. This reproduced the crash before the override and passes after it.

Redeploy the updated source to Vercel so npm installs the updated lockfile. If a deployment reuses the old dependency tree, redeploy once with the existing build cache disabled. Then verify /connect redirects unauthenticated visitors to /login rather than returning 500, and sign in to test session creation.

Upstream tracking: https://github.com/auth0/node-jwks-rsa/issues/507

Keep this override until an upstream release resolves the loading incompatibility; test its removal under the same runtime restriction before updating.
