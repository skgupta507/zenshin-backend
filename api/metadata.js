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
      const torrent = client.add(magnet, { path: "/tmp" });

      torrent.on("metadata", () => {
        const files = torrent.files.map((file) => ({
          name: file.name,
          length: file.length,
        }));
        res.status(200).json(files);
      });
    } catch (error) {
      console.error("Error fetching metadata:", error);
      res.status(500).send("Internal server error");
    }
  } else {
    res.status(400).send("Magnet link is required for GET requests");
  }
}
