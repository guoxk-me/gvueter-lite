# Locale messages

`zh-CN.yaml` and `en-US.yaml` provide the app's Chinese and English UI messages, compiled by the Vite Intlify plugin.

* Add, rename, or remove the same message keys in both files together. Preserve interpolation parameters and meaning across languages.
* Organize copy under the feature that owns it. Keep user-facing strings out of Vue components when an existing locale key should supply them.
