DiskOS V1.8: .diskGUI Documentation

​Proprietary File Format by P1 Creations

​The .diskGUI file format is a hybrid engine designed specifically for DiskOS V1.8. It serves two distinct purposes:
​Theming Engine: Acts as a CSS stylesheet to instantly alter the global colors of the OS monitor, webpage, and CRT text.

​Menu Generator: Builds interactive, native terminal commands that users can trigger to interact with your software.

​1. File Structure & Initialization
​Every .diskGUI file must begin with the correct type declaration so the DiskOS Kernel and Parser know how to compile it.
​TYPE: diskGUI

​2. Theming Engine (Visuals)
​You can inject global color variables instantly. DiskOS supports standard Hex Codes (e.g., #00FF00) or built-in system names for the CRT screen (RED, BLUE, AMBER, GREEN, BLACK, WHITE, YELLOW, PURPLE, CYAN).

​Theming Commands:
​PAGE_BG <color>: Changes the background color of the web browser outside the monitor.
​BORDER_COLOR <color>: Changes the color of the physical plastic monitor bezel.

​SCREEN_COLOR <color>: Changes the dark background color of the CRT glass itself.
​TEXT_COLOR <color>: Changes the global phosphor font and cursor color.

​Example Theme: "Cyber Blue"
TYPE: diskGUI
PAGE_BG #02021a
BORDER_COLOR #0a0a2e
SCREEN_COLOR #000000
TEXT_COLOR BLUE

​3. Menu Generator (Interactivity)
​You can define custom menus that users can summon using the $<MENU_NAME> command in the terminal.

​Menu Commands:
​DEF_MENU <NAME>: Creates a new parent menu.
​DEF_ITEM <NAME>: Adds a selectable item to the active menu.

​Example Menu Configuration:
TYPE: diskGUI
DEF_MENU APP
DEF_ITEM START
DEF_ITEM OPTIONS
DEF_ITEM EXIT
​How Users Interact With Menus:
If a user types $APP, the terminal will automatically print the menu items.

If a user types $APP START, the OS will set the background system variable SYS_GUI_EVENT to "APP.START" and automatically execute your standard diskCODE program.

​Catching Events in Your diskCODE:
Inside your main application, check the event variable to trigger logic:
10 IF SYS_GUI_EVENT = "APP.START" THEN GOTO 100
20 IF SYS_GUI_EVENT = "APP.EXIT" THEN END
​4. How to Load & Compile a .diskGUI

​Because .diskGUI files are raw data, they are loaded into the system's rawBuffer rather than standard code memory.

​Method A: Typing Manually
​Type NEW to clear memory.
​Type ---- to enter Raw Mode.
​Type or paste your GUI code (including TYPE: diskGUI).
​Type ---- to exit Raw Mode.
​Type RUN to compile the styles and menus!

​Method B: Loading from the Virtual Drive
​Type LOAD "MYTHEME.diskGUI"
​Type RUN to compile.

​Step 2: Use DiskOS to Export It
​Now, jump over to your DiskOS browser tab and run these exact commands in the terminal:
​Type NEW (Press Enter)
​Type ---- (Press Enter)
​Paste the copied text block into the terminal.
​Type ---- (Press Enter)
​Type $FILE EXPORT "diskGUI_docs.md" (Press Enter)

​Your mobile browser will immediately download a perfectly formatted diskGUI_docs.md file straight to your phone!