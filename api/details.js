import WebTorrent from "webtorrent";

let client;

const initializeClient = () => {
  if (!client) {
    client = new WebTorrent();
  }
};

export default async function handler(req, res) {
  const { method, query } = req;
  const { magnet } = query;

  initializeClient();

  if (method === "GET" && magnet) {
    try {
      const torrent = client.get(magnet);

      if (!torrent) {
        return res.status(404).send("Torrent not found");
      }

      const details = {
        name: torrent.name,
        length: torrent.length,
        downloaded: torrent.downloaded,
        uploaded: torrent.uploaded,
        downloadSpeed: torrent.downloadSpeed,
        uploadSpeed: torrent.uploadSpeed,
        progress: torrent.progress,
        ratio: torrent.ratio,
        numPeers: torrent.numPeers,
      };

      res.status(200).json(details);
    } catch (error) {
      console.error("Error fetching torrent details:", error);
      res.status(500).send("Internal server error");
    }
  } else {
    res.status(400).send("Magnet link is required for GET requests");
  }
}
