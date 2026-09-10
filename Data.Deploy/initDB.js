import { Tables } from "../Constants/Tables";

const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const settings = require("../settings.json").settings;

export class DBInitializer {
	static #db = null;

	static async init() {
		if (!fs.existsSync(settings.dbPath)) {
			this.#db = new sqlite3.Database(settings.dbPath);

			await this.#runQuery("PRAGMA foreign_keys = ON");

			// Create table ContractVersion
			await this.#runQuery(`CREATE TABLE IF NOT EXISTS ${Tables.CONTRACTVERSION} (
				Id INTEGER,
				Version FLOAT NOT NULL,
				Description TEXT,
				CreatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
				LastUpdatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY("Id" AUTOINCREMENT)
			)`);

			// Create table Candidate
			await this.#runQuery(`CREATE TABLE IF NOT EXISTS ${Tables.CANDIDATE} (
				Id INTEGER,
				Name TEXT NOT NULL,
				Description TEXT,
				VoteCount INTEGER DEFAULT 0,
				CreatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
				LastUpdatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
				ConcurrencyKey TEXT
					CHECK (ConcurrencyKey LIKE '0x%' AND length(ConcurrencyKey) = 18),
				PRIMARY KEY("Id" AUTOINCREMENT)
			)`);

			// Create table Vote
			await this.#runQuery(`CREATE TABLE IF NOT EXISTS ${Tables.VOTE} (
				Id INTEGER,
				CandidateId INTEGER NOT NULL,
				VoterPublicKey TEXT NOT NULL UNIQUE,
				CreatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY(CandidateId) REFERENCES ${Tables.CANDIDATE}(Id),
				PRIMARY KEY("Id" AUTOINCREMENT)
			)`);

			// Seed initial contract version
			await this.#runQuery(
				`INSERT INTO ${Tables.CONTRACTVERSION}(Version, Description) VALUES (1.0, 'Initial Contract')`,
			);

			this.#db.close();
		}
	}

	static #runQuery(query, params = null) {
		return new Promise((resolve, reject) => {
			this.#db.run(query, params ? params : [], function (err) {
				if (err) {
					reject(err);
					return;
				}
				resolve({ lastId: this.lastID, changes: this.changes });
			});
		});
	}
}
