const Parser = {
    // ==========================================
    // 1. SYSTEM MEMORY & HARDWARE STATE
    // ==========================================
    cols: 64, rows: 32,                 
    cursorX: 0, cursorY: 0,             
    vram: [],                           
    textBuffer: [],                     
    isRunning: false,                   
    currentLineIndex: 0,                
    variables: {},                      
    sprites: {},                        
    customMenus: {},                    
    
    waitingForKey: false, targetVar: "", 
    waitingForTimer: false,             
    keysDown: {},                       
    touchActive: 0, touchX: 0, touchY: 0, 
    audioCtx: null,                     

    isCapturingRaw: false,              
    rawBuffer: [],                      
    rawFileType: "RAW", 

    // Dynamic Theme Variables
    systemColor: '#FFB000',
    systemBgColor: '#000000',
    cursorColor: '#FFB000',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    fontStyle: 'normal',
    textDecor: 'none',

    // ==========================================
    // 2. HELP DOCUMENTATION
    // ==========================================
    HELP_TEXT: [
        "--- DISKOS V1.8 COMMANDS ---",
        "PRINT <val>      : OUTPUT TEXT",
        "VAR <name>=<val> : SET VARIABLE",
        "DIM <arr> <size> : CREATE ARRAY",
        "PEEK <idx>       : READ VRAM",
        "POKE <idx> <val> : WRITE BG COLOR",
        "POKE_FG <i><val> : WRITE FG COLOR",
        "POKE_CHAR <i><c> : WRITE ASCII",
        "PLOT <x> <y> <c> : DRAW PIXEL",
        "DRAW_BOX <x><y><w><h><c>",
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
    
    resetTheme: function() {
        this.systemColor = '#FFB000';
        this.systemBgColor = '#000000';
        this.cursorColor = '#FFB000';
        this.fontFamily = 'monospace';
        this.fontWeight = 'bold';
        this.fontStyle = 'normal';
        this.textDecor = 'none';
        
        document.documentElement.style.setProperty('--bg-color', '#050505');
        document.documentElement.style.setProperty('--crt-border', '#1a1a1a');
        let scanlineObj = document.querySelector('.scanlines');
        if (scanlineObj) scanlineObj.style.display = 'block';
    },

    setPadMode: function(isActive) {
        const padContainer = document.getElementById('gamepad');
        if (isActive) {
            document.body.classList.add('pad-active');
            if (padContainer) padContainer.style.display = 'flex';
        } else {
            document.body.classList.remove('pad-active');
            if (padContainer) padContainer.style.display = 'none';
        }
    },

    init: function() {
        this.resetTheme();
        for (let i = 0; i < this.cols * this.rows; i++) {
            this.vram[i] = { char: ' ', fg: this.systemColor, bg: this.systemBgColor };
        }
        this.cursorX = 0;
        this.cursorY = 0;
        this.setPadMode(false); 
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

    getIndex: function(x, y) { return y * this.cols + x; },

    // ==========================================
    // 4. DISPLAY ENGINE
    // ==========================================
    
    printLine: function(text) {
        for (let i = 0; i < text.length; i++) {
            if (this.cursorX >= this.cols) {
                this.cursorX = 0;
                this.cursorY++;
            }
            let idx = this.getIndex(this.cursorX, this.cursorY);
            this.vram[idx].char = text[i];
            this.vram[idx].fg = this.systemColor;
            this.cursorX++;
        }
        this.cursorX = 0;
        this.cursorY++;
        this.checkScroll();
    },

    checkScroll: function() {
        if (this.cursorY >= this.rows) {
            for (let y = 1; y < this.rows; y++) {
                for (let x = 0; x < this.cols; x++) {
                    let current = this.getIndex(x, y);
                    let above = this.getIndex(x, y - 1);
                    this.vram[above].char = this.vram[current].char;
                    this.vram[above].fg = this.vram[current].fg;
                    this.vram[above].bg = this.vram[current].bg; 
                }
            }
            for (let x = 0; x < this.cols; x++) {
                let bottomIdx = this.getIndex(x, this.rows - 1);
                this.vram[bottomIdx].char = ' ';
                this.vram[bottomIdx].bg = this.systemBgColor;
            }
            this.cursorY = this.rows - 1;
        }
    },

    // ==========================================
    // 5. INPUT HANDLING
    // ==========================================
    
    handleKey: function(key) {
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
        
        if (this.waitingForKey) {
            this.variables[this.targetVar] = key.toUpperCase();
            this.waitingForKey = false;
            this.currentLineIndex++; 
            return;
        }
        
        if (this.isRunning) return;
        
        if (key === "Enter") {
            this.processCurrentLine(); 
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
                this.vram[idx].bg = this.systemBgColor; 
            }
            return;
        }
        
        if (key.length === 1) {
            let idx = this.getIndex(this.cursorX, this.cursorY);
            this.vram[idx].char = key.toUpperCase();
            this.vram[idx].fg = this.systemColor;
            this.cursorX++;
            if (this.cursorX >= this.cols) {
                this.cursorX = 0;
                this.cursorY++;
                this.checkScroll();
            }
        }
    },

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
    
    processCurrentLine: function() {
        let rowString = "";
        for (let x = 0; x < this.cols; x++) rowString += this.vram[this.getIndex(x, this.cursorY)].char;
        let cmd = rowString.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
        if (cmd === "") return;

        if (cmd === "----") {
            this.isCapturingRaw = !this.isCapturingRaw;
            if (this.isCapturingRaw) {
                this.rawFileType = "RAW"; 
                this.printLine("RAW MODE: ON (APPENDING)");
            } else {
                this.printLine("RAW MODE: OFF (" + this.rawBuffer.length + " LINES TOTAL)");
                this.printLine("READY.");
            }
            this.cursorY++; this.checkScroll();
            return;
        }

        if (this.isCapturingRaw) {
            let chk = cmd.toUpperCase();
            if (chk === "LIST" || chk === "RUN" || chk === "SAVE" || chk === "$FILE") {
                this.printLine("?EXIT RAW MODE (----) TO USE " + chk);
                this.cursorY++; this.checkScroll();
                return;
            }
            this.rawBuffer.push(cmd);
            this.printLine(">");
            this.cursorY++; this.checkScroll();
            return;
        }

        let parts = cmd.split(" ");
        let firstWord = parts[0];
        let fwUpper = firstWord.toUpperCase();

        if (fwUpper.startsWith("$")) {
            this.cursorY++;
            this.checkScroll();
            
            let menu = fwUpper.substring(1); 
            let action = parts[1] ? parts[1].toUpperCase() : null;

            if (menu === "FILE") {
                if (action === "NEW") {
                    this.textBuffer = []; this.variables = {}; this.sprites = {}; this.rawBuffer = []; this.customMenus = {};
                    this.setPadMode(false);
                    this.resetTheme();
                    this.printLine("MEMORY CLEARED. THEME RESET.");
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

        if (!isNaN(firstWord)) {
            let lineNum = parseInt(firstWord);
            let codeString = cmd.substring(firstWord.length).trim();
            let existingIndex = this.textBuffer.findIndex(item => item.line === lineNum);
            
            if (codeString === "") {
                if (existingIndex !== -1) this.textBuffer.splice(existingIndex, 1);
            } else {
                if (existingIndex !== -1) this.textBuffer[existingIndex].code = codeString; 
                else this.textBuffer.push({ line: lineNum, code: codeString }); 
            }
            this.textBuffer.sort((a, b) => a.line - b.line); 
            
        } else {
            this.cursorY++;
            this.checkScroll();

            if (fwUpper === "CLEAR_SCR") {
                for (let i = 0; i < this.cols * this.rows; i++) {
                    this.vram[i].char = ' ';
                    this.vram[i].bg = this.systemBgColor; 
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
                let isEmpty = true;
                if (this.textBuffer.length > 0) {
                    this.printLine("--- CODE MEMORY ---");
                    for (let i = 0; i < this.textBuffer.length; i++) this.printLine(this.textBuffer[i].line + " " + this.textBuffer[i].code);
                    isEmpty = false;
                }
                if (this.rawBuffer.length > 0) {
                    this.printLine("--- RAW DATA MEMORY ---");
                    for (let i = 0; i < this.rawBuffer.length; i++) this.printLine(this.rawBuffer[i]);
                    isEmpty = false;
                }
                if (isEmpty) this.printLine("MEMORY IS EMPTY.");
                
                this.printLine("READY.");
                this.cursorY--;
            } 
            else if (fwUpper === "NEW") {
                this.textBuffer = []; this.variables = {}; this.sprites = {}; this.rawBuffer = []; this.customMenus = {};
                this.setPadMode(false);
                this.resetTheme();
                this.printLine("MEMORY CLEARED. THEME RESET.");
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
                if (!Kernel.activeDir)