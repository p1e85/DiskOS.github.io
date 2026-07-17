DiskOS V1.8: .diskGUI & Graphics Documentation

Proprietary File Format by P1 Creations

The .diskGUI file format is a hybrid engine designed specifically for DiskOS V1.8.

It serves as a theming engine, typography controller, and menu generator. Paired with advanced diskCODE graphics commands, it allows developers to build immersive custom interfaces and game backgrounds.

1. File Structure & Initialization
Every .diskGUI file must begin with the correct type declaration so the DiskOS Kernel and Parser know how to compile it.

TYPE: diskGUI
2. Theming Engine (Global Styles)
You can inject global color and typography variables instantly. DiskOS supports standard Hex Codes (e.g., #00FF00) or built-in system names (RED, BLUE, AMBER, GREEN, BLACK, WHITE, YELLOW, PURPLE, CYAN).

Global Environment Commands:
PAGE_BG <color>: Changes the background color of the web browser outside the monitor.
BORDER_COLOR <color>: Changes the color of the physical plastic monitor bezel.

SCREEN_COLOR <color>: Changes the dark background color of the CRT glass itself.

CRT_SCANLINES <ON OFF |>: Toggles the retro visual scanlines over the canvas.

Typography & Cursor Commands:
TEXT_COLOR <color>: Changes the global phosphor font color.

CURSOR_COLOR <color>: Sets the blinking cursor block independently of the text color.

FONT_FAMILY <name>: Changes the font style (e.g., monospace, Arial, Impact, Times).

FONT_WEIGHT <BOLD NORMAL |>: Adjusts the thickness of the font.
FONT_STYLE <ITALIC NORMAL |>: Italicizes the terminal font.

TEXT_DECOR <UNDERLINE NONE STRIKE |>: Renders pixel-perfect underlines or strikethroughs across the grid.

Example Theme: "Hacker Terminal"
TYPE: diskGUI
PAGE_BG #050505
BORDER_COLOR #111111
SCREEN_COLOR #000000
TEXT_COLOR GREEN
CURSOR_COLOR WHITE
FONT_FAMILY monospace
FONT_WEIGHT BOLD
CRT_SCANLINES ON

3. Menu Generator (Interactivity)
You can define custom menus that users can summon using the $<MENU_NAME> command in the terminal.

Menu Commands:
DEF_MENU <NAME>: Creates a new parent menu.

DEF_ITEM <NAME>: Adds a selectable item to the active menu.

Example Menu Configuration:
TYPE: diskGUI
DEF_MENU APP
DEF_ITEM START
DEF_ITEM EXIT

Catching Events in Your diskCODE:
When a user clicks or types $APP START, the OS sets the background system variable SYS_GUI_EVENT to "APP.START".
10 IF SYS_GUI_EVENT = "APP.START" THEN GOTO 100

4. Advanced Graphics (diskCODE commands)
Once your .diskGUI theme is running, you can use these diskCODE programming commands to manipulate individual cells on the 64x32 grid. This is perfect for drawing ASCII game maps or custom UIs.

POKE <idx> <color>: Changes the background color of a specific grid cell.

POKE_FG <idx> <color>: Changes the text color of a specific grid cell, overriding the global theme!
POKE_CHAR <idx> <char>: Injects a specific ASCII character into a cell without moving the cursor.

5. How to Load & Compile
Because .diskGUI files are raw data, they are loaded into the system's rawBuffer rather than standard code memory.

Method A: Typing Manually
Type NEW to clear memory and reset the theme to default.
Type ---- to enter Raw Mode.
Type or paste your GUI code (including TYPE: diskGUI).
Type ---- to exit Raw Mode.
Type RUN to compile the styles and menus!

Method B: Loading from the Virtual Drive
Type LOAD "MYTHEME.diskGUI"
Type RUN to compile.

Step 2: Use DiskOS to Export It
Jump back over to your DiskOS browser tab and run these commands to download your updated manual:
Type NEW (Press Enter)
Type ---- (Press Enter)
Paste the copied text block into the terminal.
Type ---- (Press Enter)
Type $FILE EXPORT "diskGUI_docs_v2.md" (Press Enter)
