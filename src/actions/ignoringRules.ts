import {
  CodeAction,
  CodeActionContext,
  CodeActionProvider,
  DocumentSelector,
  ExtensionContext,
  languages,
  OutputChannel,
  Range,
  TextDocument,
  TextEdit,
  workspace,
} from 'coc.nvim';

export function activate(context: ExtensionContext, outputChannel: OutputChannel) {
  const documentSelector: DocumentSelector = [
    { scheme: 'file', language: 'ansible' },
    { scheme: 'file', language: 'yaml.ansible' },
  ];

  context.subscriptions.push(
    languages.registerCodeActionProvider(
      documentSelector,
      new IgnoringRulesCodeActionProvider(outputChannel),
      'ansible'
    )
  );
}

class IgnoringRulesCodeActionProvider implements CodeActionProvider {
  private readonly source = 'ansible';
  private diagnosticCollection = languages.createDiagnosticCollection(this.source);
  private outputChannel: OutputChannel;

  constructor(outputChannel: OutputChannel) {
    this.outputChannel = outputChannel;
  }

  public async provideCodeActions(document: TextDocument, range: Range, context: CodeActionContext) {
    const doc = workspace.getDocument(document.uri);
    const wholeRange = Range.create(0, 0, doc.lineCount, 0);
    let whole = false;
    if (
      range.start.line === wholeRange.start.line &&
      range.start.character === wholeRange.start.character &&
      range.end.line === wholeRange.end.line &&
      range.end.character === wholeRange.end.character
    ) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      whole = true;
    }
    const codeActions: CodeAction[] = [];

    /** Ignoring rules for current line (# noqa [ruleId] */
    if (this.lineRange(range) && context.diagnostics.length > 0) {
      const line = doc.getline(range.start.line);
      if (line && line.length) {
        let existsAnsibleDiagnostics = false;
        const ruleIds: (string | number)[] = [];
        context.diagnostics.forEach((d) => {
          if (d.source === 'ansible-lint') {
            existsAnsibleDiagnostics = true;
            if (d.code) {
              const ruleId = d.code;
              if (ruleId) ruleIds.push(ruleId);
            }
          }
        });

        if (existsAnsibleDiagnostics) {
          ruleIds.forEach((id) => {
            let newText = '';
            if (line.match(/# noqa/)) {
              newText = `${line} ${id}${range.start.line + 1 === range.end.line ? '\n' : ''}`;
            } else {
              newText = `${line} # noqa ${id}${range.start.line + 1 === range.end.line ? '\n' : ''}`;
            }

            const edit = TextEdit.replace(range, newText);

            codeActions.push({
              title: `Ignoring rules for current line (# noqa ${id})`,
              edit: {
                changes: {
                  [doc.uri]: [edit],
                },
              },
            });
          });
        }
      }
    }

    return codeActions;
  }

  private lineRange(r: Range): boolean {
    return (
      (r.start.line + 1 === r.end.line && r.start.character === 0 && r.end.character === 0) ||
      (r.start.line === r.end.line && r.start.character === 0)
    );
  }
}
