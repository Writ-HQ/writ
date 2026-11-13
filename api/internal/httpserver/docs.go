package httpserver

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/Writ-HQ/writ/api/internal/oapi"
)

// Interactive API documentation, for developers, outside production only.
//
// The three routes need no authentication because they serve nothing but
// the API contract, which is not secret, and a page that renders it. To
// call the API from the page, a developer pastes an access token into its
// Authorize dialog (see cmd/devtoken); the API itself still checks it.
//
// The viewer is Swagger UI, loaded from a public CDN at a pinned version
// with integrity hashes, so the browser refuses a file that differs from
// the one these hashes were taken from. To upgrade, change the version and
// both hashes together.
const (
	swaggerUIVersion = "5.17.14"
	swaggerUIBase    = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@" + swaggerUIVersion + "/"
	swaggerUICSSHash = "sha384-wxLW6kwyHktdDGr6Pv1zgm/VGJh99lfUbzSn6HNHBENZlCN7W602k9VkGdxuFvPn"
	swaggerUIJSHash  = "sha384-wmyclcVGX/WhUkdkATwhaK1X1JtiNrr2EoYJ+diV3vj4v6OC5yCeSu+yW13SYJep"
)

// docsEndpoints are the routes mountDocs adds, in the form Authenticate
// takes.
var docsEndpoints = []string{
	"GET /docs",
	"GET /docs/init.js",
	"GET /docs/openapi.yaml",
}

const docsPage = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Writ API</title>
<link rel="stylesheet" href="` + swaggerUIBase + `swagger-ui.css" integrity="` + swaggerUICSSHash + `" crossorigin="anonymous">
</head>
<body>
<div id="docs"></div>
<script src="` + swaggerUIBase + `swagger-ui-bundle.js" integrity="` + swaggerUIJSHash + `" crossorigin="anonymous"></script>
<script src="/docs/init.js"></script>
</body>
</html>
`

// The token a developer pastes is kept in memory only: persistAuthorization
// stays off so that it is not written to the browser's storage.
const docsInit = `window.addEventListener("load", function () {
  window.ui = SwaggerUIBundle({
    url: "/docs/openapi.yaml",
    dom_id: "#docs",
    deepLinking: true,
    persistAuthorization: false
  });
});
`

// Scripts and styles only from this origin and the pinned CDN; requests
// only to this origin.
const docsCSP = "default-src 'none'; " +
	"script-src 'self' https://cdn.jsdelivr.net; " +
	"style-src 'unsafe-inline' https://cdn.jsdelivr.net; " +
	"img-src 'self' data:; font-src https://cdn.jsdelivr.net; " +
	"connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"

func mountDocs(r chi.Router) {
	serve := func(contentType, body string) http.HandlerFunc {
		return func(w http.ResponseWriter, _ *http.Request) {
			h := w.Header()
			h.Set("Content-Type", contentType)
			h.Set("Content-Security-Policy", docsCSP)
			h.Set("X-Content-Type-Options", "nosniff")
			h.Set("Referrer-Policy", "no-referrer")
			h.Set("Cache-Control", "no-store")
			_, _ = w.Write([]byte(body))
		}
	}
	r.Get("/docs", serve("text/html; charset=utf-8", docsPage))
	r.Get("/docs/init.js", serve("text/javascript; charset=utf-8", docsInit))
	r.Get("/docs/openapi.yaml", serve("application/yaml", string(oapi.Spec)))
}
