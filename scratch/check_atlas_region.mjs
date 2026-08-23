import dns from "dns/promises";

console.log("Resolving MongoDB Atlas SRV records...");
try {
  const srvRecords = await dns.resolveSrv("_mongodb._tcp.clusterannubook.5bagx49.mongodb.net");
  console.log("SRV Records:", srvRecords);

  for (const record of srvRecords) {
    const addresses = await dns.resolve4(record.name);
    console.log(`Node: ${record.name} -> IP: ${addresses}`);
    // Reverse DNS or IP lookup
  }
} catch (err) {
  console.error("DNS Error:", err.message);
}
