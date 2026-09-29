# Routing

`index.ts` defines the login route, the protected `AdminLayout` route tree, session checks, and navigation progress.

* Put authenticated pages under the shared layout and retain the `requiresAuth` session guard. Do not treat local client state alone as authorization.
* Keep route declarations and navigation behavior here; page UI belongs in `../components/`.
* When changing a route, verify direct navigation, unauthenticated redirection, and progress completion on both success and error paths.
