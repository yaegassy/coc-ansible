import { commands, ExtensionContext, LanguageClient, ServiceStat } from 'coc.nvim';
import { installWrapper } from '../installer';
import type { PythonPaths } from '../types';

export function activate(context: ExtensionContext, pythonCommandPaths: PythonPaths, client: LanguageClient) {
  context.subscriptions.push(
    commands.registerCommand('ansible.builtin.installRequirementsTools', async () => {
      if (client.serviceState !== ServiceStat.Stopped) {
        await client.stop();
      }

      if (pythonCommandPaths) {
        await installWrapper(pythonCommandPaths.real, context);
      }
      client.start();
    })
  );
}
