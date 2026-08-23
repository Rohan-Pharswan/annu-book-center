try {
  const res = await fetch("https://ipapi.co/159.41.183.28/json/");
  const data = await res.json();
  console.log("Atlas IP Geolocation:", {
    ip: data.ip,
    city: data.city,
    region: data.region,
    country_name: data.country_name,
    org: data.org
  });
} catch (err) {
  console.error("Geo error:", err.message);
}
