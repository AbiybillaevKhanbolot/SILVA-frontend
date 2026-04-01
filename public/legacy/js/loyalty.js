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
            benefits: ["Накопление баллов", "Новости и акции"]
        },
        { 
            name: "Росток", 
            key: "sprout",
            points: 1000, 
            discount: 3, 
            icon: "🌿",
            color: "from-lime-400 to-lime-600",
            benefits: ["Скидка 3%", "Ранний доступ к новым объектам", "Приоритетная поддержка"]
        },
        { 
            name: "Саженец", 
            key: "sapling",
            points: 3000, 
            discount: 5, 
            icon: "🌳",
            color: "from-emerald-400 to-emerald-600",
            benefits: ["Скидка 5%", "Бесплатная отмена", "Подарок на день рождения"]
        },
        { 
            name: "Дерево", 
            key: "tree",
            points: 7000, 
            discount: 7, 
            icon: "🌲",
            color: "from-green-500 to-green-700",
            benefits: ["Скидка 7%", "Гарантия лучшей цены", "VIP-поддержка 24/7"]
        },
        { 
            name: "Дуб", 
            key: "oak",
            points: 15000, 
            discount: 10, 
            icon: "🏆",
            color: "from-amber-500 to-amber-700",
            benefits: ["Скидка 10%", "Эксклюзивные объекты", "Персональный менеджер", "Бесплатный апгрейд"]
        },
    ];
    
    // Mock user data - replace with actual user data
    const userPoints = 2500;
    const currentLevelIndex = levels.findIndex(l => userPoints >= l.points && 
        (l.points === 0 || userPoints < levels[levels.indexOf(l) + 1]?.points || levels.indexOf(l) === levels.length - 1));
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
    
    // Render levels
    const levelsGrid = document.getElementById('levels-grid');
    if (levelsGrid) {
        levelsGrid.innerHTML = levels.map((level, index) => {
            const isCurrent = level.key === currentLevel.key;
            const gradientColors = {
                'from-gray-400 to-gray-500': 'linear-gradient(to right, #9ca3af, #6b7280)',
                'from-lime-400 to-lime-600': 'linear-gradient(to right, #a3e635, #16a34a)',
                'from-emerald-400 to-emerald-600': 'linear-gradient(to right, #34d399, #10b981)',
                'from-green-500 to-green-700': 'linear-gradient(to right, #22c55e, #15803d)',
                'from-amber-500 to-amber-700': 'linear-gradient(to right, #f59e0b, #b45309)'
            };
            
            return `
                <div class="level-card ${isCurrent ? 'current' : ''}">
                    <div class="level-emoji">${level.icon}</div>
                    <h3 class="level-name">${level.name}</h3>
                    <p class="level-points">
                        ${level.points > 0 ? `от ${level.points.toLocaleString()} баллов` : 'Начальный уровень'}
                    </p>
                    
                    ${level.discount > 0 ? `
                        <div class="level-discount-badge" style="background: ${gradientColors[level.color]}; display: block;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle;">
                                <polyline points="20 12 20 22 4 22 4 12"></polyline>
                                <rect x="2" y="7" width="20" height="5"></rect>
                                <line x1="12" y1="22" x2="12" y2="7"></line>
                                <path d="M7 7V5a5 5 0 0 1 10 0v2"></path>
                            </svg>
                            Скидка ${level.discount}%
                        </div>
                    ` : ''}
                    
                    <ul class="level-benefits">
                        ${level.benefits.map(benefit => `
                            <li class="level-benefit">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                <span>${benefit}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }).join('');
    }
});

