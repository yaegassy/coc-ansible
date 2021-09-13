import { ExtensionContext, window, workspace } from 'coc.nvim';

import path from 'path';

import rimraf from 'rimraf';
import child_process from 'child_process';
import util from 'util';

const exec = util.promisify(child_process.exec);

export async function installLsRequirementsTools(pythonCommand: string, context: ExtensionContext): Promise<void> {
  const pathVenv = path.join(context.storagePath, 'ansible', 'venv');

  let pathVenvPython = path.join(context.storagePath, 'ansible', 'venv', 'bin', 'python');
  if (process.platform === 'win32') {
    pathVenvPython = path.join(context.storagePath, 'ansible', 'venv', 'Scripts', 'python');
  }

  const statusItem = window.createStatusBarItem(0, { progress: true });
  statusItem.text = `Install Ansible Server requirements tools...`;
  statusItem.show();

  const extensionConfig = workspace.getConfiguration('ansible');
  const isWithYamlLint = extensionConfig.get('builtin.isWithYamllint');
  const installAnsibleStr = _installToolVersionStr('ansible', extensionConfig.get('builtin.ansibleVersion'));
  const installAnsibleLintStr = _installToolVersionStr(
    'ansible-lint',
    extensionConfig.get('builtin.ansibleLintVersion')
  );
  const installYamllintStr = _installToolVersionStr('yamllint', extensionConfig.get('builtin.yamllintVersion'));

  const installCmd =
    `${pythonCommand} -m venv ${pathVenv} && ` +
    `${pathVenvPython} -m pip install -U pip ${installAnsibleStr} ${installAnsibleLintStr}`;

  if (isWithYamlLint) {
    installCmd.concat(' ', installYamllintStr);
  }

  rimraf.sync(pathVenv);
  try {
    window.showMessage(`Install Ansible Server requirements tools...`);
    await exec(installCmd);
    statusItem.hide();
    window.showMessage(`Ansible Server requirements tools: installed!`);
  } catch (error) {
    statusItem.hide();
    window.showErrorMessage(`Ansible Server requirements tools: install failed. | ${error}`);
    throw new Error();
  }
}

function _installToolVersionStr(name: string, version?: string): string {
  let installStr: string;

  if (version) {
    installStr = `${name}==${version}`;
  } else {
    installStr = `${name}`;
  }

  return installStr;
}
