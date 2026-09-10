import { Tables } from "../../Constants/Tables";
import { SharedService } from "../Common.Services/SharedService";

const settings = require("../../settings.json").settings;
const { SqliteDatabase } = require("../Common.Services/dbHandler").default;

export class VotingService {
	#dbPath = settings.dbPath;
	#message = null;
	#dbContext = null;

	constructor(message) {
		this.#message = message;
		this.#dbContext = new SqliteDatabase(this.#dbPath);
	}

	async addCandidate() {
		let resObj = {};
		try {
			this.#dbContext.open();
			const data = this.#message.data;

			const candidate = {
				Name: data.name,
				Description: data.description || "",
				VoteCount: 0,
				ConcurrencyKey: SharedService.generateConcurrencyKey(),
			};

			const result = await this.#dbContext.insertValue(Tables.CANDIDATE, candidate);
			resObj.success = { rowId: result.lastId };
			return resObj;
		} catch (error) {
			throw error;
		} finally {
			this.#dbContext.close();
		}
	}

	async getAllCandidates() {
		let resObj = {};
		try {
			this.#dbContext.open();
			const candidates = await this.#dbContext.getValues(Tables.CANDIDATE, {});

			resObj.success = candidates.map(c => ({
				id: c.Id,
				name: c.Name,
				description: c.Description,
				voteCount: c.VoteCount,
				createdOn: c.CreatedOn,
				lastUpdatedOn: c.LastUpdatedOn,
			}));
			return resObj;
		} catch (error) {
			throw error;
		} finally {
			this.#dbContext.close();
		}
	}

	async castVote() {
		let resObj = {};
		try {
			this.#dbContext.open();
			const data = this.#message.data;

			if (!data.candidateId || !data.voterPublicKey) {
				throw new Error("candidateId and voterPublicKey are required.");
			}

			// Check candidate exists.
			const candidate = await this.#dbContext.findById(Tables.CANDIDATE, data.candidateId);
			if (!candidate) {
				throw new Error("Candidate not found.");
			}

			// Check for existing vote from this voter.
			const existingVotes = await this.#dbContext.getValues(Tables.VOTE, {
				VoterPublicKey: data.voterPublicKey,
			});
			if (existingVotes.length > 0) {
				throw new Error("This voter has already cast a vote.");
			}

			const vote = {
				CandidateId: data.candidateId,
				VoterPublicKey: data.voterPublicKey,
			};

			const result = await this.#dbContext.insertValue(Tables.VOTE, vote);

			// Update vote count.
			const newVoteCount = (candidate.VoteCount || 0) + 1;
			await this.#dbContext.updateValue(
				Tables.CANDIDATE,
				{ VoteCount: newVoteCount },
				{ Id: data.candidateId },
			);

			resObj.success = { rowId: result.lastId, voteCount: newVoteCount };
			return resObj;
		} catch (error) {
			throw error;
		} finally {
			this.#dbContext.close();
		}
	}

	async getResults() {
		let resObj = {};
		try {
			this.#dbContext.open();
			const candidates = await this.#dbContext.getValues(Tables.CANDIDATE, {});

			const sorted = candidates
				.map(c => ({
					id: c.Id,
					name: c.Name,
					voteCount: c.VoteCount,
				}))
				.sort((a, b) => b.voteCount - a.voteCount);

			resObj.success = sorted;
			return resObj;
		} catch (error) {
			throw error;
		} finally {
			this.#dbContext.close();
		}
	}
}
