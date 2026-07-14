/**
 * ==============================================================
 * P1 CREATIONS - DISKOS V1.8 CORE KERNEL
 * File: os_kernel.js
 * Description: Monolithic Kernel & VFS Dispatcher
 * ==============================================================
 */

// Global System Variables
window.SYS_GUI_EVENT = "NONE";
window.TERMINAL_COLOR = "#00FF00";

// ==========================================
// 1. CORE DISPATCHER
// ==========================================
function executeDiskFile(filename, rawData) {
    if (!filename || !rawData) return systemPrint("SYS ERROR: MISSING FILE DATA");

    // Extract extension and convert to uppercase for safe matching
    const ext = filename.split('.').pop().toUpperCase();
    
    switch (ext) {
        case 'DISKCODE':
            // Hands off to os_parser.js (Assumes runParser is globally available)
            if (typeof runParser === "function") {
                return runParser(rawData); 
            } else {
                return systemPrint("SYS ERROR: PARSER NOT FOUND");
            }
        case 'DISKGUI':
            return loadGUI(rawData);
        case 'DISKDIR':
            return loadDIR(rawData);
        case 'DISKROM':
            return unpackROM(rawData);
        case 'DISKPAD':
            return loadPAD(rawData);
        default:
            return systemPrint("SYS ERROR: UNKNOWN FORMAT -> " + ext);
    }
}

// ==========================================
// 2. VIRTUAL FILE SYSTEM (VFS) HELPERS
// ==========================================
function saveToVFS(filename, data) {
    localStorage.setItem('diskOS_VFS_' + filename, data);
}

function loadFromVFS(filename) {
    return localStorage.getItem('diskOS_VFS_' + filename);
}

// ==========================================
// 3. INTERNAL HANDLER FUNCTIONS
// ==========================================

// --- GUI Handler (.diskGUI) ---
function loadGUI(configText) {
    const lines = configText.split('\n');
    let menuActive = false;
    
    // Clear previous UI (Assuming an HTML element with ID 'os_ui_layer' exists)
    const uiLayer = document.getElementById('os_ui_layer');
    if (uiLayer) uiLayer.innerHTML = ''; 

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        
        if (line.startsWith("DEF_MENU")) {
            menuActive = true;
            if (uiLayer) {
                // Extract optional title
                const titleMatch = configText.match(/TITLE\s+"([^"]+)"/);
                const titleText = titleMatch ? titleMatch[1] : "SYSTEM MENU";
                uiLayer.innerHTML += `<div class="disk-menu-title">${titleText}</div>`;
            }
        } 
        else if (line.startsWith("ITEM") && menuActive) {
            const match = line.match(/ITEM\s+"([^"]+)"\s+EVENT\s+"([^"]+)"/);
            if (match && uiLayer) {
                const label = match[1];
                const eventTrig = match[2];
                
                // Construct declarative button
                const btn = document.createElement('button');
                btn.innerText = label;
                btn.className = "disk-gui-btn";
                btn.onclick = () => {
                    window.SYS_GUI_EVENT = eventTrig;
                };
                uiLayer.appendChild(btn);
            }
        } 
        else if (line === "END_MENU") {
            menuActive = false;
        }
    });
    
    systemPrint("GUI LOADED.");
}

// --- Directory Handler (.diskDIR) ---
function loadDIR(dirText) {
    const files = dirText.split('\n');
    
    systemPrint("========================");
    systemPrint(" VOLUME DIRECTORY");
    systemPrint("========================");
    
    let count = 0;
    files.forEach(file => {
        if (file.trim() !== "") {
            systemPrint(" > " + file.trim());
            count++;
        }
    });
    
    systemPrint("========================");
    systemPrint(count + " FILES FOUND");
}

// --- ROM Unpacker (.diskROM) ---
function unpackROM(romText) {
    systemPrint("UNPACKING CARTRIDGE...");
    
    // Split the file block by your custom tag
    const chunks = romText.split('===FILE: ');
    
    chunks.forEach(chunk => {
        if (chunk.trim() === "") return;
        
        const splitIndex = chunk.indexOf('===');
        if (splitIndex === -1) return; // Skip if format is invalid
        
        // Isolate filename and payload
        const fileName = chunk.substring(0, splitIndex).trim();
        const fileData = chunk.substring(splitIndex + 3).trim();
        
        saveToVFS(fileName, fileData);
        systemPrint("INSTALLED: " + fileName);
    });
    
    systemPrint("ROM INSTALL COMPLETE.");
}

// --- Pad Mapping Handler (.diskPAD) ---
function loadPAD(padText) {
    const lines = padText.split('\n');
    
    lines.forEach(line => {
        line = line.trim();
        if (line.startsWith("BTN:")) {
            const parts = line.replace("BTN:", "").trim().split(" ");
            if (parts.length < 2) return;
            
            const touchId = parts[0]; 
            const keyMap = parts[1];  
            
            // Map to physical on-screen DOM buttons
            const btnElement = document.getElementById('pad_btn_' + touchId);
            if (btnElement) {
                // Overwrite any existing touch listener to map this specific layout
                btnElement.ontouchstart = (e) => {
                    e.preventDefault(); // Prevents browser from scrolling/zooming
                    window.dispatchEvent(new KeyboardEvent('keydown', {
                        'key': keyMap,
                        'code': keyMap
                    }));
                };
            }
        }
    });
    
    systemPrint("GAMEPAD MAPPED.");
}

// ==========================================
// 4. SYSTEM UTILITIES
// ==========================================
function systemPrint(text) {
    // Hooks into your existing terminal rendering logic.
    // If you have a global terminal buffer array for the canvas render loop, push it there:
    if (typeof window.terminalBuffer !== 'undefined') {
        window.terminalBuffer.push(text);
    } else {
        // Fallback for debugging if the canvas buffer isn't exposed
        console.log("[DiskOS]:", text); 
    }
}
