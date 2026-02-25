const express = require("express");
const driver = require("./neo4j");

const router = express.Router();

/**
 * 1️⃣ Infrastructure Network
 */
router.get("/infrastructure", async (req, res) => {
  const session = driver.session({ database: "cityinfrastructure" });

  try {
    const result = await session.run(`
      MATCH (n:InfrastructureUnit)-[r:DEPENDS_ON]->(m:InfrastructureUnit)
      RETURN n, r, m
    `);

    const data = result.records.map(record => ({
      from: record.get("n").properties,
      to: record.get("m").properties,
      relationship: record.get("r").type
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
 * 2️⃣ Fetch Regions (Dynamic - No Hardcoding)
 */
router.get("/regions", async (req, res) => {
  const session = driver.session({ database: "cityinfrastructure" });

  try {
    const result = await session.run(`
      MATCH (r:Region)-[:PART_OF]->(:City {name:"Chennai"})
      RETURN r.name AS region
      ORDER BY r.name
    `);

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
 * 3️⃣ Critical Infrastructure
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
 * 4️⃣ Root Cause Analysis (UPDATED - Uses Region Node)
 */
router.get("/root-cause", async (req, res) => {
  const { type, region } = req.query;
  const session = driver.session({ database: "cityinfrastructure" });

  try {
    if (!type || !region) {
      return res.status(400).json({ error: "Missing type or region parameter" });
    }

    // Step 1: Find most critical root node in selected region
    const rootResult = await session.run(
      `
      MATCH (root:InfrastructureUnit)-[:LOCATED_IN]->(:Region {name:$region})
      WHERE root.type = $type

      OPTIONAL MATCH (dependent)-[:DEPENDS_ON*]->(root)

      WITH root, COUNT(DISTINCT dependent) as dependentCount
      RETURN root, dependentCount
      ORDER BY dependentCount DESC
      LIMIT 1
      `,
      { type, region }
    );

    if (rootResult.records.length === 0) {
      return res.status(404).json({
        error: "No infrastructure found",
        details: `No ${type} infrastructure found in ${region}`
      });
    }

    const rootNode = rootResult.records[0].get("root").properties;
    const affectedCount = rootResult.records[0]
      .get("dependentCount")
      .toNumber();

    // Step 2: Find cascading impact chain
    const impactResult = await session.run(
      `
      MATCH (root:InfrastructureUnit {id:$rootId})
      MATCH path = (dependent)-[:DEPENDS_ON*]->(root)

      WITH dependent, LENGTH(path) as depth
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