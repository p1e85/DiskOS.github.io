const Kernel = {
    activeDir: null,

    // ==========================================
    // 1. SYSTEM BOOT SEQUENCE
    // ==========================================
    boot: function() {
        setTimeout(() => {
            if (localStorage.getItem("DiskOS_MASTER.diskDIR")) {
                Parser.printLine("MASTER.diskDIR DETECTED. AUTO-MOUNTING...");
                this.simulateType('MOUNT "MASTER.diskDIR"');
            }
        }, 500);
    },

    simulateType: function(cmd) {
        for(let i = 0; i < cmd.length; i++) {
            Parser.vram[Parser.getIndex(Parser.cursorX, Parser.cursorY)].char = cmd[i];
            Parser.cursorX++;
        }
        Parser.handleKey('Enter');
    },

    // ==========================================
    // 2. VIRTUAL FILE SYSTEM
    // ==========================================
    virtualSave: function(filename, payload) {
        let key = "DiskOS_" + (this.activeDir ? this.activeDir + "_" : "") + filename;
        if (filename.endsWith(".diskDIR") || filename.endsWith(".diskGUI") || filename.endsWith(".diskPAD")) {
             key = "DiskOS_" + filename; 
        }
        localStorage.setItem(key, payload);
        
        if (this.activeDir && !filename.endsWith(".diskDIR") && !filename.endsWith(".diskGUI") && !filename.endsWith(".diskPAD")) {
            this.updateDirIndex(this.activeDir, filename);
        }
    },

    virtualLoad: function(filename) {
        let key = "DiskOS_" + (this.activeDir ? this.activeDir + "_" : "") + filename;
        let data = localStorage.getItem(key);
        if (!data) data = localStorage.getItem("DiskOS_" + filename);
        return data;
    },

    mountDir: function(dirname) {
        this.activeDir = dirname;
        let dirData = localStorage.getItem("DiskOS_" + dirname);
        if (!dirData) {
            dirData = "TYPE: diskDIR\nCOMPATIBILITY: V1.8\n---\n";
            localStorage.setItem("DiskOS_" + dirname, dirData);
        }
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
        if (!lines.includes(filename)) {
            dirData += filename + "\n";
            localStorage.setItem("DiskOS_" + dirname, dirData);
        }
    },

    // ==========================================
    // 3. PHYSICAL I/O & .diskROM COMPILER
    // ==========================================
    physicalExport: function(filename, payload) {
        let finalFilename = filename;
        let finalPayload = payload;

        // THE ROM COMPILER
        if (filename.endsWith(".diskDIR")) {
            finalFilename = filename.replace(".diskDIR", ".diskROM");
            finalPayload = "TYPE: diskROM\nMOUNT: " + filename + "\nCOMPATIBILITY: V1.8\n---\n";
            
            // Step 1: Pack the Directory list itself
            finalPayload += "===FILE: " + filename + "===\n" + payload + "\n";
            
            // Step 2: Loop through the Directory list and pack every connected file
            let lines = payload.split('\n');
            let isPayload = false;
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].trim();
                if (line === "---") { isPayload = true; continue; }
                if (isPayload && line !== "") {
                    let fileContent = this.virtualLoad(line);
                    if (fileContent) {
                        finalPayload += "\n===FILE: " + line + "===\n" + fileContent + "\n";
                    }
                }
            }
        }

        const blob = new Blob([finalPayload], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = finalFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    processImport: function(content, filename) {
        // ROM UNPACKER LOGIC
        if (content.toUpperCase().startsWith("TYPE: DISKROM")) {
            Parser.printLine("BURNING ROM TO VIRTUAL DRIVE...");
            
            let mountTarget = null;
            let lines = content.split('\n');
            for (let i=0; i<5; i++) {
                if (lines[i] && lines[i].toUpperCase().startsWith("MOUNT:")) {
                    mountTarget = lines[i].substring(6).trim();
                }
            }

            // Split by file tags and save to virtual drive
            let parts = content.split(/===FILE:\s*(.+?)===/);
            for (let i = 1; i < parts.length; i += 2) {
                let fName = parts[i].trim();
                let fContent = parts[i+1].trim();
                if (fName && fContent) {
                    let key = "DiskOS_";
                    if (!fName.endsWith(".diskDIR") && !fName.endsWith(".diskGUI") && !fName.endsWith(".diskPAD")) {
                        key += (mountTarget ? mountTarget + "_" : "");
                    }
                    key += fName;
                    localStorage.setItem(key, fContent);
                }
            }

            Parser.printLine("ROM FLASHED SUCCESSFULLY.");
            
            if (mountTarget) {
                this.simulateType('MOUNT "' + mountTarget + '"');
            } else {
                Parser.printLine("READY.");
                Parser.cursorY--;
            }
        } 
        // STANDARD FILE IMPORT
        else {
            this.virtualSave(filename, content);
            Parser.printLine("IMPORTED " + filename + " TO VIRTUAL DRIVE.");
            Parser.printLine("READY.");
            Parser.cursorY--;
        }
    },

    triggerImport: function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.diskCODE,.diskGUI,.diskDIR,.diskPAD,.diskROM'; 
        
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) {
                Parser.printLine("?IMPORT CANCELLED.");
                Parser.printLine("READY.");
                return;
            }
            const reader = new FileReader();
            reader.onload = event => {
                this.processImport(event.target.result, file.name);
            };
            reader.readAsText(file);
        };
        input.click();
    }
};

window.onload = function() {
    Kernel.boot();
};
