import {
  BasicList,
  commands,
  ExtensionContext,
  ListAction,
  ListContext,
  ListItem,
  listManager,
  Neovim,
  Terminal,
  window,
  workspace,
} from 'coc.nvim';

import cp from 'child_process';

let terminal: Terminal | undefined;

type FeatureListItemType = {
  name: string;
  description: string;
};

export function activate(context: ExtensionContext, ansibleDocPath: string) {
  const ansibleDocList = new AnsibleDocShowSnippetsList(workspace.nvim, ansibleDocPath);
  listManager.registerList(ansibleDocList);

  context.subscriptions.push(
    commands.registerCommand('ansible.ansbileDoc.showSnippets', async () => {
      // Only snippets is module, inventory and lookup are supported.
      // See: https://docs.ansible.com/ansible/latest/cli/ansible-doc.html
      const pluginType = ['module', 'inventory', 'lookup'];

      const picked = await window.showMenuPicker(pluginType, `Choose Plugin Type`);

      if (picked !== -1) {
        ansibleDocList.choosedPluginType = pluginType[picked];
        await workspace.nvim.command(`CocList ansibleDocShowSnippets`);
      }
    })
  );
}

class AnsibleDocShowSnippetsList extends BasicList {
  public readonly name = 'ansibleDocShowSnippets';
  public readonly description = 'snippets for ansible-doc';
  public readonly defaultAction = 'execute';
  public actions: ListAction[] = [];

  public ansibleDocPath: string;
  public choosedPluginType = 'module';

  constructor(nvim: Neovim, ansibleDocPath: string) {
    super(nvim);

    this.ansibleDocPath = ansibleDocPath;

    this.addAction('execute', (item: ListItem) => {
      const pluginName = item.label.split(':')[0];
      runAnsibleDocShowSnippetsInTerminal(pluginName, this.ansibleDocPath, this.choosedPluginType);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async loadItems(context: ListContext): Promise<ListItem[]> {
    const listItems: ListItem[] = [];
    const plugins = await getAnsibleDocListItems(this.ansibleDocPath, this.choosedPluginType);
    plugins.forEach((p) => listItems.push({ label: `${p.name}: [${p.description}]`, filterText: p.name }));
    return listItems;
  }
}

async function getAnsibleDocListItems(ansibleDocPath: string, pluginType: string) {
  return new Promise<FeatureListItemType[]>((resolve) => {
    cp.exec(`${ansibleDocPath} -l -j -t ${pluginType}`, (err, stdout) => {
      if (err) resolve([]);

      if (stdout.length > 0) {
        try {
          const ansibleDocListJSONData = JSON.parse(stdout);
          const featureResults: FeatureListItemType[] = [];
          Object.keys(ansibleDocListJSONData).forEach((key) => {
            featureResults.push({
              name: key,
              description: ansibleDocListJSONData[key],
            });
          });
          resolve(featureResults);
        } catch (e) {
          resolve([]);
        }
      } else {
        resolve([]);
      }
    });
  });
}

async function runAnsibleDocShowSnippetsInTerminal(
  pluginName: string,
  ansibleDocPath: string,
  choosedPluginType: string
) {
  const args: string[] = [];
  args.push('-t', choosedPluginType);
  args.push('-s');
  args.push(pluginName);

  if (terminal) {
    if (terminal.bufnr) {
      await workspace.nvim.command(`bd! ${terminal.bufnr}`);
    }
    terminal.dispose();
    terminal = undefined;
  }
  terminal = await window.createTerminal({ name: 'ansibleDocShowSnippets', cwd: workspace.root });
  terminal.sendText(`${ansibleDocPath} ${args.join(' ')}`);
  const enableSplitRight = workspace.getConfiguration('ansible').get('ansibleDoc.enableSplitRight', true);
  if (enableSplitRight) terminal.hide();
  await workspace.nvim.command('stopinsert');
  if (enableSplitRight) {
    await workspace.nvim.command(`vert bel sb ${terminal.bufnr}`);
    await workspace.nvim.command(`wincmd p`);
  }
}
