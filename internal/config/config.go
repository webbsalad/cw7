package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	PortfolioPath       string
	RepoURL             string
	SyncIntervalMinutes int
}

func Load() (*Config, error) {
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found or could not be loaded: %v", err)
	}

	portfolioPath := os.Getenv("PORTFOLIO_PATH")
	if portfolioPath == "" {
		portfolioPath = "./data/portfolio"
		log.Printf("PORTFOLIO_PATH not set, using default: %s", portfolioPath)
	}

	repoURL := os.Getenv("REPO_URL")
	if repoURL == "" {
		repoURL = "https://github.com/webbsalad/3-course"
		log.Printf("REPO_URL not set, using default: %s", repoURL)
	}

	syncIntervalMinutes := 60
	if syncIntervalStr := os.Getenv("SYNC_INTERVAL_MINUTES"); syncIntervalStr != "" {
		if val, err := strconv.Atoi(syncIntervalStr); err == nil {
			syncIntervalMinutes = val
			log.Printf("SYNC_INTERVAL_MINUTES set to: %d", syncIntervalMinutes)
		}
	}

	log.Printf("Config loaded: PortfolioPath=%s, RepoURL=%s, SyncIntervalMinutes=%d",
		portfolioPath, repoURL, syncIntervalMinutes)

	return &Config{
		PortfolioPath:       portfolioPath,
		RepoURL:             repoURL,
		SyncIntervalMinutes: syncIntervalMinutes,
	}, nil
}
