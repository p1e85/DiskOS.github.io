import { RAM } from './os_memory.js';
import { GPU } from './os_display.js';

export const STUDIO = {
    isOpen: false,
    pixels: new Array(64).fill(0),
    map: new Array(256).fill(0), // 16x16 map array
    wasRunning: false,
    
    init() {
        this.overlay = document.createElement('div');
        this.overlay.id = "diskos-studio";
        this.overlay.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: #0000AA; color: #FFF; font-family: monospace;
            display: none; flex-direction: column; align-items: center; justify-content: center;
            z-index: 10000; box-sizing: border-box; overflow-y: auto; padding: 20px;
        `;

        this.overlay.innerHTML = `
            <div style="background:#FFF; color:#000; width:100%; max-width:450px; text-align:center; padding:8px; font-weight:bold; margin-bottom:10px;">
                DISKOS INTEGRATED STUDIO V1.8
            </div>
            
            <div style="display:flex; gap:10px; margin-bottom:20px;">
                <button id="tab-btn-sprite" style="background:#0f0; color:#000; border:2px solid #FFF; padding:5px 15px; font-weight:bold; cursor:pointer;">SPRITE EDITOR</button>
                <button id="tab-btn-map" style="background:#222; color:#FFF; border:2px solid #FFF; padding:5px 15px; font-weight:bold; cursor:pointer;">MAP EDITOR</button>
            </div>
            
            <!-- SPRITE EDITOR TAB -->
            <div id="tab-sprite" style="display:flex; flex-direction:column; align-items:center;">
                <div style="margin-bottom:15px; font-size: 16px;">
                    VAR NAME: <input type="text" id="studio-var" value="SPRITE1" style="background:#000; color:#0f0; border:2px solid #FFF; font-family:monospace; padding:5px; width: 100px; text-transform: uppercase;">
                </div>
                <div id="studio-grid" style="display: grid; grid-template-columns: repeat(8, 30px); gap: 2px; background:#FFF; border:4px solid #FFF; cursor:crosshair;"></div>
                <div style="margin-top:20px; display:flex; gap:10px;">
                    <button id="studio-clear" style="background:#222; color:#FFF; border:2px solid #FFF; padding:10px; cursor:pointer;">CLEAR</button>
                    <button id="studio-save" style="background:#0f0; color:#000; border:2px solid #FFF; padding:10px; cursor:pointer; font-weight:bold;">INJECT SPRITE</button>
                </div>
            </div>

            <!-- MAP EDITOR TAB -->
            <div id="tab-map" style="display:none; flex-direction:column; align-items:center;">
                <div style="display:flex; gap: 15px; margin-bottom:15px; font-size: 16px; align-items:center;">
                    VAR NAME: <input type="text" id="map-var" value="MAP1" style="background:#000; color:#0f0; border:2px solid #FFF; font-family:monospace; padding:5px; width: 80px; text-transform: uppercase;">
                    TILE ID: <input type="number" id="map-tile-id" value="1" min="0" max="99" style="background:#000; color:#0f0; border:2px solid #FFF; font-family:monospace; padding:5px; width: 50px;">
                </div>
                <div id="map-grid" style="display: grid; grid-template-columns: repeat(16, 20px); gap: 1px; background:#FFF; border:4px solid #FFF; cursor:crosshair;"></div>
                <div style="margin-top:20px; display:flex; gap:10px;">
                    <button id="map-clear" style="background:#222; color:#FFF; border:2px solid #FFF; padding:10px; cursor:pointer;">CLEAR</button>
                    <button id="map-save" style="background:#0f0; color:#000; border:2px solid #FFF; padding:10px; cursor:pointer; font-weight:bold;">INJECT MAP</button>
                </div>
            </div>

            <div style="margin-top:20px; color:#CCC;">Press [ESC] to return to OS</div>
        `;

        document.body.appendChild(this.overlay);

        // Tab Switching Hooks
        const tabSprite = document.getElementById('tab-sprite');
        const tabMap = document.getElementById('tab-map');
        const btnSprite = document.getElementById('tab-btn-sprite');
        const btnMap = document.getElementById('tab-btn-map');

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
        // SPRITE EDITOR LOGIC
        // -----------------------------------------
        const grid = document.getElementById('studio-grid');
        grid.addEventListener('contextmenu', e => e.preventDefault()); 

        for (let i = 0; i < 64; i++) {
            let px = document.createElement('div');
            px.style.cssText = `width:30px; height:30px; background:#000; user-select:none;`;
            const paint = (e) => {
                if (e.buttons === 1) { this.pixels[i] = 1; px.style.background = '#0f0'; } 
                else if (e.buttons === 2) { this.pixels[i] = 0; px.style.background = '#000'; }
            };
            px.addEventListener('mousedown', paint); px.addEventListener('mouseenter', paint);
            px.addEventListener('contextmenu', e => e.preventDefault()); 
            grid.appendChild(px);
        }

        document.getElementById('studio-clear').addEventListener('click', () => {
            this.pixels.fill(0); Array.from(grid.children).forEach(px => px.style.background = '#000');
        });

        document.getElementById('studio-save').addEventListener('click', () => {
            const varName = document.getElementById('studio-var').value.toUpperCase();
            RAM.variables[varName] = [...this.pixels];
            GPU.printLine(`\n> STUDIO EXPORT:`); GPU.printLine(`DIM ${varName} 64`);
            GPU.printLine(`VAR ${varName} = [${this.pixels.join(',')}]`); GPU.printLine(`> INJECTED TO MEMORY.`);
            this.toggle(); 
        });

        // -----------------------------------------
        // MAP EDITOR LOGIC
        // -----------------------------------------
        const mapGrid = document.getElementById('map-grid');
        mapGrid.addEventListener('contextmenu', e => e.preventDefault()); 
        const tileInput = document.getElementById('map-tile-id');

        for (let i = 0; i < 256; i++) {
            let cell = document.createElement('div');
            cell.style.cssText = `width:20px; height:20px; background:#000; color:#FFF; font-size:10px; display:flex; align-items:center; justify-content:center; user-select:none;`;
            cell.innerText = "0";

            const paintMap = (e) => {
                let tileId = parseInt(tileInput.value) || 0;
                if (e.buttons === 1) { 
                    this.map[i] = tileId; 
                    cell.innerText = tileId;
                    cell.style.background = tileId > 0 ? '#333' : '#000';
                    cell.style.color = tileId > 0 ? '#0f0' : '#FFF';
                } 
                else if (e.buttons === 2) { 
                    this.map[i] = 0; cell.innerText = "0"; 
                    cell.style.background = '#000'; cell.style.color = '#FFF';
                }
            };
            cell.addEventListener('mousedown', paintMap); cell.addEventListener('mouseenter', paintMap);
            cell.addEventListener('contextmenu', e => e.preventDefault()); 
            mapGrid.appendChild(cell);
        }

        document.getElementById('map-clear').addEventListener('click', () => {
            this.map.fill(0); 
            Array.from(mapGrid.children).forEach(cell => { 
                cell.innerText = "0"; cell.style.background = '#000'; cell.style.color = '#FFF'; 
            });
        });

        document.getElementById('map-save').addEventListener('click', () => {
            const varName = document.getElementById('map-var').value.toUpperCase();
            RAM.variables[varName] = [...this.map];
            GPU.printLine(`\n> MAP EXPORT:`); GPU.printLine(`DIM ${varName} 256`);
            GPU.printLine(`VAR ${varName} = [${this.map.join(',')}]`); GPU.printLine(`> INJECTED TO MEMORY.`);
            this.toggle(); 
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