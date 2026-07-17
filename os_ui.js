// ==========================================
// SYSTEM VARIABLES & HARDWARE INIT
// ==========================================
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d', { alpha: false }); // Hardware acceleration optimization
const overlay = document.getElementById('mobile-keyboard');
const monitor = document.getElementById('monitor');

const CELL_WIDTH = 20; 
const CELL_HEIGHT = 20;

let blinkTimer = 0; 
let cursorVisible = true;

// ==========================================
// MOBILE KEYBOARD & TEXT INPUT HANDLING
// ==========================================
overlay.addEventListener('focus', () => document.body.classList.add('typing-mode'));
overlay.addEventListener('blur', () => {
    document.body.classList.remove('typing-mode');
    if (document.body.classList.contains('typing-mode')) {
        setTimeout(() => overlay.focus({ preventScroll: true }), 50);
    }
});

setInterval(() => {
    if (document.activeElement !== overlay) overlay.focus({ preventScroll: true });
}, 500);

overlay.addEventListener('paste', (e) => {
    e.preventDefault();
    Parser.pasteFromClipboard((e.clipboardData || window.clipboardData).getData('text'));
    overlay.value = ""; 
});

overlay.addEventListener('input', (e) => {
    const val = e.target.value;
    if (!val) return;
    val.length === 1 ? Parser.handleKey(val) : Parser.pasteFromClipboard(val);
    overlay.value = ""; 
});

overlay.addEventListener('keydown', (e) => {
    if (e.key === "Enter" || e.key === "Backspace") {
        e.preventDefault(); 
        Parser.handleKey(e.key);
    }
});

// ==========================================
// PHYSICAL KEYBOARD I/O (DESKTOP)
// ==========================================
window.addEventListener('keydown', (e) => {
    const blockedKeys = ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    if (blockedKeys.includes(e.code) && document.body.classList.contains('pad-active')) {
        e.preventDefault();
    }
    if (e.key === "Escape") Parser.handleKey(e.key);
    Parser.setKeyState(e.key, true); 
});

window.addEventListener('keyup', (e) => Parser.setKeyState(e.key, false));

// ==========================================
// MOUSE & TOUCH MATH ROUTING
// ==========================================
const handlePointer = (e, isActive) => {
    const rect = canvas.getBoundingClientRect();
    const { clientX, clientY } = e.touches ? e.touches[0] : e;
    
    const x = Math.floor(((clientX - rect.left) * (canvas.width / rect.width)) / CELL_WIDTH);
    const y = Math.floor(((clientY - rect.top) * (canvas.height / rect.height)) / CELL_HEIGHT);
    
    Parser.setTouchState(isActive ? 1 : 0, x, y);
};

monitor.addEventListener('mousedown', (e) => {
    if (!document.body.classList.contains('pad-active')) overlay.focus();
    handlePointer(e, true);
});

monitor.addEventListener('touchstart', (e) => { 
    if (document.body.classList.contains('pad-active')) e.preventDefault(); 
    handlePointer(e, true); 
}, { passive: false });

monitor.addEventListener('touchend', (e) => {
    e.preventDefault(); 
    overlay.focus();
    Parser.setTouchState(0, Parser.touchX, Parser.touchY);
}, { passive: false });

// ==========================================
// DRAG AND DROP INSTALLATION
// ==========================================
window.addEventListener('dragover', (e) => { 
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'copy'; 
});

window.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = ev => Kernel.processImport(ev.target.result, file.name);
    reader.readAsText(file);
});

// ==========================================
// MAIN RENDER LOOP (60 FPS)
// ==========================================
function render() {
    if (Parser.isRunning) {
        for (let i = 0; i < 20 && Parser.isRunning && !Parser.waitingForTimer && !Parser.waitingForInput; i++) {
            Parser.executeStep();
        }
    }
    
    ctx.fillStyle = Parser.systemBgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = `${Parser.fontStyle} ${Parser.fontWeight} 16px "${Parser.fontFamily}"`;
    ctx.textBaseline = "top";
    
    for (let y = 0; y < Parser.rows; y++) {
        const cy = y * CELL_HEIGHT;
        for (let x = 0; x < Parser.cols; x++) {
            const cx = x * CELL_WIDTH;
            const cell = Parser.vram[Parser.getIndex(x, y)];
            
            if (cell.bg !== Parser.systemBgColor) {
                ctx.fillStyle = cell.bg;
                ctx.fillRect(cx, cy, CELL_WIDTH, CELL_HEIGHT);
            }
            
            if (cell.char !== ' ') {
                ctx.fillStyle = cell.fg;
                ctx.fillText(cell.char, cx, cy);
                
                if (Parser.textDecor === 'UNDERLINE') {
                    ctx.fillRect(cx, cy + 17, CELL_WIDTH, 2);
                } else if (Parser.textDecor === 'STRIKE') {
                    ctx.fillRect(cx, cy + 9, CELL_WIDTH, 2);
                }
            }
        }
    }
    
    blinkTimer = (blinkTimer + 1) % 61;
    if (blinkTimer === 30) cursorVisible = !cursorVisible;
    
    if (!Parser.isRunning && cursorVisible) {
        const cx = Parser.cursorX * CELL_WIDTH;
        const cy = Parser.cursorY * CELL_HEIGHT;
        
        ctx.fillStyle = Parser.cursorColor; 
        ctx.fillRect(cx, cy, CELL_WIDTH, CELL_HEIGHT);
        
        const cell = Parser.vram[Parser.getIndex(Parser.cursorX, Parser.cursorY)];
        if (cell && cell.char !== ' ') {
            ctx.fillStyle = Parser.systemBgColor;
            ctx.fillText(cell.char, cx, cy);
        }
    }
    
    requestAnimationFrame(render);
}

render();