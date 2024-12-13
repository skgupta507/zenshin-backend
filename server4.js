import WebTorrent from "webtorrent";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import { exec } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let client;

const initializeClient = () => {
  if (!client) {
    client = new WebTorrent();
  }
};

// Handle seeding existing files (stub for external storage in Vercel)
const seedExistingFiles = () => {
  console.log("Seeding functionality is limited in serverless environments");
};

// Routes
export default async function handler(req, res) {
  const { method, query } = req;
  const { magnet, filename } = query;

  initializeClient();

  try {
    if (req.url.startsWith("/api/add")) {
      if (method === "GET" && magnet) {
        let existingTorrent = client.get(magnet);
        if (existingTorrent) {
          let files = existingTorrent.files.map((file) => ({
            name: file.name,
            length: file.length,
          }));
          return res.status(200).json(files);
        }

        client.add(magnet, (torrent) => {
          let files = torrent.files.map((file) => ({
            name: file.name,
            length: file.length,
          }));
          res.status(200).json(files);
        });
      }
    } else if (req.url.startsWith("/api/streamfile")) {
      if (method === "GET" && magnet && filename) {
        let tor = client.get(magnet);

        if (!tor) return res.status(404).send("Torrent not found");
        let file = tor.files.find((f) => f.name === filename);

        if (!file) return res.status(404).send("No file found in the torrent");
        file.select();

        let range = req.headers.range;
        if (!range) return res.status(416).send("Range is required");

        let positions = range.replace(/bytes=/, "").split("-");
        let start = parseInt(positions[0], 10);
        let fileSize = file.length;
        let end = positions[1] ? parseInt(positions[1], 10) : fileSize - 1;
        let chunkSize = end - start + 1;

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": "video/x-matroska",
        });

        file.createReadStream({ start, end }).pipe(res);
      }
    } else if (req.url.startsWith("/api/details")) {
      if (method === "GET" && magnet) {
        let tor = client.get(magnet);

        if (!tor) return res.status(404).send("Torrent not found");

        res.status(200).json({
          name: tor.name,
          length: tor.length,
          downloaded: tor.downloaded,
          uploaded: tor.uploaded,
          downloadSpeed: tor.downloadSpeed,
          uploadSpeed: tor.uploadSpeed,
          progress: tor.progress,
          ratio: tor.ratio,
          numPeers: tor.numPeers,
        });
      }
    } else if (req.url.startsWith("/api/ping")) {
      if (method === "GET") {
        res.status(200).send("pong");
      }
    } else if (req.url.startsWith("/api/remove")) {
      if (method === "DELETE" && magnet) {
        let tor = client.get(magnet);
        if (!tor) return res.status(404).send("Torrent not found");

        tor.destroy((err) => {
          if (err) {
            console.error("Error removing torrent:", err);
            return res.status(500).send("Error removing torrent");
          }

          res.status(200).send("Torrent removed successfully");
        });
      }
    } else if (req.url.startsWith("/api/stream-to-vlc")) {
      if (method === "GET" && query.url) {
        const vlcPath = '"C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe"'; // Adjust this path as needed
        const vlcCommand = `${vlcPath} "${query.url}"`;

        exec(vlcCommand, (error) => {
          if (error) {
            console.error(`Error launching VLC: ${error.message}`);
            return res.status(500).send("Error launching VLC");
          }
          res.send("VLC launched successfully");
        });
      } else {
        res.status(400).send("URL is required");
      }
    } else {
      res.status(404).send("Route not found");
    }
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).send("Internal server error");
  }
}
