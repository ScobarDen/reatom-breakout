# Ox и Vitest: что ставить и что они проверяют

Срез на **2026-09-22**. Версии пакетов сняты в этот день с npm registry. Поведение взято из доков владельцев инструментов, не из пересказов.

Схема пакетов этого репозитория здесь не выбирается. Ниже только то, что умеют сами инструменты.

## Коротко

- В актуальном JS-тулчейне «Ox» — это не один CLI. Проект называется **Oxc** (Oxidation Compiler): набор Rust-инструментов. Команды, которые ставят в проект, — отдельные `oxlint` и `oxfmt`.
- npm-пакет [`ox`](https://www.npmjs.com/package/ox) к этому отношения не имеет. На 2026-09-22 `ox@1.8.1` описан как `Ethereum Standard Library`.
- Единый CLI есть, но он называется **Vite+**: глобальная команда `vp` и пакет `vite-plus`. Туда входят Vite, Vitest, Oxlint, Oxfmt и ещё несколько инструментов. Бинаря `ox` у Oxc нет.
- `oxlint` и `oxfmt` задуманы как замена ESLint и Prettier для обычного фронтенда. Это не побайтовый drop-in: часть правил и Prettier-плагины не покрыты, конфиги надо переносить.
- Vite и обычный прогон Vitest **не** проверяют типы, даже если в `tsconfig` включён `strict`. Типы проверяют отдельный type checker: `tsc`, `oxlint --type-check`, `vitest --typecheck` или `vp check`.
- Запретить импорт «из модуля A в модуль B» по разрешённому пути файла Ox не умеет. Соседний инструмент без ESLint, который это умеет, — `dependency-cruiser`.

## Чем является Ox

[Официальное определение](https://oxc.rs/docs/guide/what-is-oxc): Oxc (`/oʊ ɛks siː/`) — коллекция быстрых инструментов для JavaScript и TypeScript на Rust. Это часть стека VoidZero. Oxc стоит внутри [Rolldown](https://rolldown.rs), а Rolldown — бандлер [Vite 8](https://vite.dev/blog/announcing-vite8).

[README репозитория](https://github.com/oxc-project/oxc/blob/main/README.md) делит поверхность на две полки, и ни одна не называется `ox`:

- линт и формат: `oxlint`, `oxfmt`;
- куски компилятора для авторов тулинга: parser, transformer, minifier, resolver.

[Та же страница «What is Oxc»](https://oxc.rs/docs/guide/what-is-oxc) добавляет к списку TypeScript Runner (`oxc-node`), который запускает TypeScript и JSX прямо в Node.js. Там же сказано, что инструменты можно ставить по отдельности или пользоваться ими как одним тулчейном. Отдельного бинаря, который всё это склеивает под именем `ox`, в этом списке нет.

Склейка с другим именем описана у VoidZero. [Анонс Vite+ Beta от 2 июля 2026](https://voidzero.dev/posts/announcing-vite-plus-beta) и [текущий getting started](https://viteplus.dev/guide/) называют Vite+ единой точкой входа: Vite, Vitest, Oxlint, Oxfmt, Rolldown, tsdown и Vite Task в одном пакете `vite-plus`, плюс глобальный `vp`, который ещё и runtime с пакетным менеджером ведёт. [Troubleshooting](https://viteplus.dev/guide/troubleshooting) прямо пишет: Vite+ в beta, «stable, but not yet complete», до 1.0 фичи ещё добавляют.

Страницы [Oxlint](https://oxc.rs/docs/guide/usage/linter) и [Oxfmt](https://oxc.rs/docs/guide/usage/formatter) сами отсылают к Vite+, если нужен «integrated toolchain», и оставляют отдельные пакеты, если нужен только линтер или только форматтер.

## Что ставить

Два задокументированных пути. Версии на 2026-09-22 не совпадают: `vite-plus` пинит свои копии, а не `latest` с npm.

| Пакет | `latest` на npm | Что это |
| --- | --- | --- |
| `oxlint` | 1.85.0 | `Linter for the JavaScript Oxidation Compiler` |
| `oxfmt` | 0.70.0 | `Formatter for the JavaScript Oxidation Compiler` |
| `oxlint-tsgolint` | 7.0.2002 | type-aware линт для `oxlint`, на `typescript-go` |
| `vite` | 8.3.0 | `Native-ESM powered web dev build tool` |
| `vitest` | 5.0.1 | `Next generation testing framework powered by Vite` |
| `vite-plus` | 0.3.3 | `The Unified Toolchain for the Web` |
| `ox` | 1.8.1 | `Ethereum Standard Library`, не Oxc |
| `dependency-cruiser` | 18.4.0 | отдельный валидатор графа зависимостей |

### Отдельные пакеты

Доки ставят их как devDependencies и вешают на скрипты:

- [`pnpm add -D oxlint`](https://oxc.rs/docs/guide/usage/linter), скрипты `oxlint` и `oxlint --fix`;
- [`pnpm add -D oxfmt`](https://oxc.rs/docs/guide/usage/formatter), скрипты `oxfmt` и `oxfmt --check`;
- [`oxlint-tsgolint`](https://oxc.rs/docs/guide/usage/linter/type-aware) — только если нужны type-aware правила или диагностика TypeScript. Без этого пакета флаги `--type-aware` / `--type-check` не на чем работать;
- `vitest` — тест-раннер. У `vitest@5.0.1` peer на `vite` — `^6.4.0 || ^7.0.0 || ^8.0.0` (поле `peerDependencies` пакета на npm).

`oxfmt` можно поставить и standalone-бинарём без Node.js. [Quickstart](https://oxc.rs/docs/guide/usage/formatter/quickstart) говорит, что такой бинарь не тянет Prettier-backed форматы, динамический конфиг `oxfmt.config.ts`, сортировку Tailwind-классов и LSP. Рекомендуемый путь — npm-пакет.

### Vite+

[Getting started](https://viteplus.dev/guide/): глобальный `vp` ставится инсталлятором (`irm https://vite.plus/ps1 | iex` на Windows), проектный пакет — `vite-plus`. День за днём: `vp dev`, `vp check`, `vp test`, `vp build`. Конфиг живёт в `vite.config.ts` через `defineConfig` из `vite-plus`; блоки `fmt`, `lint`, `test`, `check` описаны в [конфиге Vite+](https://viteplus.dev/config/). Отдельные `.oxlintrc.json` и `.oxfmtrc.json` рядом с Vite+ [линтер](https://viteplus.dev/guide/lint) и [форматтер](https://viteplus.dev/guide/fmt) не рекомендуют.

Зависимости опубликованного `vite-plus@0.3.3` (npm `dependencies` на 2026-09-22):

- `oxlint` ровно `1.83.0` (на npm latest уже `1.85.0`);
- `oxfmt` ровно `0.68.0` (latest `0.70.0`);
- `oxlint-tsgolint` ровно `7.0.2001` (latest `7.0.2002`);
- `vitest` ровно `4.1.11`, не `5.0.1`;
- имя `vite` внутри этого пакета указывает на `npm:@voidzero-dev/vite-plus-core@0.3.3`, а не на upstream-пакет `vite`.

[Миграция](https://viteplus.dev/guide/migrate) требует сначала поднять проект на Vite 8+ и Vitest 4.1+, и пишет, что `vite-plus` реэкспортит upstream `vitest@4.x` из `vite-plus/test`. [Troubleshooting](https://viteplus.dev/guide/troubleshooting) ожидает Vite 8+ и Vitest 4.1+. То есть путь «поставить Vite+» и путь «поставить latest `vitest` / `oxlint` / `oxfmt` по отдельности» на эту дату — разные версии.

## Что каждый проверяет

| Инструмент | Проверяет | Не проверяет |
| --- | --- | --- |
| `oxlint` без флагов | линт: по умолчанию correctness-проверки, не все 800+ правил | формат, тесты, типы |
| `oxlint --type-aware` | плюс type-aware правила `typescript/*` через `tsgolint` | сам по себе полный `tsc`, пока не включён `--type-check` |
| `oxlint --type-aware --type-check` | линт и диагностики TypeScript; дока прямо говорит, что этим можно заменить `tsc --noEmit` | формат и тесты |
| `oxfmt` | формат; `--check` только смотрит, не пишет | линт, типы, тесты |
| Vite | трансформирует и собирает модули | типы и линт; дока прямо выносит их из transform pipeline |
| `vitest` | выполняет тесты | типы, пока не включён typecheck; линт и формат |
| `vitest --typecheck` | гоняет `tsc` (по умолчанию) и type-тесты в `*.test-d.ts`; ошибки в исходниках тоже валят прогон, если их не заглушить | линт и формат |
| `vp check` | формат (Oxfmt) + линт (Oxlint) + типы (`tsgo`) одним проходом | тесты |
| `vp test` | тесты через Vitest | не замена `vp check` |
| `vp lint` / `vp fmt` | линт и формат по отдельности | друг друга и, без опций, типы |

Источники по строкам: [Oxlint](https://oxc.rs/docs/guide/usage/linter), [type-aware](https://oxc.rs/docs/guide/usage/linter/type-aware), [Oxfmt](https://oxc.rs/docs/guide/usage/formatter), [CLI форматтера](https://oxc.rs/docs/guide/usage/formatter/cli) (`--write` по умолчанию, `--check` отдельно), [Features Vite](https://vite.dev/guide/features), [Why Vitest](https://vitest.dev/guide/why), [Writing tests](https://vitest.dev/guide/learn/writing-tests), [typecheck Vitest 5](https://vitest.dev/config/typecheck), [typecheck Vitest 4](https://v4.vitest.dev/config/typecheck), [Vite+ check](https://viteplus.dev/), [lint](https://viteplus.dev/guide/lint), [fmt](https://viteplus.dev/guide/fmt), [getting started](https://viteplus.dev/guide/).

Голый `oxlint` не включает «все правила ESLint». Дока говорит, что по умолчанию он даёт correctness-сигнал с низким шумом, а остальное включается по мере надобности. Каталог — больше 800 правил из ESLint core и популярных плагинов, включая TypeScript, React, Jest, Vitest, Import, Unicorn, jsx-a11y. Покрытие неполное: «some rules may not yet be available», и авторы пишут, что поддержку почти всех core-правил ещё доделывают ([миграция с ESLint](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint)).

Type-aware линт — отдельный слой. [Страница type-aware](https://oxc.rs/docs/guide/usage/linter/type-aware): Rust-часть Oxlint ходит по файлам и гоняет обычные правила, Go-часть `tsgolint` строит программы через [`typescript-go`](https://github.com/microsoft/typescript-go) и возвращает диагностики. На момент доки закрыто 59 из 61 type-aware правил typescript-eslint. Нужен TypeScript 7.0+. Часть старых опций `tsconfig` не поддерживается; в тексте прямо назван `baseUrl`. Невалидные опции репортятся, когда включён `--type-check`. Тот же запрет `baseUrl` повторяет [troubleshooting Vite+](https://viteplus.dev/guide/troubleshooting): без `lint.options.typeAware` и `lint.options.typeCheck` команда `vp check` type-aware правила и проверку типов не запускает.

## Как это стоит рядом со строгим TypeScript

`strict` — флаг `tsc`, не флаг Vite. [Дока TypeScript](https://www.typescriptlang.org/tsconfig/strict.html): `strict` включает всё семейство strict-проверок, отдельные флаги можно выключить обратно, и будущие версии TypeScript могут добавить под этот флаг новые проверки. Эти проверки видит тот, кто строит программу типов. Транспилятор их не видит.

[Vite, раздел TypeScript](https://vite.dev/guide/features): Vite только транспилирует `.ts` и **не** делает type checking. Причина названа прямо: транспиляция пофайловая и ложится на on-demand модель Vite, а проверка типов требует весь граф модулей. Туда же Vite относит ESLint: статический анализ не надо запихивать в transform pipeline. Для продакшен-сборки дока предлагает отдельный `tsc --noEmit`, для разработки — `tsc --noEmit --watch` или `vite-plugin-checker`.

Транспилятор в текущем Vite — [Oxc Transformer](https://oxc.rs/docs/guide/usage/transformer). Из `tsconfig` он читает не всё:

- `isolatedModules` дока требует поставить в `true`. У Oxc нет типовой информации, поэтому не работают `const enum` и неявные type-only импорты. `isolatedModules` не входит в семейство `strict`; это отдельное ограничение именно из-за Oxc.
- `target` из `tsconfig` Vite игнорирует. В dev таргет задаёт `oxc.target` (по умолчанию `esnext`), в сборке приоритет у `build.target`.
- `verbatimModuleSyntax` входит в список опций, которые влияют на результат сборки. Сам флаг типы не проверяет.
- `emitDecoratorMetadata` поддержан частично: полная поддержка требует вывода типов, а его у трансформера нет.
- `paths` подхватываются только если явно включить `resolve.tsconfigPaths: true`. По умолчанию выключено, у опции есть цена по скорости.

[Анонс Vite 8](https://vite.dev/blog/announcing-vite8) описывает связку так: Vite — точка входа, Rolldown — бандлер, Oxc — компилятор. Минификатор по умолчанию для клиентской сборки — Oxc (`build.minify`: `'oxc'`), `transformWithEsbuild` помечен deprecated в пользу `transformWithOxc` ([JavaScript API](https://vite.dev/guide/api-javascript)). Это про сборку, не про линт и не про тесты.

Vitest сидит на этом же пайплайне, а не на своём компиляторе. [Why Vitest](https://vitest.dev/guide/why): раннер трансформирует файлы дев-сервером Vite и делит с приложением `vite.config`. [Writing tests](https://vitest.dev/guide/learn/writing-tests): TypeScript в тестах работает сразу, отдельный `ts-jest` не нужен, но прогон тестов типы **не** проверяет. Дока называет это тем же компромиссом, что у Vite, и отправляет за полной проверкой в `tsc` или `vitest typecheck`.

Typecheck у Vitest выключен по умолчанию и в [доке v5](https://vitest.dev/config/typecheck), и в [доке v4](https://v4.vitest.dev/config/typecheck) (это версия, которую пинит `vite-plus@0.3.3`). `typecheck.checker` по умолчанию `tsc`: Vitest спавнит процесс, совместимый по выводу с `tsc --noEmit --pretty false`. Для `tsc` нужен установленный пакет `typescript`. Файлы `*.test-d.ts` при этом только анализируются компилятором и не исполняются ([Testing types](https://vitest.dev/guide/testing-types)). `typecheck.ignoreSourceErrors` по умолчанию `false`: ошибка типов в исходниках, не только в тестах, валит сьют ([v4](https://v4.vitest.dev/config/typecheck)).

Итого на строгом TypeScript четыре разных проверки, и ни одна не заменяет остальные:

1. `strict` в `tsconfig` сам по себе ничего не запускает. Его читает type checker.
2. Трансформ Vite / обычный Vitest ловит только то, что ломает парсер или изолированную транспиляцию. `strictNullChecks` и остальные strict-проверки мимо него проходят. Зато без `isolatedModules: true` Oxc молча не умеет часть конструкций, про которые `tsc` иначе предупредил бы.
3. `oxlint --type-check` и `vp check` проверяют типы через `typescript-go` (TypeScript 7), не через `tsc` 5.x. Дока Oxlint говорит, что поведение системы типов то же, что у TypeScript, но `baseUrl` и опции, выпиленные в TS 7, надо мигрировать заранее ([type-aware](https://oxc.rs/docs/guide/usage/linter/type-aware), [миграция TS](https://github.com/microsoft/TypeScript/issues/62508#issuecomment-3348649259)).
4. `vitest --typecheck` проверяет типы отдельным процессом `tsc` (или `vue-tsc`, или своим бинарём с тем же форматом вывода). Это не Oxc и не `tsgolint`.

## Заменяет ли это ESLint и отдельный форматтер

Заменяет пару «линтер + форматтер» как роли. Не заменяет одним бинарём `ox` и не обещает нулевой дифф с текущим конфигом.

**Линтер.** [Oxlint](https://oxc.rs/docs/guide/usage/linter) рекомендует себя как основной линтер для большинства проектов и просит остаться на ESLint, только если упираешься в неподдержанное поведение плагина. [Миграция](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint) описывает три факта, а не лозунг:

- большинство core-правил и популярных плагинов уже есть, часть правил ещё нет;
- конфиг ESLint надо конвертировать в формат Oxlint;
- полная миграция не обязательна: можно гонять `oxlint`, а ESLint оставить на дырах, перекрыв дубли через `eslint-plugin-oxlint`.

JS-плагины, которыми внутрь Oxlint можно протащить существующий ESLint-плагин, на [странице линтера](https://oxc.rs/docs/guide/usage/linter) помечены **alpha**. Это путь «ESLint-плагин остаётся», а не путь «ESLint больше не нужен».

**Форматтер.** [Oxfmt](https://oxc.rs/docs/guide/usage/formatter) целится в Prettier-совместимый формат и просит остаться на Prettier, только если нужно точное поведение плагина, которого ещё нет. Для JS/TS заявлено совпадение с Prettier и 100% conformance-тестов Prettier на JavaScript и TypeScript; расхождения авторы считают багами. [Неподдержанное](https://oxc.rs/docs/guide/usage/formatter/unsupported-features): поле `prettier` в `package.json`, вложенный `.editorconfig`, опция `experimentalTernaries`, и сами Prettier-плагины. Взамен встроены сортировки импортов, Tailwind-классов, полей `package.json` и JSDoc, почти все выключены по умолчанию, кроме сортировки `package.json`. Дефолтный `printWidth` у Oxfmt — 100, у Prettier — 80. [Миграция с Prettier](https://oxc.rs/docs/guide/usage/formatter/migrate-from-prettier) говорит снять `eslint-plugin-prettier` и заменить его джобой `oxfmt --check`. Если ESLint остаётся, тот же текст просит оставить `eslint-config-prettier`, чтобы стилевые правила линтера не дрались с форматтером.

Oxlint сам форматированием заниматься не должен. В [посте про JS plugins](https://oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha) авторы прямо советуют унести стиль из линтера в Oxfmt (или другой форматтер): это и быстрее, чем ESLint Stylistic.

Vite+ не добавляет четвёртого линтера. `vp fmt` — это Oxfmt, `vp lint` — это Oxlint, `vp check` собирает их и `tsgo` ([fmt](https://viteplus.dev/guide/fmt), [lint](https://viteplus.dev/guide/lint), [главная](https://viteplus.dev/)).

## Может ли Ox запретить импорты между модулями

Нет, если «между модулями» значит зоны: файлы по пути A не должны зависеть от файлов по пути B. Да, если достаточно запретить конкретную строку импорта.

Что в каталоге Oxlint есть, по [индексу правил](https://oxc.rs/llms.txt) на 2026-09-22:

- [`eslint/no-restricted-imports`](https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-restricted-imports) запрещает импорты, которые перечислены в конфиге. Работает на статическом `import` и на `import()` со строковым литералом. Вычисляемый `import(bar)` правило не видит. `paths` — точное имя модуля. `patterns` — gitignore-шаблон или регулярное выражение по **тексту пути импорта** (`lodash/*`, `@app/(api|enums).*`), не по файлу, в который резолвер этот путь разложил. Регекс — Rust regex, без lookahead и lookbehind.
- [`overrides`](https://oxc.rs/docs/guide/usage/linter/config) умеет повесить другой набор правил на glob файлов. Вместе с правилом выше это читается как «в файлах, попавших в glob, запрещены такие specifier-ы». Это всё ещё матч по строке импорта. `../physics/body` и алиас `@physics/body` для правила — разные строки, даже если оба резолвятся в один файл.
- [`import/no-cycle`](https://oxc.rs/docs/guide/usage/linter/rules/import/no-cycle) запрещает циклы, не направление «A может импортировать B, B не может импортировать A». Для него нужен плагин `import` и мультифайловый анализ ([multi-file analysis](https://oxc.rs/docs/guide/usage/linter/multi-file-analysis)).
- [`import/no-relative-parent-imports`](https://oxc.rs/docs/guide/usage/linter/rules/import/no-relative-parent-imports) запрещает любой относительный импорт через `../`. Это один глобальный запрет на родителей, а не граница между двумя модулями.

Чего в том же индексе нет: среди перечисленных `import/*` правил нет `import/no-restricted-paths`. Это как раз правило eslint-plugin-import про зоны «из этих файлов нельзя в те». Нативного аналога с `from` / `to` по путям файлов у Oxlint в опубликованном каталоге нет.

JS-плагин Oxlint теоретически мог бы загрузить ESLint-плагин с таким правилом, но плагины помечены alpha, и это возврат ESLint-плагина. Вопрос был про инструмент без возврата к ESLint.

### Кто умеет это без ESLint

[`dependency-cruiser`](https://github.com/sverweij/dependency-cruiser) (npm `18.4.0`, описание: `Validate and visualize dependencies. With your rules.`). Свой CLI и свой конфиг, не плагин ESLint.

[Rules reference](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md): у правила обязательны `from` и `to`. `path` во `from` — регулярное выражение на путь файла, который импортирует, от корня проекта. `path` в `to` — регулярное выражение на путь файла, **в который зависимость отрезолвилась**, тоже от корня. В `to.path` работают группы `$1`, `$2` из `from`. Секция `forbidden` как раз про запрещённые рёбра; у правила есть `name` и `severity`.

[README](https://github.com/sverweij/dependency-cruiser/blob/main/README.md) даёт минимальный пример: из всего, что не под `^test`, нельзя зависеть от `^test`. [CLI-дока](https://github.com/sverweij/dependency-cruiser/blob/main/doc/cli.md) даёт тот же механизм для `^src` → `^test`. Запуск — `npx dependency-cruiser src` (начиная с v13 конфиг `.dependency-cruiser.js` подхватывается сам; на v12 и старше нужен `--config`).

Это проверка графа модулей отдельной командой. Она не входит в `oxlint`, `oxfmt`, Vite или Vitest и ничего не форматирует.

## Что из этого не следует

- Не следует, какой из двух способов установки брать в этот репозиторий. Отдельные пакеты и Vite+ оба описаны авторами, версии на дату среза разные.
- Не следует, как раскладывать модули по папкам или пакетам. `dependency-cruiser` умеет запретить ребро между путями при любой раскладке, которую опишут регулярками. Oxlint умеет запретить строку импорта. Ни один из этих фактов не выбирает раскладку.
- Не следует, что `strict: true` само по себе что-то ловит в `vite` или в `vitest` без отдельного typecheck.
