const express = require("express");
const driver = require("./neo4j");

const router = express.Router();

/**
 * 1️⃣ Infrastructure Network
 */
router.get("/infrastructure", async (req, res) => {
  const { city } = req.query;
  const session = driver.session({ database: "cityinfrastructure" });

  try {
    if (!city) {
      return res.status(400).json({ error: "City parameter required" });
    }

    const result = await session.run(
      `
      MATCH (c:City {name:$city})
      MATCH (i:InfrastructureUnit)-[:LOCATED_IN]->(:Region)-[:PART_OF]->(c)

      OPTIONAL MATCH (i)-[r:DEPENDS_ON]->(m:InfrastructureUnit)
      WHERE (m)-[:LOCATED_IN]->(:Region)-[:PART_OF]->(c)

      RETURN i, r, m
      `,
      { city }
    );

    const data = result.records.map(record => ({
      from: record.get("i")?.properties,
      to: record.get("m")?.properties || null,
      relationship: record.get("r")?.type || null
    }));

    res.json(data);

  } catch (error) {
    console.error("Infrastructure fetch error:", error);
    res.status(500).json({ error: "Failed to fetch infrastructure" });
  } finally {
    await session.close();
  }
});
/**
 * 2️⃣ Fetch Cities
 */
router.get("/cities", async (req, res) => {
  const session = driver.session({ database: "cityinfrastructure" });

  try {
    const result = await session.run(`
      MATCH (c:City)
      RETURN c.name AS city
      ORDER BY city
    `);

    const cities = result.records.map(r => r.get("city"));
    res.json(cities);

  } catch (error) {
    console.error("Cities fetch error:", error);
    res.status(500).json({ error: "Failed to fetch cities" });
  } finally {
    await session.close();
  }
});

/**
 * 3️⃣ Fetch Regions by City
 */
router.get("/regions", async (req, res) => {
  const { city } = req.query;
  const session = driver.session({ database: "cityinfrastructure" });

  try {
    if (!city) {
      return res.status(400).json({ error: "City parameter required" });
    }

    const result = await session.run(`
      MATCH (r:Region)-[:PART_OF]->(c:City {name:$city})
      RETURN r.name AS region
      ORDER BY region
    `, { city });

    const regions = result.records.map(r => r.get("region"));
    res.json(regions);

  } catch (error) {
    console.error("Regions fetch error:", error);
    res.status(500).json({ error: "Failed to fetch regions" });
  } finally {
    await session.close();
  }
});

/**
 * 4️⃣ Critical Infrastructure (Global)
 */
router.get("/critical", async (req, res) => {
  const session = driver.session({ database: "cityinfrastructure" });

  try {
    const result = await session.run(`
      MATCH (n:InfrastructureUnit)<-[:DEPENDS_ON]-(x)
      RETURN n.name AS name, COUNT(x) AS dependencyCount
      ORDER BY dependencyCount DESC
    `);

    const data = result.records.map(r => ({
      name: r.get("name"),
      dependencyCount: r.get("dependencyCount").toNumber()
    }));

    res.json(data);

  } catch (error) {
    console.error("Critical fetch error:", error);
    res.status(500).json({ error: "Failed to fetch critical infrastructure" });
  } finally {
    await session.close();
  }
});

/**
 * 5️⃣ Root Cause Analysis (City + Region Scoped)
 */
router.get("/root-cause", async (req, res) => {
  const { type, city, region } = req.query;
  const session = driver.session({ database: "cityinfrastructure" });

  try {
    if (!type || !city || !region) {
      return res.status(400).json({
        error: "Missing parameters",
        details: "type, city and region are required"
      });
    }

    // Step 1 — Find most critical infra in selected city + region
    const rootResult = await session.run(
      `
      MATCH (root:InfrastructureUnit)
            -[:LOCATED_IN]->(r:Region {name:$region})
            -[:PART_OF]->(c:City {name:$city})

      WHERE root.type = $type

      OPTIONAL MATCH (dependent)-[:DEPENDS_ON*]->(root)

      WITH root, COUNT(DISTINCT dependent) AS dependentCount
      RETURN root, dependentCount
      ORDER BY dependentCount DESC
      LIMIT 1
      `,
      { type, city, region }
    );

    if (rootResult.records.length === 0) {
      return res.status(404).json({
        error: "No infrastructure found",
        details: `No ${type} infrastructure found in ${region}, ${city}`
      });
    }

    const rootNode = rootResult.records[0].get("root").properties;
    const affectedCount = rootResult.records[0]
      .get("dependentCount")
      .toNumber();

    // Step 2 — Cascading Impact
    const impactResult = await session.run(
      `
      MATCH (root:InfrastructureUnit {id:$rootId})
      MATCH path = (dependent)-[:DEPENDS_ON*]->(root)

      WITH dependent, LENGTH(path) AS depth
      ORDER BY depth ASC
      RETURN DISTINCT dependent
      LIMIT 15
      `,
      { rootId: rootNode.id }
    );

    const impactChain = impactResult.records.map(r =>
      r.get("dependent").properties
    );

    res.json({
      city,
      region,
      rootCause: rootNode,
      impactChain,
      affectedServices: affectedCount,
      criticalPath: impactChain.map(u => u.name)
    });

  } catch (error) {
    console.error("Root cause analysis error:", error);
    res.status(500).json({
      error: "Analysis failed",
      details: error.message
    });
  } finally {
    await session.close();
  }
});

module.exports = router;