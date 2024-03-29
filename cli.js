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

if (args.length > 2) {
	if (args[2] == "--help" || args[2] == "-h") {
		return console.log(
			`You must supply a source and destination\nnode-lode <src> <dst>\n\nTo load saves don't supply any parameters\nnode-lode\n\nOptions:\n\t-e\tEdit the ignore list\n\t-s\tList the available saves\n\t-v\tView the current version`,
		);
	} else if (args[2] == "-e" || args[2] == "--edit") {
		if (process.platform === "linux") {
			return open(getIgnorePath(), { app: "vim" });
		}
		return open(getIgnorePath());
	} else if (args[2] == "-s" || args[2] == "--save") {
		return getLoader();
	} else if (args[2] == "-v" || args[2] == "--version") {
		return console.log(`node-lode v${require("./package.json").version}`);
	}
}

let ignoreList = loadIgnore();

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
	fs.readdir(directory, function(err, files) {
		for (let i = 0; i < files.length; i++) {
			let file = files[i];
			fs.stat(directory + "/" + file, function(err, stats) {
				if (stats.isFile()) {
					callback(directory + "/" + file);
				}
				if (stats.isDirectory()) {
					getDirFiles(directory + "/" + file, callback);
				}
			});
		}
	});
}

getDirFiles(`${args[2]}`, file_with_path => {
	// console.log(`file_with_path: ${file_with_path}`);
	const sourcePath = path.resolve(args[2], file_with_path);
	const destPath = path.resolve(args[3], file_with_path);
	// console.log(`Copying over ${sourcePath}`);
	// console.log(`Copying over ${destPath}`);
	handleCopy(ignoreList, sourcePath, destPath);
});

console.log(`node-lode is watching for changes...`);

fs.watch(args[2], { recursive: true }, (type, file) => {
	const sourcePath = path.resolve(args[2], file);
	const destPath = path.resolve(args[3], file);
	if (type !== "rename") {
		handleCopy(ignoreList, sourcePath, destPath, true);
	} else if (fs.existsSync(sourcePath)) {
		// File has been changed to this
		handleCopy(ignoreList, sourcePath, destPath, true);
	} else if (fs.existsSync(destPath)) {
		// File has been deleted
		console.log(`Deleting file: ${destPath}\n`);
		fs.removeSync(destPath);
	}
});

function handleCopy(ignoreList, sourcePath, destPath, debug = false) {
	try {
		for (let i = 0; i < ignoreList.length; i++) {
			if (sourcePath.includes(ignoreList[i])) {
				console.log(`Not copying ${sourcePath}`);
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
		const result = prompt(
			"Your save file is corrupt or missing, do you wish to create a new one? ",
		);
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
			createNewIgnore();
		}
		const contents = fs
			.readFileSync(getIgnorePath())
			.toString("utf8")
			.split("\n")
			.filter(val => val !== "");
		return contents;
	} catch (err) {
		const result = prompt(
			"Your ignore file is corrupt or missing, do you wish to create a new one? ",
		);
		if (resultIsYes(result)) {
			createNewIgnore();
		}
		return [];
	}
}

function createNewIgnore() {
	const ignoreList = [
		".idea",
		"tmp",
		"jb_",
		"_old_",
		"node_modules",
		"build",
		"generated",
	];
	let str = "";
	for (let i = 0; i < ignoreList.length; i++) {
		if (ignoreList[i] !== "") {
			str += ignoreList[i] + "\n";
		}
	}
	fs.outputFile(getIgnorePath(), str);
}
