package migrations

import "embed"

// FS holds the accounts schema migrations, applied at startup under search_path=accounts
//
//go:embed *.sql
var FS embed.FS
