const HotPocket = require("hotpocket-nodejs-contract");
const { Controller } = require("./Utils/controller");
const { DBInitializer } = require("./Data.Deploy/initDB");
const bson = require("bson");
const { SharedService } = require("./Services/Common.Services/SharedService");
const { Tables } = require("./Constants/Tables");

const settings = require("./settings.json").settings;
const { SqliteDatabase } = require("./Services/Common.Services/dbHandler").default;

const votingContract = async ctx => {
	console.log("Voting contract is running.");

	SharedService.context = ctx;
	const isReadOnly = ctx.readonly;

	if (!isReadOnly) {
		ctx.unl.onMessage((node, msg) => {
			try {
				const obj = JSON.parse(msg.toString());
				if (obj.type) {
					SharedService.nplEventEmitter.emit(obj.type, node, msg);
				}
			} catch (e) {
				console.error("Error parsing NPL message", e);
			}
		});
	}

	try {
		await DBInitializer.init();
	} catch (e) {
		console.error(e);
	}

	const dbPath = settings.dbPath;
	const dbContext = new SqliteDatabase(dbPath);

	try {
		dbContext.open();
		let row = await dbContext.getLastRecord(Tables.CONTRACTVERSION);
		row ??= { Version: 1.0 };
		console.log("Current contract version:", row.Version);
	} catch (e) {
		console.log("Error while getting contract version", e);
	} finally {
		dbContext.close();
	}

	const controller = new Controller();

	for (const user of ctx.users.list()) {
		for (const input of user.inputs) {
			const buf = await ctx.users.read(input);

			let message = null;
			try {
				message = JSON.parse(buf);
			} catch (e) {
				message = bson.deserialize(buf);
			}
			if (message.Data) message.data = message.Data;

			console.log(
				`[Contract] Incoming ${isReadOnly ? "READ" : "WRITE"} request — Service: ${message.Service}, Action: ${message.Action}`,
			);

			await controller.handleRequest(user, message, isReadOnly);

			console.log(
				`[Contract] Finished handling — Service: ${message.Service}, Action: ${message.Action}`,
			);
		}
	}
};

const hpc = new HotPocket.Contract();
hpc.init(votingContract, HotPocket.clientProtocols.JSON, true);
