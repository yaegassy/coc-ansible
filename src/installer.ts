import { ExtensionContext, window, workspace } from 'coc.nvim';

import child_process from 'child_process';
import path from 'path';
import { rimrafSync } from 'rimraf';
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
    `"${pythonCommand}" -m venv ${pathVenv} && ` +
    `${pathVenvPython} -m pip install -U pip ${installAnsibleStr} ${installAnsibleLintStr}`;

  if (isWithYamlLint) {
    installCmd.concat(' ', installYamllintStr);
  }

  rimrafSync(pathVenv);
  try {
    window.showInformationMessage(`Install Ansible Server requirements tools...`);
    await exec(installCmd);
    statusItem.hide();
    window.showInformationMessage(`Ansible Server requirements tools: installed!`);
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

export async function installWrapper(pythonCommand: string, context: ExtensionContext) {
  const msg = 'Install Ansible Server requirements tools?';
  const ret = await window.showPrompt(msg);
  if (ret) {
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
