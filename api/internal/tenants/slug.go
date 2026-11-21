package tenants

import (
	"crypto/rand"
	"strings"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

const (
	// The database allows 63 characters. The suffix and its hyphen take 9.
	slugMaxLen    = 63
	slugSuffixLen = 8
	slugBaseMax   = slugMaxLen - slugSuffixLen - 1
	// No vowels, so the suffix cannot spell a word, and no characters
	// that are easily confused when read aloud.
	slugAlphabet = "bcdfghjkmnpqrstvwxz23456789"
)

// newSlug returns a slug for a tenant with the given name: a readable
// base from the name, then a random suffix.
//
// The suffix is what makes the slug unique, and it is always there. If
// the slug were just the name, creating "Example Campaign" would fail when
// another tenant already had that slug, and the failure would tell the
// caller that tenant exists. With 27^8 possible suffixes a collision is
// an accident, and the caller retries with a new one.
func newSlug(name string) string {
	return slugBase(name) + "-" + randomSuffix()
}

// slugBase reduces a name to lowercase ASCII letters and digits separated
// by single hyphens. Accents are removed rather than dropped with their
// letter, so "Comité de Montréal" becomes "comite-de-montreal".
func slugBase(name string) string {
	var b strings.Builder
	pendingHyphen := false
	for _, r := range norm.NFD.String(strings.ToLower(name)) {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			if pendingHyphen && b.Len() > 0 {
				b.WriteByte('-')
			}
			pendingHyphen = false
			b.WriteRune(r)
		case unicode.Is(unicode.Mn, r):
			// A combining accent left over from decomposition.
		default:
			pendingHyphen = true
		}
		if b.Len() >= slugBaseMax {
			break
		}
	}
	base := strings.Trim(b.String(), "-")
	if len(base) > slugBaseMax {
		base = strings.Trim(base[:slugBaseMax], "-")
	}
	if base == "" {
		// A name with no Latin letters or digits at all.
		return "tenant"
	}
	return base
}

func randomSuffix() string {
	raw := make([]byte, slugSuffixLen)
	// crypto/rand.Read never returns an error.
	_, _ = rand.Read(raw)
	out := make([]byte, slugSuffixLen)
	for i, v := range raw {
		// The slight bias from the modulo does not matter here: the
		// suffix prevents collisions, it is not a secret.
		out[i] = slugAlphabet[int(v)%len(slugAlphabet)]
	}
	return string(out)
}
