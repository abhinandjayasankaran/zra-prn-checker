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

// Helper function to check PRN details first
async function checkPRNDetails(prn) {
  console.log('🔍 Checking PRN details:', prn);
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'portal-customs.zra.org.zm',
      port: 443,
      path: `/api/v1/prn/details/${prn}`,
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
      },
      // SSL bypass options
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
        
        console.log(`📋 PRN ${prn} details response:`, {
          statusCode: res.statusCode,
          contentType: res.headers['content-type'],
          size: buffer.length
        });
        
        if (res.statusCode === 200) {
          try {
            const responseData = JSON.parse(buffer.toString());
            console.log(`✅ PRN ${prn} details:`, {
              prn: responseData.prn,
              status: responseData.prnStatus,
              amount: responseData.totalAmount,
              currency: responseData.currencyCode,
              taxpayer: responseData.taxpayerName
            });
            
            resolve({
              success: true,
              data: responseData,
              error: null
            });
          } catch (parseError) {
            console.error(`❌ Error parsing PRN ${prn} details:`, parseError);
            resolve({
              success: false,
              data: null,
              error: 'Failed to parse response data'
            });
          }
        } else {
          console.log(`❌ PRN ${prn} details failed:`, res.statusCode);
          try {
            const errorResponse = JSON.parse(buffer.toString());
            resolve({
              success: false,
              data: null,
              error: errorResponse
            });
          } catch {
            resolve({
              success: false,
              data: null,
              error: `HTTP ${res.statusCode}: ${res.statusMessage}`
            });
          }
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error for PRN details', prn, ':', error);
      resolve({
        success: false,
        data: null,
        error: error.message
      });
    });

    req.setTimeout(15000, () => {
      console.error('⏰ Request timeout for PRN details', prn);
      req.destroy();
      resolve({
        success: false,
        data: null,
        error: 'Request timeout - server took too long to respond'
      });
    });

    req.end();
  });
}

// Helper function to get receipt PDF
async function getReceiptPDF(prn) {
  console.log('📄 Getting receipt PDF for PRN:', prn);
  
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
      // SSL bypass options
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
        
        console.log(`📄 PRN ${prn} receipt response:`, {
          statusCode: res.statusCode,
          contentType: res.headers['content-type'],
          size: buffer.length
        });
        
        if (res.statusCode === 200 && res.headers['content-type'] === 'application/pdf') {
          console.log(`✅ PRN ${prn} receipt PDF received`);
          resolve({
            success: true,
            pdfData: buffer.toString('base64'),
            error: null
          });
        } else {
          console.log(`❌ PRN ${prn} receipt failed`);
          resolve({
            success: false,
            pdfData: null,
            error: buffer.toString() || `HTTP ${res.statusCode}: ${res.statusMessage}`
          });
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error for PRN receipt', prn, ':', error);
      resolve({
        success: false,
        pdfData: null,
        error: error.message
      });
    });

    req.setTimeout(30000, () => {
      console.error('⏰ Request timeout for PRN receipt', prn);
      req.destroy();
      resolve({
        success: false,
        pdfData: null,
        error: 'Request timeout - server took too long to respond'
      });
    });

    req.write(postData);
    req.end();
  });
}

// Main PRN check handler - now uses the correct sequence
ipcMain.handle('check-prn', async (event, prn) => {
  console.log('🚀 Starting PRN check workflow for:', prn);
  
  try {
    // Step 1: Check PRN details to verify if it's valid and get status
    const detailsResult = await checkPRNDetails(prn);
    
    if (!detailsResult.success) {
      // PRN is invalid
      console.log(`❌ PRN ${prn} is INVALID`);
      return {
        success: false,
        status: 'invalid',
        pdfData: null,
        error: 'Invalid PRN number',
        details: detailsResult.error
      };
    }
    
    const prnData = detailsResult.data;
    const prnStatus = prnData.prnStatus;
    
    console.log(`📊 PRN ${prn} status: ${prnStatus}`);
    
    if (prnStatus === 'PAID') {
      // Step 2: PRN is paid, try to get the receipt PDF
      console.log(`💰 PRN ${prn} is PAID, fetching receipt...`);
      
      const receiptResult = await getReceiptPDF(prn);
      
      if (receiptResult.success) {
        console.log(`✅ PRN ${prn} - Receipt PDF retrieved successfully`);
        return {
          success: true,
          status: 'paid',
          pdfData: receiptResult.pdfData,
          error: null,
          details: {
            amount: prnData.totalAmount,
            currency: prnData.currencyCode,
            taxpayer: prnData.taxpayerName,
            narration: prnData.narration,
            prnDate: prnData.prnDate,
            receiptDate: prnData.receiptDate
          }
        };
      } else {
        console.log(`⚠️ PRN ${prn} is PAID but receipt retrieval failed`);
        return {
          success: false,
          status: 'error',
          pdfData: null,
          error: 'PRN is paid but could not retrieve receipt',
          details: receiptResult.error
        };
      }
    } else if (prnStatus === 'PENDING') {
      // PRN is valid but not yet paid
      console.log(`⏳ PRN ${prn} is VALID but UNPAID`);
      return {
        success: false,
        status: 'unpaid',
        pdfData: null,
        error: 'PRN is valid but payment is still pending',
        details: {
          amount: prnData.totalAmount,
          currency: prnData.currencyCode,
          taxpayer: prnData.taxpayerName,
          narration: prnData.narration,
          prnDate: prnData.prnDate
        }
      };
    } else {
      // Unknown status
      console.log(`❓ PRN ${prn} has unknown status: ${prnStatus}`);
      return {
        success: false,
        status: 'unknown',
        pdfData: null,
        error: `PRN has unknown status: ${prnStatus}`,
        details: prnData
      };
    }
    
  } catch (error) {
    console.error('❌ Unexpected error in PRN check workflow:', error);
    return {
      success: false,
      status: 'error',
      pdfData: null,
      error: `Unexpected error: ${error.message}`
    };
  }
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

// Handle Excel file save
ipcMain.handle('save-excel', async (event, base64Data, filename) => {
  console.log('📊 Saving Excel file:', filename);
  
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: filename,
      filters: [
        { name: 'Excel Files', extensions: ['xlsx'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(result.filePath, buffer);
      console.log('✅ Excel file saved successfully:', result.filePath);
      return { success: true, path: result.filePath };
    }

    console.log('⚠️ Excel save cancelled by user');
    return { success: false, error: 'Save cancelled' };
  } catch (error) {
    console.error('❌ Error saving Excel file:', error);
    return { success: false, error: error.message };
  }
});