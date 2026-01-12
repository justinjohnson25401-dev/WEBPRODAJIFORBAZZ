function validateUserData(userData) {
  const required = ['name', 'service', 'position'];
  
  for (const field of required) {
    if (!userData[field]) {
      return {
        valid: false,
        error: `Поле "${field}" обязательно`
      };
    }
  }
  
  return { valid: true };
}

function checkWarnings(userData) {
  const warnings = [];
  
  // Скидка >70%
  if (userData.discount_percent > 70) {
    warnings.push({
      type: 'discount_too_high',
      message: `Скидка ${userData.discount_percent}% выглядит неправдоподобно. Рекомендуем 20-40%.`
    });
  }
  
  // Большой разрыв цен
  if (userData.entry_price && userData.full_price) {
    const ratio = userData.full_price / userData.entry_price;
    if (ratio > 10) {
      warnings.push({
        type: 'price_gap',
        message: `Разница ${ratio.toFixed(1)}x - клиент может почувствовать агрессивный апсейл.`
      });
    }
  }
  
  // Нет портфолио
  if (!userData.has_portfolio && userData.cta === 'show_examples') {
    warnings.push({
      type: 'portfolio_mismatch',
      message: 'У вас нет портфолио, но CTA "показать примеры". Лучше "обсудить проект".'
    });
  }
  
  return warnings;
}

module.exports = { validateUserData, checkWarnings };