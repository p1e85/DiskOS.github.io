/**
 * ==============================================================
 * P1 CREATIONS - DISKOS V1.8 CODE PARSER
 * File: os_parser.js
 * ==============================================================
 */

const NOTE_MAP = {"C3":130.81,"C#3":138.59,"D3":146.83,"D#3":155.56,"E3":164.81,"F3":174.61,"F#3":185.00,"G3":196.00,"G#3":207.65,"A3":220.00,"A#3":233.08,"B3":246.94,"C4":261.63,"C#4":277.18,"D4":293.66,"D#4":311.13,"E4":329.63,"F4":349.23,"F#4":369.99,"G4":392.00,"G#4":415.30,"A4":440.00,"A#4":466.16,"B4":493.88,"C5":523.25,"C#5":554.37,"D5":587.33,"D#5":622.25,"E5":659.25,"F5":698.46,"F#5":739.99,"G5":783.99,"G#5":830.61,"A5":880.00,"A#5":932.33,"B5":987.77};

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
    
    // Execution State
    waitingForKey: false, targetVar: "", 
    waitingForTimer: false,             
    waitingForInput: false, inputBuffer: "",
    callStack: [], forLoops: {},
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
        "INPUT <var>      : PROMPT STRING",
        "VAR <name>=<val> : SET VARIABLE",
        "DIM <arr> <size> : CREATE ARRAY",
        "PEEK <idx>       : READ VRAM BG",
        "PEEK_CHAR <idx>  : READ ASCII",
        "POKE <idx> <val> : WRITE BG COLOR",
        "POKE_FG <i><val> : WRITE FG COLOR",
        "POKE_CHAR <i><c> : WRITE ASCII",
        "PLOT <x> <y> <c> : DRAW PIXEL",
        "DRAW_BOX <x><y><w><h><c>",
        "DEF_SPRITE <id> <w> <h> <c> <d>",
        "DRAW_SPRITE <id> <x> <y>",
        "SCROLL <DIR>     : PAN SCREEN",
        "IF <cond> THEN ... : LOGIC",
        "FOR <i>=<s> TO <e> / NEXT <i>",
        "GOSUB <line> / RETURN",
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
    
    resetTheme() {
        this.systemColor = '#FFB000';
        this.systemBgColor = '#000000';
        this.cursorColor = '#FFB000';
        this.fontFamily = 'monospace';
        this.fontWeight = 'bold';
        this.fontStyle = 'normal';
        this.textDecor = 'none';
        
        document.documentElement.style.setProperty('--bg-color', '#050505');
        document.documentElement.style.setProperty('--crt-border', '#1a1a1a');
        const scanlineObj = document.querySelector('.scanlines');
        if (scanlineObj) scanlineObj.style.display = 'block';
    },

    setPadMode(isActive) {
        const padContainer = document.getElementById('gamepad');
        document.body.classList.toggle('pad-active', isActive);
        if (padContainer) padContainer.style.display = isActive ? 'flex' : 'none';
    },

    init() {
        this.resetTheme();
        this.vram = Array.from({ length: this.cols * this.rows }, () => ({
            char: ' ', fg: this.systemColor, bg: this.systemBgColor
        }));
        this.cursorX = 0; this.cursorY = 0;
        this.setPadMode(false); 
        this.printLine("*** DiskOS V1.8 ***");
        this.printLine("1024K VIRTUAL DISK MOUNTED");
        this.printLine("READY.");
    },

    setKeyState(key, isDown) {
        if (key) this.keysDown[key.toUpperCase()] = isDown;
    },

    setTouchState(active, x, y) {
        this.touchActive = active;
        this.touchX = x;
        this.touchY = y;
    },

    getIndex(x, y) { return y * this.cols + x; },

    // ==========================================
    // 4. DISPLAY ENGINE
    // ==========================================
    
    printLine(text) {
        for (let i = 0; i < text.length; i++) {
            if (this.cursorX >= this.cols) {
                this.cursorX = 0; this.cursorY++;
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

    checkScroll() {
        if (this.cursorY < this.rows) return;
        
        const shiftAmt = this.cols;
        for (let i = 0; i < this.cols * (this.rows - 1); i++) {
            const below = this.vram[i + shiftAmt];
            this.vram[i].char = below.char;
            this.vram[i].fg = below.fg;
            this.vram[i].bg = below.bg; 
        }
        
        for (let i = this.cols * (this.rows - 1); i < this.cols * this.rows; i++) {
            this.vram[i].char = ' ';
            this.vram[i].bg = this.systemBgColor;
        }
        this.cursorY = this.rows - 1;
    },

    // ==========================================
    // 5. INPUT HANDLING & AUDIO
    // ==========================================
    
    handleKey(key) {
        if (key === "Escape") {
            if (this.isRunning) {
                this.isRunning = this.waitingForKey = this.waitingForTimer = this.waitingForInput = false;
                this.printLine("\nBREAK.\nREADY.");
            }
            if (this.isCapturingRaw) {
                this.isCapturingRaw = false;
                this.printLine("RAW MODE: ABORTED.\nREADY.");
            }
            return;
        }

        // Engine Code: INPUT String Request
        if (this.waitingForInput) {
            if (key === "Enter") {
                this.variables[this.targetVar] = this.inputBuffer;
                this.waitingForInput = false; this.inputBuffer = "";
                this.printLine(""); this.currentLineIndex++;
            } else if (key === "Backspace" && this.inputBuffer.length > 0) {
                this.inputBuffer = this.inputBuffer.slice(0, -1);
                if (this.cursorX > 0) {
                    this.cursorX--;
                    this.vram[this.getIndex(this.cursorX, this.cursorY)].char = ' ';
                }
            } else if (key.length === 1) {
                this.inputBuffer += key;
                let idx = this.getIndex(this.cursorX, this.cursorY);
                this.vram[idx].char = key.toUpperCase();
                this.vram[idx].fg = this.systemColor;
                this.cursorX++;
                if (this.cursorX >= this.cols) { this.cursorX = 0; this.cursorY++; this.checkScroll(); }
            }
            return;
        }
        
        // Engine Code: GET_KEY Capture
        if (this.waitingForKey) {
            this.variables[this.targetVar] = key.toUpperCase();
            this.waitingForKey = false;
            this.currentLineIndex++; 
            return;
        }
        
        if (this.isRunning) return;
        
        if (key === "Enter") {
            this.processCurrentLine(); 
            this.cursorX = 0; this.cursorY++; this.checkScroll();
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
                this.cursorX = 0; this.cursorY++; this.checkScroll();
            }
        }
    },

    playTone(freq, durationMs) {
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

    _generatePayload() {
        if (this.rawBuffer.length > 0) return this.rawBuffer.join('\n');
        return `TYPE: diskCODE\nCOMPATIBILITY: V1.8\n---\n` + this.textBuffer.map(t => `${t.line} ${t.code}`).join('\n');
    },
    
    processCurrentLine() {
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
                this.printLine(`RAW MODE: OFF (${this.rawBuffer.length} LINES TOTAL)\nREADY.`);
            }
            this.cursorY++; this.checkScroll(); return;
        }

        if (this.isCapturingRaw) {
            let chk = cmd.toUpperCase();
            if (["LIST", "RUN", "SAVE", "$FILE"].includes(chk)) this.printLine(`?EXIT RAW MODE (----) TO USE ${chk}`);
            else { this.rawBuffer.push(cmd); this.printLine(">"); }
            this.cursorY++; this.checkScroll(); return;
        }

        let parts = cmd.split(" ");
        let fwUpper = parts[0].toUpperCase();

        if (fwUpper.startsWith("$")) {
            this.cursorY++; this.checkScroll();
            let menu = fwUpper.substring(1); 
            let action = parts[1] ? parts[1].toUpperCase() : null;

            if (menu === "FILE") {
                if (action === "NEW") {
                    this.textBuffer = []; this.variables = {}; this.sprites = {}; this.rawBuffer = []; this.customMenus = {};
                    this.setPadMode(false); this.resetTheme();
                    this.printLine("MEMORY CLEARED. THEME RESET.");
                } else if (action === "SAVE" || action === "EXPORT") {
                    let filename = parts[2] ? parts[2].replace(/"/g, "") : "UNTITLED.diskCODE";
                    let payload = this._generatePayload();
                    if (action === "SAVE") {
                        Kernel.virtualSave(filename, payload); this.printLine(`SAVED ${filename} TO VIRTUAL DRIVE.`);
                    } else {
                        Kernel.physicalExport(filename, payload); this.printLine(`EXPORTING ${filename} TO DEVICE.`);
                    }
                } else {
                    this.printLine("--- FILE MENU ---\n  $FILE NEW\n  $FILE SAVE [FILENAME]\n  $FILE EXPORT [FILENAME]\n-----------------");
                }
            } 
            else if (menu === "EDIT") {
                if (action === "COPY") {
                    navigator.clipboard.writeText(this._generatePayload()).catch(()=>{});
                    this.printLine("MEMORY COPIED.");
                } else if (action === "PASTE") {
                    navigator.clipboard.readText().then(text => this.pasteFromClipboard(text)).catch(() => this.printLine("?CLIPBOARD ACCESS DENIED\nREADY."));
                    this.cursorY--; return; 
                } else {
                    this.printLine("--- EDIT MENU ---\n  $EDIT COPY\n  $EDIT PASTE\n-----------------");
                }
            }
            else if (this.customMenus[menu]) {
                if (action && this.customMenus[menu].includes(action)) {
                    this.variables["SYS_GUI_EVENT"] = `${menu}.${action}`;
                    this.printLine(`RUNNING ${action}...`);
                    this.runCode(); this.cursorY--; return;
                } else {
                    this.printLine(`--- ${menu} MENU ---`);
                    this.customMenus[menu].forEach(item => this.printLine(`  $${menu} ${item}`));
                    this.printLine("-----------------");
                }
            }
            else { this.printLine("?UNKNOWN GUI MENU\nTYPE $FILE OR $EDIT"); }
            
            this.printLine("READY."); this.cursorY--; return; 
        }

        if (!isNaN(parts[0])) {
            let lineNum = parseInt(parts[0]);
            let codeString = cmd.substring(parts[0].length).trim();
            let existingIndex = this.textBuffer.findIndex(item => item.line === lineNum);
            
            if (codeString === "") {
                if (existingIndex !== -1) this.textBuffer.splice(existingIndex, 1);
            } else {
                if (existingIndex !== -1) this.textBuffer[existingIndex].code = codeString; 
                else this.textBuffer.push({ line: lineNum, code: codeString }); 
            }
            this.textBuffer.sort((a, b) => a.line - b.line); 
            
        } else {
            this.cursorY++; this.checkScroll();

            if (fwUpper === "CLEAR_SCR") {
                this.vram.forEach(cell => { cell.char = ' '; cell.bg = this.systemBgColor; });
                this.cursorX = this.cursorY = 0; this.cursorY--; 
            } 
            else if (fwUpper === "HELP") {
                this.printLine(""); this.HELP_TEXT.forEach(line => this.printLine(line)); this.printLine(""); this.cursorY--;
            }
            else if (fwUpper === "LIST") {
                let isEmpty = true;
                if (this.textBuffer.length > 0) {
                    this.printLine("--- CODE MEMORY ---");
                    this.textBuffer.forEach(t => this.printLine(`${t.line} ${t.code}`));
                    isEmpty = false;
                }
                if (this.rawBuffer.length > 0) {
                    this.printLine("--- RAW DATA MEMORY ---");
                    this.rawBuffer.forEach(r => this.printLine(r));
                    isEmpty = false;
                }
                if (isEmpty) this.printLine("MEMORY IS EMPTY.");
                this.printLine("READY."); this.cursorY--;
            } 
            else if (fwUpper === "NEW") {
                this.textBuffer = []; this.variables = {}; this.sprites = {}; this.rawBuffer = []; this.customMenus = {};
                this.setPadMode(false); this.resetTheme();
                this.printLine("MEMORY CLEARED. THEME RESET.\nREADY."); this.cursorY--;
            }
            else if (fwUpper === "SAVE" || fwUpper === "EXPORT") {
                let filename = cmd.substring(fwUpper === "SAVE" ? 4 : 6).trim().replace(/"/g, "") || "UNTITLED.diskCODE";
                let payload = this._generatePayload();
                if (fwUpper === "SAVE") {
                    Kernel.virtualSave(filename, payload); this.printLine("SAVED TO VIRTUAL DRIVE.\nREADY.");
                } else {
                    Kernel.physicalExport(filename, payload); this.printLine("DOWNLOADING TO DEVICE...\nREADY.");
                }
                if(this.rawBuffer.length > 0) this.rawBuffer = [];
                this.cursorY--;
            }
            else if (fwUpper === "LOAD") {
                let filename = cmd.substring(4).trim().replace(/"/g, "");
                let content = Kernel.virtualLoad(filename);
                if (content) this.processFileContent(content, filename);
                else this.printLine("?FILE NOT FOUND ON VIRTUAL DRIVE");
                this.cursorY--;
            }
            else if (fwUpper === "IMPORT") {
                this.printLine("WAITING FOR UPLOAD..."); Kernel.triggerImport(); this.cursorY--;
            }
            else if (fwUpper === "MOUNT") {
                let dirname = cmd.substring(5).trim().replace(/"/g, "") || "MASTER.diskDIR";
                let files = Kernel.mountDir(dirname);
                this.printLine(`MOUNTED: ${dirname}`);
                
                this.variables["SYS_FILE_COUNT"] = files.length;
                this.variables["SYS_FILES"] = files;
                
                if (files.includes("MAIN.diskCODE")) {
                    this.printLine("AUTO-BOOTING MAIN.diskCODE...");
                    let mainContent = Kernel.virtualLoad("MAIN.diskCODE");
                    if (mainContent) {
                        this.processFileContent(mainContent, "MAIN.diskCODE");
                        this.runCode();
                    }
                } else { this.printLine("READY."); }
                this.cursorY--;
            }
            else if (fwUpper === "DIR") {
                if (!Kernel.activeDir) { this.printLine("?NO DIRECTORY MOUNTED"); } 
                else {
                    let files = Kernel.mountDir(Kernel.activeDir);
                    this.printLine(`DIR: ${Kernel.activeDir}`);
                    files.forEach(f => this.printLine(`  ${f}`));
                    this.variables["SYS_FILE_COUNT"] = files.length;
                    this.variables["SYS_FILES"] = files;
                }
                this.printLine("READY."); this.cursorY--;
            }
            else if (fwUpper === "LOAD_LIB") {
                let filename = parts[1];
                let libContent = Kernel.virtualLoad(filename);
                if (libContent) {
                    this.printLine(`STACKING ${filename}...`);
                    let isPayload = false;
                    libContent.split('\n').forEach(line => {
                        line = line.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
                        if (line === "---") { isPayload = true; return; }
                        if (isPayload && line !== "") {
                            let p = line.split(" ");
                            let lNum = parseInt(p[0]);
                            if (!isNaN(lNum)) this.textBuffer.push({ line: lNum, code: line.substring(p[0].length).trim() });
                        }
                    });
                    this.textBuffer.sort((a, b) => a.line - b.line);
                    this.printLine("STACK SUCCESSFUL.");
                } else { this.printLine("?FILE NOT FOUND"); }
                this.cursorY--;
            }
            else if (fwUpper === "COPY") {
                navigator.clipboard.writeText(this._generatePayload()).catch(()=>{});
                this.printLine("ALL CODE COPIED.\nREADY."); this.cursorY--;
            }
            else if (fwUpper === "RUN") {
                this.runCode(); this.cursorY--;
            }
            else { this.printLine("?SYNTAX ERROR"); this.cursorY--; }
        }
    },

    // ==========================================
    // 7. PROGRAM EXECUTION PREP
    // ==========================================
    
    runCode() {
        if (this.textBuffer.length > 0) {
            try {
                if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                if (this.audioCtx?.state === 'suspended') this.audioCtx.resume();
            } catch (e) { console.warn("Audio disabled."); }

            this.isRunning = true;
            this.currentLineIndex = 0;
            
            // Preserve System Vars
            let preservedCount = this.variables["SYS_FILE_COUNT"];
            let preservedFiles = this.variables["SYS_FILES"];
            let preservedEvent = this.variables["SYS_GUI_EVENT"]; 
            
            this.variables = {}; 
            if (preservedCount !== undefined) {
                this.variables["SYS_FILE_COUNT"] = preservedCount;
                this.variables["SYS_FILES"] = preservedFiles;
            }
            if (preservedEvent !== undefined) this.variables["SYS_GUI_EVENT"] = preservedEvent;
            
            this.sprites = {}; 
            this.waitingForTimer = false;
            this.waitingForInput = false;
            this.callStack = [];
            this.forLoops = {};
            this.keysDown = {}; 
            this.touchActive = 0;
        } 
        else if (this.rawBuffer.length > 0) {
            let fileType = this.rawFileType;
            if (fileType === "RAW") {
                for (let line of this.rawBuffer) {
                    let chk = line.toUpperCase();
                    if (["DEF_MENU", "PAGE_BG", "TEXT_COLOR", "FONT_FAMILY", "CURSOR_COLOR"].some(k => chk.includes(k))) { fileType = "DISKGUI"; break; }
                    if (["DPAD:", "BTN:"].some(k => chk.includes(k))) { fileType = "DISKPAD"; break; }
                }
            }

            if (fileType === "DISKGUI") {
                this.customMenus = {};
                let currentMenu = null;
                let itemsAdded = 0, stylesApplied = 0;

                this.rawBuffer.forEach(line => {
                    line = line.trim();
                    let upper = line.toUpperCase();
                    
                    if (upper.startsWith("PAGE_BG ")) { document.documentElement.style.setProperty('--bg-color', line.substring(8).trim()); stylesApplied++; }
                    else if (upper.startsWith("BORDER_COLOR ")) { document.documentElement.style.setProperty('--crt-border', line.substring(13).trim()); stylesApplied++; }
                    else if (upper.startsWith("TEXT_COLOR ")) {
                        let newColor = this.resolveColor(line.substring(11).trim());
                        this.vram.forEach(c => { if(c.fg === this.systemColor) c.fg = newColor; });
                        this.systemColor = newColor; stylesApplied++;
                    }
                    else if (upper.startsWith("SCREEN_COLOR ")) {
                        let newBg = this.resolveColor(line.substring(13).trim());
                        this.vram.forEach(c => { if(c.bg === this.systemBgColor) c.bg = newBg; });
                        this.systemBgColor = newBg; stylesApplied++;
                    }
                    else if (upper.startsWith("CURSOR_COLOR ")) { this.cursorColor = this.resolveColor(line.substring(13).trim()); stylesApplied++; }
                    else if (upper.startsWith("FONT_FAMILY ")) { this.fontFamily = line.substring(12).trim(); stylesApplied++; }
                    else if (upper.startsWith("FONT_WEIGHT ")) { this.fontWeight = line.substring(12).trim().toLowerCase(); stylesApplied++; }
                    else if (upper.startsWith("FONT_STYLE ")) { this.fontStyle = line.substring(11).trim().toLowerCase(); stylesApplied++; }
                    else if (upper.startsWith("TEXT_DECOR ")) { this.textDecor = line.substring(11).trim().toUpperCase(); stylesApplied++; }
                    else if (upper.startsWith("CRT_SCANLINES ")) {
                        let scanlineObj = document.querySelector('.scanlines');
                        if (scanlineObj) scanlineObj.style.display = upper.includes("OFF") ? 'none' : 'block';
                        stylesApplied++;
                    }
                    else if (upper.startsWith("DEF_MENU ")) {
                        currentMenu = line.substring(9).replace("$", "").trim().toUpperCase();
                        this.customMenus[currentMenu] = [];
                    } 
                    else if (upper.startsWith("DEF_ITEM ") && currentMenu) {
                        this.customMenus[currentMenu].push(line.substring(9).trim().toUpperCase());
                        itemsAdded++;
                    }
                });
                this.printLine(`GUI COMPILED: ${itemsAdded} MENUS, ${stylesApplied} STYLES.\nREADY.`);
            } 
            else if (fileType === "DISKPAD") {
                const padLeft = document.getElementById('pad-left');
                const padRight = document.getElementById('pad-right');
                if (padLeft && padRight) {
                    padLeft.innerHTML = padRight.innerHTML = '';
                    let itemsAdded = 0;

                    this.rawBuffer.forEach(line => {
                        let upper = line.trim().toUpperCase();
                        if (upper.startsWith("DPAD: HORIZONTAL")) {
                            padLeft.innerHTML += `<div class="btn btn-dpad" onmousedown="Parser.setKeyState('ArrowLeft', true)" onmouseup="Parser.setKeyState('ArrowLeft', false)" ontouchstart="Parser.setKeyState('ArrowLeft', true)" ontouchend="Parser.setKeyState('ArrowLeft', false)">◀</div>`;
                            padLeft.innerHTML += `<div class="btn btn-dpad" onmousedown="Parser.setKeyState('ArrowRight', true)" onmouseup="Parser.setKeyState('ArrowRight', false)" ontouchstart="Parser.setKeyState('ArrowRight', true)" ontouchend="Parser.setKeyState('ArrowRight', false)">▶</div>`;
                            itemsAdded++;
                        } 
                        else if (upper.startsWith("BTN: ")) {
                            let parts = line.trim().split(" ");
                            let label = parts[1] || "A";
                            let mappedKey = parts[2] || "SPACE";
                            let sizeClass = (parts[3]?.toUpperCase() === "SMALL") ? "btn-small" : "btn-action";
                            if (mappedKey.toUpperCase() === "SPACE") mappedKey = " ";
                            
                            padRight.innerHTML += `<div class="btn ${sizeClass}" onmousedown="Parser.setKeyState('${mappedKey}', true)" onmouseup="Parser.setKeyState('${mappedKey}', false)" ontouchstart="Parser.setKeyState('${mappedKey}', true)" ontouchend="Parser.setKeyState('${mappedKey}', false)">${label}</div>`;
                            itemsAdded++;
                        }
                    });
                    this.setPadMode(true);
                    this.printLine(`PAD COMPILED: ${itemsAdded} ELEMENTS.`);
                }
                this.printLine("READY.");
            } else { this.printLine("?CANNOT RUN RAW TEXT\nREADY."); }
        } 
        else { this.printLine("MEMORY IS EMPTY.\nREADY."); }
    },

    // ==========================================
    // 8. FILE COMPILER (.diskCODE, .diskGUI, .diskPAD)
    // ==========================================
    
    processFileContent(fileContent, filename) {
        this.printLine(`LOADING ${filename}...`);
        let lines = fileContent.split('\n');
        let ext = filename.split('.').pop().toUpperCase();
        
        if (ext === "DISKGUI" || ext === "DISKPAD") {
            this.rawFileType = ext; 
            this.textBuffer = []; this.rawBuffer = [];
            lines.forEach(line => {
                line = line.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
                if (line) this.rawBuffer.push(line);
            });
            this.printLine(`LOADED ${this.rawBuffer.length} RAW LINES.\nREADY.`);
            return; 
        }

        let isPayload = false;
        this.rawFileType = "RAW";
        this.rawBuffer = []; this.textBuffer = []; 
        
        lines.forEach(line => {
            line = line.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
            if (line === "---") { isPayload = true; return; }
            if (isPayload && line !== "") {
                let parts = line.split(" ");
                let lineNum = parseInt(parts[0]);
                if (!isNaN(lineNum)) this.textBuffer.push({ line: lineNum, code: line.substring(parts[0].length).trim() });
            }
        });
        this.textBuffer.sort((a, b) => a.line - b.line);
        this.printLine(`LOADED ${this.textBuffer.length} LINES.\nREADY.`);
    },

    // ==========================================
    // 9. DATA INGESTION
    // ==========================================
    
    pasteFromClipboard(text) {
        this.printLine("PASTING...");
        let lines = text.replace(/[\u200B-\u200D\uFEFF]/g, '').split('\n');
        let linesAdded = 0;

        if (this.isCapturingRaw) {
            lines.forEach(line => {
                line = line.trim();
                if (line) {
                    this.rawBuffer.push(line);
                    this.printLine("> " + line.substring(0, this.cols - 3));
                    linesAdded++;
                }
            });
            this.printLine(`PASTED ${linesAdded} LINES TO RAW BUFFER.\nREADY.`);
        } 
        else {
            lines.forEach(line => {
                line = line.trim();
                if (line) {
                    let parts = line.split(" ");
                    let lineNum = parseInt(parts[0]);
                    if (!isNaN(lineNum)) {
                        let codeString = line.substring(parts[0].length).trim();
                        let existing = this.textBuffer.find(item => item.line === lineNum);
                        if (existing) existing.code = codeString;
                        else this.textBuffer.push({ line: lineNum, code: codeString });
                        linesAdded++;
                    }
                }
            });
            this.textBuffer.sort((a, b) => a.line - b.line);
            this.printLine(`PASTED ${linesAdded} LINES TO MEMORY.\nREADY.`);
        }
    },

    // ==========================================
    // 10. SYSTEM MATH & LOGIC
    // ==========================================
    
    resolveColor(c) {
        const colors = { 
            RED: "#FF0000", BLUE: "#5C5CFF", AMBER: "#FFB000", 
            GREEN: "#00FF00", BLACK: "#000000", WHITE: "#FFFFFF", 
            YELLOW: "#FFFF00", PURPLE: "#FF00FF", CYAN: "#00FFFF" 
        };
        return !c ? this.systemColor : (colors[c.toUpperCase()] || c); 
    },

    evaluateExpression(expr) {
        let safeExpr = expr;
        
        for (const [key, value] of Object.entries(this.variables)) {
            let regex = new RegExp(`\\b${key}\\b`, 'g');
            let safeValue = (typeof value === 'string') ? `"${value}"` : (Array.isArray(value) ? JSON.stringify(value) : value);
            safeExpr = safeExpr.replace(regex, safeValue);
        }

        safeExpr = safeExpr.replace(/\bRND\((.*?)\)/g, "Math.floor(Math.random() * ($1))");
        safeExpr = safeExpr.replace(/\bTOUCH_ACTIVE\b/g, this.touchActive);
        safeExpr = safeExpr.replace(/\bTOUCH_X\b/g, this.touchX);
        safeExpr = safeExpr.replace(/\bTOUCH_Y\b/g, this.touchY);

        safeExpr = safeExpr.replace(/\bBTN_([A-Z0-9_]+)\b/g, (match, p1) => {
            const mapped = { "SPACE": " ", "UP": "ARROWUP", "DOWN": "ARROWDOWN", "LEFT": "ARROWLEFT", "RIGHT": "ARROWRIGHT" };
            return this.keysDown[mapped[p1] || p1] ? "1" : "0";
        });

        safeExpr = safeExpr.replace(/\bAND\b/g, "&&").replace(/\bOR\b/g, "||");

        try { return new Function('return ' + safeExpr)(); } 
        catch (e) { return expr; }
    },

    // ==========================================
    // 11. THE RUNTIME ENGINE (The Core)
    // ==========================================
    
    executeStep() {
        if (!this.isRunning || this.waitingForKey || this.waitingForTimer || this.waitingForInput) return;

        if (this.currentLineIndex >= this.textBuffer.length) {
            this.isRunning = false;
            this.printLine("READY."); return;
        }

        let currentLine = this.textBuffer[this.currentLineIndex];
        let code = currentLine.code.trim();
        let parts = code.split(" ");
        let cmd = parts[0].toUpperCase();

        if (code.includes("GET_KEY")) {
            let p = code.split("=");
            if (p.length === 2) {
                this.targetVar = p[0].trim();
                this.waitingForKey = true; return;
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
        else if (cmd === "INPUT") {
            this.targetVar = parts[1];
            this.inputBuffer = "";
            this.waitingForInput = true;
            return;
        }
        else if (cmd === "DIM") {
            this.variables[parts[1]] = new Array(parseInt(this.evaluateExpression(parts[2]))).fill(0);
            this.currentLineIndex++;
        }
        else if (cmd === "VAR") {
            let expr = code.substring(4).trim();
            let splitIndex = expr.indexOf("=");
            if (splitIndex !== -1) {
                let leftSide = expr.substring(0, splitIndex).trim();
                let val = this.evaluateExpression(expr.substring(splitIndex + 1).trim());
                
                if (leftSide.includes("[")) {
                    let arrName = leftSide.substring(0, leftSide.indexOf("["));
                    let idx = parseInt(this.evaluateExpression(leftSide.substring(leftSide.indexOf("[") + 1, leftSide.indexOf("]"))));
                    if (Array.isArray(this.variables[arrName])) this.variables[arrName][idx] = val;
                } else {
                    this.variables[leftSide] = val;
                }
                this.currentLineIndex++;
            } else {
                this.printLine(`?SYNTAX ERROR IN ${currentLine.line}`);
                this.isRunning = false;
                this.printLine("READY.");
            }
        }
        else if (cmd === "FOR") {
            let eqIdx = code.indexOf("=");
            let toIdx = code.indexOf(" TO ");
            if (eqIdx !== -1 && toIdx !== -1) {
                let varName = code.substring(4, eqIdx).trim();
                let startVal = parseInt(this.evaluateExpression(code.substring(eqIdx + 1, toIdx).trim()));
                let endVal = parseInt(this.evaluateExpression(code.substring(toIdx + 4).trim()));
                this.variables[varName] = startVal;
                this.forLoops[varName] = { end: endVal, stepIdx: this.currentLineIndex };
                this.currentLineIndex++;
            } else {
                this.printLine(`?SYNTAX ERROR IN ${currentLine.line}\nREADY.`);
                this.isRunning = false;
            }
        }
        else if (cmd === "NEXT") {
            let varName = parts[1];
            let loop = this.forLoops[varName];
            if (loop) {
                this.variables[varName]++;
                if (this.variables[varName] <= loop.end) {
                    this.currentLineIndex = loop.stepIdx + 1;
                    return;
                } else {
                    delete this.forLoops[varName];
                }
            }
            this.currentLineIndex++;
        }
        else if (cmd === "POKE" || cmd === "POKE_FG") {
            let idx = parseInt(this.evaluateExpression(parts[1]));
            let val = parseInt(this.evaluateExpression(parts[2]));
            if (idx >= 0 && idx < this.vram.length) {
                if(cmd === "POKE") this.vram[idx].bg = this.resolveColor(val.toString());
                else this.vram[idx].fg = this.resolveColor(val.toString());
            }
            this.currentLineIndex++;
        }
        else if (cmd === "POKE_CHAR") {
            let idx = parseInt(this.evaluateExpression(parts[1]));
            let charStr = parts[2].replace(/"/g, ""); 
            if (idx >= 0 && idx < this.vram.length) this.vram[idx].char = charStr.substring(0, 1);
            this.currentLineIndex++;
        }
        else if (cmd === "PEEK") {
            let idx = parseInt(this.evaluateExpression(parts[1]));
            this.variables["PEEK_VAL"] = this.vram[idx] ? this.vram[idx].bg : 0;
            this.currentLineIndex++;
        }
        else if (cmd === "PEEK_CHAR") {
            let idx = parseInt(this.evaluateExpression(parts[1]));
            this.variables["PEEK_C"] = this.vram[idx] ? this.vram[idx].char : ' ';
            this.currentLineIndex++;
        }
        else if (cmd === "SCROLL") {
            let dir = parts[1].toUpperCase();
            if (dir === "UP") {
                for (let i = 0; i < this.cols * (this.rows - 1); i++) this.vram[i] = { ...this.vram[i + this.cols] };
                for (let i = this.cols * (this.rows - 1); i < this.cols * this.rows; i++) this.vram[i] = { char: ' ', fg: this.systemColor, bg: this.systemBgColor };
            } else if (dir === "DOWN") {
                for (let i = this.cols * this.rows - 1; i >= this.cols; i--) this.vram[i] = { ...this.vram[i - this.cols] };
                for (let i = 0; i < this.cols; i++) this.vram[i] = { char: ' ', fg: this.systemColor, bg: this.systemBgColor };
            } else if (dir === "LEFT") {
                for (let y = 0; y < this.rows; y++) {
                    for (let x = 0; x < this.cols - 1; x++) this.vram[y * this.cols + x] = { ...this.vram[y * this.cols + x + 1] };
                    this.vram[y * this.cols + this.cols - 1] = { char: ' ', fg: this.systemColor, bg: this.systemBgColor };
                }
            } else if (dir === "RIGHT") {
                for (let y = 0; y < this.rows; y++) {
                    for (let x = this.cols - 1; x > 0; x--) this.vram[y * this.cols + x] = { ...this.vram[y * this.cols + x - 1] };
                    this.vram[y * this.cols] = { char: ' ', fg: this.systemColor, bg: this.systemBgColor };
                }
            }
            this.currentLineIndex++;
        }
        else if (cmd === "WAIT") {
            let delay = parseInt(this.evaluateExpression(parts[1])) || 100;
            this.waitingForTimer = true;
            setTimeout(() => { this.waitingForTimer = false; this.currentLineIndex++; }, delay);
        }
        else if (cmd === "BEEP") {
            let freq = parseFloat(this.evaluateExpression(parts[1]));
            if (!isNaN(freq)) this.playTone(freq, parseInt(this.evaluateExpression(parts[2])) || 100);
            this.currentLineIndex++;
        }
        else if (cmd === "PLAY") {
            let freq = NOTE_MAP[parts[1].toUpperCase()];
            if (freq) this.playTone(freq, parseInt(this.evaluateExpression(parts[2])) || 100);
            this.currentLineIndex++;
        }
        else if (cmd === "PLOT") {
            let x = parseInt(this.evaluateExpression(parts[1]));
            let y = parseInt(this.evaluateExpression(parts[2]));
            if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
                let idx = this.getIndex(x, y);
                this.vram[idx].bg = this.resolveColor(parts[3]);
                this.vram[idx].char = ' '; 
            }
            this.currentLineIndex++;
        }
        else if (cmd === "DRAW_BOX") {
            let sx = parseInt(this.evaluateExpression(parts[1]));
            let sy = parseInt(this.evaluateExpression(parts[2]));
            let w = parseInt(this.evaluateExpression(parts[3]));
            let h = parseInt(this.evaluateExpression(parts[4]));
            let color = this.resolveColor(parts[5]);
            for (let y = sy; y < sy + h; y++) {
                for (let x = sx; x < sx + w; x++) {
                    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
                        let idx = this.getIndex(x, y);
                        this.vram[idx].bg = color; this.vram[idx].char = ' ';
                    }
                }
            }
            this.currentLineIndex++;
        }
        else if (cmd === "DEF_SPRITE") {
            this.sprites[parts[1]] = {
                w: parseInt(this.evaluateExpression(parts[2])),
                h: parseInt(this.evaluateExpression(parts[3])),
                color: this.resolveColor(parts[4]),
                data: parts[5]
            };
            this.currentLineIndex++;
        }
        else if (cmd === "DRAW_SPRITE") {
            let sprite = this.sprites[parts[1]];
            let sx = parseInt(this.evaluateExpression(parts[2]));
            let sy = parseInt(this.evaluateExpression(parts[3]));
            
            if (sprite && sprite.data) {
                let i = 0;
                for (let y = 0; y < sprite.h; y++) {
                    for (let x = 0; x < sprite.w; x++) {
                        if (i < sprite.data.length && sprite.data.charAt(i) === '1') {
                            let px = sx + x, py = sy + y;
                            if (px >= 0 && px < this.cols && py >= 0 && py < this.rows) {
                                let idx = this.getIndex(px, py);
                                this.vram[idx].bg = sprite.color; this.vram[idx].char = ' ';
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
            let cb = code.substring(2).split("THEN");
            if (cb.length === 2 && this.evaluateExpression(cb[0].trim())) {
                let action = cb[1].trim();
                let aCmd = action.split(" ")[0].toUpperCase();

                if (aCmd === "GOTO") {
                    let targetLine = parseInt(action.split(" ")[1]);
                    let targetIndex = this.textBuffer.findIndex(i => i.line === targetLine);
                    if (targetIndex !== -1) { this.currentLineIndex = targetIndex; return; } 
                    else {
                        this.printLine("?LINE NOT FOUND ERROR\nREADY.");
                        this.isRunning = false; return;
                    }
                } 
                else if (aCmd === "GOSUB") {
                    let targetLine = parseInt(action.split(" ")[1]);
                    let targetIndex = this.textBuffer.findIndex(i => i.line === targetLine);
                    if (targetIndex !== -1) { 
                        this.callStack.push(this.currentLineIndex + 1);
                        this.currentLineIndex = targetIndex; 
                        return; 
                    } 
                    else {
                        this.printLine("?LINE NOT FOUND ERROR\nREADY.");
                        this.isRunning = false; return;
                    }
                }
                else if (aCmd === "END") {
                    this.printLine("READY."); this.isRunning = false; return;
                }
                else if (aCmd === "VAR") {
                    let expr = action.substring(4).trim();
                    let splitIndex = expr.indexOf("=");
                    if (splitIndex !== -1) {
                        let leftSide = expr.substring(0, splitIndex).trim();
                        let val = this.evaluateExpression(expr.substring(splitIndex + 1).trim());
                        
                        if (leftSide.includes("[")) {
                            let arrName = leftSide.substring(0, leftSide.indexOf("["));
                            let idx = parseInt(this.evaluateExpression(leftSide.substring(leftSide.indexOf("[") + 1, leftSide.indexOf("]"))));
                            if (Array.isArray(this.variables[arrName])) this.variables[arrName][idx] = val;
                        } else {
                            this.variables[leftSide] = val;
                        }
                    } else {
                        this.printLine(`?SYNTAX ERROR IN ${currentLine.line}\nREADY.`);
                        this.isRunning = false; return;
                    }
                }
            }
            this.currentLineIndex++;
        }
        else if (cmd === "GOSUB") {
            let targetIndex = this.textBuffer.findIndex(item => item.line === parseInt(parts[1]));
            if (targetIndex !== -1) {
                this.callStack.push(this.currentLineIndex + 1);
                this.currentLineIndex = targetIndex; 
            } else { this.printLine("?LINE NOT FOUND ERROR\nREADY."); this.isRunning = false; }
        }
        else if (cmd === "RETURN") {
            if (this.callStack.length > 0) {
                this.currentLineIndex = this.callStack.pop();
            } else {
                this.printLine("?RETURN WITHOUT GOSUB\nREADY."); this.isRunning = false;
            }
        }
        else if (cmd === "GOTO") {
            let targetIndex = this.textBuffer.findIndex(item => item.line === parseInt(parts[1]));
            if (targetIndex !== -1) this.currentLineIndex = targetIndex; 
            else { this.printLine("?LINE NOT FOUND ERROR\nREADY."); this.isRunning = false; }
        }
        else if (cmd === "END") {
            this.isRunning = false; this.printLine("READY.");
        }
        else if (cmd === "CLEAR_SCR") {
            this.vram.forEach(cell => { cell.char = ' '; cell.bg = this.systemBgColor; });
            this.cursorX = this.cursorY = 0; this.currentLineIndex++;
        }
        else {
            this.printLine(`?SYNTAX ERROR IN ${currentLine.line}\nREADY.`);
            this.isRunning = false;
        }
    }
};

Parser.init();