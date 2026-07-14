const Parser = {
    // ==========================================
    // 1. SYSTEM MEMORY & HARDWARE STATE
    // ==========================================
    cols: 64, rows: 32,                 // The physical 64x32 cell grid
    cursorX: 0, cursorY: 0,             // Where the blinking cursor currently sits
    vram: [],                           // Video RAM array holding the 2048 screen cells
    textBuffer: [],                     // The active program code memory (Lines of code)
    isRunning: false,                   // True if a program is executing
    currentLineIndex: 0,                // Which line of code the OS is currently running
    variables: {},                      // Storage for user variables (VAR command)
    sprites: {},                        // Storage for custom 1-bit sprites
    customMenus: {},                    // Storage for $MENU GUI definitions
    
    // I/O States
    waitingForKey: false, targetVar: "", // Used by GET_KEY to pause execution
    waitingForTimer: false,             // Used by WAIT command to pause execution
    keysDown: {},                       // Tracks physical keyboard keys held down
    touchActive: 0, touchX: 0, touchY: 0, // Tracks mouse/touch states for the monitor
    audioCtx: null,                     // The WebAudio synthesizer context

    // RAW Mode States
    isCapturingRaw: false,              // True if ---- was typed
    rawBuffer: [],                      // Storage for raw text (bypasses line numbers)

    // ==========================================
    // 2. HELP DOCUMENTATION
    // ==========================================
    HELP_TEXT: [
        "--- DISKOS V1.8 COMMANDS ---",
        "PRINT <val>      : OUTPUT TEXT",
        "VAR <name>=<val> : SET VARIABLE",
        "DIM <arr> <size> : CREATE ARRAY",
        "PEEK <idx>       : READ VRAM",
        "POKE <idx> <val> : WRITE VRAM",
        "PLOT <x> <y> <c> : DRAW PIXEL",
        "DRAW_BOX <x> <y> <w> <h> <c>",
        "DEF_SPRITE <id> <w> <h> <c> <d>",
        "DRAW_SPRITE <id> <x> <y>",
        "IF <cond> THEN ... : LOGIC",
        "GOTO <line>      : JUMP",
        "WAIT <ms>        : DELAY",
        "BEEP <f> <d>     : SOUND",
        "PLAY <note> <d>  : MUSIC",
        "--- FILE SYSTEM ---",
        "SAVE <file>   : VIRTUAL SAVE",
        "LOAD <file>   : VIRTUAL LOAD",
        "EXPORT <file> : DOWNLOAD DISK",
        "IMPORT        : UPLOAD DISK",
        "MOUNT <dir>   : SET PROJECT DIR",
        "DIR           : LIST FILES",
        "LOAD_LIB <f>  : STACK CODE",
        "----          : TOGGLE RAW DATA"
    ],

    // ==========================================
    // 3. UI & HARDWARE CONTROLLERS
    // ==========================================
    
    // Toggles the on-screen Gamepad and locks the browser zoom during gameplay
    setPadMode: function(isActive) {
        const padContainer = document.getElementById('gamepad');
        let meta = document.querySelector('meta[name="viewport"]');
        if (isActive) {
            document.body.classList.add('pad-active');
            if (padContainer) padContainer.style.display = 'flex';
        } else {
            document.body.classList.remove('pad-active');
            if (padContainer) padContainer.style.display = 'none';
        }
    },

    // Boots up the OS and clears the screen to black/amber
    init: function() {
        for (let i = 0; i < this.cols * this.rows; i++) {
            this.vram[i] = { char: ' ', fg: '#FFB000', bg: '#000000' };
        }
        this.cursorX = 0;
        this.cursorY = 0;
        this.setPadMode(false); // Unlock zoom on boot
        this.printLine("*** DiskOS V1.8 ***");
        this.printLine("1024K VIRTUAL DISK MOUNTED");
        this.printLine("READY.");
    },

    setKeyState: function(key, isDown) {
        if (!key) return;
        this.keysDown[key.toUpperCase()] = isDown;
    },

    setTouchState: function(active, x, y) {
        this.touchActive = active;
        this.touchX = x;
        this.touchY = y;
    },

    // Converts 2D (X,Y) coordinates into a 1D array index for VRAM
    getIndex: function(x, y) { return y * this.cols + x; },

    // ==========================================
    // 4. DISPLAY ENGINE
    // ==========================================
    
    // Prints text to the screen, wrapping if it hits the right edge
    printLine: function(text) {
        for (let i = 0; i < text.length; i++) {
            if (this.cursorX >= this.cols) {
                this.cursorX = 0;
                this.cursorY++;
            }
            this.vram[this.getIndex(this.cursorX, this.cursorY)].char = text[i];
            this.cursorX++;
        }
        this.cursorX = 0;
        this.cursorY++;
        this.checkScroll();
    },

    // If the cursor goes past the bottom row, shift all pixels up by one row
    checkScroll: function() {
        if (this.cursorY >= this.rows) {
            for (let y = 1; y < this.rows; y++) {
                for (let x = 0; x < this.cols; x++) {
                    let current = this.getIndex(x, y);
                    let above = this.getIndex(x, y - 1);
                    this.vram[above].char = this.vram[current].char;
                    this.vram[above].bg = this.vram[current].bg; 
                }
            }
            // Clear the very bottom line for new text
            for (let x = 0; x < this.cols; x++) {
                let bottomIdx = this.getIndex(x, this.rows - 1);
                this.vram[bottomIdx].char = ' ';
                this.vram[bottomIdx].bg = '#000000';
            }
            this.cursorY = this.rows - 1;
        }
    },

    // ==========================================
    // 5. INPUT HANDLING
    // ==========================================
    
    handleKey: function(key) {
        // Escape acts as a hard break, stopping running code or raw modes
        if (key === "Escape") {
            if (this.isRunning) {
                this.isRunning = false;
                this.waitingForKey = false;
                this.waitingForTimer = false;
                this.printLine("BREAK.");
                this.printLine("READY.");
            }
            if (this.isCapturingRaw) {
                this.isCapturingRaw = false;
                this.printLine("RAW MODE: ABORTED.");
                this.printLine("READY.");
            }
            return;
        }
        
        // If a program ran GET_KEY, grab the key, save it to the variable, and resume
        if (this.waitingForKey) {
            this.variables[this.targetVar] = key.toUpperCase();
            this.waitingForKey = false;
            this.currentLineIndex++; 
            return;
        }
        
        // Ignore typing if the OS is currently running a game
        if (this.isRunning) return;
        
        if (key === "Enter") {
            this.processCurrentLine(); // Send the typed line to the compiler
            this.cursorX = 0;
            this.cursorY++;
            this.checkScroll();
            return;
        }
        if (key === "Backspace") {
            if (this.cursorX > 0) {
                this.cursorX--;
                let idx = this.getIndex(this.cursorX, this.cursorY);
                this.vram[idx].char = ' ';
                this.vram[idx].bg = '#000000'; 
            }
            return;
        }
        
        // Buffer standard letters to the VRAM
        if (key.length === 1) {
            this.vram[this.getIndex(this.cursorX, this.cursorY)].char = key.toUpperCase();
            this.cursorX++;
            if (this.cursorX >= this.cols) {
                this.cursorX = 0;
                this.cursorY++;
                this.checkScroll();
            }
        }
    },

    // Synthesizes 8-bit style audio beeps
    playTone: function(freq, durationMs) {
        if (!this.audioCtx) return;
        let osc = this.audioCtx.createOscillator();
        let gain = this.audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime); 
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + (durationMs / 1000));
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + (durationMs / 1000));
    },

    // ==========================================
    // 6. TERMINAL COMMAND ROUTER
    // ==========================================
    
    // Reads whatever text is on the cursor's current line and attempts to execute it
    processCurrentLine: function() {
        let rowString = "";
        for (let x = 0; x < this.cols; x++) rowString += this.vram[this.getIndex(x, this.cursorY)].char;
        let cmd = rowString.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
        if (cmd === "") return;

        // Toggle RAW data mode
        if (cmd === "----") {
            this.isCapturingRaw = !this.isCapturingRaw;
            if (this.isCapturingRaw) {
                this.rawBuffer = [];
                this.printLine("RAW MODE: ON");
            } else {
                this.printLine("RAW MODE: OFF (" + this.rawBuffer.length + " LINES)");
                this.printLine("READY.");
            }
            this.cursorY++; this.checkScroll();
            return;
        }

        // If in RAW mode, skip execution and just save it to the rawBuffer
        if (this.isCapturingRaw) {
            this.rawBuffer.push(cmd);
            this.printLine(">");
            this.cursorY++; this.checkScroll();
            return;
        }

        let parts = cmd.split(" ");
        let firstWord = parts[0];
        let fwUpper = firstWord.toUpperCase();

        // --------------------------------------
        // GUI & MENU SYSTEM ($COMMANDS)
        // --------------------------------------
        if (fwUpper.startsWith("$")) {
            this.cursorY++;
            this.checkScroll();
            
            let menu = fwUpper.substring(1); 
            let action = parts[1] ? parts[1].toUpperCase() : null;

            if (menu === "FILE") {
                if (action === "NEW") {
                    this.textBuffer = []; this.variables = {}; this.sprites = {}; this.rawBuffer = [];
                    this.setPadMode(false);
                    this.printLine("MEMORY CLEARED.");
                } else if (action === "SAVE") {
                    let filename = parts[2] ? parts[2].replace(/"/g, "") : "UNTITLED.diskCODE";
                    let payload = "";
                    if (this.rawBuffer.length > 0) {
                        payload = this.rawBuffer.join('\n');
                        this.rawBuffer = []; 
                    } else {
                        payload = "TYPE: diskCODE\nCOMPATIBILITY: V1.8\n---\n";
                        for (let i = 0; i < this.textBuffer.length; i++) payload += this.textBuffer[i].line + " " + this.textBuffer[i].code + "\n";
                    }
                    Kernel.virtualSave(filename, payload);
                    this.printLine("SAVED " + filename + " TO VIRTUAL DRIVE.");
                } else if (action === "EXPORT") {
                    let filename = parts[2] ? parts[2].replace(/"/g, "") : "UNTITLED.diskCODE";
                    let payload = "";
                    if (this.rawBuffer.length > 0) {
                        payload = this.rawBuffer.join('\n');
                    } else {
                        payload = "TYPE: diskCODE\nCOMPATIBILITY: V1.8\n---\n";
                        for (let i = 0; i < this.textBuffer.length; i++) payload += this.textBuffer[i].line + " " + this.textBuffer[i].code + "\n";
                    }
                    Kernel.physicalExport(filename, payload);
                    this.printLine("EXPORTING " + filename + " TO DEVICE.");
                } else {
                    this.printLine("--- FILE MENU ---");
                    this.printLine("  $FILE NEW");
                    this.printLine("  $FILE SAVE [FILENAME]");
                    this.printLine("  $FILE EXPORT [FILENAME]");
                    this.printLine("-----------------");
                }
            } 
            else if (menu === "EDIT") {
                if (action === "COPY") {
                    let payload = "";
                    if (this.rawBuffer.length > 0) {
                        payload = this.rawBuffer.join('\n');
                    } else {
                        for (let i = 0; i < this.textBuffer.length; i++) payload += this.textBuffer[i].line + " " + this.textBuffer[i].code + "\n";
                    }
                    navigator.clipboard.writeText(payload).catch(e => {});
                    this.printLine("MEMORY COPIED.");
                } else if (action === "PASTE") {
                    navigator.clipboard.readText().then(text => {
                        this.pasteFromClipboard(text);
                    }).catch(err => {
                        this.printLine("?CLIPBOARD ACCESS DENIED");
                        this.printLine("READY.");
                    });
                    this.cursorY--; 
                    return; 
                } else {
                    this.printLine("--- EDIT MENU ---");
                    this.printLine("  $EDIT COPY");
                    this.printLine("  $EDIT PASTE");
                    this.printLine("-----------------");
                }
            }
            // Trigger loaded Custom GUI Menus (like games or apps)
            else if (this.customMenus[menu]) {
                if (action && this.customMenus[menu].includes(action)) {
                    this.variables["SYS_GUI_EVENT"] = menu + "." + action;
                    this.printLine("RUNNING " + action + "...");
                    this.runCode();
                    this.cursorY--; 
                    return;
                } else {
                    this.printLine("--- " + menu + " MENU ---");
                    for (let i = 0; i < this.customMenus[menu].length; i++) {
                        this.printLine("  $" + menu + " " + this.customMenus[menu][i]);
                    }
                    this.printLine("-----------------");
                }
            }
            else {
                this.printLine("?UNKNOWN GUI MENU");
                this.printLine("TYPE $FILE OR $EDIT");
            }
            
            this.printLine("READY.");
            this.cursorY--;
            return; 
        }

        // --------------------------------------
        // PROGRAMMING MODE (LINE NUMBERS)
        // --------------------------------------
        // If it starts with a number (e.g. 10 PRINT "HELLO"), save it to memory
        if (!isNaN(firstWord)) {
            let lineNum = parseInt(firstWord);
            let codeString = cmd.substring(firstWord.length).trim();
            let existingIndex = this.textBuffer.findIndex(item => item.line === lineNum);
            
            // If the code string is empty, delete the line
            if (codeString === "") {
                if (existingIndex !== -1) this.textBuffer.splice(existingIndex, 1);
            } else {
                if (existingIndex !== -1) this.textBuffer[existingIndex].code = codeString; 
                else this.textBuffer.push({ line: lineNum, code: codeString }); 
            }
            this.textBuffer.sort((a, b) => a.line - b.line); // Keep sorted sequentially
            
        } else {
            // --------------------------------------
            // IMMEDIATE TERMINAL COMMANDS
            // --------------------------------------
            this.cursorY++;
            this.checkScroll();

            if (fwUpper === "CLEAR_SCR") {
                for (let i = 0; i < this.cols * this.rows; i++) {
                    this.vram[i].char = ' ';
                    this.vram[i].bg = '#000000'; 
                }
                this.cursorX = 0;
                this.cursorY = 0; 
                this.cursorY--; 
            } 
            else if (fwUpper === "HELP") {
                this.printLine("");
                for (let line of this.HELP_TEXT) this.printLine(line);
                this.printLine("");
                this.cursorY--;
            }
            else if (fwUpper === "LIST") {
                if (this.textBuffer.length === 0) this.printLine("MEMORY IS EMPTY.");
                else for (let i = 0; i < this.textBuffer.length; i++) this.printLine(this.textBuffer[i].line + " " + this.textBuffer[i].code);
                this.printLine("READY.");
                this.cursorY--;
            } 
            else if (fwUpper === "NEW") {
                this.textBuffer = []; this.variables = {}; this.sprites = {}; this.rawBuffer = [];
                this.setPadMode(false);
                this.printLine("MEMORY CLEARED.");
                this.printLine("READY.");
                this.cursorY--;
            }
            else if (fwUpper === "SAVE") {
                let filename = cmd.substring(4).trim().replace(/"/g, "");
                if (filename === "") filename = "UNTITLED.diskCODE";
                
                let payload = "";
                if (this.rawBuffer.length > 0) {
                    payload = this.rawBuffer.join('\n');
                    this.rawBuffer = [];
                } else {
                    payload = "TYPE: diskCODE\nCOMPATIBILITY: V1.8\n---\n";
                    for (let i = 0; i < this.textBuffer.length; i++) payload += this.textBuffer[i].line + " " + this.textBuffer[i].code + "\n";
                }
                Kernel.virtualSave(filename, payload);
                this.printLine("SAVED TO VIRTUAL DRIVE.");
                this.printLine("READY.");
                this.cursorY--;
            }
            else if (fwUpper === "LOAD") {
                let filename = cmd.substring(4).trim().replace(/"/g, "");
                let content = Kernel.virtualLoad(filename);
                if (content) this.processFileContent(content, filename);
                else this.printLine("?FILE NOT FOUND ON VIRTUAL DRIVE");
                this.cursorY--;
            }
            else if (fwUpper === "EXPORT") {
                let filename = cmd.substring(6).trim().replace(/"/g, "");
                if (filename === "") filename = "UNTITLED.diskCODE";
                
                let payload = "";
                if (this.rawBuffer.length > 0) {
                    payload = this.rawBuffer.join('\n');
                } else {
                    payload = "TYPE: diskCODE\nCOMPATIBILITY: V1.8\n---\n";
                    for (let i = 0; i < this.textBuffer.length; i++) payload += this.textBuffer[i].line + " " + this.textBuffer[i].code + "\n";
                }
                Kernel.physicalExport(filename, payload);
                this.printLine("DOWNLOADING TO DEVICE...");
                this.printLine("READY.");
                this.cursorY--;
            }
            else if (fwUpper === "IMPORT") {
                this.printLine("WAITING FOR UPLOAD...");
                Kernel.triggerImport();
                this.cursorY--;
            }
            else if (fwUpper === "MOUNT") {
                let dirname = cmd.substring(5).trim().replace(/"/g, "");
                if (dirname === "") dirname = "MASTER.diskDIR";
                
                let files = Kernel.mountDir(dirname);
                this.printLine("MOUNTED: " + dirname);
                
                this.variables["SYS_FILE_COUNT"] = files.length;
                this.variables["SYS_FILES"] = files;
                
                if (files.includes("MAIN.diskCODE")) {
                    this.printLine("AUTO-BOOTING MAIN.diskCODE...");
                    let mainContent = Kernel.virtualLoad("MAIN.diskCODE");
                    if (mainContent) {
                        this.processFileContent(mainContent, "MAIN.diskCODE");
                        this.runCode();
                    }
                } else {
                    this.printLine("READY.");
                }
                this.cursorY--;
            }
            else if (fwUpper === "DIR") {
                if (!Kernel.activeDir) {
                    this.printLine("?NO DIRECTORY MOUNTED");
                } else {
                    let files = Kernel.mountDir(Kernel.activeDir);
                    this.printLine("DIR: " + Kernel.activeDir);
                    for (let f of files) this.printLine("  " + f);
                    this.variables["SYS_FILE_COUNT"] = files.length;
                    this.variables["SYS_FILES"] = files;
                }
                this.printLine("READY.");
                this.cursorY--;
            }
            else if (fwUpper === "LOAD_LIB") {
                let filename = parts[1];
                let libContent = Kernel.virtualLoad(filename);
                if (libContent) {
                    this.printLine("STACKING " + filename + "...");
                    let lines = libContent.split('\n');
                    let isPayload = false;
                    for (let i = 0; i < lines.length; i++) {
                        let line = lines[i].replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
                        if (line === "---") { isPayload = true; continue; }
                        if (isPayload && line !== "") {
                            let p = line.split(" ");
                            let lNum = parseInt(p[0]);
                            if (!isNaN(lNum)) this.textBuffer.push({ line: lNum, code: line.substring(p[0].length).trim() });
                        }
                    }
                    this.textBuffer.sort((a, b) => a.line - b.line);
                    this.printLine("STACK SUCCESSFUL.");
                } else {
                    this.printLine("?FILE NOT FOUND");
                }
                this.cursorY--;
            }
            else if (fwUpper === "COPY") {
                let allCode = "";
                for (let i = 0; i < this.textBuffer.length; i++) allCode += this.textBuffer[i].line + " " + this.textBuffer[i].code + "\n";
                navigator.clipboard.writeText(allCode).catch(e => {});
                this.printLine("ALL CODE COPIED.");
                this.printLine("READY.");
                this.cursorY--;
            }
            else if (fwUpper === "RUN") {
                this.runCode();
                this.cursorY--;
            }
            else {
                this.printLine("?SYNTAX ERROR");
                this.cursorY--;
            }
        }
    },

    // ==========================================
    // 7. PROGRAM EXECUTION PREP
    // ==========================================
    
    // Sets up the environment variables and flags to start executing memory
    runCode: function() {
        if (this.textBuffer.length > 0) {
            try {
                // Initialize audio engine upon user interaction
                if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
            } catch (e) { console.warn("Audio disabled."); }

            this.isRunning = true;
            this.currentLineIndex = 0;
            
            // Preserve system variables that survive a memory wipe
            let preservedCount = this.variables["SYS_FILE_COUNT"];
            let preservedFiles = this.variables["SYS_FILES"];
            let preservedEvent = this.variables["SYS_GUI_EVENT"]; 
            
            this.variables = {}; 
            
            if (preservedCount !== undefined) {
                this.variables["SYS_FILE_COUNT"] = preservedCount;
                this.variables["SYS_FILES"] = preservedFiles;
            }
            if (preservedEvent !== undefined) {
                this.variables["SYS_GUI_EVENT"] = preservedEvent;
            }
            
            this.sprites = {}; 
            this.waitingForTimer = false;
            this.keysDown = {}; 
            this.touchActive = 0;
        } else {
            this.printLine("MEMORY IS EMPTY.");
            this.printLine("READY.");
        }
    },

    // ==========================================
    // 8. FILE COMPILER (.diskCODE, .diskGUI, .diskPAD)
    // ==========================================
    
    processFileContent: function(fileContent, filename) {
        this.printLine("LOADING " + filename + "...");
        let lines = fileContent.split('\n');
        
        let fileType = "diskCODE"; 
        for (let i = 0; i < Math.min(5, lines.length); i++) {
            if (lines[i].toUpperCase().startsWith("TYPE: DISKGUI")) fileType = "diskGUI";
            if (lines[i].toUpperCase().startsWith("TYPE: DISKPAD")) fileType = "diskPAD";
        }

        // --- DISKPAD COMPILER ---
        // Builds the on-screen mobile controller dynamically based on text file rules
        if (fileType === "diskPAD") {
            const padLeft = document.getElementById('pad-left');
            const padRight = document.getElementById('pad-right');
            padLeft.innerHTML = ''; padRight.innerHTML = '';
            let itemsAdded = 0;

            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
                
                if (line.startsWith("DPAD: HORIZONTAL")) {
                    padLeft.innerHTML += `<div class="btn btn-dpad" onmousedown="Parser.setKeyState('ArrowLeft', true)" onmouseup="Parser.setKeyState('ArrowLeft', false)" ontouchstart="Parser.setKeyState('ArrowLeft', true)" ontouchend="Parser.setKeyState('ArrowLeft', false)">◀</div>`;
                    padLeft.innerHTML += `<div class="btn btn-dpad" onmousedown="Parser.setKeyState('ArrowRight', true)" onmouseup="Parser.setKeyState('ArrowRight', false)" ontouchstart="Parser.setKeyState('ArrowRight', true)" ontouchend="Parser.setKeyState('ArrowRight', false)">▶</div>`;
                    itemsAdded++;
                } 
                else if (line.startsWith("BTN: ")) {
                    let parts = line.split(" ");
                    let label = parts[1] || "A";
                    let mappedKey = parts[2] || "SPACE";
                    let sizeClass = (parts[3] && parts[3] === "SMALL") ? "btn-small" : "btn-action";
                    if (mappedKey === "SPACE") mappedKey = " ";
                    
                    padRight.innerHTML += `<div class="btn ${sizeClass}" onmousedown="Parser.setKeyState('${mappedKey}', true)" onmouseup="Parser.setKeyState('${mappedKey}', false)" ontouchstart="Parser.setKeyState('${mappedKey}', true)" ontouchend="Parser.setKeyState('${mappedKey}', false)">${label}</div>`;
                    itemsAdded++;
                }
            }
            this.setPadMode(true);
            this.printLine("REGISTERED " + itemsAdded + " PAD ELEMENTS.");
            this.printLine("READY.");
            return; 
        }

        // --- DISKGUI COMPILER ---
        // Exposes native menus inside the terminal environment
        if (fileType === "diskGUI") {
            this.customMenus = {};
            let currentMenu = null;
            let itemsAdded = 0;
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
                if (line.startsWith("DEF_MENU ")) {
                    currentMenu = line.substring(9).replace("$", "").trim().toUpperCase();
                    this.customMenus[currentMenu] = [];
                } else if (line.startsWith("DEF_ITEM ") && currentMenu) {
                    this.customMenus[currentMenu].push(line.substring(9).trim().toUpperCase());
                    itemsAdded++;
                }
            }
            this.printLine("REGISTERED " + itemsAdded + " GUI ITEMS.");
            this.printLine("READY.");
            return; 
        }

        // --- DISKCODE COMPILER ---
        // Standard executable payload
        let isPayload = false;
        this.textBuffer = []; 
        let linesAdded = 0;
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
            if (line === "---") { isPayload = true; continue; }
            if (isPayload && line !== "") {
                let parts = line.split(" ");
                let lineNum = parseInt(parts[0]);
                if (!isNaN(lineNum)) {
                    this.textBuffer.push({ line: lineNum, code: line.substring(parts[0].length).trim() });
                    linesAdded++;
                }
            }
        }
        this.textBuffer.sort((a, b) => a.line - b.line);
        this.printLine("LOADED " + linesAdded + " LINES.");
        this.printLine("READY.");
    },

    // ==========================================
    // 9. DATA INGESTION
    // ==========================================
    
    // Ingests blocks of code from the clipboard interceptor in index.html
    pasteFromClipboard: function(text) {
        this.printLine("PASTING...");
        text = text.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Strip invisible formatting chars
        let lines = text.split('\n');
        let linesAdded = 0;

        if (this.isCapturingRaw) {
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].trim();
                if (line === "") continue;
                this.rawBuffer.push(line);
                
                // Echo the paste to the screen so the user knows it worked!
                let preview = "> " + line.substring(0, this.cols - 3);
                this.printLine(preview); 
                
                linesAdded++;
            }
            this.printLine("PASTED " + linesAdded + " LINES TO RAW BUFFER.");
            this.printLine("READY.");
        } 
        else {
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].trim();
                if (line === "") continue;
                let parts = line.split(" ");
                let lineNum = parseInt(parts[0]);
                if (!isNaN(lineNum)) {
                    let codeString = line.substring(parts[0].length).trim();
                    let existingIndex = this.textBuffer.findIndex(item => item.line === lineNum);
                    if (existingIndex !== -1) this.textBuffer[existingIndex].code = codeString;
                    else this.textBuffer.push({ line: lineNum, code: codeString });
                    linesAdded++;
                }
            }
            this.textBuffer.sort((a, b) => a.line - b.line);
            this.printLine("PASTED " + linesAdded + " LINES TO MEMORY.");
            this.printLine("READY.");
        }
    },

    // ==========================================
    // 10. SYSTEM MATH & LOGIC
    // ==========================================
    
    resolveColor: function(c) {
        const colors = { 
            RED: "#FF0000", BLUE: "#5C5CFF", AMBER: "#FFB000", 
            GREEN: "#00FF00", BLACK: "#000000", WHITE: "#FFFFFF", 
            YELLOW: "#FFFF00", PURPLE: "#FF00FF", CYAN: "#00FFFF" 
        };
        if (!c) return "#FFB000";
        return colors[c.toUpperCase()] || c; 
    },

    // Parses string expressions (e.g. "X + 5", "RND(10)") into actual JS values
    evaluateExpression: function(expr) {
        let safeExpr = expr;
        
        // Inject user variables
        for (const [key, value] of Object.entries(this.variables)) {
            let regex = new RegExp('\\b' + key + '\\b', 'g');
            let safeValue;
            if (typeof value === 'string') safeValue = '"' + value + '"';
            else if (Array.isArray(value)) safeValue = JSON.stringify(value); 
            else safeValue = value;
            safeExpr = safeExpr.replace(regex, safeValue);
        }

        // Inject System variables and functions
        safeExpr = safeExpr.replace(/\bRND\((.*?)\)/g, "Math.floor(Math.random() * ($1))");
        safeExpr = safeExpr.replace(/\bTOUCH_ACTIVE\b/g, this.touchActive);
        safeExpr = safeExpr.replace(/\bTOUCH_X\b/g, this.touchX);
        safeExpr = safeExpr.replace(/\bTOUCH_Y\b/g, this.touchY);

        // Hardware key mapping (translates diskCODE keywords into raw JS keys)
        safeExpr = safeExpr.replace(/\bBTN_([A-Z0-9_]+)\b/g, (match, p1) => {
            let keyName = p1;
            if (keyName === "SPACE") keyName = " ";
            if (keyName === "UP") keyName = "ARROWUP";
            if (keyName === "DOWN") keyName = "ARROWDOWN";
            if (keyName === "LEFT") keyName = "ARROWLEFT";
            if (keyName === "RIGHT") keyName = "ARROWRIGHT";
            return this.keysDown[keyName] ? "1" : "0";
        });

        safeExpr = safeExpr.replace(/\bAND\b/g, "&&");
        safeExpr = safeExpr.replace(/\bOR\b/g, "||");

        // Evaluates the math
        try { return new Function('return ' + safeExpr)(); } 
        catch (e) { return expr; }
    },

    // ==========================================
    // 11. THE RUNTIME ENGINE (The Core)
    // ==========================================
    
    // Runs exactly one line of code from the memory buffer.
    // Called 20x per frame by index.html to simulate processor speed.
    executeStep: function() {
        if (!this.isRunning || this.waitingForKey || this.waitingForTimer) return;

        if (this.currentLineIndex >= this.textBuffer.length) {
            this.isRunning = false;
            this.printLine("READY.");
            return;
        }

        let currentLine = this.textBuffer[this.currentLineIndex];
        let code = currentLine.code.trim();
        let parts = code.split(" ");
        let cmd = parts[0].toUpperCase();

        if (code.includes("GET_KEY")) {
            let parts = code.split("=");
            if (parts.length === 2) {
                this.targetVar = parts[0].trim();
                this.waitingForKey = true;
                return;
            }
        }

        if (cmd === "PRINT") {
            let text = code.substring(5).trim();
            if (text.startsWith('"') && text.endsWith('"')) {
                this.printLine(text.substring(1, text.length - 1));
            } else {
                let val = this.evaluateExpression(text);
                this.printLine(val !== undefined ? val.toString() : "");
            }
            this.currentLineIndex++;
        } 
        else if (cmd === "DIM") {
            let arrName = parts[1];
            let size = parseInt(this.evaluateExpression(parts[2]));
            this.variables[arrName] = new Array(size).fill(0);
            this.currentLineIndex++;
        }
        else if (cmd === "VAR") {
            let expr = code.substring(4).trim();
            let splitIndex = expr.indexOf("=");
            if (splitIndex !== -1) {
                let leftSide = expr.substring(0, splitIndex).trim();
                let rightSide = expr.substring(splitIndex + 1).trim();
                let val = this.evaluateExpression(rightSide);
                
                if (leftSide.includes("[")) {
                    let arrName = leftSide.substring(0, leftSide.indexOf("["));
                    let inner = leftSide.substring(leftSide.indexOf("[") + 1, leftSide.indexOf("]"));
                    let idx = parseInt(this.evaluateExpression(inner));
                    if (this.variables[arrName] && Array.isArray(this.variables[arrName])) {
                        this.variables[arrName][idx] = val;
                    }
                } else {
                    this.variables[leftSide] = val;
                }
                this.currentLineIndex++;
            } else {
                this.printLine("?SYNTAX ERROR IN " + currentLine.line);
                this.isRunning = false;
                this.printLine("READY.");
            }
        }
        else if (cmd === "POKE") {
            let idx = parseInt(this.evaluateExpression(parts[1]));
            let val = parseInt(this.evaluateExpression(parts[2]));
            if (idx >= 0 && idx < this.vram.length) this.vram[idx].bg = this.resolveColor(val.toString());
            this.currentLineIndex++;
        }
        else if (cmd === "PEEK") {
            let idx = parseInt(this.evaluateExpression(parts[1]));
            this.variables["PEEK_VAL"] = this.vram[idx] ? this.vram[idx].bg : 0;
            this.currentLineIndex++;
        }
        else if (cmd === "WAIT") {
            let delay = parseInt(this.evaluateExpression(parts[1]));
            if (isNaN(delay)) delay = 100;
            this.waitingForTimer = true;
            setTimeout(() => {
                this.waitingForTimer = false;
                this.currentLineIndex++;
            }, delay);
            return; 
        }
        else if (cmd === "BEEP") {
            let freq = parseFloat(this.evaluateExpression(parts[1]));
            let dur = parseInt(this.evaluateExpression(parts[2]));
            if (isNaN(dur)) dur = 100;
            if (!isNaN(freq)) this.playTone(freq, dur);
            this.currentLineIndex++;
        }
        else if (cmd === "PLAY") {
            let note = parts[1].toUpperCase();
            let dur = parseInt(this.evaluateExpression(parts[2]));
            if (isNaN(dur)) dur = 100;
            const noteMap = {"C3":130.81,"C#3":138.59,"D3":146.83,"D#3":155.56,"E3":164.81,"F3":174.61,"F#3":185.00,"G3":196.00,"G#3":207.65,"A3":220.00,"A#3":233.08,"B3":246.94,"C4":261.63,"C#4":277.18,"D4":293.66,"D#4":311.13,"E4":329.63,"F4":349.23,"F#4":369.99,"G4":392.00,"G#4":415.30,"A4":440.00,"A#4":466.16,"B4":493.88,"C5":523.25,"C#5":554.37,"D5":587.33,"D#5":622.25,"E5":659.25,"F5":698.46,"F#5":739.99,"G5":783.99,"G#5":830.61,"A5":880.00,"A#5":932.33,"B5":987.77};
            let freq = noteMap[note];
            if (freq) this.playTone(freq, dur);
            this.currentLineIndex++;
        }
        else if (cmd === "PLOT") {
            let x = parseInt(this.evaluateExpression(parts[1]));
            let y = parseInt(this.evaluateExpression(parts[2]));
            let color = this.resolveColor(parts[3]);
            if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
                let idx = this.getIndex(x, y);
                this.vram[idx].bg = color;
                this.vram[idx].char = ' '; 
            }
            this.currentLineIndex++;
        }
        else if (cmd === "DRAW_BOX") {
            let startX = parseInt(this.evaluateExpression(parts[1]));
            let startY = parseInt(this.evaluateExpression(parts[2]));
            let w = parseInt(this.evaluateExpression(parts[3]));
            let h = parseInt(this.evaluateExpression(parts[4]));
            let color = this.resolveColor(parts[5]);
            for (let y = startY; y < startY + h; y++) {
                for (let x = startX; x < startX + w; x++) {
                    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
                        let idx = this.getIndex(x, y);
                        this.vram[idx].bg = color;
                        this.vram[idx].char = ' ';
                    }
                }
            }
            this.currentLineIndex++;
        }
        else if (cmd === "DEF_SPRITE") {
            let id = parts[1];
            let w = parseInt(this.evaluateExpression(parts[2]));
            let h = parseInt(this.evaluateExpression(parts[3]));
            let color = this.resolveColor(parts[4]);
            let data = parts[5];
            this.sprites[id] = { w: w, h: h, color: color, data: data };
            this.currentLineIndex++;
        }
        else if (cmd === "DRAW_SPRITE") {
            let id = parts[1];
            let startX = parseInt(this.evaluateExpression(parts[2]));
            let startY = parseInt(this.evaluateExpression(parts[3]));
            let sprite = this.sprites[id];
            
            if (sprite && sprite.data) {
                let i = 0;
                for (let y = 0; y < sprite.h; y++) {
                    for (let x = 0; x < sprite.w; x++) {
                        if (i < sprite.data.length) {
                            let bit = sprite.data.charAt(i);
                            if (bit === '1') { 
                                let px = startX + x;
                                let py = startY + y;
                                if (px >= 0 && px < this.cols && py >= 0 && py < this.rows) {
                                    let idx = this.getIndex(px, py);
                                    this.vram[idx].bg = sprite.color;
                                    this.vram[idx].char = ' ';
                                }
                            }
                        }
                        i++;
                    }
                }
            }
            this.currentLineIndex++;
        }
        else if (cmd === "DIR") {
            if (Kernel.activeDir) {
                let files = Kernel.mountDir(Kernel.activeDir);
                this.variables["SYS_FILE_COUNT"] = files.length;
                this.variables["SYS_FILES"] = files;
            }
            this.currentLineIndex++;
        }
        else if (cmd === "IF") {
            let conditionBlock = code.substring(2).split("THEN");
            if (conditionBlock.length === 2) {
                let condition = conditionBlock[0].trim();
                let action = conditionBlock[1].trim();
                
                if (this.evaluateExpression(condition)) {
                    let actionParts = action.split(" ");
                    let aCmd = actionParts[0].toUpperCase();

                    if (aCmd === "GOTO") {
                        let targetLine = parseInt(actionParts[1]);
                        let targetIndex = this.textBuffer.findIndex(item => item.line === targetLine);
                        if (targetIndex !== -1) {
                            this.currentLineIndex = targetIndex; 
                            return; 
                        } else {
                            this.printLine("?LINE NOT FOUND ERROR");
                            this.isRunning = false;
                            this.printLine("READY.");
                            return;
                        }
                    } 
                    else if (aCmd === "END") {
                        this.isRunning = false;
                        this.printLine("READY.");
                        return;
                    }
                    else if (aCmd === "VAR") {
                        let expr = action.substring(4).trim();
                        let splitIndex = expr.indexOf("=");
                        if (splitIndex !== -1) {
                            let leftSide = expr.substring(0, splitIndex).trim();
                            let rightSide = expr.substring(splitIndex + 1).trim();
                            let val = this.evaluateExpression(rightSide);
                            
                            if (leftSide.includes("[")) {
                                let arrName = leftSide.substring(0, leftSide.indexOf("["));
                                let inner = leftSide.substring(leftSide.indexOf("[") + 1, leftSide.indexOf("]"));
                                let idx = parseInt(this.evaluateExpression(inner));
                                if (this.variables[arrName] && Array.isArray(this.variables[arrName])) {
                                    this.variables[arrName][idx] = val;
                                }
                            } else {
                                this.variables[leftSide] = val;
                            }
                        } else {
                            this.printLine("?SYNTAX ERROR IN " + currentLine.line);
                            this.isRunning = false;
                            this.printLine("READY.");
                            return;
                        }
                    }
                }
            }
            this.currentLineIndex++;
        }
        else if (cmd === "GOTO") {
            let targetLine = parseInt(parts[1]);
            let targetIndex = this.textBuffer.findIndex(item => item.line === targetLine);
            if (targetIndex !== -1) {
                this.currentLineIndex = targetIndex; 
            } else {
                this.printLine("?LINE NOT FOUND ERROR");
                this.isRunning = false;
                this.printLine("READY.");
            }
        }
        else if (cmd === "END") {
            this.isRunning = false;
            this.printLine("READY.");
            return;
        }
        else if (cmd === "CLEAR_SCR") {
            for (let i = 0; i < this.cols * this.rows; i++) {
                this.vram[i].char = ' ';
                this.vram[i].bg = '#000000'; 
            }
            this.cursorX = 0;
            this.cursorY = 0; 
            this.currentLineIndex++;
        }
        else {
            this.printLine("?SYNTAX ERROR IN " + currentLine.line);
            this.isRunning = false;
            this.printLine("READY.");
        }
    }
};

// Power up the parser on load!
Parser.init();
