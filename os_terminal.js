import { RAM } from './os_memory.js';
import { GPU } from './os_display.js';
import { CPU } from './os_cpu.js';

export const CLI = {
    _generatePayload() {
        if (RAM.rawBuffer.length > 0) return RAM.rawBuffer.join('\n');
        return `TYPE: diskCODE\nCOMPATIBILITY: V1.8\n---\n` + RAM.textBuffer.map(t => `${t.line} ${t.code}`).join('\n');
    },

    handleKey(key) {
        if (key === "Escape") {
            if (RAM.isRunning) {
                RAM.isRunning = RAM.waitingForKey = RAM.waitingForTimer = RAM.waitingForInput = false;
                GPU.printLine("\nBREAK.\nREADY.");
            }
            if (RAM.isCapturingRaw) {
                RAM.isCapturingRaw = false; GPU.printLine("RAW MODE: ABORTED.\nREADY.");
            }
            return;
        }
        
        if (RAM.waitingForInput) {
            if (key === "Enter") {
                RAM.variables[RAM.inputVar] = RAM.inputBuffer;
                RAM.waitingForInput = false; RAM.currentLineIndex++;
                RAM.cursorX = 0; RAM.cursorY++; GPU.checkScroll();
            } else if (key === "Backspace") {
                if (RAM.inputBuffer.length > 0) {
                    RAM.inputBuffer = RAM.inputBuffer.slice(0, -1);
                    if (RAM.cursorX > 0) {
                        RAM.cursorX--; RAM.vram[RAM.getIndex(RAM.cursorX, RAM.cursorY)].char = ' ';
                    }
                }
            } else if (key.length === 1) {
                RAM.inputBuffer += key.toUpperCase();
                let idx = RAM.getIndex(RAM.cursorX, RAM.cursorY);
                RAM.vram[idx].char = key.toUpperCase(); RAM.vram[idx].fg = RAM.systemColor;
                RAM.cursorX++;
                if (RAM.cursorX >= RAM.cols) { RAM.cursorX = 0; RAM.cursorY++; GPU.checkScroll(); }
            }
            return;
        }

        if (RAM.waitingForKey) {
            RAM.variables[RAM.targetVar] = key.toUpperCase();
            RAM.waitingForKey = false; RAM.currentLineIndex++; return;
        }
        
        if (RAM.isRunning) return;
        
        if (key === "Enter") {
            this.processCurrentLine(); 
            RAM.cursorX = 0; RAM.cursorY++; GPU.checkScroll(); return;
        }
        if (key === "Backspace") {
            if (RAM.cursorX > 0) {
                RAM.cursorX--; let idx = RAM.getIndex(RAM.cursorX, RAM.cursorY);
                RAM.vram[idx].char = ' '; RAM.vram[idx].bg = RAM.systemBgColor; 
            }
            return;
        }
        if (key.length === 1) {
            let idx = RAM.getIndex(RAM.cursorX, RAM.cursorY);
            RAM.vram[idx].char = key.toUpperCase(); RAM.vram[idx].fg = RAM.systemColor;
            RAM.cursorX++;
            if (RAM.cursorX >= RAM.cols) { RAM.cursorX = 0; RAM.cursorY++; GPU.checkScroll(); }
        }
    },
    
    processCurrentLine() {
        let rowString = "";
        for (let x = 0; x < RAM.cols; x++) rowString += RAM.vram[RAM.getIndex(x, RAM.cursorY)].char;
        let cmd = rowString.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
        if (cmd === "") return;

        if (cmd === "----") {
            RAM.isCapturingRaw = !RAM.isCapturingRaw;
            if (RAM.isCapturingRaw) {
                RAM.rawFileType = "RAW"; GPU.printLine("RAW MODE: ON (APPENDING)");
            } else GPU.printLine(`RAW MODE: OFF (${RAM.rawBuffer.length} LINES TOTAL)\nREADY.`);
            RAM.cursorY++; GPU.checkScroll(); return;
        }

        if (RAM.isCapturingRaw) {
            let chk = cmd.toUpperCase();
            if (["LIST", "RUN", "SAVE", "$FILE"].includes(chk)) GPU.printLine(`?EXIT RAW MODE (----) TO USE ${chk}`);
            else { RAM.rawBuffer.push(cmd); GPU.printLine(">"); }
            RAM.cursorY++; GPU.checkScroll(); return;
        }

        let parts = cmd.split(" ");
        let fwUpper = parts[0].toUpperCase();

        if (fwUpper.startsWith("$")) {
            RAM.cursorY++; GPU.checkScroll();
            let menu = fwUpper.substring(1), action = parts[1] ? parts[1].toUpperCase() : null;

            if (menu === "FILE") {
                if (action === "NEW") {
                    RAM.textBuffer = []; RAM.variables = {}; RAM.sprites = {}; RAM.rawBuffer = []; RAM.customMenus = {};
                    GPU.setPadMode(false); GPU.resetTheme(); GPU.printLine("MEMORY CLEARED. THEME RESET.");
                } else if (action === "SAVE" || action === "EXPORT") {
                    let filename = parts[2] ? parts[2].replace(/"/g, "") : "UNTITLED.diskCODE";
                    let payload = this._generatePayload();
                    if (action === "SAVE") { Kernel.virtualSave(filename, payload); GPU.printLine(`SAVED ${filename} TO VIRTUAL DRIVE.`); } 
                    else { Kernel.physicalExport(filename, payload); GPU.printLine(`EXPORTING ${filename} TO DEVICE.`); }
                } else GPU.printLine("--- FILE MENU ---\n  $FILE NEW\n  $FILE SAVE [FILENAME]\n  $FILE EXPORT [FILENAME]\n-----------------");
            } 
            else if (menu === "EDIT") {
                if (action === "COPY") {
                    navigator.clipboard.writeText(this._generatePayload()).catch(()=>{}); GPU.printLine("MEMORY COPIED.");
                } else if (action === "PASTE") {
                    navigator.clipboard.readText().then(text => this.pasteFromClipboard(text)).catch(() => GPU.printLine("?CLIPBOARD ACCESS DENIED\nREADY."));
                    RAM.cursorY--; return; 
                } else GPU.printLine("--- EDIT MENU ---\n  $EDIT COPY\n  $EDIT PASTE\n-----------------");
            }
            else if (RAM.customMenus[menu]) {
                if (action && RAM.customMenus[menu].includes(action)) {
                    RAM.variables["SYS_GUI_EVENT"] = `${menu}.${action}`;
                    GPU.printLine(`RUNNING ${action}...`); CPU.runCode(); RAM.cursorY--; return;
                } else {
                    GPU.printLine(`--- ${menu} MENU ---`);
                    RAM.customMenus[menu].forEach(item => GPU.printLine(`  $${menu} ${item}`));
                    GPU.printLine("-----------------");
                }
            }
            else GPU.printLine("?UNKNOWN GUI MENU\nTYPE $FILE OR $EDIT");
            GPU.printLine("READY."); RAM.cursorY--; return; 
        }

        if (!isNaN(parts[0])) {
            let lineNum = parseInt(parts[0]);
            let codeString = cmd.substring(parts[0].length).trim();
            let existingIndex = RAM.textBuffer.findIndex(item => item.line === lineNum);
            if (codeString === "") {
                if (existingIndex !== -1) RAM.textBuffer.splice(existingIndex, 1);
            } else {
                if (existingIndex !== -1) RAM.textBuffer[existingIndex].code = codeString; 
                else RAM.textBuffer.push({ line: lineNum, code: codeString }); 
            }
            RAM.textBuffer.sort((a, b) => a.line - b.line); 
        } else {
            RAM.cursorY++; GPU.checkScroll();

            if (fwUpper === "CLEAR_SCR") {
                RAM.vram.forEach(cell => { cell.char = ' '; cell.bg = RAM.systemBgColor; });
                RAM.cursorX = RAM.cursorY = 0; RAM.cursorY--; 
            } 
            else if (fwUpper === "HELP") {
                GPU.printLine("");
                // Simplified help dump for brevity
                GPU.printLine("SEE MANUAL FOR COMMANDS."); GPU.printLine(""); RAM.cursorY--;
            }
            else if (fwUpper === "LIST") {
                let isEmpty = true;
                if (RAM.textBuffer.length > 0) {
                    GPU.printLine("--- CODE MEMORY ---"); RAM.textBuffer.forEach(t => GPU.printLine(`${t.line} ${t.code}`)); isEmpty = false;
                }
                if (RAM.rawBuffer.length > 0) {
                    GPU.printLine("--- RAW DATA MEMORY ---"); RAM.rawBuffer.forEach(r => GPU.printLine(r)); isEmpty = false;
                }
                if (isEmpty) GPU.printLine("MEMORY IS EMPTY.");
                GPU.printLine("READY."); RAM.cursorY--;
            } 
            else if (fwUpper === "NEW") {
                RAM.textBuffer = []; RAM.variables = {}; RAM.sprites = {}; RAM.rawBuffer = []; RAM.customMenus = {};
                GPU.setPadMode(false); GPU.resetTheme(); GPU.printLine("MEMORY CLEARED. THEME RESET.\nREADY."); RAM.cursorY--;
            }
            else if (fwUpper === "SAVE" || fwUpper === "EXPORT") {
                let filename = cmd.substring(fwUpper === "SAVE" ? 4 : 6).trim().replace(/"/g, "") || "UNTITLED.diskCODE";
                let payload = this._generatePayload();
                if (fwUpper === "SAVE") { Kernel.virtualSave(filename, payload); GPU.printLine("SAVED TO VIRTUAL DRIVE.\nREADY."); } 
                else { Kernel.physicalExport(filename, payload); GPU.printLine("DOWNLOADING TO DEVICE...\nREADY."); }
                if(RAM.rawBuffer.length > 0) RAM.rawBuffer = []; RAM.cursorY--;
            }
            else if (fwUpper === "LOAD") {
                let filename = cmd.substring(4).trim().replace(/"/g, "");
                let content = Kernel.virtualLoad(filename);
                if (content) this.processFileContent(content, filename);
                else GPU.printLine("?FILE NOT FOUND ON VIRTUAL DRIVE");
                RAM.cursorY--;
            }
            else if (fwUpper === "IMPORT") { GPU.printLine("WAITING FOR UPLOAD..."); Kernel.triggerImport(); RAM.cursorY--; }
            else if (fwUpper === "MOUNT") {
                let dirname = cmd.substring(5).trim().replace(/"/g, "") || "MASTER.diskDIR";
                let files = Kernel.mountDir(dirname); GPU.printLine(`MOUNTED: ${dirname}`);
                RAM.variables["SYS_FILE_COUNT"] = files.length; RAM.variables["SYS_FILES"] = files;
                if (files.includes("MAIN.diskCODE")) {
                    GPU.printLine("AUTO-BOOTING MAIN.diskCODE...");
                    let mainContent = Kernel.virtualLoad("MAIN.diskCODE");
                    if (mainContent) { this.processFileContent(mainContent, "MAIN.diskCODE"); CPU.runCode(); }
                } else GPU.printLine("READY."); 
                RAM.cursorY--;
            }
            else if (fwUpper === "DIR") {
                if (!Kernel.activeDir) GPU.printLine("?NO DIRECTORY MOUNTED"); 
                else {
                    let files = Kernel.mountDir(Kernel.activeDir); GPU.printLine(`DIR: ${Kernel.activeDir}`);
                    files.forEach(f => GPU.printLine(`  ${f}`));
                    RAM.variables["SYS_FILE_COUNT"] = files.length; RAM.variables["SYS_FILES"] = files;
                }
                GPU.printLine("READY."); RAM.cursorY--;
            }
            else if (fwUpper === "LOAD_LIB") {
                let filename = parts[1], libContent = Kernel.virtualLoad(filename);
                if (libContent) {
                    GPU.printLine(`STACKING ${filename}...`); let isPayload = false;
                    libContent.split('\n').forEach(line => {
                        line = line.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
                        if (line === "---") { isPayload = true; return; }
                        if (isPayload && line !== "") {
                            let p = line.split(" "), lNum = parseInt(p[0]);
                            if (!isNaN(lNum)) RAM.textBuffer.push({ line: lNum, code: line.substring(p[0].length).trim() });
                        }
                    });
                    RAM.textBuffer.sort((a, b) => a.line - b.line); GPU.printLine("STACK SUCCESSFUL.");
                } else GPU.printLine("?FILE NOT FOUND");
                RAM.cursorY--;
            }
            else if (fwUpper === "COPY") {
                navigator.clipboard.writeText(this._generatePayload()).catch(()=>{});
                GPU.printLine("ALL CODE COPIED.\nREADY."); RAM.cursorY--;
            }
            else if (fwUpper === "RUN") { CPU.runCode(); RAM.cursorY--; }
            else { GPU.printLine("?SYNTAX ERROR"); RAM.cursorY--; }
        }
    },

    processFileContent(fileContent, filename) {
        GPU.printLine(`LOADING ${filename}...`);
        let lines = fileContent.split('\n'), ext = filename.split('.').pop().toUpperCase();
        if (ext === "DISKGUI" || ext === "DISKPAD") {
            RAM.rawFileType = ext; RAM.textBuffer = []; RAM.rawBuffer = [];
            lines.forEach(line => { line = line.replace(/[\u200B-\u200D\uFEFF]/g, '').trim(); if (line) RAM.rawBuffer.push(line); });
            GPU.printLine(`LOADED ${RAM.rawBuffer.length} RAW LINES.\nREADY.`); return; 
        }
        let isPayload = false; RAM.rawFileType = "RAW"; RAM.rawBuffer = []; RAM.textBuffer = []; 
        lines.forEach(line => {
            line = line.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
            if (line === "---") { isPayload = true; return; }
            if (isPayload && line !== "") {
                let parts = line.split(" "), lineNum = parseInt(parts[0]);
                if (!isNaN(lineNum)) RAM.textBuffer.push({ line: lineNum, code: line.substring(parts[0].length).trim() });
            }
        });
        RAM.textBuffer.sort((a, b) => a.line - b.line);
        GPU.printLine(`LOADED ${RAM.textBuffer.length} LINES.\nREADY.`);
    },

    pasteFromClipboard(text) {
        GPU.printLine("PASTING...");
        let lines = text.replace(/[\u200B-\u200D\uFEFF]/g, '').split('\n'), linesAdded = 0;
        if (RAM.isCapturingRaw) {
            lines.forEach(line => {
                line = line.trim();
                if (line) { RAM.rawBuffer.push(line); GPU.printLine("> " + line.substring(0, RAM.cols - 3)); linesAdded++; }
            });
            GPU.printLine(`PASTED ${linesAdded} LINES TO RAW BUFFER.\nREADY.`);
        } else {
            lines.forEach(line => {
                line = line.trim();
                if (line) {
                    let parts = line.split(" "), lineNum = parseInt(parts[0]);
                    if (!isNaN(lineNum)) {
                        let codeString = line.substring(parts[0].length).trim();
                        let existing = RAM.textBuffer.find(item => item.line === lineNum);
                        if (existing) existing.code = codeString;
                        else RAM.textBuffer.push({ line: lineNum, code: codeString });
                        linesAdded++;
                    }
                }
            });
            RAM.textBuffer.sort((a, b) => a.line - b.line); GPU.printLine(`PASTED ${linesAdded} LINES TO MEMORY.\nREADY.`);
        }
    }
};