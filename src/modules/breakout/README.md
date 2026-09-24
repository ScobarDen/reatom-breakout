# breakout

Один матч на хосте: правило шага, картинка матча в атомах и приём ввода между кадрами.

- Внедряется: ничего. Матч и события между кадрами живут в контексте Reatom. Тик `advance` зовёт `app/`.
- Headless: View хостов лежат в `pages/web` и `pages/terminal` (ADR-0001).
- Вне модуля: цикл кадров и логгер (`app/`), счётчик fps (`common/frame-rate`).
- Геометрия поля: только `model/board.model.ts`, физика и View берут её оттуда.
- Устройство целиком: [docs/architecture.md](../../../docs/architecture.md).
