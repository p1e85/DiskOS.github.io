// ==========================================
// SYSTEM VARIABLES & HARDWARE INIT
// ==========================================
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('mobile-keyboard');
const monitor = document.getElementById('monitor');

const CELL_WIDTH = 20; 
const CELL_HEIGHT = 20;

let blinkTimer = 0; 
let cursorVisible = true;

// ==========================================
// MOBILE KEYBOARD TOGGLE
// ==========================================
overlay.addEventListener('focus', () => document.body.classList.add('typing-mode'));
overlay.addEventListener('blur', () => document.body.classList.remove('typing-mode'));

// ==========================================
// PHYSICAL KEYBOARD I/O (DESKTOP)
// ==========================================
window.addEventListener('keydown', (e) => {
    if(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        if(document.body.classList.contains('pad-active')) e.preventDefault();
    }
    if (e.key === "Escape") Parser.handleKey(e.key);
    Parser.setKeyState(e.key, true); 
});

window.addEventListener('keyup', (e) => { Parser.setKeyState(e.key, false); });

// ==========================================
// MOUSE & TOUCH MATH ROUTING
// ==========================================
function handlePointer(e, isActive) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    let x = (clientX - rect.left) * scaleX;
    let y = (clientY - rect.top) * scaleY;
    
    Parser.setTouchState(isActive ? 1 : 0, Math.floor(x / CELL_WIDTH), Math.floor(y / CELL_HEIGHT));
}

monitor.addEventListener('mousedown', (e) => {
    if (!document.body.classList.contains('pad-active')) overlay.focus();
    handlePointer(e, true);
});

monitor.addEventListener('touchstart', (e) => { 
    if (document.body.classList.contains('pad-active')) e.preventDefault(); 
    handlePointer(e, true); 
}, {passive: false});

monitor.addEventListener('touchend', (e) => {
    e.preventDefault(); 
    overlay.focus();
    Parser.setTouchState(0, Parser.touchX, Parser.touchY);
}, {passive: false});

// ==========================================
// TEXTAREA INPUT AND NATIVE PASTE
// ==========================================
overlay.addEventListener('paste', (e) => {
    e.preventDefault();
    let pasteText = (e.clipboardData || window.clipboardData).getData('text');
    Parser.pasteFromClipboard(pasteText);
    overlay.value = ""; 
});

overlay.addEventListener('input', (e) => {
    let val = e.target.value;
    if (val.length > 0) {
        if (val.length === 1) {
            Parser.handleKey(val);
        } else {
            Parser.pasteFromClipboard(val);
        }
        overlay.value = ""; 
    }
});

overlay.addEventListener('keydown', (e) => {
    if (e.key === "Enter" || e.key === "Backspace") {
        e.preventDefault(); 
        Parser.handleKey(e.key);
    }
});

// ==========================================
// PERSISTENT FOCUS
// ==========================================
overlay.addEventListener('blur', () => {
    if (document.body.classList.contains('typing-mode')) {
        setTimeout(() => overlay.focus({ preventScroll: true }), 50);
    }
});

setInterval(() => {
    if (document.activeElement !== overlay) overlay.focus({ preventScroll: true });
}, 500);

// ==========================================
// DRAG AND DROP INSTALLATION
// ==========================================
window.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
        const reader = new FileReader();
        reader.onload = event => { Kernel.processImport(event.target.result, e.dataTransfer.files[0].name); };
        reader.readAsText(e.dataTransfer.files[0]);
    }
});

// ==========================================
// MAIN RENDER LOOP (60 FPS)
// ==========================================
function render() {
    if (Parser.isRunning) {
        for(let i=0; i < 20; i++) {
            if(!Parser.isRunning || Parser.waitingForTimer) break;
            Parser.executeStep();
        }
    }
    
    ctx.fillStyle = Parser.systemBgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = `${Parser.fontStyle} ${Parser.fontWeight} 16px "${Parser.fontFamily}"`;
    ctx.textBaseline = "top";
    
    for (let y = 0; y < Parser.rows; y++) {
        for (let x = 0; x < Parser.cols; x++) {
            let idx = Parser.getIndex(x, y);
            let cell = Parser.vram[idx];
            
            if (cell.bg !== Parser.systemBgColor) {
                ctx.fillStyle = cell.bg;
                ctx.fillRect(x * CELL_WIDTH, y * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
            }
            if (cell.char !== ' ') {
                ctx.fillStyle = cell.fg;
                ctx.fillText(cell.char, x * CELL_WIDTH, y * CELL_HEIGHT);
                
                if (Parser.textDecor === 'UNDERLINE') {
                    ctx.fillRect(x * CELL_WIDTH, y * CELL_HEIGHT + 17, CELL_WIDTH, 2);
                } else if (Parser.textDecor === 'STRIKE') {
                    ctx.fillRect(x * CELL_WIDTH, y * CELL_HEIGHT + 9, CELL_WIDTH, 2);
                }
            }
        }
    }
    
    blinkTimer++;
    if (blinkTimer > 30) { cursorVisible = !cursorVisible; blinkTimer = 0; }
    
    if (!Parser.isRunning && cursorVisible) {
        ctx.fillStyle = Parser.cursorColor; 
        ctx.fillRect(Parser.cursorX * CELL_WIDTH, Parser.cursorY * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
        
        let idx = Parser.getIndex(Parser.cursorX, Parser.cursorY);
        if (Parser.vram[idx] && Parser.vram[idx].char !== ' ') {
            ctx.fillStyle = Parser.systemBgColor;
            ctx.fillText(Parser.vram[idx].char, Parser.cursorX * CELL_WIDTH, Parser.cursorY * CELL_HEIGHT);
        }
    }
    
    requestAnimationFrame(render);
}

render();
