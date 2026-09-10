import { VotingService } from "../Services/Domain.Services/Voting.service.js";

export class VotingController {
	#message = null;
	#service = null;

	constructor(message) {
		this.#message = message;
		this.#service = new VotingService(message);
	}

	async handleRequest() {
		const action = this.#message.Action;
		try {
			let result;
			switch (action) {
				case "AddCandidate":
					result = await this.#service.addCandidate();
					break;
				case "GetAllCandidates":
					result = await this.#service.getAllCandidates();
					break;
				case "CastVote":
					result = await this.#service.castVote();
					break;
				case "GetResults":
					result = await this.#service.getResults();
					break;
				default:
					throw new Error(`Invalid action: ${action}`);
			}
			return result;
		} catch (error) {
			return { error: error.message || String(error) };
		}
	}
}
