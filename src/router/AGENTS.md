# Routing

`index.ts` defines public routes wrapped by `vite-plugin-vue-layouts`, the protected `AdminLayout` route tree, session checks, and navigation progress.

* Keep public routes under the generated `PublicLayout` and avoid wrapping the protected route tree a second time.
* Put authenticated pages under the shared layout and retain the `requiresAuth` session guard. Do not treat local client state alone as authorization.
* Keep route declarations and navigation behavior here; page UI belongs in `../components/`.
* When changing a route, verify direct navigation, unauthenticated redirection, and progress completion on both success and error paths.
