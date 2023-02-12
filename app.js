const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19India.db");

let db = null;
const initializeDBandServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBandServer();

const convertDbObjectToResponseObject = (eachState) => {
  return {
    stateId: eachState.state_id,
    stateName: eachState.state_name,
    population: eachState.population,
  };
};

//GET states
app.get("/states/", async (request, response) => {
  const getStates = `SELECT * FROM state`;
  const statesArr = await db.all(getStates);
  response.send(
    statesArr.map((eachState) => convertDbObjectToResponseObject(eachState))
  );
});

//GET state
app.get("/states/:stateId", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `SELECT * FROM state WHERE state_id=${stateId};`;
  const stateDetails = await db.get(getStateQuery);
  response.send(convertDbObjectToResponseObject(stateDetails));
});

const convertDistrictObjectToResponseObject = (eachDistrict) => {
  return {
    districtId: eachDistrict.district_id,
    districtName: eachDistrict.district_name,
    stateId: eachDistrict.state_id,
    cases: eachDistrict.cases,
    cured: eachDistrict.cured,
    active: eachDistrict.active,
    deaths: eachDistrict.deaths,
  };
};

//POST district

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const addDistrict = `INSERT INTO 
  district(district_name,state_id,cases,cured,active,deaths)
  VALUES
  ('${districtName}',${stateId},${cases},${cured},${active},${deaths}); `;
  const dbResponse = await db.run(addDistrict);
  const districtId = dbResponse.lastID;
  response.send("District Successfully Added");
});

//GET district by ID
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrict = `SELECT * FROM district WHERE district_id=${districtId}`;
  const district = await db.get(getDistrict);
  response.send(convertDistrictObjectToResponseObject(district));
});

// DELETE district

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrict = `DELETE FROM district WHERE district_id=${districtId}`;
  await db.run(deleteDistrict);
  response.send("District Removed");
});

//UPDATE district
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateDistrict = `UPDATE district
   SET
   district_name='${districtName}',
   state_id=${stateId},
   cases=${cases},
   cured=${cured},
   active=${active},
   deaths=${deaths}
   WHERE district_id=${districtId}
  `;
  await db.run(updateDistrict);
  response.send("District Details Updated");
});

const convertStatsToResponse = (statsDetails) => {
  return {
    totalCases: statsDetails.cases,
    totalCured: statsDetails.cured,
    totalActive: statsDetails.active,
    totalDeaths: statsDetails.deaths,
  };
};

//GET state Stats
app.get("/states/:stateId/stats", async (request, response) => {
  const { stateId } = request.params;
  const getStats = `SELECT cases,cured,active,deaths
     FROM district WHERE state_id=${stateId};`;
  const statsDetails = await db.get(getStats);
  response.send(convertStatsToResponse(statsDetails));
});

const convertStateToResponseObj = (state) => {
  return {
    stateName: state.state_name,
  };
};

//GET state from districtId
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getState = `SELECT state_name 
    FROM state INNER JOIN district ON state.state_id=district.state_id`;
  const state = await db.get(getState);
  response.send(convertStateToResponseObj(state));
});

module.exports = app;
