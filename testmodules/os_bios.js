import { RAM } from './os_memory.js';
import { GPU } from './os_display.js';

export const BIOS = {
    isOpen: false,
    activeTab: 0,
    activeSetting: 0,
    wasRunning: false,
    
    tabs: ['HARDWARE', 'MEMORY', 'DISPLAY', 'STORAGE'],
    
    // Default BIOS Settings
    settings: {
        HARDWARE: [
            { id: 'cpu', label: 'CPU CLOCK SPEED', options: ['1 MHz (STRICT)', '4 MHz (TURBO)', 'MAX (UNLOCKED)'], selected: 1 },
            { id: 'crt', label: 'CRT SCANLINES', options: ['OFF', 'SUBTLE', 'HEAVY'], selected: 0 }
        ],
        MEMORY: [
            { id: 'ram', label: 'BASE SYSTEM RAM', options: ['1024K', '4096K', '8192K'], selected: 0 },
            { id: 'cart', label: 'CARTRIDGE ROM', options: ['READ-ONLY', 'READ/WRITE'], selected: 1 }
        ],
        DISPLAY: [
            { id: 'theme', label: 'FIRMWARE THEME', options: ['AMBER', 'PHOSPHOR GREEN', 'ICE BLUE', 'GHOST WHITE'], selected: 0 },
            { id: 'scale', label: 'ASPECT RATIO', options: ['STRETCH', 'PIXEL-PERFECT'], selected: 1 }
        ],
        STORAGE: [
            { id: 'boot', label: 'BOOT SEQUENCE', options: ['FAST BOOT', 'VERBOSE (DEBUG)'], selected: 0 },
            { id: 'drive', label: 'DEFAULT DRIVE', options: ['VIRTUAL (CACHE)', 'PHYSICAL (DEVICE)'], selected: 0 }
        ]
    },

    init() {
        this.overlay = document.createElement('div');
        this.overlay.id = "diskos-bios";
        this.overlay.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: #000000; color: #FFB000; font-family: monospace;
            display: none; flex-direction: column; align-items: center; justify-content: center;
            z-index: 10005; box-sizing: border-box; padding: 20px;
            user-select: none;
        `;
        document.body.appendChild(this.overlay);

        // Global hardware key hook for the BIOS
        window.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;

            e.preventDefault(); // Stop normal engine typing
            e.stopImmediatePropagation();

            const currentTabName = this.tabs[this.activeTab];
            const currentTabSettings = this.settings[currentTabName];

            if (e.key === "Escape") {
                this.saveAndExit();
            }
            else if (e.key === "ArrowUp") {
                if (this.activeSetting > 0) this.activeSetting--;
                this.render();
            }
            else if (e.key === "ArrowDown") {
                if (this.activeSetting < currentTabSettings.length - 1) this.activeSetting++;
                this.render();
            }
            else if (e.key === "ArrowLeft") {
                if (this.activeTab > 0) {
                    this.activeTab--;
                    this.activeSetting = 0;
                    this.render();
                }
            }
            else if (e.key === "ArrowRight") {
                if (this.activeTab < this.tabs.length - 1) {
                    this.activeTab++;
                    this.activeSetting = 0;
                    this.render();
                }
            }
            else if (e.key === "Enter" || e.key === " ") {
                // Cycle the currently selected option
                let setting = currentTabSettings[this.activeSetting];
                setting.selected++;
                if (setting.selected >= setting.options.length) setting.selected = 0;
                this.render();
            }
        }, true); // Use capture phase to intercept before the terminal gets it!
    },

    render() {
        if (!this.isOpen) return;
        
        let html = `
            <div style="width: 100%; max-width: 700px; border: 4px solid #333; padding: 2px; background: #000;">
                <div style="border: 2px solid #555; padding: 20px; display: flex; flex-direction: column; height: 450px;">
                    
                    <!-- HEADER -->
                    <div style="text-align: center; border-bottom: 2px dashed #555; padding-bottom: 15px; margin-bottom: 20px;">
                        <h2 style="margin: 0; font-size: 24px; letter-spacing: 2px; font-weight: bold;">DiskOS UEFI UTILITY V1.8</h2>
                        <div style="font-size: 12px; margin-top: 5px; color: #888;">(C) P1 CREATIONS LLC - SYSTEM CONFIGURATION</div>
                    </div>

                    <!-- TWO-PANE LAYOUT -->
                    <div style="display: flex; flex: 1; gap: 30px;">
                        
                        <!-- LEFT PANE: TABS -->
                        <div style="flex: 1; border-right: 2px dashed #555; padding-right: 20px; display: flex; flex-direction: column; gap: 10px;">
        `;

        // Render Tabs
        this.tabs.forEach((tab, index) => {
            let isActive = (index === this.activeTab);
            html += `
                <div style="
                    padding: 8px 12px; 
                    font-size: 16px; 
                    font-weight: bold;
                    background: ${isActive ? '#FFB000' : 'transparent'};
                    color: ${isActive ? '#000000' : '#FFB000'};
                ">
                    > ${tab}
                </div>
            `;
        });

        html += `
                        </div>
                        
                        <!-- RIGHT PANE: SETTINGS -->
                        <div style="flex: 2; display: flex; flex-direction: column; gap: 15px;">
        `;

        // Render Settings for Active Tab
        const currentTabName = this.tabs[this.activeTab];
        this.settings[currentTabName].forEach((setting, index) => {
            let isSelected = (index === this.activeSetting);
            let optionText = setting.options[setting.selected];
            
            html += `
                <div style="
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center;
                    padding: 8px;
                    border: 1px solid ${isSelected ? '#FFB000' : 'transparent'};
                    background: ${isSelected ? '#111' : 'transparent'};
                ">
                    <span style="font-size: 14px;">${setting.label}</span>
                    <span style="font-size: 14px; font-weight: bold; color: ${isSelected ? '#FFF' : '#FFB000'};">
                        [ ${optionText} ]
                    </span>
                </div>
            `;
        });

        html += `
                        </div>
                    </div>

                    <!-- FOOTER CONTROLS -->
                    <div style="border-top: 2px dashed #555; padding-top: 15px; margin-top: 20px; display: flex; justify-content: space-between; font-size: 12px; color: #888;">
                        <span>ARROWS: NAVIGATE</span>
                        <span>ENTER/SPACE: CHANGE VALUE</span>
                        <span>ESC: SAVE & REBOOT</span>
                    </div>

                </div>
            </div>
        `;

        this.overlay.innerHTML = html;
    },

    toggle() {
        this.isOpen = !this.isOpen;
        this.overlay.style.display = this.isOpen ? "flex" : "none";
        
        if (this.isOpen) {
            this.wasRunning = RAM.isRunning;
            RAM.isRunning = false; 
            this.render();
        }
    },

    saveAndExit() {
        this.isOpen = false;
        this.overlay.style.display = "none";
        
        // Apply Settings (E.g. Change UI Theme)
        let themeIndex = this.settings['DISPLAY'].find(s => s.id === 'theme').selected;
        if (themeIndex === 0) RAM.systemColor = '#FFB000'; // Amber
        if (themeIndex === 1) RAM.systemColor = '#00FF00'; // Green
        if (themeIndex === 2) RAM.systemColor = '#00FFFF'; // Ice Blue
        if (themeIndex === 3) RAM.systemColor = '#FFFFFF'; // White
        
        // Print reboot sequence to terminal
        GPU.printLine("\nSAVING CMOS TO NVRAM...");
        GPU.printLine("REBOOTING SYSTEM...");
        GPU.printLine("READY.");
        
        if (this.wasRunning) RAM.isRunning = true; 
    }
};