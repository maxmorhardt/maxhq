package pseudonym

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"strings"
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
	parts := strings.Fields(FullName(displayName))
	switch len(parts) {
	case 0:
		return ""
	case 1:
		return parts[0]
	}

	last := []rune(parts[len(parts)-1])
	return parts[0] + " " + strings.ToUpper(string(last[0])) + "."
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
