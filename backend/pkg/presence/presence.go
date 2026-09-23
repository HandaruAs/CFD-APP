package presence

import (
	"sync"
	"time"
)

// OnlineWindow: user dianggap online kalau ada request dalam rentang ini.
const OnlineWindow = 5 * time.Minute

var (
	mu       sync.RWMutex
	lastSeen = make(map[string]time.Time)
)

// Touch dipanggil setiap request yang lolos AuthMiddleware.
func Touch(userID string) {
	if userID == "" {
		return
	}
	mu.Lock()
	lastSeen[userID] = time.Now()
	mu.Unlock()
}

// Remove dipanggil saat user logout, supaya langsung dianggap offline.
func Remove(userID string) {
	mu.Lock()
	delete(lastSeen, userID)
	mu.Unlock()
}

// IsOnline true kalau user ada aktivitas dalam OnlineWindow terakhir.
func IsOnline(userID string) bool {
	mu.RLock()
	t, ok := lastSeen[userID]
	mu.RUnlock()
	return ok && time.Since(t) <= OnlineWindow
}