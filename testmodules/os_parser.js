import { RAM } from './os_memory.js';
import { APU } from './os_audio.js';
import { GPU } from './os_display.js';
import { CPU } from './os_cpu.js';
import { CLI } from './os_terminal.js';

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