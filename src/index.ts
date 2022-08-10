import {
  CancellationToken,
  ConfigurationParams,
  ExtensionContext,
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  Thenable,
  TransportKind,
  window,
  workspace,
} from 'coc.nvim';
import fs from 'fs';
import path from 'path';
import { installWrapper } from './installer';
import {
  existsCmdWithHelpOpt,
  existsPythonImportModule,
  getBuiltinPythonPath,
  getBuiltinToolPath,
  getCurrentPythonPath,
} from './tool';

import * as ignoringRulesCodeActionFeature from './actions/ignoringRules';
import * as showWebDocumentationCodeActionFeature from './actions/showWebDocumentation';
import * as ansibleDocShowInfoCommandFeature from './commands/ansibleDocShowInfo';
import * as ansibleDocShowSnippetsCommandFeature from './commands/ansibleDocShowSnippets';
import * as builtinInstallRequirementsToolsCommandFeature from './commands/builtinInstallRequirementsTools';
import * as serverRestartCommandFeature from './commands/serverRestart';
import * as serverResyncAnsibleInventoryCommandFeature from './commands/serverResyncAnsibleInventory';
import * as serverShowMetaDataCommandFeature from './commands/serverShowMetaData';

let client: LanguageClient;
let extensionStoragePath: string;
let pythonInterpreterPath: string;
let existsAnsibleCmd: boolean;
let existsAnsibleLintCmd: boolean;
let existsAnsibleDocCmd: boolean;
let existsAnsibleLintModule: boolean;

// MEMO: client logging
const outputChannel = window.createOutputChannel('ansible-client');

export async function activate(context: ExtensionContext): Promise<void> {
  const extensionConfig = workspace.getConfiguration('ansible');
  const isEnable = extensionConfig.enable;
  if (!isEnable) return;

  extensionStoragePath = context.storagePath;
  if (!fs.existsSync(extensionStoragePath)) {
    fs.mkdirSync(extensionStoragePath, { recursive: true });
  }

  outputChannel.appendLine(`${'#'.repeat(10)} ansible-client\n`);

  const pythonCommandPaths = getCurrentPythonPath(extensionConfig);

  const ansiblePath = extensionConfig.get('ansible.path', 'ansible');
  const ansibleLintPath = extensionConfig.get('ansibleLint.path', 'ansible-lint');
  const ansibleDocPath = extensionConfig.get('ansibleDoc.path', 'ansible-doc');
  const forceBuiltinTools = extensionConfig.get('builtin.force', false);

  pythonInterpreterPath = extensionConfig.get('python.interpreterPath', '');

  existsAnsibleCmd = await existsCmdWithHelpOpt(ansiblePath);
  existsAnsibleLintCmd = await existsCmdWithHelpOpt(ansibleLintPath);
  existsAnsibleDocCmd = await existsCmdWithHelpOpt(ansibleDocPath);

  outputChannel.appendLine(`==== environment ====\n`);
  outputChannel.appendLine(`pythonCommandPaths(env): ${pythonCommandPaths ? pythonCommandPaths.env : 'None'}`);
  outputChannel.appendLine(`pythonCommandPaths(real): ${pythonCommandPaths ? pythonCommandPaths.real : 'None'}`);
  outputChannel.appendLine(`pythonInterpreterPath(custom): ${pythonInterpreterPath ? pythonInterpreterPath : 'None'}`);
  outputChannel.appendLine(`existsAnsibleCmd: ${existsAnsibleCmd}`);
  outputChannel.appendLine(`existsAnsibleLintCmd: ${existsAnsibleLintCmd}`);
  outputChannel.appendLine(`existsAnsibleDocCmd: ${existsAnsibleDocCmd}`);
  outputChannel.appendLine(`forceBuiltinTools: ${forceBuiltinTools}`);

  let existsExtAnsibleCmd = false;
  let ansibleBuiltinPath = '';
  let ansibleLintBuiltinPath = '';
  let ansibleDocBuiltinPath = '';

  if (!pythonInterpreterPath) {
    if (!existsAnsibleCmd || !existsAnsibleLintCmd || forceBuiltinTools) {
      ansibleBuiltinPath = getBuiltinToolPath(extensionStoragePath, 'ansible');
      ansibleLintBuiltinPath = getBuiltinToolPath(extensionStoragePath, 'ansible-lint');
      ansibleDocBuiltinPath = getBuiltinToolPath(extensionStoragePath, 'ansible-doc');
      if (ansibleBuiltinPath) {
        existsExtAnsibleCmd = true;

        outputChannel.appendLine(`\n==== use builtin tool ====\n`);
        outputChannel.appendLine(`ansibleBuiltinPath: ${ansibleBuiltinPath}`);
        outputChannel.appendLine(`ansibleLintBuiltinPath: ${ansibleLintBuiltinPath ? ansibleLintBuiltinPath : 'None'}`);
        outputChannel.appendLine(`ansibleDocBuiltinPath: ${ansibleDocBuiltinPath ? ansibleDocBuiltinPath : 'None'}`);
      }
    }

    if (!existsAnsibleCmd && !existsExtAnsibleCmd) {
      if (pythonCommandPaths) {
        // Install...
        await installWrapper(pythonCommandPaths.real, context);

        // Exists check
        ansibleBuiltinPath = getBuiltinToolPath(extensionStoragePath, 'ansible');
        ansibleLintBuiltinPath = getBuiltinToolPath(extensionStoragePath, 'ansible-lint');
        ansibleDocBuiltinPath = getBuiltinToolPath(extensionStoragePath, 'ansible-doc');
        if (ansibleBuiltinPath) {
          existsExtAnsibleCmd = true;

          outputChannel.appendLine(`\n==== use builtin tool ====\n`);
          outputChannel.appendLine(`ansibleBuiltinPath: ${ansibleBuiltinPath}`);
          outputChannel.appendLine(
            `ansibleLintBuiltinPath: ${ansibleLintBuiltinPath ? ansibleLintBuiltinPath : 'None'}`
          );
          outputChannel.appendLine(`ansibleDocBuiltinPath: ${ansibleDocBuiltinPath ? ansibleDocBuiltinPath : 'None'}`);
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
    existsAnsibleLintModule = await existsPythonImportModule(pythonInterpreterPath, 'ansiblelint');

    outputChannel.appendLine(`\n==== use pythonInterpreterPath module ====\n`);
    outputChannel.appendLine(`ansibleModule: ${ansibleModule ? ansibleModule : 'None'}`);
    outputChannel.appendLine(`ansibleLintModule: ${existsAnsibleLintModule ? existsAnsibleLintModule : 'None'}`);

    if (!ansibleModule) {
      window.showErrorMessage('Exit because "ansible" does not exist.');
      return;
    }
  }

  let serverModule: string;
  const devServerPath = extensionConfig.get<string>('dev.serverPath', '');
  if (devServerPath && devServerPath !== '' && fs.existsSync(devServerPath)) {
    serverModule = devServerPath;
  } else {
    serverModule = context.asAbsolutePath(
      path.join('node_modules', '@ansible', 'ansible-language-server', 'out', 'server', 'src', 'server.js')
    );
  }

  const debugOptions = { execArgv: ['--nolazy', '--inspect=6010'] };

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  const documentSelector = [
    { scheme: 'file', language: 'ansible' },
    { scheme: 'file', language: 'yaml.ansible' },
  ];

  const clientOptions: LanguageClientOptions = {
    documentSelector,
    disabledFeatures: getLanguageClientDisabledFeatures(),
    middleware: {
      workspace: {
        configuration,
      },
    },
  };

  client = new LanguageClient('ansibleServer', 'Ansible Server', serverOptions, clientOptions);
  client.start();

  // commands
  serverRestartCommandFeature.activate(context, client);
  serverShowMetaDataCommandFeature.activate(context, client);
  serverResyncAnsibleInventoryCommandFeature.activate(context, client);
  if (pythonCommandPaths) {
    builtinInstallRequirementsToolsCommandFeature.activate(context, pythonCommandPaths, client);
  }
  if (existsAnsibleCmd) {
    ansibleDocShowInfoCommandFeature.activate(context, ansibleDocPath);
    ansibleDocShowSnippetsCommandFeature.activate(context, ansibleDocPath);
  } else if (ansibleDocBuiltinPath) {
    ansibleDocShowInfoCommandFeature.activate(context, ansibleDocBuiltinPath);
    ansibleDocShowSnippetsCommandFeature.activate(context, ansibleDocBuiltinPath);
  }

  // code actions
  ignoringRulesCodeActionFeature.activate(context, outputChannel);
  showWebDocumentationCodeActionFeature.activate(context, outputChannel);
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
        extensionConfig['python']['interpreterPath'] = getBuiltinPythonPath(extensionStoragePath);
      } else if (pythonInterpreterPath) {
        // [patch] If "ansible-lint" is not found, this feature will be set to false.
        if (!existsAnsibleLintModule) {
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

function getLanguageClientDisabledFeatures() {
  const r: string[] = [];
  if (getConfigDisableProgressNotifications()) r.push('progress');
  return r;
}

function getConfigDisableProgressNotifications() {
  return workspace.getConfiguration('ansible').get<boolean>('disableProgressNotifications', false);
}
