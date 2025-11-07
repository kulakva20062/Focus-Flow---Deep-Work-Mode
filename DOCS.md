# Документация проекта

## Функции

`activate(context)`

**Аргументы:**  
- `context` `(vscode.ExtensionContext)` - контекст расширения VS Code

**Возвращает:** `none`

**Описание:**
Основная функция активации расширения. Регистрирует все команды и инициализирует расширение.

`deactivate()`

**Аргументы:** `none`

**Возвращает:** `none`

**Описание:**
Функция деактивации расширения. Вызывается при отключении расширения.

`withLock(fn)`

**Аргументы:** `fn` (Function) - асинхронная функция для обертывания

**Возвращает:** `Function` - обернутую функцию с проверкой занятости

**Описание:**
Декоратор для предотвращения параллельного выполнения функций. Обеспечивает мьютекс.

**Пример:**

```javascript
// Создание защищенной функции
const saveData = withLock(async (data) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Data saved:', data);
});

// Использование
await saveData('important data'); // Выполнится
await saveData('another data');   // Проигнорируется (busy = true)

// Результат: предотвращение race condition
```

`safeSetWorkbenchBool(setting, desired, toggleCommand, toggledFlagKey)`

**Аргументы:**
- `setting` (string) - название настройки Workbench
- `desired` (boolean) - желаемое значение
- `toggleCommand` (string) - команда для переключения (fallback)
- `toggledFlagKey` (string) - ключ для сохранения флага изменения

**Возвращает:** `Promise<void>`

**Описание:**
Безопасно изменяет булевы настройки Workbench. Использует прямое API или команды переключения.

**Пример:** 

```javascript
// Скрытие Status Bar
await safeSetWorkbenchBool(
    'statusBar.visible',
    false,
    'workbench.action.toggleStatusbarVisibility', 
    'focusFlow.statusBarToggled'
);

// Скрытие Activity Bar  
await safeSetWorkbenchBool(
    'activityBar.visible',
    false,
    'workbench.action.toggleActivityBarVisibility',
    'focusFlow.activityBarToggled'
);
// Результат: панели скрыты, флаги изменений сохранены
```

`safeRestoreWorkbenchBool(setting, baselineValue, toggleCommand, toggledFlagKey)`

**Аргументы:**
- `setting` (string) - название настройки Workbench
- `baselineValue` (boolean) - базовое значение для восстановления
- `toggleCommand` (string) - команда для переключения (fallback)
- `toggledFlagKey` (string) - ключ флага изменения

**Возвращает:** `Promise<void>`

**Описание:**
Восстанавливает булевы настройки Workbench к исходным значениям.

**Пример:**

```javascript
// Получаем сохраненную конфигурацию
const baseline = getBaselineOrCurrent();

// Восстановление Status Bar
await safeRestoreWorkbenchBool(
    'statusBar.visible',
    baseline.statusBarVisible,
    'workbench.action.toggleStatusbarVisibility',
    'focusFlow.statusBarToggled'
);
// Результат: Status Bar возвращен к исходному состоянию
```

`saveCurrentLayoutAsStandard()`

**Аргументы:** `none`

**Возвращает:** `Promise<void>` 

**Описание:**
Сохраняет текущую конфигурацию VS Code (панели, тему, мини-карту) как стандартную.

**Пример:**

```javascript
// Сохранение текущего состояния интерфейса
await saveCurrentLayoutAsStandard();

// Проверка сохраненных данных
const saved = extContext.globalState.get('focusFlow.standardLayout');
console.log(saved);
// Результат: { activityBarVisible: true, statusBarVisible: true, theme: "Dark+", minimapEnabled: true }
```

`getBaselineOrCurrent()`

**Аргументы:** `none`

**Возвращает:** `Object` - объект с конфигурацией layout

**Структура возвращаемого объекта:**
{
- `activityBarVisible:` boolean,
- `statusBarVisible:` boolean, 
- `theme:` string,
- `minimapEnabled:` boolean

}

**Описание:**
Получает сохраненную базовую конфигурацию или текущую, если сохраненной нет.

**Пример:**

```javascript
// Получение конфигурации для восстановления
const config = getBaselineOrCurrent();

console.log('Activity Bar visible:', config.activityBarVisible);
console.log('Theme:', config.theme);
console.log('Minimap enabled:', config.minimapEnabled);

// Использование в логике
if (config.activityBarVisible) {
    console.log('Activity Bar будет показан при восстановлении');
}
```

`enterFocusFlowMode()`

**Аргументы:** `none`

**Возвращает:** `Promise<void>`

**Описание:**
Активирует режим фокуса - скрывает панели, меняет тему, включает полноэкранный режим.

**Пример:**

```javascript
// Активация режима максимальной концентрации
await enterFocusFlowMode();

// Результат:
// - Закрыты sidebar и panel
// - Скрыты status bar и activity bar  
// - Отключена мини-карта
// - Возможно изменена тема и включен полноэкранный режим
// - Показано сообщение "Режим фокуса активирован!"
```

`enterStandardFlowMode()`

**Аргументы:** `none`

**Возвращает:** `Promise<void>`

**Описание:**
Восстанавливает стандартный режим - возвращает все настройки к сохраненным значениям.

**Пример:**

```javascript
// Восстановление стандартного интерфейса
await enterStandardFlowMode();

// Результат:
// - Восстановлена видимость всех панелей
// - Возвращена исходная тема
// - Включена мини-карта
// - Открыты explorer и panel
// - Выход из полноэкранного режима (если был)
// - Показано сообщение "Стандартный вид восстановлен"
```

## Вспомогательные константы

`BASELINE_KEY`

**Тип:** `string`

**Значение:** `'focusFlow.standardLayout'` 

**Назначение:** 
Ключ для хранения стандартной конфигурации layout

`ACTIVE_KEY`

**Тип:** `string`

**Значение:** `'focusFlow.active'`

**Назначение:** 
Флаг активности режима фокуса

`FS_TOGGLED_KEY`

**Тип:** `string`

**Значение:** `'focusFlow.fullScreenToggled'`

**Назначение:** Флаг переключения полноэкранного режима

`ACTIVITYBAR_TOGGLED_KEY`

**Тип:** `string`

**Значение:** `'focusFlow.activityBarToggled'`

**Назначение:** Флаг изменения Activity Bar через команду

`STATUSBAR_TOGGLED_KEY`

**Тип:** `string`

**Значение:** `'focusFlow.statusBarToggled'`

**Назначение:** Флаг изменения Status Bar через команду

`WARNED_ACTIVITYBAR_KEY`

**Тип:** `string`

**Значение:** `'focusFlow.warnedActivityBarMissing'`

**Назначение:** Флаг показа предупреждения об Activity Bar

## История изменений

commit e75826c6ec52d423c116c140d2898a0d9ed519fc (HEAD -> plagin)
Author: kulakva <kulakva2006@mail.ru>
Date:   Fri Nov 7 03:39:10 2025 +0300

    Убрал плагин и .gitignore

commit 7b39fea5fbec382ee0d60e00967af745e4cd4608
Author: kulakva <kulakva2006@mail.ru>
Date:   Fri Nov 7 03:34:26 2025 +0300

    V 0.1.1

commit 1cd26c05509ce2eb55cc521fffce5b2b5b32d661
Author: kulakva <kulakva2006@mail.ru>
Date:   Fri Nov 7 03:26:12 2025 +0300

    V 0.1.0

commit 74b135cead26b3b8e18f19829c9fb8123de20e9d
Author: kulakva <kulakva2006@mail.ru>
Date:   Thu Nov 6 22:51:46 2025 +0300

    V 0.0.4

commit 023e54e0cb2d938a2ece627272e93735c32f1e2c
Author: kulakva <kulakva2006@mail.ru>
Date:   Thu Oct 30 22:11:40 2025 +0300

    V 0.0.1

commit b19acbf587cd541db2d461cbd0deb52343b6ace8 (master)
Author: kulakva <kulakva2006@mail.ru>
Date:   Thu Oct 30 20:40:25 2025 +0300

    start