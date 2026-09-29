# Authenticated layout

`AdminLayout.vue` owns the shared sidebar, top bar, account menu, and main-content scroll container for protected pages.

* Add page-specific content under a child route instead of placing it in the layout.
* Keep navigation, theme, language, and sign-out behavior consistent across protected pages. Read account identity from `useAuth` rather than display placeholders.
* Keep the shell at viewport height, with only the main content scrolling and the account entry visible while content scrolls.
