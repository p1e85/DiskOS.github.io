// ==========================================
// SYSTEM VARIABLES & HARDWARE INIT
// ==========================================
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('mobile-keyboard');
const monitor = document.getElementById('monitor');

// The logical grid size. 1280x640 canvas / 20px cells = exactly 64x32 grid.
const CELL_WIDTH = 20; 
const CELL_HEIGHT = 20;

let blinkTimer = 0; 
let cursorVisible = true;

// ==========================================
// MOBILE KEYBOARD TOGGLE
// ==========================================
// Adds a CSS class to the body when the textarea is focused. 
// This shifts the monitor to the top of the screen so the mobile keyboard doesn't cover it.
overlay.addEventListener('focus', () => document.body.classList.add('typing-mode'));
overlay.addEventListener('blur', () => document.body.classList.remove('typing-mode'));

// ==========================================
// PHYSICAL KEYBOARD I/O (DESKTOP)
// ==========================================
window.addEventListener('keydown', (e) => {
    // Prevent default scrolling when using arrow keys or space, but ONLY if a Gamepad is loaded
    if(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        if(document.body.classList.contains('pad-active')) e.preventDefault();
    }
    
    // THE FIX: Let the invisible textarea handle all standard typing!
    // We only step in here for Escape (to break code) and hardware states for games
    if (e.key === "Escape") Parser.handleKey(e.key);
    
    Parser.setKeyState(e.key, true); // Used for BTN_ checks in code
});

window.addEventListener('keyup', (e) => { Parser.setKeyState(e.key, false); });

// ==========================================
// MOUSE & TOUCH MATH ROUTING
// ==========================================
// Translates raw pixel coordinates from the screen into our 64x32 grid coordinates
function handlePointer(e, isActive) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Handle both touch objects and mouse events
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    let x = (clientX - rect.left) * scaleX;
    let y = (clientY - rect.top) * scaleY;
    
    // Send the grid coordinates to the Parser so games can use TOUCH_X and TOUCH_Y
    Parser.setTouchState(isActive ? 1 : 0, Math.floor(x / CELL_WIDTH), Math.floor(y / CELL_HEIGHT));
}

// DESKTOP CLICKS: Click monitor to focus the hidden text area
monitor.addEventListener('mousedown', (e) => {
    if (!document.body.classList.contains('pad-active')) overlay.focus();
    handlePointer(e, true);
});

// MOBILE TOUCH: Prevent default to stop zooming/scrolling, but ONLY if a gamepad game is running
monitor.addEventListener('touchstart', (e) => { 
    if (document.body.classList.contains('pad-active')) e.preventDefault(); 
    handlePointer(e, true); 
}, {passive: false});

// MOBILE TOUCH END: Kill the "Ghost Click" by preventing default behavior, and ensure keyboard stays open
monitor.addEventListener('touchend', (e) => {
    e.preventDefault(); 
    overlay.focus();
    Parser.setTouchState(0, Parser.touchX, Parser.touchY);
}, {passive: false});

// ==========================================
// TEXTAREA INPUT AND NATIVE PASTE
// ==========================================

// 1. Intercept native OS Paste events (from keyboard buttons or long presses)
overlay.addEventListener('paste', (e) => {
    e.preventDefault();
    let pasteText = (e.clipboardData || window.clipboardData).getData('text');
    Parser.pasteFromClipboard(pasteText);
    overlay.value = ""; // Immediately clear the HTML textarea so it doesn't get clogged
});

// 2. Intercept active typing (character by character) or fallback bulk pasting
overlay.addEventListener('input', (e) => {
    let val = e.target.value;
    if (val.length > 0) {
        if (val.length === 1) {
            // Standard typing: send single key to the OS
            Parser.handleKey(val);
        } else {
            // Bulk paste detected via standard input field
            Parser.pasteFromClipboard(val);
        }
        overlay.value = ""; // Clear buffer
    }
});

// 3. Catch structural keys (Enter/Backspace) which don't trigger standard "input" events well
overlay.addEventListener('keydown', (e) => {
    if (e.key === "Enter" || e.key === "Backspace") {
        e.preventDefault(); // Stop the textarea from physically creating newlines in the HTML
        Parser.handleKey(e.key);
    }
});

// ==========================================
// PERSISTENT FOCUS (DEAD-MAN'S SWITCH)
// ==========================================
// Hack to stop mobile keyboards from minimizing during heavy Canvas render loops

// Recover focus instantly if the keyboard tries to close while typing-mode is active
overlay.addEventListener('blur', () => {
    if (document.body.classList.contains('typing-mode')) {
        setTimeout(() => overlay.focus({ preventScroll: true }), 50);
    }
});

// Check twice a second to guarantee the invisible text area remains the active element
setInterval(() => {
    if (document.activeElement !== overlay) overlay.focus({ preventScroll: true });
}, 500);

// ==========================================
// DRAG AND DROP INSTALLATION (.diskROM)
// ==========================================
window.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
        const reader = new FileReader();
        // Send the raw text of the dropped file directly into the Kernel
        reader.onload = event => { Kernel.processImport(event.target.result, e.dataTransfer.files[0].name); };
        reader.readAsText(e.dataTransfer.files[0]);
    }
});

// ==========================================
// MAIN RENDER LOOP (60 FPS)
// ==========================================
function render() {
    // 1. EXECUTE CODE: If a program is running, execute 20 commands per frame before drawing
    if (Parser.isRunning) {
        for(let i=0; i < 20; i++) {
            if(!Parser.isRunning || Parser.waitingForTimer) break;
            Parser.executeStep();
        }
    }
    
    // 2. CLEAR CANVAS: Paint the entire screen black for a fresh frame
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 3. SET FONT: Use crisp Retina scaling
    ctx.font = "bold 16px monospace";
    ctx.textBaseline = "top";
    
    // 4. DRAW VRAM: Loop through all 2048 cells (64x32 grid)
    for (let y = 0; y < Parser.rows; y++) {
        for (let x = 0; x < Parser.cols; x++) {
            let idx = Parser.getIndex(x, y);
            let cell = Parser.vram[idx];
            
            // Draw Background color block
            if (cell.bg !== '#000000') {
                ctx.fillStyle = cell.bg;
                ctx.fillRect(x * CELL_WIDTH, y * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
            }
            // Draw Foreground text character
            if (cell.char !== ' ') {
                ctx.fillStyle = cell.fg;
                ctx.fillText(cell.char, x * CELL_WIDTH, y * CELL_HEIGHT);
            }
        }
    }
    
    // 5. DRAW CURSOR: Blinks the cursor block every 30 frames if sitting at the READY prompt
    blinkTimer++;
    if (blinkTimer > 30) { cursorVisible = !cursorVisible; blinkTimer = 0; }
    
    if (!Parser.isRunning && cursorVisible) {
        // Draw amber block
        ctx.fillStyle = "#FFB000"; 
        ctx.fillRect(Parser.cursorX * CELL_WIDTH, Parser.cursorY * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
        
        // If the cursor is resting on top of text, redraw that text in black so it stays visible
        let idx = Parser.getIndex(Parser.cursorX, Parser.cursorY);
        if (Parser.vram[idx] && Parser.vram[idx].char !== ' ') {
            ctx.fillStyle = "#000000";
            ctx.fillText(Parser.vram[idx].char, Parser.cursorX * CELL_WIDTH, Parser.cursorY * CELL_HEIGHT);
        }
    }
    
    // 6. LOOP: Request the next frame from the browser
    requestAnimationFrame(render);
}

// Boot the loop
render();
