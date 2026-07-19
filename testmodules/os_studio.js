import { RAM } from './os_memory.js';
import { GPU } from './os_display.js';

// Default Factory Palettes
const PRESETS = {
    ARCADE: ['#000000', '#1A1A24', '#555555', '#FFFFFF', '#FF0044', '#FF5500', '#FFDD00', '#00FF00', '#00FFFF', '#0088FF', '#0000FF', '#7700FF', '#FF00FF', '#FFAABB', '#AA7744', '#00FA9A'],
    COMMODORE: ['#000000', '#FFFFFF', '#880000', '#AAFFEE', '#CC44CC', '#00CC55', '#0000AA', '#EEEE77', '#DD8855', '#664400', '#FF7777', '#333333', '#777777', '#AAFF66', '#0088FF', '#BBBBBB']
};

export const STUDIO = {
    isOpen: false,
    activeColor: 3, // Default to White
    currentSpriteId: 0,
    wasRunning: false,
    
    init() {
        this.overlay = document.createElement('div');
        this.overlay.id = "diskos-studio";
        this.overlay.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: #0000AA; color: #FFF; font-family: monospace;
            display: none; flex-direction: column; align-items: center; justify-content: flex-start;
            z-index: 10000; box-sizing: border-box; overflow-y: auto; padding: 40px 20px;
        `;

        this.overlay.innerHTML = `
            <div style="background:#FFF; color:#000; width:100%; max-width:450px; text-align:center; padding:8px; font-weight:bold; margin-bottom:10px;">
                DISKOS STUDIO KIT V2.1
            </div>
            
            <div style="display:flex; gap:10px; margin-bottom:20px;">
                <button id="tab-btn-sprite" style="background:#0f0; color:#000; border:2px solid #FFF; padding:5px 15px; font-weight:bold; cursor:pointer;">SPRITE EDITOR</button>
                <button id="tab-btn-map" style="background:#222; color:#FFF; border:2px solid #FFF; padding:5px 15px; font-weight:bold; cursor:pointer;">MAP EDITOR</button>
            </div>
            
            <!-- SPRITE EDITOR TAB -->
            <div id="tab-sprite" style="display:flex; flex-direction:column; align-items:center; width:100%; max-width: 320px;">
                
                <div style="margin-bottom:15px; font-size: 16px; display:flex; align-items:center; gap: 10px;">
                    SPRITE ID: <input type="number" id="sprite-id" value="0" min="0" max="255" style="background:#000; color:#0f0; border:2px solid #FFF; font-family:monospace; padding:5px; width: 60px;">
                </div>

                <!-- 16-Color Palette Picker -->
                <div id="palette-picker" style="display:grid; grid-template-columns: repeat(8, 1fr); gap:4px; margin-bottom: 15px; width: 100%;"></div>

                <!-- Palette Customization Tools -->
                <div style="width: 100%; background: #222; border: 2px solid #FFF; padding: 10px; box-sizing: border-box; margin-bottom: 15px; display: flex; flex-direction: column; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                        <span>EDIT COLOR:</span>
                        <input type="color" id="color-editor" style="cursor:pointer; width:50px; height:25px; border:1px solid #FFF; padding:0;">
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                        <span>PRESET:</span>
                        <select id="palette-preset" style="background:#000; color:#0f0; border:1px solid #FFF; padding:2px; font-family:monospace;">
                            <option value="ARCADE">Arcade-16</option>
                            <option value="COMMODORE">Commodore-16</option>
                        </select>
                    </div>
                    <div style="display: flex; gap: 5px; justify-content: space-between;">
                        <button id="btn-load-pal" style="background:#000; color:#FFF; border:1px solid #FFF; cursor:pointer; flex:1; font-size:10px; padding:5px;">LOAD .diskPalette</button>
                        <button id="btn-save-pal" style="background:#000; color:#FFF; border:1px solid #FFF; cursor:pointer; flex:1; font-size:10px; padding:5px;">SAVE .diskPalette</button>
                    </div>
                </div>

                <!-- Drawing Grid -->
                <div id="studio-grid" style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; background:#FFF; border:4px solid #FFF; width: 100%; max-width: 280px; aspect-ratio: 1/1; cursor:crosshair;"></div>
                
                <div style="margin-top:20px; display:flex; gap:10px;">
                    <button id="studio-clear" style="background:#222; color:#FFF; border:2px solid #FFF; padding:10px; cursor:pointer;">CLEAR SPRITE</button>
                </div>
            </div>

            <!-- MAP EDITOR TAB -->
            <div id="tab-map" style="display:none; flex-direction:column; align-items:center;">
                <div style="display:flex; gap: 15px; margin-bottom:15px; font-size: 16px; align-items:center;">
                    TILE ID: <input type="number" id="map-tile-id" value="1" min="0" max="255" style="background:#000; color:#0f0; border:2px solid #FFF; font-family:monospace; padding:5px; width: 50px;">
                </div>
                <div id="map-grid" style="display: grid; grid-template-columns: repeat(16, 1fr); gap: 1px; background:#FFF; border:4px solid #FFF; width: 100%; max-width: 360px; aspect-ratio: 1/1; cursor:crosshair;"></div>
                <div style="margin-top:20px; display:flex; gap:10px;">
                    <button id="map-clear" style="background:#222; color:#FFF; border:2px solid #FFF; padding:10px; cursor:pointer;">CLEAR MAP</button>
                </div>
            </div>

            <div style="margin-top:20px; color:#CCC;">Auto-saves to VRAM. Press [ESC] to return.</div>
        `;

        document.body.appendChild(this.overlay);

        // Tab Hookups
        const tabSprite = document.getElementById('tab-sprite'), tabMap = document.getElementById('tab-map');
        const btnSprite = document.getElementById('tab-btn-sprite'), btnMap = document.getElementById('tab-btn-map');

        btnSprite.addEventListener('click', () => {
            tabSprite.style.display = 'flex'; tabMap.style.display = 'none';
            btnSprite.style.background = '#0f0'; btnSprite.style.color = '#000';
            btnMap.style.background = '#222'; btnMap.style.color = '#FFF';
        });

        btnMap.addEventListener('click', () => {
            tabSprite.style.display = 'none'; tabMap.style.display = 'flex';
            btnMap.style.background = '#0f0'; btnMap.style.color = '#000';
            btnSprite.style.background = '#222'; btnSprite.style.color = '#FFF';
        });

        // -----------------------------------------
        // SPRITE & PALETTE LOGIC
        // -----------------------------------------
        const palettePicker = document.getElementById('palette-picker');
        const grid = document.getElementById('studio-grid');
        const colorEditor = document.getElementById('color-editor');
        
        // Refresh Palette Swatches
        const renderPaletteUI = () => {
            palettePicker.innerHTML = "";
            if (!RAM.cart || !RAM.cart.palette) return;

            RAM.cart.palette.forEach((hex, index) => {
                let swatch = document.createElement('div');
                swatch.style.cssText = `width:100%; aspect-ratio: 1/1; background:${hex}; cursor:pointer; border: 2px solid ${index === this.activeColor ? '#FFF' : '#000'};`;
                swatch.addEventListener('click', () => {
                    this.activeColor = index;
                    colorEditor.value = RAM.cart.palette[index]; // Update hex editor
                    renderPaletteUI();
                });
                palettePicker.appendChild(swatch);
            });
            colorEditor.value = RAM.cart.palette[this.activeColor];
        };

        // Load Sprite into Grid
        const loadSpriteToGrid = () => {
            const spriteData = RAM.cart.sprites[this.currentSpriteId];
            Array.from(grid.children).forEach((px, i) => {
                px.style.background = RAM.cart.palette[spriteData[i]];
            });
        };

        // Initialize Palette & Editor
        renderPaletteUI();

        // Color Hex Editor Event
        colorEditor.addEventListener('input', (e) => {
            RAM.cart.palette[this.activeColor] = e.target.value.toUpperCase();
            renderPaletteUI();
            loadSpriteToGrid(); // Instantly update active sprite drawing
        });

        // Preset Dropdown Event
        document.getElementById('palette-preset').addEventListener('change', (e) => {
            RAM.cart.palette = [...PRESETS[e.target.value]];
            renderPaletteUI();
            loadSpriteToGrid();
        });

        // Save .diskPalette
        document.getElementById('btn-save-pal').addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(RAM.cart.palette));
            const dl = document.createElement('a');
            dl.setAttribute("href", dataStr);
            dl.setAttribute("download", "custom.diskPalette");
            document.body.appendChild(dl); dl.click(); dl.remove();
        });

        // Load .diskPalette
        document.getElementById('btn-load-pal').addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file'; input.accept = '.diskPalette';
            input.onchange = e => {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.readAsText(file, 'UTF-8');
                reader.onload = readerEvent => {
                    try {
                        const content = JSON.parse(readerEvent.target.result);
                        if(Array.isArray(content) && content.length === 16) {
                            RAM.cart.palette = content;
                            renderPaletteUI(); loadSpriteToGrid();
                        } else alert("Invalid .diskPalette format.");
                    } catch(err) { alert("Failed to parse file."); }
                }
            };
            input.click();
        });

        grid.addEventListener('contextmenu', e => e.preventDefault()); 

        // Build 8x8 Sprite Grid
        for (let i = 0; i < 64; i++) {
            let px = document.createElement('div');
            // This was the offending line! It now uses RAM.cart safely.
            px.style.cssText = `width:100%; height:100%; background:${RAM.cart.palette[0]}; user-select:none;`;
            
            const paint = (e) => {
                if (e.buttons === 1) { 
                    RAM.cart.sprites[this.currentSpriteId][i] = this.activeColor; 
                    px.style.background = RAM.cart.palette[this.activeColor]; 
                } 
                else if (e.buttons === 2) { 
                    RAM.cart.sprites[this.currentSpriteId][i] = 0; 
                    px.style.background = RAM.cart.palette[0]; 
                }
            };
            px.addEventListener('mousedown', paint); px.addEventListener('mouseenter', paint);
            px.addEventListener('contextmenu', e => e.preventDefault()); 
            grid.appendChild(px);
        }

        // Sprite ID Input
        document.getElementById('sprite-id').addEventListener('change', (e) => {
            let val = parseInt(e.target.value);
            if (val < 0) val = 0; if (val > 255) val = 255;
            this.currentSpriteId = val; e.target.value = val;
            loadSpriteToGrid();
        });

        document.getElementById('studio-clear').addEventListener('click', () => {
            RAM.cart.sprites[this.currentSpriteId].fill(0); loadSpriteToGrid();
        });

        // -----------------------------------------
        // MAP EDITOR LOGIC 
        // -----------------------------------------
        const mapGrid = document.getElementById('map-grid');
        mapGrid.addEventListener('contextmenu', e => e.preventDefault()); 
        const tileInput = document.getElementById('map-tile-id');

        for (let i = 0; i < 256; i++) {
            let cell = document.createElement('div');
            cell.style.cssText = `width:100%; height:100%; background:#000; color:#FFF; font-size:10px; display:flex; align-items:center; justify-content:center; user-select:none;`;
            cell.innerText = "0";

            const paintMap = (e) => {
                let tileId = parseInt(tileInput.value) || 0;
                if (e.buttons === 1) { 
                    RAM.cart.map[i] = tileId; cell.innerText = tileId;
                    cell.style.background = tileId > 0 ? '#333' : '#000';
                    cell.style.color = tileId > 0 ? '#0f0' : '#FFF';
                } 
                else if (e.buttons === 2) { 
                    RAM.cart.map[i] = 0; cell.innerText = "0"; 
                    cell.style.background = '#000'; cell.style.color = '#FFF';
                }
            };
            cell.addEventListener('mousedown', paintMap); cell.addEventListener('mouseenter', paintMap);
            cell.addEventListener('contextmenu', e => e.preventDefault()); 
            mapGrid.appendChild(cell);
        }

        document.getElementById('map-clear').addEventListener('click', () => {
            RAM.cart.map.fill(0); 
            Array.from(mapGrid.children).forEach(cell => { 
                cell.innerText = "0"; cell.style.background = '#000'; cell.style.color = '#FFF'; 
            });
        });

        // Global Hardware Key Hook
        window.addEventListener('keydown', (e) => {
            if (e.key === "Escape") this.toggle();
        });
    },

    toggle() {
        this.isOpen = !this.isOpen;
        this.overlay.style.display = this.isOpen ? "flex" : "none";
        
        if (this.isOpen) {
            this.wasRunning = RAM.isRunning;
            RAM.isRunning = false; 
        } else {
            if (this.wasRunning) RAM.isRunning = true; 
        }
    }
};