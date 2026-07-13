const canvas = document.getElementById('monitor');
const ctx = canvas.getContext('2d');

const COLS = Parser.cols;
const ROWS = Parser.rows;
const CELL_WIDTH = 16;
const CELL_HEIGHT = 24;

canvas.width = COLS * CELL_WIDTH;
canvas.height = ROWS * CELL_HEIGHT;

let lastTime = 0;
let targetFPS = 60;
let fpsInterval = 1000 / targetFPS;
let cursorBlink = true;
let frameCount = 0;

const hiddenInput = document.getElementById('mobile-keyboard-trap');

if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
        if (window.matchMedia("(orientation: portrait)").matches) {
            document.body.style.height = window.visualViewport.height + "px";
        } else {
            document.body.style.height = "100dvh";
        }
    });
}

hiddenInput.addEventListener('focus', () => document.body.classList.add('keyboard-open'));
hiddenInput.addEventListener('blur', () => {
    document.body.classList.remove('keyboard-open');
    document.body.style.height = "100dvh"; 
});

// ==========================================
// PHYSICAL KEYBOARD POLLING
// ==========================================
window.addEventListener('keydown', (e) => {
    if (Parser.setKeyState) Parser.setKeyState(e.key, true);
});
window.addEventListener('keyup', (e) => {
    if (Parser.setKeyState) Parser.setKeyState(e.key, false);
});

// ==========================================
// TOUCH & MOUSE TO GRID COORDINATES
// ==========================================
function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let x = Math.floor(((clientX - rect.left) * scaleX) / CELL_WIDTH);
    let y = Math.floor(((clientY - rect.top) * scaleY) / CELL_HEIGHT);
    
    if (x < 0) x = 0; if (x >= COLS) x = COLS - 1;
    if (y < 0) y = 0; if (y >= ROWS) y = ROWS - 1;
    
    return {x, y};
}

let isMouseDown = false;

window.addEventListener('mousedown', (e) => {
    if (Parser.isRunning) {
        isMouseDown = true;
        let coords = getCanvasCoords(e);
        if (Parser.setTouchState) Parser.setTouchState(1, coords.x, coords.y);
    }
});
window.addEventListener('mousemove', (e) => {
    if (Parser.isRunning && isMouseDown) {
        let coords = getCanvasCoords(e);
        if (Parser.setTouchState) Parser.setTouchState(1, coords.x, coords.y);
    }
});
window.addEventListener('mouseup', () => {
    isMouseDown = false;
    if (Parser.isRunning && Parser.setTouchState) {
        Parser.setTouchState(0, Parser.touchX, Parser.touchY);
    }
});

// ==========================================
// LONG PRESS MENU & TOUCH SCREEN POLLING
// ==========================================
let touchTimer;
let isMenuOpen = false;
let isLongPress = false;
const osMenu = document.getElementById('os-menu');

function openSysMenu() {
    isMenuOpen = true;
    osMenu.classList.remove('hidden');
    hiddenInput.blur(); 
}

canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length >= 3) {
        Parser.handleKey("Escape");
        e.preventDefault();
        return; 
    }
    
    if (Parser.isRunning) {
        e.preventDefault(); 
        let coords = getCanvasCoords(e);
        if (Parser.setTouchState) Parser.setTouchState(1, coords.x, coords.y);
    } 
    else {
        if (e.touches.length === 1 && !isMenuOpen) {
            isLongPress = false;
            touchTimer = setTimeout(() => {
                isLongPress = true;
                openSysMenu();
            }, 600); 
        }
    }
}, {passive: false});

canvas.addEventListener('touchmove', (e) => {
    if (Parser.isRunning) {
        e.preventDefault();
        let coords = getCanvasCoords(e);
        if (Parser.setTouchState) Parser.setTouchState(1, coords.x, coords.y);
    } else {
        clearTimeout(touchTimer);
    }
}, {passive: false});

canvas.addEventListener('touchend', (e) => {
    if (Parser.isRunning) {
        e.preventDefault();
        if (Parser.setTouchState) Parser.setTouchState(0, Parser.touchX, Parser.touchY);
    } else {
        clearTimeout(touchTimer);
        if (!isLongPress && !isMenuOpen && e.touches.length === 0) {
            hiddenInput.focus();
        }
    }
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!Parser.isRunning) openSysMenu();
});
canvas.addEventListener('click', () => { 
    if (!isMenuOpen && !Parser.isRunning) hiddenInput.focus(); 
});

document.getElementById('btn-close').addEventListener('click', () => {
    osMenu.classList.add('hidden');
    isMenuOpen = false;
});

document.getElementById('btn-copy').addEventListener('click', () => {
    let code = "";
    for (let i = 0; i < Parser.textBuffer.length; i++) {
        code += Parser.textBuffer[i].line + " " + Parser.textBuffer[i].code + "\n";
    }
    navigator.clipboard.writeText(code).then(() => {
        Parser.printLine("CODE COPIED TO CLIPBOARD.");
        Parser.printLine("READY.");
    });
    osMenu.classList.add('hidden');
    isMenuOpen = false;
});

document.getElementById('btn-paste').addEventListener('click', () => {
    navigator.clipboard.readText().then(text => {
        Parser.pasteFromClipboard(text);
    }).catch(err => {
        Parser.printLine("?CLIPBOARD ACCESS DENIED");
    });
    osMenu.classList.add('hidden');
    isMenuOpen = false;
});

hiddenInput.addEventListener('keydown', (e) => {
    if (e.key === "Enter" || e.key === "Backspace" || e.key === "Escape") {
        e.preventDefault(); 
        Parser.handleKey(e.key);
    }
});
hiddenInput.addEventListener('input', (e) => {
    let chars = hiddenInput.value;
    for (let i = 0; i < chars.length; i++) {
        Parser.handleKey(chars[i]);
    }
    hiddenInput.value = "";
});

// ==========================================
// KERNEL PERSISTENCE (DISK STORAGE)
// ==========================================
const fileLoader = document.getElementById('disk-loader');
const Kernel = {
    saveToDevice: function(filename, content) {
        localStorage.setItem(filename, content); 
        const blob = new Blob([content], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    },
    loadFromDisk: function(filename) {
        return localStorage.getItem(filename);
    },
    triggerLoad: function() {
        fileLoader.click();
    }
};

fileLoader.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        Parser.loadFromDisk(event.target.result, file.name);
    };
    reader.readAsText(file);
    fileLoader.value = "";
});

// ==========================================
// MASTER LOOP (CPU OVERCLOCK)
// ==========================================
function kernelLoop(timestamp) {
    requestAnimationFrame(kernelLoop);
    let deltaTime = timestamp - lastTime;
    
    if (deltaTime > fpsInterval) {
        lastTime = timestamp - (deltaTime % fpsInterval);
        frameCount++;
        
        if (Parser.isRunning) {
            let cycles = 0;
            // Execute up to 1000 lines of code instantly before rendering the frame
            while (Parser.isRunning && !Parser.waitingForKey && !Parser.waitingForTimer && cycles < 1000) {
                Parser.executeStep();
                cycles++;
            }
        }
        
        renderVRAM();
        renderCursor();
    }
}

function renderVRAM() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = '20px monospace';
    ctx.textBaseline = 'top';

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            let cell = Parser.vram[Parser.getIndex(x, y)];
            
            if (cell.bg !== '#000000') {
                ctx.fillStyle = cell.bg;
                ctx.fillRect(x * CELL_WIDTH, y * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
            }

            if (cell.char !== ' ') {
                ctx.fillStyle = cell.fg;
                ctx.fillText(cell.char, x * CELL_WIDTH + 2, y * CELL_HEIGHT + 2);
            }
        }
    }
}

function renderCursor() {
    if (Parser.isRunning || isMenuOpen) return; 
    if (frameCount % 30 === 0) cursorBlink = !cursorBlink;
    if (cursorBlink) {
        ctx.fillStyle = '#FFB000';
        ctx.fillRect(Parser.cursorX * CELL_WIDTH, Parser.cursorY * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
        let currentCell = Parser.vram[Parser.getIndex(Parser.cursorX, Parser.cursorY)];
        if (currentCell && currentCell.char !== ' ') {
            ctx.fillStyle = '#000000';
            ctx.fillText(currentCell.char, Parser.cursorX * CELL_WIDTH + 2, Parser.cursorY * CELL_HEIGHT + 2);
        }
    }
}

window.addEventListener('click', () => { 
    if (!isMenuOpen && !Parser.isRunning) hiddenInput.focus(); 
});
hiddenInput.focus();
requestAnimationFrame(kernelLoop);
