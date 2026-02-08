import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import multer from "multer";
// ... 其他 import

const app = express();
const httpServer = createServer(app); // 必須用 httpServer 包裝 app
const io = new Server(httpServer, {
    cors: { origin: "*" } // 允許跨域連線
});

const upload = multer({ dest: "public/uploads/" });

app.post("/upload", upload.single("audio"), (req, res) => {
    if (req.file) {
        const fileUrl = `/uploads/${req.file.filename}`;
        // 關鍵：廣播給所有人，包含你自己
        io.emit("new-voice", { url: fileUrl });
        res.json({ url: fileUrl });
    }
});

// 務必使用 httpServer.listen 而不是 app.listen
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});