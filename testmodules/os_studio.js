import { RAM } from './os_memory.js';

export const STUDIO = {
    isOpen: false, wasRunning: false,
    
    activeMode: 'SPRITE', bitMode: 8,           
    activeColor: 1, activeSprite: 0, activeMap: 0,         
    activeSfx: 0, 
    activeMusic: 0, musicStamp: -1, 
    isDrawing: false,

    palette8: [
        '#000000', '#1D2B53', '#7E2553', '#008751', 
        '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8', 
        '#FF004D', '#FFA300', '#FFEC27', '#00E436', 
        '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA'
    ],

    init() {
        this.overlay = document.createElement('div');
        this.overlay.id = "diskos-studio";
        this.overlay.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: #0A0A0A; color: #FFF; font-family: monospace;
            display: none; flex-direction: column; z-index: 10000;
            user-select: none; box-sizing: border-box;
        `;
        document.body.appendChild(this.overlay);

        if (!RAM.sprites) RAM.sprites = {};
        if (!RAM.maps) RAM.maps = {};
        if (!RAM.sfx) RAM.sfx = {}; 
        if (!RAM.music) RAM.music = {}; 
    },

    toggle(targetMode = 'SPRITE') {
        this.isOpen = !this.isOpen;
        this.overlay.style.display = this.isOpen ? "flex" : "none";
        
        if (this.isOpen) {
            this.activeMode = targetMode;
            this.wasRunning = RAM.isRunning;
            RAM.isRunning = false; 
            this.buildUI();
        } else {
            if (this.wasRunning) RAM.isRunning = true; 
        }
    },

    buildUI() {
        if (this.activeMode === 'SPRITE') this.buildSpriteEditor();
        else if (this.activeMode === 'MAP') this.buildMapEditor();
        else if (this.activeMode === 'SFX') this.buildSfxEditor();
        else if (this.activeMode === 'MUSIC') this.buildMusicEditor();
    },

    generate256Palette() {
        let p = ['#000000']; 
        for(let r=0; r<8; r++) {
            for(let g=0; g<8; g++) {
                for(let b=0; b<4; b++) { p.push(`rgb(${Math.floor(r*255/7)},${Math.floor(g*255/7)},${Math.floor(b*255/3)})`); }
            }
        }
        return p;
    },

    drawSpriteToCtx(ctx, spriteId, destX, destY, destSize) {
        const spriteData = RAM.sprites[spriteId];
        if (!spriteData) return; 
        const res = this.bitMode;
        const pixelSize = destSize / res;
        const colors = this.bitMode === 8 ? this.palette8 : this.generate256Palette();

        for (let y = 0; y < res; y++) {
            for (let x = 0; x < res; x++) {
                let colorIndex = spriteData[y * res + x];
                if (colorIndex && colorIndex > 0) { 
                    ctx.fillStyle = colors[colorIndex];
                    ctx.fillRect(destX + (x * pixelSize), destY + (y * pixelSize), pixelSize, pixelSize);
                }
            }
        }
    },

    // ==========================================
    // 1. SPRITE EDITOR
    // ==========================================
    buildSpriteEditor() {
        const gridRes = this.bitMode; 
        const colors = this.bitMode === 8 ? this.palette8 : this.generate256Palette();
        
        this.overlay.innerHTML = `
            <div style="background: #111; border-bottom: 2px solid #333; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                <div style="color: #FFB000; font-weight: bold; font-size: 18px; letter-spacing: 1px;">■ SPRITE STUDIO</div>
                <div style="display: flex; gap: 10px; background: #000; padding: 5px; border-radius: 4px; border: 1px solid #333;">
                    <div id="btn-8bit" style="padding: 5px 15px; cursor: pointer; background: ${this.bitMode === 8 ? '#FFB000' : 'transparent'}; color: ${this.bitMode === 8 ? '#000' : '#888'}; font-weight: bold;">8-BIT</div>
                    <div id="btn-16bit" style="padding: 5px 15px; cursor: pointer; background: ${this.bitMode === 16 ? '#FFB000' : 'transparent'}; color: ${this.bitMode === 16 ? '#000' : '#888'}; font-weight: bold;">16-BIT</div>
                </div>
            </div>
            <div style="display: flex; flex: 1; overflow: hidden; padding: 20px; gap: 20px; min-height: 0;">
                <div style="width: 250px; flex-shrink: 0; display: flex; flex-direction: column; gap: 20px; overflow-y: auto;">
                    <div style="background: #111; border: 2px solid #333; padding: 10px;">
                        <div style="margin-bottom: 10px; font-size: 12px; color: #888;">COLOR PALETTE</div>
                        <div id="palette-grid" style="display: grid; grid-template-columns: repeat(${this.bitMode === 8 ? 4 : 8}, 1fr); gap: 2px;">
                            ${colors.map((hex, i) => `
                                <div class="palette-swatch" data-idx="${i}" style="aspect-ratio: 1; background: ${hex}; cursor: pointer; border: 2px solid ${this.activeColor === i ? '#FFF' : '#000'};"></div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <!-- RESPONSIVE FIX: width 100%, max-width, height auto -->
                <div style="flex: 1; display: flex; justify-content: center; align-items: center; background: #080808; border: 2px solid #333; min-width: 0;">
                    <canvas id="sprite-canvas" width="${gridRes * 20}" height="${gridRes * 20}" style="width: 100%; max-width: 600px; aspect-ratio: 1; height: auto; background: #1A1A1A; border: 1px solid #444; image-rendering: pixelated; cursor: crosshair; box-shadow: 0 0 20px rgba(0,0,0,0.5);"></canvas>
                </div>
                <div style="width: 300px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; background: #111; border: 2px solid #333; padding: 10px;">
                    <div style="font-size: 12px; color: #888; display: flex; justify-content: space-between;">
                        <span>CARTRIDGE BANK</span><span style="color: #FFB000;">ID: ${this.activeSprite}</span>
                    </div>
                    <div id="sprite-bank" style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; overflow-y: auto; flex: 1; padding-right: 5px;"></div>
                </div>
            </div>
        `;
        this.attachSpriteEvents(); this.renderSpriteBank(); this.renderSpriteCanvas();
    },

    attachSpriteEvents() {
        document.getElementById('btn-8bit').onclick = () => { this.bitMode = 8; this.buildUI(); };
        document.getElementById('btn-16bit').onclick = () => { this.bitMode = 16; this.buildUI(); };

        document.querySelectorAll('.palette-swatch').forEach(el => {
            el.onclick = (e) => { this.activeColor = parseInt(e.target.dataset.idx); this.buildUI(); };
        });

        const canvas = document.getElementById('sprite-canvas');
        const paint = (e) => {
            if (!this.isDrawing) return;
            const rect = canvas.getBoundingClientRect();
            // Mouse math properly accounts for responsive CSS scaling
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = Math.floor(((e.clientX - rect.left) * scaleX) / 20);
            const y = Math.floor(((e.clientY - rect.top) * scaleY) / 20);
            
            if (x >= 0 && x < this.bitMode && y >= 0 && y < this.bitMode) {
                if (!RAM.sprites[this.activeSprite]) RAM.sprites[this.activeSprite] = new Array(this.bitMode * this.bitMode).fill(0);
                RAM.sprites[this.activeSprite][y * this.bitMode + x] = this.activeColor;
                this.renderSpriteCanvas(); this.renderSpriteBank(); 
            }
        };

        canvas.addEventListener('mousedown', (e) => { this.isDrawing = true; paint(e); });
        window.addEventListener('mouseup', () => { this.isDrawing = false; });
        canvas.addEventListener('mousemove', paint);
    },

    renderSpriteCanvas() {
        const canvas = document.getElementById('sprite-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#222'; ctx.lineWidth = 1;
        for (let i = 0; i <= this.bitMode; i++) {
            ctx.beginPath(); ctx.moveTo(i * 20, 0); ctx.lineTo(i * 20, this.bitMode * 20); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i * 20); ctx.lineTo(this.bitMode * 20, i * 20); ctx.stroke();
        }
        this.drawSpriteToCtx(ctx, this.activeSprite, 0, 0, this.bitMode * 20);
    },

    renderSpriteBank() {
        const bank = document.getElementById('sprite-bank');
        if (!bank) return;
        let html = '';
        for (let i = 0; i < 256; i++) {
            let isActive = i === this.activeSprite;
            let hasData = RAM.sprites[i] ? true : false;
            html += `<div class="sprite-slot" data-idx="${i}" style="aspect-ratio: 1; background: ${isActive ? '#FFB000' : hasData ? '#222' : '#000'}; border: 1px solid ${isActive ? '#FFF' : '#333'}; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 8px; color: ${isActive ? '#000' : '#555'};">${i}</div>`;
        }
        bank.innerHTML = html;
        document.querySelectorAll('.sprite-slot').forEach(el => { el.onclick = (e) => { this.activeSprite = parseInt(e.target.dataset.idx); this.buildUI(); }; });
    },

    // ==========================================
    // 2. MAP BUILDER
    // ==========================================
    buildMapEditor() {
        this.overlay.innerHTML = `
            <div style="background: #111; border-bottom: 2px solid #333; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                <div style="color: #00E436; font-weight: bold; font-size: 18px; letter-spacing: 1px;">▦ MAP BUILDER</div>
                <div style="color: #888; font-size: 12px;">16x16 TILE GRID</div>
            </div>
            <div style="display: flex; flex: 1; overflow: hidden; padding: 20px; gap: 20px; min-height: 0;">
                <div style="width: 250px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; background: #111; border: 2px solid #333; padding: 10px;">
                    <div style="font-size: 12px; color: #888; display: flex; justify-content: space-between;">
                        <span>SPRITE STAMP</span><span style="color: #00E436;">ID: ${this.activeSprite}</span>
                    </div>
                    <div id="map-sprite-picker" style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; overflow-y: auto; flex: 1; padding-right: 5px;"></div>
                </div>
                <!-- RESPONSIVE FIX: width 100%, max-width, height auto -->
                <div style="flex: 1; display: flex; justify-content: center; align-items: center; background: #080808; border: 2px solid #333; min-width: 0;">
                    <canvas id="map-canvas" width="512" height="512" style="width: 100%; max-width: 512px; aspect-ratio: 1; height: auto; background: #1A1A1A; border: 1px solid #444; image-rendering: pixelated; cursor: crosshair; box-shadow: 0 0 20px rgba(0,0,0,0.5);"></canvas>
                </div>
                <div style="width: 200px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; background: #111; border: 2px solid #333; padding: 10px;">
                    <div style="font-size: 12px; color: #888; display: flex; justify-content: space-between;">
                        <span>MAP SCREENS</span><span style="color: #00E436;">ID: ${this.activeMap}</span>
                    </div>
                    <div id="map-bank" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; overflow-y: auto; flex: 1; padding-right: 5px;"></div>
                </div>
            </div>
        `;
        this.attachMapEvents(); this.renderMapSpritePicker(); this.renderMapBank(); this.renderMapCanvas();
    },

    attachMapEvents() {
        const canvas = document.getElementById('map-canvas');

        const stamp = (e) => {
            if (!this.isDrawing) return;
            const rect = canvas.getBoundingClientRect();
            // Mouse math properly accounts for responsive CSS scaling
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = Math.floor(((e.clientX - rect.left) * scaleX) / (512 / 16));
            const y = Math.floor(((e.clientY - rect.top) * scaleY) / (512 / 16));
            
            if (x >= 0 && x < 16 && y >= 0 && y < 16) {
                if (!RAM.maps[this.activeMap]) RAM.maps[this.activeMap] = new Array(256).fill(0);
                if (RAM.maps[this.activeMap][y * 16 + x] !== this.activeSprite) {
                    RAM.maps[this.activeMap][y * 16 + x] = this.activeSprite;
                    this.renderMapCanvas(); this.renderMapBank();   
                }
            }
        };

        canvas.addEventListener('mousedown', (e) => { this.isDrawing = true; stamp(e); });
        window.addEventListener('mouseup', () => { this.isDrawing = false; });
        canvas.addEventListener('mousemove', stamp);
    },

    renderMapSpritePicker() {
        const picker = document.getElementById('map-sprite-picker');
        if (!picker) return;
        let html = '';
        for (let i = 0; i < 256; i++) {
            let isActive = i === this.activeSprite;
            let hasData = RAM.sprites[i] ? true : false;
            html += `<div class="map-stamp-slot" data-idx="${i}" style="aspect-ratio: 1; background: ${isActive ? '#00E436' : hasData ? '#222' : '#000'}; border: 1px solid ${isActive ? '#FFF' : '#333'}; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 8px; color: ${isActive ? '#000' : '#555'};">${i}</div>`;
        }
        picker.innerHTML = html;
        document.querySelectorAll('.map-stamp-slot').forEach(el => { el.onclick = (e) => { this.activeSprite = parseInt(e.target.dataset.idx); this.buildUI(); }; });
    },

    renderMapBank() {
        const bank = document.getElementById('map-bank');
        if (!bank) return;
        let html = '';
        for (let i = 0; i < 64; i++) {
            let isActive = i === this.activeMap;
            let hasData = RAM.maps[i] ? true : false;
            html += `<div class="map-screen-slot" data-idx="${i}" style="aspect-ratio: 1; background: ${isActive ? '#00E436' : hasData ? '#222' : '#000'}; border: 1px solid ${isActive ? '#FFF' : '#333'}; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: ${isActive ? '#000' : '#555'};">${i}</div>`;
        }
        bank.innerHTML = html;
        document.querySelectorAll('.map-screen-slot').forEach(el => { el.onclick = (e) => { this.activeMap = parseInt(e.target.dataset.idx); this.buildUI(); }; });
    },

    renderMapCanvas() {
        const canvas = document.getElementById('map-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const tileSize = 512 / 16; 
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#222'; ctx.lineWidth = 1;
        for (let i = 0; i <= 16; i++) {
            ctx.beginPath(); ctx.moveTo(i * tileSize, 0); ctx.lineTo(i * tileSize, 512); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i * tileSize); ctx.lineTo(512, i * tileSize); ctx.stroke();
        }
        const mapData = RAM.maps[this.activeMap] || [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                let spriteId = mapData[y * 16 + x];
                if (spriteId && spriteId > 0) this.drawSpriteToCtx(ctx, spriteId, x * tileSize, y * tileSize, tileSize);
            }
        }
    },

    // ==========================================
    // 3. SFX AUDIO ENGINE 
    // ==========================================
    _initSfxSlot() {
        if (!RAM.sfx[this.activeSfx]) RAM.sfx[this.activeSfx] = { wave: 'square', speed: 10, notes: new Array(32).fill(0) };
        return RAM.sfx[this.activeSfx];
    },

    scheduleSfx(sfxId, startTime) {
        if (!RAM.sfx[sfxId]) return;
        const data = RAM.sfx[sfxId];
        if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        const wave = data.wave || 'square';
        const stepTime = 0.02 * data.speed; 
        
        for (let i = 0; i < 32; i++) {
            let pitch = data.notes[i];
            if (pitch > 0) {
                let osc = this.audioCtx.createOscillator();
                let gain = this.audioCtx.createGain();
                osc.type = wave;
                osc.frequency.value = 130.81 * Math.pow(2, (pitch - 1) / 12);
                
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                
                let noteTime = startTime + (i * stepTime);
                gain.gain.setValueAtTime(0.15, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.01, noteTime + (stepTime * 0.9));
                
                osc.start(noteTime);
                osc.stop(noteTime + stepTime);
            }
        }
    },

    playSfx(sfxId) {
        if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.scheduleSfx(sfxId, this.audioCtx.currentTime); 
    },

    buildSfxEditor() {
        const sfxData = this._initSfxSlot();
        this.overlay.innerHTML = `
            <div style="background: #111; border-bottom: 2px solid #333; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                <div style="color: #FF004D; font-weight: bold; font-size: 18px; letter-spacing: 1px;">♫ SFX TRACKER</div>
                <div style="color: #888; font-size: 12px;">32-STEP SEQUENCER</div>
            </div>
            <div style="display: flex; flex: 1; overflow: hidden; padding: 20px; gap: 20px; min-height: 0;">
                <div style="width: 250px; flex-shrink: 0; display: flex; flex-direction: column; gap: 20px; overflow-y: auto;">
                    <button id="btn-play-sfx" style="background: #FF004D; color: #FFF; font-weight: bold; font-size: 20px; padding: 15px; border: none; cursor: pointer; border-radius: 4px;">▶ PLAY SFX</button>
                    <div style="background: #111; border: 2px solid #333; padding: 10px;">
                        <div style="margin-bottom: 10px; font-size: 12px; color: #888;">WAVEFORM</div>
                        <div style="display: flex; flex-direction: column; gap: 5px;">
                            ${['square', 'sawtooth', 'triangle'].map(wave => `<div class="wave-btn" data-wave="${wave}" style="background: ${sfxData.wave === wave ? '#FF004D' : '#000'}; color: ${sfxData.wave === wave ? '#FFF' : '#888'}; padding: 8px; text-align: center; cursor: pointer; border: 1px solid #333;">${wave.toUpperCase()}</div>`).join('')}
                        </div>
                    </div>
                    <div style="background: #111; border: 2px solid #333; padding: 10px;">
                        <div style="margin-bottom: 10px; font-size: 12px; color: #888;">SPEED (1=FAST, 20=SLOW)</div>
                        <input type="range" id="sfx-speed" min="1" max="20" value="${sfxData.speed}" style="width: 100%; accent-color: #FF004D;">
                    </div>
                </div>
                <!-- RESPONSIVE FIX: width 100%, max-width, height auto -->
                <div style="flex: 1; display: flex; justify-content: center; align-items: center; background: #080808; border: 2px solid #333; min-width: 0;">
                    <canvas id="sfx-canvas" width="512" height="512" style="width: 100%; max-width: 512px; aspect-ratio: 1; height: auto; background: #1A1A1A; border: 1px solid #444; cursor: crosshair; box-shadow: 0 0 20px rgba(0,0,0,0.5);"></canvas>
                </div>
                <div style="width: 200px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; background: #111; border: 2px solid #333; padding: 10px;">
                    <div style="font-size: 12px; color: #888; display: flex; justify-content: space-between;">
                        <span>SFX BANK</span><span style="color: #FF004D;">ID: ${this.activeSfx}</span>
                    </div>
                    <div id="sfx-bank" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; overflow-y: auto; flex: 1; padding-right: 5px;"></div>
                </div>
            </div>
        `;
        this.attachSfxEvents(); this.renderSfxBank(); this.renderSfxCanvas();
    },

    attachSfxEvents() {
        const sfxData = this._initSfxSlot();
        document.getElementById('btn-play-sfx').onclick = () => this.playSfx(this.activeSfx);
        document.querySelectorAll('.wave-btn').forEach(el => { el.onclick = (e) => { sfxData.wave = e.target.dataset.wave; this.buildUI(); }; });
        document.getElementById('sfx-speed').oninput = (e) => { sfxData.speed = parseInt(e.target.value); };

        const canvas = document.getElementById('sfx-canvas');
        const drawNote = (e) => {
            if (!this.isDrawing) return;
            const rect = canvas.getBoundingClientRect();
            // Mouse math properly accounts for responsive CSS scaling
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = Math.floor(((e.clientX - rect.left) * scaleX) / (512 / 32));
            const y = Math.floor(((e.clientY - rect.top) * scaleY) / (512 / 32));
            if (x >= 0 && x < 32 && y >= 0 && y < 32) {
                sfxData.notes[x] = (31 - y); 
                this.renderSfxCanvas(); this.renderSfxBank();
            }
        };

        canvas.addEventListener('mousedown', (e) => { this.isDrawing = true; drawNote(e); });
        window.addEventListener('mouseup', () => { this.isDrawing = false; });
        canvas.addEventListener('mousemove', drawNote);
    },

    renderSfxCanvas() {
        const canvas = document.getElementById('sfx-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const stepSize = 512 / 32; 

        ctx.clearRect(0, 0, 512, 512);
        ctx.strokeStyle = '#222'; ctx.lineWidth = 1;
        for (let i = 0; i <= 32; i++) {
            ctx.beginPath(); ctx.moveTo(0, i * stepSize); ctx.lineTo(512, i * stepSize); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(i * stepSize, 0); ctx.lineTo(i * stepSize, 512); ctx.stroke();
        }

        const sfxData = this._initSfxSlot();
        for (let x = 0; x < 32; x++) {
            let pitch = sfxData.notes[x];
            if (pitch > 0) { 
                let y = 31 - pitch; 
                ctx.fillStyle = '#FF004D'; ctx.fillRect(x * stepSize, y * stepSize, stepSize, stepSize);
                if (x > 0 && sfxData.notes[x-1] > 0) {
                    let prevY = 31 - sfxData.notes[x-1];
                    ctx.beginPath(); ctx.moveTo((x-1) * stepSize + (stepSize/2), prevY * stepSize + (stepSize/2));
                    ctx.lineTo(x * stepSize + (stepSize/2), y * stepSize + (stepSize/2));
                    ctx.strokeStyle = '#FF77A8'; ctx.lineWidth = 2; ctx.stroke();
                }
            }
        }
    },

    renderSfxBank() {
        const bank = document.getElementById('sfx-bank');
        if (!bank) return;
        let html = '';
        for (let i = 0; i < 64; i++) {
            let isActive = i === this.activeSfx;
            let hasData = RAM.sfx[i] && RAM.sfx[i].notes.some(n => n > 0);
            html += `<div class="sfx-slot" data-idx="${i}" style="aspect-ratio: 1; background: ${isActive ? '#FF004D' : hasData ? '#311' : '#000'}; border: 1px solid ${isActive ? '#FFF' : '#333'}; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: ${isActive ? '#FFF' : '#555'};">${i}</div>`;
        }
        bank.innerHTML = html;
        document.querySelectorAll('.sfx-slot').forEach(el => { el.onclick = (e) => { this.activeSfx = parseInt(e.target.dataset.idx); this.buildUI(); }; });
    },


    // ==========================================
    // 4. MUSIC TRACKER LOGIC 
    // ==========================================
    _initMusicSlot() {
        if (!RAM.music[this.activeMusic]) {
            let rows = [];
            for (let i=0; i<32; i++) rows.push([-1, -1, -1, -1]); 
            RAM.music[this.activeMusic] = { speed: 8, rows: rows };
        }
        return RAM.music[this.activeMusic];
    },

    playPattern(patternId) {
        if (!RAM.music[patternId]) return;
        if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        let now = this.audioCtx.currentTime;
        let pattern = RAM.music[patternId];
        let rowDuration = pattern.speed * 0.05; 
        
        for (let r=0; r<32; r++) {
            let rowTime = now + (r * rowDuration);
            for (let c=0; c<4; c++) {
                let sfxId = pattern.rows[r][c];
                if (sfxId >= 0) {
                    this.scheduleSfx(sfxId, rowTime); 
                }
            }
        }
    },

    buildMusicEditor() {
        const musicData = this._initMusicSlot();

        this.overlay.innerHTML = `
            <div style="background: #111; border-bottom: 2px solid #333; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                <div style="color: #29ADFF; font-weight: bold; font-size: 18px; letter-spacing: 1px;">♬ MUSIC TRACKER</div>
                <div style="color: #888; font-size: 12px;">4-CHANNEL SEQUENCER</div>
            </div>

            <div style="display: flex; flex: 1; overflow: hidden; padding: 20px; gap: 20px; min-height: 0;">
                
                <div style="width: 250px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; background: #111; border: 2px solid #333; padding: 10px;">
                    <div style="font-size: 12px; color: #888; display: flex; justify-content: space-between;">
                        <span>SFX STAMP</span><span style="color: #29ADFF;">ID: ${this.musicStamp >= 0 ? this.musicStamp : '--'}</span>
                    </div>
                    <div style="font-size: 10px; color: #555; text-align: center; margin-bottom: 5px;">CLICK [--] TO ERASE</div>
                    <div id="music-sfx-picker" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; overflow-y: auto; flex: 1; padding-right: 5px;"></div>
                </div>

                <!-- RESPONSIVE FIX: min-width and min-height 0 to force flexbox scrolling properly -->
                <div style="flex: 1; display: flex; flex-direction: column; background: #080808; border: 2px solid #333; padding: 10px; min-width: 0; min-height: 0;">
                    <div style="display: flex; border-bottom: 2px solid #333; padding-bottom: 5px; margin-bottom: 5px; color: #888; font-size: 12px; font-weight: bold; flex-shrink: 0;">
                        <div style="width: 40px; text-align: center;">STEP</div>
                        <div style="flex: 1; text-align: center; color: #FF77A8;">CH 0</div>
                        <div style="flex: 1; text-align: center; color: #FFA300;">CH 1</div>
                        <div style="flex: 1; text-align: center; color: #00E436;">CH 2</div>
                        <div style="flex: 1; text-align: center; color: #29ADFF;">CH 3</div>
                    </div>
                    <div id="music-grid" style="flex: 1; overflow-y: auto; min-height: 0;"></div>
                </div>

                <div style="width: 200px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; background: #111; border: 2px solid #333; padding: 10px;">
                    <button id="btn-play-music" style="background: #29ADFF; color: #000; font-weight: bold; font-size: 18px; padding: 15px; border: none; cursor: pointer; border-radius: 4px;">▶ PLAY PATTERN</button>
                    
                    <div style="background: #000; border: 1px solid #333; padding: 10px; margin-top: 10px;">
                        <div style="margin-bottom: 10px; font-size: 12px; color: #888;">BPM / SPEED (1-20)</div>
                        <input type="range" id="music-speed" min="1" max="20" value="${musicData.speed}" style="width: 100%; accent-color: #29ADFF;">
                    </div>

                    <div style="font-size: 12px; color: #888; display: flex; justify-content: space-between; margin-top: 10px;">
                        <span>MUSIC BANK</span><span style="color: #29ADFF;">ID: ${this.activeMusic}</span>
                    </div>
                    <div id="music-bank" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; overflow-y: auto; flex: 1; padding-right: 5px;"></div>
                </div>
            </div>
        `;

        document.getElementById('btn-play-music').onclick = () => this.playPattern(this.activeMusic);
        document.getElementById('music-speed').oninput = (e) => { musicData.speed = parseInt(e.target.value); };

        this.renderMusicPicker();
        this.renderMusicBank();
        this.renderMusicGrid();
    },

    renderMusicPicker() {
        const picker = document.getElementById('music-sfx-picker');
        if (!picker) return;
        let html = `<div class="music-stamp-slot" data-idx="-1" style="aspect-ratio: 1; background: ${this.musicStamp === -1 ? '#29ADFF' : '#222'}; border: 1px solid ${this.musicStamp === -1 ? '#FFF' : '#333'}; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: ${this.musicStamp === -1 ? '#000' : '#888'};">--</div>`;
        for (let i = 0; i < 64; i++) {
            let isActive = i === this.musicStamp;
            let hasData = RAM.sfx[i] && RAM.sfx[i].notes.some(n => n > 0);
            html += `<div class="music-stamp-slot" data-idx="${i}" style="aspect-ratio: 1; background: ${isActive ? '#29ADFF' : hasData ? '#124' : '#000'}; border: 1px solid ${isActive ? '#FFF' : '#333'}; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px; color: ${isActive ? '#000' : '#555'};">${i}</div>`;
        }
        picker.innerHTML = html;
        document.querySelectorAll('.music-stamp-slot').forEach(el => { el.onclick = (e) => { this.musicStamp = parseInt(e.target.dataset.idx); this.buildUI(); }; });
    },

    renderMusicGrid() {
        const grid = document.getElementById('music-grid');
        if (!grid) return;
        const pattern = this._initMusicSlot();
        let html = '';

        for (let r=0; r<32; r++) {
            html += `<div style="display:flex; margin-bottom: 2px; height: 24px;">
                <div style="width:40px; color:#555; text-align:center; line-height: 24px;">${String(r).padStart(2,'0')}</div>`;
            for (let c=0; c<4; c++) {
                let sfx = pattern.rows[r][c];
                let text = sfx >= 0 ? String(sfx).padStart(2,'0') : '--';
                let color = sfx >= 0 ? '#FFF' : '#333';
                let bg = sfx >= 0 ? '#124' : '#0A0A0A';
                html += `<div class="music-cell" data-r="${r}" data-c="${c}" style="flex: 1; text-align: center; background: ${bg}; color: ${color}; cursor: pointer; border: 1px solid #222; margin: 0 2px; line-height: 22px; font-weight: bold;">${text}</div>`;
            }
            html += `</div>`;
        }
        grid.innerHTML = html;

        document.querySelectorAll('.music-cell').forEach(el => {
            el.onmousedown = (e) => {
                let r = parseInt(e.target.dataset.r);
                let c = parseInt(e.target.dataset.c);
                pattern.rows[r][c] = this.musicStamp; 
                this.renderMusicGrid(); 
            };
        });
    },

    renderMusicBank() {
        const bank = document.getElementById('music-bank');
        if (!bank) return;
        let html = '';
        for (let i = 0; i < 16; i++) { 
            let isActive = i === this.activeMusic;
            let hasData = RAM.music[i] ? true : false;
            html += `<div class="music-screen-slot" data-idx="${i}" style="aspect-ratio: 1; background: ${isActive ? '#29ADFF' : hasData ? '#124' : '#000'}; border: 1px solid ${isActive ? '#FFF' : '#333'}; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: ${isActive ? '#000' : '#555'};">${i}</div>`;
        }
        bank.innerHTML = html;
        document.querySelectorAll('.music-screen-slot').forEach(el => { el.onclick = (e) => { this.activeMusic = parseInt(e.target.dataset.idx); this.buildUI(); }; });
    }
};
