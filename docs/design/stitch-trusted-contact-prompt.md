# Google Stitch: Trusted contact screen

Attach the approved TUMAR login screenshot and DESIGN.md as visual references. Paste the following prompt into Google Stitch.

---

Design ONE native mobile screen named “Trusted contact” for TUMAR, a personal safety companion app. Produce four clearly labeled state variants of the SAME screen, not four unrelated product screens. Match the attached approved TUMAR login screen. Keep the experience deliberately small and implementable in React Native / Expo.

VISUAL DIRECTION
- Deep navy background #0E141B; section surfaces #161C23; input backgrounds #090F16.
- Main text #DDE3ED; secondary text #D1C5B4; muted text #9A8F80.
- Antique gold primary buttons #C5A059 with dark labels #412D00. Highlight links/icons with #E9C176.
- System sans-serif with full Cyrillic support. Body and labels at least 16 logical pixels, headings 22–26. Do not imitate the accidental serif fallback from an HTML export.
- Calm, readable, modest spacing; 16px horizontal margins, 20–24px section padding, 12–16px corner radii. Minimum 56px primary controls. Consistent thin outline icons. Avoid ornamental gradients, heavy shadows, large illustrations, excessive nested cards, and oversized branding.
- Design for a 390px-wide Android phone. Allow vertical scrolling and a visible on-screen keyboard without hiding the code input and confirmation actions. Support longer email addresses with wrapping.

PRODUCT RULES
- A sender can have only ONE active trusted recipient.
- Connections are directional. Accepting a code means “I agree to receive this person's future SOS signals.” It does NOT create the reverse connection.
- No SOS button, push controls, hardware status, map, subscription, chat, phone contacts, QR scanning, avatars, tab bar, or extra navigation destinations.
- Use email as the account identity. Do not invent a name-profile requirement.

SCREEN CONTENT, ALL VISIBLE UI COPY IN RUSSIAN
Compact heading “Доверенный контакт”; account email in secondary text; a compact “Выйти” action. The screen opens immediately after login for this prototype.

STATE A — EMPTY / DEFAULT
Section title “Получает мои сигналы”. Explanation “Пригласите близкого, который будет получать ваши сигналы.” Primary button “Создать код”.
Second section “Принять приглашение”. Explain “Введите код человека, чьи сигналы вы готовы получать.” Visible input label “Код приглашения”, placeholder “AB12-CD34-EF56”, and secondary action “Проверить код”.
Third section “Я получаю сигналы” with an honest empty message “Пока нет подключённых людей.”

STATE B — CODE GENERATED
In the first section replace “Создать код” with a large selectable 12-character uppercase code grouped as AB12-CD34-EF56. Add “Действует 24 часа. Код можно использовать один раз.” Show expiry date/time and “Поделиться кодом”. Include a restrained “Создать новый код” action and note that the previous code becomes invalid. Keep the input section present. The code is an example, never claim it is a real active code.

STATE C — PREVIEW BEFORE CONSENT
After checking a valid code, show sender email example sender@example.com, a clear explanation “Вы будете получать сигналы этого человека.” Primary button “Принять приглашение” and secondary “Отмена”. This is preview-only: do not show success or an active connection before explicit acceptance. Editing the code should dismiss this preview.

STATE D — CONNECTED
In “Получает мои сигналы”, show recipient@example.com, a small “Подключён” status, explanatory directional text, and “Удалить связь”. Hide invitation creation while this connection exists.
In “Я получаю сигналы”, show one sample sender email with “Удалить связь”. This list can contain more than one sender. Show no arrows implying reciprocal trust.
Deletion requires a standard native confirmation dialog: title “Удалить связь?”, explanation “Обмен сигналами по этой связи будет прекращён.”, actions “Отмена” and “Удалить”.

FEEDBACK STATES
Include concise inline examples for an invalid/expired/used code, self-invitation, network failure, and temporary attempt limit. Use a visible loading indicator and disable repeated submissions. Add a compact “Обновить” action to refresh connections; do not imply live push or continuous tracking. Do not use color alone to indicate status.

Deliver polished screen images for these four states, no phone frames, with consistent layout and spacing. Preserve the restrained TUMAR identity and prioritize legibility over decoration.
