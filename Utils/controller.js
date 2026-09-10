import { ServiceTypes } from "../Constants/ServiceTypes";
import { VotingController } from "../Controllers/Voting.Controller";

export class Controller {
	#votingController = null;

	async handleRequest(user, message, isReadOnly) {
		this.#votingController = new VotingController(message);

		let result = {};
		if (message.Service === ServiceTypes.VOTING) {
			result = await this.#votingController.handleRequest();
		} else {
			result = { error: "Invalid service." };
		}

		if (isReadOnly) {
			await this.sendOutput(user, result);
		} else {
			await this.sendOutput(
				user,
				message.promiseId ? { promiseId: message.promiseId, ...result } : result,
			);
		}
	}

	sendOutput = async (user, response) => {
		await user.send(response);
	};
}

// automation-test-1789017975932

// automation-test-1789018252744

// automation-test-1789018661227

// automation-test-1789025474171

// automation-test-1789026555122
