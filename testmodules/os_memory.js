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

    getIndex(x, y) { return y * this.cols + x; }
};