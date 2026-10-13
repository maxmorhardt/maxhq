package server

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/swaggo/swag"
)

// the page works both locally (/swagger) and behind the gateway (/squares/swagger/<service>)
const scalarPage = `<!doctype html>
<html>
<head>
  <title>Squares API</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <div id="app"></div>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.62.5"></script>
  <script>
    (function () {
      var path = window.location.pathname.replace(/\/(index\.html)?$/, '')
      var idx = path.indexOf('/swagger')
      var apiBase = idx > 0 ? path.slice(0, idx) : ''
      fetch(path + '/doc.json')
        .then(function (r) { return r.json() })
        .then(function (spec) {
          spec.host = window.location.host
          spec.basePath = apiBase || '/'
          spec.schemes = [window.location.protocol.replace(':', '')]
          Scalar.createApiReference('#app', { content: spec, darkMode: true })
        })
    })()
  </script>
</body>
</html>`

// swaggerInstance is the --instanceName the service's docs were generated with
func RegisterRootRoutes(r *gin.Engine, health HealthHandler, swaggerInstance string) {
	r.GET("/health/live", health.Liveness)
	r.GET("/health/ready", health.Readiness)

	spec := func(c *gin.Context) {
		doc, err := swag.ReadDoc(swaggerInstance)
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return
		}
		c.Data(http.StatusOK, "application/json", []byte(doc))
	}

	r.GET("/swagger/doc.json", spec)
	r.GET("/swagger", serveScalar)
	r.GET("/swagger/", serveScalar)
	r.GET("/swagger/index.html", serveScalar)
}

func serveScalar(c *gin.Context) {
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(scalarPage))
}
