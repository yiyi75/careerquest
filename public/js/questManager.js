class QuestManager {
    constructor(firebaseManager) {
        this.firebaseManager = firebaseManager;
        this.currentQuest = null;
        this.player = {
            level: 1,
            xp: 0,
            streak: 0,
            lastActivity: null,
            totalDays: 1
        };
        this.dailyReset = {
            lastReset: new Date().toDateString(),
            todaysProgress: {}
        };
        this.achievements = [
            { id: 'first_steps', title: 'First Steps', description: 'Complete your first task', unlocked: false, xp: 50 },
            { id: 'quick_learner', title: 'Quick Learner', description: 'Complete 5 tasks in one day', unlocked: false, xp: 100 },
            { id: 'dedicated', title: 'Dedicated Learner', description: 'Maintain a 7-day streak', unlocked: false, xp: 200 },
            { id: 'preparation_master', title: 'Preparation Master', description: 'Complete a preparation stage', unlocked: false, xp: 150 },
            { id: 'interview_ready', title: 'Interview Ready', description: 'Complete all preparation tasks', unlocked: false, xp: 300 },
            { id: 'job_hunter', title: 'Job Hunter', description: 'Reach the application stage', unlocked: false, xp: 250 },
            { id: 'offer_seeker', title: 'Offer Seeker', description: 'Complete an interview stage', unlocked: false, xp: 400 },
            { id: 'career_champion', title: 'Career Champion', description: 'Complete an entire career quest', unlocked: false, xp: 1000 },
            { id: 'consistent', title: 'Consistent', description: 'Spend 30 days on your quest', unlocked: false, xp: 500 },
            { id: 'daily_warrior', title: 'Daily Warrior', description: 'Complete 20 daily tasks', unlocked: false, xp: 300 }
        ];
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
            
            this.saveToFirebase(); // CHANGED: Use Firebase instead of localStorage
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
            
            if (level.isDaily) {
                this.checkDailyAchievements();
            }
            
            let stageAutoCompleted = false;
            if (!level.isDaily) {
                stageAutoCompleted = this.checkStageCompletion(chapterId);
            }

            const questCompleted = this.currentQuest.stages.every(chapter => chapter.completed);
            if (questCompleted && !this.currentQuest.completed) {
                this.currentQuest.completed = true;
                this.unlockAchievement('career_champion');
            }

            this.checkAchievements();
            this.checkDayAchievements();
            this.saveToFirebase(); // CHANGED: Use Firebase
            
            return {
                xpGained: level.xp,
                leveledUp: xpResult.leveledUp,
                newLevel: xpResult.newLevel,
                chapterCompleted: stageAutoCompleted,
                questCompleted: questCompleted,
                isDailyTask: level.isDaily,
                autoCompleted: stageAutoCompleted
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
            
            this.saveToFirebase(); // CHANGED: Use Firebase instead of localStorage
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
            
            this.saveToFirebase(); // CHANGED: Use Firebase instead of localStorage
            return true;
        }
        return false;
    }

    checkDailyAchievements() {
        let dailyTasksCompleted = 0;
        
        if (this.currentQuest) {
            this.currentQuest.stages.forEach(chapter => {
                chapter.steps.forEach(step => {
                    if (step.isDaily && step.completedToday) {
                        dailyTasksCompleted++;
                    }
                });
            });
        }
        
        if (dailyTasksCompleted >= 20) {
            this.unlockAchievement('daily_warrior');
        }
    }

    addXP(amount) {
        this.player.xp += amount;
        
        const newLevel = Math.floor(this.player.xp / 1000) + 1;
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
        
        if (this.player.streak >= 7) {
            this.unlockAchievement('dedicated');
        }
    }

    unlockAchievement(achievementId) {
        const achievement = this.achievements.find(a => a.id === achievementId);
        if (achievement && !achievement.unlocked) {
            achievement.unlocked = true;
            this.addXP(achievement.xp);
            this.saveToFirebase(); // CHANGED: Save to Firebase when achievement unlocked
            return achievement;
        }
        return null;
    }

    checkAchievements() {
        const completedTasks = this.getTotalCompletedTasks();
        
        if (completedTasks >= 1) {
            this.unlockAchievement('first_steps');
        }
        
        let todayTotal = 0;
        Object.values(this.dailyReset.todaysProgress).forEach(completedSteps => {
            if (completedSteps instanceof Set) {
                todayTotal += completedSteps.size;
            } else if (Array.isArray(completedSteps)) {
                todayTotal += completedSteps.length;
            }
        });
        
        if (todayTotal >= 5) {
            this.unlockAchievement('quick_learner');
        }
    }

    checkDayAchievements() {
        if (this.player.totalDays >= 30) {
            this.unlockAchievement('consistent');
        }
    }

    getTotalCompletedTasks() {
        if (!this.currentQuest) return 0;
        return this.currentQuest.stages.reduce((total, chapter) => {
            return total + chapter.steps.filter(step => step.completed).length;
        }, 0);
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
            
            this.saveToFirebase(); // CHANGED: Use Firebase instead of localStorage
            return true;
        }
        
        return false;
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

    // Edit quest methods - all updated to use Firebase
    addStage(stageTitle = "New Stage") {
        if (!this.currentQuest) return null;

        const newStage = {
            id: this.currentQuest.stages.length + 1,
            title: stageTitle,
            steps: [],
            completed: false,
            unlocked: false
        };

        this.currentQuest.stages.push(newStage);
        this.saveToFirebase(); // CHANGED: Use Firebase
        return newStage;
    }

    removeStage(stageId) {
        if (!this.currentQuest) return false;

        const stageIndex = stageId - 1;
        if (stageIndex >= 0 && stageIndex < this.currentQuest.stages.length) {
            this.currentQuest.stages.splice(stageIndex, 1);
            
            this.currentQuest.stages.forEach((stage, index) => {
                stage.id = index + 1;
            });
            
            this.saveToFirebase(); // CHANGED: Use Firebase
            return true;
        }
        return false;
    }

    addStep(stageId, stepTitle = "New Step") {
        if (!this.currentQuest) return null;

        const stage = this.currentQuest.stages[stageId - 1];
        if (stage) {
            const newStep = {
                id: stage.steps.length + 1,
                title: stepTitle,
                completed: false,
                completedToday: false,
                xp: this.calculateStepXP(stage.steps.length + 1)
            };

            stage.steps.push(newStep);
            
            stage.steps.forEach(step => {
                step.xp = this.calculateStepXP(stage.steps.length);
            });
            
            this.saveToFirebase(); // CHANGED: Use Firebase
            return newStep;
        }
        return null;
    }

    removeStep(stageId, stepId) {
        if (!this.currentQuest) return false;

        const stage = this.currentQuest.stages[stageId - 1];
        if (stage && stepId >= 1 && stepId <= stage.steps.length) {
            stage.steps.splice(stepId - 1, 1);
            
            stage.steps.forEach((step, index) => {
                step.id = index + 1;
                step.xp = this.calculateStepXP(stage.steps.length);
            });
            
            this.saveToFirebase(); // CHANGED: Use Firebase
            return true;
        }
        return false;
    }

    updateStageTitle(stageId, newTitle) {
        if (!this.currentQuest) return false;

        const stage = this.currentQuest.stages[stageId - 1];
        if (stage) {
            stage.title = newTitle;
            this.saveToFirebase(); // CHANGED: Use Firebase
            return true;
        }
        return false;
    }

    updateStepTitle(stageId, stepId, newTitle) {
        if (!this.currentQuest) return false;

        const stage = this.currentQuest.stages[stageId - 1];
        if (stage && stepId >= 1 && stepId <= stage.steps.length) {
            stage.steps[stepId - 1].title = newTitle;
            this.saveToFirebase(); // CHANGED: Use Firebase
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
        }
        
        if (data.achievements) {
            this.achievements = data.achievements;
        }
        
        if (data.dailyReset) {
            this.dailyReset = data.dailyReset;
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
                    totalDays: data.player?.totalDays || 1
                };
                
                this.currentQuest = data.currentQuest;
                this.achievements = data.achievements || this.achievements;
                
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

    saveToLocalStorage() {
        const saveData = {
            currentQuest: this.currentQuest,
            player: this.player,
            achievements: this.achievements,
            dailyReset: this.dailyReset
        };
        localStorage.setItem('careerQuest', JSON.stringify(saveData));
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

    initializeDefaults() {
        this.player = {
            level: 1,
            xp: 0,
            streak: 0,
            lastActivity: null,
            totalDays: 1
        };
        this.currentQuest = null;
        this.dailyReset = {
            lastReset: new Date().toDateString(),
            todaysProgress: {}
        };
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