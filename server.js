const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";

const banksPath = path.join(__dirname, "config", "banks.json");

function loadBanks() {
  if (!fs.existsSync(banksPath)) {
    throw new Error(`Missing required file: ${banksPath}`);
  }
  const data = JSON.parse(fs.readFileSync(banksPath, "utf8"));
  if (!Array.isArray(data.banks) || data.banks.length !== 4) {
    throw new Error("config/banks.json must contain exactly 4 banks.");
  }
  return data;
}

const banks = loadBanks();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (url.pathname === "/" || url.pathname === "/health" || url.pathname === "/api/health") {
    return res.end(JSON.stringify({
      ok: true,
      status: "online",
      service: "Supreme Empire Server",
      banks: banks.banks.length
    }));
  }

  if (url.pathname === "/api/status") {
    return res.end(JSON.stringify({
      ok: true,
      status: "online",
      service: "Supreme Empire Server",
      version: "1.0.0",
      banks: banks.banks
    }));
  }

  if (url.pathname === "/api/banks") {
    return res.end(JSON.stringify({
      ok: true,
      banks: banks.banks
    }));
  }

  res.writeHead(404);
  res.end(JSON.stringify({
    ok: false,
    error: "Not found"
  }));
});

server.listen(PORT, HOST, () => {
  console.log(`Supreme Empire server listening on ${HOST}:${PORT}`);
  console.log(`Loaded ${banks.banks.length} banks successfully.`);
});
