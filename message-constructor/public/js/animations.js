// ========== АНИМАЦИИ И ВИЗУАЛЬНЫЕ ЭФФЕКТЫ ==========

/**
 * Создаёт частицы на фоне
 */
function initParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;

    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Случайные параметры
        const size = Math.random() * 4 + 2;
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const duration = Math.random() * 20 + 10;
        const delay = Math.random() * 5;
        
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: rgba(99, 102, 241, ${Math.random() * 0.5 + 0.2});
            border-radius: 50%;
            left: ${x}%;
            top: ${y}%;
            animation: float ${duration}s ease-in-out ${delay}s infinite;
            box-shadow: 0 0 ${size * 2}px rgba(99, 102, 241, 0.5);
        `;
        
        particlesContainer.appendChild(particle);
    }

    // Добавляем CSS анимацию
    if (!document.getElementById('particle-animation')) {
        const style = document.createElement('style');
        style.id = 'particle-animation';
        style.textContent = `
            @keyframes float {
                0%, 100% {
                    transform: translate(0, 0) scale(1);
                    opacity: 0.7;
                }
                50% {
                    transform: translate(${Math.random() * 50 - 25}px, ${Math.random() * 50 - 25}px) scale(1.2);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Показывает toast-уведомление
 * @param {string} message - текст
 * @param {string} type - 'success', 'error', 'warning'
 * @param {number} duration - длительность (мс)
 */
function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);

    // Автоудаление
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.4s ease';
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

/**
 * Обновляет прогресс-бар с анимацией
 * @param {number} step - текущий шаг (0-15)
 */
function updateProgress(step) {
    const totalSteps = 15;
    const percent = Math.round((step / totalSteps) * 100);
    
    const progressFill = document.getElementById('progress-fill');
    const progressGlow = document.getElementById('progress-glow');
    const progressText = document.getElementById('progress-text');
    const progressPercent = document.getElementById('progress-percent');
    
    if (progressFill) {
        progressFill.style.width = `${percent}%`;
    }
    
    if (progressGlow && percent < 100) {
        progressGlow.style.opacity = '1';
        progressGlow.style.animation = 'shimmer 2s infinite';
    }
    
    if (progressText) {
        progressText.textContent = `Шаг ${step + 1} из ${totalSteps}`;
    }
    
    if (progressPercent) {
        progressPercent.textContent = `${percent}%`;
    }
}

/**
 * Показывает лоадер с этапами
 * @param {boolean} show - показать/скрыть
 */
function toggleLoader(show) {
    const loader = document.getElementById('loader');
    if (!loader) return;

    if (show) {
        loader.style.display = 'flex';
        
        // Анимация этапов
        const stages = loader.querySelectorAll('.stage');
        stages.forEach((stage, index) => {
            setTimeout(() => {
                stages.forEach(s => s.classList.remove('active'));
                stage.classList.add('active');
            }, index * 2000);
        });
    } else {
        loader.style.display = 'none';
    }
}

/**
 * Анимация счётчика (для лимита генераций)
 * @param {HTMLElement} element
 * @param {number} start
 * @param {number} end
 * @param {number} duration
 */
function animateNumber(element, start, end, duration = 1000) {
    if (!element) return;

    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        
        element.textContent = Math.round(current);
    }, 16);
}

/**
 * Ripple-эффект на кнопке
 * @param {Event} event
 */
function createRipple(event) {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    
    const rect = button.getBoundingClientRect();
    ripple.style.width = ripple.style.height = `${diameter}px`;
    ripple.style.left = `${event.clientX - rect.left - radius}px`;
    ripple.style.top = `${event.clientY - rect.top - radius}px`;
    ripple.classList.add('ripple-effect');
    
    const existingRipple = button.querySelector('.ripple-effect');
    if (existingRipple) {
        existingRipple.remove();
    }
    
    button.appendChild(ripple);
}

// CSS для ripple
if (!document.getElementById('ripple-style')) {
    const style = document.createElement('style');
    style.id = 'ripple-style';
    style.textContent = `
        .ripple-effect {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.5);
            transform: scale(0);
            animation: ripple-animation 0.6s ease-out;
            pointer-events: none;
        }
        
        @keyframes ripple-animation {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Показывает модальное окно с предупреждениями
 * @param {array} warnings - массив предупреждений
 */
function showWarningModal(warnings) {
    const modal = document.getElementById('warning-modal');
    const modalBody = document.getElementById('modal-body');
    
    if (!modal || !modalBody || warnings.length === 0) return;

    modalBody.innerHTML = warnings.map(w => `
        <div class="warning-item">
            <div class="warning-icon">⚠️</div>
            <div class="warning-content">
                <h4>${w.type === 'discount_too_high' ? 'Скидка слишком большая' : 
                      w.type === 'price_gap' ? 'Большой разрыв цен' : 
                      w.type === 'portfolio_mismatch' ? 'Несоответствие портфолио' : 'Предупреждение'}</h4>
                <p>${w.message}</p>
            </div>
        </div>
    `).join('');

    modal.style.display = 'flex';

    // Закрытие модалки
    document.getElementById('modal-close').onclick = () => modal.style.display = 'none';
    document.getElementById('modal-overlay').onclick = () => modal.style.display = 'none';
    document.getElementById('modal-ok').onclick = () => modal.style.display = 'none';
}

/**
 * Обновляет метрики качества сообщения
 * @param {object} metrics
 */
function updateMetrics(metrics) {
    document.getElementById('metric-personalization').textContent = metrics.personalization ? '✅ Есть' : '❌ Нет';
    document.getElementById('metric-numbers').textContent = metrics.numbers + ' шт';
    document.getElementById('metric-risks').textContent = metrics.risks + ' триггеров';
    document.getElementById('metric-length').textContent = metrics.length + ' строк';

    // Обновляем score
    const scoreValue = document.getElementById('score-value');
    const scoreFill = document.getElementById('score-fill');
    
    if (scoreValue && scoreFill) {
        scoreValue.textContent = metrics.score + '%';
        scoreFill.style.width = metrics.score + '%';
    }
}

/**
 * Плавная прокрутка к элементу
 * @param {HTMLElement} element
 */
function smoothScrollTo(element) {
    if (!element) return;
    
    element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    
    // Добавляем ripple на все кнопки
    document.querySelectorAll('.btn, .action-btn').forEach(btn => {
        btn.addEventListener('click', createRipple);
    });
});

// Экспорт функций
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showToast,
        updateProgress,
        toggleLoader,
        animateNumber,
        showWarningModal,
        updateMetrics,
        smoothScrollTo
    };
}