class QuestManager {
    constructor(firebaseManager) {
        this.firebaseManager = firebaseManager;
        this.currentQuest = null;
        this.player = {
            level: 1,
            xp: 0,
            streak: 0,
            lastActivity: null,
            totalDays: 1,
            totalXP: 0,
            questsCompleted: 0
        };
        this.dailyReset = {
            lastReset: new Date().toDateString(),
            todaysProgress: {}
        };
        
        // Theme system - this is what UIManager uses
        this.decorations = {
            unlockedThemes: new Set(['default']),
            currentTheme: 'default',
            unlockedDecorations: new Set()
        };
    }

    // Theme unlock conditions - based on level progression
    getThemeUnlockConditions() {
        return {
            'default': { type: 'level', value: 1, description: 'Starting theme' },
            'cafe': { type: 'streak', value: 1, description: '1-day streak' },
            'pond': { type: 'level', value: 1, description: 'Reach Level 2' },
            'forest': { type: 'level', value: 1, description: 'Reach Level 4' },
            'sunset': { type: 'level', value: 1, description: 'Reach Level 5' },
            'space': { type: 'level', value: 1, description: 'Reach Level 6' },
            'mountain': { type: 'streak', value: 1, description: '10-day streak' },
            'beach': { type: 'quests_completed', value: 1, description: 'Complete 2 quests' },
            'library': { type: 'total_xp', value: 10, description: 'Earn 5000 XP' }
        };
    }

    // Check for theme unlocks when progress is made
    checkThemeUnlocks() {
        const conditions = this.getThemeUnlockConditions();
        let newUnlocks = [];

        Object.entries(conditions).forEach(([theme, condition]) => {
            if (!this.decorations.unlockedThemes.has(theme)) {
                let conditionMet = false;
                
                switch (condition.type) {
                    case 'level':
                        conditionMet = this.player.level >= condition.value;
                        break;
                    case 'streak':
                        conditionMet = this.player.streak >= condition.value;
                        break;
                    case 'quests_completed':
                        conditionMet = this.player.questsCompleted >= condition.value;
                        break;
                    case 'total_xp':
                        conditionMet = this.player.totalXP >= condition.value;
                        break;
                }

                if (conditionMet) {
                    this.decorations.unlockedThemes.add(theme);
                    newUnlocks.push({
                        name: theme,
                        displayName: this.getThemeDisplayName(theme),
                        condition: condition.description
                    });
                }
            }
        });

        return newUnlocks;
    }

    // Apply a theme - updates both QuestManager and UI
    applyTheme(themeName) {
        if (!this.decorations.unlockedThemes.has(themeName)) return false;
        
        this.decorations.currentTheme = themeName;
        this.saveToFirebase();
        return true;
    }

    // Get available themes for UI - this is what UIManager calls
    getAvailableThemes() {
        const conditions = this.getThemeUnlockConditions();
        return Object.keys(conditions).map(theme => ({
            name: theme,
            displayName: this.getThemeDisplayName(theme),
            unlocked: this.decorations.unlockedThemes.has(theme),
            condition: conditions[theme],
            icon: this.getThemeIcon(theme)
        }));
    }

    // Get display name for themes
    getThemeDisplayName(themeName) {
        const names = {
            'default': 'Original Grid',
            'cafe': 'Cafe',
            'pond': 'Pond', 
            'forest': 'Forest',
            'sunset': 'Sunset',
            'space': 'Space',
            'mountain': 'Mountain',
            'beach': 'Beach',
            'library': 'Library'
        };
        return names[themeName] || themeName;
    }

    // Get icons for themes
    getThemeIcon(themeName) {
        const icons = {
            'default': '🔳',
            'cafe': '☕',
            'pond': '💧',
            'forest': '🌲',
            'sunset': '🌅',
            'space': '🚀',
            'mountain': '⛰️',
            'beach': '🏖️',
            'library': '📚'
        };
        return icons[themeName] || '🎨';
    }

    // Safety check for Firebase
    isReadyForFirebase() {
        return this.currentQuest && 
               this.currentQuest.title && 
               this.currentQuest.stages && 
               Array.isArray(this.currentQuest.stages);
    }

    createQuest(title, stages) {
        this.currentQuest = {
            title: title,
            stages: stages.map((stage, index) => ({
                id: index + 1,
                title: stage.title,
                steps: stage.steps.map((step, stepIndex) => ({
                    id: stepIndex + 1,
                    title: step,
                    completed: false,
                    completedToday: false,
                    isDaily: false,
                    xp: this.calculateStepXP(stage.steps.length)
                })),
                completed: false,
                unlocked: true
            })),
            startedAt: new Date().toISOString(),
            completed: false,
            currentDay: 1
        };
        
        this.player.totalDays = 1;
        
        this.initializeDailyReset();
        
        // Save to Firebase with safety check
        setTimeout(() => {
            this.saveToFirebase();
        }, 100);
        
        return this.currentQuest;
    }

    initializeDailyReset() {
        this.dailyReset = {
            lastReset: new Date().toDateString(),
            todaysProgress: {}
        };
        
        if (this.currentQuest) {
            this.currentQuest.stages.forEach(chapter => {
                chapter.steps.forEach(step => {
                    if (step.isDaily) {
                        step.completedToday = false;
                    }
                });
            });
        }
    }

    checkDailyReset() {
        const today = new Date().toDateString();
        if (this.dailyReset.lastReset !== today) {
            this.dailyReset.lastReset = today;
            this.dailyReset.todaysProgress = {};
            
            this.currentQuest.currentDay++;
            
            // Calculate total days based on start date
            if (this.currentQuest && this.currentQuest.startedAt) {
                const startDate = new Date(this.currentQuest.startedAt);
                const currentDate = new Date();
                const timeDiff = currentDate - startDate;
                this.player.totalDays = Math.max(1, Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1);
            }
            
            if (this.currentQuest) {
                this.currentQuest.stages.forEach(chapter => {
                    chapter.steps.forEach(step => {
                        if (step.isDaily) {
                            step.completedToday = false;
                        }
                    });
                });
            }
            
            this.saveToFirebase();
            return true;
        }
        return false;
    }

    calculateStepXP(totalSteps) {
        const baseXP = 100;
        return Math.max(25, Math.floor(baseXP / Math.sqrt(totalSteps)));
    }

    completeStep(chapterId, levelId) {
        if (!this.currentQuest) return null;

        this.checkDailyReset();

        if (chapterId < 0 || chapterId >= this.currentQuest.stages.length) {
            console.error('Invalid chapter ID:', chapterId);
            return null;
        }

        const chapter = this.currentQuest.stages[chapterId];
        
        if (levelId < 0 || levelId >= chapter.steps.length) {
            console.error('Invalid level ID:', levelId);
            return null;
        }

        const level = chapter.steps[levelId];
        
        if (!level.completedToday) {
            level.completedToday = true;
            
            if (!this.dailyReset.todaysProgress[chapterId]) {
                this.dailyReset.todaysProgress[chapterId] = new Set();
            }
            
            this.dailyReset.todaysProgress[chapterId] = this.safeConvertToSet(this.dailyReset.todaysProgress[chapterId]);
            this.dailyReset.todaysProgress[chapterId].add(levelId);

            const xpResult = this.addXP(level.xp);
            this.updateStreak();
            
            let stageAutoCompleted = false;
            if (!level.isDaily) {
                stageAutoCompleted = this.checkStageCompletion(chapterId);
            }

            const questCompleted = this.currentQuest.stages.every(chapter => chapter.completed);
            if (questCompleted && !this.currentQuest.completed) {
                this.currentQuest.completed = true;
                this.player.questsCompleted++;
            }

            // Check for theme unlocks
            const newThemeUnlocks = this.checkThemeUnlocks();
            
            this.saveToFirebase();
            
            return {
                xpGained: level.xp,
                leveledUp: xpResult.leveledUp,
                newLevel: xpResult.newLevel,
                chapterCompleted: stageAutoCompleted,
                questCompleted: questCompleted,
                isDailyTask: level.isDaily,
                autoCompleted: stageAutoCompleted,
                themeUnlocks: newThemeUnlocks // Return new theme unlocks
            };
        }
        
        return null;
    }

    toggleDailyTask(chapterId, levelId) {
        if (!this.currentQuest) return false;

        const chapter = this.currentQuest.stages[chapterId];
        const level = chapter.steps[levelId];
        
        if (chapter && level) {
            level.isDaily = !level.isDaily;
            
            if (!level.isDaily && level.completedToday) {
                level.completed = true;
            }
            
            if (level.isDaily) {
                level.completedToday = false;
                level.completed = false;
            }
            
            this.saveToFirebase();
            return true;
        }
        return false;
    }

    completeStage(chapterId) {
        if (!this.currentQuest) return false;

        const chapter = this.currentQuest.stages[chapterId];
        
        if (chapter && !chapter.completed) {
            chapter.completed = true;
            
            chapter.steps.forEach(step => {
                if (!step.isDaily) {
                    step.completed = true;
                    step.completedToday = true;
                }
            });
            
            this.saveToFirebase();
            return true;
        }
        return false;
    }

    addXP(amount) {
        this.player.xp += amount;
        this.player.totalXP += amount;
        
        const newLevel = Math.floor(this.player.xp / 200) + 1;
        if (newLevel > this.player.level) {
            const oldLevel = this.player.level;
            this.player.level = newLevel;
            return { leveledUp: true, oldLevel, newLevel };
        }
        
        return { leveledUp: false };
    }

    updateStreak() {
        const today = new Date().toDateString();
        const lastActivity = this.player.lastActivity;
        
        if (!lastActivity) {
            this.player.streak = 1;
        } else {
            const lastDate = new Date(lastActivity);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (lastDate.toDateString() === yesterday.toDateString()) {
                this.player.streak++;
            } else if (lastDate.toDateString() !== today) {
                this.player.streak = 1;
            }
        }
        
        this.player.lastActivity = new Date();
    }

    getStageProgress(stageId) {
        if (!this.currentQuest || stageId < 0 || stageId >= this.currentQuest.stages.length) {
            return 0;
        }
        
        const stage = this.currentQuest.stages[stageId];
        if (stage.completed) {
            return 100;
        }
        
        const nonDailyTasks = stage.steps.filter(step => !step.isDaily);
        if (nonDailyTasks.length === 0) {
            return 0;
        }
        
        const completedNonDailyTasks = nonDailyTasks.filter(step => step.completed || step.completedToday).length;
        return (completedNonDailyTasks / nonDailyTasks.length) * 100;
    }

    getQuestProgress() {
        if (!this.currentQuest) return { overall: 0, chapters: [] };
        
        const chapterProgress = this.currentQuest.stages.map(chapter => {
            const nonDailySteps = chapter.steps.filter(step => !step.isDaily);
            const completedNonDailySteps = nonDailySteps.filter(step => step.completed || step.completedToday).length;
            const totalNonDailySteps = nonDailySteps.length;
            
            const progress = chapter.completed ? 100 : 
                (totalNonDailySteps > 0 ? (completedNonDailySteps / totalNonDailySteps) * 100 : 0);
            
            return {
                id: chapter.id,
                title: chapter.title,
                progress: progress,
                completedSteps: completedNonDailySteps,
                completedToday: chapter.steps.filter(step => step.completedToday).length,
                totalSteps: totalNonDailySteps,
                unlocked: chapter.unlocked,
                completed: chapter.completed
            };
        });

        const completedStages = this.currentQuest.stages.filter(stage => stage.completed).length;
        const totalStages = this.currentQuest.stages.length;
        
        let overallProgress = 0;
        if (completedStages === totalStages) {
            overallProgress = 100;
        } else {
            let totalWeightedProgress = 0;
            
            this.currentQuest.stages.forEach((stage, index) => {
                if (stage.completed) {
                    totalWeightedProgress += 100;
                } else if (index <= completedStages) {
                    const nonDailyTasks = stage.steps.filter(step => !step.isDaily);
                    if (nonDailyTasks.length > 0) {
                        const completedNonDaily = nonDailyTasks.filter(step => step.completed || step.completedToday).length;
                        const stageProgress = (completedNonDaily / nonDailyTasks.length) * 100;
                        totalWeightedProgress += stageProgress;
                    }
                }
            });
            
            overallProgress = totalWeightedProgress / totalStages;
        }

        const distanceTraveled = this.calculateDistanceTraveled();

        return {
            overall: Math.min(overallProgress, 100),
            chapters: chapterProgress,
            currentDay: this.currentQuest.currentDay,
            totalDays: this.player.totalDays,
            distanceTraveled: distanceTraveled,
            completedStages: completedStages,
            totalStages: totalStages
        };
    }

    calculateDistanceTraveled() {
        const completedStages = this.currentQuest.stages.filter(stage => stage.completed).length;
        const totalStages = this.currentQuest.stages.length;
        
        if (completedStages === totalStages) {
            return 100;
        }
        
        let totalProgress = 0;
        
        totalProgress += (completedStages / totalStages) * 100;
        
        if (completedStages < totalStages) {
            const currentStage = this.currentQuest.stages[completedStages];
            const nonDailyTasks = currentStage.steps.filter(step => !step.isDaily);
            
            if (nonDailyTasks.length > 0) {
                const completedNonDailyTasks = nonDailyTasks.filter(step => step.completed || step.completedToday).length;
                const currentStageProgress = (completedNonDailyTasks / nonDailyTasks.length) * 100;
                totalProgress += (currentStageProgress / 100) * (100 / totalStages);
            }
        }
        
        return Math.min(totalProgress, 100);
    }

    checkStageCompletion(chapterId) {
        const chapter = this.currentQuest.stages[chapterId];
        if (!chapter || chapter.completed) return false;

        const nonDailyTasks = chapter.steps.filter(step => !step.isDaily);
        
        if (nonDailyTasks.length === 0) {
            return false;
        }
        
        const allNonDailyTasksCompleted = nonDailyTasks.every(step => 
            step.completed || step.completedToday
        );
        
        if (allNonDailyTasksCompleted && !chapter.completed) {
            chapter.completed = true;
            
            chapter.steps.forEach(step => {
                if (!step.isDaily) {
                    step.completed = true;
                    step.completedToday = true;
                }
            });
            
            const nextChapterIndex = chapterId + 1;
            if (nextChapterIndex < this.currentQuest.stages.length) {
                this.currentQuest.stages[nextChapterIndex].unlocked = true;
            }
            
            this.saveToFirebase();
            return true;
        }
        
        return false;
    }

    // Data persistence methods
    loadFromFirebaseData(data) {
        if (data.currentQuest) {
            this.currentQuest = data.currentQuest;
            if (this.currentQuest.startedAt) {
                this.currentQuest.startedAt = new Date(this.currentQuest.startedAt);
            }
        }
        
        if (data.player) {
            this.player = { ...this.player, ...data.player };
            // Ensure totalXP and questsCompleted exist
            if (this.player.totalXP === undefined) this.player.totalXP = this.player.xp || 0;
            if (this.player.questsCompleted === undefined) this.player.questsCompleted = 0;
        }
        
        if (data.dailyReset) {
            this.dailyReset = data.dailyReset;
            // Convert arrays back to Sets for todaysProgress
            if (this.dailyReset.todaysProgress && typeof this.dailyReset.todaysProgress === 'object') {
                Object.keys(this.dailyReset.todaysProgress).forEach(chapterId => {
                    const completedSteps = this.dailyReset.todaysProgress[chapterId];
                    this.dailyReset.todaysProgress[chapterId] = this.safeConvertToSet(completedSteps);
                });
            }
        }
        
        // Load decorations - this is crucial for theme sync
        if (data.decorations) {
            this.decorations.unlockedThemes = new Set(data.decorations.unlockedThemes || ['default']);
            this.decorations.currentTheme = data.decorations.currentTheme || 'default';
            this.decorations.unlockedDecorations = new Set(data.decorations.unlockedDecorations || []);
        } else {
            // Initialize decorations if they don't exist
            this.decorations = {
                unlockedThemes: new Set(['default']),
                currentTheme: 'default',
                unlockedDecorations: new Set()
            };
        }
        
        console.log('Loaded from Firebase:', this.currentQuest);
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('careerQuest');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                
                this.player = {
                    level: data.player?.level || 1,
                    xp: data.player?.xp || 0,
                    streak: data.player?.streak || 0,
                    lastActivity: data.player?.lastActivity ? new Date(data.player.lastActivity) : null,
                    totalDays: data.player?.totalDays || 1,
                    totalXP: data.player?.totalXP || data.player?.xp || 0,
                    questsCompleted: data.player?.questsCompleted || 0
                };
                
                this.currentQuest = data.currentQuest;
                
                this.dailyReset = {
                    lastReset: data.dailyReset?.lastReset || new Date().toDateString(),
                    todaysProgress: {}
                };
                
                if (data.dailyReset?.todaysProgress && typeof data.dailyReset.todaysProgress === 'object') {
                    Object.keys(data.dailyReset.todaysProgress).forEach(chapterId => {
                        const completedSteps = data.dailyReset.todaysProgress[chapterId];
                        this.dailyReset.todaysProgress[chapterId] = this.safeConvertToSet(completedSteps);
                    });
                }
                
                // Load decorations from localStorage
                if (data.decorations) {
                    this.decorations.unlockedThemes = new Set(data.decorations.unlockedThemes || ['default']);
                    this.decorations.currentTheme = data.decorations.currentTheme || 'default';
                    this.decorations.unlockedDecorations = new Set(data.decorations.unlockedDecorations || []);
                }
                
                this.migrateOldData();
                
                if (this.currentQuest && this.currentQuest.startedAt) {
                    const startDate = new Date(this.currentQuest.startedAt);
                    const currentDate = new Date();
                    const timeDiff = currentDate - startDate;
                    this.player.totalDays = Math.max(1, Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1);
                }
                
            } catch (error) {
                console.error('Error loading saved data:', error);
                this.initializeDefaults();
            }
        }
    }

    saveToLocalStorage() {
        const saveData = {
            currentQuest: this.currentQuest,
            player: this.player,
            dailyReset: this.dailyReset,
            decorations: {
                unlockedThemes: Array.from(this.decorations.unlockedThemes),
                currentTheme: this.decorations.currentTheme,
                unlockedDecorations: Array.from(this.decorations.unlockedDecorations)
            }
        };
        localStorage.setItem('careerQuest', JSON.stringify(saveData));
    }

    initializeDefaults() {
        this.player = {
            level: 1,
            xp: 0,
            streak: 0,
            lastActivity: null,
            totalDays: 1,
            totalXP: 0,
            questsCompleted: 0
        };
        this.currentQuest = null;
        this.dailyReset = {
            lastReset: new Date().toDateString(),
            todaysProgress: {}
        };
        this.decorations = {
            unlockedThemes: new Set(['default']),
            currentTheme: 'default',
            unlockedDecorations: new Set()
        };
    }

    saveToFirebase() {
        // Safety check before saving to Firebase
        if (!this.isReadyForFirebase()) {
            console.log('Quest not ready for Firebase, using localStorage');
            this.saveToLocalStorage();
            return;
        }
        
        if (this.firebaseManager && typeof this.firebaseManager.saveQuestToFirebase === 'function') {
            this.firebaseManager.saveQuestToFirebase();
        } else {
            console.log('Firebase manager not available, falling back to localStorage');
            this.saveToLocalStorage();
        }
    }

    // Helper methods
    safeConvertToSet(data) {
        if (data instanceof Set) {
            return data;
        } else if (Array.isArray(data)) {
            return new Set(data);
        } else if (data && typeof data === 'object') {
            try {
                const values = Object.values(data);
                return new Set(values.filter(val => typeof val === 'number' || typeof val === 'string'));
            } catch {
                return new Set();
            }
        } else {
            return new Set();
        }
    }

    migrateOldData() {
        if (this.currentQuest) {
            this.currentQuest.stages.forEach((stage, index) => {
                if (!stage.hasOwnProperty('unlocked')) {
                    stage.unlocked = index === 0;
                }
                if (!stage.hasOwnProperty('completed')) {
                    stage.completed = false;
                }
                
                stage.steps.forEach(step => {
                    if (!step.hasOwnProperty('completedToday')) {
                        step.completedToday = false;
                    }
                    if (!step.hasOwnProperty('completed')) {
                        step.completed = false;
                    }
                });
            });
            
            if (!this.currentQuest.hasOwnProperty('currentDay')) {
                this.currentQuest.currentDay = 1;
            }
        }
    }

    resetQuest() {
        this.currentQuest = null;
        this.dailyReset = {
            lastReset: new Date().toDateString(),
            todaysProgress: {}
        };
        
        if (this.firebaseManager && this.firebaseManager.userId) {
            // Use the database reference from FirebaseManager
            if (typeof database !== 'undefined') {
                database.ref(`users/${this.firebaseManager.userId}/quest`).remove();
            }
        }
        
        localStorage.removeItem('careerQuest');
    }
}