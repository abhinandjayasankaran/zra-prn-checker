import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, FileText, CheckCircle, XCircle, AlertCircle, FolderOpen, FileSpreadsheet, Copy, Play, ArrowRight, Zap, Shield, BarChart3, Plus, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

const StartupScreen = ({ onGetStarted }) => {
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    const intervals = [
      setTimeout(() => setAnimationStep(1), 500),
      setTimeout(() => setAnimationStep(2), 1000),
      setTimeout(() => setAnimationStep(3), 1500),
    ];

    return () => intervals.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center text-white">
        {/* Logo and Title */}
        <div className={`transform transition-all duration-1000 ${animationStep >= 0 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="w-24 h-24 mx-auto mb-6 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
            <FileText className="w-12 h-12 text-blue-300" />
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
            ZRA PRN Checker
          </h1>
          <p className="text-xl text-blue-200 mb-8">
            Streamline your ZRA customs payment verification process
          </p>
        </div>

        {/* Features */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 transform transition-all duration-1000 delay-500 ${animationStep >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <Zap className="w-10 h-10 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>
            <p className="text-blue-200 text-sm">Process multiple PRNs simultaneously with real-time status updates</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <Shield className="w-10 h-10 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Secure & Reliable</h3>
            <p className="text-blue-200 text-sm">Direct connection to ZRA systems with SSL encryption</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <BarChart3 className="w-10 h-10 text-purple-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Detailed Reports</h3>
            <p className="text-blue-200 text-sm">Export comprehensive Excel reports with processing history</p>
          </div>
        </div>

        {/* How it works */}
        <div className={`mb-12 transform transition-all duration-1000 delay-1000 ${animationStep >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <h2 className="text-2xl font-semibold mb-6">How it works</h2>
          <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <span>Upload Excel or paste PRN list</span>
            </div>
            <ArrowRight className="w-6 h-6 text-blue-300 hidden md:block" />
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <span>Automatic ZRA verification</span>
            </div>
            <ArrowRight className="w-6 h-6 text-blue-300 hidden md:block" />
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <span>Download receipts & reports</span>
            </div>
          </div>
        </div>

        {/* Get Started Button */}
        <div className={`transform transition-all duration-1000 delay-1500 ${animationStep >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <button
            onClick={onGetStarted}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
          >
            <Play className="w-5 h-5" />
            <span>Get Started</span>
          </button>
          <p className="text-blue-300 text-sm mt-4">
            Ready to streamline your PRN verification process?
          </p>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [showStartup, setShowStartup] = useState(true);
  const [prnData, setPrnData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [processingStatus, setProcessingStatus] = useState('');
  const [currentProcessing, setCurrentProcessing] = useState(-1);
  const [processingHistory, setProcessingHistory] = useState([]);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedPRNs, setPastedPRNs] = useState('');

  const fileInputRef = useRef(null);

  // Detect if running in Electron
  const isElectron = !!(
    window.electronAPI?.isElectron || 
    window.isElectronApp ||
    window.require || 
    window.process?.type === 'renderer' ||
    navigator.userAgent.includes('Electron')
  );

  if (showStartup) {
    return <StartupScreen onGetStarted={() => setShowStartup(false)} />;
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const prns = jsonData.map(row => {
        const prnValue = row.PRN || row.prn || Object.values(row)[0];
        return String(prnValue).trim();
      }).filter(prn => prn && prn !== '');

      const initialData = prns.map(prn => ({
        prn,
        status: 'pending',
        pdfData: null,
        error: null,
        details: null,
        attempts: 0,
        lastAttempt: null,
        firstProcessed: null
      }));

      setPrnData(initialData);
      setSelectedPdf(null);
      setShowPasteModal(false);
      setProcessingHistory([{
        timestamp: new Date().toISOString(),
        action: 'file_uploaded',
        details: `Uploaded file with ${prns.length} PRNs`
      }]);
    } catch (error) {
      alert('Error reading file. Please ensure it\'s a valid Excel file.');
    }
  };

  const handlePastedPRNs = () => {
    if (!pastedPRNs.trim()) {
      alert('Please paste some PRN numbers first.');
      return;
    }

    try {
      // Parse pasted PRNs - handle various formats
      const prnLines = pastedPRNs
        .split(/[\n\r,;|\t]/) // Split by newlines, commas, semicolons, pipes, or tabs
        .map(line => line.trim())
        .filter(line => line && line !== '');

      if (prnLines.length === 0) {
        alert('No valid PRN numbers found. Please check your input.');
        return;
      }

      const initialData = prnLines.map(prn => ({
        prn: prn.trim(),
        status: 'pending',
        pdfData: null,
        error: null,
        details: null,
        attempts: 0,
        lastAttempt: null,
        firstProcessed: null
      }));

      setPrnData(initialData);
      setSelectedPdf(null);
      setShowPasteModal(false);
      setPastedPRNs('');
      setProcessingHistory([{
        timestamp: new Date().toISOString(),
        action: 'prns_pasted',
        details: `Pasted ${prnLines.length} PRNs from clipboard`
      }]);
    } catch (error) {
      alert('Error processing pasted PRNs. Please check the format.');
    }
  };

  const removePrn = (index) => {
    const newData = prnData.filter((_, i) => i !== index);
    setPrnData(newData);
    
    setProcessingHistory(prev => [...prev, {
      timestamp: new Date().toISOString(),
      action: 'prn_removed',
      details: `Removed PRN: ${prnData[index].prn}`
    }]);
  };

  const createExcelFromPastedPRNs = async () => {
    if (!pastedPRNs.trim()) {
      alert('Please paste some PRN numbers first.');
      return;
    }

    try {
      // Parse pasted PRNs
      const prnLines = pastedPRNs
        .split(/[\n\r,;|\t]/)
        .map(line => line.trim())
        .filter(line => line && line !== '');

      if (prnLines.length === 0) {
        alert('No valid PRN numbers found.');
        return;
      }

      // Create Excel data
      const excelData = prnLines.map((prn, index) => ({
        'Row': index + 1,
        'PRN': prn.trim()
      }));

      // Create workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'PRN List');

      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filename = `PRN_List_${timestamp}.xlsx`;

      // Save file
      if (isElectron && window.electronAPI?.saveExcel) {
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const buffer = new Uint8Array(wbout);
        const base64Data = btoa(String.fromCharCode.apply(null, buffer));

        const result = await window.electronAPI.saveExcel(base64Data, filename);
        
        if (result.success) {
          alert(`Excel file created successfully!\n\nLocation: ${result.path}\n\nContains ${prnLines.length} PRN numbers ready for processing.`);
        } else {
          alert(`Failed to save Excel file: ${result.error}`);
        }
      } else {
        XLSX.writeFile(workbook, filename);
        alert(`Excel file "${filename}" downloaded with ${prnLines.length} PRN numbers.`);
      }

      setProcessingHistory(prev => [...prev, {
        timestamp: new Date().toISOString(),
        action: 'excel_created',
        details: `Created Excel file with ${prnLines.length} PRNs`
      }]);

    } catch (error) {
      alert(`Error creating Excel file: ${error.message}`);
    }
  };

  const checkPRNStatus = async (prn) => {
    if (!isElectron) {
      return { status: 'error', pdfData: null, error: 'This feature requires the desktop app' };
    }

    try {
      const result = await window.electronAPI.checkPRN(prn);
      
      if (result.success) {
        return { 
          status: 'paid', 
          pdfData: result.pdfData, 
          error: null,
          details: result.details
        };
      } else {
        return { 
          status: result.status, 
          pdfData: null, 
          error: result.error,
          details: result.details
        };
      }
    } catch (error) {
      return { status: 'error', pdfData: null, error: error.message };
    }
  };

  const processAllPRNs = async () => {
    if (prnData.length === 0) return;

    if (!isElectron) {
      alert('This feature requires the desktop application.');
      return;
    }

    // Filter to only process pending, error, or failed PRNs (excluding unpaid which are valid but not paid)
    const prnIndexesToProcess = prnData
      .map((item, index) => ({ ...item, originalIndex: index }))
      .filter(item => item.status === 'pending' || item.status === 'error' || item.status === 'invalid' || item.status === 'unknown')
      .map(item => item.originalIndex);

    if (prnIndexesToProcess.length === 0) {
      alert('All PRNs have already been processed successfully. Upload a new file or refresh to try again.');
      return;
    }

    const totalToProcess = prnIndexesToProcess.length;
    const alreadyProcessed = prnData.filter(item => item.status === 'paid' || item.status === 'unpaid').length;
    const isRetry = alreadyProcessed > 0;

    // Add to processing history
    setProcessingHistory(prev => [...prev, {
      timestamp: new Date().toISOString(),
      action: isRetry ? 'retry_processing' : 'initial_processing',
      details: `${isRetry ? 'Retrying' : 'Processing'} ${totalToProcess} PRNs${isRetry ? ` (${alreadyProcessed} already completed)` : ''}`
    }]);

    setLoading(true);
    setProcessingStatus(
      isRetry 
        ? `Retrying ${totalToProcess} failed/pending PRNs (${alreadyProcessed} already completed)...`
        : `Starting to process ${totalToProcess} PRNs...`
    );

    const updatedData = [...prnData];

    for (let i = 0; i < prnIndexesToProcess.length; i++) {
      const actualIndex = prnIndexesToProcess[i];
      const prn = updatedData[actualIndex].prn;
      
      setCurrentProcessing(actualIndex);
      setProcessingStatus(
        `Processing PRN ${i + 1} of ${totalToProcess}: ${prn}${
          alreadyProcessed > 0 ? ` (${alreadyProcessed} already completed)` : ''
        }`
      );

      // Update attempt tracking
      updatedData[actualIndex].attempts += 1;
      updatedData[actualIndex].lastAttempt = new Date().toISOString();
      if (!updatedData[actualIndex].firstProcessed) {
        updatedData[actualIndex].firstProcessed = new Date().toISOString();
      }

      const result = await checkPRNStatus(prn);
      updatedData[actualIndex] = {
        ...updatedData[actualIndex],
        status: result.status,
        pdfData: result.pdfData,
        error: result.error,
        details: result.details
      };

      setPrnData([...updatedData]);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setLoading(false);
    setCurrentProcessing(-1);
    
    const finalSuccessCount = updatedData.filter(item => item.status === 'paid').length;
    const finalUnpaidCount = updatedData.filter(item => item.status === 'unpaid').length;
    const finalFailCount = updatedData.filter(item => item.status === 'error' || item.status === 'invalid' || item.status === 'unknown').length;
    
    // Add completion to history
    setProcessingHistory(prev => [...prev, {
      timestamp: new Date().toISOString(),
      action: 'processing_completed',
      details: `Completed: ${finalSuccessCount} paid, ${finalUnpaidCount} unpaid, ${finalFailCount} failed/invalid`
    }]);
    
    setProcessingStatus(
      `Processing complete! ✅ ${finalSuccessCount} paid, 💰 ${finalUnpaidCount} unpaid, ❌ ${finalFailCount} failed/invalid`
    );
    setTimeout(() => setProcessingStatus(''), 5000);
  };

  const downloadPDF = async (prn, pdfData) => {
    if (!pdfData || !isElectron) return;

    try {
      const result = await window.electronAPI.savePDF(pdfData, `${prn}.pdf`);
      if (result.success) {
        alert(`PDF saved successfully: ${result.path}`);
      } else {
        alert(`Failed to save PDF: ${result.error}`);
      }
    } catch (error) {
      alert(`Error saving PDF: ${error.message}`);
    }
  };

  const downloadAllPDFs = async () => {
    const paidPRNs = prnData.filter(item => item.status === 'paid' && item.pdfData);
    
    if (paidPRNs.length === 0) {
      alert('No paid PRNs with PDFs to download.');
      return;
    }

    if (!isElectron) {
      alert('This feature requires the desktop application.');
      return;
    }

    try {
      const result = await window.electronAPI.saveMultiplePDFs(paidPRNs);
      if (result.success) {
        alert(`Successfully saved ${result.count} PDF files!`);
        
        // Add to processing history
        setProcessingHistory(prev => [...prev, {
          timestamp: new Date().toISOString(),
          action: 'pdfs_downloaded',
          details: `Downloaded ${result.count} PDF files`
        }]);
      } else {
        alert(`Failed to save PDFs: ${result.error}`);
      }
    } catch (error) {
      alert(`Error saving PDFs: ${error.message}`);
    }
  };

  const exportToExcel = async () => {
    if (prnData.length === 0) {
      alert('No data to export. Please upload and process PRNs first.');
      return;
    }

    try {
      // Prepare main results data
      const resultsData = prnData.map((item, index) => ({
        'Row': index + 1,
        'PRN': item.prn,
        'Status': item.status.toUpperCase(),
        'Attempts': item.attempts || 0,
        'First Processed': item.firstProcessed ? new Date(item.firstProcessed).toLocaleString() : 'Not processed',
        'Last Attempt': item.lastAttempt ? new Date(item.lastAttempt).toLocaleString() : 'Not processed',
        'Error Details': item.error || '',
        'Has PDF': item.pdfData ? 'Yes' : 'No',
        'Amount': item.details?.amount || '',
        'Currency': item.details?.currency || '',
        'Taxpayer': item.details?.taxpayer || '',
        'Description': item.details?.narration || ''
      }));

      // Prepare summary data
      const summaryData = [
        { 'Metric': 'Total PRNs', 'Count': prnData.length },
        { 'Metric': 'Paid/Successful', 'Count': prnData.filter(item => item.status === 'paid').length },
        { 'Metric': 'Valid/Unpaid', 'Count': prnData.filter(item => item.status === 'unpaid').length },
        { 'Metric': 'Invalid PRNs', 'Count': prnData.filter(item => item.status === 'invalid').length },
        { 'Metric': 'Errors', 'Count': prnData.filter(item => item.status === 'error').length },
        { 'Metric': 'Unknown Status', 'Count': prnData.filter(item => item.status === 'unknown').length },
        { 'Metric': 'Pending', 'Count': prnData.filter(item => item.status === 'pending').length },
        { 'Metric': 'Total Retries', 'Count': prnData.reduce((sum, item) => sum + Math.max(0, (item.attempts || 0) - 1), 0) },
        { 'Metric': 'Export Date', 'Count': new Date().toLocaleString() }
      ];

      // Prepare processing history data
      const historyData = processingHistory.map((entry, index) => ({
        'Step': index + 1,
        'Timestamp': new Date(entry.timestamp).toLocaleString(),
        'Action': entry.action.replace(/_/g, ' ').toUpperCase(),
        'Details': entry.details
      }));

      // Create workbook with multiple sheets
      const workbook = XLSX.utils.book_new();

      // Add Results sheet
      const resultsWorksheet = XLSX.utils.json_to_sheet(resultsData);
      XLSX.utils.book_append_sheet(workbook, resultsWorksheet, 'Results');

      // Add Summary sheet
      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

      // Add Processing History sheet
      const historyWorksheet = XLSX.utils.json_to_sheet(historyData);
      XLSX.utils.book_append_sheet(workbook, historyWorksheet, 'Processing History');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filename = `ZRA_PRN_Results_${timestamp}.xlsx`;

      // Check if running in Electron for proper file saving
      if (isElectron && window.electronAPI?.saveExcel) {
        // Convert workbook to buffer for Electron
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const buffer = new Uint8Array(wbout);
        const base64Data = btoa(String.fromCharCode.apply(null, buffer));

        // Use Electron's save dialog
        const result = await window.electronAPI.saveExcel(base64Data, filename);
        
        if (result.success) {
          alert(`Excel file saved successfully!\n\nLocation: ${result.path}\n\nSheets included:\n• Results - Detailed PRN results\n• Summary - Statistics overview\n• Processing History - Timeline of actions`);
          
          // Add to processing history
          setProcessingHistory(prev => [...prev, {
            timestamp: new Date().toISOString(),
            action: 'excel_exported',
            details: `Exported results to ${result.path}`
          }]);
        } else {
          alert(`Failed to save Excel file: ${result.error}`);
        }
      } else {
        // Fallback to browser download for web version
        XLSX.writeFile(workbook, filename);
        
        alert(`Excel file exported as "${filename}"\n\nNote: In web version, file is downloaded to your default Downloads folder.\n\nSheets included:\n• Results - Detailed PRN results\n• Summary - Statistics overview\n• Processing History - Timeline of actions`);

        // Add to processing history
        setProcessingHistory(prev => [...prev, {
          timestamp: new Date().toISOString(),
          action: 'excel_exported',
          details: `Exported results to ${filename} (web download)`
        }]);
      }

    } catch (error) {
      alert(`Error exporting to Excel: ${error.message}`);
      console.error('Export error:', error);
    }
  };

  const viewPDF = (pdfData) => {
    if (!pdfData) return;
    const blob = new Blob([Uint8Array.from(atob(pdfData), c => c.charCodeAt(0))], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    setSelectedPdf(url);
  };

  const getStatusIcon = (status, isProcessing = false) => {
    if (isProcessing) {
      return <div className="w-5 h-5 rounded-full border-2 border-gray-300 animate-spin border-t-blue-500" />;
    }
    
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'unpaid':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'invalid':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'error':
      case 'unknown':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'unpaid': return 'Valid/Unpaid';
      case 'invalid': return 'Invalid PRN';
      case 'error': return 'Error';
      case 'unknown': return 'Unknown Status';
      default: return 'Pending';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'text-green-700 bg-green-100';
      case 'unpaid': return 'text-orange-700 bg-orange-100';
      case 'invalid': return 'text-red-700 bg-red-100';
      case 'error': return 'text-yellow-700 bg-yellow-100';
      case 'unknown': return 'text-purple-700 bg-purple-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="w-full">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">ZRA Customs PRN Payment Checker</h1>
              <p className="text-gray-600">Upload an Excel file with PRN numbers to check payment status and download receipts.</p>
            </div>
            <div className="text-right">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${isElectron ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {isElectron ? '🖥️ Desktop App' : '🌐 Web Version'}
              </div>
            </div>
          </div>
          
          {!isElectron && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="text-yellow-800 font-semibold mb-2 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Limited Functionality
              </h3>
              <p className="text-yellow-700 text-sm">
                You're using the web version. Download the desktop app for full functionality.
              </p>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 flex gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 sm:flex-none inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload Excel File
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPasteModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Copy className="w-5 h-5 mr-2" />
                  Paste PRNs
                </button>
              </div>
            </div>
            
            {prnData.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={processAllPRNs}
                  disabled={loading || !isElectron}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  {loading ? 'Processing...' : 
                    prnData.some(item => item.status === 'paid' || item.status === 'unpaid') ? 'Retry Failed' : 'Check All PRNs'
                  }
                </button>
                
                {prnData.some(item => item.status !== 'pending') && (
                  <button
                    onClick={() => {
                      const resetData = prnData.map(item => ({
                        ...item,
                        status: 'pending',
                        pdfData: null,
                        error: null,
                        details: null,
                        attempts: 0,
                        lastAttempt: null,
                        firstProcessed: null
                      }));
                      setPrnData(resetData);
                      setSelectedPdf(null);
                      setProcessingHistory(prev => [...prev, {
                        timestamp: new Date().toISOString(),
                        action: 'data_reset',
                        details: 'Reset all PRN statuses to pending'
                      }]);
                      setProcessingStatus('Reset complete - ready to process all PRNs again');
                      setTimeout(() => setProcessingStatus(''), 3000);
                    }}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 transition-colors text-sm"
                  >
                    Reset All
                  </button>
                )}
                
                <button
                  onClick={downloadAllPDFs}
                  disabled={prnData.filter(item => item.status === 'paid').length === 0 || !isElectron}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
                >
                  <FolderOpen className="w-5 h-5 mr-2" />
                  Save All PDFs ({prnData.filter(item => item.status === 'paid').length})
                </button>

                <button
                  onClick={exportToExcel}
                  disabled={prnData.length === 0}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  <FileSpreadsheet className="w-5 h-5 mr-2" />
                  Export Excel
                </button>
              </div>
            )}
          </div>

          {processingStatus && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <p className="text-blue-800">{processingStatus}</p>
            </div>
          )}
        </div>

        {/* Paste PRNs Modal */}
        {showPasteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Paste PRN Numbers</h2>
                  <button
                    onClick={() => {
                      setShowPasteModal(false);
                      setPastedPRNs('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="mb-4">
                  <p className="text-gray-600 text-sm mb-2">
                    Paste your PRN numbers below. They can be separated by:
                  </p>
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    • New lines (one PRN per line)<br/>
                    • Commas (,)<br/>
                    • Semicolons (;)<br/>
                    • Tabs or pipes (|)
                  </div>
                </div>

                <textarea
                  value={pastedPRNs}
                  onChange={(e) => setPastedPRNs(e.target.value)}
                  placeholder="Paste your PRN numbers here...&#10;Example:&#10;PRN001&#10;PRN002&#10;PRN003&#10;&#10;Or: PRN001, PRN002, PRN003"
                  className="w-full h-48 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />

                <div className="mt-4 text-sm text-gray-600">
                  {pastedPRNs.trim() && (
                    <p>
                      Found: <span className="font-semibold text-blue-600">
                        {pastedPRNs.split(/[\n\r,;|\t]/).filter(line => line.trim()).length} PRNs
                      </span>
                    </p>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handlePastedPRNs}
                    disabled={!pastedPRNs.trim()}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Use These PRNs
                  </button>
                  <button
                    onClick={createExcelFromPastedPRNs}
                    disabled={!pastedPRNs.trim()}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Create Excel File
                  </button>
                </div>
                
                <div className="mt-3 text-xs text-gray-500 text-center">
                  "Use These PRNs" will load them directly into the app.<br/>
                  "Create Excel File" will generate a downloadable Excel file for later use.
                </div>
              </div>
            </div>
          </div>
        )}

        {prnData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">PRN Status ({prnData.length} total)</h2>
              
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {prnData.map((item, index) => (
                  <div key={index} className={`border rounded-lg p-4 transition-colors ${
                    currentProcessing === index ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(item.status, currentProcessing === index)}
                        <span className="font-mono text-sm font-medium">{item.prn}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                          {currentProcessing === index ? 'Processing...' : getStatusText(item.status)}
                        </span>
                        <button
                          onClick={() => removePrn(index)}
                          disabled={loading}
                          className="text-red-500 hover:text-red-700 disabled:text-gray-400 transition-colors"
                          title="Remove PRN"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {item.error && (
                      <div className="text-xs text-red-600 mb-2">
                        Error: {item.error}
                      </div>
                    )}

                    {item.details && (
                      <div className="text-xs text-gray-600 mb-2 bg-gray-50 p-2 rounded">
                        {item.status === 'paid' && (
                          <>
                            <div><strong>Amount:</strong> {item.details.currency} {item.details.amount}</div>
                            <div><strong>Taxpayer:</strong> {item.details.taxpayer}</div>
                            <div><strong>Description:</strong> {item.details.narration}</div>
                          </>
                        )}
                        {item.status === 'unpaid' && (
                          <>
                            <div><strong>Status:</strong> Payment Pending</div>
                            <div><strong>Amount Due:</strong> {item.details.currency} {item.details.amount}</div>
                            <div><strong>Taxpayer:</strong> {item.details.taxpayer}</div>
                            <div><strong>Description:</strong> {item.details.narration}</div>
                            <div><strong>PRN Date:</strong> {item.details.prnDate}</div>
                          </>
                        )}
                      </div>
                    )}

                    {(item.attempts > 1 || item.firstProcessed) && (
                      <div className="text-xs text-gray-500 mb-2">
                        {item.attempts > 1 && <span>Attempts: {item.attempts} | </span>}
                        {item.firstProcessed && <span>First: {new Date(item.firstProcessed).toLocaleString()}</span>}
                      </div>
                    )}
                    
                    {item.status === 'paid' && item.pdfData && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => viewPDF(item.pdfData)}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                        >
                          View PDF
                        </button>
                        {isElectron && (
                          <button
                            onClick={() => downloadPDF(item.prn, item.pdfData)}
                            className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            Save PDF
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-5 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-green-600 font-semibold">
                      {prnData.filter(item => item.status === 'paid').length}
                    </div>
                    <div className="text-gray-500">Paid</div>
                  </div>
                  <div className="text-center">
                    <div className="text-orange-600 font-semibold">
                      {prnData.filter(item => item.status === 'unpaid').length}
                    </div>
                    <div className="text-gray-500">Unpaid</div>
                  </div>
                  <div className="text-center">
                    <div className="text-red-600 font-semibold">
                      {prnData.filter(item => item.status === 'invalid').length}
                    </div>
                    <div className="text-gray-500">Invalid</div>
                  </div>
                  <div className="text-center">
                    <div className="text-yellow-600 font-semibold">
                      {prnData.filter(item => item.status === 'error' || item.status === 'unknown').length}
                    </div>
                    <div className="text-gray-500">Errors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600 font-semibold">
                      {prnData.filter(item => item.status === 'pending').length}
                    </div>
                    <div className="text-gray-500">Pending</div>
                  </div>
                </div>
                
                {prnData.some(item => item.status === 'error' || item.status === 'pending' || item.status === 'invalid' || item.status === 'unknown') && (
                  <div className="mt-3 p-2 bg-blue-50 rounded text-center">
                    <p className="text-blue-700 text-xs">
                      💡 Click "Retry Failed" to only process pending, failed and invalid PRNs
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">PDF Viewer</h2>
              
              {selectedPdf ? (
                <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
                  <iframe
                    src={selectedPdf}
                    className="w-full h-full"
                    title="PRN Receipt PDF"
                  />
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center" style={{ height: '600px' }}>
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Select a PDF to view it here</p>
                </div>
              )}
            </div>
          </div>
        )}

        {prnData.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No PRN data uploaded</h3>
            <p className="text-gray-500">Upload an Excel file containing PRN numbers to get started.</p>
            <p className="text-sm text-gray-400 mt-2">Expected format: Excel file with PRN numbers in the first column or a column named 'PRN'</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;