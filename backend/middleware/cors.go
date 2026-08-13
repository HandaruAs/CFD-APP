package middleware

import (
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func CORSMiddleware(allowedOrigins []string) gin.HandlerFunc {
	originSet := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		trimmed := strings.TrimSpace(o)
		if trimmed != "" {
			originSet[trimmed] = true
		}
	}

	log.Printf("[CORS] allowed origins: %v", allowedOrigins)

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")

		if origin != "" && originSet[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		} else if origin != "" {
			log.Printf("[CORS] blocked origin: %s (not in whitelist)", origin)
		}

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}