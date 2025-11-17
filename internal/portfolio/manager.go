package portfolio

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/go-git/go-git/v5"
)

type PortfolioManager struct {
	portfolioPath string
	repoURL       string
}

func NewPortfolioManager(portfolioPath, repoURL string) *PortfolioManager {
	return &PortfolioManager{
		portfolioPath: portfolioPath,
		repoURL:       repoURL,
	}
}
func (pm *PortfolioManager) SyncRepository() error {
	parentDir := filepath.Dir(pm.portfolioPath)
	if err := os.MkdirAll(parentDir, 0755); err != nil {
		return fmt.Errorf("failed to create parent directory: %w", err)
	}

	if err := os.MkdirAll(pm.portfolioPath, 0755); err != nil {
		return fmt.Errorf("failed to create repo directory: %w", err)
	}

	gitPath := filepath.Join(pm.portfolioPath, ".git")
	if _, err := os.Stat(gitPath); os.IsNotExist(err) {
		log.Println("cleaning directory and cloning fresh repository")

		os.RemoveAll(pm.portfolioPath)
		if err := os.MkdirAll(pm.portfolioPath, 0755); err != nil {
			return fmt.Errorf("failed to recreate repo directory: %w", err)
		}

		return pm.cloneRepository()
	}

	return pm.pullRepository()
}

func (pm *PortfolioManager) cloneRepository() error {
	log.Printf("Cloning repository: %s to %s", pm.repoURL, pm.portfolioPath)

	_, err := git.PlainClone(pm.portfolioPath, false, &git.CloneOptions{
		URL: pm.repoURL,
	})

	if err != nil && err != git.ErrRepositoryAlreadyExists {
		return fmt.Errorf("clone failed: %w", err)
	}

	log.Println("Repository cloned successfully")
	return nil
}

func (pm *PortfolioManager) pullRepository() error {
	log.Println("Pulling repository updates...")

	repo, err := git.PlainOpen(pm.portfolioPath)
	if err != nil {
		return fmt.Errorf("failed to open repository: %w", err)
	}

	worktree, err := repo.Worktree()
	if err != nil {
		return fmt.Errorf("failed to get worktree: %w", err)
	}

	err = worktree.Pull(&git.PullOptions{})
	if err != nil && err != git.NoErrAlreadyUpToDate {
		return fmt.Errorf("pull failed: %w", err)
	}

	log.Println("Repository updated successfully")
	return nil
}
