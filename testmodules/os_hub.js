import { RAM } from './os_memory.js';
import { STUDIO } from './os_studio.js';
import { BIOS } from './os_bios.js';

export const HUB = {
    isOpen: false,
    activeIndex: 0,
    wasRunning: false,

    apps: [
        { name: "SPRITE STUDIO", desc: "Design 16-color 8x8 sprites", action: () => STUDIO.toggle('SPRITE') },
        { name: "MAP BUILDER", desc: "Construct 16x16 tilemaps", action: () => STUDIO.toggle('MAP') },
        { name: "SFX TRACKER", desc: "[LOCKED] Audio synthesis utility", action: () => alert("AUDIO TRACKER: COMING SOON!") },
        { name: "RETURN TO OS", desc: "Resume system execution", action: () => HUB.toggle() }
    ],

    init() {
        this.overlay = document.createElement('div');
        this.overlay.id = "diskos-hub";
        this.overlay.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(4px);
            color: #FFF; font-family: monospace;
            display: none; flex-direction: column; align-items: center; justify-content: center;
            z-index: 10010; box-sizing: border-box; user-select: none;
        `;
        document.body.appendChild(this.overlay);

        // Capture ESC globally to open the hub
        window.addEventListener('keydown', (e) => {
            if (e.key === "Escape") {
                // Prevent opening if another full-screen app is already handling it
                if (BIOS.isOpen || STUDIO.isOpen) return; 
                e.preventDefault();
                e.stopImmediatePropagation();
                this.toggle();
            }

            if (!this.isOpen) return;
            e.preventDefault();
            e.stopImmediatePropagation();

            if (e.key === "ArrowUp") {
                if (this.activeIndex > 0) this.activeIndex--;
                this.render();
            }
            else if (e.key === "ArrowDown") {
                if (this.activeIndex < this.apps.length - 1) this.activeIndex++;
                this.render();
            }
            else if (e.key === "Enter" || e.key === " ") {
                let action = this.apps[this.activeIndex].action;
                if (this.activeIndex !== 4) this.toggle(); // Close hub if opening an app
                action();
            }
        }, true); // Capture phase steals the key first!
    },

    render() {
        let html = `
            <div style="width: 400px; border: 2px solid #555; background: #111; padding: 2px; box-shadow: 0px 10px 30px rgba(0,0,0,0.8);">
                <div style="background: #FFB000; color: #000; padding: 10px; text-align: center; font-weight: bold; font-size: 18px; letter-spacing: 2px;">
                    SYSTEM HUB
                </div>
                <div style="padding: 15px; display: flex; flex-direction: column; gap: 5px;">
        `;

        this.apps.forEach((app, index) => {
            let isSelected = (index === this.activeIndex);
            html += `
                <div style="
                    padding: 12px; border: 2px solid ${isSelected ? '#FFB000' : 'transparent'};
                    background: ${isSelected ? '#222' : 'transparent'};
                    color: ${isSelected ? '#FFB000' : '#888'};
                ">
                    <div style="font-size: 16px; font-weight: bold;">${app.name}</div>
                    <div style="font-size: 11px; margin-top: 4px; color: ${isSelected ? '#FFF' : '#555'};">${app.desc}</div>
                </div>
            `;
        });

        html += `
                </div>
                <div style="text-align: center; padding: 10px; font-size: 10px; color: #666; border-top: 1px solid #333;">
                    USE ARROWS TO SELECT, ENTER TO LAUNCH
                </div>
            </div>
        `;
        this.overlay.innerHTML = html;
    },

    toggle() {
        this.isOpen = !this.isOpen;
        this.overlay.style.display = this.isOpen ? "flex" : "none";
        
        if (this.isOpen) {
            this.activeIndex = 0; // Reset selection
            this.wasRunning = RAM.isRunning;
            RAM.isRunning = false; // Pause engine
            this.render();
        } else {
            if (this.wasRunning) RAM.isRunning = true; 
        }
    }
};