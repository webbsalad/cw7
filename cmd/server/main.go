package main

import (
	"log"
	"net/http"
	"portfolio/internal/api"
	"portfolio/internal/config"
	"portfolio/internal/portfolio"
	"time"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	pm := portfolio.NewPortfolioManager(cfg.PortfolioPath, cfg.RepoURL)
	go startCronjob(pm, cfg.SyncIntervalMinutes)

	handler := api.NewHandler(cfg.PortfolioPath)

	http.HandleFunc("/api/structure", corsMiddlewareFunc(handler.GetStructure))
	http.HandleFunc("/api/file", corsMiddlewareFunc(handler.GetFile))

	http.Handle("/data/", corsMiddleware(http.StripPrefix("/data/", http.FileServer(http.Dir("./data")))))

	http.Handle("/", http.FileServer(http.Dir("./web/public")))

	addr := ":8080"
	log.Printf("Server starting on http://localhost%s", addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

func startCronjob(pm *portfolio.PortfolioManager, intervalMinutes int) {
	if err := pm.SyncRepository(); err != nil {
		log.Printf("Initial sync failed: %v", err)
	}

	ticker := time.NewTicker(time.Duration(intervalMinutes) * time.Minute)
	defer ticker.Stop()

	log.Printf("Cronjob started. Sync interval: %d minutes", intervalMinutes)

	for range ticker.C {
		if err := pm.SyncRepository(); err != nil {
			log.Printf("Sync failed: %v", err)
		} else {
			log.Println("Sync completed successfully")
		}
	}
}

func corsMiddlewareFunc(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
