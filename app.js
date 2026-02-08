import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import fs from "fs";

// 1. 基本路徑與環境設定
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*" }
});

// 2. 自動建立目錄架構
// 確保 public 與 public/uploads 資料夾存在，避免儲存時報錯
const publicDir = path.join(__dirname, "public");
const uploadDir = path.join(publicDir, "uploads");

[publicDir, uploadDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`[System] Created directory: ${dir}`);
    }
});

// 靜態檔案服務：讓瀏覽器可以透過網址讀取 .wav 檔案
app.use(express.static(publicDir));

// 3. 全域變數：儲存目前所有已錄製聲音的網址清單
let audioFiles = [];

// 4. Socket.io 核心邏輯
io.on("connection", (socket) => {
    console.log(`[Connection] User connected: ${socket.id}`);

    // 【初始化】當新使用者連線時，立刻傳送目前的聲音清單給他
    socket.emit("init-audio-list", audioFiles);

    // 【接收錄音】監聽前端傳來的錄音資料 (Blob/Buffer)
    socket.on("upload-audio", (data) => {
        if (!data || !data.audio) {
            console.error("無效的音訊數據");
            return;
        }

        // 使用時間戳與 Socket ID 生成唯一檔名
        const fileName = `voice-${Date.now()}-${socket.id.substring(0, 4)}.wav`;
        const filePath = path.join(uploadDir, fileName);

        // 將二進位資料寫入實體檔案
        fs.writeFile(filePath, data.audio, (err) => {
            if (err) {
                console.error("儲存失敗:", err);
                socket.emit("upload-error");
                return;
            }

            const fileUrl = `/uploads/${fileName}`;
            console.log(`[File Saved] ${fileName} by ${socket.id}`);

            // 將新聲音加入清單
            audioFiles.push(fileUrl);

            // A. 回傳成功給發送者
            socket.emit("upload-success", { url: fileUrl });

            // B. 即時廣播給所有人（包含自己）：有一個新聲音可以載入了
            io.emit("new-voice", {
                url: fileUrl,
                id: socket.id,
                total: audioFiles.length
            });
        });
    });

    // 【中斷連線】
    socket.on("disconnect", () => {
        console.log(`[Disconnect] User disconnected: ${socket.id}`);
    });
});

// 5. 啟動伺服器
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`  Distributed Choir Server is running!`);
    console.log(`  Port: ${PORT}`);
    console.log(`  Public Path: ${publicDir}`);
    console.log(`=========================================`);
});