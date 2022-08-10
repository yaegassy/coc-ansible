import { commands, ExtensionContext, LanguageClient, NotificationType, workspace } from 'coc.nvim';

export async function activate(context: ExtensionContext, client: LanguageClient) {
  await client.onReady();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  client.onNotification(new NotificationType(`resync/ansible-inventory`), (event) => {});

  context.subscriptions.push(
    commands.registerCommand('ansible.server.resyncAnsibleInventory', async () => {
      const { document } = await workspace.getCurrentState();
      if (document.languageId !== 'ansible') return;

      client.sendNotification(new NotificationType(`resync/ansible-inventory`));
    })
  );
}
