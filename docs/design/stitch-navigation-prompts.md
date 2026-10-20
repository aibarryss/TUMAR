# TUMAR: simplified navigation — Google Stitch prompts

Attach the approved TUMAR screenshots and DESIGN.md. Each numbered prompt below is a separate request for Stitch. The implementation already follows this structure; use generated designs to refine presentation without adding product features.

## 1. Home

Design a native Android Home screen for TUMAR, a small personal safety prototype. Match the attached approved TUMAR identity. Use background #0E141B, cards #161C23, primary text #DDE3ED, secondary text #D1C5B4, gold buttons #C5A059 with dark labels #412D00, accents #E9C176 and a restrained red SOS action #D9534F. Use a system sans-serif with Cyrillic support, body text 16–18px, 56px minimum action controls and 64px minimum bottom-tab touch areas. Design for 390px width with scrolling, long email wrapping and Android safe areas. No phone frame.

All visible text must be Russian. Fixed header: a small TUMAR wordmark and secondary “Аккаунт” action. Heading “Главная”. Fixed bottom navigation has ONLY “Главная” and “Контакты”, each with an outline icon and text label. Do not add a settings tab, role switch, drawer or floating menu.

Create consistent variants: no accepted contact; ready to send; active outgoing test; incoming test. With no contact show “Подключите близкого” and one gold “Добавить контакт”. Ready state: “Ваш сигнал получит”, recipient email, a prominent “Отправить тестовый SOS” and concise “Это тест. Экстренные службы не вызываются.” Active outgoing: “Ваш сигнал для”, recipient email, a test badge, actual status and “Подробнее”. Incoming section: “Сигналы от близких”, “Сигнал от”, sender email, test badge and “Посмотреть сигнал”. Make an unacknowledged incoming signal easy to notice without inventing a delivered notification.

Manual checking is still required: show a SECONDARY “Проверить сигналы” and “Новые сигналы появляются после проверки”. Do not show fake live connectivity, latency, hardware, maps, subscriptions or push permissions. An uncertain send uses “Проверяем отправку”, primary “Проверить отправку”, secondary “Повторить отправку” and “Повтор не создаст второй сигнал”. No technical request IDs. Keep one clear next action per state; use gold sparingly. Put variant labels outside the screen artwork.

## 2. Contacts

Design the TUMAR “Контакты” screen matching the attached approved dark/gold app. Palette: #0E141B background, #161C23 surfaces, #090F16 inputs, #DDE3ED main text, #D1C5B4 secondary text, #C5A059 primary buttons, #412D00 labels on gold, #E9C176 accents. Use legible Cyrillic system sans-serif, 16px minimum body text, 56px controls, 16px outer margins and simple 12–16px rounded surfaces. Respect Android safe areas, scrolling and the keyboard. No phone frame.

Use a fixed small TUMAR header with “Аккаунт”, the heading “Контакты”, and fixed bottom tabs “Главная” / “Контакты”; Contacts is selected. Account email and logout DO NOT belong in the contacts content. “Обновить список” is secondary.

The content has ONLY two clear groups. First: “Кому я отправляю сигналы”, showing one accepted recipient or an empty state with “Создать приглашение”. A generated-code state shows AB12-CD34-EF56, expiry time, “Код одноразовый”, primary “Поделиться кодом”, and secondary “Создать новый код”; explain the old code becomes invalid. Do not make regeneration more prominent than sharing.

Second: “От кого я получаю сигналы”, containing sender emails or “Пока никто не подключён”. Initially show just “У меня есть код”, NOT a permanently expanded input form. The expanded state contains visible label “Код приглашения”, input, primary “Проверить код” and “Отмена”. After validation show the sender email, “Вы будете получать сигналы этого человека” and primary “Принять приглашение”. This is explicit consent and does not create a reverse connection.

Create variants for empty, generated code, expanded input, consent preview and connected. “Удалить связь” stays secondary and requires native confirmation. Use emails, not invented profile names. Do not add phonebook permissions, avatars, chat, SOS, hardware telemetry, social login or multiple outgoing recipients. Show loading/error feedback near the related action while keeping navigation available.

## 3. Test signal details

Design TUMAR’s “Тестовый сигнал” details screen using the approved dark/gold identity: #0E141B background, #161C23 cards, #DDE3ED text, #D1C5B4 secondary text, #C5A059 primary button with #412D00 text and #E9C176 accents. Use Cyrillic system sans-serif, at least 16px body text and 56px primary controls. Target 390px Android width with accessible scrolling and text scaling. No phone frame or decorative illustrations.

Fixed header: ONE “← Назад” and secondary “Аккаунт”. Fixed bottom tabs remain “Главная” and “Контакты”, with Home selected. Screen heading “Тестовый сигнал”. Do not add another bottom “На главную” button.

The FIRST content card must contain: “ТЕСТОВЫЙ СИГНАЛ” badge; explicit direction “Сигнал от” or “Ваш сигнал для”; sender/recipient email; clear current status; and the role-appropriate PRIMARY ACTION. This action must appear BEFORE timestamps and location. For the recipient show “Подтвердить просмотр”; for the sender show “Завершить тест”. Do not show both actions to the same role.

Provide recipient-waiting, sender-waiting, acknowledged and completed variants. Use “Подтвердите, что вы увидели сигнал”, “Сигнал отправлен. Ожидаем подтверждения просмотра.”, “Вы подтвердили просмотр”, or “[email] подтвердил просмотр” as appropriate. Acknowledgment is not assistance and does not finish the test. Completed state: “Тест завершён”; if the connection was revoked: “Тест завершён: связь удалена”. No active action after completion.

Below the first card: secondary “Проверить состояние”, readable event/acknowledgment/completion times, then a lower-priority location card “Тестовая точка — Семей”, “Демонстрационная точка. Это не ваше местоположение”, and “Открыть тестовую точку в картах”. No embedded map, live GPS or emergency-service claim. Keep “Подтверждение означает только просмотр сигнала, а не оказание помощи.” The back action and tabs remain available while data is loading.

## 4. Account dialog

Design a SMALL native-style account dialog overlay for TUMAR, not a new full-screen profile or settings section. Show it over the approved Home or Contacts screen with a restrained dark scrim. Match #0E141B/#161C23 dark surfaces, #DDE3ED main text, #D1C5B4 secondary text and #E9C176 accents. Use readable Cyrillic system sans-serif, wrapping for long emails and generous native dialog touch areas. This is a visual reference; implementation may use the Android native Alert dialog.

All text is Russian. Title: “Аккаунт”. Content: user@example.com. Actions: “Закрыть” and “Выйти из аккаунта”. Make the destructive sign-out distinguishable without making it the app’s main gold action. Do not label it simply “Выйти”, which could be confused with closing the current screen. Support Android Back to dismiss the dialog.

Do NOT add profile editing, avatars, password recovery, language settings, notification settings, device registration, subscription, deletion workflows or an additional tab. The signed-in email already exists; no new backend data is required. Show one clean dialog with no fake switches or disabled controls. Put any design annotations outside the app artwork.
