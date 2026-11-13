package auth

import (
	"sync"
	"time"

	"github.com/google/uuid"
)

// recently remembers, per user and in this process only, when something
// was last done, so that it is not done again too soon. It is a rate
// limit, not a record: after a restart, or on another instance, the thing
// may happen once more.
type recently struct {
	window time.Duration
	now    func() time.Time

	mu   sync.Mutex
	seen map[uuid.UUID]time.Time
}

const recentlyMaxEntries = 50_000

func newRecently(window time.Duration, now func() time.Time) *recently {
	return &recently{window: window, now: now, seen: map[uuid.UUID]time.Time{}}
}

// did reports whether mark was called for the user within the window.
func (r *recently) did(id uuid.UUID) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	at, ok := r.seen[id]
	return ok && r.now().Sub(at) < r.window
}

// mark records that the thing was just done for the user.
func (r *recently) mark(id uuid.UUID) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.markLocked(id)
}

// firstIn reports whether this is the first call for the user within the
// window, and marks it if so.
func (r *recently) firstIn(id uuid.UUID) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	if at, ok := r.seen[id]; ok && r.now().Sub(at) < r.window {
		return false
	}
	r.markLocked(id)
	return true
}

func (r *recently) markLocked(id uuid.UUID) {
	now := r.now()
	// Keep the map from growing without bound.
	if len(r.seen) >= recentlyMaxEntries {
		for k, at := range r.seen {
			if now.Sub(at) >= r.window {
				delete(r.seen, k)
			}
		}
		if len(r.seen) >= recentlyMaxEntries {
			clear(r.seen)
		}
	}
	r.seen[id] = now
}
