import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

// 設定上傳目錄
const upload = multer({ dest: "public/uploads/" });

// 關鍵：確保指向正確的 public 資料夾
app.use(express.static(path.join(__dirname, "public")));

// 錄音上傳路由
app.post("/upload", upload.single("audio"), (req, res) => {
    if (req.file) {
        const fileUrl = `/uploads/${req.file.filename}`;
        io.emit("new-voice", { url: fileUrl }); // 廣播給所有人
        res.json({ url: fileUrl });
    }
});

// 務必使用 httpServer.listen 而不是 app.listen
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});