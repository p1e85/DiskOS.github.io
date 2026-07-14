# 💾 DiskOS V1.5

**A lightweight, 8-bit fantasy console and desktop environment built entirely in vanilla JavaScript, HTML, and CSS.**

DiskOS is a love letter to vintage computing and terminal environments. It provides a complete, sandboxed 64x32 virtual machine running right in your browser. With version 1.5, DiskOS evolves from a simple game engine into a full Operating System, featuring a Virtual File System, mountable project directories, and a declarative, text-driven GUI framework.

## ✨ Key Features

* **Virtual File System (VFS):** Save files instantly to persistent local storage without triggering browser download popups.
* **Mountable Workspaces (`.diskDIR`):** Organize your projects into virtual floppy disks. Mount a directory, and the OS handles routing your saves and generating file lists automatically.
* **Auto-Booting:** Drop a `MAIN.diskCODE` file into any directory, and DiskOS will automatically execute it upon mounting.
* **Declarative UI Engine (`.diskGUI`):** Build custom top-bar menus (like `$TOOLS CALCULATOR`) simply by writing a text configuration file. DiskOS handles the routing and triggers events in your code.
* **Custom `diskCODE` Language:** A fast, easy-to-learn BASIC-inspired language featuring variables, arrays, logic loops, and hardware polling.
* **Built-in Sprite & Audio Engines:** Define 1-bit sprites via string data, and generate raw square waves and musical notes on a dedicated Web Audio thread.

## 🚀 Quick Start

DiskOS requires zero dependencies, build steps, or servers.

1. Clone this repository and open `index.html` in your browser.
2. At the `READY.` prompt, type `HELP` for a list of system commands.
3. Type `$FILE` to open the built-in system menu.

### Create Your First Project

1. MOUNT "HELLO.diskDIR"
2. 10 PRINT "HELLO WORLD"
3. SAVE "MAIN.diskCODE"
4. MOUNT "HELLO.diskDIR" (Watch it auto-boot!)

Now, anytime you type MOUNT "HELLO.diskDIR", your program will automatically boot!
📁 1. The Virtual File System (VFS)
DiskOS isolates your workspace using a Virtual Drive (saving instantly to your browser) and a Physical Drive (saving actual files to your computer).

Standalone File Commands
SAVE "APP.diskCODE": Instantly saves your current memory to the Virtual Drive.
LOAD "APP.diskCODE": Instantly loads a file from the Virtual Drive into memory.
EXPORT "APP.diskCODE": Downloads your current memory as a physical file to your computer's hard drive.

IMPORT: Opens a file picker to upload a physical file into the DiskOS Virtual Drive.
Directories & Workspaces (.diskDIR)
Instead of floating files, you can mount virtual folders.
MOUNT "GAME.diskDIR": Creates and mounts a new folder.

Once mounted, any SAVE command automatically logs the file inside this directory.
DIR: Prints a list of all files in the currently mounted directory.
Auto-Boot: If you save a file named MAIN.diskCODE inside a directory, DiskOS will automatically run it the moment the directory is mounted.

🖥️ 2. The GUI Framework (.diskGUI)
DiskOS allows you to build standard application menus (like $FILE SAVE or $TOOLS CALC) without cluttering your program code.

Built-in System Menus
You can type these prefixed commands into the terminal at any time:
$FILE NEW, $FILE SAVE, $FILE EXPORT
$EDIT COPY, $EDIT PASTE

Creating Custom Menus
To build your own interface, create a .diskGUI configuration file:

TYPE: diskGUI
---
DEF_MENU $TOOLS
DEF_ITEM CALCULATOR
DEF_MENU $HELP
DEF_ITEM ABOUT

1. LOAD "MY_APP.diskGUI" to register the menus into the OS.

LOAD "MAIN.diskCODE" to load your actual application logic.
When the user types $TOOLS CALCULATOR, the OS secretly sets the variable SYS_GUI_EVENT = "TOOLS.CALCULATOR" and RUNs your code.
Your App Logic (Handling the Event):

10 IF SYS_GUI_EVENT == "TOOLS.CALCULATOR" THEN GOTO 100
20 PRINT "AWAITING COMMAND..."
30 END

100 REM --- CALCULATOR LOGIC ---
110 CLEAR_SCR
120 PRINT "CALCULATOR OPEN"

📜 3. diskCODE Language Reference
DiskOS uses a line-numbered, BASIC-style execution engine capable of processing up to 1,000 instructions per frame at 60 FPS.

Variables, Math & Logic
VAR [NAME] = [VALUE]: Assigns a variable. Supports basic math.

Example: 10 VAR X = 10 + 5
DIM [NAME] [SIZE]: Creates a memory array filled with 0s.

Example: 10 DIM ENEMIES 10
RND([MAX]): Generates a random integer between 0 and MAX-1.

IF [COND] THEN [ACTION]: Evaluates logic (>, <, ==, AND, OR).

Example: 10 IF X > 5 AND Y == 10 THEN GOTO 100
GOTO [LINE]: Jumps execution to a specific line number.

WAIT [MS]: Halts the CPU loop for a duration, letting the frame render. Essential for game loops.

END: Safely terminates the running program.
Hardware Polling (Gamepad & Touch)
DiskOS maps physical keyboards and the mobile touch-overlay automatically. 

Read them continuously in your game loops (1 = pressed, 0 = unpressed):
BTN_UP, BTN_DOWN, BTN_LEFT, BTN_RIGHT
BTN_SPACE, BTN_X, BTN_Z
TOUCH_ACTIVE: Equals 1 if the screen is touched or mouse is clicked.

TOUCH_X and TOUCH_Y: Returns the current grid coordinates (X: 0-63, Y: 0-31).

Event-driven input: GET_KEY [VAR] pauses the OS and waits for a single keystroke.

Graphics & Rendering
PRINT [TEXT/VAR]: Prints text at the current cursor.

PLOT [X] [Y] [COLOR]: Paints a single grid cell. (Colors: RED, BLUE, GREEN, AMBER, WHITE, BLACK, YELLOW, PURPLE, CYAN).

DRAW_BOX [X] [Y] [W] [H] [COLOR]: Draws a filled rectangle.

DEF_SPRITE [ID] [W] [H] [COLOR] [BINARY]: Loads a 1-bit sprite into memory. 1 paints the pixel, 0 is transparent.

Example: 10 DEF_SPRITE 1 3 3 CYAN 101010101
DRAW_SPRITE [ID] [X] [Y]: Stamps a defined sprite onto the grid.

Audio Synthesizer
BEEP [FREQ] [MS]: Generates a raw square wave. Great for sound effects.

Example: 10 BEEP 440 100

PLAY [NOTE] [MS]: Plays a specific musical note (C3 through B5).

Example: 10 PLAY C#4 200

Advanced Memory Access (PEEK & POKE)
Bypass standard drawing commands by writing directly to the video memory index (0 to 2047).

POKE [INDEX] [COLOR]: Overwrites a raw background cell instantly.

PEEK [INDEX]: Reads the background color of a cell and stores it in the system variable PEEK_VAL.

Stacking Code (Libraries)
Don't rewrite common logic! Save useful functions (like drawing a specific UI window) as a standalone file, e.g., WINDOW.lib. In your new programs, simply type:

10 LOAD_LIB WINDOW.lib

The OS will seamlessly stack that code into your current file, giving you access to its subroutines instantly.

Developed by P1 Creations LLC
