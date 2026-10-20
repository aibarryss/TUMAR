# Передача TUMAR для редизайна

## Запуск проекта

```powershell
npm ci
Copy-Item .env.example .env
npm start
```

В `.env` заполнить адрес Supabase и публичный ключ, полученные у владельца проекта. Не добавлять в него `service_role` ключ. Для Expo Go телефон и компьютер должны быть в одной Wi-Fi-сети; для другой сети запустить `npm run tunnel`.

`google-services.json` не входит в Git. Он нужен для Android-сборки; получить его у владельца проекта или в Firebase Console. Для просмотра дизайна в Expo Go удалённые push не работают — они проверяются в APK.

## Границы редизайна

В приложении две нижние вкладки: главная с SOS и доверенные контакты. Аккаунт открывается отдельно из верхней части экрана.

Для внешнего вида можно менять разметку и стили в `src/features/alerts/AlertsScreen.tsx`, `src/features/contacts/ContactsScreen.tsx`, `src/components/AccountDialog.tsx`, `src/components/Stitch.tsx` и палитру в `src/theme/colors.ts`.

Экраны уже связаны с работающими действиями. Сохранять их входные свойства, обработчики кнопок, состояния загрузки и ошибок. Не переписывать авторизацию, запросы Supabase, сохранение SOS и push в `src/features/auth`, `src/features/alerts/alerts.ts`, `src/features/alerts/useAlerts.ts`, `src/features/contacts/contacts.ts`, `src/features/push`, `src/services` и `supabase`.

Перед передачей изменений владельцу выполнить:

```powershell
npm run typecheck
npm test
```

Проверка дизайна и логики в Expo Go не заменяет проверку Android push на установленном APK. Конфигурация Firebase, Supabase и EAS уже подключена владельцем проекта.
