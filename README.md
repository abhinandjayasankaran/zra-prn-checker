# ZRA PRN Checker

A desktop application for checking ZRA (Zambia Revenue Authority) Customs PRN (Payment Reference Number) payments.

## Overview

The ZRA PRN Checker is an Electron-based desktop application built with React that helps users verify and manage ZRA customs payment reference numbers. This tool streamlines the process of checking payment statuses and managing customs-related transactions.

## Features

- 🔍 **PRN Payment Verification** - Check the status of ZRA customs payment reference numbers
- 📊 **Excel Integration** - Import/export payment data using XLSX format
- 🖥️ **Cross-Platform** - Available for Windows, macOS, and Linux
- ⚡ **Fast & Responsive** - Built with React and Vite for optimal performance
- 🎨 **Modern UI** - Clean interface with Lucide React icons

## Tech Stack

- **Frontend**: React 18, Vite
- **Desktop**: Electron 28
- **Icons**: Lucide React
- **File Processing**: XLSX
- **Build Tool**: Electron Builder

## Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/abhinandjayasankaran/zra-prn-checker.git
   cd zra-prn-checker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

## Development

### Running in Development Mode

Start the development server with hot reload:

```bash
npm run dev
```

This starts the Vite development server on `http://localhost:5173`.

### Running Electron in Development

To run the full Electron application in development mode:

```bash
npm run electron-dev
```

This command will:
1. Start the Vite development server
2. Wait for the server to be ready
3. Launch the Electron application

### Running Electron Only

If the development server is already running, you can start just the Electron wrapper:

```bash
npm run electron
```

## Building for Production

### Build Web Assets

```bash
npm run build
```

### Build Desktop Applications

Build for all platforms:
```bash
npm run dist
```

Build for specific platforms:
```bash
# macOS
npm run dist-mac

# Windows
npm run dist-win

# Linux
npm run dist-linux
```

Built applications will be available in the `release/` directory.

## Project Structure

```
zra-prn-checker/
├── src/
│   ├── electron/
│   │   ├── main.js          # Electron main process
│   │   └── preload.js       # Electron preload script
│   ├── App.jsx              # Main React component
│   ├── App.css              # Application styles
│   └── main.jsx             # React entry point
├── dist/                    # Built web assets
├── release/                 # Built desktop applications
├── package.json
├── vite.config.js
└── README.md
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build web assets for production |
| `npm run preview` | Preview built web assets |
| `npm run electron` | Run Electron application |
| `npm run electron-dev` | Run full development environment |
| `npm run dist` | Build desktop applications for all platforms |
| `npm run dist-mac` | Build for macOS |
| `npm run dist-win` | Build for Windows |
| `npm run dist-linux` | Build for Linux |
| `npm run clean` | Clean build artifacts and cache |
| `npm run reinstall` | Clean reinstall dependencies |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and questions related to ZRA customs processes, please refer to the official ZRA documentation or contact the ZRA support team.

For technical issues with this application, please open an issue on GitHub.

---

**Note**: This application is designed to work with ZRA (Zambia Revenue Authority) systems. Ensure you have the necessary permissions and credentials to access ZRA services.
