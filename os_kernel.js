const Kernel = {
    activeDir: null,

    // ==========================================
    // 1. SYSTEM BOOT SEQUENCE
    // ==========================================
    boot: function() {
        // Give the Parser half a second to draw the startup screen, then check for MASTER
        setTimeout(() => {
            if (localStorage.getItem("DiskOS_MASTER.diskDIR")) {
                Parser.printLine("MASTER.diskDIR DETECTED. AUTO-MOUNTING...");
                
                // Simulate the user typing the mount command
                let cmd = 'MOUNT "MASTER.diskDIR"';
                for(let i = 0; i < cmd.length; i++) {
                    Parser.vram[Parser.getIndex(Parser.cursorX, Parser.cursorY)].char = cmd[i];
                    Parser.cursorX++;
                }
                Parser.handleKey('Enter');
            }
        }, 500);
    },

    // ==========================================
    // 2. VIRTUAL FILE SYSTEM (LOCAL STORAGE)
    // ==========================================
    virtualSave: function(filename, payload) {
        // If we are in a directory, prefix the filename so it stays isolated
        let key = "DiskOS_" + (this.activeDir ? this.activeDir + "_" : "") + filename;
        
        // System config files (GUI/DIR) should always save to the root level
        if (filename.endsWith(".diskDIR") || filename.endsWith(".diskGUI")) {
             key = "DiskOS_" + filename; 
        }
        
        localStorage.setItem(key, payload);
        
        // If saving a normal file while a directory is mounted, update the directory's index
        if (this.activeDir && !filename.endsWith(".diskDIR") && !filename.endsWith(".diskGUI")) {
            this.updateDirIndex(this.activeDir, filename);
        }
    },

    virtualLoad: function(filename) {
        // Try to load from the active directory first
        let key = "DiskOS_" + (this.activeDir ? this.activeDir + "_" : "") + filename;
        let data = localStorage.getItem(key);
        
        // If not found, try the root directory (useful for global .diskGUI files)
        if (!data) {
            data = localStorage.getItem("DiskOS_" + filename);
        }
        return data;
    },

    // ==========================================
    // 3. WORKSPACE DIRECTORY MANAGEMENT
    // ==========================================
    mountDir: function(dirname) {
        this.activeDir = dirname;
        let dirData = localStorage.getItem("DiskOS_" + dirname);
        
        // If the directory doesn't exist, create an empty one
        if (!dirData) {
            dirData = "TYPE: diskDIR\nCOMPATIBILITY: V1.5\n---\n";
            localStorage.setItem("DiskOS_" + dirname, dirData);
        }
        
        // Parse the directory list to return to the Parser
        let files = [];
        let lines = dirData.split('\n');
        let isPayload = false;
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line === "---") { isPayload = true; continue; }
            if (isPayload && line !== "") files.push(line);
        }
        return files;
    },

    updateDirIndex: function(dirname, filename) {
        let dirData = localStorage.getItem("DiskOS_" + dirname) || "TYPE: diskDIR\n---\n";
        let lines = dirData.split('\n');
        
        // Only add the file to the index if it isn't already there
        if (!lines.includes(filename)) {
            dirData += filename + "\n";
            localStorage.setItem("DiskOS_" + dirname, dirData);
        }
    },

    // ==========================================
    // 4. PHYSICAL I/O (BROWSER DOWNLOAD/UPLOAD)
    // ==========================================
    physicalExport: function(filename, payload) {
        const blob = new Blob([payload], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    triggerImport: function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.diskCODE,.diskGUI,.diskDIR,.lib'; // Accept all our custom extensions
        
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) {
                Parser.printLine("?IMPORT CANCELLED.");
                Parser.printLine("READY.");
                return;
            }
            
            const reader = new FileReader();
            reader.onload = event => {
                const content = event.target.result;
                this.virtualSave(file.name, content);
                
                // Clear the terminal and simulate loading the file visually
                Parser.printLine("IMPORTED " + file.name + " TO VIRTUAL DRIVE.");
                Parser.printLine("READY.");
                Parser.cursorY--;
            };
            reader.readAsText(file);
        };
        input.click();
    }
};

// Initialize Kernel boot sequence when the window loads
window.onload = function() {
    Kernel.boot();
};
