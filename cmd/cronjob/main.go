package main

import (
	"log"
	"portfolio/internal/config"
	"portfolio/internal/portfolio"
	"time"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	p := portfolio.NewPortfolioManager(cfg.PortfolioPath, cfg.RepoURL)

	if err := p.SyncRepository(); err != nil {
		log.Printf("Initial sync failed: %v", err)
	}

	ticker := time.NewTicker(time.Duration(cfg.SyncIntervalMinutes) * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		if err := p.SyncRepository(); err != nil {
			log.Printf("Sync failed: %v", err)
		} else {
			log.Println("Sync completed successfully")
		}
	}
}
