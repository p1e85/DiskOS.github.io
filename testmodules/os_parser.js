import { RAM } from './os_memory.js';
import { APU } from './os_audio.js';
import { GPU } from './os_display.js';
import { CPU } from './os_cpu.js';
import { CLI } from './os_terminal.js';
import { STUDIO } from './os_studio.js';

// API Bridge for backwards compatibility with os_hardware.js and os_kernel.js
export const Parser = {
    // Read-Only State Getters
    get isRunning() { return RAM.isRunning; },
    get waitingForTimer() { return RAM.waitingForTimer; },
    get waitingForInput() { return RAM.waitingForInput; },
    get systemBgColor() { return RAM.systemBgColor; },
    get fontStyle() { return RAM.fontStyle; },
    get fontWeight() { return RAM.fontWeight; },
    get fontFamily() { return RAM.fontFamily; },
    get rows() { return RAM.rows; },
    get cols() { return RAM.cols; },
    get vram() { return RAM.vram; },
    get textDecor() { return RAM.textDecor; },
    get cursorColor() { return RAM.cursorColor; },
    get cursorX() { return RAM.cursorX; },
    get cursorY() { return RAM.cursorY; },
    getIndex: RAM.getIndex.bind(RAM),

    // I/O Routing
    setKeyState: (key, isDown) => { if (key) RAM.keysDown[key.toUpperCase()] = isDown; },
    setTouchState: (active, x, y) => { RAM.touchActive = active; RAM.touchX = x; RAM.touchY = y; },
    
    // Core Engine Loops
    handleKey: CLI.handleKey.bind(CLI),
    pasteFromClipboard: CLI.pasteFromClipboard.bind(CLI),
    executeStep: CPU.executeStep.bind(CPU),
    processFileContent: CLI.processFileContent.bind(CLI),
    printLine: GPU.printLine.bind(GPU)
};

// Boot Sequence
APU.init();
GPU.init();
STUDIO.init();

// =========================================================
// DESKTOP & MOBILE INPUT HANDLING
// =========================================================
const canvas = document.getElementById('screen');
const mobileKeyboard = document.getElementById('mobile-keyboard');

// 1. Desktop Input & Hotkeys
window.addEventListener('keydown', (e) => {
    // THE FIX: If the user is typing inside the hidden mobile keyboard, 
    // or inside the Studio's text boxes, ignore the global window keydown entirely!
    if (e.target === mobileKeyboard || e.target.tagName.toLowerCase() === 'input') {
        return; 
    }

    // Halt running code (PC)
    if (e.key === "End" && RAM.isRunning) {
        RAM.isRunning = false;
        CLI.printLine("?BREAK");
        CLI.printLine("READY.");
        return; 
    }

    // Normal typing (only if not running and studio closed)
    if (!RAM.isRunning && !STUDIO.isOpen) {
        if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
            e.preventDefault();
        }
        
        // Allowed non-character keys
        const isSpecialKey = ["Backspace", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key);
        
        // Filter out mobile predictive text signatures ("Unidentified")
        if (e.key !== "Escape" && e.key !== "Unidentified" && (e.key.length === 1 || isSpecialKey)) {
            CLI.handleKey(e.key);
        }
    }
});

// 2. Mobile Input
if (canvas && mobileKeyboard) {
    // Detect tap type
    canvas.addEventListener('pointerdown', (e) => {
        if (!RAM.isRunning && !STUDIO.isOpen) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            
            const touchX = Math.floor((e.clientX - rect.left) * scaleX);
            const touchY = Math.floor((e.clientY - rect.top) * scaleY);
            
            if (typeof CLI.setCursor === "function") {
                CLI.setCursor(touchX, touchY);
            }
            
            // THE FIX: Only pull up the hidden keyboard if they touched the screen physically.
            // If they clicked with a mouse, blur it so it doesn't double-fire inputs!
            if (e.pointerType === "touch" || e.pointerType === "pen") {
                mobileKeyboard.focus();
            } else {
                mobileKeyboard.blur();
            }
        }
    });

    // Intercept mobile keys
    mobileKeyboard.addEventListener('input', (e) => {
        if (!RAM.isRunning && !STUDIO.isOpen) {
            let val = mobileKeyboard.value;
            if (val.length > 0) {
                let char = val[val.length - 1]; 
                if (char === '\n') CLI.handleKey("Enter");
                else CLI.handleKey(char); 
                
                mobileKeyboard.value = ""; 
            }
        }
    });

    // Catch explicit system keys on mobile
    mobileKeyboard.addEventListener('keydown', (e) => {
        if (!RAM.isRunning && !STUDIO.isOpen) {
            if (e.key === "Backspace" || e.key === "Enter") {
                CLI.handleKey(e.key);
                e.preventDefault(); 
            }
        }
    });

    // 3-Finger Tap to Break Code (Mobile)
    canvas.addEventListener('touchstart', (e) => {
        if (RAM.isRunning && e.touches.length >= 3) {
            RAM.isRunning = false; 
            CLI.printLine("?BREAK");
            CLI.printLine("READY.");
            e.preventDefault(); 
        }
    }, { passive: false });
}