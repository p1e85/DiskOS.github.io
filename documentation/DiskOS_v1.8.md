# 💾 DiskOS V1.8: System Architecture & Update Documentation

**Developer:** P1 Creations  
**System Status:** Stable Release (V1.8)  
**Core Files:** `index.html`, `os_kernel.js`, `os_parser.js`  

DiskOS is a browser-based fantasy computer and operating system. It merges a retro 8-bit aesthetic and classic BASIC-style terminal syntax (`diskCODE`) with modern JavaScript capabilities, a persistent Virtual File System, and a robust physical distribution engine.

Below is the official documentation for the major architectural upgrades implemented in the V1.5 to V1.8 release cycle.

---

## 🏗️ 1. Core OS Stability & Sandboxing (Phase 1)

### The Virtual File System (VFS)
DiskOS no longer relies on volatile memory. The Kernel now actively bridges the terminal to the browser's `localStorage`, creating a persistent Virtual Drive.
* **Directory Isolation:** Files saved while a Workspace is mounted are prefixed (e.g., `DiskOS_GAME.diskDIR_APP.diskCODE`), preventing overlapping filenames from overwriting each other across different projects.
* **Global Configs:** System files like `.diskDIR`, `.diskGUI`, and `.diskPAD` are saved to the root directory so they can be accessed from any environment.

### The Auto-Boot Engine
The OS now features a silent wake-up listener. 
* On page load, the Kernel scans the Virtual Drive for `MASTER.diskDIR`. 
* If found, the system automatically injects the `MOUNT` command, loading the user's primary workspace and bypassing the `READY.` prompt entirely for a seamless startup.

---

## 🎛️ 2. The GUI Gatekeeper & Data Capture

### System Menus & Clipboard Integration
DiskOS introduces the `$MENU` syntax, an overlay layer that intercepts specific terminal commands to trigger native OS actions without requiring `diskCODE` logic.
* `$FILE SAVE` / `$FILE EXPORT`: Triggers physical disk operations natively.
* `$EDIT COPY` / `$EDIT PASTE`: Interfaces directly with the user's physical OS clipboard, allowing for rapid movement of code in and out of the browser.
* **`.diskGUI` Support:** Users can write configuration files to define their own custom dropdown menus. Clicking these menus sets the `SYS_GUI_EVENT` variable, allowing apps to respond to UI clicks asynchronously.

### Raw Capture Mode (The `----` Sandwich)
A new paradigm for creating structured files directly inside the terminal without the strict line-number requirements of `diskCODE`.
* Typing `----` suspends the standard parser and opens a `rawBuffer`. 
* Users can type freely or paste massive configuration files from their clipboard. 
* Typing `----` again seals the buffer, allowing the user to `SAVE` the raw data directly to a `.diskGUI` or `.diskPAD` file.

---

## 🕹️ 3. Mobile Ecosystem & Virtual Hardware (Phase 4)

### The Gamepad Engine (`.diskPAD`)
DiskOS is now fully mobile-compatible via programmable on-screen hardware overlays.
* Users can load a `.diskPAD` configuration file to spawn a touch-responsive D-Pad and Action Buttons beneath the CRT monitor.
* **Native Key Mapping:** Virtual buttons are mapped directly to physical keyboard events (e.g., `BTN: A SPACE`). This ensures `diskCODE` logic (like `IF BTN_SPACE == 1`) works flawlessly across both desktop keyboards and mobile touchscreens without altering a single line of game code.

---

## 📦 4. The Distribution Pipeline

### The `.diskROM` Cartridge System
DiskOS introduces a powerful, zero-dependency packaging system for sharing software suites and games.
* **Compiler:** Running `EXPORT "WORKSPACE.diskDIR"` commands the Kernel to loop through the Virtual Drive, fetch all connected code, sprites, and GUIs, and stitch them into a single, deployable `.diskROM` text file.
* **Flasher:** Running the `IMPORT` command on a `.diskROM` causes the Kernel to read the delimiter tags, split the file back into individual components, save them to the user's Virtual Drive, and instantly Auto-Boot the software.

### Drag-and-Drop Installation
The physical terminal UI now listens for drag-and-drop events. Users can grab a `.diskROM` cartridge from their physical desktop and drop it directly onto the browser window to instantly flash and boot the game, requiring zero keyboard interaction.

---

## 🛠️ Quick Start File Formats

| Extension | Purpose | Structure |
| :--- | :--- | :--- |
| **`.diskCODE`** | The main programming language. | Line-numbered BASIC syntax (`10 PRINT "HI"`). |
| **`.diskDIR`** | Workspace directories. | Flat list of connected filenames. |
| **`.diskGUI`** | UI Menu configurations. | Declarative (`DEF_MENU $TOOLS`). |
| **`.diskPAD`** | Mobile hardware layouts. | Declarative (`DPAD: HORIZONTAL`, `BTN: A SPACE`). |
| **`.diskROM`** | Compiled distribution cartridge. | Master text file separated by `===FILE: NAME===` tags. |
