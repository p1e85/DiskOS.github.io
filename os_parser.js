const Parser = {
    cols: 64,
    rows: 32,
    cursorX: 0,
    cursorY: 0,
    vram: [], 
    textBuffer: [], 
    
    isRunning: false,
    currentLineIndex: 0,
    variables: {}, 
    sprites: {},          
    waitingForKey: false, 
    targetVar: "",        
    waitingForTimer: false, 
    keysDown: {}, 

    touchActive: 0,
    touchX: 0,
    touchY: 0,

    audioCtx: null,

    HELP_TEXT: [
        "--- DISKOS V1.0 COMMANDS ---",
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
        "--- SYSTEM ---",
        "HELP             : THIS MENU",
        "LOAD_LIB <file>  : STACK CODE",
        "RUN / LIST / NEW / SAVE"
    ],

    init: function() {
        for (let i = 0; i < this.cols * this.rows; i++) {
            this.vram[i] = { char: ' ', fg: '#FFB000', bg: '#000000' };
        }
        this.cursorX = 0;
        this.cursorY = 0;
        this.printLine("*** DiskOS V1.0 ***");
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
            for (let x = 0; x < this.cols; x++) {
                let bottomIdx = this.getIndex(x, this.rows - 1);
                this.vram[bottomIdx].char = ' ';
                this.vram[bottomIdx].bg = '#000000';
            }
            this.cursorY = this.rows - 1;
        }
    },

    handleKey: function(key) {
        if (key === "Escape") {
            if (this.isRunning) {
                this.isRunning = false;
                this.waitingForKey = false;
                this.waitingForTimer = false;
                this.printLine("BREAK.");
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
                this.vram[idx].bg = '#000000'; 
            }
            return;
        }
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

    processCurrentLine: function() {
        let rowString = "";
        for (let x = 0; x < this.cols; x++) {
            rowString += this.vram[this.getIndex(x, this.cursorY)].char;
        }
        
        let cmd = rowString.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
        if (cmd === "") return;

        let parts = cmd.split(" ");
        let firstWord = parts[0];

        if (!isNaN(firstWord)) {
            let lineNum = parseInt(firstWord);
            let codeString = cmd.substring(firstWord.length).trim();
            let existingIndex = this.textBuffer.findIndex(item => item.line === lineNum);
            
            if (codeString === "") {
                if (existingIndex !== -1) this.textBuffer.splice(existingIndex, 1);
            } else {
                if (existingIndex !== -1) {
                    this.textBuffer[existingIndex].code = codeString; 
                } else {
                    this.textBuffer.push({ line: lineNum, code: codeString }); 
                }
            }
            this.textBuffer.sort((a, b) => a.line - b.line); 
            
        } else {
            this.cursorY++;
            this.checkScroll();

            if (firstWord === "CLEAR_SCR") {
                this.init(); 
                this.cursorY--; 
            } 
            else if (firstWord === "HELP") {
                this.printLine("");
                for (let line of this.HELP_TEXT) {
                    this.printLine(line);
                }
                this.printLine("");
                this.cursorY--;
            }
            else if (firstWord === "LOAD_LIB") {
                let filename = parts[1];
                let libContent = Kernel.loadFromDisk(filename);
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
                            if (!isNaN(lNum)) {
                                this.textBuffer.push({ line: lNum, code: line.substring(p[0].length).trim() });
                            }
                        }
                    }
                    this.textBuffer.sort((a, b) => a.line - b.line);
                    this.printLine("STACK SUCCESSFUL.");
                } else {
                    this.printLine("?FILE NOT FOUND");
                }
                this.cursorY--;
            }
            else if (firstWord === "LIST") {
                if (this.textBuffer.length === 0) {
                    this.printLine("MEMORY IS EMPTY.");
                } else {
                    for (let i = 0; i < this.textBuffer.length; i++) {
                        this.printLine(this.textBuffer[i].line + " " + this.textBuffer[i].code);
                    }
                }
                this.printLine("READY.");
                this.cursorY--;
            } 
            else if (firstWord === "NEW") {
                this.textBuffer = []; 
                this.variables = {}; 
                this.sprites = {}; 
                this.printLine("MEMORY CLEARED.");
                this.printLine("READY.");
                this.cursorY--;
            }
            else if (firstWord === "SAVE") {
                let filename = cmd.substring(4).trim().replace(/"/g, "");
                if (filename === "") filename = "UNTITLED.diskCODE";
                
                let payload = "TYPE: diskCODE\nCOMPATIBILITY: V1.0\n---\n";
                for (let i = 0; i < this.textBuffer.length; i++) {
                    payload += this.textBuffer[i].line + " " + this.textBuffer[i].code + "\n";
                }
                
                Kernel.saveToDevice(filename, payload);
                this.printLine("SAVING TO DEVICE...");
                this.printLine("READY.");
                this.cursorY--;
            }
            else if (firstWord === "LOAD") {
                this.printLine("WAITING FOR DEVICE...");
                Kernel.triggerLoad();
                this.cursorY--;
            }
            else if (firstWord === "COPY") {
                if (parts.length > 1) {
                    let targetLine = parseInt(parts[1]);
                    let targetIndex = this.textBuffer.findIndex(item => item.line === targetLine);
                    if (targetIndex !== -1) {
                        let codeToCopy = this.textBuffer[targetIndex].line + " " + this.textBuffer[targetIndex].code;
                        navigator.clipboard.writeText(codeToCopy).catch(e => {}); 
                        this.printLine("LINE " + targetLine + " COPIED.");
                    } else {
                        this.printLine("?LINE NOT FOUND");
                    }
                } else {
                    if (this.textBuffer.length > 0) {
                        let allCode = "";
                        for (let i = 0; i < this.textBuffer.length; i++) {
                            allCode += this.textBuffer[i].line + " " + this.textBuffer[i].code + "\n";
                        }
                        navigator.clipboard.writeText(allCode).catch(e => {});
                        this.printLine("ALL CODE COPIED.");
                    } else {
                        this.printLine("MEMORY IS EMPTY.");
                    }
                }
                this.printLine("READY.");
                this.cursorY--;
            }
            else if (firstWord === "RUN") {
                if (this.textBuffer.length > 0) {
                    try {
                        if (!this.audioCtx) {
                            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                        }
                        if (this.audioCtx && this.audioCtx.state === 'suspended') {
                            this.audioCtx.resume();
                        }
                    } catch (e) {
                        console.warn("Audio hardware disabled or unsupported.");
                    }

                    this.isRunning = true;
                    this.currentLineIndex = 0;
                    this.variables = {}; 
                    this.sprites = {}; 
                    this.waitingForTimer = false;
                    this.keysDown = {}; 
                    this.touchActive = 0;
                    this.cursorY--; 
                } else {
                    this.printLine("MEMORY IS EMPTY.");
                    this.printLine("READY.");
                    this.cursorY--;
                }
            }
            else {
                this.printLine("?SYNTAX ERROR");
                this.cursorY--;
            }
        }
    },

    pasteFromClipboard: function(text) {
        this.printLine("PASTING...");
        
        text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
        let lines = text.split('\n');
        let linesAdded = 0;
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line === "") continue;
            let parts = line.split(" ");
            let lineNum = parseInt(parts[0]);
            
            if (!isNaN(lineNum)) {
                let codeString = line.substring(parts[0].length).trim();
                let existingIndex = this.textBuffer.findIndex(item => item.line === lineNum);
                if (existingIndex !== -1) {
                    this.textBuffer[existingIndex].code = codeString;
                } else {
                    this.textBuffer.push({ line: lineNum, code: codeString });
                }
                linesAdded++;
            }
        }
        
        this.textBuffer.sort((a, b) => a.line - b.line);
        this.printLine("PASTED " + linesAdded + " LINES.");
        this.printLine("READY.");
    },

    loadFromDisk: function(fileContent, filename) {
        this.printLine("LOADING " + filename + "...");
        let lines = fileContent.split('\n');
        let isPayload = false;
        this.textBuffer = []; 
        this.variables = {}; 
        this.sprites = {}; 
        let linesAdded = 0;
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
            if (line === "---") {
                isPayload = true;
                continue;
            }
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

    resolveColor: function(c) {
        const colors = { 
            RED: "#FF0000", BLUE: "#5C5CFF", AMBER: "#FFB000", 
            GREEN: "#00FF00", BLACK: "#000000", WHITE: "#FFFFFF", 
            YELLOW: "#FFFF00", PURPLE: "#FF00FF", CYAN: "#00FFFF" 
        };
        if (!c) return "#FFB000";
        c = c.toUpperCase();
        return colors[c] || c; 
    },

    evaluateExpression: function(expr) {
        let safeExpr = expr;
        
        for (const [key, value] of Object.entries(this.variables)) {
            let regex = new RegExp('\\b' + key + '\\b', 'g');
            let safeValue;
            if (typeof value === 'string') safeValue = '"' + value + '"';
            else if (Array.isArray(value)) safeValue = JSON.stringify(value); 
            else safeValue = value;
            safeExpr = safeExpr.replace(regex, safeValue);
        }

        safeExpr = safeExpr.replace(/\bRND\((.*?)\)/g, "Math.floor(Math.random() * ($1))");
        safeExpr = safeExpr.replace(/\bTOUCH_ACTIVE\b/g, this.touchActive);
        safeExpr = safeExpr.replace(/\bTOUCH_X\b/g, this.touchX);
        safeExpr = safeExpr.replace(/\bTOUCH_Y\b/g, this.touchY);

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

        try {
            return new Function('return ' + safeExpr)();
        } catch (e) {
            return expr; 
        }
    },

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
            if (idx >= 0 && idx < this.vram.length) {
                this.vram[idx].bg = this.resolveColor(val.toString());
            }
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
            