package pseudonym

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"unicode"
	"unicode/utf8"
)

const (
	prefix     = "u_"
	digestSize = 16
	minKeySize = 32
)

const Unnamed = "Player"

type Config struct {
	Key string `env:"PSEUDONYM_KEY,required,notEmpty"`
}

var key []byte

func SetKey(k string) error {
	if len(k) < minKeySize {
		return fmt.Errorf("PSEUDONYM_KEY must be at least %d bytes", minKeySize)
	}
	// a stray CRLF in one service's secret would silently give it different ids
	if strings.TrimSpace(k) != k {
		return errors.New("PSEUDONYM_KEY must not start or end with whitespace")
	}
	key = []byte(k)
	return nil
}

// anything that isn't an email (system, ghost, an existing id) passes through
func Of(email string) string {
	if !strings.Contains(email, "@") {
		return email
	}
	if key == nil {
		panic("pseudonym: SetKey was not called")
	}

	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(email))
	return prefix + base64.RawURLEncoding.EncodeToString(mac.Sum(nil)[:digestSize])
}

func Name(displayName string) string {
	full := FullName(displayName)
	// "Last, First" puts the surname first
	if last, first, ok := strings.Cut(full, ","); ok {
		full = first + " " + last
	}

	parts := strings.FieldsFunc(full, func(r rune) bool { return unicode.IsSpace(r) || r == ',' })
	switch len(parts) {
	case 0:
		return ""
	case 1:
		return parts[0]
	}

	i := strings.IndexFunc(parts[len(parts)-1], unicode.IsLetter)
	if i < 0 {
		return parts[0]
	}
	initial, _ := utf8.DecodeRuneInString(parts[len(parts)-1][i:])
	return parts[0] + " " + string(unicode.ToUpper(initial)) + "."
}

func Public(displayName string) string {
	if name := Name(displayName); name != "" {
		return name
	}
	return Unnamed
}

// a name that fell back to the email is dropped, since its local part is the email
func FullName(displayName string) string {
	if strings.Contains(displayName, "@") {
		return ""
	}
	return strings.Join(strings.Fields(displayName), " ")
}
