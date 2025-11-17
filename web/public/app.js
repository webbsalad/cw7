// ASCII Art conversion function - PROPER IMPLEMENTATION
function imageToASCII(imagePath, width = 100, height = 50) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        
        img.onload = function() {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                // Draw image
                ctx.drawImage(img, 0, 0, width, height);
                
                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;
                
                // Proper ASCII character palette ordered by density
                const ASCII_CHARS = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ".split("");
                
                let ascii = '';
                let lineCount = 0;
                
                // Process each pixel
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    // Convert to grayscale using proper formula
                    const gray = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
                    
                    // Map to ASCII character based on brightness
                    const charIndex = Math.floor(gray * (ASCII_CHARS.length - 1));
                    ascii += ASCII_CHARS[charIndex];
                    
                    // Line break
                    lineCount++;
                    if (lineCount >= width) {
                        ascii += '\n';
                        lineCount = 0;
                    }
                }
                
                resolve(ascii);
            } catch (e) {
                console.error('ASCII conversion error:', e);
                resolve('[Image conversion failed]');
            }
        };
        
        img.onerror = function() {
            console.error('Image load error:', imagePath);
            resolve('[Image could not be loaded]');
        };
        
        // Handle both direct paths and API paths
        if (imagePath.startsWith('/api/')) {
            img.src = imagePath;
        } else if (imagePath.startsWith('/data/')) {
            img.src = imagePath;
        } else {
            img.src = `/api/file?path=${encodeURIComponent(imagePath)}`;
        }
        
        setTimeout(() => {
            resolve('[Image loading timeout]');
        }, 5000);
    });
}

class PortfolioManager {
    constructor() {
        this.currentPath = '/';
        this.fileStructure = null;
        this.selectedIndex = 0;
        this.currentItems = [];
        this.parentFolderIndex = -1;
        this.confirmCallback = null;
        
        // Store globally
        window.portfolioManager = this;
        
        this.init();
    }

    async init() {
        await this.loadStructure();
        this.setupEventListeners();
        this.renderTree();
    }

    async loadStructure() {
        try {
            console.log('Fetching /api/structure...');
            const response = await fetch('/api/structure');
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Structure loaded:', data);
            
            this.fileStructure = data;
            
            if (!this.fileStructure) {
                console.error('fileStructure is null');
                return;
            }
        } catch (error) {
            console.error('Load error:', error);
        }
    }

    setupEventListeners() {
        const commandInput = document.getElementById('commandInput');
        
        commandInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const cmd = commandInput.value;
                commandInput.value = '';
                this.handleCommand(cmd);
            }
        });

        // Global keyboard navigation
        document.addEventListener('keydown', (e) => {
            const modal = document.getElementById('fileViewerModal');
            const imageModal = document.getElementById('imageViewerModal');
            const aboutModal = document.getElementById('aboutModal');
            
            // Don't handle arrow keys if a modal is open
            if (modal.classList.contains('hidden') && 
                imageModal.classList.contains('hidden') && 
                aboutModal.classList.contains('hidden')) {
                
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.selectPrevious();
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.selectNext();
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.openSelected();
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.closeSelected();
                }
            }
        });

        commandInput.focus();
    }

    handleCommand(command) {
        const cmd = command.trim().toLowerCase();
        
        if (cmd === '') return;

        const prompt = `C:\\${this.currentPath.replace(/\//g, '\\')}> ${command}`;
        this.printOutput(prompt);

        if (cmd === 'cls' || cmd === 'clear') {
            document.getElementById('output').textContent = '';
        } else if (cmd.startsWith('cd ')) {
            const path = command.substring(3).trim();
            this.changeDirectory(path);
        } else if (cmd === 'cd..' || cmd === 'cd ..') {
            this.changeDirectory('..');
        } else if (cmd === 'dir' || cmd === 'ls') {
            this.listDirectory();
        } else if (cmd.startsWith('type ') || cmd.startsWith('cat ')) {
            const file = command.split(' ').slice(1).join(' ');
            this.readFile(file);
        } else if (cmd === 'about') {
            this.openAbout();
        } else if (cmd === 'help') {
            this.printHelp();
        } else {
            this.printOutput(`'${cmd}' is not recognized as an internal or external command.`);
        }
    }

    changeDirectory(path) {
        let newPath;

        if (path === '..' || path === '..\\') {
            newPath = this.currentPath === '/' 
                ? '/'
                : this.currentPath.split('/').slice(0, -1).join('/') || '/';
            const lastFolderName = this.currentPath.split('/').filter(p => p).pop();
            if (lastFolderName) {
                const parentNode = this.findNode(newPath);
                if (parentNode && parentNode.children) {
                    this.parentFolderIndex = parentNode.children.findIndex(c => c.name === lastFolderName);
                }
            }
        } else if (path === '/' || path === '\\') {
            newPath = '/';
        } else {
            const cleanPath = path.replace(/\\/g, '/');
            newPath = cleanPath.startsWith('/') 
                ? cleanPath 
                : this.currentPath === '/' 
                    ? '/' + cleanPath 
                    : this.currentPath + '/' + cleanPath;
        }

        const node = this.findNode(newPath);
        if (node && node.type === 'dir') {
            this.currentPath = newPath;
            if (this.parentFolderIndex !== -1) {
                this.selectedIndex = this.parentFolderIndex;
                this.parentFolderIndex = -1;
            } else {
                this.selectedIndex = 0;
            }
            this.renderTree();
        } else {
            this.printOutput(`The system cannot find the path specified.`);
        }
    }

    listDirectory() {
        const node = this.findNode(this.currentPath);
        if (!node) {
            this.printOutput('Directory not found');
            return;
        }

        let output = `\nDirectory of ${this.formatPath(this.currentPath)}\n\n`;
        
        const items = this.getDirectoryContents();
        items.forEach(child => {
            const type = child.type === 'dir' ? '<DIR>' : `${child.size || 0} B`;
            output += `  ${child.name.padEnd(25)} ${type}\n`;
        });
        output += `\n`;

        this.printOutput(output);
    }

    async readFile(filename) {
        const filePath = this.currentPath === '/' 
            ? '/' + filename 
            : this.currentPath + '/' + filename;

        try {
            const response = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
            if (!response.ok) throw new Error('File not found');

            // Check if it's an image
            if (filename.match(/\.(png|jpg|jpeg|gif|bmp)$/i)) {
                this.showImageConfirm(filename, filePath);
            } else {
                // Check if file type is supported as plain text
                const supportedTextFormats = /\.(txt|go|py|js|ts|java|c|cpp|h|html|css|json|xml|yaml|yml|md|sh|bash|rb|php|sql|swift|kt|rs|pl|lua|r|matlab|vb|cs|scala|groovy|clojure|erlang|elixir|haskell|rust|asm|log|conf|cfg|ini|env|gradle|maven|npm|yarn)$/i;
                
                if (supportedTextFormats.test(filename)) {
                    // Safe to open as text
                    const content = await response.text();
                    this.openFileViewer(filename, content);
                } else {
                    // Unsafe format - ask user
                    this.showFileConfirm(filename, filePath);
                }
            }
        } catch (error) {
            this.printOutput(`Error: File not found or cannot be read.`);
            console.error('Read file error:', error);
        }
    }

    showImageConfirm(filename, filepath) {
        const modal = document.getElementById('confirmModal');
        const message = document.getElementById('confirmMessage');
        message.textContent = `Open "${filename}" as stylized ASCII art?\n\n[y] Yes - ASCII art\n[n] No - Raw image`;
        
        this.confirmCallback = (confirmed) => {
            if (confirmed) {
                this.openImageViewer(filename, filepath, true);
            } else {
                this.openImageViewer(filename, filepath, false);
            }
        };
        
        modal.classList.remove('hidden');
    }

    showFileConfirm(filename, filepath) {
        const modal = document.getElementById('confirmModal');
        const message = document.getElementById('confirmMessage');
        message.textContent = `This file type may not be fully supported as plain text.\nOpen "${filename}" anyway?\n\n[y] Yes - Try opening\n[n] No - Cancel`;
        
        this.confirmCallback = async (confirmed) => {
            if (confirmed) {
                try {
                    const response = await fetch(`/api/file?path=${encodeURIComponent(filepath)}`);
                    if (!response.ok) throw new Error('File not found');
                    const content = await response.text();
                    this.openFileViewer(filename, content);
                } catch (error) {
                    this.printOutput(`Error: Could not read file.`);
                }
            }
        };
        
        modal.classList.remove('hidden');
    }

    openFileViewer(filename, content) {
        const modal = document.getElementById('fileViewerModal');
        const title = document.getElementById('modalTitle');
        const fileContent = document.getElementById('fileContent');

        title.textContent = filename;
        fileContent.textContent = content;
        modal.classList.remove('hidden');
    }

    async openImageViewer(filename, filepath, useASCII = true) {
        const modal = document.getElementById('imageViewerModal');
        const title = document.getElementById('imageModalTitle');
        const imageContent = document.getElementById('imageContent');

        title.textContent = filename;
        
        if (!useASCII) {
            // Display raw image
            const imageUrl = `/api/file?path=${encodeURIComponent(filepath)}`;
            imageContent.innerHTML = `<img src="${imageUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
            modal.classList.remove('hidden');
            return;
        }
        
        // Display ASCII art
        imageContent.innerHTML = '<div class="ascii-art">Loading...</div>';
        
        try {
            const imageUrl = `/api/file?path=${encodeURIComponent(filepath)}`;
            
            const tempImg = new Image();
            tempImg.crossOrigin = "anonymous";
            
            tempImg.onload = async () => {
                const ascii = await imageToASCII(filepath, 140, 70);
                imageContent.innerHTML = `<div class="ascii-art">${ascii}</div>`;
                modal.classList.remove('hidden');
            };
            
            tempImg.onerror = () => {
                console.error('Failed to load image from:', filepath);
                imageContent.innerHTML = '<div class="ascii-art">[Could not load image]</div>';
                modal.classList.remove('hidden');
            };
            
            tempImg.src = imageUrl;
            
        } catch (e) {
            console.error('Image viewer error:', e);
            imageContent.innerHTML = '<div class="ascii-art">[Could not load image]</div>';
            modal.classList.remove('hidden');
        }
    }

    async openAbout() {
        const modal = document.getElementById('aboutModal');
        
        try {
            const imageUrl = '/data/static/images/face.png';
            console.log('Loading image from:', imageUrl);
            
            // Larger size for better detail
            const imageAscii = await imageToASCII(imageUrl, 100, 50);
            document.getElementById('aboutImage').innerHTML = `<div class="ascii-art">${imageAscii}</div>`;
            
            // Load about text
            try {
                console.log('Loading about.txt from: /data/static/text/about.txt');
                const aboutResponse = await fetch('/data/static/text/about.txt');
                if (aboutResponse.ok) {
                    const aboutText = await aboutResponse.text();
                    document.getElementById('aboutText').textContent = aboutText;
                } else {
                    console.error('about.txt response status:', aboutResponse.status);
                    document.getElementById('aboutText').textContent = '[about.txt not found]';
                }
            } catch (e) {
                console.warn('about.txt error:', e);
                document.getElementById('aboutText').textContent = '[about.txt not found]';
            }
            
            // Load contacts
            try {
                console.log('Loading contacts.txt from: /data/static/text/contacts.txt');
                const contactsResponse = await fetch('/data/static/text/contacts.txt');
                if (contactsResponse.ok) {
                    const contactsText = await contactsResponse.text();
                    document.getElementById('aboutContacts').textContent = contactsText;
                } else {
                    console.error('contacts.txt response status:', contactsResponse.status);
                    document.getElementById('aboutContacts').textContent = '[contacts.txt not found]';
                }
            } catch (e) {
                console.warn('contacts.txt error:', e);
                document.getElementById('aboutContacts').textContent = '[contacts.txt not found]';
            }
            
            modal.classList.remove('hidden');
        } catch (error) {
            this.printOutput('Error loading about information');
            console.error('About error:', error);
        }
    }

    findNode(path) {
        if (!this.fileStructure) return null;
        if (path === '/') return this.fileStructure;

        const parts = path.split('/').filter(p => p);
        let current = this.fileStructure;

        for (const part of parts) {
            if (!current.children) return null;
            current = current.children.find(c => c.name === part);
            if (!current) return null;
        }

        return current;
    }

    getDirectoryContents() {
        const node = this.findNode(this.currentPath);
        if (!node || !node.children) return [];
        return node.children.filter(c => c.name !== '.git' && c.name !== '.gitignore');
    }

    selectNext() {
        this.currentItems = this.getDirectoryContents();
        if (this.currentItems.length > 0) {
            this.selectedIndex = (this.selectedIndex + 1) % this.currentItems.length;
            this.renderTree();
        }
    }

    selectPrevious() {
        this.currentItems = this.getDirectoryContents();
        if (this.currentItems.length > 0) {
            this.selectedIndex = (this.selectedIndex - 1 + this.currentItems.length) % this.currentItems.length;
            this.renderTree();
        }
    }

    openSelected() {
        this.currentItems = this.getDirectoryContents();
        const selected = this.currentItems[this.selectedIndex];
        if (selected && selected.type === 'dir') {
            this.changeDirectory(selected.name);
        } else if (selected && selected.type === 'file') {
            this.readFile(selected.name);
        }
    }

    closeSelected() {
        if (this.currentPath !== '/') {
            this.changeDirectory('..');
        }
    }

    printOutput(text) {
        const output = document.getElementById('output');
        output.textContent += text + '\n';
        output.scrollTop = output.scrollHeight;
    }

    printHelp() {
        const help = `
Available commands:
  cd <folder>      - Change directory
  cd..             - Go to parent directory
  dir              - List directory contents
  type       - View file contents
  about            - Show about information
  cls              - Clear screen
  help             - Show this help message

Keyboard navigation:
  ↑ ↓              - Select files/folders
  → Enter          - Open folder or read file
  ← Backspace      - Go to parent directory
        `;
        this.printOutput(help);
    }

    formatPath(path) {
        if (path === '/') return 'C:\\';
        return 'C:\\' + path.substring(1).replace(/\//g, '\\');
    }

    renderTree() {
        const element = document.getElementById('fileTree');
        element.innerHTML = '';
        
        const contents = this.getDirectoryContents();

        if (contents.length === 0) {
            const empty = document.createElement('div');
            empty.style.color = '#006600';
            empty.textContent = '(empty)';
            element.appendChild(empty);
            return;
        }

        contents.forEach((child, index) => {
            const div = document.createElement('div');
            div.className = child.type === 'dir' ? 'folder' : 'file';
            
            if (index === this.selectedIndex) {
                div.classList.add('selected');
            }

            if (child.type === 'dir') {
                div.innerHTML = `<div class="folder-icon"></div><span>${child.name}</span>`;
                div.addEventListener('click', () => {
                    this.selectedIndex = index;
                    this.openSelected();
                });
            } else {
                div.innerHTML = `<span>${child.name}</span>`;
                div.addEventListener('click', () => {
                    this.selectedIndex = index;
                    this.readFile(child.name);
                });
            }

            element.appendChild(div);
        });

        document.getElementById('currentPath').textContent = this.formatPath(this.currentPath);
    }
}

function closeFileViewer() {
    const modal = document.getElementById('fileViewerModal');
    modal.classList.add('hidden');
}

function closeImageViewer() {
    const modal = document.getElementById('imageViewerModal');
    modal.classList.add('hidden');
}

function closeConfirm() {
    const modal = document.getElementById('confirmModal');
    modal.classList.add('hidden');
}

function closeAbout() {
    const modal = document.getElementById('aboutModal');
    modal.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    const manager = new PortfolioManager();
    
    // Confirm modal buttons
    document.getElementById('confirmYes').addEventListener('click', () => {
        if (manager && manager.confirmCallback) {
            manager.confirmCallback(true);
            closeConfirm();
        }
    });
    
    document.getElementById('confirmNo').addEventListener('click', () => {
        if (manager && manager.confirmCallback) {
            manager.confirmCallback(false);
            closeConfirm();
        }
    });
    
    // Keyboard support for confirm modal
    document.addEventListener('keydown', (e) => {
        const confirmModal = document.getElementById('confirmModal');
        if (!confirmModal.classList.contains('hidden')) {
            if (e.key.toLowerCase() === 'y') {
                document.getElementById('confirmYes').click();
            } else if (e.key.toLowerCase() === 'n') {
                document.getElementById('confirmNo').click();
            }
        }
    });
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeFileViewer();
        closeImageViewer();
        closeConfirm();
        closeAbout();
    }
});
