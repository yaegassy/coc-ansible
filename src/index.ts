import {
  CancellationToken,
  commands,
  ConfigurationParams,
  ExtensionContext,
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  Thenable,
  TransportKind,
  window,
  workspace,
  WorkspaceConfiguration,
} from 'coc.nvim';

import fs from 'fs';
import path from 'path';
import util from 'util';
import which from 'which';
import child_process from 'child_process';

import { AnsiblePlaybookRunProvider } from './features/runner';
import { installLsRequirementsTools } from './installer';

const exec = util.promisify(child_process.exec);

let client: LanguageClient;
let extensionStoragePath: string;
let pythonInterpreterPath: string;
let existsAnsibleCmd: boolean;
let existsAnsibleLintCmd: boolean;
let ansibleLintModule: boolean;

export async function activate(context: ExtensionContext): Promise<void> {
  const extensionConfig = workspace.getConfiguration('ansible');
  const isEnable = extensionConfig.enable;
  if (!isEnable) return;

  extensionStoragePath = context.storagePath;
  if (!fs.existsSync(extensionStoragePath)) {
    fs.mkdirSync(extensionStoragePath, { recursive: true });
  }

  new AnsiblePlaybookRunProvider(context);

  const isRealpath = true;
  const pythonCommand = getPythonPath(extensionConfig, isRealpath);

  const ansiblePath = extensionConfig.get('ansible.path', 'ansible');
  const ansibleLintPath = extensionConfig.get('ansibleLint.path', 'ansible-lint');

  pythonInterpreterPath = extensionConfig.get('python.interpreterPath', '');
  existsAnsibleCmd = await whichWrapper(ansiblePath);
  existsAnsibleLintCmd = await whichWrapper(ansibleLintPath);

  let existsExtAnsibleCmd = false;

  if (!pythonInterpreterPath) {
    if (!existsAnsibleCmd || !existsAnsibleLintCmd) {
      if (process.platform === 'win32') {
        if (fs.existsSync(path.join(context.storagePath, 'ansible', 'venv', 'Scripts', 'ansible.exe'))) {
          existsExtAnsibleCmd = true;
        }
      } else {
        if (fs.existsSync(path.join(context.storagePath, 'ansible', 'venv', 'bin', 'ansible'))) {
          existsExtAnsibleCmd = true;
        }
      }
    }

    if (!existsAnsibleCmd && !existsExtAnsibleCmd) {
      if (pythonCommand) {
        // Install...
        await installWrapper(pythonCommand, context);

        // Exists check
        if (process.platform === 'win32') {
          if (fs.existsSync(path.join(context.storagePath, 'ansible', 'venv', 'Scripts', 'ansible.exe'))) {
            existsExtAnsibleCmd = true;
          }
        } else {
          if (fs.existsSync(path.join(context.storagePath, 'ansible', 'venv', 'bin', 'ansible'))) {
            existsExtAnsibleCmd = true;
          }
        }
      } else {
        window.showErrorMessage('python3/python command not found');
        return;
      }
    }

    if (!existsAnsibleCmd && !existsExtAnsibleCmd) {
      window.showErrorMessage('"ansible" is not found. Please install "ansible".');
      return;
    }
  }

  // If "pythonInterpreterPath" is set, check the exists of the module
  if (pythonInterpreterPath) {
    const ansibleModule = await existsPythonImportModule(pythonInterpreterPath, 'ansible');
    ansibleLintModule = await existsPythonImportModule(pythonInterpreterPath, 'ansiblelint');

    if (!ansibleModule) {
      window.showErrorMessage('Exit because "ansible" does not exist.');
      return;
    }
  }

  context.subscriptions.push(
    commands.registerCommand('ansible.builtin.installRequirementsTools', async () => {
      if (client.serviceState !== 5) {
        await client.stop();
      }
      await installWrapper(pythonCommand, context);
      client.start();
    })
  );

  const serverModule = context.asAbsolutePath(
    path.join('node_modules', 'ansible-language-server', 'out', 'server', 'src', 'server.js')
  );

  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'ansible' },
      { scheme: 'file', language: 'yaml.ansible' },
    ],
    middleware: {
      workspace: {
        configuration,
      },
    },
  };

  client = new LanguageClient('ansibleServer', 'Ansible Server', serverOptions, clientOptions);

  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

function toJSONObject(obj: any): any {
  if (obj) {
    if (Array.isArray(obj)) {
      return obj.map(toJSONObject);
    } else if (typeof obj === 'object') {
      const res = Object.create(null);
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          res[key] = toJSONObject(obj[key]);
        }
      }
      return res;
    }
  }
  return obj;
}

// MEMO: "coc-pyright" implementation as a reference. Thanks, fannheyward
function configuration(params: ConfigurationParams, token: CancellationToken, next: any) {
  const ansibleItem = params.items.find((x) => x.section === 'ansible');

  if (ansibleItem) {
    const custom = () => {
      const extensionConfig = toJSONObject(workspace.getConfiguration(ansibleItem.section, ansibleItem.scopeUri));

      // [patch] In coc-ansible, this setting is a fixed value.
      extensionConfig['ansible']['path'] = 'ansible';
      extensionConfig['ansibleLint']['path'] = 'ansible-lint';

      if (!pythonInterpreterPath && !existsAnsibleCmd) {
        // [patch] Use extension venv
        if (process.platform === 'win32') {
          extensionConfig['python']['interpreterPath'] = path.join(
            extensionStoragePath,
            'ansible',
            'venv',
            'Scripts',
            'python.exe'
          );
        } else {
          extensionConfig['python']['interpreterPath'] = path.join(
            extensionStoragePath,
            'ansible',
            'venv',
            'bin',
            'python'
          );
        }
      } else if (pythonInterpreterPath) {
        // [patch] If "ansible-lint" is not found, this feature will be set to false.
        if (!ansibleLintModule) {
          extensionConfig['ansibleLint']['enabled'] = false;
        }
      } else {
        // [patch] If "ansible-lint" is not found, this feature will be set to false.
        if (!existsAnsibleLintCmd) {
          extensionConfig['ansibleLint']['enabled'] = false;
        }
      }

      return [extensionConfig];
    };
    return custom();
  }

  return next(params, token);
}

function getPythonPath(config: WorkspaceConfiguration, isRealpath?: boolean): string {
  let pythonPath = config.get<string>('python.interpreterPath', '');
  if (pythonPath) {
    return pythonPath;
  }

  try {
    pythonPath = which.sync('python3');
    if (isRealpath) {
      pythonPath = fs.realpathSync(pythonPath);
    }
    return pythonPath;
  } catch (e) {
    // noop
  }

  try {
    pythonPath = which.sync('python');
    if (isRealpath) {
      pythonPath = fs.realpathSync(pythonPath);
    }
    return pythonPath;
  } catch (e) {
    // noop
  }

  return pythonPath;
}

async function existsPythonImportModule(pythonPath: string, moduleName: string): Promise<boolean> {
  const checkCmd = `${pythonPath} -c "import ${moduleName}"`;
  try {
    await exec(checkCmd);
    return true;
  } catch (error) {
    return false;
  }
}

async function whichWrapper(command: string): Promise<boolean> {
  const checkCmd = `${command} -h`;
  try {
    await exec(checkCmd);
    return true;
  } catch (error) {
    return false;
  }
}

async function installWrapper(pythonCommand: string, context: ExtensionContext) {
  const msg = 'Install Ansible Server requirements tools?';
  context.workspaceState;

  let ret = 0;
  ret = await window.showQuickpick(['Yes', 'Cancel'], msg);
  if (ret === 0) {
    let isFinished = false;

    try {
      // Timer
      const start = new Date();
      let lap: Date;

      const timerId = setInterval(() => {
        lap = new Date();
        window.showWarningMessage(
          `ansible | Install requirements tools... (${Math.floor((lap.getTime() - start.getTime()) / 1000)} sec)`
        );

        if (isFinished) {
          const stop = new Date();
          // Complete message
          window.showWarningMessage(
            `ansible | Installation is complete! (${Math.floor((stop.getTime() - start.getTime()) / 1000)} sec)`
          );
          clearInterval(timerId);
        }
      }, 2000);

      await installLsRequirementsTools(pythonCommand, context);
      isFinished = true;
    } catch (e) {
      return;
    }
  } else {
    return;
  }
}
