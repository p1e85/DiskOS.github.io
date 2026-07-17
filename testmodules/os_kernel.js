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
    
    virtualSave(filename, payload) {
        const key = `${this.activeDir}/${filename}`;
        try {
            localStorage.setItem(key, payload);
        } catch (e) {
            console.error("Virtual Drive Full or Disabled", e);
            Parser?.printLine("?VIRTUAL DRIVE ERROR (QUOTA EXCEEDED)");
        }
    },

    virtualLoad(filename) {
        return localStorage.getItem(`${this.activeDir}/${filename}`);
    },

    mountDir(dirname) {
        this.activeDir = dirname;
        const prefix = `${this.activeDir}/`;
        
        return Object.keys(localStorage)
            .filter(key => key.startsWith(prefix))
            .map(key => key.substring(prefix.length));
    },

    // ==========================================
    // 3. PHYSICAL HARDWARE I/O (DEVICE STORAGE)
    // ==========================================
    
    physicalExport(filename, payload) {
        const blob = new Blob([payload], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        Object.assign(a, { style: "display: none", href: url, download: filename });
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            a.remove(); // Modern replacement for document.body.removeChild(a)
            URL.revokeObjectURL(url);
        }, 100);
    },

    triggerImport() {
        const input = document.createElement('input');
        Object.assign(input, { type: 'file', accept: '.diskCODE,.diskGUI,.diskPAD,.diskROM,.txt' });
        
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) {
                Parser?.printLine("?IMPORT CANCELLED\nREADY.");
                return;
            }
            
            const reader = new FileReader();
            reader.onload = event => this.processImport(event.target.result, file.name);
            reader.readAsText(file);
        };
        
        input.click();
    },

    // ==========================================
    // 4. THE DISPATCHER
    // ==========================================

    processImport(content, filename) {
        const ext = filename.split('.').pop().toUpperCase();

        // If it's a P1 Creations Cartridge, send it to the unpacker
        if (ext === "DISKROM") {
            return this.unpackROM(content);
        }

        // Otherwise, handle as a standard OS payload
        this.virtualSave(filename, content);
        
        Parser?.printLine(`IMPORTED ${filename} TO DISK.`);
        Parser?.processFileContent(content, filename);
    },

    // Custom P1 Creations ROM Unpacker 
    unpackROM(romText) {
        Parser?.printLine("UNPACKING CARTRIDGE...");
        
        const chunks = romText.split('===FILE: ');
        let filesInstalled = 0;

        chunks.forEach(chunk => {
            const splitIndex = chunk.indexOf('===');
            if (!chunk.trim() || splitIndex === -1) return; // Skip invalid formats
            
            // Isolate filename and payload
            const fileName = chunk.substring(0, splitIndex).trim();
            const fileData = chunk.substring(splitIndex + 3).trim();
            
            this.virtualSave(fileName, fileData);
            Parser?.printLine(`INSTALLED: ${fileName}`);
            filesInstalled++;
        });
        
        Parser?.printLine(`ROM INSTALL COMPLETE (${filesInstalled} FILES).\nREADY.`);
    }
};