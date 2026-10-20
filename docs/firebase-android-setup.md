# Firebase и Android push

Firebase push уже настроен для проекта `tumar-1f480` и Android-пакета `kz.tumar.app`. Ключ отправки Firebase хранится в защищённых настройках EAS; его не нужно скачивать повторно или класть в репозиторий.

Для локального запуска и Android-сборки нужен клиентский `google-services.json` в корне проекта рядом с `app.json`. Он добавлен в `.gitignore`, чтобы локальная конфигурация Firebase не попадала в GitHub. Если файла нет после клонирования, попросить его у владельца проекта или скачать в Firebase Console из регистрации приложения Android с пакетом `kz.tumar.app`.

Не добавлять в исходники или GitHub JSON-ключ Firebase Admin SDK, ключ подписи Android, EAS токены, Supabase `service_role` или секрет вызова push-функции. Серверная часть уже настроена в Supabase; подробности и сценарий проверки описаны в [Android push](android-push.md).

Для EAS используется аккаунт владельца и профиль `preview`. Передача другу исходников сама по себе не передаёт доступ к Firebase, EAS или Supabase.
