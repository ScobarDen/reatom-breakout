# Чем OpenTUI рисует и слушает ввод

Снято 2026-09-22. Документация: [opentui.com/docs](https://opentui.com/docs). Исходники: [`anomalyco/opentui` @ `4954312`](https://github.com/anomalyco/opentui/commit/4954312d749f71e80664aa8b0e8a75384186eb99) (2026-09-18). В этом коммите [`packages/core/package.json`](https://github.com/anomalyco/opentui/blob/4954312d749f71e80664aa8b0e8a75384186eb99/packages/core/package.json) называет пакет `@opentui/core` версии `0.5.11`.

Вопрос один: что это за пакет, как устроены рендер и ввод, есть ли свой реактивный цикл, можно ли кормить его внешним состоянием на каждый кадр, не перенося игровую логику в терминальный UI, и как это собирается рядом с Vite и TypeScript. Ниже ещё список ограничений для будущего контракта ViewModel. Сам контракт здесь не проектируется.

## Какой это пакет

OpenTUI — нативное терминальное UI-ядро на Zig с TypeScript-биндингами. Оно рисует дерево компонентов, раскладывает его flexbox-ом, разбирает терминальный ввод и обновляет изменившиеся клетки. TypeScript-пакеты зовут нативную библиотеку через внутренний ABI. В проде на нём сидит OpenCode. Источник: [Getting started](https://opentui.com/docs/).

Публичный пакет рендера — `@opentui/core`: императивные renderable и события. Рядом официальные `@opentui/react` и `@opentui/solid`. Исходники ещё публикуют `@opentui/keymap`, `@opentui/qrcode`, `@opentui/three`, `@opentui/ssh`. Нативная реализация Zig лежит в приватном workspace `@opentui/native`. Источники: [Getting started](https://opentui.com/docs/), [README](https://github.com/anomalyco/opentui/blob/4954312d749f71e80664aa8b0e8a75384186eb99/README.md), [OpenTUI Core](https://opentui.com/packages/opentui-core/).

`@opentui/core` — ESM (`"type": "module"`). `engines`: `bun >= 1.3.0`, `node >= 26.4.0`. Поля `main`, `module` и `types` указывают на `src/index.ts`, не на собранный `.d.ts`. Условие `exports` для корня: `types`, `bun`, `node`, `import` — все на тот же `src/index.ts`. Отдельного `browser`-условия нет. Нативные бинарники — optional dependencies, по пакету на darwin/linux/win32, x64/arm64, плюс musl для linux. Источник: [`packages/core/package.json`](https://github.com/anomalyco/opentui/blob/4954312d749f71e80664aa8b0e8a75384186eb99/packages/core/package.json).

Импорт модулей сам по себе native не вызывает. `createCliRenderer()` уже грузит нативную библиотеку. На Node это ESM и флаг `--experimental-ffi`. `require("@opentui/core")` падает с `ERR_REQUIRE_ASYNC_MODULE`. На нативном Windows arm64 нужен Bun 1.4.0+: у Bun 1.3 там нет FFI. Источник: [Runtime and platform support](https://opentui.com/docs/getting-started/runtime-support/).

## Как рисует

`CliRenderer` владеет одной терминальной сессией, корневым renderable, расписанием кадров, разбором ввода и границей нативного вывода. `createCliRenderer()` асинхронно поднимает терминал и возвращает рендерер с `root`. Рендерер реализует `RenderContext`: императивный узел получает его первым аргументом конструктора. Источник: [Renderer](https://opentui.com/docs/core-concepts/renderer/).

Дерево retained. Тот же объект живёт между кадрами. Обновление — это смена свойств, а не сборка нового дерева на каждый кадр. Сеттеры вроде `content`, `width`, `visible`, `zIndex` сами зовут `requestRender()`, когда визуальное состояние изменилось. Источник: [Renderables](https://opentui.com/docs/core-concepts/renderables/).

Один кадр, как его описывает поддерживаемая страница внутренностей:

1. Мутация помечает retained-состояние грязным. Повторные `requestRender()` в demand-driven режиме сливаются в один более поздний кадр. Непрерывный режим гоняет тот же пайплайн с заданной частотой.
2. Если Yoga-дерево грязное, Yoga считает раскладку в колонках и рядах текущего рендерера. Масштаб — `1`, то есть целые клетки. Текст и редакторы меряются нативными measure-таргетами.
3. До рисования корень прогоняет зарегистрированные lifecycle pass, затем собирает список команд. Команды сохраняют обход, `zIndex` соседей, стек клиппинга и унаследованную непрозрачность. Буферизованный узел сначала рисует в свой `OptimizedBuffer`, потом OpenTUI композитит его в `nextRenderBuffer`.
4. Нативный код сравнивает текущие и следующие ряды, пропускает равные и для изменившихся клеток пишет курсор, цвет, атрибуты и текст. Неизменный кадр может не выдать ни одного байта в терминал.

Прикладному коду публичный diff не отдают. Он мутирует узлы, а layout, композиция, diff и вывод принадлежат OpenTUI. Resize не пересобирает дерево: те же экземпляры остаются, буферы и Yoga пересчитываются. Источники: [Rendering pipeline](https://opentui.com/docs/core-concepts/rendering-pipeline/), [Layout](https://opentui.com/docs/core-concepts/layout/).

Расписание по умолчанию demand-driven: кадр запрашивает мутация. `start()` включает непрерывный режим. `targetFps` задаёт устойчивый темп, `maxFps` режет лишние немедленные кадры. `pause()` входит в `EXPLICIT_PAUSED`; мутации всё ещё могут просить одиночные кадры, а `requestLive()` из `EXPLICIT_PAUSED` и `EXPLICIT_STOPPED` не выводит. `start()` после `pause()` продолжает непрерывный режим. `requestLive()` / `dropLive()` — парный счётчик для чужих циклов: первый запрос поднимает idle-рендерер, последний drop возвращает автозапущенный рендерер в demand-driven. Источник: [Renderer](https://opentui.com/docs/core-concepts/renderer/).

В конструкторе дефолты такие: `_targetFps = 30`, `_maxFps = 60`, и `config.targetFps || 30` / `config.maxFps || 60`. Источник: [`renderer.ts`](https://github.com/anomalyco/opentui/blob/4954312d749f71e80664aa8b0e8a75384186eb99/packages/core/src/renderer.ts#L797) (строки 797–798 и 1195–1196).

Экран по умолчанию — `"alternate-screen"`: alternate screen терминала, при выходе основная возвращается. `"main-screen"` занимает зарезервированный кусок основного экрана и не является inline-рендерером. `"split-footer"` — футер на основном экране. Источник: [Renderer](https://opentui.com/docs/core-concepts/renderer/).

Для покадровой графики есть `FrameBufferRenderable`: двумерный буфер клеток. `setCell()` берёт только первый code point и не резервирует клетки продолжения. `drawText()` нужен для широких графем. В доке есть пример game canvas: координаты игрока лежат в обычных переменных рядом с рендерером, функция `render()` заново заливает буфер, обработчик `keypress` двигает переменные, вызывает `render()` и затем `gameCanvas.requestRender()`. Сама запись в буфер кадр не заказывает. React- и Solid-обёртки у `FrameBuffer` отсутствуют. Источник: [FrameBuffer](https://opentui.com/docs/components/frame-buffer/).

Клетка, не пиксель. Горизонтальный размер — колонки, вертикальный — ряды. Это не число символов. Источник: [Layout](https://opentui.com/docs/core-concepts/layout/).

## Как слушает ввод

`renderer.keyInput` эмитит уже разобранные `keypress`, `keyrelease` и `paste`. Прямые слушатели идут до сфокусированного renderable и годятся для глобального выхода, короткого набора шорткатов и диагностики. Снимать их надо в паре с подпиской, обычно на `renderer.once("destroy", ...)`. Источник: [Keyboard input](https://opentui.com/docs/core-concepts/keyboard/).

У `KeyEvent` строковое `name` (`"a"`, `"space"`, `"return"`, `"escape"`, стрелки в примере quickstart — `"left"` / `"right"`), `sequence`, сырой `raw`, `source` (`"raw"` или `"kitty"`), модификаторы `ctrl` / `shift` / `meta` / `option` и опциональные `super` / `hyper`. `eventType` — `"press"`, `"repeat"` или `"release"`. Повтор Kitty приходит как `"press"` с `repeated: true`. `sequence` не всегда равно `raw`. Alias-карты компонентов не переписывают `name` у прямого события. Сравнивать надо канонические имена, не DOM-коды. Источники: [Keyboard input](https://opentui.com/docs/core-concepts/keyboard/), [Quickstart](https://opentui.com/docs/getting-started/quickstart/).

Глобальные слушатели идут в порядке регистрации раньше обработчика фокуса. `stopPropagation()` глушит и следующих глобальных слушателей, и доставку в фокус, но не ставит `defaultPrevented`. `preventDefault()` следующих глобальных не глушит, а фокусному renderable событие уже не отдают. У фокусного узла `onKeyDown` идёт раньше встроенного `handleKeyPress()`; `preventDefault()` там пропускает встроенное действие. Автоматического обхода по Tab нет. Источники: [Keyboard input](https://opentui.com/docs/core-concepts/keyboard/), [Interaction, focus, and selection](https://opentui.com/docs/core-concepts/interaction/).

Мышь включена по умолчанию (`useMouse ?? true` в конструкторе). Выключают её `useMouse: false`. Движение без кнопки убирают через `enableMouseMovement: false`. События мыши идут в обработчики узла (`onMouseDown`, `onMouseUp`, `onMouseMove`, `onMouseDrag` и общий `onMouse`). Координаты — клетки; локальные считаются как `event.x - event.currentTarget.x`. Отдельного хелпера перевода координат нет. Источники: [Interaction, focus, and selection](https://opentui.com/docs/core-concepts/interaction/), [`renderer.ts` строка 1221](https://github.com/anomalyco/opentui/blob/4954312d749f71e80664aa8b0e8a75384186eb99/packages/core/src/renderer.ts#L1221).

`addInputHandler` / `prependInputHandler` видят сырую последовательность до доставки `KeyEvent`. `true` съедает последовательность, `false` пропускает дальше. Сырые кодировки плавают; дока советует `KeyEvent`, если не нужен неподдержанный протокол. Kitty keyboard protocol улучшает модификаторы и release, когда терминал его умеет. Paste — это ввод терминала, не чтение буфера обмена хоста. `PasteEvent.bytes` хранит payload. Источник: [Keyboard input](https://opentui.com/docs/core-concepts/keyboard/).

Рендерер берёт эксклюзивную аренду объектов stdin/stdout и не владеет самим транспортом. `destroy()` снимает слушатели, останавливает кадры, выключает raw input, эмитит `destroy`, сносит дерево и нативный рендерер, отпускает аренду потоков. Создатель рендерера обязан вызвать `destroy()` на каждом пути остановки. По умолчанию на `SIGINT`, `SIGTERM`, `SIGQUIT`, `SIGABRT`, `SIGHUP`, `SIGBREAK`, `SIGPIPE`, `SIGBUS` стоят обработчики, которые зовут `destroy()`. Их можно заменить через `exitSignals` или отключить пустым списком. `exitOnCtrlC: true` уничтожает рендерер по Ctrl+C. Источники: [Lifecycle and cleanup](https://opentui.com/docs/core-concepts/lifecycle/), [OpenTUI Core](https://opentui.com/packages/opentui-core/).

`SIGWINCH` слушается только когда stdout — это `process.stdout`. Для своего потока размер задают `renderer.resize(width, height)`. Источник: [Renderer](https://opentui.com/docs/core-concepts/renderer/).

## Свой реактивный цикл

У ядра нет реактивного стора, сигналов и графа зависимостей. Есть планировщик кадров и императивное дерево.

Непрерывные кадры включаются явно: `start()`, счётчик `requestLive()` / `dropLive()`, либо видимый узел с `live: true`. Сеттер `live` на видимом узле толкает счётчик к родителю. `RootRenderable` на переходе `0 → >0` зовёт `requestLive()`, на обратном — `dropLive()`. Источник: [`Renderable.ts`](https://github.com/anomalyco/opentui/blob/4954312d749f71e80664aa8b0e8a75384186eb99/packages/core/src/Renderable.ts#L482) (сеттер на 482, корневой `propagateLiveCount` на 1852).

`setFrameCallback` только пушит функцию в массив. Сам цикл он не запускает. Внутри `loop()`, уже когда кадр идёт, порядок такой: колбэки `requestAnimationFrame`, затем `await` каждого frame callback с `deltaTime` в миллисекундах, и только потом `this.root.render(nextRenderBuffer, deltaTime)` и post-process. Ошибка колбэка ловится и пишется в `console.error`, наружу из кадра не летит. Событие `frame` с `{ frameId }` эмитится после того, как нативный рендерер опубликовал кадр. Источники: [`renderer.ts` `setFrameCallback`](https://github.com/anomalyco/opentui/blob/4954312d749f71e80664aa8b0e8a75384186eb99/packages/core/src/renderer.ts#L4182), [`loop`](https://github.com/anomalyco/opentui/blob/4954312d749f71e80664aa8b0e8a75384186eb99/packages/core/src/renderer.ts#L4658), [Renderer, таблица событий](https://opentui.com/docs/core-concepts/renderer/).

`global.requestAnimationFrame`, который рендерер подменяет при создании, тоже зовёт `requestLive()`, а `cancelAnimationFrame` — `dropLive()`. Это хук чужого покадрового кода, не стор. Источник: [`renderer.ts` строки 1294–1301](https://github.com/anomalyco/opentui/blob/4954312d749f71e80664aa8b0e8a75384186eb99/packages/core/src/renderer.ts#L1294).

`Timeline` анимирует мутабельные числовые свойства и может анимировать прикладное состояние, но API пишет в цель напрямую. Солвера физики, пружин, цветов, строк и вложенных путей нет. Глобальный `engine` вешает свой frame callback и сам балансирует `requestLive()` / `dropLive()`. Для зарегистрированного timeline свой `requestLive()` звать не надо. `engine.defaults.frameRate` движок не читает: частоту задаёт рендерер. Источник: [Animation and Timeline](https://opentui.com/docs/application-apis/animation/).

`@opentui/react` и `@opentui/solid` добавляют свою реактивность поверх того же `CliRenderer`. React реконсилиит JSX в дерево рендерера. Solid даёт компоненты, сигналы и эффекты. Это не цикл ядра. `@opentui/react` требует React `>=19.2.0`. `@opentui/solid` требует `solid-js` ровно `1.9.12`. Источники: [Getting started](https://opentui.com/docs/), [React bindings](https://opentui.com/docs/bindings/react/), [Solid bindings](https://opentui.com/docs/bindings/solid/).

## Можно ли подавать состояние снаружи на каждый кадр

Да. Игровая логика не обязана жить внутри renderable и не обязана становиться реактивным графом OpenTUI.

Три рабочих пути, все из первичных источников:

- Мутировать уже висящие узлы снаружи. Сеттер сам просит кадр, повторные просьбы сливаются. Дерево между кадрами не пересоздают. Источники: [Renderables](https://opentui.com/docs/core-concepts/renderables/), [Rendering pipeline](https://opentui.com/docs/core-concepts/rendering-pipeline/).
- Держать снимок в обычных переменных и рисовать его в `FrameBuffer`. Так устроен официальный game canvas: ввод только меняет переменные, отрисовка отдельной функцией, `requestRender()` после записи в буфер. Источник: [FrameBuffer](https://opentui.com/docs/components/frame-buffer/).
- Положить на `setFrameCallback` копирование уже посчитанного снимка в узлы или буфер. Колбэк бежит до `root.render` того же кадра, так что копия попадает в текущий кадр. Событие `frame` для этого поздно: кадр уже опубликован. Колбэк сам по себе цикл не включает. Нужен `start()`, живой `requestLive()` или видимый `live`-узел. Колбэк `await`-ят внутри `loop()`, поэтому тяжёлая работа там держит следующий кадр, а исключение из него только логируется. Источники: [`renderer.ts` `loop`](https://github.com/anomalyco/opentui/blob/4954312d749f71e80664aa8b0e8a75384186eb99/packages/core/src/renderer.ts#L4658), [Renderer](https://opentui.com/docs/core-concepts/renderer/).

Пока рендерер demand-driven и никто не мутирует дерево, кадров нет. Непрерывный мяч на экране получается либо внешним тиком, который сам меняет узлы или буфер, либо выборкой последнего снимка из frame callback при уже включённом живом цикле. Оба варианта оставляют правила игры вне renderable. `Timeline` этот тик не заменяет: это интерполяция чисел, не физика. Источник: [Animation and Timeline](https://opentui.com/docs/application-apis/animation/).

Ввод при этом не опрашивается кадром. Клавиши и мышь приходят асинхронно в слушатели. Quickstart кладёт счётчик в замыкание и пишет `counter.content` из `keypress`. Кадр планирует сеттер, не игровой цикл. Источник: [Quickstart](https://opentui.com/docs/getting-started/quickstart/).

## Как это стоит рядом с Vite и TypeScript

Рядом, не внутри браузерного бандла.

В репозитории OpenTUI Vite есть только у сайта документации: `packages/web/astro.config.mjs` и запись `vite` в `bun.lock` как зависимость Astro. Поиска по репозиторию на 2026-09-22 другого прикладного Vite-пути не показывает. Доки запускают приложение как `bun index.ts`, собирают `bun build --compile` или Node SEA. Vite как бандлер TUI-приложения не описан. Источники: [README](https://github.com/anomalyco/opentui/blob/4954312d749f71e80664aa8b0e8a75384186eb99/README.md), [Quickstart](https://opentui.com/docs/getting-started/quickstart/), [Standalone executables](https://opentui.com/docs/reference/standalone-executables/), [`packages/web/astro.config.mjs`](https://github.com/anomalyco/opentui/blob/4954312d749f71e80664aa8b0e8a75384186eb99/packages/web/astro.config.mjs).

TypeScript-пакет публикует сами `.ts`-исходники как точку входа. Quickstart не зовёт `tsc`: Bun исполняет `index.ts` напрямую. Типчек в самом пакете — `tsc --noEmit -p tsconfig.build.json`, devDependency `typescript` линейки `^5`. Источники: [`packages/core/package.json`](https://github.com/anomalyco/opentui/blob/4954312d749f71e80664aa8b0e8a75384186eb99/packages/core/package.json), [Quickstart](https://opentui.com/docs/getting-started/quickstart/).

Браузерного таргета нет. Таблица рантаймов — только Bun и Node. У аудио прямо сказано: browser target отсутствует. Нативный FFI из Vite-графа для браузера не исполнить. Общий TypeScript можно делить между web-entry и TUI-entry только пока web-entry не импортирует `@opentui/core`. Источники: [Runtime and platform support](https://opentui.com/docs/getting-started/runtime-support/), [Audio](https://opentui.com/docs/core-concepts/audio/).

Пол Node расходится. OpenTUI на Node требует `>=26.4.0` плюс `--experimental-ffi` и ESM. У Vite 8.2.0 в `engines` стоит `node: ^20.19.0 || >=22.12.0` (читалось 2026-09-22). Node 26 Vite принимает, Node 20 и 22 для Node-пути OpenTUI не хватает. Bun `>=1.3.0` (на Windows arm64 `>=1.4.0`) OpenTUI устраивает без этого флага. Источники: [Runtime and platform support](https://opentui.com/docs/getting-started/runtime-support/), [`packages/vite/package.json`](https://github.com/vitejs/vite/blob/main/packages/vite/package.json).

`@opentui/react` просит свой `jsxImportSource: "@opentui/react"` и `"lib": [..., "DOM"]`. Это отдельный tsconfig, не конфиг Vite-приложения на другом JSX. `@opentui/solid` на Node хочет Babel-пресет с `moduleName: "@opentui/solid"` и `generate: "universal"`, а на Bun — `preload = ["@opentui/solid/preload"]` в `bunfig.toml`. Оба тащат чужую реактивность. Для снимка снаружи они не нужны. Источники: [React bindings](https://opentui.com/docs/bindings/react/), [Solid bindings](https://opentui.com/docs/bindings/solid/).

`web-tree-sitter` — peer ровно `0.25.10`. Он нужен подсветке кода, не клеточному кадру. Источник: [Runtime and platform support](https://opentui.com/docs/getting-started/runtime-support/).

Тестовый рендерер — тоже не браузер Vite. `@opentui/core/testing` `createTestRenderer()` строит настоящий `CliRenderer` с нативным выводом в память и по умолчанию не пишет кадры в терминал хоста. Дока первым пунктом советует тестировать парсеры и переходы состояния без рендерера. `@opentui/keymap/testing` рендерер не требует. Источник: [Testing](https://opentui.com/docs/core-concepts/testing/).

## Ограничения, которые контракт ViewModel обязан уважать

Это не контракт. Это то, обо что он сломается, если притворится, что TUI — ещё один DOM.

- Общие данные — обычные значения, которые TUI-view может применить мутацией retained-узлов или перерисовкой `FrameBuffer`. Контракт не может быть DOM-событием, React-элементом, Solid-сигналом или экземпляром renderable: ядро их не потребляет, а браузерный Vite не исполнит `@opentui/core`.
- Контракт не должен требовать, чтобы OpenTUI тикал домен. По умолчанию рендерер demand-driven и кадра без мутации или явного `start()` / `requestLive()` нет. `setFrameCallback` годится как дешёвая копия уже готового снимка до `root.render`, но его `await`-ят на цикле кадров, а брошенная ошибка только логируется. Событие `frame` приходит после публикации кадра и для подачи в этот же кадр опоздало.
- `Timeline` не физика. Солвера нет, только запись чисел в верхние свойства. Игровой тик туда не класть и от контракта этого не ждать.
- Ввод TUI — `KeyEvent` со строковым `name`, модификаторами и `eventType` `"press" | "repeat" | "release"`, плюс мышь в клетках. Это не `KeyboardEvent` браузера. Перевод делает view. Глобальный слушатель идёт раньше фокуса; сфокусированный виджет съест клавишу, если view не вызовет `preventDefault()` или `stopPropagation()`. Мышь включена, пока view сам не поставит `useMouse: false`. Контракт не должен предполагать ни обязательный pointer, ни его отсутствие.
- Раскладка — целые клетки. Субклеточные координаты квантует view. Resize меняет сетку и не пересоздаёт узлы. Домен не хранит колонки терминала.
- TUI-процесс — отдельный вход: Bun `>=1.3.0` (Windows arm64 — `>=1.4.0`) или Node `>=26.4.0` в ESM с `--experimental-ffi`. В браузерный граф Vite `@opentui/core` не импортировать. Общий модуль, который тянет этот пакет, отравит web-entry.
- `destroy()` принадлежит тому, кто создал рендерер. Домену рендерер не отдают. Пока `exitSignals` не заменили, сигналы процесса сами вызывают `destroy()`.
- Один `CliRenderer` на одну сессию и эксклюзивная аренда stdin/stdout. Второй терминальный view на тех же потоках — второй рендерер, не второй корень.
- Кадровые тесты TUI идут через `@opentui/core/testing` и нативный рантайм, не через браузерный Vitest. Логику без рендерера дока OpenTUI просит проверять отдельно, и этот путь натив не требует.
