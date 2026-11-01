package pseudonym

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"slices"
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
	// "Last, First" puts the surname first, but "First Last, Jr." does not
	if last, first, ok := strings.Cut(full, ","); ok && !isSuffix(first) {
		full = first + " " + last
	}

	parts := strings.FieldsFunc(full, func(r rune) bool { return unicode.IsSpace(r) || r == ',' })
	title := ""
	for len(parts) > 1 && titles[word(parts[0])] {
		title, parts = parts[0], parts[1:]
	}
	if len(parts) == 0 {
		return ""
	}
	first, rest := parts[0], slices.DeleteFunc(parts[1:], isSuffix)
	if len(rest) == 0 {
		// a title before a single name means it's the surname
		if i := initial(first); title != "" && i != "" {
			return title + " " + i
		}
		return first
	}

	if i := initial(rest[len(rest)-1]); i != "" {
		return first + " " + i
	}
	return first
}

func initial(name string) string {
	i := strings.IndexFunc(name, unicode.IsLetter)
	if i < 0 {
		return ""
	}
	r, _ := utf8.DecodeRuneInString(name[i:])
	return string(unicode.ToUpper(r)) + "."
}

var (
	titles   = map[string]bool{"dr": true, "mr": true, "mrs": true, "ms": true, "mx": true, "prof": true}
	suffixes = map[string]bool{"jr": true, "sr": true, "ii": true, "iii": true, "iv": true, "phd": true, "md": true, "esq": true}
)

func isSuffix(s string) bool {
	return suffixes[word(s)]
}

func word(s string) string {
	return strings.ReplaceAll(strings.ToLower(strings.TrimSpace(s)), ".", "")
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
