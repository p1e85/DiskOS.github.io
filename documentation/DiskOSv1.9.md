DiskOS v1.9 — The Fantasy Console Update
Release Date: July 21, 2026
Architecture: DiskOS Engine (Web/JS)
Author: P1 Creations

🚀 Overview
DiskOS v1.9 is the largest architectural upgrade in the engine's history. This update transitions DiskOS from a standard retro terminal into a full-fledged Fantasy Console (akin to Pico-8 or TIC-80).

Developers can now write code, draw sprites, design level maps, synthesize sound effects, and sequence multi-channel music tracks entirely within the browser, saving everything into a single, highly portable .diskCART file.

🛠️ The "Big Five" Built-In Applications
The DiskOS System Hub has been overhauled. Pressing ESC at any time now pauses execution and opens the Quick Menu to access the core development suite:

1. Terminal / Code Editor (>_)
The classic DiskOS BASIC prompt.

Handles execution, file management, and memory diagnostics.

Full retained support for .diskCODE, .diskGUI, and .diskPAD raw text manipulation.

2. Sprite Studio (■)
Dynamic Bit-Mode: Toggle between strict 8-Bit limitations (8x8 grid, 16 fixed retro colors) and expanded 16-Bit mode (16x16 grid, 256 VGA-style color palette).

Cartridge Bank: Stores up to 256 unique sprites in memory (RAM.sprites).

Mouse Input: Full click-and-drag drawing support mapped directly to canvas contexts.

3. Map Builder (▦)
Grid System: 16x16 tile environment for rapid level design.

Sprite Stamping: Pulls directly from the 256 Sprite Bank to paint map layouts.

Map Bank: Stores up to 64 distinct map screens (RAM.maps), allowing developers to stitch together massive scrolling worlds.

4. SFX Tracker (♫)
Web Audio API Synth: A native, dependency-free audio synthesizer.

32-Step Sequencer: Click and drag to plot pitch changes over a 32-step timeline.

Waveforms: Selectable Square, Sawtooth, and Triangle oscillators.

Speed Control: Adjustable playback speed (1-20) for rapid chiptune hits or slow atmospheric sweeps.

Audio Bank: Stores up to 64 distinct sound effects (RAM.sfx).

5. Music Tracker (♬)
4-Channel Sequencing: Play basslines, melodies, and percussion simultaneously.

Timeline: 32 rows per pattern. Stamp any of your 64 SFX into the channels.

BPM Control: Dedicated music playback speed multiplier.

Music Bank: Stores up to 16 unique musical patterns (RAM.music).

📁 File System Upgrades
The .diskCART Standard
DiskOS now natively serializes all creative assets alongside code. Using the SAVE [FILENAME].diskCART command will compile the entire memory state into a single text-based JSON payload.

Cartridge Payload Structure:

Plaintext
TYPE: diskCART
COMPATIBILITY: V1.9
---
10 PRINT "HELLO WORLD"
20 PLAY_MUSIC 0
===SPRITES===
{"0":[0,1,1,0...], "1":[...]}
===MAPS===
{"0":[1,1,2,2...], "1":[...]}
===SFX===
{"0":{"wave":"square","speed":10,"notes":[14,15,16...]}}
===MUSIC===
{"0":{"speed":8,"rows":[[-1,0,-1,-1],...]}}
Loading: Running LOAD MYGAME.diskCART will automatically detect the V1.9 headers, clear the active memory, and unpack the code, art, and audio into their respective RAM sectors.

Wiping: The NEW command has been updated to completely flush RAM.sprites, RAM.maps, RAM.sfx, and RAM.music to prevent asset leakage between projects.

⚙️ Core System Changes & Bug Fixes
Async Audio Scheduling: The internal scheduleSfx() function has been separated from standard playback to allow the Music Tracker to look ahead and schedule all 4 audio channels simultaneously, ensuring perfect, pop-free timing.

State Integrity: Fixed issues where pressing ESC while running code or capturing raw strings would trap the engine in an infinite loop. ESC now forces a clean BREAK before opening the System Hub.

Terminal Input Normalization: Debounced the Backspace and Enter keys (20ms) to prevent double-firing on mechanical keyboards or during high-framerate requestAnimationFrame loops.

Dynamic Canvas Rendering: Replaced DOM-heavy pixel grids with optimized HTML5 <canvas> elements for the Studio editors, utilizing image-rendering: pixelated for razor-sharp retro visuals regardless of monitor resolution.