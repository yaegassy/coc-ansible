import { commands, ExtensionContext, LanguageClient, NotificationType, workspace } from 'coc.nvim';

export async function activate(context: ExtensionContext, client: LanguageClient) {
  await client.onReady();

  client.onNotification(new NotificationType(`update/ansible-metadata`), async (ansibleMetaDataList: any) => {
    const outputText = JSON.stringify(ansibleMetaDataList, null, 2);

    await workspace.nvim
      .command(
        'belowright vnew ansible-server-metadata | setlocal buftype=nofile bufhidden=hide noswapfile filetype=json'
      )
      .then(async () => {
        const buf = await workspace.nvim.buffer;
        buf.setLines(outputText.split('\n'), { start: 0, end: -1 });
      });
  });

  context.subscriptions.push(
    commands.registerCommand('ansible.server.showMetaData', async () => {
      const { document } = await workspace.getCurrentState();
      if (document.languageId !== 'ansible') return;

      client.sendNotification(new NotificationType(`update/ansible-metadata`), [document.uri.toString()]);
    })
  );
}
