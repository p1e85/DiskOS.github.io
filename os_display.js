import { RAM } from './os_memory.js';

export const GPU = {
    resetTheme() {
        RAM.systemColor = RAM.cursorColor = '#FFB000';
        RAM.systemBgColor = '#000000';
        RAM.fontFamily = 'monospace';
        RAM.fontWeight = 'bold';
        RAM.fontStyle = 'normal';
        RAM.textDecor = 'none';
        
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
        RAM.vram = Array.from({ length: RAM.cols * RAM.rows }, () => ({
            char: ' ', fg: RAM.systemColor, bg: RAM.systemBgColor
        }));
        RAM.cursorX = RAM.cursorY = 0;
        this.setPadMode(false); 
        this.printLine("*** DiskOS V1.8 ***\n1024K VIRTUAL DISK MOUNTED\nREADY.");
    },

    printLine(text) {
        for (let i = 0; i < text.length; i++) {
            if (RAM.cursorX >= RAM.cols) { RAM.cursorX = 0; RAM.cursorY++; }
            let idx = RAM.getIndex(RAM.cursorX, RAM.cursorY);
            if (RAM.vram[idx]) {
                RAM.vram[idx].char = text[i] === '\n' ? ' ' : text[i];
                RAM.vram[idx].fg = RAM.systemColor;
            }
            if (text[i] === '\n') { RAM.cursorX = 0; RAM.cursorY++; } 
            else RAM.cursorX++;
        }
        RAM.cursorX = 0; RAM.cursorY++;
        this.checkScroll();
    },

    checkScroll() {
        if (RAM.cursorY < RAM.rows) return;
        const shiftAmt = RAM.cols;
        for (let i = 0; i < RAM.cols * (RAM.rows - 1); i++) {
            const below = RAM.vram[i + shiftAmt];
            RAM.vram[i].char = below.char;
            RAM.vram[i].fg = below.fg;
            RAM.vram[i].bg = below.bg; 
        }
        for (let i = RAM.cols * (RAM.rows - 1); i < RAM.cols * RAM.rows; i++) {
            RAM.vram[i].char = ' ';
            RAM.vram[i].bg = RAM.systemBgColor;
        }
        RAM.cursorY = RAM.rows - 1;
    },

    resolveColor(c) {
        const colors = { RED: "#FF0000", BLUE: "#5C5CFF", AMBER: "#FFB000", GREEN: "#00FF00", BLACK: "#000000", WHITE: "#FFFFFF", YELLOW: "#FFFF00", PURPLE: "#FF00FF", CYAN: "#00FFFF" };
        return !c ? RAM.systemColor : (colors[c.toUpperCase()] || c); 
    }
};