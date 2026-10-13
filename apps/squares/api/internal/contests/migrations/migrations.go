package migrations

import "embed"

// FS holds the contests schema migrations, applied at startup under search_path=contests
//
//go:embed *.sql
var FS embed.FS
