const electronInstaller = require('electron-winstaller');

(async function() {
    try {
        await electronInstaller.createWindowsInstaller({
          appDirectory: './electron-gui-win32-x64',
          outputDirectory: './release',
          authors: 'My App Inc.',
          exe: 'electron-gui.exe'
        });
        console.log('It worked!');
      } catch (e) {
        console.log(`No dice: ${e.message}`);
      }

})()