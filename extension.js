const vscode = require('vscode');

const BASELINE_KEY = 'focusFlow.standardLayout';
const ACTIVE_KEY = 'focusFlow.active';
const FS_TOGGLED_KEY = 'focusFlow.fullScreenToggled';

const ACTIVITYBAR_TOGGLED_KEY = 'focusFlow.activityBarToggled';
const STATUSBAR_TOGGLED_KEY = 'focusFlow.statusBarToggled';
const WARNED_ACTIVITYBAR_KEY = 'focusFlow.warnedActivityBarMissing';

let extContext;
let busy = false;

function activate(context) {
    extContext = context;
    console.log('Focus Flow активирован');

    context.subscriptions.push(
        vscode.commands.registerCommand('focus-flow.saveStandardLayout', withLock(async () => {
            await saveCurrentLayoutAsStandard();
            vscode.window.showInformationMessage('Focus Flow: Текущий layout сохранен как стандартный');
        })),
        vscode.commands.registerCommand('focus-flow.enterFocusMode', withLock(async () => {
            await enterFocusFlowMode();
        })),
        vscode.commands.registerCommand('focus-flow.enterStandardMode', withLock(async () => {
            await enterStandardFlowMode();
        })),
    );
}

function deactivate() {}

function withLock(fn) {
    return async (...args) => {
        if (busy) return; 
        busy = true;
        try {
            await fn(...args);
        } finally {
            busy = false;
        }
    };
}

async function safeSetWorkbenchBool(setting, desired, toggleCommand, toggledFlagKey) {
    const wb = vscode.workspace.getConfiguration('workbench');

    try {
        const current = wb.get(setting);
        if (typeof current === 'boolean') {
            if (current !== desired) {
                await wb.update(setting, desired, vscode.ConfigurationTarget.Global);
            }
            await extContext.globalState.update(toggledFlagKey, false);
            return;
        }
        throw new Error(`Setting ${setting} is not registered`);
    } catch {
        try {
            const current = wb.get(setting);
            if (typeof current === 'boolean') {
                if (current !== desired) {
                    await vscode.commands.executeCommand(toggleCommand);
                    await extContext.globalState.update(toggledFlagKey, true);
                } else {
                    await extContext.globalState.update(toggledFlagKey, false);
                }
                return;
            }
        } catch {}

        await extContext.globalState.update(toggledFlagKey, false);

        if (setting === 'activityBar.visible') {
            const warned = extContext.globalState.get(WARNED_ACTIVITYBAR_KEY) === true;
            if (!warned) {
                vscode.window.showWarningMessage(
                    'Focus Flow: В вашей сборке VS Code не удается управлять Activity Bar. Пропускаю его скрытие.'
                );
                await extContext.globalState.update(WARNED_ACTIVITYBAR_KEY, true);
            }
        }
    }
}

async function safeRestoreWorkbenchBool(setting, baselineValue, toggleCommand, toggledFlagKey) {
    const wb = vscode.workspace.getConfiguration('workbench');
    try {
        const current = wb.get(setting);
        if (typeof current === 'boolean' && typeof baselineValue === 'boolean') {
            if (current !== baselineValue) {
                await wb.update(setting, baselineValue, vscode.ConfigurationTarget.Global);
            }
            await extContext.globalState.update(toggledFlagKey, false);
            return;
        }
    } catch {}

    const wasToggled = extContext.globalState.get(toggledFlagKey) === true;
    if (wasToggled) {
        await vscode.commands.executeCommand(toggleCommand);
        await extContext.globalState.update(toggledFlagKey, false);
    }
}

async function saveCurrentLayoutAsStandard() {
    const wb = vscode.workspace.getConfiguration('workbench');
    const ed = vscode.workspace.getConfiguration('editor');

    const baseline = {
        activityBarVisible: wb.get('activityBar.visible'),
        statusBarVisible: wb.get('statusBar.visible'),
        theme: wb.get('colorTheme'),
        minimapEnabled: ed.get('minimap.enabled')
    };

    await extContext.globalState.update(BASELINE_KEY, baseline);
}

function getBaselineOrCurrent() {
    const stored = extContext.globalState.get(BASELINE_KEY);
    if (stored) return stored;

    const wb = vscode.workspace.getConfiguration('workbench');
    const ed = vscode.workspace.getConfiguration('editor');

    return {
        activityBarVisible: wb.get('activityBar.visible'),
        statusBarVisible: wb.get('statusBar.visible'),
        theme: wb.get('colorTheme'),
        minimapEnabled: ed.get('minimap.enabled')
    };
}

async function enterFocusFlowMode() {
    if (extContext.globalState.get(ACTIVE_KEY) === true) {
        vscode.window.showInformationMessage('Focus Flow уже активен');
        return;
    }

    await saveCurrentLayoutAsStandard();

    const wb = vscode.workspace.getConfiguration('workbench');
    const ed = vscode.workspace.getConfiguration('editor');
    const ff = vscode.workspace.getConfiguration('focus-flow');

    let activated = false;
    try {
        await vscode.commands.executeCommand('workbench.action.closeSidebar');
        await vscode.commands.executeCommand('workbench.action.closePanel');

        await safeSetWorkbenchBool('statusBar.visible', false, 'workbench.action.toggleStatusbarVisibility', STATUSBAR_TOGGLED_KEY);
        await safeSetWorkbenchBool('activityBar.visible', false, 'workbench.action.toggleActivityBarVisibility', ACTIVITYBAR_TOGGLED_KEY);

        await ed.update('minimap.enabled', false, vscode.ConfigurationTarget.Global);

        if (ff.get('switchThemeInFocus')) {
            const targetTheme = ff.get('highContrastTheme') || 'Default High Contrast';
            if (wb.get('colorTheme') !== targetTheme) {
                await wb.update('colorTheme', targetTheme, vscode.ConfigurationTarget.Global);
            }
        }

        if (ff.get('toggleFullScreen')) {
            await vscode.commands.executeCommand('workbench.action.toggleFullScreen');
            await extContext.globalState.update(FS_TOGGLED_KEY, true);
        } else {
            await extContext.globalState.update(FS_TOGGLED_KEY, false);
        }

        await extContext.globalState.update(ACTIVE_KEY, true);
        activated = true;

        vscode.window.showInformationMessage('Focus Flow: Режим фокуса активирован!', 'Вернуться к стандартному виду')
            .then(async (sel) => {
                if (sel) await enterStandardFlowMode();
            });

    } catch (e) {
        if (!activated) {
            await extContext.globalState.update(ACTIVE_KEY, false);
        }
        vscode.window.showErrorMessage('Focus Flow: Не удалось включить режим фокуса. Подробности в консоли разработчика.');
        console.error(e);
    }
}

async function enterStandardFlowMode() {
    const baseline = getBaselineOrCurrent();

    const wb = vscode.workspace.getConfiguration('workbench');
    const ed = vscode.workspace.getConfiguration('editor');

    try {
        await safeRestoreWorkbenchBool('statusBar.visible', baseline.statusBarVisible, 'workbench.action.toggleStatusbarVisibility', STATUSBAR_TOGGLED_KEY);
        await safeRestoreWorkbenchBool('activityBar.visible', baseline.activityBarVisible, 'workbench.action.toggleActivityBarVisibility', ACTIVITYBAR_TOGGLED_KEY);

        if (typeof baseline.minimapEnabled === 'boolean') {
            await ed.update('minimap.enabled', baseline.minimapEnabled, vscode.ConfigurationTarget.Global);
        }

        if (baseline.theme) {
            await wb.update('colorTheme', baseline.theme, vscode.ConfigurationTarget.Global);
        }

        await vscode.commands.executeCommand('workbench.view.explorer');
        try {
            await vscode.commands.executeCommand('workbench.action.openPanel');
        } catch {
            await vscode.commands.executeCommand('workbench.action.togglePanel');
        }

        if (extContext.globalState.get(FS_TOGGLED_KEY) === true) {
            await vscode.commands.executeCommand('workbench.action.toggleFullScreen');
            await extContext.globalState.update(FS_TOGGLED_KEY, false);
        }

        await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');

        vscode.window.showInformationMessage('Focus Flow: Стандартный вид восстановлен');
    } catch (e) {
        vscode.window.showErrorMessage('Focus Flow: Ошибка при восстановлении стандартного вида. Подробности в консоли разработчика.');
        console.error(e);
    } finally {
        await extContext.globalState.update(ACTIVE_KEY, false);
    }
}

module.exports = {
    activate,
    deactivate
};