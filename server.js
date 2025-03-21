const express = require("express");
const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const cors = require("cors");

const app = express();
app.use(cors());

const analyticsDataClient = new BetaAnalyticsDataClient({
  keyFilename: "versatile-nomad-454418-b4-1486c2185a8f.json", 
});

const propertyId = "465746471";

app.get("/visitas", async (req, res) => {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: "2024-01-01", endDate: "today" }],
      metrics: [{ name: "screenPageViews" }],
    });

    const visitas = response.rows ? response.rows[0].metricValues[0].value : "0";
    res.json({ visitas });
  } catch (error) {
    console.error("Erro ao buscar visitas:", error);
    res.status(500).json({ error: "Erro ao buscar visitas" });
  }
});

app.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});
