import {
  CodeAction,
  CodeActionContext,
  CodeActionProvider,
  Diagnostic,
  DocumentSelector,
  ExtensionContext,
  languages,
  OutputChannel,
  Range,
  TextDocument,
  workspace,
} from 'coc.nvim';

type AdditionalDiagnostic = {
  codeDescription?: {
    href?: string;
  };
};

type ALSDiagnostic = Diagnostic & AdditionalDiagnostic;

type AnsibleLintRules = {
  id: string | number;
  href: string;
};

export function activate(context: ExtensionContext, outputChannel: OutputChannel) {
  const documentSelector: DocumentSelector = [
    { scheme: 'file', language: 'ansible' },
    { scheme: 'file', language: 'yaml.ansible' },
  ];

  context.subscriptions.push(
    languages.registerCodeActionProvider(
      documentSelector,
      new ShowWebDocumentationCodeActionProvider(outputChannel),
      'ansible'
    )
  );
}

class ShowWebDocumentationCodeActionProvider implements CodeActionProvider {
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

    /** Show web documentation for [ruleId] */
    if (this.lineRange(range) && context.diagnostics.length > 0) {
      const line = doc.getline(range.start.line);
      if (line && line.length) {
        let existsAnsibleDiagnostics = false;

        const ansibleLintRules: AnsibleLintRules[] = [];
        context.diagnostics.forEach((d) => {
          if (d.source === 'ansible-lint') {
            existsAnsibleDiagnostics = true;

            if ('codeDescription' in d) {
              const alsDiagnostic = d as ALSDiagnostic;
              if (alsDiagnostic.codeDescription?.href) {
                if (alsDiagnostic.code) {
                  ansibleLintRules.push({
                    id: alsDiagnostic.code,
                    href: alsDiagnostic.codeDescription.href,
                  });
                }
              }
            }
          }
        });

        if (existsAnsibleDiagnostics) {
          ansibleLintRules.forEach((r) => {
            const title = `Show web documentation for ${r.id}`;

            const command = {
              title: '',
              command: 'vscode.open',
              arguments: [r.href],
            };

            const action: CodeAction = {
              title,
              command,
            };

            codeActions.push(action);
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
