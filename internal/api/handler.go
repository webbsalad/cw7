package api

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type FileNode struct {
	Name     string      `json:"name"`
	Type     string      `json:"type"`
	Path     string      `json:"path"`
	Children []*FileNode `json:"children,omitempty"`
	Size     int64       `json:"size,omitempty"`
}

type Handler struct {
	portfolioPath string
}

func NewHandler(portfolioPath string) *Handler {
	return &Handler{
		portfolioPath: portfolioPath,
	}
}

func (h *Handler) GetStructure(w http.ResponseWriter, r *http.Request) {
	info, err := os.Stat(h.portfolioPath)
	if err != nil {
		log.Printf("Portfolio path error: %v", err)
		http.Error(w, "Portfolio path not accessible: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if !info.IsDir() {
		log.Printf("Portfolio path is not a directory")
		http.Error(w, "Portfolio path is not a directory", http.StatusInternalServerError)
		return
	}

	root := &FileNode{
		Name:     filepath.Base(h.portfolioPath),
		Type:     "dir",
		Path:     "/",
		Children: []*FileNode{},
	}

	if err := h.buildTree(h.portfolioPath, root); err != nil {
		log.Printf("Error building tree: %v", err)
		http.Error(w, "Failed to read structure: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(root); err != nil {
		log.Printf("Error encoding JSON: %v", err)
	}
}

func (h *Handler) GetFile(w http.ResponseWriter, r *http.Request) {
	filePath := r.URL.Query().Get("path")
	if filePath == "" {
		http.Error(w, "Path parameter required", http.StatusBadRequest)
		return
	}

	if strings.HasPrefix(filePath, "/data/") {
		fullPath := filePath

		if _, err := os.Stat(fullPath); err != nil {
			log.Printf("Static file not found: %s, error: %v", fullPath, err)
			http.Error(w, "File not found", http.StatusNotFound)
			return
		}

		content, err := os.ReadFile(fullPath)
		if err != nil {
			log.Printf("Error reading static file %s: %v", fullPath, err)
			http.Error(w, "File not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.Write(content)
		return
	}

	fullPath := filepath.Join(h.portfolioPath, filePath)

	absPortfolioPath, _ := filepath.Abs(h.portfolioPath)
	absFilePath, _ := filepath.Abs(fullPath)
	if !strings.HasPrefix(absFilePath, absPortfolioPath) {
		log.Printf("Access denied for: %s", fullPath)
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}

	content, err := os.ReadFile(fullPath)
	if err != nil {
		log.Printf("Error reading file %s: %v", fullPath, err)
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Write(content)
}

func (h *Handler) buildTree(dir string, node *FileNode) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		log.Printf("Error reading directory %s: %v", dir, err)
		return err
	}

	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), ".") {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			log.Printf("Error getting info for %s: %v", entry.Name(), err)
			continue
		}

		newNode := &FileNode{
			Name: entry.Name(),
			Path: filepath.Join(node.Path, entry.Name()),
		}

		if entry.IsDir() {
			newNode.Type = "dir"
			newNode.Children = []*FileNode{}
			if err := h.buildTree(filepath.Join(dir, entry.Name()), newNode); err != nil {
				log.Printf("Error building subtree for %s: %v", entry.Name(), err)
			}
		} else {
			newNode.Type = "file"
			newNode.Size = info.Size()
		}

		node.Children = append(node.Children, newNode)
	}

	return nil
}
