const { app, BrowserWindow } = require('electron');
const { exec } = require('child_process');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Add a delay before loading the URL to give the servers some time to start
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:3000');
  }, 5000); // 5 seconds delay
}

app.whenReady().then(() => {
  // Start backend services
  exec('cd backend/classifier && py svm_model.py', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error starting classifier: ${error.message}`);
      return;
    }
    console.log(`Classifier stdout: ${stdout}`);
    console.error(`Classifier stderr: ${stderr}`);
  });

  exec('cd backend && node server.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error starting backend server: ${error.message}`);
      return;
    }
    console.log(`Backend server stdout: ${stdout}`);
    console.error(`Backend server stderr: ${stderr}`);
  });

  exec('cd frontend && npm start', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error starting frontend: ${error.message}`);
      return;
    }
    console.log(`Frontend stdout: ${stdout}`);
    console.error(`Frontend stderr: ${stderr}`);
  });

  createWindow();

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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});