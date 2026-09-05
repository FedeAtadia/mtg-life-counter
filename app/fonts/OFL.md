# Fonts

Both faces are licensed under the SIL Open Font License 1.1, which permits
bundling and redistribution with an application.

| File | Family | Designer | Source |
| --- | --- | --- | --- |
| `Cinzel-600.woff2` | Cinzel | Natanael Gama | <https://fonts.google.com/specimen/Cinzel> |
| `Spectral-400.woff2`, `Spectral-600.woff2` | Spectral | Production Type | <https://fonts.google.com/specimen/Spectral> |

Only the latin subset is bundled, which is why each file is around 20 KB.

They are committed rather than fetched by `next/font/google` at build time for
two reasons: the build cannot reliably reach `fonts.googleapis.com` from every
machine this project is built on, and a counter used at a table with no signal
should not wait on a font request to paint.

Full licence text: <https://openfontlicense.org>
