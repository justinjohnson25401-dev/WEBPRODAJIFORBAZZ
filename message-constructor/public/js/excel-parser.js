// ========== ПАРСЕР ДАННЫХ САЛОНА ИЗ EXCEL ==========

/**
 * Парсит строку из Excel с данными салона
 * Формат: табуляция между ячейками
 * @param {string} rawText - скопированная строка из Excel
 * @returns {object} - распарсенные данные салона
 */
function parseExcelRow(rawText) {
    if (!rawText || rawText.trim().length === 0) {
        return null;
    }

    // Разделяем по табуляции
    const cells = rawText.split('\t').map(cell => cell.trim());

    // Маппинг колонок (из файла Moscow_SalonKrasoty_PACK_01.xlsx)
    const salon = {
        name: cells[0] || '',
        category: cells[1] || '',
        specialization: cells[2] || '',
        address: cells[3] || '',
        phones: cells[4] || '',
        email: cells[5] || '',
        has_site: cells[6] && cells[6] !== '' && cells[6] !== 'nan' && cells[6] !== 'NaN',
        schedule: cells[7] || '',
        telegram: cells[8] || '',
        telegram_username: cells[9] || '',
        vk: cells[10] || '',
        whatsapp: cells[11] || '',
        rating: parseFloat(cells[15]) || null,
        reviews_count: parseInt(cells[17]) || null,
        distance_from_center: parseFloat(cells[18]) || null,
        zone: cells[19] || '',
        latitude: parseFloat(cells[20]) || null,
        longitude: parseFloat(cells[21]) || null,
        collection_date: cells[22] || ''
    };

    return salon;
}

/**
 * Определяет контекстную боль салона на основе данных
 * @param {object} salon - данные салона
 * @param {string} service - выбранная услуга
 * @returns {string} - текст боли
 */
function identifySalonPain(salon, service) {
    const pains = [];

    // Боль 1: Нет рейтинга (новый салон)
    if (!salon.rating || salon.reviews_count === 0) {
        pains.push({
            severity: 'high',
            text: 'Салон недавно на рынке - самое время выстроить цифровую инфраструктуру',
            reason: 'new_business'
        });
    }

    // Боль 2: Нет сайта (для услуги "сайт")
    if (!salon.has_site && service === 'website') {
        const zoneText = salon.zone === 'Центр' ? 'работаете в центре' : 'конкуренция растёт';
        pains.push({
            severity: 'critical',
            text: `Пока нет сайта, хотя ${zoneText} - теряете клиентов из Яндекса/Google`,
            reason: 'no_website'
        });
    }

    // Боль 3: Высокий рейтинг (нужна автоматизация)
    if (salon.rating >= 4.5 && salon.reviews_count > 50) {
        pains.push({
            severity: 'medium',
            text: `Отличный рейтинг ${salon.rating} и ${salon.reviews_count} отзывов - бизнес идёт, пора автоматизировать процессы`,
            reason: 'scaling_needed'
        });
    }

    // Боль 4: Средний рейтинг (можно улучшить)
    if (salon.rating && salon.rating < 4.0 && salon.reviews_count > 10) {
        pains.push({
            severity: 'high',
            text: `Рейтинг ${salon.rating} можно поднять - правильная система работы с клиентами поможет`,
            reason: 'low_rating'
        });
    }

    // Боль 5: Мало отзывов (нужно больше активности)
    if (salon.rating && salon.reviews_count < 10) {
        pains.push({
            severity: 'medium',
            text: 'Хороший старт, но отзывов пока немного - нужна система для активации клиентов',
            reason: 'few_reviews'
        });
    }

    // Боль 6: Центр Москвы (дорогая аудитория)
    if (salon.zone === 'Центр') {
        pains.push({
            severity: 'medium',
            text: 'Центр - дорогая аудитория, которая ищет салоны в интернете. Важно быть видимым.',
            reason: 'premium_location'
        });
    }

    // Возвращаем самую критичную боль
    const sorted = pains.sort((a, b) => {
        const severity = { critical: 3, high: 2, medium: 1 };
        return severity[b.severity] - severity[a.severity];
    });

    return sorted[0] || { text: 'Нашёл ваш салон в 2ГИС', reason: 'generic' };
}

/**
 * Генерирует персонализированное приветствие
 * @param {object} salon - данные салона
 * @returns {string}
 */
function generateGreeting(salon) {
    const parts = [`Нашёл ${salon.name}`];

    if (salon.address) {
        // Извлекаем улицу из адреса
        const street = salon.address.replace('Москва, ', '').split(',')[0];
        parts.push(`на ${street}`);
    }

    if (salon.zone) {
        const zoneText = salon.zone.toLowerCase();
        parts.push(`в ${zoneText}`);
    }

    return parts.join(' ') + '.';
}

/**
 * Предпросмотр распарсенных данных (для UI)
 * @param {object} salon
 * @returns {string} HTML
 */
function renderSalonPreview(salon) {
    if (!salon) return '';

    return `
        <div class="salon-preview-card">
            <h4>✅ Салон распознан</h4>
            <div class="salon-info">
                <div class="info-row">
                    <span class="label">Название:</span>
                    <span class="value">${salon.name}</span>
                </div>
                <div class="info-row">
                    <span class="label">Категория:</span>
                    <span class="value">${salon.category}</span>
                </div>
                ${salon.address ? `
                <div class="info-row">
                    <span class="label">Адрес:</span>
                    <span class="value">${salon.address}</span>
                </div>
                ` : ''}
                <div class="info-row">
                    <span class="label">Зона:</span>
                    <span class="value">${salon.zone || 'не указано'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Рейтинг:</span>
                    <span class="value">${salon.rating ? `⭐ ${salon.rating} (${salon.reviews_count} отзывов)` : '❌ Нет данных'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Есть сайт:</span>
                    <span class="value">${salon.has_site ? '✅ Да' : '❌ Нет'}</span>
                </div>
                ${salon.telegram_username ? `
                <div class="info-row">
                    <span class="label">Telegram:</span>
                    <span class="value">${salon.telegram_username}</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Экспорт функций
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseExcelRow,
        identifySalonPain,
        generateGreeting,
        renderSalonPreview
    };
}