# Routing

`index.ts` defines public routes wrapped by `vite-plugin-vue-layouts`, the protected `DefaultLayout` route tree, session checks, and navigation progress.

* Keep public routes under the generated `PublicLayout` and avoid wrapping the protected route tree a second time.
* Put authenticated pages under the shared layout and retain the `requiresAuth` session guard. Do not treat local client state alone as authorization.
<!-- AI modified: routing references pages and layouts instead of mixing them with feature components. -->
* Keep route declarations and navigation behavior here; route entries belong in `../pages/<page>/index.vue`, shared shells in `../layouts/`, and page-private parts stay under their page. Import entries only; never reach into their private files.
* When changing a route, verify direct navigation, unauthenticated redirection, and progress completion on both success and error paths.
