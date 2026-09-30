# HTTP infrastructure

<!-- AI modified: HTTP owns transport without depending on application UI. -->
Keep Cookie/CSRF, refresh concurrency, cancellation, envelopes and runtime RequestError here. Use only transport types from `../types/http/`. UI feedback is supplied through callbacks by the application; do not import components, pages or business workflows.
