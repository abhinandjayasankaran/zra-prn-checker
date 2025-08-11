const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const https = require('https');
const fs = require('fs');

// Replace electron-is-dev with built-in check
const isDev = !app.isPackaged;

let mainWindow;

function createWindow() {
  console.log('🚀 Creating Electron window...');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      devTools: true
    },
    titleBarStyle: 'default',
    show: false
  });

  const startUrl = isDev 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, '../../dist/index.html')}`;
  
  console.log('📍 Loading URL:', startUrl);
  console.log('🔧 Preload script path:', path.join(__dirname, 'preload.js'));
  
  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    console.log('👁️ Window ready to show');
    mainWindow.show();
    
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  console.log('🎬 App ready, creating window...');
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers for API calls (bypasses CORS and SSL issues)
ipcMain.handle('check-prn', async (event, prn) => {
  console.log('🔍 Checking PRN:', prn);
  
  return new Promise((resolve) => {
    const postData = JSON.stringify({ prn: prn });
    
    const options = {
      hostname: 'portal-customs.zra.org.zm',
      port: 443,
      path: '/api/v1/customs/receipts/generate-by-prn',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        'Content-Length': Buffer.byteLength(postData)
      },
      // SSL bypass options to fix certificate verification issues
      rejectUnauthorized: false,
      requestCert: false,
      agent: false
    };

    const req = https.request(options, (res) => {
      let data = [];

      res.on('data', (chunk) => {
        data.push(chunk);
      });

      res.on('end', () => {
        const buffer = Buffer.concat(data);
        
        console.log(`📄 PRN ${prn} response:`, {
          statusCode: res.statusCode,
          contentType: res.headers['content-type'],
          size: buffer.length
        });
        
        if (res.statusCode === 200 && res.headers['content-type'] === 'application/pdf') {
          console.log(`✅ PRN ${prn} is PAID - PDF received`);
          resolve({
            success: true,
            status: 'paid',
            pdfData: buffer.toString('base64'),
            error: null
          });
        } else {
          console.log(`❌ PRN ${prn} is INVALID/UNPAID`);
          resolve({
            success: false,
            status: 'invalid',
            pdfData: null,
            error: buffer.toString() || `HTTP ${res.statusCode}: ${res.statusMessage}`
          });
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error for PRN', prn, ':', error);
      resolve({
        success: false,
        status: 'error',
        pdfData: null,
        error: error.message
      });
    });

    // Set timeout for requests
    req.setTimeout(30000, () => {
      console.error('⏰ Request timeout for PRN', prn);
      req.destroy();
      resolve({
        success: false,
        status: 'error',
        pdfData: null,
        error: 'Request timeout - server took too long to respond'
      });
    });

    req.write(postData);
    req.end();
  });
});

// Handle file save dialog
ipcMain.handle('save-pdf', async (event, pdfData, filename) => {
  console.log('💾 Saving PDF:', filename);
  
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: filename,
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      const buffer = Buffer.from(pdfData, 'base64');
      fs.writeFileSync(result.filePath, buffer);
      console.log('✅ PDF saved successfully:', result.filePath);
      return { success: true, path: result.filePath };
    }

    console.log('⚠️ PDF save cancelled by user');
    return { success: false, error: 'Save cancelled' };
  } catch (error) {
    console.error('❌ Error saving PDF:', error);
    return { success: false, error: error.message };
  }
});

// Handle multiple file save
ipcMain.handle('save-multiple-pdfs', async (event, pdfDataArray) => {
  console.log('📂 Saving multiple PDFs:', pdfDataArray.length);
  
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select folder to save PDFs'
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const dirPath = result.filePaths[0];
      const savedFiles = [];
      const errors = [];

      for (const item of pdfDataArray) {
        try {
          const buffer = Buffer.from(item.pdfData, 'base64');
          const filePath = path.join(dirPath, `${item.prn}.pdf`);
          fs.writeFileSync(filePath, buffer);
          savedFiles.push(filePath);
          console.log('✅ Saved:', `${item.prn}.pdf`);
        } catch (error) {
          console.error(`❌ Error saving ${item.prn}.pdf:`, error);
          errors.push(`${item.prn}: ${error.message}`);
        }
      }

      console.log('🎉 Batch save complete:', savedFiles.length, 'files saved');
      if (errors.length > 0) {
        console.log('⚠️ Errors occurred:', errors);
      }

      return { 
        success: true, 
        savedFiles, 
        count: savedFiles.length,
        errors: errors.length > 0 ? errors : null
      };
    }

    console.log('⚠️ Directory selection cancelled by user');
    return { success: false, error: 'Directory selection cancelled' };
  } catch (error) {
    console.error('❌ Error in batch save:', error);
    return { success: false, error: error.message };
  }
});