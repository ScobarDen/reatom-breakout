# Что построить поверх Breakout, чтобы показать Reatom и MVVM

**Статус**: написано до удаления терминального хоста ([ADR-0004](../adr/0004-view-builds-instead-of-terminal-host.md)). Всё про терминал и OpenTUI здесь — история, код лежит под тегом `terminal-host`.

Срез на **2026-09-28**. Вопрос: сама игра почти не нуждается в реактивности, так что нужен слой поверх неё, где Reatom и MVVM видны: формы, живые списки, асинхронщина. По возможности одна ViewModel должна работать и под web-View, и под терминальной View. Отдельно разбираю, можно ли взять бесплатную инфраструктуру GitHub под пользователей и профиль, если сайт — статика на GitHub Pages.

Базовые механизмы Reatom v1001 (atom, computed, async, abort, persist, URL, DI, devtools) уже разобраны в [reatom-v1001-mechanisms.md](reatom-v1001-mechanisms.md), а рендер и ввод OpenTUI — в [opentui-render-input.md](https://github.com/ScobarDen/reatom-breakout/blob/terminal-host/docs/research/opentui-render-input.md). Здесь их не повторяю, ссылаюсь на них и добираю только то, что нужно для форм, списков и бэкенда.

## Откуда факты

- Reatom: [v1001.reatom.dev/llms-full.txt](https://v1001.reatom.dev/llms-full.txt) (полный дамп доков, скачан 2026-09-28), страницы handbook на [v1001.reatom.dev](https://v1001.reatom.dev) и установленные типы `node_modules/@reatom/core/dist/index.d.ts` и `node_modules/@reatom/jsx/dist/index.d.ts` версии `1001.3.0` (как в `package.json`). Когда говорю «есть в типах», имею в виду список экспортов этого `index.d.ts`. Потом все утверждения о Reatom перепроверены через Context7 MCP (библиотека `/reatom/reatom`, ветка `v1001`: исходники доков `docs/src/content/docs/**` и `packages/jsx/README.md`) — расхождений с `llms-full.txt` нет.
- Context7 для OpenTUI: библиотека `/anomalyco/opentui` (исходники доков `packages/web/src/content/docs/**` на `main`) — подтвердила `InputRenderable`, `SelectRenderable`, `TabSelectRenderable`, `TextTableRenderable` и отсутствие автоматического обхода по Tab.
- GitHub: [docs.github.com](https://docs.github.com), тексты статей взяты через `https://docs.github.com/api/article/body?pathname=...`.
- OpenTUI: [opentui.com/docs](https://opentui.com/docs) и установленные типы `node_modules/@opentui/core/renderables/*.d.ts` версии `0.5.11`. `llms.txt` у opentui.com отдаёт 404.
- Cloudflare: [developers.cloudflare.com](https://developers.cloudflare.com/workers/platform/limits/). Bun: [bun.com/docs](https://bun.com/docs/runtime/file-io.md).

Там, где вывод — мой собственный эксперимент, а не цитата из доков, так и написано.

---

## 1. Что в Reatom v1001 хорошо смотрится в UI

### Сводка

| Нужно                                  | Есть | Имя в v1001                                                                                            | Источник                                                                                                                                                                                    |
| -------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| поле формы с валидацией, dirty/touched | да   | `reatomField`, `.focus()` → `{ active, dirty, touched }`, `.validation()`                              | [Field atom](https://v1001.reatom.dev/handbook/forms/concepts/field-atom/)                                                                                                                  |
| группа полей, агрегаты                 | да   | `reatomFieldSet`                                                                                       | [Fieldset](https://v1001.reatom.dev/handbook/forms/concepts/fieldset/)                                                                                                                      |
| форма с submit и схемой                | да   | `reatomForm`, `submit` (это `withAsyncData`), `schema` (Standard Schema)                               | [Form](https://v1001.reatom.dev/handbook/forms/concepts/form/)                                                                                                                              |
| async-валидация с debounce и отменой   | да   | `validate: async` + `await wrap(sleep(ms))`                                                            | [Async validation debounce](https://v1001.reatom.dev/handbook/forms/recipes/async-validation-debounce/)                                                                                     |
| зависимая валидация                    | да   | `validate` трекает прочитанные атомы                                                                   | [Reactive validation](https://v1001.reatom.dev/handbook/forms/concepts/reactive-validation/), [Dependent validation](https://v1001.reatom.dev/handbook/forms/recipes/dependent-validation/) |
| массивы полей                          | да   | `reatomFieldArray` поверх `reatomLinkedList`                                                           | [Field array](https://v1001.reatom.dev/handbook/forms/concepts/field-array/)                                                                                                                |
| связка формы с DOM                     | да   | `<form model={form}>`, `model:field={field}` в `@reatom/jsx`                                           | [JSX / Forms](https://v1001.reatom.dev/reference/jsx/#forms)                                                                                                                                |
| длинные изменяемые списки              | да   | `reatomLinkedList`, `.reatomMap()`, `key: 'id'`                                                        | [JSX / Linked lists](https://v1001.reatom.dev/reference/jsx/#linked-lists)                                                                                                                  |
| запросы, статусы, гонки                | да   | `withAsync`, `withAsyncData`, `withAbort`, `race`, `take`                                              | [Async](https://v1001.reatom.dev/handbook/async/), [Sampling](https://v1001.reatom.dev/handbook/sampling/)                                                                                  |
| роутинг                                | да   | `reatomRoute`, `urlAtom`, search-only routes, `isSomeLoaderPending`, `is404`                           | [Routing](https://v1001.reatom.dev/handbook/routing/)                                                                                                                                       |
| persistence                            | да   | `withLocalStorage`, `withIndexedDb`, `reatomPersist(storage)`, `createMemStorage`                      | [State Persistence](https://v1001.reatom.dev/handbook/persist/)                                                                                                                             |
| оптимистичные записи с откатом         | да   | `withRollback` на атоме + `withTransaction` на action                                                  | [llms-full.txt, «Transactions notes»](https://v1001.reatom.dev/llms-full.txt)                                                                                                               |
| undo / redo                            | нет  | готового API нет, в handbook есть рецепт своего `withHistory`                                          | ни `undo`, ни `redo`, ни `history` нет среди экспортов `@reatom/core` 1001.3.0                                                                                                              |
| логирование                            | да   | `connectLogger`, `log`                                                                                 | [Tooling](https://v1001.reatom.dev/start/tooling/)                                                                                                                                          |
| примитивы-коллекции                    | да   | `reatomArray`, `reatomMap`, `reatomSet`, `reatomRecord`, `reatomEnum`, `reatomBoolean`, `reatomNumber` | [llms-full.txt, «Other APIs»](https://v1001.reatom.dev/llms-full.txt)                                                                                                                       |

### Формы

Поле — это самостоятельный атом, а не строка-путь внутри формы. Авторы прямо противопоставляют это библиотекам, где поля живут только внутри формы и доступны через dot notation ([Field atom](https://v1001.reatom.dev/handbook/forms/concepts/field-atom/)). Для MVVM это ровно то, что нужно: поле со всеми его состояниями лежит в VM, а View его только читает и зовёт методы.

Что есть у `reatomField` (та же страница):

- `field()` — `state`, то есть бизнес-значение; `field.value()` — значение для UI. Преобразования задают `fromState` / `toState`, а `toState` может бросить `throwAbort()`, и тогда `state` не меняется, пока ввод не станет валидным. `fromState` реактивен: поменяли атом-маску, и `value` пересчитался сам.
- `field.initState` — от него считается `dirty`. `field.reset(next)` ставит новый исходный state; пример в доке: после успешного сохранения `usernameField.reset(username)`.
- `field.focus()` — `{ active, dirty, touched }`, экшены `focus.in` / `focus.out`. Дока предупреждает: если не звать их на focus и blur, `focus` уедет в неконсистентное состояние и потеряется валидация на blur.
- `field.validation()` — `{ error, triggered, validating }`, где `validating` — промис при async-валидации. Есть `validation.trigger`, `validation.errors` (это `reatomArray`) и `clearErrors`.
- Опции `validateOnChange`, `validateOnBlur`, `keepErrorOnChange` видны в типах `@reatom/core` 1001.3.0 (`index.d.ts`, строки около 4700).

Async-валидация идёт в абортируемом контексте. Рецепт debounce целиком: `await wrap(sleep(300))`, затем `fetch`. Каждый новый вызов отменяет предыдущий ([Async validation debounce](https://v1001.reatom.dev/handbook/forms/recipes/async-validation-debounce/)). Отдельной функции `debounce` нет, её роль играет конкурентная модель ([Sampling](https://v1001.reatom.dev/handbook/sampling/)). `sleep` брать из `@reatom/core` (он есть среди экспортов 1001.3.0): пример debounce в handbook «Async» до сих пор импортирует его из `@reatom/utils`, это пакет v3 ([Async / Debouncing](https://v1001.reatom.dev/handbook/async/#debouncing), видно и в Context7).

Зависимая валидация: `validate` трекает атомы, которые прочитал после первого срабатывания. Пример в summary — `confirmPassword`, который читает `registerForm.fields.password()` и перевалидируется сам ([llms-full.txt, «Forms: base usage and reactive validation»](https://v1001.reatom.dev/llms-full.txt)).

`reatomFieldSet` сам по себе computed со структурой значений всех полей и агрегатами `focus` и `validation`. Подвох из доки: fieldset `triggered`, только когда `triggered` все поля, поэтому привязывать к нему disabled у кнопки submit опасно — одно нетронутое необязательное поле держит кнопку выключенной ([Fieldset](https://v1001.reatom.dev/handbook/forms/concepts/fieldset/)).

`reatomForm` — обёртка над fieldset: `submit` (async action с `withAsyncData`), валидация схемой, валидация уровня формы, общие опции полей ([Form](https://v1001.reatom.dev/handbook/forms/concepts/form/)). По summary: `submit` ожидает, что ошибки бросают; `submit.error()` хранит последнюю; `form.reset()` отменяет submit и сбрасывает `submitted` ([llms-full.txt](https://v1001.reatom.dev/llms-full.txt)).

`reatomFieldArray` — сахар над `reatomLinkedList`: `create`, `remove`, `clear`, `array`, `swap`, `move`, `find`, вложенные массивы и тип `FieldArrayItem`. Известное ограничение: `dirty` у массива считается только по числу элементов, так что после `swap`/`move` массив может выглядеть нетронутым ([Field array](https://v1001.reatom.dev/handbook/forms/concepts/field-array/)). В типах есть и `experimental_fieldArray`.

Связка с `@reatom/jsx`: `<form model={form}>` делает `preventDefault`, зовёт `form.submit()` и ставит на форму `data-submitting` / `data-submitted` / `data-submit-error`. `model:field={form.fields.name}` проводит ввод через `field.change` и трекинг фокуса. Для простых контролов есть `model:value`, `model:valueAsNumber`, `model:checked` ([JSX / Models, Forms](https://v1001.reatom.dev/reference/jsx/#forms)). В типах `@reatom/jsx` `model:field` принимает минимальную форму `Pick<FieldAtom, 'change' | 'value' | 'focus' | 'disabled' | 'elementRef'>`. Это важно для терминала: ту же пятёрку методов может дёргать и терминальная View.

Рецепты «Persistence» и «Wizard forms» в разделе форм на 2026-09-28 состоят из одного заголовка, текста там нет ([llms-full.txt](https://v1001.reatom.dev/llms-full.txt)). Persistence поля делается общими расширениями: в handbook есть `reatomField('', ...).extend(withLocalStorage())` ([Handbook dump](https://v1001.reatom.dev/_llms-txt/handbook.txt)).

### Мелкие обновления и длинные списки

Как работает трекинг, atomization и то, что `@reatom/jsx` обновляет DOM без ререндера, уже описано в [reatom-v1001-mechanisms.md, «fine-grained подписка»](reatom-v1001-mechanisms.md#fine-grained-подписка). В проекте это уже видно: у каждого кирпича свой `standing` ([docs/architecture.md](../architecture.md)).

Для списков важная деталь из JSX-референса. Реактивный массив-ребёнок `{() => items().map(...)}` при каждом изменении сносит и заново вставляет весь фрагмент: virtual DOM и keyed reconciliation нет. `reatomLinkedList` хранит каждый элемент как стабильный узел и пишет журнал изменений, а `@reatom/jsx` проигрывает на DOM только изменения: `create` добавляет узлы, `move`/`swap` переставляют те же DOM-элементы, правка внутреннего атома обновляет строку на месте. Для поиска по id есть `reatomLinkedList({ create, key: 'id' })` + `list.map()`, по доке это удобно для сотен элементов, а к тысячам нужен другой подход ([JSX / Linked lists](https://v1001.reatom.dev/reference/jsx/#linked-lists)).

Вывод для витрины: лидерборд, история матчей и список уровней — ровно тот случай, где разница между «массив в атоме» и `reatomLinkedList` видна глазами и в DevTools браузера.

### Async, отмена, гонки

Всё уже разобрано в [reatom-v1001-mechanisms.md, «отмена и конкурентность»](reatom-v1001-mechanisms.md#отмена-и-конкурентность). Для витрины важно:

- `withAsyncData` сам включает `withAbort`, а `withAsync` — нет ([Async](https://v1001.reatom.dev/handbook/async/#manual-abort-control));
- debounce поиска — это `await wrap(sleep(ms))` в action с `withAbort`, а не отдельная утилита ([Async / Debouncing](https://v1001.reatom.dev/handbook/async/#debouncing));
- лоадеры `reatomRoute` абортятся при уходе с роута, `isSomeLoaderPending` даёт глобальный индикатор ([Routing](https://v1001.reatom.dev/handbook/routing/)).

В типах 1001.3.0 есть и `withCache`, но в `llms-full.txt` он не описан. Опираться на него как на задокументированный API пока не стоит.

### Роутинг на GitHub Pages

`vite.config.ts` собирает с `base: "./"`. GitHub Pages не умеет SPA-fallback: для неизвестного пути он отдаёт `404.html`, если тот есть ([Creating a custom 404 page](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site)). Значит, глубокие ссылки вида `/reatom-breakout/profile` без трюков сломаются.

Путь без трюков — search-only routes. Такой роут «preserves the current pathname» и читает свой параметр с любого URL ([Routing / Search-Only Routes](https://v1001.reatom.dev/handbook/routing/#search-only-routes)). `/reatom-breakout/?screen=profile` Pages всегда отдаёт как `index.html`. Пример в доке описывает `search` через zod-схему, а zod в проекте нет. Нужна любая Standard Schema-библиотека или `@reatom/zod` (он есть в сайдбаре доков, см. [reatom-v1001-mechanisms.md](reatom-v1001-mechanisms.md)).

Hash-роутинг summary упоминает одной строкой в «Other APIs» без деталей ([llms-full.txt](https://v1001.reatom.dev/llms-full.txt)). README `@reatom/core` на ветке `v1001` говорит так же скупо: «urlAtom hooks, link interception config, hash routing», и Context7 по запросу о hash-роутинге находит только пример синхронизации с React Router через `urlAtom.sync` / `syncFromSource`. В типах `@reatom/core` 1001.3.0 слова `hash` нет вообще. Отдельной опции hash-режима в этой версии, судя по типам, нет. Остаётся подменить `urlAtom.sync`: типы говорят, что это колбэк записи в `history` и его можно заменить на `noop` (`index.d.ts`, `interface UrlAtom`).

Для терминала это значит, что `urlAtom` там не источник правды. Экран лучше держать в host-neutral атоме в общей VM, например `reatomEnum(['match', 'profile', 'stats'])`, а web-хост пусть синхронизирует его с search-only роутом.

### Persistence для двух хостов

Всё про адаптеры есть в [reatom-v1001-mechanisms.md, «persistence»](reatom-v1001-mechanisms.md#persistence). Для двух хостов важен только `reatomPersist(storage)` со своим `PersistStorage`: `name`, `cache`, `get`, `set`, необязательные `clear` и `subscribe`. `get` и `set` могут быть асинхронными (типы `@reatom/core` 1001.3.0, `interface PersistStorage`; пример — [State Persistence / Basic Persist API](https://v1001.reatom.dev/handbook/persist/)).

Значит, одна VM может объявить `atom(...).extend(withPersist('profile'))`, а конкретный `storage` приходит из `app/`: в web — поверх `localStorage` (или просто `reatomPersistWebStorage`), в терминале — JSON-файл через `Bun.file` / `Bun.write` ([Bun File I/O](https://bun.com/docs/runtime/file-io.md)). Для тестов — `createMemStorage`. Как прокинуть реализацию, не импортируя хост в модуль: `variable()` как IoC-токен или просто аргумент фабрики ([Methods / variable](https://v1001.reatom.dev/reference/methods/)).

### Undo / redo

Готового нет. Среди экспортов `@reatom/core` 1001.3.0 нет ничего с `undo`, `redo` или `history`. `withRollback` + `withTransaction` — это не undo: они откатывают изменения, если transaction-action упал, `action.rollback()` откатывает только последний вызов, а abort откат не вызывает ([llms-full.txt, «Transactions notes»](https://v1001.reatom.dev/llms-full.txt)).

Ближе всего к истории — пример из handbook «Extensions»: самописное расширение `withHistory(length)`, которое возвращает `Ext` и вешает на атом `history: Computed<[current, ...past]>` ([Extensions](https://v1001.reatom.dev/handbook/extensions/), через Context7: `reatom/reatom` → `docs/src/content/docs/handbook/extensions.md`). Это рецепт, как писать своё расширение, а не экспорт пакета, и redo в нём нет.

Undo в редакторе придётся писать руками — можно в стиле того же `withHistory`. Самый простой вариант — два стека снимков. Для сетки 10×15 булевых это копейки, а модель `Bricks` уже иммутабельная (`readonly (readonly boolean[])[]` в `model/match.model.ts`), так что снимок — это просто ссылка на старое значение. И это хорошая демонстрация: undo — это обычный `computed` над стеком (`canUndo`, `canRedo`) плюс два action.

---

## 2. Идеи фич поверх игры

Сначала про то, что трогает текущий домен. [CONTEXT.md](../../CONTEXT.md) сейчас говорит:

- **Board** — «Единственное поле матча. Следующего борда нет», стартовая раскладка — сплошной прямоугольник;
- **Score** — очки «вместе с матчем и умирают», _Avoid_: `record, high score`;
- **Controls** — «Одна раскладка клавиш матча на все хосты»;
- **Paddle** и **Ball** — скорость за матч не меняется, и сейчас это константы в `breakout.config.ts`.

Почти каждая идея ниже меняет одно из этих правил. Это нормально, но каждое изменение — новый термин в `CONTEXT.md` (например **Layout**, **Result**, **Rules**) и, скорее всего, ADR. Технически всё сводится к одному: `openingMatch()` и `step()` должны получать правила и раскладку параметром, а не читать константы из конфига. Модель при этом остаётся чистой, как требуют инварианты в `AGENTS.md`.

Второе ограничение: `bricks` в `vm/breakout.vm.ts` — статический список, построенный один раз из `openingMatch()`. Для произвольной раскладки его придётся строить из текущего `Layout`. Проще всего — `computed` над раскладкой, который пересобирает список при новом матче. Если раскладка меняется часто, как в редакторе, — `reatomLinkedList`.

### 2.1. Профиль и настройки (форма правил и управления)

**Что это.** Экран «Профиль»: имя игрока, сложность (`reatomEnum`: easy / normal / hard → скорость платформы и мяча, число жизней), тонкая настройка скорости (`reatomNumber` + `model:valueAsNumber`, при ручной правке сложность становится «custom»), переназначение клавиш.

**Что показывает из Reatom.**

- `reatomForm` + `model:field`, `dirty` у каждого поля и у формы (кнопка «Сбросить» видна, только когда что-то изменено), `touched` для показа ошибок после первого blur ([Field atom](https://v1001.reatom.dev/handbook/forms/concepts/field-atom/), [Errors UX](https://v1001.reatom.dev/handbook/forms/recipes/errors-ux/)).
- Переназначение клавиш: у каждого действия (`left`, `right`, `launch`, `pause`, `resume`, `new`) — `reatomFieldArray` клавиш. Валидация конфликта — зависимая: поле читает все остальные и ругается, если клавиша занята. Это живая демонстрация «validate трекает то, что прочитал» ([Reactive validation](https://v1001.reatom.dev/handbook/forms/concepts/reactive-validation/)).
- Async-валидация имени с debounce, если есть бэкенд (раздел 3): «такой ник уже в лидерборде» ([Async validation debounce](https://v1001.reatom.dev/handbook/forms/recipes/async-validation-debounce/)).
- Persistence профиля через `reatomPersist` с хостовым storage; `form.reset(saved)` после сохранения, чтобы `dirty` снова стал `false`.
- Мгновенное превью: `computed` над state формы показывает, например, «мяч долетит до верха за 0,9 с», пересчитываясь только при смене скоростей.

**Общая VM с терминалом.** Да, и это лучший кандидат. Форма и поля — это VM, View только связывает виджеты. В OpenTUI есть `InputRenderable` с событиями `input` / `change` / `enter`, `placeholder`, `minLength`/`maxLength` и стилями фокуса ([Input](https://opentui.com/docs/components/input/)), а также `Select`, `TabSelect`, `Textarea`, `Slider`, `TextTable` ([Components](https://opentui.com/docs/components/select/); список файлов в `node_modules/@opentui/core/renderables/`). Связка — то же, что делает `model:field` в JSX: `InputRenderableEvents.INPUT` → `field.change(value)`, `focus()` / blur → `field.focus.in()` / `field.focus.out()`, а в обратную сторону подписка на `field.value` пишет `input.value`. Автоматического обхода по Tab в OpenTUI нет: «OpenTUI Core has no automatic Tab traversal or focus-order property» ([Interaction](https://opentui.com/docs/core-concepts/interaction/), подтверждено через Context7; также [opentui-render-input.md](https://github.com/ScobarDen/reatom-breakout/blob/terminal-host/docs/research/opentui-render-input.md#как-слушает-ввод)). Страница Input сама показывает ручной цикл: `renderer.keyInput.on("keypress")`, на `key.name === "tab"` звать `focus()` следующего ([Input / Tab navigation](https://opentui.com/docs/components/input/)). Так что порядок фокуса — это задача `pages/terminal/vm`. У `SelectRenderable` и `TabSelectRenderable` события `selectionChanged` / `itemSelected` и программные `setSelectedIndex`, `getSelectedOption` ([Select](https://opentui.com/docs/components/select/), [TabSelect](https://opentui.com/docs/components/tab-select/)), так что `reatomEnum` связывается с ними в обе стороны.

Подвох переназначения: web знает `KeyboardEvent.code`, терминал — `KeyEvent.name` ([opentui-render-input.md](https://github.com/ScobarDen/reatom-breakout/blob/terminal-host/docs/research/opentui-render-input.md#как-слушает-ввод)). Раскладка должна храниться либо per host, либо в host-neutral именах клавиш. Перевод остаётся в `pages/*/vm`, как уже сейчас с `hostKeys`.

**Размер.** M: модуль `profile` (model + vm + тесты), параметризация правил в `breakout`, две View.

**FEOD и инварианты.** Новый модуль `modules/profile` с `index.ts`. Правила валидации (конфликт клавиш, границы скоростей) — чистые функции в `*.model.ts` и тестируются без Reatom. Форма — в `*.vm.ts`. `breakout` получает правила только аргументом и `profile` не импортирует; связывает их `app/` или страница (VM как медиатор). Web-View не тянет opentui, терминальная — `@reatom/jsx` (ADR-0001).

### 2.2. История матчей и статистика

**Что это.** После каждого матча — запись `Result` (дата, счёт, выбитые кирпичи, длительность, исход, правила). Экран статистики: лучший счёт, средний, серия побед, график последних N, фильтр по сложности.

**Что показывает.**

- `reatomLinkedList` с `key: 'id'` для истории, элементы добавляются без пересборки списка ([JSX / Linked lists](https://v1001.reatom.dev/reference/jsx/#linked-lists)).
- Цепочка `computed`: `results` → `filteredResults` (фильтр в `withSearchParams` на web) → `best`, `average`, `streak`. Каждый пересчитывается, только если изменилось то, что он прочитал, и только пока на него кто-то подписан ([reatom-v1001-mechanisms.md, «computed»](reatom-v1001-mechanisms.md#computed)). С `connectLogger` видно, что смена фильтра не будит `streak`, если он от фильтра не зависит.
- `take(situation, ...)` или `withChangeHook` на `situation`, чтобы записать результат при переходе в `won` / `lost` ([Sampling](https://v1001.reatom.dev/handbook/sampling/), [Lifecycle](https://v1001.reatom.dev/handbook/lifecycle/)).
- Persistence: `withIndexedDb` на web для длинной истории, файл на терминале.

**Общая VM.** Да. Таблица в терминале — `TextTable` ([TextTable](https://opentui.com/docs/components/text-table/)), в web — список на `reatomLinkedList`.

**Размер.** S–M. Требует термина **Result** в `CONTEXT.md`: сейчас `Score` явно «умирает вместе с матчем», а `high score` в списке _Avoid_.

### 2.3. Редактор уровней

**Что это.** Сетка 10×15 (`columns`, `rows` из конфига): клик ставит или убирает кирпич, кнопки undo/redo, «Играть эту раскладку», список сохранённых раскладок с переименованием и перестановкой.

**Что показывает.**

- Атомизация: у каждой клетки свой атом (как `standing` у кирпича сейчас), клик будит одну клетку, а не сетку ([Atomization](https://v1001.reatom.dev/handbook/atomization/#reducing-computational-complexity)).
- Undo/redo руками: стеки снимков, `canUndo`/`canRedo` как `computed`. Честно показывает, что в Reatom нет готового undo, и что его легко сделать.
- Живое превью через ту же геометрию: `brickBox(column, row)` из `board.model.ts`. Нарисованное в редакторе совпадает с тем, от чего отскочит мяч, — это прямо инвариант проекта.
- Список раскладок — `reatomFieldArray` с `create`/`remove`/`move`/`swap` и именем-полем с валидацией уникальности ([Field array](https://v1001.reatom.dev/handbook/forms/concepts/field-array/)). Помнить про неточный `dirty` после `move`/`swap` (там же).
- Шеринг без бэкенда: 150 клеток — это 150 бит, около 25 символов base64url. Раскладка помещается в `?layout=...` через `withSearchParams` ([reatom-v1001-mechanisms.md, «синхронизация с URL»](reatom-v1001-mechanisms.md#синхронизация-с-url)). Ссылка на уровень работает на Pages без сервера.

**Общая VM.** Да. В терминале мышь включена по умолчанию и даёт координаты в клетках ([Interaction](https://opentui.com/docs/core-concepts/interaction/)), клетка поля — 5×10 единиц ([docs/architecture.md](../architecture.md)), так что клик переводится в `(column, row)` в `pages/terminal/vm`. Курсор стрелками — тоже в `pages/terminal/vm`.

**Размер.** M–L. Требует ослабить правило **Board** в `CONTEXT.md` (раскладка перестаёт быть сплошным прямоугольником) и сделать `bricks` в VM зависимыми от раскладки.

### 2.4. Лидерборд с фильтрами, сортировкой, пагинацией и поиском

**Что это.** Таблица лучших результатов: поиск по нику с debounce, фильтр по сложности и раскладке, сортировка, пагинация, всё в URL.

**Что показывает.** Это витрина async-части:

- `withAsyncData` на загрузке страницы, автоматический abort предыдущего запроса при смене фильтра ([Async](https://v1001.reatom.dev/handbook/async/));
- debounce поиска через `await wrap(sleep(300))` ([Async / Debouncing](https://v1001.reatom.dev/handbook/async/#debouncing));
- состояние фильтров в `withSearchParams`, так что ссылку на выборку можно отправить;
- `reatomRoute` с лоадером, если лидерборд — отдельный экран, и `isSomeLoaderPending` для глобального индикатора ([Routing](https://v1001.reatom.dev/handbook/routing/)).

Если источник — GitHub Search API, у анонимных запросов лимит 10 в минуту ([Search / Rate limit](https://docs.github.com/en/rest/search/search#rate-limit)). Тут debounce и отмена перестают быть учебными: без них лимит съедается за пару секунд набора.

**Общая VM.** Да, `TextTable` + `Input` в терминале. Но без бэкенда лидерборд либо локальный (тогда это просто 2.2 с сортировкой), либо нужен раздел 3.

**Размер.** M, плюс бэкенд.

### 2.5. Реплеи

`step(match, frame)` — чистая функция, а кадры приходят через `advance(elapsedMs)` и очередь событий ([docs/architecture.md](../architecture.md)). Если записать `elapsedMs`, события и направление платформы каждого кадра, матч детерминированно воспроизводится. Физика не зависит от случайности: пуск «всегда отпускает мяч вверх и чуть вбок, одним и тем же направлением» ([CONTEXT.md](../../CONTEXT.md)). Реплей — это ещё и способ проверить счёт для лидерборда: сервер или Action может прогнать `step` сам.

Для Reatom это показательно меньше, чем формы: основное здесь — чистая модель. Размер M. Держу как опору для честного лидерборда, а не как самостоятельную витрину.

### Сравнение

| Идея                     | Формы | Async / abort | Списки  | Persist | Общая VM с терминалом | Трогает домен   | Размер     |
| ------------------------ | ----- | ------------- | ------- | ------- | --------------------- | --------------- | ---------- |
| 2.1 Профиль и настройки  | много | мало*         | немного | да      | да, лучший кандидат   | Rules, Controls | M          |
| 2.2 История и статистика | нет   | нет           | да      | да      | да                    | Result          | S–M        |
| 2.3 Редактор уровней     | да    | нет           | да      | да      | да, с мышью           | Board → Layout  | M–L        |
| 2.4 Лидерборд            | мало  | много         | да      | нет     | да                    | Result, игрок   | M + бэкенд |
| 2.5 Реплеи               | нет   | нет           | нет     | да      | да                    | Replay          | M          |

\* много, если есть бэкенд.

---

## 3. GitHub как бесплатный бэкенд для статического сайта

### Что работает вообще без сервера

**Чтение REST API из браузера.** REST API «supports cross-origin resource sharing (CORS) for AJAX requests from any origin», в preflight разрешён заголовок `Authorization`, наружу отданы `ETag`, `Link` и заголовки лимитов ([Using CORS](https://docs.github.com/en/rest/using-the-rest-api/using-cors-and-jsonp-to-make-cross-origin-requests)). Проверил сам 2026-09-28: `GET https://api.github.com/gists/public` с `Origin: https://scobarden.github.io` вернул `Access-Control-Allow-Origin: *` и `X-RateLimit-Limit: 60`.

**Анонимные лимиты.** 60 запросов в час на IP ([Rate limits for the REST API](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)). Search API: 10 в минуту анонимно, 30 в минуту с токеном ([Search / Rate limit](https://docs.github.com/en/rest/search/search#rate-limit)). GraphQL анонимно не работает: доступ через personal access token, GitHub App или OAuth app ([Forming calls with GraphQL](https://docs.github.com/en/graphql/guides/forming-calls-with-graphql#authenticating-with-graphql)). Значит, Discussions, у которых REST API нет, анонимно читать нельзя.

**Публичные гисты** читаются анонимно, создавать можно только залогиненным ([Gists REST](https://docs.github.com/en/rest/gists/gists)). До 1 МБ на файл через API, до 300 файлов в листинге, дальше `truncated` (там же).

**Статический JSON на самих Pages.** Не API, лимитов API нет. Только общие лимиты Pages: сайт до 1 ГБ, мягкий лимит трафика 100 ГБ в месяц, мягкий лимит 10 сборок в час, который не действует, если публикуешь своим Actions-воркфлоу ([GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)). У проекта деплой уже идёт через `.github/workflows/ci.yml`.

**Запись без токена: issue по ссылке + Actions.** Страница `https://github.com/OWNER/REPO/issues/new?title=...&body=...` открывает форму нового issue с заполненными полями, работает и с issue form templates через `template` ([Creating an issue from a URL query](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue#creating-an-issue-from-a-url-query)). Подвох: `labels` в ссылке работает, только если у человека есть право ставить метки, иначе 404 (там же). Метку должен ставить воркфлоу. Воркфлоу на `issues: [opened]` ([Events that trigger workflows / issues](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#issues)) парсит тело, валидирует, пишет `leaderboard.json` и публикует на Pages. У `GITHUB_TOKEN` 1000 запросов в час на репозиторий ([Rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)).

Итого: без единого сервера и без OAuth можно отправить результат (человек сам нажимает «Submit new issue» на github.com) и показать лидерборд из статического JSON. Минус по UX: человек уходит на github.com. Плюс: GitHub сам удостоверил автора issue.

### Что не работает без сервера: вход через OAuth в браузере

**Web flow.** Обмен кода на токен — `POST https://github.com/login/oauth/access_token` с обязательным `client_secret`, и это касается и OAuth App ([Authorizing OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)), и GitHub App ([Generating a user access token for a GitHub App](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app)). PKCE поддерживается (`code_challenge` с `S256`, `code_verifier` при обмене) и помечен «Strongly recommended», но `client_secret` в таблице параметров обмена остаётся «Required» ([Authorizing OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)). Implicit grant не поддерживается (там же). На той же странице: «CORS pre-flight requests (OPTIONS) are not supported at this time.»

Мой эксперимент 2026-09-28: `POST` на `https://github.com/login/oauth/access_token` и на `https://github.com/login/device/code` с заголовком `Origin` (фейковый `client_id`) вернул ответ без `Access-Control-Allow-Origin`, `OPTIONS` тоже без CORS-заголовков. Браузер такой ответ скрипту не отдаст.

Вывод: секрет в статическом бандле хранить нельзя, а браузер и не прочитает ответ эндпоинта токенов. Для входа через GitHub на web нужен маленький прокси, который держит `client_secret` и отдаёт токен со своими CORS-заголовками.

**Device flow в браузере** не спасает. Секрет ему не нужен («The `client_secret` is not needed for the device flow»), но эндпоинты те же `github.com/login/...` без CORS ([Authorizing OAuth apps / Device flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow); CORS — мой эксперимент выше). Через прокси device flow в браузере возможен, но web flow с PKCE там естественнее.

### Device flow в терминале: работает без сервера

Вот где GitHub идеально ложится на второй хост. Device flow для «headless apps, such as CLI tools» ([Authorizing OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)):

1. `POST https://github.com/login/device/code` с `client_id` и `scope` → `device_code`, `user_code`, `verification_uri`, `expires_in` (по умолчанию 900 с), `interval` (например 5 с).
2. Показать `user_code` и ссылку. Пользователь вводит код на github.com.
3. Опрашивать `POST https://github.com/login/oauth/access_token` с `grant_type=urn:ietf:params:oauth:grant-type:device_code` не чаще `interval`. Ответы: `authorization_pending`, `slow_down` (+5 с к интервалу), `expired_token`, `access_denied`, `device_flow_disabled`.
4. Device flow надо явно включить в настройках приложения.

Всё — там же, [Device flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow). Bun — не браузер, CORS его не касается, секрет не нужен.

Для Reatom это прекрасная демонстрация: опрос — это async action с `withAbort` и `await wrap(sleep(interval))` в цикле; `slow_down` меняет атом интервала; `expires_in` — `race` между опросом и таймером; отмена входа пользователем — abort ([Sampling / race](https://v1001.reatom.dev/handbook/sampling/#the-race-utility-handling-concurrent-operations)). Состояние (`idle` / `waiting-for-code` / `polling` / `signed-in` / `expired` / `denied`) — один `reatomEnum` в VM, а web и терминал рисуют его по-своему. В OpenTUI есть компонент QR-кода ([QR code](https://opentui.com/docs/components/qr-code/)), можно показать `verification_uri` картинкой.

### Где хранить данные

| Хранилище                         | Чтение анонимно               | Запись                                                                               | Для чего                                 | Подвохи                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gist пользователя                 | да, если публичный            | токен пользователя: OAuth scope `gist` или GitHub App user permission «Gists: write» | профиль, настройки, свои раскладки       | scope `gist` даёт запись во все гисты пользователя ([Scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)); secret gist «aren't private», его видит любой с URL ([Creating gists](https://docs.github.com/en/get-started/writing-on-github/editing-and-sharing-content-with-gists/creating-gists)); GitHub App: [permissions / Gists](https://docs.github.com/en/rest/authentication/permissions-required-for-github-apps#user-permissions-for-gists) |
| Файл в репозитории (Contents API) | да, публичный репозиторий     | нужен write в репо                                                                   | общий лидерборд, но пишет только Actions | до 1 МБ полноценно, 1–100 МБ только raw ([Contents](https://docs.github.com/en/rest/repos/contents)); обновление требует `sha` текущей версии, так что параллельные записи конфликтуют                                                                                                                                                                                                                                                                                                         |
| Issues в репозитории проекта      | да (60 в час)                 | любой залогиненный, через URL или токен                                              | отправка результатов                     | OAuth scope `public_repo` — запись во все публичные репо пользователя ([Scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)); GitHub App ограничен пересечением прав юзера и приложения и только там, где установлен ([On behalf of a user](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-with-a-github-app-on-behalf-of-a-user))                                                             |
| Discussions                       | нет, только GraphQL с токеном | токен                                                                                | комментарии, как giscus                  | giscus держит GitHub App, client secret и приватный ключ на своём сервере ([giscus SELF-HOSTING](https://github.com/giscus/giscus/blob/main/SELF-HOSTING.md))                                                                                                                                                                                                                                                                                                                                  |
| Статический JSON на Pages         | да, без лимитов API           | только Actions                                                                       | готовый лидерборд                        | обновляется с задержкой воркфлоу                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

Общие лимиты записи: не больше 80 content-generating запросов в минуту и 500 в час, плюс 5000 запросов в час на пользователя с токеном ([Rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)).

Тип приложения. GitHub App выгоднее OAuth App по правам: user access token может только то, что разрешено и пользователю, и приложению, и только там, где приложение установлено ([On behalf of a user](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-with-a-github-app-on-behalf-of-a-user)). Можно попросить ровно «Gists: write», без `public_repo` на все репозитории. У OAuth App можно включить истекающие токены: 8 часов доступ, 6 месяцев refresh ([Authorizing OAuth apps / Expiring access tokens](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#expiring-access-tokens)).

### Прокси, если нужен вход на web

Задача прокси — один эндпоинт: принять `code` и `code_verifier`, добавить `client_secret`, сходить на `github.com/login/oauth/access_token`, вернуть токен с `Access-Control-Allow-Origin` для домена Pages. Cloudflare Workers на бесплатном плане: 100 000 запросов в день, 10 мс CPU на запрос, 50 подзапросов на запрос ([Workers limits](https://developers.cloudflare.com/workers/platform/limits/)). Для обмена токена этого более чем достаточно: CPU почти не тратится, время ожидания ответа GitHub в CPU не входит.

Дальше браузер ходит в `api.github.com` сам, CORS там есть. Прокси не видит ни данных, ни трафика после входа.

### Честность счёта

В любом варианте, где клиент сам присылает число, счёт подделывается. GitHub удостоверяет только автора, не цифру. Единственная защита, которая следует из архитектуры проекта, — присылать реплей (2.5), чтобы Action прогнал `step` и посчитал счёт сам. Для учебного проекта это можно оставить на потом и честно написать на экране лидерборда.

### Локальная персистентность за общим интерфейсом

Всё это ложится на один шов: `PersistStorage` из Reatom ([типы `@reatom/core` 1001.3.0](https://github.com/reatom/reatom/tree/v1001), [State Persistence](https://v1001.reatom.dev/handbook/persist/)) или свой узкий интерфейс репозитория (`loadProfile`, `saveProfile`, `listResults`, `appendResult`). Реализации:

- web, локально: `localStorage` / `IndexedDB` (`withLocalStorage`, `withIndexedDb`);
- терминал, локально: JSON-файл через `Bun.write` / `Bun.file` ([Bun File I/O](https://bun.com/docs/runtime/file-io.md));
- GitHub: gist пользователя через `fetch` на `api.github.com`;
- тесты: `createMemStorage`.

VM не знает, какая реализация под ней. Выбирает `app/` каждого хоста. Это и есть та самая демонстрация «одна VM — разные View и разные хранилища».

---

## 4. Рекомендация

### Вариант 1 (рекомендую первым). Профиль + история, только локально, обе View

Формы (2.1) и статистика (2.2) в новом модуле `profile`, persistence через хостовый `PersistStorage`, экран переключается host-neutral атомом, на web синхронизируется с search-only роутом.

- **За:** максимум Reatom-фич на единицу кода (`reatomForm`, `reatomFieldArray`, зависимая валидация, dirty/touched, `reatomLinkedList`, цепочки `computed`, persist, `withSearchParams`); без сети, без аккаунтов, без секретов; одна VM реально ведёт и JSX-форму, и `InputRenderable`/`Select`/`TextTable`.
- **Против:** async-часть почти не видна; придётся параметризовать `openingMatch`/`step` правилами и обновить `CONTEXT.md` (**Rules**, **Result**, ослабить **Controls**).

### Вариант 2. Редактор уровней с шарингом через URL

2.3 поверх варианта 1 или вместо него.

- **За:** самый «вау» для зрителя; атомизация и `reatomLinkedList` видны глазами; undo/redo; живое превью на той же геометрии, что у физики; ссылка на уровень работает на Pages без бэкенда.
- **Против:** больше всего меняет домен (**Board** → **Layout**, динамические `bricks`); терминальная View редактора — самая трудоёмкая.

### Вариант 3. GitHub: вход, профиль в gist, лидерборд через issues + Actions

- **За:** настоящий async: device flow, опрос, `slow_down`, `race` с истечением, debounce поиска на жёстком лимите. Device flow в терминале работает без сервера, это эффектный пример общей VM.
- **Против:** web-вход требует прокси (Cloudflare Worker) и регистрацию GitHub App; лидерборд без реплеев подделывается; внешняя зависимость в демо и тестах (нужен мок `fetch`).

Порядок: **1 → 3 (сначала терминальный device flow) → 2**. Вариант 3 без варианта 1 пуст: без профиля и результатов нечего хранить в гисте.

### MVP-срез

Один вертикальный срез, который уже показывает MVVM с двумя View:

1. **Домен.** В `CONTEXT.md` — термины **Rules** (скорость платформы, мяча, жизни) и **Result**. `openingMatch(rules)` и `step` берут правила аргументом; тесты `step.model.test.ts` на новых правилах.
2. **Модуль `profile`.** `profile.model.ts` — чистые ограничения и проверка конфликта клавиш. `profile.vm.ts` — `reatomForm` { `name`, `difficulty` (`reatomEnum`), `paddleSpeed` (число с `toState` + `throwAbort` на мусор), `keys` (fieldset из `reatomFieldArray` на действие, зависимая валидация конфликтов) }, `submit` пишет в persisted-атом и зовёт `form.reset(saved)`. `results` — `reatomLinkedList` с persist, `best` / `average` / `streak` — `computed`.
3. **Шов хранилища.** `PersistStorage` приходит из `app/web` (`localStorage`) и `app/terminal` (JSON-файл в Bun). В тестах — `createMemStorage`.
4. **Две View.** `pages/web`: форма на `model:field`, `<form model={form}>`, CSS на `data-submitting`. `pages/terminal`: `InputRenderable` + `Select`, свой порядок фокуса в `pages/terminal/vm`, таблица результатов в `TextTable`.
5. **Проверка «красоты».** Тест VM: правка одного поля не будит подписчика `streak`; смена клавиши будит валидацию конфликтующего поля и только его. Тот же приём уже есть в `vm/breakout.vm.test.ts` («какие подписчики просыпаются»).

Этого хватает, чтобы на демо показать: одна и та же форма в браузере и в терминале, общий `dirty`, общие ошибки валидации, общая статистика, разные хранилища — и ни строчки логики во View.

---

## Что проверить до реализации

- Hash-роутинг: в типах 1001.3.0 его нет. Если search-only роуты не устроят, проверить в исходниках [`url.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/web/url.ts), чем подменять `urlAtom.sync`.
- `withCache` есть в типах, но не в доках. Для лидерборда пока взять `withAsyncData` без кэша.
- Работает ли `urlAtom` / `reatomRoute` под Bun без `window`. Доки это не описывают, поэтому в терминале роутинг я бы не трогал.
- `reatomFieldArray`: неточный `dirty` после `move`/`swap` — задокументированное ограничение, учесть в UI редактора и раскладки клавиш.
