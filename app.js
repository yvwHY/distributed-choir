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
const io = new Server(httpServer);    
const PORT = process.env.PORT || 3000;

const upload = multer({ dest: "public/uploads/" });

app.use(express.static(path.join(__dirname, "public")));

app.post("/upload", upload.single("audio"), (req, res) => {
    const fileUrl = `/uploads/${req.file.filename}`;
    
    io.emit("new-voice", { url: fileUrl });
    res.json({ url: fileUrl });
});

io.on("connection", (socket) => {
    console.log("A client connected");
});

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on Port: ${PORT}`);
});