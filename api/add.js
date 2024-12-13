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

  if (method === "POST" && magnet) {
    try {
      client.add(magnet, (torrent) => {
        const files = torrent.files.map((file) => ({
          name: file.name,
          length: file.length,
        }));
        res.status(200).json(files);
      });
    } catch (error) {
      console.error("Error adding torrent:", error);
      res.status(500).send("Internal server error");
    }
  } else {
    res.status(400).send("Magnet link is required for POST requests");
  }
}
