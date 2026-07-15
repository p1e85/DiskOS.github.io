/**
 * ==============================================================
 * P1 CREATIONS - DISKOS V1.8 CORE KERNEL
 * File: os_kernel.js
 * Description: Virtual File System & Hardware Dispatcher
 * ==============================================================
 */

const Kernel = {
    // ==========================================
    // 1. KERNEL STATE & FILE SYSTEM INIT
    // ==========================================
    
    activeDir: "MASTER.diskDIR",

    // ==========================================
    // 2. VIRTUAL FILE SYSTEM (LOCAL STORAGE)
    // ==========================================
    
    virtualSave: function(filename, payload) {
        let key = this.activeDir + "/" + filename;
        try {
            localStorage.setItem(key, payload);
        } catch (e) {
            console.error("Virtual Drive Full or Disabled", e);
            if (typeof Parser !== 'undefined') {
                Parser.printLine("?VIRTUAL DRIVE ERROR (QUOTA EXCEEDED)");
            }
        }
    },

    virtualLoad: function(filename) {
        let key = this.activeDir + "/" + filename;
        return localStorage.getItem(key);
    },

    mountDir: function(dirname) {
        this.activeDir = dirname;
        let files = [];
        let prefix = this.activeDir + "/";
        
        for (let i = 0; i < localStorage.length; i++) {
            let key = localStorage.key(i);
            if (key.startsWith(prefix)) {
                files.push(key.substring(prefix.length));
            }
        }
        return files;
    },

    // ==========================================
    // 3. PHYSICAL HARDWARE I/O (DEVICE STORAGE)
    // ==========================================
    
    physicalExport: function(filename, payload) {
        const blob = new Blob([payload], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    },

    triggerImport: function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.diskCODE,.diskGUI,.diskPAD,.diskROM,.txt'; 
        
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) {
                if (typeof Parser !== 'undefined') {
                    Parser.printLine("?IMPORT CANCELLED");
                    Parser.printLine("READY.");
                }
                return;
            }
            
            const reader = new FileReader();
            reader.onload = event => {
                this.processImport(event.target.result, file.name);
            };
            reader.readAsText(file);
        };
        
        input.click();
    },

    // ==========================================
    // 4. THE DISPATCHER
    // ==========================================

    processImport: function(content, filename) {
        const ext = filename.split('.').pop().toUpperCase();

        // If it's a P1 Creations Cartridge, send it to the unpacker
        if (ext === "DISKROM") {
            this.unpackROM(content);
            return;
        }

        // Otherwise, handle as a standard OS payload
        this.virtualSave(filename, content);
        
        if (typeof Parser !== 'undefined') {
            Parser.printLine("IMPORTED " + filename + " TO DISK.");
            Parser.processFileContent(content, filename);
        }
    },

    // Custom P1 Creations ROM Unpacker 
    unpackROM: function(romText) {
        if (typeof Parser !== 'undefined') Parser.printLine("UNPACKING CARTRIDGE...");
        
        const chunks = romText.split('===FILE: ');
        let filesInstalled = 0;

        chunks.forEach(chunk => {
            if (chunk.trim() === "") return;
            
            const splitIndex = chunk.indexOf('===');
            if (splitIndex === -1) return; // Skip invalid formats
            
            // Isolate filename and payload
            const fileName = chunk.substring(0, splitIndex).trim();
            const fileData = chunk.substring(splitIndex + 3).trim();
            
            this.virtualSave(fileName, fileData);
            
            if (typeof Parser !== 'undefined') Parser.printLine("INSTALLED: " + fileName);
            filesInstalled++;
        });
        
        if (typeof Parser !== 'undefined') {
            Parser.printLine("ROM INSTALL COMPLETE (" + filesInstalled + " FILES).");
            Parser.printLine("READY.");
        }
    }
};
