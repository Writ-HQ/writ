package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/go-jose/go-jose/v4"
)

const (
	// How long fetched keys are used before they are fetched again. Keys
	// change rarely; this bounds how long a withdrawn key stays trusted.
	keyMaxAge = time.Hour
	// The least time between two fetches. A token naming an unknown key
	// triggers a fetch, so without this limit anyone could make the API
	// hammer the identity provider.
	keyMinRefreshInterval = time.Minute
	keyFetchTimeout       = 5 * time.Second
	maxKeySetBytes        = 1 << 20
)

// keySet is a cache of the identity provider's public signing keys (its
// JWKS document), indexed by key ID.
//
// Keys are fetched on first use, again when they are older than
// keyMaxAge, and when a token names a key ID that is not cached, which is
// how a newly rotated key is picked up. If a fetch fails, keys already
// cached keep working.
type keySet struct {
	url    string
	client *http.Client
	now    func() time.Time

	// refresh serialises fetches; mu guards the fields below it.
	refresh sync.Mutex
	mu      sync.RWMutex
	keys    map[string]jose.JSONWebKey
	// fetchedAt is the time of the last successful fetch; attemptedAt and
	// attemptFailed describe the last fetch of either kind.
	fetchedAt     time.Time
	attemptedAt   time.Time
	attemptFailed bool
}

func newKeySet(url string, client *http.Client, now func() time.Time) *keySet {
	return &keySet{url: url, client: client, now: now}
}

// key returns the public key with the given ID. found is false when the
// provider has no such key. The error is ErrUnavailable when the keys
// could not be fetched and the answer is therefore not known.
func (s *keySet) key(ctx context.Context, kid string) (key jose.JSONWebKey, found bool, err error) {
	if key, found, fresh := s.cached(kid); found && fresh {
		return key, true, nil
	}

	s.refresh.Lock()
	defer s.refresh.Unlock()

	// Another request may have fetched while this one waited.
	key, found, fresh := s.cached(kid)
	if found && fresh {
		return key, true, nil
	}

	s.mu.RLock()
	throttled := !s.attemptedAt.IsZero() && s.now().Sub(s.attemptedAt) < keyMinRefreshInterval
	lastFailed := s.attemptFailed
	s.mu.RUnlock()

	if !throttled {
		fetchErr := s.fetch(ctx)
		lastFailed = fetchErr != nil
		key, found, _ = s.cached(kid)
	}

	switch {
	case found:
		// Possibly from an older fetch: a key that verified tokens a
		// moment ago is better than refusing everyone.
		return key, true, nil
	case lastFailed:
		return jose.JSONWebKey{}, false, ErrUnavailable
	default:
		return jose.JSONWebKey{}, false, nil
	}
}

func (s *keySet) cached(kid string) (key jose.JSONWebKey, found, fresh bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	key, found = s.keys[kid]
	fresh = !s.fetchedAt.IsZero() && s.now().Sub(s.fetchedAt) < keyMaxAge
	return key, found, fresh
}

// fetch downloads the key set and replaces the cache. The caller holds
// s.refresh.
func (s *keySet) fetch(ctx context.Context) error {
	keys, err := s.download(ctx)

	s.mu.Lock()
	defer s.mu.Unlock()
	s.attemptedAt = s.now()
	s.attemptFailed = err != nil
	if err != nil {
		return err
	}
	s.keys = keys
	s.fetchedAt = s.attemptedAt
	return nil
}

func (s *keySet) download(ctx context.Context) (map[string]jose.JSONWebKey, error) {
	// One caller's cancelled request must not fail the fetch for everyone
	// waiting on it.
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), keyFetchTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.url, nil)
	if err != nil {
		return nil, fmt.Errorf("building the key set request: %w", err)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetching the key set: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("fetching the key set: status %d", resp.StatusCode)
	}

	var doc jose.JSONWebKeySet
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxKeySetBytes)).Decode(&doc); err != nil {
		return nil, fmt.Errorf("decoding the key set: %w", err)
	}

	keys := make(map[string]jose.JSONWebKey, len(doc.Keys))
	for _, k := range doc.Keys {
		// Only public keys meant for signatures. A key set that somehow
		// published a private or symmetric key must not be used to verify.
		if k.KeyID == "" || !k.Valid() || !k.IsPublic() || (k.Use != "" && k.Use != "sig") {
			continue
		}
		keys[k.KeyID] = k
	}
	if len(keys) == 0 {
		return nil, errors.New("the key set has no usable signing keys")
	}
	return keys, nil
}
