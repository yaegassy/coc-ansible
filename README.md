# coc-ansible

[ansible-language-server](https://github.com/ansible/ansible-language-server) extension for [coc.nvim](https://github.com/neoclide/coc.nvim)

<img width="780" alt="coc-ansible-demo" src="https://user-images.githubusercontent.com/188642/133183623-7eb4529b-cf4b-4778-adfe-b57105194b7c.gif">

## Install

**CocInstall**:

```vim
:CocInstall @yaegassy/coc-ansible
```

> scoped packages

**vim-plug**:

```vim
Plug 'yaegassy/coc-ansible', {'do': 'yarn install --frozen-lockfile'}
```

## Note

### [!! Very important !!] Filetype related

1. The "filetype" must be `yaml.ansible` for this extension to work.

   If you install ansible's vim plugin, `yaml.ansible` filetype will be added automatically, which is very useful (e.g. [pearofducks/ansible-vim](https://github.com/pearofducks/ansible-vim) or [sheerun/vim-polyglot](https://github.com/sheerun/vim-polyglot)).

2. You also need to set `g:coc_filetype_map` in `.vimrc/init.vim`.

   ```vim
   let g:coc_filetype_map = {
     \ 'yaml.ansible': 'ansible',
     \ }
   ```

## Requirements (Tools)

- [Ansible 2.9+](https://docs.ansible.com/ansible/latest/index.html)
- [Ansible Lint](https://ansible-lint.readthedocs.io/en/latest/) (required, unless you disable linter support)
  - [TIPS] `coc-ansible` will **automatically disable the feature** if `ansible-lint` is not found
- [yamllint](https://yamllint.readthedocs.io/en/stable/) (optional)

> If you also install `yamllint`, `ansible-lint` will detect it and incorporate into the linting process. Any findings reported by `yamllint` will be exposed in coc.nvim as errors/warnings.

## Bult-in install

coc-ansible allows you to create an extension-only "venv" and install `ansible`, `ansible-lint` and `yamllint`.

`yamllint` will be installed by setting `ansible.builtin.isWithYamllint` to `true` (default: `false`).

You can also specify the version of each tool. (setting: `ansible.bultin.ansibleVersion`, `ansible.bultin.ansibleLintVersion`, `ansible.bultin.yamllintVersion`)

---

The first time you use coc-ansible, if ansible, ansible-lint is not detected, you will be prompted to do a built-in installation.

You can also run the installation command manually.

```
:CocCommand ansible.builtin.installRequirementsTools
```

## Configuration options

- `ansible.enable`: Enable coc-ansible extension, default: `true`
- `ansible.disableProgressNotifications`: Disable progress notifications from ansible-language-server, default: `false`
- `ansible.builtin.isWithYamllint`: Whether to install yamllint the built-in installer, default: `false`
- `ansible.builtin.ansibleVersion`: Version of `ansible` for built-in install, default: `""`
- `ansible.builtin.ansibleLintVersion`: Version of `ansible-lint` for built-in install, default: `""`
- `ansible.builtin.force`: Whether to force builtin tools instead those in the PATH, default: `false`
- `ansible.builtin.yamllintVersion`: Version of `yamllint` for built-in install, default: `""`
- `ansible.ansible.useFullyQualifiedCollectionNames`: Always use fully qualified collection names (FQCN) when inserting a module name. Disabling it will only use FQCNs when necessary, default: `true`
- `ansible.python.interpreterPath`: Path to the python/python3 executable. This settings may be used to make the extension work with ansible and ansible-lint installations in a python virtual environment, default: `""`
- `ansible.validation.enabled`: Toggle validation provider. If enabled and ansible-lint is disabled, validation falls back to ansible-playbook --syntax-check, default: `true`
- `ansible.validation.lint.enabled`: Toggle usage of ansible-lint, default: `true`
- `ansible.validation.lint.arguments`: Optional command line arguments to be appended to ansible-lint invocation, default `""`
- `ansible.completion.provideRedirectModules`: Toggle redirected module provider when completing modules, default: `true`
- `ansible.completion.provideModuleOptionAliases`: Toggle alias provider when completing module options, default: `true`
- `ansible.ansibleDoc.path`: Path to the ansible-doc executable, default: `ansible-doc`
- `ansible.ansibleDoc.enableSplitRight`: Use vertical belowright for ansible-doc terminal window, default: `true`
- `ansible.ansibleNavigator.path`: Points to the ansible-navigator executable, default: `"ansible-navigator"`
- `ansible.dev.serverPath`: Absolute path to ansible language server module. If it is not set, use the extention's server module. (For develop and check), default: `""`
- `ansibleServer.trace.server`: Traces the communication between coc.nvim and the ansible language server, default: `"off"`

## Commands

**Command List**:

> :CocCommand [CommandName]
>
> **e.g.** :CocCommand ansible.server.restart

- `ansible.builtin.installRequirementsTools`: Install `ansible`, `ansible-lint` and `yamllint` (optional) with extension's venv
  - It will be installed in this path:
    - Mac/Linux:
      - `~/.config/coc/extensions/@yaegassy/coc-ansible-data/ansible/venv/bin/ansible`
      - `~/.config/coc/extensions/@yaegassy/coc-ansible-data/ansible/venv/bin/ansible-lint`
      - `~/.config/coc/extensions/@yaegassy/coc-ansible-data/ansible/venv/bin/yamllint`
    - Windows:
      - `~/AppData/Local/coc/extensions/@yaegassy/coc-ansible-data/ansible/venv/Scripts/ansible.exe`
      - `~/AppData/Local/coc/extensions/@yaegassy/coc-ansible-data/ansible/venv/Scripts/ansible-lint.exe`
      - `~/AppData/Local/coc/extensions/@yaegassy/coc-ansible-data/ansible/venv/Scripts/yamllint.exe`
  - **[Note]** `ansible` is a very large tool and will take some time to install
- `ansible.server.restart`: Restart ansible language server
- `ansible.server.showMetaData`: Show ansible-metadata for ansible language server | [DEMO](https://github.com/yaegassy/coc-ansible/pull/24)
- `ansible.server.resyncAnsibleInventory`: Resync Ansible Inventory | [DEMO](https://github.com/yaegassy/coc-ansible/pull/25)
- `ansible.ansbileDoc.showInfo`: Run the `ansible-doc` command in a terminal window with various options to display information about the plugins | [DEMO](https://github.com/yaegassy/coc-ansible/pull/22#issuecomment-1178586815)
- `ansible.ansbileDoc.showSnippets`: Run the `ansible-doc` command in a terminal window with various options to display a snippets of the plugins | [DEMO](https://github.com/yaegassy/coc-ansible/pull/22#issuecomment-1178587359)

**Example of command key mapping**:

```vim
" Quickly view a list of all coc.nvim commands
nnoremap <silent> <C-p> :<C-u>CocCommand<CR>
```

## Code Actions

**Example key mapping (Code Action related)**:

```vim
nmap <silent> ga <Plug>(coc-codeaction-line)
```

**Usage**:

In the line with diagnostic message, enter the mapped key (e.g. `ga`) and you will see a list of code actions that can be performed.

**Actions**:

- `Ignoring rules for current line (# noqa [ruleId])` | [DEMO](https://github.com/yaegassy/coc-ansible/pull/13)
  - Requires `ansible-lint` "v6.8.1" or later.
- `Show web documentation for [ruleId]` | [DEMO](https://github.com/yaegassy/coc-ansible/pull/21#issue-1296813716)
  - Requires `ansible-lint` "v6.8.1" or later.

## Thanks

- [ansible/ansible-language-server](https://github.com/ansible/ansible-language-server)
- [ansible/vscode-ansible](https://github.com/ansible/vscode-ansible)

## License

MIT

---

> This extension is built with [create-coc-extension](https://github.com/fannheyward/create-coc-extension)
