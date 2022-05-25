import { commands, ExtensionContext, Terminal, window } from 'coc.nvim';

export class AnsiblePlaybookRunProvider {
  private disposableTerminal: Terminal | undefined | Promise<Terminal>;

  constructor(private context: ExtensionContext) {
    this.configureCommands();
  }

  private configureCommands() {
    this.context.subscriptions.push(
      commands.registerCommand('ansible.ansible-playbook.run', () => {
        window.showInformationMessage('Not implemented in coc-ansible');
      })
    );
    this.context.subscriptions.push(
      commands.registerCommand('ansible.ansible-navigator.run', () => {
        window.showInformationMessage('Not implemented in coc-ansible');
      })
    );
  }
}
