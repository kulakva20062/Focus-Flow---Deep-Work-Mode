const vscode = require('vscode');

const BASELINE_KEY = 'focusFlow.standardLayout';
const ACTIVE_KEY = 'focusFlow.active';
const FS_TOGGLED_KEY = 'focusFlow.fullScreenToggled';

let extContext;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    extContext = context;
    console.log('Focus Flow активирован');

    // Команды
    context.subscriptions.push(
        vscode.commands.registerCommand('focus-flow.saveStandardLayout', async () => {
            await saveCurrentLayoutAsStandard();
            vscode.window.showInformationMessage('Focus Flow: Текущий layout сохранен как стандартный');
        }),
        vscode.commands.registerCommand('focus-flow.enterFocusMode', async () => {
            await enterFocusFlowMode();
        }),
        vscode.commands.registerCommand('focus-flow.enterStandardMode', async () => {
            await enterStandardFlowMode();
        }),
    );
}

function deactivate() {}

/**
 * Сохранение текущего состояния (только то, что можно надежно считать/восстановить).
 */
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

/**
 * Загрузка ранее сохраненного состояния. Если не сохранено — берем текущее как дефолт.
 */
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

/**
 * Вход в режим фокуса
 */
async function enterFocusFlowMode() {
    const isActive = extContext.globalState.get(ACTIVE_KEY) === true;
    if (isActive) {
        vscode.window.showInformationMessage('Focus Flow уже активен');
        return;
    }

    // Сначала сохраним текущий layout
    await saveCurrentLayoutAsStandard();

    const wb = vscode.workspace.getConfiguration('workbench');
    const ed = vscode.workspace.getConfiguration('editor');
    const ff = vscode.workspace.getConfiguration('focus-flow');

    // 1. Скрываем боковую панель и нижнюю панель (командами — настроек видимости нет)
    await vscode.commands.executeCommand('workbench.action.closeSidebar');
    await vscode.commands.executeCommand('workbench.action.closePanel');

    // 2. Скрываем статус-бар и activity bar настройками (они поддерживаются)
    await wb.update('statusBar.visible', false, vscode.ConfigurationTarget.Global);
    await wb.update('activityBar.visible', false, vscode.ConfigurationTarget.Global);

    // 3. Отключаем миникарту
    await ed.update('minimap.enabled', false, vscode.ConfigurationTarget.Global);

    // 4. Переключаем тему (опционально)
    if (ff.get('switchThemeInFocus')) {
        const currentTheme = wb.get('colorTheme');
        const targetTheme = ff.get('highContrastTheme') || 'Default High Contrast';
        if (currentTheme !== targetTheme) {
            await wb.update('colorTheme', targetTheme, vscode.ConfigurationTarget.Global);
        }
    }

    // 5. Полноэкранный режим (опционально)
    if (ff.get('toggleFullScreen')) {
        await vscode.commands.executeCommand('workbench.action.toggleFullScreen');
        await extContext.globalState.update(FS_TOGGLED_KEY, true);
    } else {
        await extContext.globalState.update(FS_TOGGLED_KEY, false);
    }

    await extContext.globalState.update(ACTIVE_KEY, true);

    vscode.window
        .showInformationMessage('🚀 Focus Flow: Режим фокуса активирован!', 'Вернуться к стандартному виду')
        .then(async (sel) => {
            if (sel) await enterStandardFlowMode();
        });
}

/**
 * Выход из режима фокуса
 */
async function enterStandardFlowMode() {
    const isActive = extContext.globalState.get(ACTIVE_KEY) === true;
    const baseline = getBaselineOrCurrent();

    const wb = vscode.workspace.getConfiguration('workbench');
    const ed = vscode.workspace.getConfiguration('editor');

    // 1. Восстанавливаем статус-бар и activity bar
    if (typeof baseline.statusBarVisible === 'boolean') {
        await wb.update('statusBar.visible', baseline.statusBarVisible, vscode.ConfigurationTarget.Global);
    }
    if (typeof baseline.activityBarVisible === 'boolean') {
        await wb.update('activityBar.visible', baseline.activityBarVisible, vscode.ConfigurationTarget.Global);
    }

    // 2. Восстанавливаем миникарту
    if (typeof baseline.minimapEnabled === 'boolean') {
        await ed.update('minimap.enabled', baseline.minimapEnabled, vscode.ConfigurationTarget.Global);
    }

    // 3. Восстанавливаем тему
    if (baseline.theme) {
        await wb.update('colorTheme', baseline.theme, vscode.ConfigurationTarget.Global);
    }

    // 4. Возвращаем боковую и нижнюю панели (командами)
    // Откроем Проводник (гарантированно покажет боковую панель):
    await vscode.commands.executeCommand('workbench.view.explorer');
    // Откроем нижнюю панель (Show Panel; если такой команды нет в вашей версии, используйте togglePanel):
    try {
        await vscode.commands.executeCommand('workbench.action.openPanel');
    } catch {
        // fallback на toggle, если openPanel недоступна
        await vscode.commands.executeCommand('workbench.action.togglePanel');
    }

    // 5. Выходим из полноэкранного режима, если включали его мы
    if (extContext.globalState.get(FS_TOGGLED_KEY) === true) {
        await vscode.commands.executeCommand('workbench.action.toggleFullScreen');
        await extContext.globalState.update(FS_TOGGLED_KEY, false);
    }

    await extContext.globalState.update(ACTIVE_KEY, false);

    // Сообщение выводим всегда; если пользователь вызывал выход вручную, это ожидаемо
    if (isActive) {
        vscode.window.showInformationMessage('👋 Focus Flow: Стандартный вид восстановлен');
    } else {
        vscode.window.showInformationMessage('Focus Flow: Стандартный вид активен');
    }
}

module.exports = {
    activate,
    deactivate
};