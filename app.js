import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import fs from "fs";

// 1. Basic paths and environment setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*" }
});

// 2. Automated directory structure creation
// Ensure 'public' and 'public/uploads' exist to prevent errors during saving
const publicDir = path.join(__dirname, "public");
const uploadDir = path.join(publicDir, "uploads");

[publicDir, uploadDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`[System] Created directory: ${dir}`);
    }
});

// Static file service: Allows browsers to access .wav files via URL
app.use(express.static(publicDir));

// 3. Global variable: Stores the list of all recorded audio URLs
let audioFiles = [];

// 4. Socket.io core logic
io.on("connection", (socket) => {
    console.log(`[Connection] User connected: ${socket.id}`);

    // [Initialization] Send current audio list to user immediately upon connection
    socket.emit("init-audio-list", audioFiles);

    // [Audio Upload] Listen for incoming audio data (Blob/Buffer) from the frontend
    socket.on("upload-audio", (data) => {
        if (!data || !data.audio) {
            console.error("Invalid audio data received");
            return;
        }

        // Generate a unique filename using timestamp and socket ID
        const fileName = `voice-${Date.now()}-${socket.id.substring(0, 4)}.wav`;
        const filePath = path.join(uploadDir, fileName);

        // Write binary data to a physical .wav file on the server
        fs.writeFile(filePath, data.audio, (err) => {
            if (err) {
                console.error("Storage failed:", err);
                socket.emit("upload-error");
                return;
            }

            const fileUrl = `/uploads/${fileName}`;
            console.log(`[File Saved] ${fileName} by ${socket.id}`);

            // Add new audio URL to the global list
            audioFiles.push(fileUrl);

            // A. Notify the sender that the upload was successful
            socket.emit("upload-success", { url: fileUrl });

            // B. Broadcast to ALL users (including sender) to load the new voice
            io.emit("new-voice", {
                url: fileUrl,
                id: socket.id,
                total: audioFiles.length
            });
        });
    });

    // [Disconnection]
    socket.on("disconnect", () => {
        console.log(`[Disconnect] User disconnected: ${socket.id}`);
    });
});

// 5. Start Server
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`  Distributed Choir Server is running!`);
    console.log(`  Port: ${PORT}`);
    console.log(`  Public Path: ${publicDir}`);
    console.log(`=========================================`);
});