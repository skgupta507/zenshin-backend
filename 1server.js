import express from "express";
import WebTorrent from "webtorrent";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import { exec } from "child_process";

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the downloads directory exists
const downloadsDir = path.join(__dirname, "downloads");
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

const app = express();
const client = new WebTorrent();

app.use(cors());

/* ------------- CHECK LATEST GITHUB RELEASE ------------ */
const owner = "hitarth-gg"; // Replace with the repository owner
const repo = "zenshin"; // Replace with the repository name
const currentVersion = "v1.0.0"; // Replace with the current version

const getLatestRelease = async () => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases/latest`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.tag_name !== currentVersion) {
      console.log(chalk.blue("New version available:", data.tag_name));
      console.log("Release notes:", data.body);
      console.log(
        chalk.yellow(
          "Download URL: https://github.com/hitarth-gg/zenshin/releases"
        )
      );
    }
  } catch (error) {
    console.error("Error fetching latest release:", error);
  }
};
getLatestRelease();
/* ------------------------------------------------------ */

/* ----------------- SEED EXISTING FILES ---------------- */
const seedExistingFiles = () => {
  fs.readdir(downloadsDir, (err, files) => {
    if (err) {
      console.error("Error reading downloads directory:", err);
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(downloadsDir, file);

      if (fs.lstatSync(filePath).isFile()) {
        client.seed(filePath, { path: downloadsDir }, (torrent) => {
          console.log(
            chalk.bgBlue("Seeding started: "),
            chalk.cyan(torrent.name)
          );
          torrent.on("error", (err) => {
            console.error(chalk.bgRed("Error seeding file:"), err);
          });
        });
      }
    });
  });
};
seedExistingFiles();
/* ------------------------------------------------------ */

/* ----------------------- ROUTES ----------------------- */

// Add a torrent
app.get("/add/:magnet", async (req, res) => {
  let magnet = req.params.magnet;
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
});

// Stream a file from a torrent
app.get("/streamfile/:magnet/:filename", async (req, res) => {
  let { magnet, filename } = req.params;
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
});

// Deselect a file
app.get("/deselect/:magnet/:filename", async (req, res) => {
  let { magnet, filename } = req.params;
  let tor = client.get(magnet);

  if (!tor) return res.status(404).send("Torrent not found");
  let file = tor.files.find((f) => f.name === filename);

  if (!file) return res.status(404).send("No file found in the torrent");

  file.deselect();
  res.status(200).send("File deselected successfully");
});

// Get torrent details
app.get("/details/:magnet", async (req, res) => {
  let magnet = req.params.magnet;
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
});

// Ping the backend
app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

/* ------------------------------------------------------ */

// Use the Vercel default port or fallback to 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
