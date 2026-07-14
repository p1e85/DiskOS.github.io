# 💾 DISKOS V1.8 - SYSTEM CONTEXT & HANDOFF DOCUMENT

**Developer:** P1 Creations
**System Status:** V1.8 (Core OS, VFS, and Distribution phases complete)
**Current Objective:** Phase 3 - Building the "Killer Apps" (Sprite Studio, Text Editor, File Explorer) using native `diskCODE`.

## 1. System Overview
DiskOS is a browser-based fantasy computer and operating system. It consists of an HTML/CSS frontend (styled like a CRT monitor with an optional mobile gamepad), a JavaScript Kernel (`os_kernel.js`) handling a LocalStorage Virtual File System, and a custom JavaScript Parser (`os_parser.js`) that interprets a custom BASIC-style language called `diskCODE`. It runs a 60FPS render loop drawing text and pixels to an HTML5 Canvas (64 columns x 32 rows).

## 2. File Formats & Ecosystem
DiskOS uses specific file extensions to route logic:
*   **`.diskCODE`**: The primary programming language (line-numbered).
*   **`.diskDIR`**: A workspace directory (a flat text list of connected filenames).
*   **`.diskGUI`**: Declarative UI menu config (e.g., `DEF_MENU $TOOLS`). Clicks set `SYS_GUI_EVENT`.
*   **`.diskPAD`**: Declarative mobile Gamepad config (e.g., `DPAD: HORIZONTAL`, `BTN: A SPACE`). Maps touch buttons to physical keyboard events.
*   **`.diskROM`**: A compiled distribution cartridge containing multiple files stitched together with `===FILE: NAME===` tags. Drag-and-dropping this file into the browser automatically unpacks and boots it.

## 3. The Parser & Input Modes
*   **Standard Input:** The terminal expects line-numbered `diskCODE` (e.g., `10 PRINT "HELLO"`).
*   **Native Commands:** `$FILE SAVE`, `$FILE EXPORT`, `$EDIT COPY`, `$EDIT PASTE` interact directly with the OS/Clipboard.
*   **Raw Capture Mode (`----`)**: Typing `----` stops the line-number parser and opens a raw buffer. Users can paste configuration files directly into the terminal, then type `----` to close it, followed by `SAVE "FILE.diskGUI"`.

## 4. `diskCODE` Language Syntax Reference
The language relies on line numbers, sequential execution, and a main loop.

**Variables & Arrays:**
*   `VAR SCORE=100` (Variables can be used in expressions)
*   `DIM MAP 10` (Creates an array named MAP with size 10)
*   `VAR MAP[0]=1`

**Graphics & Rendering (64x32 Grid):**
*   `PRINT "HELLO WORLD"` or `PRINT SCORE`
*   `CLEAR_SCR` (Clears screen and VRAM)
*   `PLOT <x> <y> <color>` (Draws a single pixel block)
*   `DRAW_BOX <x> <y> <w> <h> <color>`
*   `DEF_SPRITE <id> <w> <h> <color> <binary_data>` (e.g., `DEF_SPRITE PLAYER 8 8 GREEN 11110000...`)
*   `DRAW_SPRITE <id> <x> <y>`

**Logic & Flow:**
*   `IF <condition> THEN <action>` (Action must be `GOTO`, `END`, or `VAR`)
*   *Conditionals support `AND`, `OR`, `==`, `>`, `<`*
*   `GOTO <line>`
*   `END` (Stops execution, returns to `READY.` prompt)
*   `WAIT <ms>` (Delays execution)

**Input & I/O:**
*   `GET_KEY=MYVAR` (Halts execution until a key is pressed, stores key in `MYVAR`)
*   `IF TOUCH_ACTIVE == 1 THEN VAR TX=TOUCH_X` (Reads touch/mouse coordinates)
*   `IF BTN_SPACE == 1 THEN GOTO 100` (Reads active button states. Works for physical keyboards and `.diskPAD` touch overlays). Supported keys: `SPACE`, `UP`, `DOWN`, `LEFT`, `RIGHT`, or letters.

**Audio:**
*   `BEEP <frequency> <duration_ms>`
*   `PLAY <note> <duration_ms>` (e.g., `PLAY C4 100`)

## 5. Current Task
We are currently writing applications purely in `diskCODE`. The system architecture (HTML/JS) is completely locked and functional. 

Do not suggest modifying `index.html`, `os_kernel.js`, or `os_parser.js`. Your goal is to help write `.diskCODE` scripts, `.diskGUI` menus, and `.diskPAD` layouts to build the P1 Creations software suite.
