#!/usr/bin/env node

const path = require("path");
const fs = require("fs-extra");
const prompt = require("prompt-sync")();
const open = require("open");

const args = process.argv;

const SAVE_FILE = "node-lode.sav";
const IGNORE_FILE = "node-lode-ignore.txt";

process.stdout.write("\033c");
console.log(`\n----- node-lode -----\n`);

let ignoreList = loadIgnore();

if (args.length > 2) {
	if (args[2] == "--help" || args[2] == "-h") {
		return console.log(
			`You must supply a source and destination\nnode-lode <src> <dst>\n\nOptions:\n\t-e\tEdit the ignore list`,
		);
	} else if (args[2] == "-e" || args[2] == "--edit") {
		return open(getIgnorePath());
	}
}

function init() {
	const result = prompt("Do you wish to load a previous node-lode? ");
	if (result.toLowerCase() === "y" || result.toLowerCase() === "yes") {
		const loader = getLoader();
		const result = prompt("Type of the number of the save you wish to load: ");
		if (loader[result]) {
			args.push(loader[result].source);
			args.push(loader[result].destination);
		} else {
			console.error(`ERROR: Not a valid save`);
			process.exit();
		}
	} else {
		const result = prompt("Do you wish to remove a previous node-lode? ");
		if (resultIsYes(result)) {
			const removeAllItems = prompt(
				"Do you wish to remove ALL previous node-lode? ",
			);
			if (resultIsYes(removeAllItems)) {
				removeAll();
				return init();
			}
			const loader = getLoader();
			const result = prompt(
				"Type of the number of the save you wish to delete: ",
			);
			if (loader[result]) {
				remove(loader[result].source, loader[result].destination);
				return init();
			}
		} else {
			process.exit();
		}
	}
}

function resultIsYes(result) {
	return result.toLowerCase() === "y" || result.toLowerCase() === "yes";
}

if (args.length < 4) {
	if (Object.keys(load()).length !== 0) {
		init();
	} else {
		return console.error(
			`ERROR: You must supply a source and destination\nnode-lode <src> <dst>`,
		);
	}
} else {
	const sourceDir = path.resolve(args[2]);
	const destDir = path.resolve(args[3]);

	console.log(sourceDir);
	console.log(destDir);

	const loaded = load();
	if (!loaded[sourceDir] || loaded[sourceDir].indexOf(destDir) === -1) {
		const result = prompt("Do you wish to save this for later use? ");
		if (resultIsYes(result)) {
			save(createSaveObject(sourceDir, destDir));
		}
	}
}

function getLoader() {
	const loaded = load();
	const keys = Object.keys(loaded);
	console.log("");
	const loader = {};
	for (let i = 0; i < keys.length; i++) {
		for (let j = 0; j < loaded[keys[i]].length; j++) {
			console.log(`--- Save #${i + j} ---`);
			console.log(`Source: ${keys[i]}`);
			console.log(`Destination: ${loaded[keys[i]][j]}\n`);
			loader[i + j] = {
				source: keys[i],
				destination: loaded[keys[i]][j],
			};
		}
	}
	return loader;
}

process.stdout.write("\033c");

function getDirFiles(directory, callback) {
	fs.readdirSync(directory, function(err, files) {
		files.forEach(function(file) {
			fs.statSync(directory + "/" + file, function(err, stats) {
				if (stats.isFile()) {
					callback(directory + "/" + file);
				}
				if (stats.isDirectory()) {
					getDirFiles(directory + "/" + file, callback);
				}
			});
		});
	});
}

getDirFiles(".", function(file_with_path) {
	const sourcePath = path.resolve(args[2], file_with_path);
	const destPath = path.resolve(args[3], file_with_path);
	handleCopy(ignoreList, sourcePath, destPath, false);
});

console.log(`node-lode is watching for changes...`);

fs.watch(args[2], { recursive: true }, (type, file) => {
	const sourcePath = path.resolve(args[2], file);
	const destPath = path.resolve(args[3], file);
	if (type !== "rename") {
		handleCopy(ignoreList, sourcePath, destPath);
	} else if (fs.existsSync(sourcePath)) {
		// File has been changed to this
		handleCopy(ignoreList, sourcePath, destPath);
	} else if (fs.existsSync(destPath)) {
		// File has been deleted
		console.log(`Deleting file: ${destPath}\n`);
		fs.removeSync(destPath);
	}
});

function handleCopy(ignoreList, sourcePath, destPath, debug = true) {
	try {
		for (let i = 0; i < ignoreList.length; i++) {
			if (sourcePath.includes(ignoreList[i])) {
				return;
			}
		}
		if (fs.existsSync(sourcePath)) {
			const fileContents = fs.readFileSync(sourcePath);
			if (debug) {
				console.log(`Copied file: ${sourcePath}`);
				console.log(`To: ${destPath}\n`);
			}
			fs.outputFile(destPath, fileContents);
		}
	} catch (err) {
		throw err;
	}
}

function getSavePath() {
	return path.resolve(__dirname, SAVE_FILE);
}

function getIgnorePath() {
	return path.resolve(__dirname, IGNORE_FILE);
}

function createSaveObject(sourcePath, destPath) {
	const obj = load();
	if (!obj[sourcePath]) {
		obj[sourcePath] = [];
	}
	if (obj[sourcePath].indexOf(destPath) === -1) {
		obj[sourcePath].push(destPath);
	}
	return obj;
}

function load() {
	try {
		if (!fs.existsSync(getSavePath())) {
			fs.outputFile(getSavePath(), JSON.stringify({}));
		}
		const contents = JSON.parse(
			fs.readFileSync(getSavePath()).toString("utf8"),
		);
		return contents;
	} catch (err) {
		const result = prompt("Your save file is corrupt, do you wish to wipe it?");
		if (resultIsYes(result)) {
			removeAll();
		}
		return {};
	}
}

function save(saveObject) {
	fs.writeFileSync(getSavePath(), JSON.stringify(saveObject));
}

function remove(sourcePath, destination) {
	const obj = load();
	if (obj[sourcePath]) {
		const index = obj[sourcePath].indexOf(destination);
		if (index !== -1) {
			obj[sourcePath].splice(index, 1);
		}
		if (obj[sourcePath].length === 0) {
			delete obj[sourcePath];
		}
	}
	save(obj);
}

function removeAll() {
	fs.writeFileSync(getSavePath(), JSON.stringify({}));
}

function loadIgnore() {
	try {
		if (!fs.existsSync(getIgnorePath())) {
			const ignoreList = [".idea", "tmp", "jb_", "_old_", "node_modules"];
			let str = "";
			for (let i = 0; i < ignoreList.length; i++) {
				if (ignoreList[i] !== "") {
					str += ignoreList[i] + "\n";
				}
			}
			fs.outputFile(getIgnorePath(), str);
		}
		const contents = fs
			.readFileSync(getIgnorePath())
			.toString("utf8")
			.split("\n")
			.filter(val => val !== "");
		return contents;
	} catch (err) {
		const result = prompt("Your save file is corrupt, do you wish to wipe it?");
		if (resultIsYes(result)) {
			remove();
		}
		return {};
	}
}
