const {
  commands,
  Disposable,
  languages,
  Uri,
  window,
  workspace
} = require('vscode')
const SearchyProvider = require('./provider')
const searchyCommands = require('./commands')

function activate(context) {
  let provider = new SearchyProvider()

  const providerRegistrations = Disposable.from(
    workspace.registerTextDocumentContentProvider(SearchyProvider.scheme, provider),
    languages.registerDocumentLinkProvider({
      scheme: SearchyProvider.scheme
    }, provider)
  )

  function showSearchyPopup(options)
  {
    options = options || {};
    var value = options.path ? `${options.path}: ` : '';
    window.showInputBox({
      value: value,
      prompt: null,
      placeHolder: "Search term...",
      password: false,
      valueSelection: [value.length, value.length]
    }).then((cmd) => {
      if (cmd && cmd.length) {
        var uri = Uri.parse(SearchyProvider.scheme +
          `:${fileName(cmd)}.searchy?cmd=${cmd}`)
        return workspace.openTextDocument(uri).then(doc =>
          window.showTextDocument(doc, {
            preview: false,
            viewColumn: 1
          })
        )
      }
    })
  }

  const disposable = commands.registerCommand('searchy.search', function () {
    showSearchyPopup();
  });

  context.subscriptions.push(
    disposable,
    providerRegistrations,
    commands.registerCommand('searchy.openFile', searchyCommands.openFile)
  )

  context.subscriptions.push(
    commands.registerCommand('searchy.searchInPath', (f) => {
      showSearchyPopup({
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
