const {
	commands,
	Disposable,
	languages,
	Uri,
	window,
	workspace
} = require('vscode')
const SublSearchProvider = require('./provider')
const SublSearchCommands = require('./commands')

function activate(context) {
	let provider = new SublSearchProvider()

	const providerRegistrations = Disposable.from(
		workspace.registerTextDocumentContentProvider(SublSearchProvider.scheme, provider),
		languages.registerDocumentLinkProvider({
			scheme: SublSearchProvider.scheme
		}, provider)
	)


	function showSublSearchPopup(options) {
		options = options || {};
		var value = options.path ? `${options.path}: ` : '';
		var folders = workspace.workspaceFolders;
		var foldersStr = [];
		if (folders && folders.length) {
			folders.forEach(function (el, index) {
				foldersStr.push(el.uri.fsPath);
			});
		}

		window.showInputBox({
			value: value,
			prompt: null,
			placeHolder: "Search term...",
			password: false,
			valueSelection: [value.length, value.length]
		}).then((cmd) => {
			if (cmd && cmd.length) {
				var q = parseSearchQuery(cmd);
				q.extPlus = q.extPlus.join(";");
				q.extMinus = q.extMinus.join(";");

				function send(folders) {
					if (q.multi) {
						folders = folders.join(";");
					}

					var uri = Uri.parse(SublSearchProvider.scheme + `:${fileName(q.query)}.sublsearch?cmd=${q.query}&folders=${folders}&multi=${q.multi}&case=${q.caseSensitive}&extPlus=${q.extPlus}&extMinus=${q.extMinus}`);
					return workspace.openTextDocument(uri).then(doc =>
						window.showTextDocument(doc, {
							preview: false,
							viewColumn: 1
						})
					)
				}

				if (foldersStr.length === 1) {
					if (q.multi)
						send(foldersStr);
					else
						send(foldersStr[0]);
				} else if (foldersStr.length > 1) {
					window.showQuickPick(foldersStr, {
						canPickMany: q.multi,
						placeHolder: "Select search folders:"
					}).then(send);
				}
			}
		});

	}

	const disposable = commands.registerCommand('sublsearch.search', function () {
		showSublSearchPopup();
	});

	context.subscriptions.push(
		disposable,
		providerRegistrations,
		commands.registerCommand('sublsearch.openFile', SublSearchCommands.openFile)
	)

	context.subscriptions.push(
		commands.registerCommand('sublsearch.searchInPath', (f) => {
			showSublSearchPopup({
				path: workspace.asRelativePath(f.fsPath)
			});
		}));


}
exports.activate = activate

function deactivate() {}
exports.deactivate = deactivate

function fileName(cmd) {
	return cmd.replace(/[^a-z0-9]/gi, '_').substring(0, 10)
}

function parseSearchQuery(query) {
	let ret = {
		query: "",
		caseSensitive: false,
		multi: false,
		extPlus: [],
		extMinus: [],
	};

	let inExtPlus = false;
	let inExtMinus = false;
	while (true) {
		if (query && query.length) {
			if (query[0] == '|') {
				query = query.substr(1);
				break
			} else if (query[0] == '^' || query[0] == '*' || query[0] == '+' || query[0] == '-') {
				inExtPlus = false;
				inExtMinus = false;
			}

			if (query[0] == '^') {
				ret.caseSensitive = true;
			} else if (query[0] == '*') {
				ret.multi = true;
			} else if (query[0] == '+') {
				inExtPlus = true;
				ret.extPlus.push("");
			} else if (query[0] == '-') {
				inExtMinus = true;
				ret.extMinus.push("");
			} else if (inExtPlus) {
				ret.extPlus[ret.extPlus.length - 1] += query[0];
			} else if (inExtMinus) {
				ret.extMinus[ret.extMinus.length - 1] += query[0];
			} else if (query.indexOf("|") === -1) {
				break
			}

			query = query.substr(1);
		} else {
			break
		}
	}

	ret.query = query;
	return ret;
}