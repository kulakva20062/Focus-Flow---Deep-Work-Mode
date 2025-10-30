const vscode = require('vscode');

// Храним состояние стандартного layout
let standardLayoutState = {
    sideBarVisible: true,
    panelVisible: true,
    statusBarVisible: true,
    activityBarVisible: true,
    zenMode: false,
    theme: null
};

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Focus Flow активирован');

    // Загружаем сохраненный layout при активации
    loadStandardLayout();

    // Команда: Сохранить текущий layout как стандартный
    let saveStandardLayout = vscode.commands.registerCommand('focus-flow.saveStandardLayout', function () {
        saveCurrentLayoutAsStandard();
        vscode.window.showInformationMessage('Focus Flow: Текущий layout сохранен как стандартный');
    });

    // Команда: Войти в режим фокуса
    let enterFocusMode = vscode.commands.registerCommand('focus-flow.enterFocusMode', function () {
        enterFocusFlowMode();
    });

    // Команда: Вернуться в стандартный режим
    let enterStandardMode = vscode.commands.registerCommand('focus-flow.enterStandardMode', function () {
        enterStandardFlowMode();
    });

    context.subscriptions.push(saveStandardLayout, enterFocusMode, enterStandardMode);
}

function deactivate() {}

/**
 * Сохраняет текущее состояние layout как стандартное
 */
function saveCurrentLayoutAsStandard() {
    const config = vscode.workspace.getConfiguration('workbench');
    
    standardLayoutState = {
        sideBarVisible: vscode.window.visibleTextEditors.length > 0 ? 
            vscode.workspace.getConfiguration('workbench').get('sideBar.visible') : true,
        panelVisible: vscode.workspace.getConfiguration('workbench').get('panel.visible'),
        statusBarVisible: vscode.workspace.getConfiguration('workbench').get('statusBar.visible'),
        activityBarVisible: vscode.workspace.getConfiguration('workbench').get('activityBar.visible'),
        zenMode: vscode.workspace.getConfiguration('workbench').get('zenMode'),
        theme: vscode.workspace.getConfiguration('workbench').get('colorTheme')
    };

    // Сохраняем в глобальное состояние
    vscode.workspace.getConfiguration('focus-flow').update('standardLayout', standardLayoutState, true);
}

/**
 * Загружает сохраненный стандартный layout
 */
function loadStandardLayout() {
    const savedLayout = vscode.workspace.getConfiguration('focus-flow').get('standardLayout');
    if (savedLayout) {
        standardLayoutState = savedLayout;
    }
}

/**
 * Вход в режим глубокой концентрации
 */
async function enterFocusFlowMode() {
    // Сохраняем текущее состояние перед переходом в focus mode
    saveCurrentLayoutAsStandard();

    // 1. Скрываем боковую панель
    await vscode.workspace.getConfiguration('workbench').update('sideBar.visible', false, true);
    
    // 2. Скрываем нижнюю панель
    await vscode.workspace.getConfiguration('workbench').update('panel.visible', false, true);
    
    // 3. Скрываем статус бар для максимальной концентрации
    await vscode.workspace.getConfiguration('workbench').update('statusBar.visible', false, true);
    
    // 4. Скрываем activity bar
    await vscode.workspace.getConfiguration('workbench').update('activityBar.visible', false, true);

    // 5. Переключаемся на высококонтрастную тему
    const currentTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme');
    if (!currentTheme.includes('High Contrast')) {
        await vscode.workspace.getConfiguration('workbench').update('colorTheme', 'Default High Contrast', true);
    }

    // 6. Включаем полноэкранный режим (максимизируем окно)
    await vscode.commands.executeCommand('workbench.action.toggleFullScreen');

    // 7. Отключаем уведомления (через настройки)
    await vscode.workspace.getConfiguration('').update('editor.minimap.enabled', false, true);
    
    vscode.window.showInformationMessage('🚀 Focus Flow: Режим глубокой концентрации активирован!', 
        'Вернуться к стандартному виду').then(selection => {
        if (selection) {
            enterStandardFlowMode();
        }
    });
}

/**
 * Возврат в стандартный режим
 */
async function enterStandardFlowMode() {
    // 1. Восстанавливаем боковую панель
    await vscode.workspace.getConfiguration('workbench').update('sideBar.visible', 
        standardLayoutState.sideBarVisible !== undefined ? standardLayoutState.sideBarVisible : true, true);
    
    // 2. Восстанавливаем нижнюю панель
    await vscode.workspace.getConfiguration('workbench').update('panel.visible', 
        standardLayoutState.panelVisible !== undefined ? standardLayoutState.panelVisible : true, true);
    
    // 3. Восстанавливаем статус бар
    await vscode.workspace.getConfiguration('workbench').update('statusBar.visible', 
        standardLayoutState.statusBarVisible !== undefined ? standardLayoutState.statusBarVisible : true, true);
    
    // 4. Восстанавливаем activity bar
    await vscode.workspace.getConfiguration('workbench').update('activityBar.visible', 
        standardLayoutState.activityBarVisible !== undefined ? standardLayoutState.activityBarVisible : true, true);

    // 5. Восстанавливаем оригинальную тему
    if (standardLayoutState.theme) {
        await vscode.workspace.getConfiguration('workbench').update('colorTheme', standardLayoutState.theme, true);
    }

    // 6. Выходим из полноэкранного режима
    await vscode.commands.executeCommand('workbench.action.toggleFullScreen');

    // 7. Восстанавливаем мини-карту
    await vscode.workspace.getConfiguration('').update('editor.minimap.enabled', true, true);

    vscode.window.showInformationMessage('👋 Focus Flow: Стандартный вид восстановлен');
}

module.exports = {
    activate,
    deactivate
};