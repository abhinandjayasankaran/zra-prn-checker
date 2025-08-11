const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script starting...');

// Try multiple methods to expose the API for maximum compatibility
try {
  // Method 1: Standard contextBridge (most secure)
  contextBridge.exposeInMainWorld('electronAPI', {
    checkPRN: (prn) => ipcRenderer.invoke('check-prn', prn),
    savePDF: (pdfData, filename) => ipcRenderer.invoke('save-pdf', pdfData, filename),
    saveMultiplePDFs: (pdfDataArray) => ipcRenderer.invoke('save-multiple-pdfs', pdfDataArray),
    saveExcel: (excelData, filename) => ipcRenderer.invoke('save-excel', excelData, filename),
    isElectron: true
  });
  console.log('✅ Method 1: contextBridge.exposeInMainWorld successful');
} catch (error) {
  console.error('❌ Method 1 failed:', error);
}

// Method 2: Fallback for older Electron versions
try {
  window.electronAPI = {
    checkPRN: (prn) => ipcRenderer.invoke('check-prn', prn),
    savePDF: (pdfData, filename) => ipcRenderer.invoke('save-pdf', pdfData, filename),
    saveMultiplePDFs: (pdfDataArray) => ipcRenderer.invoke('save-multiple-pdfs', pdfDataArray),
    saveExcel: (excelData, filename) => ipcRenderer.invoke('save-excel', excelData, filename),
    isElectron: true
  };
  console.log('✅ Method 2: Direct window assignment successful');
} catch (error) {
  console.error('❌ Method 2 failed:', error);
}

// Method 3: Set simple flags for detection
try {
  window.isElectronApp = true;
  console.log('✅ Method 3: Simple flags set');
} catch (error) {
  console.error('❌ Method 3 failed:', error);
}

console.log('🎉 Preload script finished loading');