import WebTorrent from "webtorrent";

let client;

const initializeClient = () => {
  if (!client) {
    client = new WebTorrent();
  }
};

export default async function handler(req, res) {
  const { method, query, headers } = req;
  const { magnet, filename } = query;

  initializeClient();

  if (method === "GET" && magnet && filename) {
    try {
      const torrent = client.get(magnet);

      if (!torrent) {
        return res.status(404).send("Torrent not found");
      }

      const file = torrent.files.find((f) => f.name === filename);

      if (!file) {
        return res.status(404).send("File not found in torrent");
      }

      const range = headers.range;

      if (!range) {
        return res.status(416).send("Range header is required");
      }

      const positions = range.replace(/bytes=/, "").split("-");
      const start = parseInt(positions[0], 10);
      const end = positions[1] ? parseInt(positions[1], 10) : file.length - 1;
      const chunksize = end - start + 1;

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${file.length}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": "video/x-matroska", // Adjust based on your file type
      });

      const stream = file.createReadStream({ start, end });
      stream.pipe(res);

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        res.status(500).send("Error streaming file");
      });
    } catch (error) {
      console.error("Error streaming file:", error);
      res.status(500).send("Internal server error");
    }
  } else {
    res.status(400).send("Magnet link and filename are required for GET requests");
  }
}
