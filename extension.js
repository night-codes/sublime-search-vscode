const {
	commands,
	Disposable,
	Range,
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
		const editor = window.activeTextEditor;
		if (!editor) {
			return
		}

		var path = editor.document.uri.fsPath || '';
		const range = new Range(editor.selection.start, editor.selection.end);
		var text = editor.document.getText(range) || '';
		var selectionStart = 0;
		if (parseSearchQuery(text).query.length < text.length) {
			text = "|" + text
			selectionStart = 1;
		}
		var folders = workspace.workspaceFolders;
		var foldersSel = [];
		var foldersUnsel = [];
		if (folders && folders.length) {
			folders.forEach(function (el) {
				var picked = el.uri.fsPath.length < path.length && path.substr(0, el.uri.fsPath.length) == el.uri.fsPath;
				var data = {
					"description": el.uri.fsPath,
					"label": el.uri.fsPath.split('/').pop().split('\\').pop(),
					"picked": picked,
				};
				if (picked) {
					foldersSel.push(data);
				} else {
					foldersUnsel.push(data);
				}
			});
			foldersUnsel.forEach(function (el) {
				foldersSel.push(el);
			});
		}

		window.showInputBox({
			value: text,
			prompt: "Search in workspace folders",
			placeHolder: "Search term...",
			password: false,
			valueSelection: [selectionStart, text.length]
		}).then((cmd) => {
			if (cmd && cmd.length) {
				var q = parseSearchQuery(cmd);
				q.extPlus = q.extPlus.join(";");
				q.extMinus = q.extMinus.join(";");

				function send(folders) {
					if (!folders || (Array.isArray(folders) && !folders.length)) {
						return;
					}
					if (!Array.isArray(folders)) {
						folders = [folders];
					}
					var str = [];
					folders.forEach(function (el) {
						if (typeof el === "string") {
							str.push(el);
						} else if (typeof el === "object" && el.description) {
							str.push(el.description);
						}
					})
					folders = str.join(";");

					var uri = Uri.parse(SublSearchProvider.scheme + `:${fileName(q.query)}.sublsearch?cmd=${q.query}&folders=${folders}&word=${q.word}&multi=${q.multi}&case=${q.caseSensitive}&extPlus=${q.extPlus}&extMinus=${q.extMinus}`);
					return workspace.openTextDocument(uri).then(doc =>
						window.showTextDocument(doc, {
							preview: false,
							viewColumn: 1
						})
					)
				}

				if (foldersSel.length === 1) {
					send(foldersSel);
				} else if (foldersSel.length > 1) {
					window.showQuickPick(foldersSel, {
						canPickMany: q.multi,
						matchOnDescription: true,
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

function deactivate() { }
exports.deactivate = deactivate

function fileName(cmd) {
	return cmd.replace(/[^a-z0-9]/gi, '_').substring(0, 10)
}

function parseSearchQuery(query) {
	let ret = {
		query: "",
		caseSensitive: false,
		multi: true,
		word: false,
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
			} else if (query[0] == '^' || query[0] == '+' || query[0] == '-' || query[0] == '=') {
				inExtPlus = false;
				inExtMinus = false;
			}

			if (query[0] == '^') {
				ret.caseSensitive = true;
			} else if (query[0] == '=') {
				ret.word = true;
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