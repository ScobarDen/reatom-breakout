# Что из Reatom v1001 реально есть

Срез на **2026-09-22**. Вопрос один: для каждого механизма из списка — есть ли он в API Reatom v1001, как называется и какую проблему авторы сами называют. Куда это класть в Breakout, этот файл не решает.

## Откуда факты

Канон — ветка [`v1001`](https://github.com/reatom/reatom/tree/v1001) и сайт [v1001.reatom.dev](https://v1001.reatom.dev). Сайдбар доков считает каноном `@reatom/core` (внутри него же routing, persist, web, forms) и соседние `@reatom/react`, `@reatom/preact`, `@reatom/jsx`, `@reatom/vite`, `@reatom/zod` ([`docs/astro.sidebar.ts`](https://github.com/reatom/reatom/blob/v1001/docs/astro.sidebar.ts)).

Это не v3. Страницы вроде [`/package/npm-react`](https://www.reatom.dev/package/npm-react) всё ещё показывают `ctx` / `createCtx` — их сюда не брал. Миграция прямо пишет: «**NEVER** use `ctx` or `Ctx`» ([Migration from v3](https://v1001.reatom.dev/handbook/history/#migration-from-v3)).

Локальный скилл `reatom` использовался только как указатель на эти страницы. Цитаты ниже — с сайта или из исходников пакетов.

## Сводка

| Механизм из списка | Есть | Как называется в v1001 |
| --- | --- | --- |
| atom | да | `atom` |
| computed | да | `computed`, плюс `withComputed` для записываемого атома |
| action | да | `action` |
| async action и эффекты | да | `action` + `wrap` + `withAsync` / `withAsyncData`; сайд-эффекты — `effect` |
| реактивные зависимости | да | неявный трекинг при вызове `atom()`; чтение без подписки — `peek` |
| lifecycle | да | очереди кадра + `withConnectHook` / `withChangeHook` / `withCallHook` / `withInit` |
| subscription | да | `atom.subscribe`, автоподписка у `effect` и `reatomComponent` |
| batch | да | `batch`, плюс микротаск-очереди; это не отдельный store |
| отмена и конкурентность | да | `withAbort`, `abortVar`, `wrap`, `race` |
| persistence | да | `reatomPersist` и адаптеры (`withLocalStorage` и соседние) |
| синхронизация с URL | да | `urlAtom`, `reatomRoute`, `searchParamsAtom`, `withSearchParams` |
| context / DI | да, но не v3-`ctx` | неявный `context`, `variable` как IoC, `bind` как лёгкая привязка кадра |
| DevTools | частично | задокументирован `connectLogger`; в дереве `v1001` ещё есть `@reatom/admin` |
| fine-grained подписка | отдельного имени нет | трекинг прочитанных атомов; в DOM это `@reatom/jsx` |
| внешний источник событий | да | `onEvent`, `reatomObservable` / `withObservable`, `reatomWebSocket` |

## atom

Есть. `atom` из `@reatom/core`.

Авторы называют его базовым контейнером изменяемого состояния: чтение — вызов без аргументов, запись — `.set`. В исходнике это прямо «Base changeable state container» / «the core primitive for storing and updating mutable state» ([`atom.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/core/atom.ts)). Getting started говорит то же самое проще: «base state container», и прячет продвинутые фичи, пока они не нужны ([Getting started](https://v1001.reatom.dev/start/base/#atom)).

Имя вторым аргументом — для отладки, не для логики ([Actions / Naming](https://v1001.reatom.dev/start/actions/#naming)).

## computed

Есть. `computed` из `@reatom/core`.

Проблема, которую они формулируют: ленивые мемоизированные вычисления. «The most valuable feature of any signal-based library is the ability to create lazy memoized computations» ([Getting started](https://v1001.reatom.dev/start/base/#computed)). Исходник уточняет: зависимости трекаются сами, пересчёт только когда их состояние изменилось, и только если computed и прочитан, и на него есть подписка ([`atom.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/core/atom.ts)).

Отдельная штука — `withComputed`: записываемый атом, который всё же выводит следующее состояние из реактивных чтений, но прямая запись проходит в тот же state. В референсе это «A middleware extension that enhances an atom with computed capabilities» ([Extensions](https://v1001.reatom.dev/reference/extensions/)).

`computed` без зависимостей сам не пересчитается. Для этого есть `retryComputed` (список API в [summary](https://v1001.reatom.dev/_llms-txt/summary.txt), секция Other APIs).

## action

Есть. `action` из `@reatom/core`.

Авторы продают его как организацию, читаемость, отладку и расширяемость, а не как обязательную обёртку над каждым `set`. «Action is a base Reatom primitive that increases the quality of your code» — и сразу: для простого `(value) => myAtom.set(value)` action не нужен; он для маппингов, API и прочих сайд-эффектов. Сам `action` — «a simple decorator» ([Actions](https://v1001.reatom.dev/start/actions/)).

В исходнике: «Creates a logic and side effect container». В отличие от атома, action зовут с параметрами, он может вернуть значение, при этом у него остаются `subscribe` и `extend`, и он помнит историю вызовов ([`action.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/core/action.ts)). Под капотом action — нереактивный атом: `isAction` проверяет `isAtom && !reactive` (тот же файл).

Методы на атоме, если они именно actions, вешают через `extend` или `withActions` ([`actions.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/core/actions.ts)).

## async action и эффекты

Есть, и это несколько имён, не одно.

- Мутации и команды: `action(async ...).extend(withAsync())`. Авторы: POST/PUT/DELETE, сабмит, сайд-эффекты, без обязанности хранить payload ([Async Operations](https://v1001.reatom.dev/handbook/async/#overview)).
- Запросы: `computed(async ...).extend(withAsyncData())`. Авторы: GET и computed-ресурсы. `withAsyncData` включает данные и автоматическую отмену; `withAsync` сам по себе abort не добавляет ([тот же handbook](https://v1001.reatom.dev/handbook/async/#manual-abort-control)).
- `wrap` — обязательная склейка async-контекста через `await` / `.then` / таймеры. Без него теряется причинность, ломается отмена, и логгер с devtools не видят цепочку. Дословно: «This is a CRITICAL function» и без него ловят «Missed context» / «context lost» ([Async Operations / wrap](https://v1001.reatom.dev/handbook/async/#wrap), [Methods / wrap](https://v1001.reatom.dev/reference/methods/)).
- `effect` — реактивный сайд-эффект. «similar to `computed` but designed for running side effects», сам подписывается на прочитанные атомы и чистится, когда реактивный контекст абортится ([`effect.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/methods/effect.ts)). Getting started: по сути `computed(cb).subscribe()`, но удобнее, потому что в одном месте можно следить за любой комбинацией атомов; типичный кейс — поллинг и таймеры, которые живут независимо от UI ([Getting started](https://v1001.reatom.dev/start/base/#effects)).

У `withAsync` / `withAsyncData` снаружи есть `ready()`, `error()`, опциональные `status` и `retry`, плюс хуки `onFulfill` / `onReject` / `onSettle` ([Async Operations](https://v1001.reatom.dev/handbook/async/#basic-async-actions)).

## реактивные зависимости

Отдельной функции «declare dependencies» нет. Зависимость появляется, когда внутри `computed`, `effect` или `reatomComponent` вызывают атом.

Исходник: computed «automatically track their dependencies (other atoms or computed values that are called during computation)» ([`atom.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/core/atom.ts)). Кадр хранит их в `pubs`, подписчиков — в `subs` (тот же файл, интерфейс `Frame`).

Чтение без подписки — `peek`: «Executes a callback in the current context without reactive bindings (dependencies tracking)» ([Methods](https://v1001.reatom.dev/reference/methods/)).

Реагировать только на реальное изменение, а не на каждый прогон: `ifChanged`. Вызовы action в текущем батче, без истории: `getCalls` ([Methods](https://v1001.reatom.dev/reference/methods/), [Sampling](https://v1001.reatom.dev/handbook/sampling/)).

Связи между computed односторонние. Если подписан только родитель, `withConnectHook` на производном не сработает ([Lifecycle](https://v1001.reatom.dev/handbook/lifecycle/)).

## lifecycle

Есть. Авторы опираются на actor model: у каждой части свой state и свой lifecycle, атом ленивый и коннектится, только когда им пользуются ([Lifecycle](https://v1001.reatom.dev/handbook/lifecycle/)).

Имена:

- `withConnectHook` — колбэк в фазе effect на первого подписчика, очистка на disconnect. Зачем: лениво стартовать работу, которая нужна только пока атом кто-то читает (поллинг, внешние слушатели). Срабатывает один раз на первую подписку, не на каждого слушателя (та же страница; исходник `onConnect` в [`atom.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/core/atom.ts)).
- `withDisconnectHook` — короткий путь к cleanup.
- `withChangeHook` — на каждое успешное изменение атома, фаза hooks. Для стабильной связи модулей, не для синхронизации атомов между собой: для этого `computed` / `withComputed` ([Extensions / withChangeHook](https://v1001.reatom.dev/reference/extensions/)).
- `withCallHook` — то же для вызова action.
- `withErrorHook` — если `set` или вызов бросил.
- `withInit` / `isInit` — динамический init и проверка, что сейчас инициализация, чтобы, например, не затереть восстановленное состояние ([Extensions / isInit](https://v1001.reatom.dev/reference/extensions/)).

Порядок фаз авторы рисуют как вложенные очереди, по аналогии с tasks/microtasks: **Updates → Hooks → Computations → Cleanups → Effects**, и всё это с batching и transactions ([Lifecycle scheme](https://v1001.reatom.dev/handbook/lifecycle/#lifecycle-scheme)). Очереди в коде: `'hook' | 'compute' | 'cleanup' | 'effect'`, первый запланированный колбэк ставит `queueMicrotask` ([`queues.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/core/queues.ts)).

`effect` и `reatomComponent` сами сажают работу в abort-контекст компонента: на unmount незаконченный async обрывается ([`effect.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/methods/effect.ts), [`@reatom/react`](https://v1001.reatom.dev/reference/react/)).

## subscription

Есть. Метод называется `subscribe`.

Getting started: чтобы computed ожил, на него подписываются; реактивный пересчёт приезжает следующим микротаском, и колбэк зовётся, только если состояние реально изменилось ([Getting started](https://v1001.reatom.dev/start/base/#computed)). Адаптеры (`reatomComponent`) вызывают `.subscribe` сами ([Lifecycle](https://v1001.reatom.dev/handbook/lifecycle/)).

`effect` — это computed, который подписывается сразу при создании ([Getting started](https://v1001.reatom.dev/start/base/#effects)).

У action подписка тоже есть, и это не «последнее значение», а пачка вызовов. «Action subscriptions are batched to the next microtick — all calls within a synchronous block are delivered together as an array» с `params` и `payload` ([Sampling](https://v1001.reatom.dev/handbook/sampling/#actions-as-reactive-events-a-core-insight)). Раньше подписка на action кидала ошибку и просила `effect` + `getCalls`; с `1000.7.0` подписка разрешена ([коммит `eaee4b2`](https://github.com/reatom/reatom/commit/eaee4b2fc6795587adbc422836f566b66942e127)).

`withDynamicSubscription` — не «подписка на кусок состояния». Он переопределяет `.subscribe`, чтобы отписка случилась сама, когда сработает `abortVar` ([`withDynamicSubscription.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/extensions/withDynamicSubscription.ts)). `effect` вешает его сам.

Ручная отписка у effect — `effect(...).unsubscribe()` ([`effect.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/methods/effect.ts)).

## batch

Публичный `batch` есть, отдельного «batch store» нет.

`batch` в `@reatom/core`: «Runs a callback as a nested batch and optionally flushes the queue after the outermost batch completes». `shouldNotify: true` — для пользовательских записей, которые должны нотифицировать синхронно после всех вложенных `set`; `false` — когда оборачивают чтение computed или effect. Пример в JSDoc — два `count.set` внутри одного `batch` ([`queues.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/core/queues.ts)).

Даже без явного `batch` обновления уже коалесцируются: первый `_enqueue` ставит один `queueMicrotask(notify)` ([тот же файл](https://github.com/reatom/reatom/blob/v1001/packages/core/src/core/queues.ts)). Lifecycle называет это «batching and transactions» ([Lifecycle scheme](https://v1001.reatom.dev/handbook/lifecycle/#lifecycle-scheme)). `getCalls` видит только вызовы текущего батча, историю он не хранит ([Methods](https://v1001.reatom.dev/reference/methods/)).

Не путать с другим `batch`: у `reatomLinkedList` метод `batch` складывает много правок списка в один проход по DOM ([`@reatom/jsx`](https://v1001.reatom.dev/reference/jsx/#api-and-when-to-use)). Это структурный список, не планировщик атомов.

`withTransaction` / `withRollback` — соседняя, но другая задача: оптимистичные апдейты с откатом, не слияние нотификаций ([Async Operations / Optimistic Updates](https://v1001.reatom.dev/handbook/async/#optimistic-updates)).

v3-шный `setupBatch(unstable_batchedUpdates)` из `@reatom/npm-react` к этому срезу не относится.

## отмена и конкурентность

Есть. Авторы описывают проблему как «weird state» и «WAT state»: параллельные цепочки запросов догоняют друг друга, и UI показывает данные от старого ввода. Отменять надо не один `fetch`, а всю логическую цепочку ([Async Context](https://v1001.reatom.dev/handbook/async-context/)).

Имена:

- `withAbort(strategy?)` — «Extension to add abort handling to actions and computed atoms» ([`withAbort.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/extensions/withAbort.ts)).
  - `'last-in-win'` (дефолт) — новый вызов абортит предыдущий, авторы сравнивают с debounce.
  - `'first-in-win'` — пока первый жив, новые игнорируются, сравнивают с throttle.
  - `'manual'` — автоотмены нет, есть `.abort()`, для поллинга.
  - `'finally'` — по завершении action абортятся и fire-and-forget дети.
- `abortVar` — встроенная async-переменная с `AbortController`. `wrap` сам её проверяет, руками после каждого `await` это делать не нужно ([Async Context](https://v1001.reatom.dev/handbook/async-context/#reatoms-implementation-of-async-context)).
- `abortVar.createAndRun` + `race` — кто первый закончил, тот победил, остальные абортятся с причиной `"race"`, код после `wrap` у проигравших не выполняется ([Sampling](https://v1001.reatom.dev/handbook/sampling/#the-race-utility-handling-concurrent-operations)).
- `take` — `await` следующего изменения атома или вызова action. `throwAbort()` внутри фильтра отменяет ожидание, если action уже абортнут.
- Дебаунс без `debounce(fn, ms)`: `await wrap(sleep(ms))` внутри action/computed с `withAbort`. Новый ввод убивает спящий предыдущий ([Sampling](https://v1001.reatom.dev/handbook/sampling/#enter-reatoms-concurrency-model), [Async Operations](https://v1001.reatom.dev/handbook/async/#debouncing)).

`withAsyncData` тащит `withAbort` сам. `withAsync` — нет ([Async Operations](https://v1001.reatom.dev/handbook/async/#manual-abort-control)).

Лоадеры `reatomRoute` — async computed, они абортятся при уходе с роута ([Routing](https://v1001.reatom.dev/handbook/routing/)).

Абортнутый статус не помечается как `isRejected`: статус возвращается к последнему settled, если он был ([Async Operations / Abort Handling](https://v1001.reatom.dev/handbook/async/#abort-handling)).

## persistence

Есть, это часть `@reatom/core`, не отдельный пакет. Импорт либо из `@reatom/core`, либо из `@reatom/core/persist`.

Проблема словами авторов: «maintain state across browser sessions, page refreshes, and different tabs», с бэкендами, фолбэками и синхронизацией вкладок ([State Persistence](https://v1001.reatom.dev/handbook/persist/)).

Имена:

- свой бэкенд: `reatomPersist(storage)` и `PersistStorage` (`get` / `set` / необязательные `clear` и `subscribe`);
- память для тестов: `createMemStorage`;
- браузер: `withLocalStorage`, `withSessionStorage`, `withBroadcastChannel` (синхронизация вкладок без диска), `withCookie`, `withCookieStore`, `withIndexedDb`.

Общие опции: `key`, `toSnapshot` / `fromSnapshot`, `schema` (Standard Schema), `version` + `migration`, `time` (TTL), `subscribe` для кросс-таба. По умолчанию снимок идёт через `toJSON` / `fromJSON` атома. Если storage недоступен, адаптеры падают в память, приложение не обязано падать вместе с диском (та же страница).

`withBroadcastChannel` авторы отдельно помечают: это не persistence, данные между сессиями не живут.

## синхронизация с URL

Есть, тоже внутри `@reatom/core`.

- `urlAtom` — атом текущего `URL`. `urlAtom.go(path)`, `.set`, `catchLinks` (перехват кликов по `<a>` для SPA, по умолчанию включён). `sync` — колбэк, который пушит URL в `history`; его можно заменить, чтобы историю вёл чужой роутер. `syncFromSource` кладёт URL из внешнего источника правды и не зовёт `sync` обратно ([`url.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/web/url.ts), [Routing](https://v1001.reatom.dev/handbook/routing/)).
- `reatomRoute` — атом роута: матч паттерна, типизированные params, search через схему, лоадер. «handles URL management, parameter validation, data loading» ([Routing](https://v1001.reatom.dev/handbook/routing/)). Навигация — `.go`, строка без перехода — `.path`.
- Отдельный атом на один query-параметр: `withSearchParams(key, parse | options)` и `searchParamsAtom` / `.lens`. Исходник: «Create an atom that synchronizes with a URL search parameter» ([`searchParams.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/routing/searchParams.ts)). Опции: `parse`, `serialize`, `replace`, `path` (ограничить синхронизацию путём).

Роуты регистрируются в `urlAtom.routes`. Search-only роут сохраняет pathname — авторы приводят его как способ держать диалог в query, не меняя путь ([Routing](https://v1001.reatom.dev/handbook/routing/)).

## context / DI

v3-`ctx` нет. С v1000 контекст неявный: «Reatom operate context by global variable which is hidden from public API» ([Migration from v3](https://v1001.reatom.dev/handbook/history/#migration-from-v3)).

Что осталось, и зачем:

- `context` — «Core context object that manages the reactive state context». Он трекает зависимости, стек вычислений и текущий кадр ([`atom.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/core/atom.ts)).
- `context.start()` — новый изолированный контекст. Авторы: SSR-хендлер, прогон теста, и значение для `reatomContext.Provider`, если вызван `clearStack` ([Migration](https://v1001.reatom.dev/handbook/history/#migration-from-v3), [React](https://v1001.reatom.dev/reference/react/#setup-context)).
- `clearStack()` — выкидывает дефолтный стек, чтобы операция вне `wrap` падала с «missing async stack». «primarily used to force explicit context preservation via `wrap()`» ([`atom.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/core/atom.ts)).
- `context.reset()` — сбросить накопленное состояние дефолтного глобального контекста. В JSDoc: тесты, storybook, logout. Это не замена `clearStack` + `start`.
- `variable()` — «similar capability to the proposed TC39 AsyncContext.Variable». Референс прямо даёт таблицу замены IoC/DI: токен = `variable<T>('name')`, provider = `.run(impl, fn)` / `.set(impl)`, inject = `.require()` / `.get()`, scope = кадр стека ([Methods / variable](https://v1001.reatom.dev/reference/methods/)). Встроенный экземпляр — `abortVar`.
- `bind` — «Light version of `wrap` that binds a function to the current reactive context». Abort-контекст не тащит, поэтому легче и менее безопасен для async ([`atom.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/core/atom.ts)).
- `wrap` — сохранение того же кадра через настоящие async-границы ([Async Context](https://v1001.reatom.dev/handbook/async-context/)).

Провайдер React нужен только если стек очистили. Иначе работает дефолтный глобальный контекст ([React](https://v1001.reatom.dev/reference/react/#setup-context)).

## DevTools

Отдельного пакета с именем `@reatom/devtools` в сайдбаре нет. Картина на эту дату двойная, и оба источника первичные.

Задокументированный путь в Getting started: «We will publish our devtools soon, but now you can use `connectLogger`» ([Tooling](https://v1001.reatom.dev/start/tooling/#logging)). `connectLogger()` пишет трейс в консоль, фильтр — опция `match`. Рядом `log` / `LOG.label` / `LOG.state`: логи можно коммитить, в проде их не видно, пока логгер не подключён. `log` сам является action, его расширяют `withCallHook`. Глобальный перехват всех новых атомов и actions — `addGlobalExtension` (та же страница). Стек кадра — `getStackTrace` ([`methods/index.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/methods/index.ts)).

При этом в дереве `v1001` уже лежит `@reatom/admin`: «Admin dashboard for Reatom tracing — debugger & remote log viewer», ключевое слово `devtools` ([`packages/admin/package.json`](https://github.com/reatom/reatom/blob/v1001/packages/admin/package.json)). README описывает живые in-page devtools: `createAdminDevtools`, `createAdminApp`, `createAdmin`, реплей сессии, таймлайн, граф причин, инспектор состояния ([`packages/admin/README.md`](https://github.com/reatom/reatom/blob/v1001/packages/admin/README.md)). Страница, на которую указывает `homepage` пакета (`/package/admin`), на [v1001.reatom.dev](https://v1001.reatom.dev/package/admin) 2026-09-22 отвечает 404, и в сайдбаре пакета нет.

Маркетинговая строка на главной — «A simple logger and advanced devtools» ([главная](https://v1001.reatom.dev/)) — имя API не задаёт.

`data-reatom-name` в `@reatom/jsx` — атрибут для читаемости в браузерных DevTools, не отдельная панель Reatom ([JSX](https://v1001.reatom.dev/reference/jsx/#why-css-prop)).

## fine-grained подписка

Функции с таким именем нет. Есть три разных механизма, которые авторы описывают рядом с этой задачей.

1. Подписка ровно на прочитанное. Computed пересчитывается от атомов, которые вызвали во время вычисления, а не от всего стора ([`atom.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/core/atom.ts)). `reatomComponent` в React перерисовывает компонент, когда меняется атом, прочитанный в его функции, и атомы можно читать условно, без правил хуков ([React](https://v1001.reatom.dev/reference/react/#reatomcomponent)). Это гранулярность до компонента, не до DOM-узла.
2. Atomization. В history авторы сами говорят «fine-grained control»: реактивным делают только нужное поле, а не весь объект через Proxy ([History](https://v1001.reatom.dev/handbook/history/)). В handbook atomization — чтобы правка имени была O(1) и не пересоздавала массив, в отличие от «redux way: O(n)» ([Atomization](https://v1001.reatom.dev/handbook/atomization/#reducing-computational-complexity)).
3. DOM без ререндера дерева. `@reatom/jsx`: «Zero re-renders: reactive bindings update DOM directly». Проп-атом или функция обновляют свойство узла; у длинных списков `reatomLinkedList` патчит DOM по журналу изменений, а не пересобирает фрагмент ([JSX](https://v1001.reatom.dev/reference/jsx/)). Там же честно: React-style keyed reconciliation нет.

`withDynamicSubscription` сюда не попадает. Он про отписку по abort, не про то, какой кусок UI слушает какое поле.

## подписка на внешний источник событий

Есть несколько входов, все в `@reatom/core`.

- `onEvent` — «Integrates external event sources (DOM elements, WebSockets, etc.) with Reatom's reactive system and abort context» ([`onEvent.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/web/onEvent.ts)). Два режима: промис на одно событие (`await wrap(onEvent(...))`) и подписка с колбэком, которая сама снимается на abort. Handbook называет это checkpoint pattern: слушать начинаешь до долгой операции, чтобы не пропустить событие, прилетевшее посреди неё ([Sampling](https://v1001.reatom.dev/handbook/sampling/#the-onevent-operator-handling-external-events)). Там же пример сокета: `withConnectHook` + `onEvent`, отписка и `unsub` на disconnect.
- `reatomObservable` / `withObservable` — атом или расширение, которое подписывается на observable-подобный источник, когда появляются подписчики атома, и отписывается, когда их не осталось. Авторы прямо называют мост для RxJS, event emitter и своих observable ([Methods](https://v1001.reatom.dev/reference/methods/), исходник [`reatomObservable.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/methods/reatomObservable.ts)).
- `reatomWebSocket` — отдельная обёртка состояния сокета в `@reatom/core/web` ([`reatomWebSocket.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/web/reatomWebSocket.ts)).
- Готовые внешние источники, уже атомы: `onLineAtom`, `reatomMediaQuery` (каталог `packages/core/src/web` на ветке `v1001`).
- Чужой роутер как источник URL: `urlAtom.sync` пишет наружу, `urlAtom.syncFromSource` принимает URL снаружи ([`url.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/web/url.ts)).

`addEventListener` без `wrap` / `onEvent` авторы считают потерей кадра ([Async Operations](https://v1001.reatom.dev/handbook/async/#wrap)).

## Что следующему архитектурному тикету нельзя перепутать

Это ограничения API, не выбор модулей Breakout.

- Имени `ctx` в v1001 нет. Код, который прокидывает контекст первым аргументом, — v3.
- `computed` ленивый: без подписчика (экран, `effect`, другой живой computed) он не работает как «всегда тёплый» стор.
- После `await` кадр жив только через `wrap`. Иначе обновление атома может упасть с потерей контекста, а отмена не доедет до конца цепочки.
- `withAsync` не отменяет предыдущий вызов. Отмена либо `withAbort`, либо `withAsyncData`, который включает abort сам.
- `batch` сливает нотификации. Откат оптимистичной записи — это `withTransaction` / `withRollback`, другой механизм.
- Persistence и URL — расширения атомов (`withLocalStorage`, `withSearchParams`, `urlAtom`), не второй стор рядом с атомами.
- Задокументированная отладка — `connectLogger`. `@reatom/admin` в ветке `v1001` есть и сам себя называет devtools, но в сайдбар доков на 2026-09-22 не входит, страница пакета 404.
- Мелкая подписка в React-адаптере — до компонента, который прочитал атом. До узла DOM это уже `@reatom/jsx`, и у него нет keyed reconciliation.
- Слушатель внешнего события, который должен умереть вместе с экраном или abort, авторы сажают в `onEvent` или в `withConnectHook`, а не в голый `addEventListener`.
