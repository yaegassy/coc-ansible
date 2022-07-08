import { WorkspaceConfiguration } from 'coc.nvim';

import child_process from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';
import which from 'which';

import type { PythonPaths } from './types';

const exec = util.promisify(child_process.exec);

export function getCurrentPythonPath(config: WorkspaceConfiguration): PythonPaths | undefined {
  let pythonPaths: PythonPaths | undefined;

  let pythonPath = config.get<string>('python.interpreterPath', '');
  if (pythonPath) {
    pythonPaths = {
      env: pythonPath,
      real: fs.realpathSync(pythonPath),
    };
    return pythonPaths;
  }

  try {
    pythonPath = which.sync('python3');
    pythonPaths = {
      env: pythonPath,
      real: fs.realpathSync(pythonPath),
    };
    return pythonPaths;
  } catch (e) {
    // noop
  }

  try {
    pythonPath = which.sync('python');
    pythonPaths = {
      env: pythonPath,
      real: fs.realpathSync(pythonPath),
    };
    return pythonPaths;
  } catch (e) {
    // noop
  }

  return pythonPaths;
}

export function getCurrentPythonPath2(config: WorkspaceConfiguration, isRealpath?: boolean): string {
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

export function getBuiltinPythonPath(extensionStoragePath: string): string {
  let builtinPythonPath = '';

  if (process.platform === 'win32') {
    builtinPythonPath = path.join(extensionStoragePath, 'ansible', 'venv', 'Scripts', 'python.exe');
  } else {
    builtinPythonPath = path.join(extensionStoragePath, 'ansible', 'venv', 'bin', 'python');
  }

  return builtinPythonPath;
}

export function getBuiltinToolPath(extensionStoragePath: string, toolName: string): string {
  let toolPath = '';

  if (toolName === 'ansible') {
    if (
      fs.existsSync(path.join(extensionStoragePath, 'ansible', 'venv', 'Scripts', 'ansible.exe')) ||
      fs.existsSync(path.join(extensionStoragePath, 'ansible', 'venv', 'bin', 'ansible'))
    ) {
      if (process.platform === 'win32') {
        toolPath = path.join(extensionStoragePath, 'ansible', 'venv', 'Scripts', 'ansible.exe');
      } else {
        toolPath = path.join(extensionStoragePath, 'ansible', 'venv', 'bin', 'ansible');
      }
    }
  }

  if (toolName === 'ansible-lint') {
    if (
      fs.existsSync(path.join(extensionStoragePath, 'ansible', 'venv', 'Scripts', 'ansible-lint.exe')) ||
      fs.existsSync(path.join(extensionStoragePath, 'ansible', 'venv', 'bin', 'ansible-lint'))
    ) {
      if (process.platform === 'win32') {
        toolPath = path.join(extensionStoragePath, 'ansible', 'venv', 'Scripts', 'ansible-lint.exe');
      } else {
        toolPath = path.join(extensionStoragePath, 'ansible', 'venv', 'bin', 'ansible-lint');
      }
    }
  }

  if (toolName === 'ansible-doc') {
    if (
      fs.existsSync(path.join(extensionStoragePath, 'ansible', 'venv', 'Scripts', 'ansible-doc.exe')) ||
      fs.existsSync(path.join(extensionStoragePath, 'ansible', 'venv', 'bin', 'ansible-doc'))
    ) {
      if (process.platform === 'win32') {
        toolPath = path.join(extensionStoragePath, 'ansible', 'venv', 'Scripts', 'ansible-doc.exe');
      } else {
        toolPath = path.join(extensionStoragePath, 'ansible', 'venv', 'bin', 'ansible-doc');
      }
    }
  }

  return toolPath;
}

export async function existsPythonImportModule(pythonPath: string, moduleName: string): Promise<boolean> {
  const checkCmd = `${pythonPath} -c "import ${moduleName}"`;
  try {
    await exec(checkCmd);
    return true;
  } catch (error) {
    return false;
  }
}

export async function existsCmdWithHelpOpt(command: string): Promise<boolean> {
  const checkCmd = `${command} -h`;
  try {
    await exec(checkCmd);
    return true;
  } catch (error) {
    return false;
  }
}
