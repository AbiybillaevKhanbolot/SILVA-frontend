// Loyalty page logic
document.addEventListener('DOMContentLoaded', function() {
    const levels = [
        {
            name: "Семечко",
            key: "seed",
            points: 0,
            discount: 0,
            icon: "🌱",
            color: "from-gray-400 to-gray-500",
            short: "Старт программы: баллы начисляются после каждой оплаченной брони.",
            benefits: ["Накопление баллов", "Новости и акции"]
        },
        {
            name: "Росток",
            key: "sprout",
            points: 1000,
            discount: 3,
            icon: "🌿",
            color: "from-lime-400 to-lime-600",
            short: "Персональная скидка и приоритет при появлении новых объектов.",
            benefits: ["Скидка 3%", "Ранний доступ к новым объектам", "Приоритетная поддержка"]
        },
        {
            name: "Саженец",
            key: "sapling",
            points: 3000,
            discount: 6,
            icon: "🌳",
            color: "from-emerald-400 to-emerald-600",
            short: "Выше скидка, гибкая отмена и бонусы к особым датам.",
            benefits: ["Скидка 6%", "Бесплатная отмена", "Подарок на день рождения"]
        },
        {
            name: "Дерево",
            key: "tree",
            points: 7000,
            discount: 10,
            icon: "🌲",
            color: "from-green-500 to-green-700",
            short: "Максимальная скидка, VIP-поддержка и лучшие условия бронирования.",
            benefits: ["Скидка 10%", "Гарантия лучшей цены", "VIP-поддержка 24/7"]
        }
    ];
    
    // Mock user data - replace with actual user data
    const userPoints = 2500;
    const currentLevelIndex = levels.findIndex(function(l, i) {
        var next = levels[i + 1];
        return userPoints >= l.points && (!next || userPoints < next.points);
    });
    const currentLevel = levels[Math.max(0, currentLevelIndex)] || levels[0];
    const nextLevel = levels[levels.indexOf(currentLevel) + 1] || levels[levels.length - 1];
    const progressToNext = nextLevel.points > currentLevel.points 
        ? ((userPoints - currentLevel.points) / (nextLevel.points - currentLevel.points)) * 100
        : 100;
    
    // Render progress card
    const loyaltyProgress = document.getElementById('loyalty-progress');
    if (loyaltyProgress) {
        loyaltyProgress.innerHTML = `
            <div class="loyalty-progress-content">
                <div class="loyalty-level-display">
                    <div class="loyalty-level-emoji">${currentLevel.icon}</div>
                    <h3 class="loyalty-level-name">${currentLevel.name}</h3>
                    <p class="loyalty-level-label">Ваш текущий уровень</p>
                </div>
                
                <div class="loyalty-progress-bar">
                    <div class="loyalty-points-display">
                        <span class="loyalty-points-current">${userPoints.toLocaleString()}</span>
                        <span class="loyalty-points-next">
                            до ${nextLevel.name}: ${(nextLevel.points - userPoints).toLocaleString()} баллов
                        </span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(100, progressToNext)}%"></div>
                    </div>
                    <div class="progress-labels">
                        <span>${currentLevel.points.toLocaleString()}</span>
                        <span>${nextLevel.points.toLocaleString()}</span>
                    </div>
                </div>
                
                <div class="loyalty-discount">
                    <p class="loyalty-discount-label">Ваша скидка</p>
                    <p class="loyalty-discount-value">${currentLevel.discount}%</p>
                </div>
            </div>
        `;
    }
    
    // Карточки уровней: белые плитки на тёмном фоне (вёрстка в loyalty.html)
    const levelsGrid = document.getElementById('levels-grid');
    if (levelsGrid) {
        levelsGrid.innerHTML = levels.map(function(level) {
            var isCurrent = level.key === currentLevel.key;
            var threshold = level.points === 0
                ? 'Стартовый уровень'
                : 'от ' + level.points.toLocaleString('ru-RU') + ' баллов';
            return (
                '<article class="levels-tier-card' + (isCurrent ? ' levels-tier-card--current' : '') + '" data-level-key="' + level.key + '">' +
                    '<span class="levels-tier-pct">' + level.discount + '%</span>' +
                    '<div class="levels-tier-body">' +
                        '<h3 class="levels-tier-name">' + level.name + '</h3>' +
                        '<p class="levels-tier-threshold">' + threshold + '</p>' +
                        '<p class="levels-tier-desc">' + level.short + '</p>' +
                    '</div>' +
                '</article>'
            );
        }).join('');
    }
});

