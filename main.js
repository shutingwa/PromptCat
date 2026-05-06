/**
 * ===================================================================
 *  █████╗ ███╗   ██╗██████╗ ██╗   ██╗
 * ██╔══██╗████╗  ██║██╔══██╗╚██╗ ██╔╝
 * ███████║██╔██╗ ██║██║  ██║ ╚████╔╝ 
 * ██╔══██║██║╚██╗██║██║  ██║  ╚██╔╝  
 * ██║  ██║██║ ╚████║██████╔╝   ██║   
 * ╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝    ╚═╝   
 * 
 * Version: 1.0.0
 * Commemorating our 1st Anniversary.
 * To Andy: 
 * 也许这世上的 Bug 永远修不完，
 * 但你在我人生的主分支里，永远是那句最完美的 return true;
 * ===================================================================
 */

const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'prompts_forest.json');
const dailyPath = path.join(userDataPath, 'daily_notes.json');
const habitsPath = path.join(userDataPath, 'daily_habits.json'); 

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 200, height: 200, transparent: true, frame: false,
    alwaysOnTop: true, resizable: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  mainWindow.loadFile('index.html');
  ipcMain.on('window-move', (event, { x, y }) => {
    const pos = mainWindow.getPosition();
    mainWindow.setPosition(pos[0] + x, pos[1] + y);
  });
  startHealthReminders();
}

// --- 定时器与提醒引擎 ---
function startHealthReminders() {
  setTimeout(() => { sendReminder('喵~ 专注工作的同时，也要注意身体哦！'); }, 5000);
  setInterval(() => { sendReminder('坐太久啦，起来伸个懒腰，活动一下筋骨吧！🐈'); }, 45 * 60 * 1000);
  setInterval(() => { sendReminder('该喝水啦，咕噜咕噜~ 补充水分！💧'); }, 90 * 60 * 1000);

  // 核心：每 1 小时检查一次未划掉的“每日固定事项”
  setInterval(() => {
    const habits = getTodayData(habitsPath).items;
    const pending = habits.filter(h => !h.done);
    if (pending.length > 0) {
      const taskNames = pending.slice(0, 2).map(h => h.text).join('、');
      const moreStr = pending.length > 2 ? '等' : '';
      sendReminder(`喵！提醒一下，【${taskNames}${moreStr}】还没完成哦！📋`);
    }
  }, 60 * 60 * 1000); 
}

function sendReminder(message) {
  if (mainWindow) mainWindow.webContents.send('show-reminder', message);
  if (Notification.isSupported()) new Notification({ title: '小猫提醒', body: message, silent: false }).show();
}

// --- 数据引擎 ---
function getTodayData(filePath) {
  const today = new Date().toLocaleDateString();
  if (fs.existsSync(filePath)) {
    let data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (data.date === today) return data;
  }
  return { date: today, items: [] };
}
function saveTodayData(filePath, data) { fs.writeFileSync(filePath, JSON.stringify(data, null, 2)); }

// --- 接口处理 ---
ipcMain.on('save-prompt', (event, text) => {
  let prompts = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, 'utf-8')) : [];
  prompts.unshift({ id: Date.now(), text: text, date: new Date().toLocaleString() });
  fs.writeFileSync(dbPath, JSON.stringify(prompts, null, 2));
});
ipcMain.handle('get-prompts', () => fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, 'utf-8')) : []);
ipcMain.handle('delete-prompt', (event, id) => {
  let prompts = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, 'utf-8')) : [];
  prompts = prompts.filter(p => p.id !== id);
  fs.writeFileSync(dbPath, JSON.stringify(prompts, null, 2)); return prompts;
});

ipcMain.handle('get-daily', () => getTodayData(dailyPath).items);
ipcMain.handle('add-daily', (event, text) => {
  let data = getTodayData(dailyPath); data.items.unshift({ id: Date.now(), text: text, done: false });
  saveTodayData(dailyPath, data); return data.items;
});
ipcMain.on('save-daily-silent', (event, text) => {
  let data = getTodayData(dailyPath); data.items.unshift({ id: Date.now(), text: text, done: false });
  saveTodayData(dailyPath, data);
});
ipcMain.handle('toggle-daily', (event, id) => {
  let data = getTodayData(dailyPath); let item = data.items.find(i => i.id === id);
  if (item) item.done = !item.done; saveTodayData(dailyPath, data); return data.items;
});
ipcMain.handle('delete-daily', (event, id) => {
  let data = getTodayData(dailyPath); data.items = data.items.filter(i => i.id !== id);
  saveTodayData(dailyPath, data); return data.items;
});

ipcMain.handle('get-habits', () => getTodayData(habitsPath).items);
ipcMain.handle('add-habit', (event, text) => {
  let data = getTodayData(habitsPath); data.items.push({ id: Date.now(), text: text, done: false });
  saveTodayData(habitsPath, data); return data.items;
});
ipcMain.handle('toggle-habit', (event, id) => {
  let data = getTodayData(habitsPath); let item = data.items.find(i => i.id === id);
  if (item) item.done = !item.done; saveTodayData(habitsPath, data); return data.items;
});
ipcMain.handle('delete-habit', (event, id) => {
  let data = getTodayData(habitsPath); data.items = data.items.filter(i => i.id !== id);
  saveTodayData(habitsPath, data); return data.items;
});

ipcMain.on('open-library', () => {
  const libWindow = new BrowserWindow({
    width: 850, height: 650, title: "收纳库", autoHideMenuBar: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  libWindow.loadFile('library.html');
});
ipcMain.on('window-zoom', (event, delta) => {
  const bounds = mainWindow.getBounds();
  let newSize = Math.max(100, Math.min(800, bounds.width + delta));
  mainWindow.setBounds({ 
    x: Math.round(bounds.x - (newSize - bounds.width) / 2), 
    y: Math.round(bounds.y - (newSize - bounds.height) / 2), 
    width: newSize, height: newSize 
  });
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });