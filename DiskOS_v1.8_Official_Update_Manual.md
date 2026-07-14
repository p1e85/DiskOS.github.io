# 💾 DiskOS V1.8: Official Update Manual

**Published by:** P1 Creations

**System Version:** V1.8

Welcome to the DiskOS V1.8 update! This manual will walk you through exactly how to use the new features introduced in this release, from writing raw files to sharing your games as digital cartridges.

---

## 🥪 1. The "Sandwich" Mode (Raw Data Entry)

In previous versions, everything typed into DiskOS had to be a line-numbered `diskCODE` command. V1.8 introduces a toggle that lets you type or paste raw text—perfect for configuration files.

### How to Use It:

1. Type `----` and press **Enter**. The OS will print `RAW MODE: ON` and show a `>` prompt.
2. Type or paste your raw text (like a `.diskGUI` or `.diskPAD` layout).
3. Type `----` and press **Enter** again. The OS will print `RAW MODE: OFF`.
4. Type `SAVE "MYFILE.diskGUI"` to save your raw data directly to the virtual drive.

> **Pro Tip:** This is the fastest way to bring code into DiskOS. Copy text from your desktop text editor, type `----`, use `$EDIT PASTE`, and close it with `----`.

---

## 🎮 2. Setting Up the Virtual Gamepad (`.diskPAD`)

You can now create custom touch controls for mobile players. The Gamepad links virtual buttons on the screen directly to standard keyboard keys, so your existing game code doesn't need to change.

### Creating a Gamepad File:

Open Sandwich Mode (`----`) and enter the following format:

```text
TYPE: diskPAD
---
DPAD: HORIZONTAL
BTN: A SPACE
BTN: B Z
BTN: PWR X SMALL

```

Save this file as `CONTROLS.diskPAD`.

### Loading the Gamepad:

Simply type `LOAD "CONTROLS.diskPAD"`. The terminal screen will instantly adjust, and your custom D-Pad and action buttons will appear beneath the monitor.

* Pressing the virtual "A" button will trigger `BTN_SPACE` in your code.
* Pressing the virtual "◀" button will trigger `BTN_LEFT` in your code.

---

## 📦 3. Burning and Playing `.diskROM` Cartridges

You no longer have to share your workspaces as scattered text files. V1.8 introduces the `.diskROM` Cartridge system—a single, shareable file that contains your entire directory, code, graphics, and menus.

### How to Burn a Cartridge:

1. Ensure your current project is inside a directory (e.g., `MOUNT "GAME.diskDIR"`).
2. Type `EXPORT "GAME.diskDIR"`.
3. DiskOS will automatically gather every file linked in that directory, bundle it into a single `GAME.diskROM` file, and download it to your physical device.

### How to Play a Cartridge (Drag-and-Drop):

If someone shares a `.diskROM` game with you, playing it takes exactly one second.

1. Open DiskOS in your browser.
2. **Click and drag** the `.diskROM` file from your desktop directly onto the CRT monitor.
3. DiskOS will intercept the file, unpack all the data to your Virtual Drive, and automatically boot the game. No typing required!

---

## 🗄️ 4. Native System Menus

V1.8 introduces native commands that bypass the standard parser to execute OS-level actions. You can type these directly into the terminal at any time:

* **`$FILE NEW`**: Instantly clears memory and all variables.
* **`$FILE SAVE [FILENAME]`**: Saves current memory to the virtual drive.
* **`$FILE EXPORT [FILENAME]`**: Downloads the current memory to your physical device.
* **`$EDIT COPY`**: Copies all code currently in memory to your physical clipboard.
* **`$EDIT PASTE`**: Pastes code from your physical clipboard into the terminal.
