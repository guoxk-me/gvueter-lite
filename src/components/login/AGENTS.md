# Login UI

`LoginPage.vue` composes the page and handles navigation and feedback. `LoginForm.vue` owns field interaction and local validation. Authentication requests and session state belong to `useAuth` in `src/composables/`.

* Keep credentials in the form/request flow; do not persist passwords or tokens in frontend storage.
* Preserve explicit feedback for invalid credentials, an unestablished session, and an unavailable service.
* Treat password recovery and administrator contact as pending flows until their real interfaces exist. Add corresponding copy in both locale files when the UI changes.
