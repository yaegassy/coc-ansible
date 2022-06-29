import {
  CodeAction,
  CodeActionContext,
  CodeActionProvider,
  languages,
  OutputChannel,
  Range,
  TextDocument,
  TextEdit,
  workspace,
} from 'coc.nvim';

export class AnsibleCodeActionProvider implements CodeActionProvider {
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
        const ruleIds: string[] = [];
        context.diagnostics.forEach((d) => {
          if (d.source === 'Ansible') {
            existsAnsibleDiagnostics = true;
            const ruleId = d.message.split('\n')[0];
            if (ruleId) ruleIds.push(ruleId);
          }
        });

        if (existsAnsibleDiagnostics) {
          ruleIds.forEach((r) => {
            let newText = '';
            if (line.match(/# noqa/)) {
              newText = `${line} ${r}${range.start.line + 1 === range.end.line ? '\n' : ''}`;
            } else {
              newText = `${line} # noqa ${r}${range.start.line + 1 === range.end.line ? '\n' : ''}`;
            }

            const edit = TextEdit.replace(range, newText);

            codeActions.push({
              title: `Ignoring rules for current line (# noqa ${r})`,
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
