package api

import "unicode"

func Message(err error) string {
	if err == nil {
		return ""
	}

	runes := []rune(err.Error())
	if len(runes) == 0 {
		return ""
	}
	runes[0] = unicode.ToUpper(runes[0])
	return string(runes)
}
