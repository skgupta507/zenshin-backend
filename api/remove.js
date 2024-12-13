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

  if (method === "DELETE" && magnet) {
    try {
      let tor = client.get(magnet);
      if (!tor) {
        return res.status(404).send("Torrent not found");
      }

      tor.destroy((err) => {
        if (err) {
          console.error("Error removing torrent:", err);
          return res.status(500).send("Error removing torrent");
        }

        res.status(200).send("Torrent removed successfully");
      });
    } catch (error) {
      console.error("Error handling remove request:", error);
      res.status(500).send("Internal server error");
    }
  } else {
    res.status(400).send("Magnet link is required for DELETE requests");
  }
}
