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
      MATCH (n)-[r:DEPENDS_ON]->(m)
      RETURN n, r, m
    `);

    const data = result.records.map(record => ({
      from: record.get("n").properties,
      to: record.get("m").properties,
      relationship: record.get("r").type
    }));

    res.json(data);
  } finally {
    await session.close();
  }
});

/**
 * 2️⃣ Region Analysis
 */
router.get("/analyze-region", async (req, res) => {
  const { region, locations } = req.query;
  const session = driver.session({ database: "cityinfrastructure" });

  try {
    const locationArray = locations.split(',');

    // Find all critical units in this region (high dependency count)
    const criticalResult = await session.run(
      `
      MATCH (n:InfrastructureUnit)
      WHERE n.location IN $locations
      OPTIONAL MATCH (dependent)-[:DEPENDS_ON*]->(n)
      WITH n, COUNT(DISTINCT dependent) as dependentCount
      WHERE dependentCount > 0
      RETURN n, dependentCount
      ORDER BY dependentCount DESC
      LIMIT 5
      `,
      { locations: locationArray }
    );

    const criticalUnits = criticalResult.records.map(r => ({
      ...r.get('n').properties,
      dependentCount: r.get('dependentCount').toNumber()
    }));

    // Count total units
    const totalResult = await session.run(
      `
      MATCH (n:InfrastructureUnit)
      WHERE n.location IN $locations
      RETURN COUNT(n) as total
      `,
      { locations: locationArray }
    );

    const totalUnits = totalResult.records[0].get('total').toNumber();

    // Generate vulnerabilities
    const vulnerabilities = [];
    if (criticalUnits.length > 0) {
      vulnerabilities.push(`${criticalUnits.length} critical infrastructure units identified`);
      vulnerabilities.push(`Single point of failure risk in ${criticalUnits[0].name}`);
    }

    await session.close();

    res.json({
      region,
      criticalUnits,
      vulnerabilities,
      totalUnits
    });

  } catch (error) {
    await session.close();
    console.error('Region analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', details: error.message });
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
  } finally {
    await session.close();
  }
});

/**
 * 4️⃣ Root Cause Analysis
 */
router.get("/root-cause", async (req, res) => {
  const { type, locations } = req.query;
  const session = driver.session({ database: "cityinfrastructure" });

  try {
    if (!type || !locations) {
      return res.status(400).json({ error: 'Missing type or locations parameter' });
    }

    const locationArray = locations.split(',');
    console.log('Analyzing root cause for:', { type, locationArray });

    // Find the root cause - infrastructure unit of this type in these locations
    // that has the MOST dependencies (most critical)
    const rootResult = await session.run(
      `
      MATCH (root:InfrastructureUnit)
      WHERE root.type = $type AND root.location IN $locations
      OPTIONAL MATCH (dependent)-[:DEPENDS_ON*]->(root)
      WITH root, COUNT(DISTINCT dependent) as dependentCount
      RETURN root, dependentCount
      ORDER BY dependentCount DESC
      LIMIT 1
      `,
      { type, locations: locationArray }
    );

    console.log('Root result records:', rootResult.records.length);

    if (rootResult.records.length === 0) {
      await session.close();
      return res.status(404).json({ 
        error: 'No infrastructure found',
        details: `No ${type} infrastructure found in the selected region. Available locations: ${locationArray.join(', ')}`
      });
    }

    const rootNode = rootResult.records[0].get('root').properties;
    const affectedCount = rootResult.records[0].get('dependentCount').toNumber();

    console.log('Root node found:', rootNode);
    console.log('Affected count:', affectedCount);

    // Find the cascading impact chain
    const impactResult = await session.run(
      `
      MATCH (root:InfrastructureUnit {id: $rootId})
      MATCH path = (dependent)-[:DEPENDS_ON*]->(root)
      WITH dependent, LENGTH(path) as depth
      ORDER BY depth ASC
      RETURN DISTINCT dependent
      LIMIT 10
      `,
      { rootId: rootNode.id }
    );

    const impactChain = impactResult.records.map(r => r.get('dependent').properties);
    console.log('Impact chain length:', impactChain.length);

    await session.close();

    res.json({
      rootCause: rootNode,
      impactChain,
      affectedServices: affectedCount,
      criticalPath: impactChain.map(u => u.name)
    });

  } catch (error) {
    await session.close();
    console.error('Root cause analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
});

module.exports = router;