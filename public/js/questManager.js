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
        
        // Initialize timezone first, then use it for dailyReset
        this.userTimezone = this.detectUserTimezone();
        
        this.dailyReset = {
            lastReset: this.getCurrentDateString(),
            todaysProgress: {}
        };
        
        // Theme system - this is what UIManager uses
        this.decorations = {
            unlockedThemes: new Set(['default']),
            currentTheme: 'default',
            unlockedDecorations: new Set()
        };
    }

    // Get current date string in user's timezone
    getCurrentDateString() {
        return new Date().toLocaleDateString('en-CA', { timeZone: this.userTimezone }); // YYYY-MM-DD format
    }

    // Detect user's timezone
    detectUserTimezone() {
        // Try to get from browser, fallback to system timezone
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        } catch (error) {
            console.warn('Could not detect timezone, using UTC:', error);
            return 'UTC';
        }
    }

    // Check if it's a new day in user's timezone
    isNewDay() {
        const currentDate = this.getCurrentDateString();
        return this.dailyReset.lastReset !== currentDate;
    }

    // Enhanced daily reset with timezone support
    checkDailyReset() {
        if (this.isNewDay()) {
            console.log('Performing daily reset for new day:', this.getCurrentDateString());
            this.performDailyReset();
            return true;
        }
        return false;
    }

    // Perform the actual reset logic
    performDailyReset() {
        const previousDate = this.dailyReset.lastReset;
        const currentDate = this.getCurrentDateString();
        
        this.dailyReset.lastReset = currentDate;
        this.dailyReset.todaysProgress = {};
        
        // Update quest day counter
        if (this.currentQuest) {
            this.currentQuest.currentDay++;
            
            // Calculate total days based on start date considering timezone
            if (this.currentQuest.startedAt) {
                const startDate = new Date(this.currentQuest.startedAt);
                const currentDateObj = new Date();
                
                // Convert both dates to user's timezone for accurate day calculation
                const startInUserTz = new Date(startDate.toLocaleString('en-US', { timeZone: this.userTimezone }));
                const currentInUserTz = new Date(currentDateObj.toLocaleString('en-US', { timeZone: this.userTimezone }));
                
                // Reset time components to compare just dates
                startInUserTz.setHours(0, 0, 0, 0);
                currentInUserTz.setHours(0, 0, 0, 0);
                
                const timeDiff = currentInUserTz - startInUserTz;
                this.player.totalDays = Math.max(1, Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1);
            }
            
            // Reset daily tasks
            this.currentQuest.stages.forEach(chapter => {
                chapter.steps.forEach(step => {
                    if (step.isDaily) {
                        step.completedToday = false;
                    }
                });
            });
        }
        
        // Update streak based on actual consecutive days
        this.updateStreakWithTimezone(previousDate, currentDate);
        
        console.log(`Daily reset completed. Previous: ${previousDate}, Current: ${currentDate}`);
        this.saveToFirebase();
    }

    updateStreakWithTimezone(previousDate, currentDate) {
        if (!previousDate) {
            this.player.streak = 1;
            return;
        }
        
        try {
            // Parse dates in user's timezone
            const prevDateObj = new Date(previousDate + 'T00:00:00');
            const currentDateObj = new Date(currentDate + 'T00:00:00');
            
            // Calculate day difference
            const timeDiff = currentDateObj - prevDateObj;
            const dayDiff = timeDiff / (1000 * 60 * 60 * 24);
            
            if (dayDiff === 1) {
                // Consecutive day - increment streak
                this.player.streak++;
                console.log(`Streak updated: ${this.player.streak} days`);
            } else if (dayDiff > 1) {
                // Missed one or more days - reset streak
                this.player.streak = 1;
                console.log('Streak reset - missed days');
            }
            // If dayDiff === 0, it's the same day - no change to streak
            
        } catch (error) {
            console.error('Error calculating streak:', error);
            // Fallback: simple increment if we can't parse dates
            this.player.streak++;
        }
        
        this.player.lastActivity = new Date();
    }

    // Theme unlock conditions - based on level progression
    getThemeUnlockConditions() {
        return {
            'default': { type: 'level', value: 1, description: 'Starting theme' },
            'cafe': { type: 'streak', value: 1, description: '1-day streak' },
            'pond': { type: 'level', value: 2, description: 'Reach Level 2' },
            'forest': { type: 'level', value: 3, description: 'Reach Level 4' },
            'sunset': { type: 'streak', value: 2, description: '2-day streak' },
            'space': { type: 'level', value: 6, description: 'Reach Level 6' },
            'beach': { type: 'level', value: 7, description: 'Reach Level 7' },
            'library': { type: 'total_xp', value: 1000, description: 'Earn 1000 XP' }
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
            'default': 'Default',
            'cafe': 'Cafe',
            'pond': 'Pond', 
            'forest': 'Forest',
            'sunset': 'Sunset',
            'space': 'Space',
            'beach': 'Beach',
            'library': 'Library'
        };
        return names[themeName] || themeName;
    }

    // Get icons for themes
    getThemeIcon(themeName) {
        const icons = {
            'default': '🟨',
            'cafe': '☕',
            'pond': '💧',
            'forest': '🌲',
            'sunset': '🌅',
            'space': '🚀',
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
            lastReset: this.getCurrentDateString(),
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

    calculateStepXP(totalSteps) {
        const baseXP = 100;
        return Math.max(25, Math.floor(baseXP / Math.sqrt(totalSteps)));
    }

    completeStep(chapterId, levelId) {
        if (!this.currentQuest) return null;

        // Check for daily reset at the beginning of any user action
        const didReset = this.checkDailyReset();

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
        
        let xpGained = 0;
        let leveledUp = false;
        let chapterCompleted = false;
        let questCompleted = false;

        // For daily tasks: only track daily completion, not overall completion
        if (level.isDaily) {
            if (!level.completedToday) {
                level.completedToday = true;
                xpGained = level.xp;
                
                // Add XP and check for level up
                const levelUpResult = this.addXP(xpGained);
                leveledUp = levelUpResult.leveledUp;
                
                // mark daily task as completed (overall completion) when done for the first time
                if (!level.completed) {
                    level.completed = true;
                }
            }
        } else {
            // For regular tasks: track overall completion
            if (!level.completed) {
                level.completed = true;
                level.completedToday = true; // Also mark as completed today for display
                xpGained = level.xp;
                
                // Add XP and check for level up
                const levelUpResult = this.addXP(xpGained);
                leveledUp = levelUpResult.leveledUp;
            }
        }

        // Check if stage is now complete (AFTER potentially updating completion status)
        if (!chapter.completed) {
            const allTasksCompleted = chapter.steps.every(step => {
                return step.completed === true;
            });
            
            if (allTasksCompleted) {
                this.completeStage(chapterId);
                chapterCompleted = true;
            }
        }

        // Update streak (uses timezone-aware version)
        this.updateStreak();
        
        // Check if entire quest is completed (all stages completed)
        const allStagesCompleted = this.currentQuest.stages.every(stage => stage.completed);
        if (allStagesCompleted && !this.currentQuest.completed) {
            this.currentQuest.completed = true;
            this.player.questsCompleted++;
            questCompleted = true;
        }

        // Check for theme unlocks
        const newThemeUnlocks = this.checkThemeUnlocks();
        
        this.saveToFirebase();
        
        return {
            xpGained: xpGained,
            leveledUp: leveledUp,
            newLevel: this.player.level,
            chapterCompleted: chapterCompleted,
            questCompleted: questCompleted,
            isDailyTask: level.isDaily,
            themeUnlocks: newThemeUnlocks,
            dailyResetOccurred: didReset
        };
    }

    toggleDailyTask(chapterId, levelId) {
        if (!this.currentQuest) return false;

        const chapter = this.currentQuest.stages[chapterId];
        const level = chapter.steps[levelId];
        
        if (chapter && level) {
            // Store the current completion status BEFORE toggling
            const wasCompleted = level.completed;
            
            // Toggle daily status
            level.isDaily = !level.isDaily;
            
            if (level.isDaily) {
                // When making a task daily:
                // - Keep the original completed status
                // - Reset only the daily completion status
                level.completedToday = false;
                // level.completed remains unchanged - preserve the original completion!
            } else {
                // When removing daily status:
                // - Keep the original completed status
                // - Set completedToday to match the overall completion for display
                level.completedToday = level.completed;
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
        const currentDate = this.getCurrentDateString();
        const lastActivity = this.player.lastActivity;
        
        if (!lastActivity) {
            this.player.streak = 1;
        } else {
            try {
                const lastActivityDate = new Date(lastActivity).toLocaleDateString('en-CA', { timeZone: this.userTimezone });
                
                if (lastActivityDate !== currentDate) {
                    // Use the timezone-aware streak calculation
                    this.updateStreakWithTimezone(lastActivityDate, currentDate);
                }
            } catch (error) {
                console.error('Error in updateStreak:', error);
                // Fallback to simple logic
                const today = new Date().toDateString();
                if (lastActivity.toDateString() !== today) {
                    this.player.streak++;
                }
            }
        }
        
        this.player.lastActivity = new Date();
    }

    // Updated to only count regular tasks for progress
    getStageProgress(stageIndex) {
        const stage = this.currentQuest.stages[stageIndex];
        if (!stage) {
            return 0;
        }
        
        if (stage.completed) {
            return 100;
        }
        
        // Count ALL tasks for progress calculation, but handle daily tasks differently
        const totalTasks = stage.steps.length;
        if (totalTasks === 0) return 0;
        
        let completedCount = 0;
        
        stage.steps.forEach(task => {
            if (task.isDaily) {
                // Daily tasks: count as completed if they were EVER completed (completed = true)
                // This preserves progress even when task is set to daily
                if (task.completed) {
                    completedCount++;
                }
            } else {
                // Regular tasks: count as completed if completed
                if (task.completed) {
                    completedCount++;
                }
            }
        });
        
        const progress = (completedCount / totalTasks) * 100;
        const roundedProgress = Math.round(progress);
        
        return roundedProgress;
    }

    getQuestProgress() {
        if (!this.currentQuest) return { overall: 0, chapters: [] };
        
        const chapterProgress = this.currentQuest.stages.map(chapter => {
            // Count ALL tasks, handling daily tasks appropriately
            const totalSteps = chapter.steps.length;
            let completedSteps = 0;
            
            chapter.steps.forEach(step => {
                if (step.isDaily) {
                    // Daily tasks count if they were ever completed
                    if (step.completed) {
                        completedSteps++;
                    }
                } else {
                    // Regular tasks count if completed
                    if (step.completed) {
                        completedSteps++;
                    }
                }
            });
            
            const progress = chapter.completed ? 100 : 
                (totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0);
            
            return {
                id: chapter.id,
                title: chapter.title,
                progress: progress,
                completedSteps: completedSteps,
                completedToday: chapter.steps.filter(step => step.completedToday).length,
                totalSteps: totalSteps,
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
                    // Use the same progress calculation logic
                    const totalTasks = stage.steps.length;
                    let completedTasks = 0;
                    
                    stage.steps.forEach(task => {
                        if (task.isDaily) {
                            if (task.completed) completedTasks++;
                        } else {
                            if (task.completed) completedTasks++;
                        }
                    });
                    
                    const stageProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                    totalWeightedProgress += stageProgress;
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
            const totalTasks = currentStage.steps.length;
            
            if (totalTasks > 0) {
                let completedTasks = 0;
                currentStage.steps.forEach(task => {
                    if (task.isDaily) {
                        if (task.completed) completedTasks++;
                    } else {
                        if (task.completed) completedTasks++;
                    }
                });
                
                const currentStageProgress = (completedTasks / totalTasks) * 100;
                totalProgress += (currentStageProgress / 100) * (100 / totalStages);
            }
        }
        
        return Math.min(totalProgress, 100);
    }

    checkStageCompletion(chapterId) {
        const chapter = this.currentQuest.stages[chapterId];
        if (!chapter || chapter.completed) return false;

        const totalTasks = chapter.steps.length;
        if (totalTasks === 0) {
            return false;
        }
        
        // For a stage to be complete, ALL tasks must have been completed at least once
        // This means both daily and regular tasks must have completed: true
        const allTasksCompleted = chapter.steps.every(step => step.completed === true);
        
        if (allTasksCompleted && !chapter.completed) {
            chapter.completed = true;
            
            // Mark all non-daily tasks as completedToday for display
            chapter.steps.forEach(step => {
                if (!step.isDaily) {
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
                    lastReset: data.dailyReset?.lastReset || this.getCurrentDateString(),
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
            lastReset: this.getCurrentDateString(),
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
            lastReset: this.getCurrentDateString(),
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

    // Add method to force reset for testing
    forceDailyResetForTesting() {
        console.log('Forcing daily reset for testing');
        // Set lastReset to yesterday to trigger reset
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        this.dailyReset.lastReset = yesterday.toLocaleDateString('en-CA', { timeZone: this.userTimezone });
        this.performDailyReset();
    }

    // Get timezone info for debugging
    getTimezoneInfo() {
        return {
            userTimezone: this.userTimezone,
            currentDate: this.getCurrentDateString(),
            lastReset: this.dailyReset.lastReset,
            isNewDay: this.isNewDay(),
            systemTime: new Date().toString()
        };
    }
}