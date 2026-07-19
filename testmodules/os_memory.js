export const RAM = {
    cols: 64, rows: 32,                 
    cursorX: 0, cursorY: 0,             
    vram: [],                           
    textBuffer: [],                     
    rawBuffer: [],                      
    variables: {},                      
    sprites: {},                        
    customMenus: {}, 
    
    callStack: [],   
    forStack: [],                 
    
    isRunning: false,                   
    currentLineIndex: 0,                
    waitingForKey: false, targetVar: "", 
    waitingForTimer: false, 
    waitingForInput: false, inputVar: "", inputBuffer: "",           
    keysDown: {},                       
    touchActive: 0, touchX: 0, touchY: 0, 

    isCapturingRaw: false,              
    rawFileType: "RAW", 

    systemColor: '#FFB000',
    systemBgColor: '#000000',
    cursorColor: '#FFB000',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    fontStyle: 'normal',
    textDecor: 'none',

// Video RAM for .diskCart data
    vram: {
        // The active 16-color system palette
        palette: [
            '#000000', '#1A1A24', '#555555', '#FFFFFF', 
            '#FF0044', '#FF5500', '#FFDD00', '#00FF00', 
            '#00FFFF', '#0088FF', '#0000FF', '#7700FF', 
            '#FF00FF', '#FFAABB', '#AA7744', '#00FA9A'
        ],
        // 256 sprites, each containing 64 pixels (8x8 grid)
        sprites: Array(256).fill(null).map(() => Array(64).fill(0)),
        // 16x16 map (256 tiles)
        map: Array(256).fill(0) 
    },

    getIndex(x, y) { return y * this.cols + x; }
};