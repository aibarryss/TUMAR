# Google Stitch — TUMAR test SOS

Use the approved login/contact screenshots and DESIGN.md as references. The user has already supplied generated Home and Alert Details screens; this prompt records the intended scope for further visual adjustments.

---

Design TWO native mobile screens for TUMAR: Home and Test Alert Details. Match the approved TUMAR login and trusted-contact visual identity. Use a 390px Android canvas without phone frames. All visible UI text must be Russian.

Palette: background #0E141B, cards #161C23, recessed surfaces #090F16, main text #DDE3ED, secondary text #D1C5B4, gold actions #C5A059 with labels #412D00, accent #E9C176, SOS action #D9534F. Use a system sans-serif with Cyrillic support, at least 16px body text, 56px controls, 16px outside margins, 20px card padding and 12–16px rounded corners. Allow wrapping of long emails and vertical scrolling.

HOME: compact TUMAR wordmark, heading “Главная”, actions “Контакты” and “Обновить”. Section “Получает мои сигналы” shows the accepted recipient email and “Тестовый SOS”. Explain that this creates a test event and does not call emergency services. If no contact exists, show “Сначала добавьте доверенный контакт” and “Добавить контакт”. With an active outgoing test, replace the send action with its recipient, creation time, test badge, actual status and “Открыть тревогу”. Section “Входящие тревоги” lists active incoming events with sender, time, status and an open action; otherwise show “Активных тревог нет”. Clearly distinguish incoming from outgoing events.

DETAILS: back action to Home, heading “Тревога”, permanent badge “Тестовая тревога”. Show sender email, recipient email, creation time and current status. Location card: “Тестовая точка — Семей”, “Не является вашим местоположением” and “Открыть в картах”. No embedded map. Recipient's primary action is “Я увидел сигнал”; sender's is “Завершить тест”. After acknowledgment show “Получение подтверждено” and its time. Acknowledgment does not close the test. Completed tests show “Тест завершён” and completion time with no further acknowledge/finish action. If the link was removed, the sender sees “Тест завершён: связь удалена”.

Provide state variants for ready-to-send, no-contact, active outgoing, incoming, acknowledged and completed. Place variant labels OUTSIDE screen artwork. Sending uses a native confirmation dialog with “Отмена” and “Отправить тест”. Support “Отправляем…”, “Проверяем, принят ли SOS” and network errors without false success. The user can refresh to verify an uncertain send; retry is explicit and uses the same request identity.

Do NOT invent delivery receipts, guaranteed assistance, push banners, location permission, live tracking, latency measurements, version numbers, a hardware connection, SafeNet labels, state-switching tabs, or a system-diagnostics section. Use only actual event data. Do not add long-press sending, countdowns, sirens, chat, subscriptions, or emergency-service dispatch.
