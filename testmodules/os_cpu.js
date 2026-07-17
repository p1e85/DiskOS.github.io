import { RAM } from './os_memory.js';
import { GPU } from './os_display.js';
import { APU } from './os_audio.js';

export const CPU = {
    evaluateExpression(expr) {
        let safeExpr = expr;
        for (const [key, value] of Object.entries(RAM.variables)) {
            let regex = new RegExp(`\\b${key}\\b`, 'g');
            let safeValue = (typeof value === 'string') ? `"${value}"` : (Array.isArray(value) ? JSON.stringify(value) : value);
            safeExpr = safeExpr.replace(regex, safeValue);
        }
        safeExpr = safeExpr.replace(/\bRND\((.*?)\)/g, "Math.floor(Math.random() * ($1))");
        safeExpr = safeExpr.replace(/\bTOUCH_ACTIVE\b/g, RAM.touchActive);
        safeExpr = safeExpr.replace(/\bTOUCH_X\b/g, RAM.touchX);
        safeExpr = safeExpr.replace(/\bTOUCH_Y\b/g, RAM.touchY);
        safeExpr = safeExpr.replace(/\bBTN_([A-Z0-9_]+)\b/g, (match, p1) => {
            const mapped = { "SPACE": " ", "UP": "ARROWUP", "DOWN": "ARROWDOWN", "LEFT": "ARROWLEFT", "RIGHT": "ARROWRIGHT" };
            return RAM.keysDown[mapped[p1] || p1] ? "1" : "0";
        });
        safeExpr = safeExpr.replace(/\bAND\b/g, "&&").replace(/\bOR\b/g, "||");
        try { return new Function('return ' + safeExpr)(); } 
        catch (e) { return expr; }
    },

    runCode() {
        if (RAM.textBuffer.length > 0) {
            APU.init();
            RAM.isRunning = true;
            RAM.currentLineIndex = 0;
            RAM.callStack = []; 
            RAM.forStack = []; 
            
            let preservedCount = RAM.variables["SYS_FILE_COUNT"];
            let preservedFiles = RAM.variables["SYS_FILES"];
            let preservedEvent = RAM.variables["SYS_GUI_EVENT"]; 
            
            RAM.variables = {}; 
            if (preservedCount !== undefined) {
                RAM.variables["SYS_FILE_COUNT"] = preservedCount;
                RAM.variables["SYS_FILES"] = preservedFiles;
            }
            if (preservedEvent !== undefined) RAM.variables["SYS_GUI_EVENT"] = preservedEvent;
            
            RAM.sprites = {}; 
            RAM.waitingForTimer = RAM.waitingForInput = false;
            RAM.keysDown = {}; 
            RAM.touchActive = 0;
        } 
        else if (RAM.rawBuffer.length > 0) {
            let fileType = RAM.rawFileType;
            if (fileType === "RAW") {
                for (let line of RAM.rawBuffer) {
                    let chk = line.toUpperCase();
                    if (["DEF_MENU", "PAGE_BG", "TEXT_COLOR", "FONT_FAMILY", "CURSOR_COLOR"].some(k => chk.includes(k))) { fileType = "DISKGUI"; break; }
                    if (["PRESET:", "BTN_", "PAD_BG", "CUSTOM_BTN"].some(k => chk.includes(k))) { fileType = "DISKPAD"; break; }
                }
            }

            if (fileType === "DISKGUI") {
                RAM.customMenus = {};
                let currentMenu = null, itemsAdded = 0, stylesApplied = 0;
                RAM.rawBuffer.forEach(line => {
                    line = line.trim(); let upper = line.toUpperCase();
                    if (upper.startsWith("PAGE_BG ")) { document.documentElement.style.setProperty('--bg-color', line.substring(8).trim()); stylesApplied++; }
                    else if (upper.startsWith("BORDER_COLOR ")) { document.documentElement.style.setProperty('--crt-border', line.substring(13).trim()); stylesApplied++; }
                    else if (upper.startsWith("TEXT_COLOR ")) {
                        let newColor = GPU.resolveColor(line.substring(11).trim());
                        RAM.vram.forEach(c => { if(c.fg === RAM.systemColor) c.fg = newColor; });
                        RAM.systemColor = newColor; stylesApplied++;
                    }
                    else if (upper.startsWith("SCREEN_COLOR ")) {
                        let newBg = GPU.resolveColor(line.substring(13).trim());
                        RAM.vram.forEach(c => { if(c.bg === RAM.systemBgColor) c.bg = newBg; });
                        RAM.systemBgColor = newBg; stylesApplied++;
                    }
                    else if (upper.startsWith("CURSOR_COLOR ")) { RAM.cursorColor = GPU.resolveColor(line.substring(13).trim()); stylesApplied++; }
                    else if (upper.startsWith("FONT_FAMILY ")) { RAM.fontFamily = line.substring(12).trim(); stylesApplied++; }
                    else if (upper.startsWith("FONT_WEIGHT ")) { RAM.fontWeight = line.substring(12).trim().toLowerCase(); stylesApplied++; }
                    else if (upper.startsWith("FONT_STYLE ")) { RAM.fontStyle = line.substring(11).trim().toLowerCase(); stylesApplied++; }
                    else if (upper.startsWith("TEXT_DECOR ")) { RAM.textDecor = line.substring(11).trim().toUpperCase(); stylesApplied++; }
                    else if (upper.startsWith("CRT_SCANLINES ")) {
                        let scanlineObj = document.querySelector('.scanlines');
                        if (scanlineObj) scanlineObj.style.display = upper.includes("OFF") ? 'none' : 'block';
                        stylesApplied++;
                    }
                    else if (upper.startsWith("DEF_MENU ")) {
                        currentMenu = line.substring(9).replace("$", "").trim().toUpperCase();
                        RAM.customMenus[currentMenu] = [];
                    } 
                    else if (upper.startsWith("DEF_ITEM ") && currentMenu) {
                        RAM.customMenus[currentMenu].push(line.substring(9).trim().toUpperCase());
                        itemsAdded++;
                    }
                });
                GPU.printLine(`GUI COMPILED: ${itemsAdded} MENUS, ${stylesApplied} STYLES.\nREADY.`);
            } 
            else if (fileType === "DISKPAD") {
                const padContainer = document.getElementById('gamepad');
                const padLeft = document.getElementById('pad-left');
                const padRight = document.getElementById('pad-right');
                if (padContainer && padLeft && padRight) {
                    padLeft.innerHTML = padRight.innerHTML = '';
                    let itemsAdded = 0, padBg = "transparent", btnBg = "#222222", btnText = "#FFFFFF", btnBorder = "2px solid #555555", btnRadius = "8px";
                    RAM.rawBuffer.forEach(line => {
                        let parts = line.trim().split(" ");
                        let upper = line.trim().toUpperCase();
                        if (upper.startsWith("PAD_BG ")) padBg = parts[1];
                        else if (upper.startsWith("BTN_BG ")) btnBg = parts[1];
                        else if (upper.startsWith("BTN_TEXT ")) btnText = parts[1];
                        else if (upper.startsWith("BTN_BORDER ")) btnBorder = line.substring(11).trim();
                        else if (upper.startsWith("BTN_RADIUS ")) btnRadius = parts[1];
                    });
                    padContainer.style.background = padBg;
                    const makeBtn = (label, key, ovrBg, ovrTxt, ovrRad) => {
                        let bg = ovrBg || btnBg, txt = ovrTxt || btnText, rad = ovrRad || btnRadius;
                        let k = key.toUpperCase() === "SPACE" ? " " : key;
                        return `<div class="btn" style="background:${bg}; color:${txt}; border:${btnBorder}; border-radius:${rad}; padding:15px; margin:5px; font-weight:bold; cursor:pointer; user-select:none; text-align:center; flex-grow:1; display:flex; align-items:center; justify-content:center; box-sizing:border-box;" onmousedown="Parser.setKeyState('${k}', true)" onmouseup="Parser.setKeyState('${k}', false)" ontouchstart="Parser.setKeyState('${k}', true)" ontouchend="Parser.setKeyState('${k}', false)">${label}</div>`;
                    };
                    RAM.rawBuffer.forEach(line => {
                        let upper = line.trim().toUpperCase();
                        let parts = line.trim().split(" ");
                        if (upper === "PRESET: DPAD_CROSS") {
                            padLeft.innerHTML += `<div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:5px; align-items:center; justify-content:center; width:100%;"><div></div> ${makeBtn("▲", "ArrowUp")} <div></div>${makeBtn("◀", "ArrowLeft")} ${makeBtn("▼", "ArrowDown")} ${makeBtn("▶", "ArrowRight")}</div>`;
                            itemsAdded += 4;
                        }
                        else if (upper === "PRESET: DPAD_HORIZ") {
                            padLeft.innerHTML += `<div style="display:flex; gap:10px; width:100%;">${makeBtn("◀", "ArrowLeft")} ${makeBtn("▶", "ArrowRight")}</div>`;
                            itemsAdded += 2;
                        }
                        else if (upper === "PRESET: ACTION_AB") {
                            padRight.innerHTML += `<div style="display:flex; gap:10px; width:100%;">${makeBtn("B", "B")} ${makeBtn("A", "A")}</div>`;
                            itemsAdded += 2;
                        }
                        else if (upper.startsWith("CUSTOM_BTN ")) {
                            let side = parts[1] ? parts[1].toUpperCase() : "R", label = parts[2] || "X", key = parts[3] || "SPACE";
                            let cBg = (parts[4] && parts[4].toUpperCase() !== "NULL") ? parts[4] : null;
                            let cTxt = (parts[5] && parts[5].toUpperCase() !== "NULL") ? parts[5] : null;
                            let cRad = (parts[6] && parts[6].toUpperCase() !== "NULL") ? parts[6] : null;
                            let btnHTML = `<div style="display:inline-block; margin:2px;">${makeBtn(label, key, cBg, cTxt, cRad)}</div>`;
                            if (side === "L") padLeft.innerHTML += btnHTML; else padRight.innerHTML += btnHTML;
                            itemsAdded++;
                        }
                    });
                    GPU.setPadMode(true);
                    GPU.printLine(`PAD COMPILED: ${itemsAdded} ELEMENTS.`);
                }
                GPU.printLine("READY.");
            } else { GPU.printLine("?CANNOT RUN RAW TEXT\nREADY."); }
        } else { GPU.printLine("MEMORY IS EMPTY.\nREADY."); }
    },

    executeStep() {
        if (!RAM.isRunning || RAM.waitingForKey || RAM.waitingForTimer || RAM.waitingForInput) return;
        if (RAM.currentLineIndex >= RAM.textBuffer.length) {
            RAM.isRunning = false; GPU.printLine("READY."); return;
        }

        let currentLine = RAM.textBuffer[RAM.currentLineIndex];
        let code = currentLine.code.trim();
        let parts = code.split(" ");
        let cmd = parts[0].toUpperCase();

        if (cmd === "REM") { RAM.currentLineIndex++; return; }

        if (code.includes("GET_KEY")) {
            let p = code.split("=");
            if (p.length === 2) { RAM.targetVar = p[0].trim(); RAM.waitingForKey = true; return; }
        }

        if (cmd === "PRINT") {
            let text = code.substring(5).trim();
            if (text.startsWith('"') && text.endsWith('"')) GPU.printLine(text.substring(1, text.length - 1));
            else {
                let val = this.evaluateExpression(text);
                GPU.printLine(val !== undefined ? val.toString() : "");
            }
            RAM.currentLineIndex++;
        } 
        else if (cmd === "INPUT") {
            RAM.waitingForInput = true; RAM.inputVar = parts[1].trim(); RAM.inputBuffer = ""; return; 
        }
        else if (cmd === "DIM") {
            RAM.variables[parts[1]] = new Array(parseInt(this.evaluateExpression(parts[2]))).fill(0);
            RAM.currentLineIndex++;
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
                    if (Array.isArray(RAM.variables[arrName])) RAM.variables[arrName][idx] = val;
                } else RAM.variables[leftSide] = val;
                RAM.currentLineIndex++;
            } else {
                GPU.printLine(`?SYNTAX ERROR IN ${currentLine.line}\nREADY.`);
                RAM.isRunning = false;
            }
        }
        else if (cmd === "FOR") {
            let expr = code.substring(3).trim(); 
            let p1 = expr.split("=");
            if (p1.length === 2) {
                let p2 = p1[1].split("TO");
                if (p2.length === 2) {
                    let vName = p1[0].trim();
                    RAM.variables[vName] = parseInt(this.evaluateExpression(p2[0].trim()));
                    RAM.forStack.push({ v: vName, end: p2[1].trim(), returnIndex: RAM.currentLineIndex + 1 });
                    RAM.currentLineIndex++; return;
                }
            }
            GPU.printLine("?FOR LOOP SYNTAX ERROR\nREADY.");
            RAM.isRunning = false;
        }
        else if (cmd === "NEXT") {
            let vName = parts[1].trim();
            let loopIndex = RAM.forStack.length - 1; 
            if (loopIndex >= 0 && RAM.forStack[loopIndex].v === vName) {
                let loop = RAM.forStack[loopIndex];
                RAM.variables[vName]++;
                if (RAM.variables[vName] <= parseInt(this.evaluateExpression(loop.end))) {
                    RAM.currentLineIndex = loop.returnIndex; return;
                } else {
                    RAM.forStack.pop(); RAM.currentLineIndex++; return;
                }
            }
            GPU.printLine("?NEXT WITHOUT FOR ERROR\nREADY.");
            RAM.isRunning = false;
        }
        else if (cmd === "POKE" || cmd === "POKE_FG") {
            let idx = parseInt(this.evaluateExpression(parts[1]));
            let val = parseInt(this.evaluateExpression(parts[2]));
            if (idx >= 0 && idx < RAM.vram.length) {
                if(cmd === "POKE") RAM.vram[idx].bg = GPU.resolveColor(val.toString());
                else RAM.vram[idx].fg = GPU.resolveColor(val.toString());
            }
            RAM.currentLineIndex++;
        }
        else if (cmd === "POKE_CHAR") {
            let idx = parseInt(this.evaluateExpression(parts[1]));
            let charStr = parts[2].replace(/"/g, ""); 
            if (idx >= 0 && idx < RAM.vram.length) RAM.vram[idx].char = charStr.substring(0, 1);
            RAM.currentLineIndex++;
        }
        else if (cmd === "PEEK") {
            let idx = parseInt(this.evaluateExpression(parts[1]));
            RAM.variables["PEEK_VAL"] = RAM.vram[idx] ? RAM.vram[idx].bg : 0;
            RAM.currentLineIndex++;
        }
        else if (cmd === "PEEK_CHAR") {
            let idx = parseInt(this.evaluateExpression(parts[1]));
            RAM.variables["PEEK_C"] = RAM.vram[idx] ? RAM.vram[idx].char : " ";
            RAM.currentLineIndex++;
        }
        else if (cmd === "SCROLL") {
            let dir = parts[1].toUpperCase();
            if (dir === "UP") {
                for (let i = 0; i < RAM.cols * (RAM.rows - 1); i++) {
                    let b = RAM.vram[i + RAM.cols];
                    RAM.vram[i].char = b.char; RAM.vram[i].fg = b.fg; RAM.vram[i].bg = b.bg;
                }
                for (let i = RAM.cols * (RAM.rows - 1); i < RAM.cols * RAM.rows; i++) {
                    RAM.vram[i].char = ' '; RAM.vram[i].bg = RAM.systemBgColor;
                }
            } else if (dir === "DOWN") {
                for (let i = (RAM.cols * RAM.rows) - 1; i >= RAM.cols; i--) {
                    let a = RAM.vram[i - RAM.cols];
                    RAM.vram[i].char = a.char; RAM.vram[i].fg = a.fg; RAM.vram[i].bg = a.bg;
                }
                for (let i = 0; i < RAM.cols; i++) {
                    RAM.vram[i].char = ' '; RAM.vram[i].bg = RAM.systemBgColor;
                }
            } else if (dir === "LEFT") {
                for (let y = 0; y < RAM.rows; y++) {
                    for (let x = 0; x < RAM.cols - 1; x++) {
                        let c = y * RAM.cols + x, r = c + 1;
                        RAM.vram[c].char = RAM.vram[r].char; RAM.vram[c].fg = RAM.vram[r].fg; RAM.vram[c].bg = RAM.vram[r].bg;
                    }
                    let edge = y * RAM.cols + (RAM.cols - 1);
                    RAM.vram[edge].char = ' '; RAM.vram[edge].bg = RAM.systemBgColor;
                }
            } else if (dir === "RIGHT") {
                for (let y = 0; y < RAM.rows; y++) {
                    for (let x = RAM.cols - 1; x > 0; x--) {
                        let c = y * RAM.cols + x, l = c - 1;
                        RAM.vram[c].char = RAM.vram[l].char; RAM.vram[c].fg = RAM.vram[l].fg; RAM.vram[c].bg = RAM.vram[l].bg;
                    }
                    let edge = y * RAM.cols;
                    RAM.vram[edge].char = ' '; RAM.vram[edge].bg = RAM.systemBgColor;
                }
            }
            RAM.currentLineIndex++;
        }
        else if (cmd === "WAIT") {
            let delay = parseInt(this.evaluateExpression(parts[1])) || 100;
            RAM.waitingForTimer = true;
            setTimeout(() => { RAM.waitingForTimer = false; RAM.currentLineIndex++; }, delay);
        }
        else if (cmd === "BEEP") {
            let freq = parseFloat(this.evaluateExpression(parts[1]));
            if (!isNaN(freq)) APU.playTone(freq, parseInt(this.evaluateExpression(parts[2])) || 100);
            RAM.currentLineIndex++;
        }
        else if (cmd === "PLAY") {
            let freq = APU.NOTE_MAP[parts[1].toUpperCase()];
            if (freq) APU.playTone(freq, parseInt(this.evaluateExpression(parts[2])) || 100);
            RAM.currentLineIndex++;
        }
        else if (cmd === "PLOT") {
            let x = parseInt(this.evaluateExpression(parts[1]));
            let y = parseInt(this.evaluateExpression(parts[2]));
            if (x >= 0 && x < RAM.cols && y >= 0 && y < RAM.rows) {
                let idx = RAM.getIndex(x, y);
                RAM.vram[idx].bg = GPU.resolveColor(parts[3]);
                RAM.vram[idx].char = ' '; 
            }
            RAM.currentLineIndex++;
        }
        else if (cmd === "DRAW_BOX") {
            let sx = parseInt(this.evaluateExpression(parts[1]));
            let sy = parseInt(this.evaluateExpression(parts[2]));
            let w = parseInt(this.evaluateExpression(parts[3]));
            let h = parseInt(this.evaluateExpression(parts[4]));
            let color = GPU.resolveColor(parts[5]);
            for (let y = sy; y < sy + h; y++) {
                for (let x = sx; x < sx + w; x++) {
                    if (x >= 0 && x < RAM.cols && y >= 0 && y < RAM.rows) {
                        let idx = RAM.getIndex(x, y);
                        RAM.vram[idx].bg = color; RAM.vram[idx].char = ' ';
                    }
                }
            }
            RAM.currentLineIndex++;
        }
        else if (cmd === "DEF_SPRITE") {
            RAM.sprites[parts[1]] = {
                w: parseInt(this.evaluateExpression(parts[2])), h: parseInt(this.evaluateExpression(parts[3])),
                color: GPU.resolveColor(parts[4]), data: parts[5]
            };
            RAM.currentLineIndex++;
        }
        else if (cmd === "DRAW_SPRITE") {
            let sprite = RAM.sprites[parts[1]];
            let sx = parseInt(this.evaluateExpression(parts[2]));
            let sy = parseInt(this.evaluateExpression(parts[3]));
            if (sprite && sprite.data) {
                let i = 0;
                for (let y = 0; y < sprite.h; y++) {
                    for (let x = 0; x < sprite.w; x++) {
                        if (i < sprite.data.length && sprite.data.charAt(i) === '1') {
                            let px = sx + x, py = sy + y;
                            if (px >= 0 && px < RAM.cols && py >= 0 && py < RAM.rows) {
                                let idx = RAM.getIndex(px, py);
                                RAM.vram[idx].bg = sprite.color; RAM.vram[idx].char = ' ';
                            }
                        }
                        i++;
                    }
                }
            }
            RAM.currentLineIndex++;
        }
        else if (cmd === "DIR") {
            if (Kernel.activeDir) {
                let files = Kernel.mountDir(Kernel.activeDir);
                RAM.variables["SYS_FILE_COUNT"] = files.length;
                RAM.variables["SYS_FILES"] = files;
            }
            RAM.currentLineIndex++;
        }
        else if (cmd === "IF") {
            let cb = code.substring(2).split("THEN");
            if (cb.length === 2 && this.evaluateExpression(cb[0].trim())) {
                let action = cb[1].trim();
                let aCmd = action.split(" ")[0].toUpperCase();

                if (aCmd === "GOTO") {
                    let targetLine = parseInt(action.split(" ")[1]);
                    let targetIndex = RAM.textBuffer.findIndex(i => i.line === targetLine);
                    if (targetIndex !== -1) { RAM.currentLineIndex = targetIndex; return; } 
                    else { GPU.printLine("?LINE NOT FOUND ERROR\nREADY."); RAM.isRunning = false; return; }
                } 
                else if (aCmd === "GOSUB") {
                    let targetLine = parseInt(action.split(" ")[1]);
                    let targetIndex = RAM.textBuffer.findIndex(i => i.line === targetLine);
                    if (targetIndex !== -1) { 
                        RAM.callStack.push(RAM.currentLineIndex + 1);
                        RAM.currentLineIndex = targetIndex; return; 
                    } else { GPU.printLine("?LINE NOT FOUND ERROR\nREADY."); RAM.isRunning = false; return; }
                }
                else if (aCmd === "END") { GPU.printLine("READY."); RAM.isRunning = false; return; }
                else if (aCmd === "VAR") {
                    let expr = action.substring(4).trim();
                    let splitIndex = expr.indexOf("=");
                    if (splitIndex !== -1) {
                        let leftSide = expr.substring(0, splitIndex).trim();
                        let val = this.evaluateExpression(expr.substring(splitIndex + 1).trim());
                        if (leftSide.includes("[")) {
                            let arrName = leftSide.substring(0, leftSide.indexOf("["));
                            let idx = parseInt(this.evaluateExpression(leftSide.substring(leftSide.indexOf("[") + 1, leftSide.indexOf("]"))));
                            if (Array.isArray(RAM.variables[arrName])) RAM.variables[arrName][idx] = val;
                        } else RAM.variables[leftSide] = val;
                    } else { GPU.printLine(`?SYNTAX ERROR IN ${currentLine.line}\nREADY.`); RAM.isRunning = false; return; }
                }
            }
            RAM.currentLineIndex++;
        }
        else if (cmd === "GOSUB") {
            let targetIndex = RAM.textBuffer.findIndex(item => item.line === parseInt(parts[1]));
            if (targetIndex !== -1) {
                RAM.callStack.push(RAM.currentLineIndex + 1);
                RAM.currentLineIndex = targetIndex; 
            } else { GPU.printLine("?LINE NOT FOUND ERROR\nREADY."); RAM.isRunning = false; }
        }
        else if (cmd === "RETURN") {
            if (RAM.callStack.length > 0) RAM.currentLineIndex = RAM.callStack.pop();
            else { GPU.printLine("?RETURN WITHOUT GOSUB\nREADY."); RAM.isRunning = false; }
        }
        else if (cmd === "GOTO") {
            let targetIndex = RAM.textBuffer.findIndex(item => item.line === parseInt(parts[1]));
            if (targetIndex !== -1) RAM.currentLineIndex = targetIndex; 
            else { GPU.printLine("?LINE NOT FOUND ERROR\nREADY."); RAM.isRunning = false; }
        }
        else if (cmd === "END") { RAM.isRunning = false; GPU.printLine("READY."); }
        else if (cmd === "CLEAR_SCR") {
            RAM.vram.forEach(cell => { cell.char = ' '; cell.bg = RAM.systemBgColor; });
            RAM.cursorX = RAM.cursorY = 0; RAM.currentLineIndex++;
        }
        else {
            GPU.printLine(`?SYNTAX ERROR IN ${currentLine.line}\nREADY.`);
            RAM.isRunning = false;
        }
    }
};