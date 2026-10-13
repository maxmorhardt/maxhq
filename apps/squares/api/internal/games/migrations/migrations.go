package migrations

import "embed"

// FS holds the games schema migrations, applied at startup under search_path=games
//
//go:embed *.sql
var FS embed.FS
