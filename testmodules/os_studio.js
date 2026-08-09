import { RAM } from './os_memory.js';

export const STUDIO = {
    isOpen: false, wasRunning: false,
    
    activeMode: 'SPRITE', bitMode: 8,           
    activeSubView: 1, // NEW: 1=Canvas, 2=Palette/Tools, 3=Bank
    
    activeColor: 1, activeSprite: 0, activeMap: 0,         
    activeSfx: 0, activeMusic: 0, musicStamp: -1, 
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
        
        if (!this.palette256) this.palette256 = this.generate256Palette();

        // Global Mouse/Key listeners for the Studio
        window.addEventListener('mouseup', () => { this.isDrawing = false; });
        
        window.addEventListener('keydown', (e) => {
            if (!this.isOpen || e.target.tagName === 'INPUT') return;
            if (['1', '2', '3'].includes(e.key)) {
                e.preventDefault();
                this.activeSubView = parseInt(e.key);
                this.buildUI();
            }
        });
    },

    toggle(targetMode = 'SPRITE') {
        this.isOpen = !this.isOpen;
        this.overlay.style.display = this.isOpen ? "flex" : "none";
        
        if (this.isOpen) {
            this.activeMode = targetMode;
            this.activeSubView = 1; // Always reset to Canvas view on mode swap
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
        const colors = this.bitMode === 8 ? this.palette8 : this.palette256;

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

    // UI Helper: Builds the shared navigation bar
    buildTopBar(title, theme, t1, t2, t3) {
        return `
            <div style="background: #111; border-bottom: 2px solid #333; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                <div style="color: ${theme}; font-weight: bold; font-size: 20px; letter-spacing: 1px;">${title}</div>
                <div style="display: flex; gap: 10px;">
                    <div class="nav-tab" data-tab="1" style="padding: 8px 15px; cursor: pointer; background: ${this.activeSubView === 1 ? theme : '#000'}; color: ${this.activeSubView === 1 ? '#000' : '#888'}; border: 2px solid #333; border-radius: 6px; font-weight: bold;">[1] ${t1}</div>
                    <div class="nav-tab" data-tab="2" style="padding: 8px 15px; cursor: pointer; background: ${this.activeSubView === 2 ? theme : '#000'}; color: ${this.activeSubView === 2 ? '#000' : '#888'}; border: 2px solid #333; border-radius: 6px; font-weight: bold;">[2] ${t2}</div>
                    <div class="nav-tab" data-tab="3" style="padding: 8px 15px; cursor: pointer; background: ${this.activeSubView === 3 ? theme : '#000'}; color: ${this.activeSubView === 3 ? '#000' : '#888'}; border: 2px solid #333; border-radius: 6px; font-weight: bold;">[3] ${t3}</div>
                </div>
            </div>
        `;
    },

    setupNav() {
        document.querySelectorAll('.nav-tab').forEach(el => {
            el.onclick = (e) => { this.activeSubView = parseInt(e.target.dataset.tab); this.buildUI(); };
        });
    },

    // ==========================================
    // 1. SPRITE EDITOR
    // ==========================================
    buildSpriteEditor() {
        const theme = '#FFB000';
        let html = this.buildTopBar('■ SPRITE STUDIO', theme, 'CANVAS', 'PALETTE', 'BANK');
        
        html += `<div style="flex:1; overflow-y:auto; display:flex; flex-direction:column; padding:20px; align-items:center;">`;
        
        if (this.activeSubView === 1) {
            let activeColorHex = this.bitMode === 8 ? this.palette8[this.activeColor] : this.palette256[this.activeColor];
            html += `
                <div style="margin-bottom:15px; color:#888; font-weight:bold; font-size:16px;">SPRITE ID: <span style="color:${theme}">${this.activeSprite}</span> &nbsp;|&nbsp; COLOR: <span style="display:inline-block;width:16px;height:16px;background:${activeColorHex};border:2px solid #FFF;vertical-align:middle;"></span></div>
                <canvas id="sprite-canvas" width="${this.bitMode*20}" height="${this.bitMode*20}" style="width:100%; max-width:65vh; aspect-ratio:1; height:auto; background:#1A1A1A; border:2px solid #444; image-rendering:pixelated; cursor:crosshair; box-shadow:0 0 30px rgba(0,0,0,0.8);"></canvas>
            `;
        } 
        else if (this.activeSubView === 2) {
            html += `
                <div style="font-size:24px; color:${theme}; margin-bottom: 20px; font-weight:bold; margin-top:20px;">ARCHITECTURE</div>
                <div style="display:flex; gap:20px; margin-bottom: 50px;">
                    <button id="btn-8bit" style="padding:15px 40px; font-size:18px; font-weight:bold; background:${this.bitMode===8?theme:'#222'}; color:${this.bitMode===8?'#000':'#888'}; border:2px solid #333; cursor:pointer; border-radius:8px;">8-BIT (16 COLORS)</button>
                    <button id="btn-16bit" style="padding:15px 40px; font-size:18px; font-weight:bold; background:${this.bitMode===16?theme:'#222'}; color:${this.bitMode===16?'#000':'#888'}; border:2px solid #333; cursor:pointer; border-radius:8px;">16-BIT (256 COLORS)</button>
                </div>
                <div style="font-size:24px; color:${theme}; margin-bottom: 20px; font-weight:bold;">ACTIVE PALETTE</div>
                <div id="palette-grid" style="display:grid; grid-template-columns:repeat(16, 1fr); gap:5px; width:100%; max-width:800px;"></div>
            `;
        } 
        else if (this.activeSubView === 3) {
            html += `
                <div style="font-size:24px; color:${theme}; margin-bottom: 30px; font-weight:bold; margin-top:20px;">CARTRIDGE BANK (256 SLOTS)</div>
                <div id="sprite-bank" style="display:grid; grid-template-columns:repeat(16, 1fr); gap:4px; width:100%; max-width: 900px; padding-bottom:40px;"></div>
            `;
        }
        
        html += `</div>`;
        this.overlay.innerHTML = html;
        this.setupNav();

        if (this.activeSubView === 1) {
            this.attachSpriteCanvasEvents();
            this.renderSpriteCanvas();
        } else if (this.activeSubView === 2) {
            document.getElementById('btn-8bit').onclick = () => { this.bitMode = 8; this.buildUI(); };
            document.getElementById('btn-16bit').onclick = () => { this.bitMode = 16; this.buildUI(); };
            this.renderSpritePalette();
        } else if (this.activeSubView === 3) {
            this.renderSpriteBank();
        }
    },

    attachSpriteCanvasEvents() {
        const canvas = document.getElementById('sprite-canvas');
        if(!canvas) return;
        const paint = (e) => {
            if (!this.isDrawing) return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = Math.floor(((e.clientX - rect.left) * scaleX) / 20);
            const y = Math.floor(((e.clientY - rect.top) * scaleY) / 20);
            
            if (x >= 0 && x < this.bitMode && y >= 0 && y < this.bitMode) {
                if (!RAM.sprites[this.activeSprite]) RAM.sprites[this.activeSprite] = new Array(this.bitMode * this.bitMode).fill(0);
                RAM.sprites[this.activeSprite][y * this.bitMode + x] = this.activeColor;
                this.renderSpriteCanvas(); 
            }
        };
        canvas.addEventListener('mousedown', (e) => { this.isDrawing = true; paint(e); });
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

    renderSpritePalette() {
        const grid = document.getElementById('palette-grid');
        const colors = this.bitMode === 8 ? this.palette8 : this.palette256;
        let html = '';
        colors.forEach((hex, i) => {
            html += `<div class="palette-swatch" data-idx="${i}" style="aspect-ratio: 1; background: ${hex}; cursor: pointer; border: 2px solid ${this.activeColor === i ? '#FFF' : '#000'}; border-radius:2px;"></div>`;
        });
        grid.innerHTML = html;
        document.querySelectorAll('.palette-swatch').forEach(el => { el.onclick = (e) => { this.activeColor = parseInt(e.target.dataset.idx); this.buildUI(); }; });
    },

    renderSpriteBank() {
        const bank = document.getElementById('sprite-bank');
        let html = '';
        for (let i = 0; i < 256; i++) {
            let isActive = i === this.activeSprite;
            let hasData = RAM.sprites[i] ? true : false;
            html += `<div class="sprite-slot" data-idx="${i}" style="aspect-ratio: 1; background: ${isActive ? '#FFB000' : hasData ? '#222' : '#000'}; border: 2px solid ${isActive ? '#FFF' : '#333'}; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight:bold; color: ${isActive ? '#000' : '#888'}; border-radius:4px;">${i}</div>`;
        }
        bank.innerHTML = html;
        document.querySelectorAll('.sprite-slot').forEach(el => { el.onclick = (e) => { this.activeSprite = parseInt(e.target.dataset.idx); this.activeSubView = 1; this.buildUI(); }; });
    },

    // ==========================================
    // 2. MAP BUILDER
    // ==========================================
    buildMapEditor() {
        const theme = '#00E436';
        let html = this.buildTopBar('▦ MAP BUILDER', theme, 'CANVAS', 'STAMPS', 'SCREENS');
        
        html += `<div style="flex:1; overflow-y:auto; display:flex; flex-direction:column; padding:20px; align-items:center;">`;
        
        if (this.activeSubView === 1) {
            html += `
                <div style="margin-bottom:15px; color:#888; font-weight:bold; font-size:16px;">MAP ID: <span style="color:${theme}">${this.activeMap}</span> &nbsp;|&nbsp; STAMP: <span style="color:${theme}">${this.activeSprite}</span></div>
                <canvas id="map-canvas" width="512" height="512" style="width:100%; max-width:65vh; aspect-ratio:1; height:auto; background:#1A1A1A; border:2px solid #444; image-rendering:pixelated; cursor:crosshair; box-shadow:0 0 30px rgba(0,0,0,0.8);"></canvas>
            `;
        } 
        else if (this.activeSubView === 2) {
            html += `
                <div style="font-size:24px; color:${theme}; margin-bottom: 10px; font-weight:bold; margin-top:20px;">SELECT STAMP (256 SPRITES)</div>
                <div style="margin-bottom: 30px; color:#888;">Note: Slot 0 acts as a transparent eraser.</div>
                <div id="map-sprite-picker" style="display:grid; grid-template-columns:repeat(16, 1fr); gap:4px; width:100%; max-width:900px;"></div>
            `;
        } 
        else if (this.activeSubView === 3) {
            html += `
                <div style="font-size:24px; color:${theme}; margin-bottom: 30px; font-weight:bold; margin-top:20px;">MAP SCREENS (64 BANKS)</div>
                <div id="map-bank" style="display:grid; grid-template-columns:repeat(8, 1fr); gap:8px; width:100%; max-width:700px;"></div>
            `;
        }
        
        html += `</div>`;
        this.overlay.innerHTML = html;
        this.setupNav();

        if (this.activeSubView === 1) { this.attachMapCanvasEvents(); this.renderMapCanvas(); }
        else if (this.activeSubView === 2) this.renderMapSpritePicker();
        else if (this.activeSubView === 3) this.renderMapBank();
    },

    attachMapCanvasEvents() {
        const canvas = document.getElementById('map-canvas');
        if(!canvas) return;
        const stamp = (e) => {
            if (!this.isDrawing) return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = Math.floor(((e.clientX - rect.left) * scaleX) / (512 / 16));
            const y = Math.floor(((e.clientY - rect.top) * scaleY) / (512 / 16));
            
            if (x >= 0 && x < 16 && y >= 0 && y < 16) {
                if (!RAM.maps[this.activeMap]) RAM.maps[this.activeMap] = new Array(256).fill(0);
                if (RAM.maps[this.activeMap][y * 16 + x] !== this.activeSprite) {
                    RAM.maps[this.activeMap][y * 16 + x] = this.activeSprite;
                    this.renderMapCanvas();   
                }
            }
        };
        canvas.addEventListener('mousedown', (e) => { this.isDrawing = true; stamp(e); });
        canvas.addEventListener('mousemove', stamp);
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

    renderMapSpritePicker() {
        const picker = document.getElementById('map-sprite-picker');
        let html = '';
        for (let i = 0; i < 256; i++) {
            let isActive = i === this.activeSprite;
            let hasData = RAM.sprites[i] ? true : false;
            html += `<div class="map-stamp-slot" data-idx="${i}" style="aspect-ratio: 1; background: ${isActive ? '#00E436' : hasData ? '#222' : '#000'}; border: 2px solid ${isActive ? '#FFF' : '#333'}; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight:bold; color: ${isActive ? '#000' : '#888'}; border-radius:4px;">${i}</div>`;
        }
        picker.innerHTML = html;
        document.querySelectorAll('.map-stamp-slot').forEach(el => { el.onclick = (e) => { this.activeSprite = parseInt(e.target.dataset.idx); this.activeSubView = 1; this.buildUI(); }; });
    },

    renderMapBank() {
        const bank = document.getElementById('map-bank');
        let html = '';
        for (let i = 0; i < 64; i++) {
            let isActive = i === this.activeMap;
            let hasData = RAM.maps[i] ? true : false;
            html += `<div class="map-screen-slot" data-idx="${i}" style="aspect-ratio: 1; background: ${isActive ? '#00E436' : hasData ? '#222' : '#000'}; border: 2px solid ${isActive ? '#FFF' : '#333'}; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; color: ${isActive ? '#000' : '#888'}; border-radius:6px;">${i}</div>`;
        }
        bank.innerHTML = html;
        document.querySelectorAll('.map-screen-slot').forEach(el => { el.onclick = (e) => { this.activeMap = parseInt(e.target.dataset.idx); this.activeSubView = 1; this.buildUI(); }; });
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
                osc.connect(gain); gain.connect(this.audioCtx.destination);
                
                let noteTime = startTime + (i * stepTime);
                gain.gain.setValueAtTime(0.15, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.01, noteTime + (stepTime * 0.9));
                
                osc.start(noteTime); osc.stop(noteTime + stepTime);
            }
        }
    },

    playSfx(sfxId) {
        if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.scheduleSfx(sfxId, this.audioCtx.currentTime); 
    },

    buildSfxEditor() {
        const theme = '#FF004D';
        const sfxData = this._initSfxSlot();
        let html = this.buildTopBar('♫ SFX TRACKER', theme, 'SEQUENCE', 'SYNTH', 'BANK');
        
        html += `<div style="flex:1; overflow-y:auto; display:flex; flex-direction:column; padding:20px; align-items:center;">`;
        
        if (this.activeSubView === 1) {
            html += `
                <div style="margin-bottom:15px; color:#888; font-weight:bold; font-size:16px;">SFX ID: <span style="color:${theme}">${this.activeSfx}</span></div>
                <canvas id="sfx-canvas" width="512" height="512" style="width:100%; max-width:65vh; aspect-ratio:1; height:auto; background:#1A1A1A; border:2px solid #444; cursor:crosshair; box-shadow:0 0 30px rgba(0,0,0,0.8); margin-bottom:20px;"></canvas>
                <button id="btn-play-sfx" style="background:${theme}; color:#FFF; font-weight:bold; font-size:24px; padding:15px 50px; border:none; cursor:pointer; border-radius:8px; box-shadow:0 5px 15px rgba(255,0,77,0.4);">▶ PLAY SOUND</button>
            `;
        } 
        else if (this.activeSubView === 2) {
            html += `
                <div style="font-size:24px; color:${theme}; margin-bottom: 20px; font-weight:bold; margin-top:20px;">WAVEFORM</div>
                <div style="display:flex; gap:20px; margin-bottom: 50px;">
                    ${['square', 'sawtooth', 'triangle'].map(wave => `
                        <button class="wave-btn" data-wave="${wave}" style="padding:15px 40px; font-size:18px; font-weight:bold; background:${sfxData.wave === wave ? theme : '#222'}; color:${sfxData.wave === wave ? '#FFF' : '#888'}; border:2px solid #333; cursor:pointer; border-radius:8px;">${wave.toUpperCase()}</button>
                    `).join('')}
                </div>
                <div style="font-size:24px; color:${theme}; margin-bottom: 20px; font-weight:bold;">PLAYBACK SPEED</div>
                <div style="color:#888; margin-bottom:20px;">1 = FAST (Chiptune) | 20 = SLOW (Atmospheric)</div>
                <input type="range" id="sfx-speed" min="1" max="20" value="${sfxData.speed}" style="width: 100%; max-width: 600px; accent-color: ${theme};">
                <div style="margin-top:20px; font-size: 32px; color: ${theme}; font-weight: bold;" id="sfx-speed-val">${sfxData.speed}</div>
            `;
        } 
        else if (this.activeSubView === 3) {
            html += `
                <div style="font-size:24px; color:${theme}; margin-bottom: 30px; font-weight:bold; margin-top:20px;">SFX BANK (64 SLOTS)</div>
                <div id="sfx-bank" style="display:grid; grid-template-columns:repeat(8, 1fr); gap:8px; width:100%; max-width: 700px;"></div>
            `;
        }
        
        html += `</div>`;
        this.overlay.innerHTML = html;
        this.setupNav();

        if (this.activeSubView === 1) {
            this.attachSfxCanvasEvents(); this.renderSfxCanvas();
            document.getElementById('btn-play-sfx').onclick = () => this.playSfx(this.activeSfx);
        } else if (this.activeSubView === 2) {
            document.querySelectorAll('.wave-btn').forEach(el => { el.onclick = (e) => { sfxData.wave = e.target.dataset.wave; this.buildUI(); }; });
            document.getElementById('sfx-speed').oninput = (e) => { 
                sfxData.speed = parseInt(e.target.value); 
                document.getElementById('sfx-speed-val').innerText = sfxData.speed; 
            };
        } else if (this.activeSubView === 3) {
            this.renderSfxBank();
        }
    },

    attachSfxCanvasEvents() {
        const canvas = document.getElementById('sfx-canvas');
        if(!canvas) return;
        const drawNote = (e) => {
            if (!this.isDrawing) return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = Math.floor(((e.clientX - rect.left) * scaleX) / (512 / 32));
            const y = Math.floor(((e.clientY - rect.top) * scaleY) / (512 / 32));
            if (x >= 0 && x < 32 && y >= 0 && y < 32) {
                const sfxData = this._initSfxSlot();
                sfxData.notes[x] = (31 - y); 
                this.renderSfxCanvas();
            }
        };
        canvas.addEventListener('mousedown', (e) => { this.isDrawing = true; drawNote(e); });
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
        let html = '';
        for (let i = 0; i < 64; i++) {
            let isActive = i === this.activeSfx;
            let hasData = RAM.sfx[i] && RAM.sfx[i].notes.some(n => n > 0);
            html += `<div class="sfx-slot" data-idx="${i}" style="aspect-ratio: 1; background: ${isActive ? '#FF004D' : hasData ? '#311' : '#000'}; border: 2px solid ${isActive ? '#FFF' : '#333'}; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; color: ${isActive ? '#FFF' : '#888'}; border-radius:6px;">${i}</div>`;
        }
        bank.innerHTML = html;
        document.querySelectorAll('.sfx-slot').forEach(el => { el.onclick = (e) => { this.activeSfx = parseInt(e.target.dataset.idx); this.activeSubView = 1; this.buildUI(); }; });
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
        const theme = '#29ADFF';
        const musicData = this._initMusicSlot();
        let html = this.buildTopBar('♬ MUSIC TRACKER', theme, 'TRACKER', 'STAMPS', 'BANK');
        
        html += `<div style="flex:1; overflow-y:auto; display:flex; flex-direction:column; padding:20px; align-items:center;">`;
        
        if (this.activeSubView === 1) {
            html += `
                <div style="margin-bottom:15px; color:#888; font-weight:bold; font-size:16px;">PATTERN ID: <span style="color:${theme}">${this.activeMusic}</span> &nbsp;|&nbsp; STAMP: <span style="color:${theme}">${this.musicStamp >= 0 ? this.musicStamp : '--'}</span></div>
                
                <div style="width: 100%; max-width: 600px; display: flex; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 10px; color: #888; font-size: 16px; font-weight: bold;">
                    <div style="width: 60px; text-align: center;">STEP</div>
                    <div style="flex: 1; text-align: center; color: #FF77A8;">CH 0</div>
                    <div style="flex: 1; text-align: center; color: #FFA300;">CH 1</div>
                    <div style="flex: 1; text-align: center; color: #00E436;">CH 2</div>
                    <div style="flex: 1; text-align: center; color: #29ADFF;">CH 3</div>
                </div>
                
                <div id="music-grid" style="width: 100%; max-width: 600px; flex: 1; overflow-y: auto; background:#080808; border:2px solid #333; padding:10px; margin-bottom:20px;"></div>
                
                <button id="btn-play-music" style="background:${theme}; color:#000; font-weight:bold; font-size:24px; padding:15px 50px; border:none; cursor:pointer; border-radius:8px; box-shadow:0 5px 15px rgba(41,173,255,0.4);">▶ PLAY PATTERN</button>
            `;
        } 
        else if (this.activeSubView === 2) {
            html += `
                <div style="font-size:24px; color:${theme}; margin-bottom: 10px; font-weight:bold; margin-top:20px;">SELECT SFX STAMP</div>
                <div style="margin-bottom: 30px; color:#888;">Select an audio stamp to place on the tracker grid. Click [--] to erase.</div>
                <div id="music-sfx-picker" style="display:grid; grid-template-columns:repeat(8, 1fr); gap:8px; width:100%; max-width:700px;"></div>
            `;
        } 
        else if (this.activeSubView === 3) {
            html += `
                <div style="font-size:24px; color:${theme}; margin-bottom: 20px; font-weight:bold; margin-top:20px;">GLOBAL BPM / SPEED</div>
                <input type="range" id="music-speed" min="1" max="20" value="${musicData.speed}" style="width: 100%; max-width: 600px; accent-color: ${theme};">
                <div style="margin-top:20px; font-size: 32px; color: ${theme}; font-weight: bold;" id="music-speed-val">${musicData.speed}</div>
                
                <div style="font-size:24px; color:${theme}; margin-bottom: 30px; font-weight:bold; margin-top:50px;">MUSIC BANK (16 PATTERNS)</div>
                <div id="music-bank" style="display:grid; grid-template-columns:repeat(8, 1fr); gap:8px; width:100%; max-width:700px;"></div>
            `;
        }
        
        html += `</div>`;
        this.overlay.innerHTML = html;
        this.setupNav();

        if (this.activeSubView === 1) {
            this.renderMusicGrid();
            document.getElementById('btn-play-music').onclick = () => this.playPattern(this.activeMusic);
        } else if (this.activeSubView === 2) {
            this.renderMusicPicker();
        } else if (this.activeSubView === 3) {
            this.renderMusicBank();
            document.getElementById('music-speed').oninput = (e) => { 
                musicData.speed = parseInt(e.target.value); 
                document.getElementById('music-speed-val').innerText = musicData.speed; 
            };
        }
    },

    renderMusicPicker() {
        const picker = document.getElementById('music-sfx-picker');
        let html = `<div class="music-stamp-slot" data-idx="-1" style="aspect-ratio: 1; background: ${this.musicStamp === -1 ? '#29ADFF' : '#222'}; border: 2px solid ${this.musicStamp === -1 ? '#FFF' : '#333'}; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; color: ${this.musicStamp === -1 ? '#000' : '#888'}; border-radius:6px;">--</div>`;
        for (let i = 0; i < 64; i++) {
            let isActive = i === this.musicStamp;
            let hasData = RAM.sfx[i] && RAM.sfx[i].notes.some(n => n > 0);
            html += `<div class="music-stamp-slot" data-idx="${i}" style="aspect-ratio: 1; background: ${isActive ? '#29ADFF' : hasData ? '#124' : '#000'}; border: 2px solid ${isActive ? '#FFF' : '#333'}; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight:bold; color: ${isActive ? '#000' : '#888'}; border-radius:6px;">${i}</div>`;
        }
        picker.innerHTML = html;
        document.querySelectorAll('.music-stamp-slot').forEach(el => { el.onclick = (e) => { this.musicStamp = parseInt(e.target.dataset.idx); this.activeSubView = 1; this.buildUI(); }; });
    },

    renderMusicGrid() {
        const grid = document.getElementById('music-grid');
        const pattern = this._initMusicSlot();
        let html = '';

        for (let r=0; r<32; r++) {
            html += `<div style="display:flex; margin-bottom: 6px; height: 32px;">
                <div style="width:60px; color:#555; text-align:center; line-height: 32px; font-size:16px;">${String(r).padStart(2,'0')}</div>`;
            for (let c=0; c<4; c++) {
                let sfx = pattern.rows[r][c];
                let text = sfx >= 0 ? String(sfx).padStart(2,'0') : '--';
                let color = sfx >= 0 ? '#FFF' : '#333';
                let bg = sfx >= 0 ? '#124' : '#0A0A0A';
                html += `<div class="music-cell" data-r="${r}" data-c="${c}" style="flex: 1; text-align: center; background: ${bg}; color: ${color}; cursor: pointer; border: 2px solid #222; margin: 0 4px; line-height: 28px; font-size:16px; font-weight: bold; border-radius:4px;">${text}</div>`;
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
        let html = '';
        for (let i = 0; i < 16; i++) { 
            let isActive = i === this.activeMusic;
            let hasData = RAM.music[i] ? true : false;
            html += `<div class="music-screen-slot" data-idx="${i}" style="aspect-ratio: 1; background: ${isActive ? '#29ADFF' : hasData ? '#124' : '#000'}; border: 2px solid ${isActive ? '#FFF' : '#333'}; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; color: ${isActive ? '#000' : '#888'}; border-radius:6px;">${i}</div>`;
        }
        bank.innerHTML = html;
        document.querySelectorAll('.music-screen-slot').forEach(el => { el.onclick = (e) => { this.activeMusic = parseInt(e.target.dataset.idx); this.activeSubView = 1; this.buildUI(); }; });
    }
};
