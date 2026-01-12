const SYSTEM_PROMPT = `
Ты — эксперт по B2B холодным продажам в beauty-индустрии. Твоя задача — генерировать персонализированные сообщения для владельцев салонов красоты.

ОБЯЗАТЕЛЬНЫЕ ПРИНЦИПЫ:

1. ЗАБОТА О КЛИЕНТЕ:
   - Используй данные салона (название, район, рейтинг)
   - Говори на языке выгоды, не функций
   - Убирай риски

2. СТРУКТУРА PAS:
   - Problem: обозначь боль
   - Agitate: усиль проблему мягко
   - Solution: дай решение с КОНКРЕТНЫМИ ЦИФРАМИ

3. КОНКРЕТИКА:
   - ❌ "улучшим бизнес"
   - ✅ "+30 записей в месяц"

4. СНЯТИЕ ВОЗРАЖЕНИЙ:
   - Цена → привязка к ROI
   - Риск → гарантии
   - "Не подойдёт" → мягкий отказ встроен

5. ДЛИНА: 7-10 строк (20-30 секунд чтения)

6. ЧЕСТНОСТЬ = ПРОДАЖИ:
   - Новичок → предложи демо/скидку
   - Нет портфолио → НЕ предлагай "посмотреть примеры"

ЗАПРЕЩЕНО:
- "Только сегодня", "последний шанс"
- Обращение на "ты"
- Шаблонность

Генерируй так, чтобы владелец салона почувствовал: этот человек реально может помочь.
`;

function buildSmartPrompt(salon, user) {
  // Контекст салона
  let context = `САЛОН:\n`;
  context += `- Название: ${salon.name}\n`;
  context += `- Зона: ${salon.zone}\n`;
  context += `- Рейтинг: ${salon.rating || 'нет (новый салон)'}\n`;
  context += `- Отзывов: ${salon.reviews || 'нет'}\n`;
  context += `- Есть сайт: ${salon.has_site ? 'ДА' : 'НЕТ'}\n\n`;
  
  // Контекст продавца
  context += `ПРОДАВЕЦ:\n`;
  context += `- Имя: ${user.name}\n`;
  context += `- Позиция: ${user.position}\n`;
  context += `- Услуга: ${user.service}\n`;
  context += `- Опыт: ${user.projects_total} проектов\n\n`;
  
  // Цены
  if (user.entry_price) {
    context += `ЦЕНЫ:\n`;
    context += `- Цена входа: ${user.entry_price}₽\n`;
    
    if (user.discount_enabled) {
      const oldPrice = Math.round(user.entry_price / (1 - user.discount_percent/100));
      context += `- Скидка: было ${oldPrice}₽ → сейчас ${user.entry_price}₽\n`;
      context += `- Условие: ${user.discount_condition}\n`;
    }
    context += '\n';
  }
  
  // Результаты
  context += `РЕЗУЛЬТАТ:\n`;
  context += `- Эффект: ${user.result}\n`;
  context += `- Срок эффекта: ${user.result_timeframe}\n`;
  if (user.roi_period) {
    context += `- Окупаемость: ${user.roi_period}\n`;
  }
  context += '\n';
  
  // Гарантии
  if (user.guarantees && user.guarantees.length > 0) {
    context += `ГАРАНТИИ:\n`;
    user.guarantees.forEach(g => context += `- ${g}\n`);
    context += '\n';
  }
  
  // Дефицит
  if (user.urgency_enabled) {
    context += `ДЕФИЦИТ (мягко!):\n${user.urgency_text}\n\n`;
  }
  
  // Задача
  context += `ЗАДАЧА:\n`;
  context += `Напиши холодное B2B сообщение для салона ${salon.name} от лица ${user.name}.\n\n`;
  
  context += `СТРУКТУРА (7-10 строк):\n`;
  context += `1. Приветствие (1 строка): "Добрый день! Меня зовут ${user.name}, ${user.position}. Нашёл ${salon.name} в 2ГИС в ${salon.zone}."\n`;
  context += `2. Контекстное наблюдение - боль салона (2 строки)\n`;
  context += `3. Решение + результат: "Помогаю таким салонам ${user.result}."\n`;
  context += `4. Цена + окупаемость (1-2 строки)\n`;
  context += `5. Снятие рисков (если есть)\n`;
  context += `6. CTA: ${user.cta}\n`;
  context += `7. Мягкое закрытие: "Если сейчас неактуально - дайте знать."\n`;
  context += `8. Подпись: "С уважением, ${user.name}"\n\n`;
  
  context += `ПРАВИЛА:\n`;
  context += `✅ Конкретные цифры\n`;
  context += `✅ Привязка цены к ROI\n`;
  context += `✅ Один абзац = одна мысль\n`;
  context += `❌ Не обращайся на "ты"\n`;
  context += `❌ Не ври про опыт\n\n`;
  
  context += `Генерируй:\n`;
  
  return context;
}

module.exports = { SYSTEM_PROMPT, buildSmartPrompt };