import React, { useState, useRef } from 'react';
import { Upload, Download, FileText, CheckCircle, XCircle, AlertCircle, FolderOpen, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

const App = () => {
  const [prnData, setPrnData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [processingStatus, setProcessingStatus] = useState('');
  const [currentProcessing, setCurrentProcessing] = useState(-1);
  const [processingHistory, setProcessingHistory] = useState([]);
  const fileInputRef = useRef(null);

  // Detect if running in Electron
  const isElectron = !!(
    window.electronAPI?.isElectron || 
    window.isElectronApp ||
    window.require || 
    window.process?.type === 'renderer' ||
    navigator.userAgent.includes('Electron')
  );

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
        attempts: 0,
        lastAttempt: null,
        firstProcessed: null
      }));

      setPrnData(initialData);
      setSelectedPdf(null);
      setProcessingHistory([{
        timestamp: new Date().toISOString(),
        action: 'file_uploaded',
        details: `Uploaded file with ${prns.length} PRNs`
      }]);
    } catch (error) {
      alert('Error reading file. Please ensure it\'s a valid Excel file.');
    }
  };

  const checkPRNStatus = async (prn) => {
    if (!isElectron) {
      return { status: 'error', pdfData: null, error: 'This feature requires the desktop app' };
    }

    try {
      const result = await window.electronAPI.checkPRN(prn);
      
      if (result.success) {
        return { status: 'paid', pdfData: result.pdfData, error: null };
      } else {
        return { status: result.status, pdfData: null, error: result.error };
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

    // Filter to only process pending, error, or failed PRNs
    const prnIndexesToProcess = prnData
      .map((item, index) => ({ ...item, originalIndex: index }))
      .filter(item => item.status === 'pending' || item.status === 'error')
      .map(item => item.originalIndex);

    if (prnIndexesToProcess.length === 0) {
      alert('All PRNs have already been processed successfully. Upload a new file or refresh to try again.');
      return;
    }

    const totalToProcess = prnIndexesToProcess.length;
    const alreadyProcessed = prnData.filter(item => item.status === 'paid').length;
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
        error: result.error
      };

      setPrnData([...updatedData]);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setLoading(false);
    setCurrentProcessing(-1);
    
    const finalSuccessCount = updatedData.filter(item => item.status === 'paid').length;
    const finalFailCount = updatedData.filter(item => item.status === 'error' || item.status === 'invalid').length;
    
    // Add completion to history
    setProcessingHistory(prev => [...prev, {
      timestamp: new Date().toISOString(),
      action: 'processing_completed',
      details: `Completed: ${finalSuccessCount} successful, ${finalFailCount} failed`
    }]);
    
    setProcessingStatus(
      `Processing complete! ✅ ${finalSuccessCount} successful, ❌ ${finalFailCount} failed`
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

  const exportToExcel = () => {
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
        'Has PDF': item.pdfData ? 'Yes' : 'No'
      }));

      // Prepare summary data
      const summaryData = [
        { 'Metric': 'Total PRNs', 'Count': prnData.length },
        { 'Metric': 'Paid/Successful', 'Count': prnData.filter(item => item.status === 'paid').length },
        { 'Metric': 'Invalid/Unpaid', 'Count': prnData.filter(item => item.status === 'invalid').length },
        { 'Metric': 'Errors', 'Count': prnData.filter(item => item.status === 'error').length },
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

      // Save the file
      XLSX.writeFile(workbook, filename);

      // Show success message
      alert(`Excel file exported successfully as "${filename}"\n\nSheets included:\n• Results - Detailed PRN results\n• Summary - Statistics overview\n• Processing History - Timeline of actions`);

      // Add to processing history
      setProcessingHistory(prev => [...prev, {
        timestamp: new Date().toISOString(),
        action: 'excel_exported',
        details: `Exported results to ${filename}`
      }]);

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
      case 'invalid':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'invalid': return 'Invalid/Unpaid';
      case 'error': return 'Error';
      default: return 'Pending';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'text-green-700 bg-green-100';
      case 'invalid': return 'text-red-700 bg-red-100';
      case 'error': return 'text-yellow-700 bg-yellow-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
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
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload Excel File
              </button>
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
                    prnData.some(item => item.status === 'paid') ? 'Retry Failed' : 'Check All PRNs'
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

        {prnData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">PRN Status ({prnData.length} total)</h2>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {prnData.map((item, index) => (
                  <div key={index} className={`border rounded-lg p-4 transition-colors ${
                    currentProcessing === index ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(item.status, currentProcessing === index)}
                        <span className="font-mono text-sm font-medium">{item.prn}</span>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                        {currentProcessing === index ? 'Processing...' : getStatusText(item.status)}
                      </span>
                    </div>
                    
                    {item.error && (
                      <div className="text-xs text-red-600 mb-2">
                        Error: {item.error}
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
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-green-600 font-semibold">
                      {prnData.filter(item => item.status === 'paid').length}
                    </div>
                    <div className="text-gray-500">Paid</div>
                  </div>
                  <div className="text-center">
                    <div className="text-red-600 font-semibold">
                      {prnData.filter(item => item.status === 'invalid').length}
                    </div>
                    <div className="text-gray-500">Invalid</div>
                  </div>
                  <div className="text-center">
                    <div className="text-yellow-600 font-semibold">
                      {prnData.filter(item => item.status === 'error').length}
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
                
                {prnData.some(item => item.status === 'error' || item.status === 'pending') && (
                  <div className="mt-3 p-2 bg-blue-50 rounded text-center">
                    <p className="text-blue-700 text-xs">
                      💡 Click "Retry Failed" to only process pending and failed PRNs
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">PDF Viewer</h2>
              
              {selectedPdf ? (
                <div className="border rounded-lg overflow-hidden" style={{ height: '500px' }}>
                  <iframe
                    src={selectedPdf}
                    className="w-full h-full"
                    title="PRN Receipt PDF"
                  />
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center" style={{ height: '500px' }}>
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