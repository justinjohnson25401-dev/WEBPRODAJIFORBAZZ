// ========== ГЛАВНАЯ ЛОГИКА ПРИЛОЖЕНИЯ ==========

// API URL (Firebase Functions endpoint)
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5001/message-constructor/us-central1/api'  // ✅ ИМЯ ПРОЕКТА
    : '/api';
// Глобальное состояние
const STATE = {
    currentStep: 0,
    totalSteps: 16,  // ✅ фиксированное число (или оставь как есть, если QUESTIONS подгружается)
    formData: {
        salon: {},
        user_answers: {}
    },
    parsedSalon: null,
    generatedMessage: null,
    generationsLeft: 50
};

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 App initialized');
    
    // Проверяем лимит при загрузке
    checkUserLimit();
    
    // Рендерим первый вопрос
    renderQuestion(STATE.currentStep);
    
    // Обновляем прогресс
    updateProgress(STATE.currentStep);
    
    // Навигация
    setupNavigation();
    
    // Вкладки превью
    setupPreviewTabs();
    
    // Кнопки действий
    setupActionButtons();
    
    // Помощь
    setupHelpButton();
});

// ========== ПРОВЕРКА ЛИМИТА ==========
async function checkUserLimit() {
    try {
        const response = await fetch(`${API_URL}/check-limit`);
        const data = await response.json();
        
        STATE.generationsLeft = data.generationsLeft;
        
        const limitBadge = document.getElementById('generations-left');
        if (limitBadge) {
            animateNumber(limitBadge, parseInt(limitBadge.textContent), data.generationsLeft);
        }
        
        // Предупреждение если лимит заканчивается
        if (data.generationsLeft <= 5 && data.generationsLeft > 0) {
            showToast(`Осталось всего ${data.generationsLeft} генераций!`, 'warning', 5000);
        } else if (data.generationsLeft === 0) {
            showToast('Лимит исчерпан! Свяжитесь с поддержкой для увеличения.', 'error', 0);
        }
        
    } catch (error) {
        console.error('Ошибка проверки лимита:', error);
    }
}

// ========== РЕНДЕРИНГ ВОПРОСОВ ==========
function renderQuestion(stepIndex) {
    const question = QUESTIONS[stepIndex];
    if (!question) return;
    
    const container = document.getElementById('questions-container');
    if (!container) return;
    
    // Обновляем заголовок формы
    document.getElementById('form-title').textContent = question.title;
    document.getElementById('form-subtitle').textContent = question.subtitle;
    
    // Генерируем HTML вопроса
    container.innerHTML = renderQuestionHTML(question);
    
    // Восстанавливаем сохранённые значения
    restoreQuestionValues(question);
    
    // Показываем совет если есть
    if (question.tip) {
        showTip(question.tip);
    } else {
        hideTip();
    }
    
    // Специальная логика для вопроса 0 (парсинг Excel)
    if (question.id === 0) {
        setupExcelParser();
    }
    
    // Обработка условных полей
    setupConditionalFields(question);
    
    // Live preview
    setupLivePreview();
}

function renderQuestionHTML(question) {
    switch (question.type) {
        case 'text':
        case 'number':
            return renderTextInput(question);
        
        case 'textarea':
            return renderTextarea(question);
        
        case 'select':
            return renderSelect(question);
        
        case 'radio':
            return renderRadio(question);
        
        case 'checkbox-group':
            return renderCheckboxGroup(question);
        
        case 'grid':
            return renderGrid(question);
        
        case 'pricing':
            return renderPricing(question);
        
        case 'discount':
            return renderDiscount(question);
        
        case 'urgency':
            return renderUrgency(question);
        
        default:
            return '<p>Неизвестный тип вопроса</p>';
    }
}

// ========== ТИПЫ ВОПРОСОВ ==========

function renderTextInput(question) {
    return `
        <div class="question">
            <label for="${question.key}">${question.label || question.title}</label>
            <input 
                type="${question.type}" 
                id="${question.key}" 
                name="${question.key}"
                placeholder="${question.placeholder || ''}"
                ${question.required ? 'required' : ''}
                ${question.maxLength ? `maxlength="${question.maxLength}"` : ''}
                ${question.min !== undefined ? `min="${question.min}"` : ''}
                ${question.max !== undefined ? `max="${question.max}"` : ''}
            />
            ${question.hint ? `<span class="hint">${question.hint}</span>` : ''}
        </div>
    `;
}

function renderTextarea(question) {
    return `
        <div class="question">
            <label for="${question.key}">${question.label || question.title}</label>
            <textarea 
                id="${question.key}" 
                name="${question.key}"
                placeholder="${question.placeholder || ''}"
                rows="${question.rows || 4}"
                ${question.required ? 'required' : ''}
                ${question.maxLength ? `maxlength="${question.maxLength}"` : ''}
            ></textarea>
            ${question.hint ? `<span class="hint">${question.hint}</span>` : ''}
            <div id="${question.key}-preview" class="salon-preview"></div>
        </div>
    `;
}

function renderSelect(question) {
    return `
        <div class="question">
            <label for="${question.key}">${question.label || question.title}</label>
            <select id="${question.key}" name="${question.key}" ${question.required ? 'required' : ''}>
                <option value="">Выберите...</option>
                ${question.options.map(opt => `
                    <option value="${opt.value}">${opt.label}</option>
                `).join('')}
            </select>
            ${question.hint ? `<span class="hint">${question.hint}</span>` : ''}
            ${question.conditionalField ? `
                <div id="${question.key}-conditional" style="display: none; margin-top: 16px;">
                    ${renderTextInput({
                        ...question.conditionalField.field,
                        key: `${question.key}_custom`
                    })}
                </div>
            ` : ''}
        </div>
    `;
}

function renderRadio(question) {
    return `
        <div class="question">
            <label>${question.label || question.title}</label>
            <div class="radio-group">
                ${question.options.map(opt => `
                    <label class="radio-item ${opt.disabled && opt.disabled(STATE.formData.user_answers) ? 'disabled' : ''}">
                        <input 
                            type="radio" 
                            name="${question.key}" 
                            value="${opt.value}"
                            ${question.required ? 'required' : ''}
                            ${opt.disabled && opt.disabled(STATE.formData.user_answers) ? 'disabled' : ''}
                        />
                        <div class="radio-content">
                            <div class="radio-label">${opt.label}</div>
                            ${opt.description ? `<div class="radio-description">${opt.description}</div>` : ''}
                        </div>
                    </label>
                `).join('')}
            </div>
            ${question.hint ? `<span class="hint">${question.hint}</span>` : ''}
        </div>
    `;
}

function renderCheckboxGroup(question) {
    return `
        <div class="question">
            <label>${question.label || question.title}</label>
            ${question.maxSelect ? `<span class="hint">Выберите до ${question.maxSelect} вариантов</span>` : ''}
            <div class="checkbox-group">
                ${question.options.map(opt => `
                    <label class="checkbox-item">
                        <input 
                            type="checkbox" 
                            name="${question.key}" 
                            value="${opt.value}"
                            data-label="${opt.label}"
                        />
                        <span class="checkbox-label">${opt.label}</span>
                        ${opt.hasInput ? `
                            <input 
                                type="text" 
                                class="checkbox-input" 
                                placeholder="${opt.inputPlaceholder || ''}"
                                data-for="${opt.value}"
                                style="display: none;"
                            />
                        ` : ''}
                    </label>
                `).join('')}
            </div>
            ${question.hint ? `<span class="hint" style="margin-top: 12px; display: block;">${question.hint}</span>` : ''}
        </div>
    `;
}

function renderGrid(question) {
    return `
        <div class="question">
            <label>${question.label || question.title}</label>
            <div class="grid-fields">
                ${question.fields.map(field => `
                    <div class="grid-field">
                        <label for="${field.key}">${field.label}</label>
                        <input 
                            type="${field.type}" 
                            id="${field.key}" 
                            name="${field.key}"
                            placeholder="${field.placeholder || ''}"
                            ${field.min !== undefined ? `min="${field.min}"` : ''}
                            ${field.max !== undefined ? `max="${field.max}"` : ''}
                            ${field.required ? 'required' : ''}
                        />
                        ${field.hint ? `<span class="hint">${field.hint}</span>` : ''}
                    </div>
                `).join('')}
            </div>
            ${question.hint ? `<span class="hint" style="margin-top: 12px;">${question.hint}</span>` : ''}
        </div>
    `;
}

function renderPricing(question) {
    return `
        <div class="question">
            <label>${question.label || question.title}</label>
            <div class="pricing-fields">
                ${question.fields.map(field => `
                    <div class="pricing-field ${field.conditional ? 'conditional-field' : ''}" 
                         data-condition="${field.conditional ? JSON.stringify(field.conditional) : ''}">
                        <label for="${field.key}">${field.label}</label>
                        <div class="input-with-suffix">
                            <input 
                                type="${field.type}" 
                                id="${field.key}" 
                                name="${field.key}"
                                placeholder="${field.placeholder || ''}"
                                ${field.min !== undefined ? `min="${field.min}"` : ''}
                                ${field.max !== undefined ? `max="${field.max}"` : ''}
                                ${field.required ? 'required' : ''}
                            />
                            ${field.suffix ? `<span class="input-suffix">${field.suffix}</span>` : ''}
                        </div>
                        ${field.hint ? `<span class="hint">${field.hint}</span>` : ''}
                    </div>
                `).join('')}
            </div>
            ${question.hint ? `<span class="hint" style="margin-top: 12px;">${question.hint}</span>` : ''}
        </div>
    `;
}

function renderDiscount(question) {
    return `
        <div class="question">
            <label>${question.label || question.title}</label>
            <div class="discount-fields">
                ${question.fields.map(field => {
                    if (field.type === 'checkbox') {
                        return `
                            <label class="checkbox-toggle">
                                <input type="checkbox" id="${field.key}" name="${field.key}" />
                                <span>${field.label}</span>
                            </label>
                        `;
                    } else {
                        return `
                            <div class="discount-field ${field.conditional ? 'conditional-field' : ''}" 
                                 data-condition="${field.conditional ? JSON.stringify(field.conditional) : ''}"
                                 style="${field.conditional ? 'display: none;' : ''}">
                                <label for="${field.key}">${field.label}</label>
                                <div class="input-with-suffix">
                                    <input 
                                        type="${field.type}" 
                                        id="${field.key}" 
                                        name="${field.key}"
                                        placeholder="${field.placeholder || ''}"
                                        ${field.min !== undefined ? `min="${field.min}"` : ''}
                                        ${field.max !== undefined ? `max="${field.max}"` : ''}
                                        ${field.maxLength ? `maxlength="${field.maxLength}"` : ''}
                                    />
                                    ${field.suffix ? `<span class="input-suffix">${field.suffix}</span>` : ''}
                                </div>
                            </div>
                        `;
                    }
                }).join('')}
            </div>
            ${question.warning ? `
                <div class="warning-box" id="discount-warning" style="display: none;">
                    ⚠️ ${question.warning.message}
                </div>
            ` : ''}
            ${question.hint ? `<span class="hint" style="margin-top: 12px;">${question.hint}</span>` : ''}
        </div>
    `;
}

function renderUrgency(question) {
    return renderDiscount(question); // Похожая структура
}

// ========== ПАРСЕР EXCEL ==========
function setupExcelParser() {
    const textarea = document.getElementById('salon_data');
    if (!textarea) return;
    
    textarea.addEventListener('input', (e) => {
        const rawText = e.target.value;
        
        if (rawText.length > 50) {
            const salon = parseExcelRow(rawText);
            
            if (salon && salon.name) {
                STATE.parsedSalon = salon;
                STATE.formData.salon = salon;
                
                // Показываем превью
                const preview = document.getElementById('salon_data-preview');
                if (preview) {
                    preview.innerHTML = renderSalonPreview(salon);
                    preview.style.display = 'block';
                }
                
                // Обновляем live preview
                updateLivePreview();
                
                showToast('✅ Салон распознан!', 'success');
            }
        }
    });
}

// ========== УСЛОВНЫЕ ПОЛЯ ==========
function setupConditionalFields(question) {
    if (question.conditionalField) {
        const select = document.getElementById(question.key);
        const conditional = document.getElementById(`${question.key}-conditional`);
        
        if (select && conditional) {
            select.addEventListener('change', () => {
                conditional.style.display = select.value === question.conditionalField.dependsOn ? 'block' : 'none';
            });
        }
    }
    
    // Для conditional полей в pricing/discount
    document.querySelectorAll('.conditional-field').forEach(field => {
        const condition = JSON.parse(field.dataset.condition || '{}');
        if (condition.field) {
            const trigger = document.getElementById(condition.field);
            if (trigger) {
                trigger.addEventListener('change', () => {
                    const shouldShow = trigger.type === 'checkbox' 
                        ? trigger.checked 
                        : trigger.value === condition.value;
                    field.style.display = shouldShow ? 'block' : 'none';
                });
            }
        }
    });
    
    // Для checkbox с дополнительными input
    document.querySelectorAll('.checkbox-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const input = checkbox.parentElement.querySelector('.checkbox-input');
            if (input) {
                input.style.display = checkbox.checked ? 'inline-block' : 'none';
            }
        });
    });
}

// ========== LIVE PREVIEW ==========
function setupLivePreview() {
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', debounce(updateLivePreview, 500));
        input.addEventListener('change', updateLivePreview);
    });
}

function updateLivePreview() {
    // Собираем текущие данные
    collectCurrentStepData();
    
    // Если есть базовые данные - генерируем превью
    if (STATE.parsedSalon && STATE.formData.user_answers.name) {
        const preview = generatePreviewMessage();
        const previewElement = document.getElementById('message-preview');
        
        if (previewElement && preview) {
            previewElement.innerHTML = `<pre class="preview-text">${preview}</pre>`;
            
            // Обновляем метрики
            updatePreviewMetrics(preview);
        }
    }
}

function generatePreviewMessage() {
    const salon = STATE.parsedSalon;
    const user = STATE.formData.user_answers;
    
    if (!salon || !user.name) return null;
    
    // Простой шаблон для превью (полная генерация будет через AI)
    let preview = `Добрый день!\n\n`;
    preview += `Меня зовут ${user.name}`;
    
    if (user.position) {
        const positionText = user.position === 'custom' ? user.position_custom : user.position;
        preview += `, ${positionText}`;
    }
    
    preview += `. ${generateGreeting(salon)}\n\n`;
    
    if (identifySalonPain(salon, user.service)) {
        preview += identifySalonPain(salon, user.service).text + '\n\n';
    }
    
    if (user.result) {
        preview += `Помогаю таким салонам ${user.result}.\n\n`;
    }
    
    if (user.entry_price) {
        if (user.discount_enabled && user.discount_percent) {
            const oldPrice = Math.round(user.entry_price / (1 - user.discount_percent/100));
            preview += `Обычная цена ${oldPrice}₽, сейчас ${user.entry_price}₽`;
            if (user.discount_condition) {
                preview += ` (${user.discount_condition})`;
            }
            preview += '.\n\n';
        } else {
            preview += `Цена: ${user.entry_price}₽.\n\n`;
        }
    }
    
    if (user.cta) {
        const ctaTexts = {
            'show_examples': 'Могу показать примеры работ.',
            'call_15min': 'Готов созвониться на 10-15 минут.',
            'free_audit': 'Могу сделать бесплатный аудит.',
            'free_prototype': 'Могу сделать бесплатный прототип.',
            'send_proposal': 'Вышлю детальное предложение.'
        };
        preview += ctaTexts[user.cta] + '\n\n';
    }
    
    if (user.tone !== 'business') {
        preview += 'Если сейчас неактуально - просто дайте знать.\n\n';
    }
    
    preview += `С уважением,\n${user.name}`;
    
    return preview;
}

function updatePreviewMetrics(text) {
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const hasNumbers = /\d/.test(text);
    const hasPersonalization = STATE.parsedSalon && text.includes(STATE.parsedSalon.name);
    
    const guarantees = STATE.formData.user_answers.guarantees || [];
    
    const metrics = {
        personalization: hasPersonalization,
        numbers: (text.match(/\d+/g) || []).length,
        risks: guarantees.length,
        length: lines.length,
        score: calculateScore(text)
    };
    
    updateMetrics(metrics);
}

function calculateScore(text) {
    let score = 50; // базовый
    
    if (STATE.parsedSalon && text.includes(STATE.parsedSalon.name)) score += 15;
    if (/\d/.test(text)) score += 15;
    if ((STATE.formData.user_answers.guarantees || []).length > 0) score += 10;
    if (text.split('\n').filter(l => l.trim()).length >= 7 && text.split('\n').filter(l => l.trim()).length <= 10) score += 10;
    
    return Math.min(score, 100);
}

// ========== НАВИГАЦИЯ ==========
function setupNavigation() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const generateBtn = document.getElementById('generate-btn');
    const form = document.getElementById('main-form');
    
    prevBtn.addEventListener('click', () => {
        if (STATE.currentStep > 0) {
            collectCurrentStepData();
            STATE.currentStep--;
            renderQuestion(STATE.currentStep);
            updateProgress(STATE.currentStep);
            updateNavigationButtons();
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (validateCurrentStep()) {
            collectCurrentStepData();
            STATE.currentStep++;
            renderQuestion(STATE.currentStep);
            updateProgress(STATE.currentStep);
            updateNavigationButtons();
            smoothScrollTo(document.querySelector('.form-panel'));
        }
    });
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (validateCurrentStep()) {
            collectCurrentStepData();
            await generateMessage();
        }
    });
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const generateBtn = document.getElementById('generate-btn');
    
    prevBtn.disabled = STATE.currentStep === 0;
    
    if (STATE.currentStep === STATE.totalSteps - 1) {
        nextBtn.style.display = 'none';
        generateBtn.style.display = 'flex';
    } else {
        nextBtn.style.display = 'flex';
        generateBtn.style.display = 'none';
    }
}

function validateCurrentStep() {
    const question = QUESTIONS[STATE.currentStep];
    const requiredInputs = document.querySelectorAll('[required]');
    
    for (let input of requiredInputs) {
        if (!input.value || input.value.trim() === '') {
            showToast('Заполните обязательные поля', 'error');
            input.focus();
            return false;
        }
        
        // Кастомная валидация
        if (question.validation) {
            const result = question.validation(input.value);
            if (result !== true) {
                showToast(result, 'error');
                input.focus();
                return false;
            }
        }
    }
    
    return true;
}

function collectCurrentStepData() {
    const question = QUESTIONS[STATE.currentStep];
    
    if (question.type === 'checkbox-group') {
        const checked = Array.from(document.querySelectorAll(`input[name="${question.key}"]:checked`));
        STATE.formData.user_answers[question.key] = checked.map(cb => {
            const value = cb.value;
            const input = document.querySelector(`.checkbox-input[data-for="${value}"]`);
            return {
                value,
                label: cb.dataset.label,
                input: input ? input.value : null
            };
        });
    } else if (question.type === 'radio') {
        const selected = document.querySelector(`input[name="${question.key}"]:checked`);
        if (selected) {
            STATE.formData.user_answers[question.key] = selected.value;
        }
    } else if (question.type === 'grid' || question.type === 'pricing') {
        question.fields.forEach(field => {
            const input = document.getElementById(field.key);
            if (input) {
                STATE.formData.user_answers[field.key] = input.value;
            }
        });
    } else {
        const input = document.getElementById(question.key);
        if (input) {
            STATE.formData.user_answers[question.key] = input.value;
        }
    }
}

function restoreQuestionValues(question) {
    if (question.type === 'checkbox-group') {
        const saved = STATE.formData.user_answers[question.key] || [];
        saved.forEach(item => {
            const checkbox = document.querySelector(`input[name="${question.key}"][value="${item.value}"]`);
            if (checkbox) {
                checkbox.checked = true;
                if (item.input) {
                    const input = document.querySelector(`.checkbox-input[data-for="${item.value}"]`);
                    if (input) {
                        input.value = item.input;
                        input.style.display = 'inline-block';
                    }
                }
            }
        });
    } else if (question.type === 'radio') {
        const saved = STATE.formData.user_answers[question.key];
        if (saved) {
            const radio = document.querySelector(`input[name="${question.key}"][value="${saved}"]`);
            if (radio) radio.checked = true;
        }
    } else if (question.type === 'grid' || question.type === 'pricing') {
        question.fields.forEach(field => {
            const input = document.getElementById(field.key);
            const saved = STATE.formData.user_answers[field.key];
            if (input && saved) {
                input.value = saved;
            }
        });
    } else {
        const input = document.getElementById(question.key);
        const saved = STATE.formData.user_answers[question.key];
        if (input && saved) {
            input.value = saved;
        }
    }
}

// ========== ГЕНЕРАЦИЯ СООБЩЕНИЯ ==========
async function generateMessage() {
    if (STATE.generationsLeft <= 0) {
        showToast('Лимит генераций исчерпан!', 'error', 5000);
        return;
    }
    
    toggleLoader(true);
    
    try {
        const response = await fetch(`${API_URL}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(STATE.formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            STATE.generatedMessage = data.message;
            STATE.generationsLeft = data.generationsLeft;
            
            // Показываем результат
            displayGeneratedMessage(data.message);
            
            // Обновляем лимит
            document.getElementById('generations-left').textContent = data.generationsLeft;
            
            // Предупреждения
            if (data.warnings && data.warnings.length > 0) {
                setTimeout(() => showWarningModal(data.warnings), 500);
            }
            
            showToast('✅ Сообщение создано!', 'success');
            
        } else {
            showToast('Ошибка: ' + data.message, 'error');
        }
        
    } catch (error) {
        console.error('Ошибка генерации:', error);
        showToast('Ошибка сети. Попробуйте ещё раз.', 'error');
    } finally {
        toggleLoader(false);
    }
}

function displayGeneratedMessage(message) {
    const preview = document.getElementById('message-preview');
    const actions = document.getElementById('actions-panel');
    
    if (preview) {
        preview.innerHTML = `<pre class="generated-text">${message}</pre>`;
    }
    
    if (actions) {
        actions.style.display = 'flex';
    }
    
    // Переключаемся на вкладку сообщения
    document.querySelector('.tab[data-tab="message"]').click();
    
    // Обновляем метрики
    updatePreviewMetrics(message);
    
    // Скроллим к превью
    smoothScrollTo(document.querySelector('.preview-panel'));
}

// ========== ДЕЙСТВИЯ ==========
function setupActionButtons() {
    // Копирование
    document.getElementById('copy-btn')?.addEventListener('click', async () => {
        if (STATE.generatedMessage) {
            try {
                await navigator.clipboard.writeText(STATE.generatedMessage);
                showToast('✅ Скопировано в буфер!', 'success');
                
                // Анимация кнопки
                const btn = document.getElementById('copy-btn');
                btn.classList.add('success-pulse');
                setTimeout(() => btn.classList.remove('success-pulse'), 600);
            } catch (error) {
                showToast('Ошибка копирования', 'error');
            }
        }
    });
    
    // Генерация вариации
    document.getElementById('variation-btn')?.addEventListener('click', async () => {
        if (!STATE.generatedMessage) return;
        
        toggleLoader(true);
        
        try {
            const response = await fetch(`${API_URL}/generate-variation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ original_message: STATE.generatedMessage })
            });
            
            const data = await response.json();
            
            if (data.success) {
                STATE.generatedMessage = data.message;
                displayGeneratedMessage(data.message);
                showToast('✨ Новый вариант готов!', 'success');
            }
            
        } catch (error) {
            showToast('Ошибка генерации вариации', 'error');
        } finally {
            toggleLoader(false);
        }
    });
    
    // Начать заново
    document.getElementById('restart-btn')?.addEventListener('click', () => {
        if (confirm('Начать заново? Все данные будут сброшены.')) {
            STATE.currentStep = 0;
            STATE.formData = { salon: {}, user_answers: {} };
            STATE.parsedSalon = null;
            STATE.generatedMessage = null;
            
            renderQuestion(0);
            updateProgress(0);
            updateNavigationButtons();
            
            document.getElementById('actions-panel').style.display = 'none';
            
            showToast('🔄 Форма очищена', 'success');
        }
    });
}

// ========== ВКЛАДКИ ==========
function setupPreviewTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Переключаем активную вкладку
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Показываем контент
            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = 'none';
            });
            document.getElementById(`tab-${targetTab}`).style.display = 'block';
        });
    });
}

// ========== ПОМОЩЬ ==========
function setupHelpButton() {
    document.getElementById('help-btn')?.addEventListener('click', () => {
        showHelpModal();
    });
}

function showHelpModal() {
    // Можно добавить модальное окно с помощью
    showToast('💡 Совет: заполняйте все поля честно - это улучшит качество сообщения', 'success', 5000);
}

// ========== СОВЕТЫ ==========
function showTip(text) {
    const card = document.getElementById('tips-card');
    const tipText = document.getElementById('tip-text');
    
    if (card && tipText) {
        tipText.textContent = text;
        card.style.display = 'flex';
    }
}

function hideTip() {
    const card = document.getElementById('tips-card');
    if (card) {
        card.style.display = 'none';
    }
}

// ========== УТИЛИТЫ ==========
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Добавляем CSS для success-pulse
const style = document.createElement('style');
style.textContent = `
    .success-pulse {
        animation: successPulse 0.6s ease;
    }
    
    @keyframes successPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); box-shadow: 0 0 30px rgba(16, 185, 129, 0.6); }
    }
    
    .generated-text {
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        line-height: 1.7;
        white-space: pre-wrap;
        word-wrap: break-word;
        color: var(--text-primary);
    }
    
    .preview-text {
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        line-height: 1.6;
        white-space: pre-wrap;
        color: var(--text-secondary);
        opacity: 0.8;
    }
    
    .grid-fields {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
    }
    
    .pricing-fields, .discount-fields {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
    
    .input-with-suffix {
        position: relative;
    }
    
    .input-suffix {
        position: absolute;
        right: 14px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-muted);
        font-size: 14px;
        pointer-events: none;
    }
    
    .checkbox-toggle {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px;
        background: var(--bg-tertiary);
        border: 2px solid var(--border-color);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s;
    }
    
    .checkbox-toggle:hover {
        border-color: var(--accent-primary);
    }
    
    .warning-box {
        padding: 16px;
        background: rgba(245, 158, 11, 0.1);
        border: 1px solid rgba(245, 158, 11, 0.3);
        border-radius: 12px;
        color: var(--warning);
        font-size: 14px;
        margin-top: 16px;
    }
    
    .radio-group {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    
    .radio-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px;
        background: var(--bg-tertiary);
        border: 2px solid var(--border-color);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s;
    }
    
    .radio-item:hover:not(.disabled) {
        border-color: var(--accent-primary);
        background: rgba(99, 102, 241, 0.05);
    }
    
    .radio-item.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .radio-item input[type="radio"] {
        margin-top: 2px;
    }
    
    .radio-content {
        flex: 1;
    }
    
    .radio-label {
        font-weight: 600;
        margin-bottom: 4px;
    }
    
    .radio-description {
        font-size: 13px;
        color: var(--text-secondary);
    }
`;
document.head.appendChild(style);