const vscode = require('vscode')
const querystring = require('querystring')
const rgPath = require('vscode-ripgrep').rgPath
const path = require('path')
const {
	execSync
} = require('child_process')

const rootPath = vscode.workspace.rootPath

const execOpts = {
	cwd: rootPath,
	maxBuffer: 1024 * 1000
}

class SublSearchProvider {
	constructor() {
		this.links = []
		this._subscriptions = vscode.workspace.onDidCloseTextDocument(doc => {
			this.links[doc.uri.toString()] = []
		})
	}

	dispose() {
		this._subscriptions.dispose()
	}

	static get scheme() {
		return 'sublsearch'
	}

	onDidChange() { }

	provideTextDocumentContent(uri) {
		let self = this;
		let uriString = uri.toString();
		this.links[uriString] = [];
		const params = querystring.parse(uri.query);
		const query = params.cmd;
		const folders = params.folders;
		const extPlus = params.extPlus ? params.extPlus.split(";") : "";
		const extMinus = params.extMinus ? params.extMinus.split(";") : "";
		const caseSensitive = params.case == "true";
		const word = params.word == "true";

		let searchResults = "";

		folders.split(";").forEach(function (path) {
			let sr = null;
			try {
				sr = runCommandSync(query, path, caseSensitive, word);
			} catch (err) { }
			if (sr != null && sr.length) {
				searchResults += sr.toString() + "\n";
			}
		});

		if (searchResults == "") {
			return 'No results for your search!'
		}

		let resultsArray = searchResults.split('\n')
		resultsArray = resultsArray.filter((item) => {
			return item != null && item.length > 0
		})
		let resultsByFile = {}
		let lastFormattedLine;


		var addFormattedLine = function (formattedLine) {
			if (!resultsByFile.hasOwnProperty(formattedLine.file)) {
				resultsByFile[formattedLine.file] = [];
			}

			resultsByFile[formattedLine.file].push(formattedLine);
		}

		resultsArray.forEach(function (searchResult) {
			let splitLine = searchResult.match(/(.*?):(\d+):(\d+):(.*)/);
			let formattedLine;
			if (splitLine) {
				formattedLine = formatLine(splitLine)
			} else if (searchResult == '--') {
				if (lastFormattedLine) {
					addFormattedLine({
						file: lastFormattedLine.file,
						seperator: true
					});
				}
			} else {
				let contextLine = searchResult.match(/(.*?)-(\d+)-(.*)/);

				if (contextLine) {
					formattedLine = formatContextLine(contextLine)
				}
			}


			if (formattedLine === undefined) {
				return;
			}

			addFormattedLine(formattedLine);

			lastFormattedLine = formattedLine;

		});


		var removeTrailingSeperators = function () {
			for (var file in resultsByFile) {
				let lines = resultsByFile[file];
				if (lines[lines.length - 1].seperator) {
					lines.splice(lines.length - 1, 1);
					resultsByFile[file] = lines;
				}
			}
		};

		removeTrailingSeperators();

		let sortedFiles = Object.keys(resultsByFile).sort()
		let lineNumber = 1
		let count = 0;
		let exts = []

		try {
			let lines = sortedFiles.map(function (fileName) {
				var ext = fileName.split('.').pop();
				exts.push(ext);
				if ((extMinus.length == 0 || extMinus.indexOf(ext) === -1) && (extPlus.length == 0 || ~extPlus.indexOf(ext))) {
					lineNumber += 1
					let resultsForFile = resultsByFile[fileName].map(function (searchResult, index) {
						lineNumber += 1
						if (searchResult.seperator) {
							return '  ..';
						} else {
							if (self.createDocumentLink(searchResult, lineNumber, query, uriString, caseSensitive)) {
								count++;
							}
							return `  ${searchResult.line}: ${searchResult.result}`
						}
					}).join('\n')
					lineNumber += 1
					return `${fileName}:\n${resultsForFile}\n`
				}
			}).filter(function (el) {
				if (el) return true;
			});
			let header = [`${count} search results found for "${query}"\n `]
			let content = header.concat(lines)

			return content.join('\n')
		} catch (err) {
			return `${err}`
		}
	}

	provideDocumentLinks(document) {
		return this.links[document.uri.toString()]
	}

	createDocumentLink(formattedLine, lineNumber, query, docURI, caseSensitive) {
		const {
			file,
			line,
			column
		} = formattedLine
		const col = parseInt(column, 10)
		const preamble = `  ${line}:`.length
		const match = formattedLine.result.match(new RegExp(query, caseSensitive ? "" : "i"))
		if (match == null) {
			return false
		}
		const searchTerm = match[0].length
		const linkRange = new vscode.Range(
			lineNumber,
			preamble + col,
			lineNumber,
			preamble + col + searchTerm
		)

		const uri = vscode.Uri.parse(`file://${file}#${line}`)
		this.links[docURI].push(new vscode.DocumentLink(linkRange, uri))
		return true
	}
}

module.exports = SublSearchProvider

function formatLine(splitLine) {
	return {
		file: splitLine[1],
		line: splitLine[2],
		column: splitLine[3],
		result: splitLine[4]
	}
}

function formatContextLine(splitLine) {
	return {
		file: splitLine[1],
		line: splitLine[2],
		column: undefined,
		result: splitLine[3]
	}
}

function openLink(fileName, line) {
	var params = {
		fileName: fileName,
		line: line
	}
	return encodeURI('command:sublsearch.openFile?' + JSON.stringify(params))
}

function runCommandSync(query, path, caseSensitive, word) {
	return execSync(`${rgPath}` + (caseSensitive ? ` --case-sensitive` : ` --ignore-case`) + (word ? ` -w` : ``) + ` --glob="!.git" --line-number --column --hidden --context=2 -F "${query}" ${path}`, execOpts)
}