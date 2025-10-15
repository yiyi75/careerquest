class QuestManager {
    constructor() {
        this.currentQuest = null;
        this.player = {
            level: 1,
            xp: 0,
            streak: 0,
            lastActivity: null,
            totalDays: 0
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
                    isDaily: false, // Mark tasks as daily
                    xp: this.calculateStepXP(stage.steps.length)
                })),
                completed: false,
                unlocked: true // CHANGED: All stages unlocked from start
            })),
            startedAt: new Date(),
            completed: false,
            currentDay: 1
        };
        
        this.initializeDailyReset();
        this.saveToLocalStorage();
        return this.currentQuest;
    }

    initializeDailyReset() {
        this.dailyReset = {
            lastReset: new Date().toDateString(),
            todaysProgress: {}
        };
        
        // Reset only daily tasks for the new day
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
            // New day!
            this.dailyReset.lastReset = today;
            this.dailyReset.todaysProgress = {};
            
            // Increment total days
            this.player.totalDays++;
            this.currentQuest.currentDay++;
            
            // Reset only daily tasks for the new day
            if (this.currentQuest) {
                this.currentQuest.stages.forEach(chapter => {
                    chapter.steps.forEach(step => {
                        if (step.isDaily) {
                            step.completedToday = false;
                        }
                    });
                });
            }
            
            this.saveToLocalStorage();
            return true; // Reset occurred
        }
        return false; // No reset needed
    }

    calculateStepXP(totalSteps) {
        const baseXP = 100;
        return Math.max(25, Math.floor(baseXP / Math.sqrt(totalSteps)));
    }

    // Complete any task (not just current stage)
    completeStep(chapterId, levelId) {
        if (!this.currentQuest) return null;

        this.checkDailyReset(); // Check if we need daily reset

        // Validate chapter and level exist
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
        
        // CHANGED: Allow completing any task, not just in current stage
        if (!level.completedToday) {
            level.completedToday = true;
            
            // Track in daily progress
            if (!this.dailyReset.todaysProgress[chapterId]) {
                this.dailyReset.todaysProgress[chapterId] = new Set();
            }
            
            // Ensure it's a Set
            this.dailyReset.todaysProgress[chapterId] = this.safeConvertToSet(this.dailyReset.todaysProgress[chapterId]);
            this.dailyReset.todaysProgress[chapterId].add(levelId);

            const xpResult = this.addXP(level.xp);
            this.updateStreak();
            
            // Check if this is a daily task for achievements
            if (level.isDaily) {
                this.checkDailyAchievements();
            }
            
            // Check if all steps in this stage are completed
            const allStepsCompleted = chapter.steps.every(step => step.completedToday || step.completed);
            let chapterCompleted = false;
            
            if (allStepsCompleted && !chapter.completed) {
                chapter.completed = true;
                chapterCompleted = true;
                
                // Mark all steps as permanently completed (except daily tasks)
                chapter.steps.forEach(step => {
                    if (!step.isDaily) {
                        step.completed = true;
                    }
                });
                
                this.unlockAchievement('preparation_master');
            }

            // Check quest completion (all non-daily tasks completed)
            const questCompleted = this.currentQuest.stages.every(chapter => 
                chapter.steps.every(step => step.completed || step.isDaily)
            );
            if (questCompleted && !this.currentQuest.completed) {
                this.currentQuest.completed = true;
                this.unlockAchievement('career_champion');
            }

            this.checkAchievements();
            this.checkDayAchievements();
            this.saveToLocalStorage();
            
            return {
                xpGained: level.xp,
                leveledUp: xpResult.leveledUp,
                newLevel: xpResult.newLevel,
                chapterCompleted: chapterCompleted,
                questCompleted: questCompleted,
                isDailyTask: level.isDaily
            };
        }
        
        return null;
    }

    // Toggle daily status for a task
    toggleDailyTask(chapterId, levelId) {
        if (!this.currentQuest) return false;

        const chapter = this.currentQuest.stages[chapterId];
        const level = chapter.steps[levelId];
        
        if (chapter && level) {
            level.isDaily = !level.isDaily;
            
            // If marking as not daily and it's completed today, mark as permanently completed
            if (!level.isDaily && level.completedToday) {
                level.completed = true;
            }
            
            // If marking as daily, reset completion for today
            if (level.isDaily) {
                level.completedToday = false;
                level.completed = false;
            }
            
            this.saveToLocalStorage();
            return true;
        }
        return false;
    }

    // Manually complete a stage
    completeStage(chapterId) {
        if (!this.currentQuest) return false;

        const chapter = this.currentQuest.stages[chapterId];
        
        if (chapter && !chapter.completed) {
            chapter.completed = true;
            
            // Mark all non-daily tasks as completed
            chapter.steps.forEach(step => {
                if (!step.isDaily) {
                    step.completed = true;
                    step.completedToday = true;
                }
            });
            
            this.saveToLocalStorage();
            return true;
        }
        return false;
    }

    // Check daily-specific achievements
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
            return achievement;
        }
        return null;
    }

    checkAchievements() {
        const completedTasks = this.getTotalCompletedTasks();
        
        if (completedTasks >= 1) {
            this.unlockAchievement('first_steps');
        }
        
        // Check for 5 tasks completed today
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

    hasCompletedFiveToday() {
        let todayTotal = 0;
        Object.values(this.dailyReset.todaysProgress).forEach(completedSteps => {
            if (completedSteps instanceof Set) {
                todayTotal += completedSteps.size;
            } else if (Array.isArray(completedSteps)) {
                todayTotal += completedSteps.length;
            }
        });
        return todayTotal >= 5;
    }

    getQuestProgress() {
        if (!this.currentQuest) return { overall: 0, chapters: [] };
        
        const chapterProgress = this.currentQuest.stages.map(chapter => {
            const completedSteps = chapter.steps.filter(step => step.completed || step.completedToday).length;
            const completedToday = chapter.steps.filter(step => step.completedToday).length;
            const totalSteps = chapter.steps.length;
            
            // CHANGED: Use stage completion status for progress, not task completion
            const progress = chapter.completed ? 100 : (completedSteps / totalSteps) * 100;
            
            return {
                id: chapter.id,
                title: chapter.title,
                progress: progress,
                completedSteps,
                completedToday,
                totalSteps,
                unlocked: chapter.unlocked,
                completed: chapter.completed
            };
        });

        // CHANGED: Calculate overall progress based on stage completion, not task completion
        const completedStages = this.currentQuest.stages.filter(stage => stage.completed).length;
        const totalStages = this.currentQuest.stages.length;
        const overallProgress = totalStages > 0 ? (completedStages / totalStages) * 100 : 0;

        // Calculate distance traveled based on stage completion
        const distanceTraveled = this.calculateDistanceTraveled();

        return {
            overall: overallProgress,
            chapters: chapterProgress,
            currentDay: this.currentQuest.currentDay,
            totalDays: this.player.totalDays,
            distanceTraveled: distanceTraveled,
            completedStages: completedStages,
            totalStages: totalStages
        };
    }

    calculateDistanceTraveled() {
        // CHANGED: Calculate based on stage completion instead of XP
        const completedStages = this.currentQuest.stages.filter(stage => stage.completed).length;
        const totalStages = this.currentQuest.stages.length;
        const stageProgress = totalStages > 0 ? (completedStages / totalStages) * 100 : 0;
        
        // Combine with level progress for a balanced metric
        const currentLevelXP = this.player.xp % 1000;
        const levelProgress = (currentLevelXP / 1000) * 100;
        
        // Weight stage completion more heavily (80% stages, 20% level)
        return (stageProgress * 0.8) + (levelProgress * 0.2);
    }

    // Get progress for a specific stage
    getStageProgress(stageId) {
        if (!this.currentQuest || stageId < 0 || stageId >= this.currentQuest.stages.length) {
            return 0;
        }
        
        const stage = this.currentQuest.stages[stageId];
        if (stage.completed) {
            return 100;
        }
        
        const completedSteps = stage.steps.filter(step => step.completed || step.completedToday).length;
        const totalSteps = stage.steps.length;
        
        return totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
    }

    // New methods for modifying quest
    addStage(stageTitle = "New Stage") {
        if (!this.currentQuest) return null;

        const newStage = {
            id: this.currentQuest.stages.length + 1,
            title: stageTitle,
            steps: [],
            completed: false,
            unlocked: false // New stages start locked
        };

        this.currentQuest.stages.push(newStage);
        this.saveToLocalStorage();
        return newStage;
    }

    removeStage(stageId) {
        if (!this.currentQuest) return false;

        const stageIndex = stageId - 1;
        if (stageIndex >= 0 && stageIndex < this.currentQuest.stages.length) {
            this.currentQuest.stages.splice(stageIndex, 1);
            
            // Re-index stages
            this.currentQuest.stages.forEach((stage, index) => {
                stage.id = index + 1;
            });
            
            this.saveToLocalStorage();
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
            
            // Recalculate XP for all steps in this stage
            stage.steps.forEach(step => {
                step.xp = this.calculateStepXP(stage.steps.length);
            });
            
            this.saveToLocalStorage();
            return newStep;
        }
        return null;
    }

    removeStep(stageId, stepId) {
        if (!this.currentQuest) return false;

        const stage = this.currentQuest.stages[stageId - 1];
        if (stage && stepId >= 1 && stepId <= stage.steps.length) {
            stage.steps.splice(stepId - 1, 1);
            
            // Re-index steps and recalculate XP
            stage.steps.forEach((step, index) => {
                step.id = index + 1;
                step.xp = this.calculateStepXP(stage.steps.length);
            });
            
            this.saveToLocalStorage();
            return true;
        }
        return false;
    }

    updateStageTitle(stageId, newTitle) {
        if (!this.currentQuest) return false;

        const stage = this.currentQuest.stages[stageId - 1];
        if (stage) {
            stage.title = newTitle;
            this.saveToLocalStorage();
            return true;
        }
        return false;
    }

    updateStepTitle(stageId, stepId, newTitle) {
        if (!this.currentQuest) return false;

        const stage = this.currentQuest.stages[stageId - 1];
        if (stage && stepId >= 1 && stepId <= stage.steps.length) {
            stage.steps[stepId - 1].title = newTitle;
            this.saveToLocalStorage();
            return true;
        }
        return false;
    }

    saveToLocalStorage() {
        // Convert Sets to Arrays for localStorage serialization
        const serializedDailyReset = {
            lastReset: this.dailyReset.lastReset,
            todaysProgress: {}
        };
        
        Object.keys(this.dailyReset.todaysProgress).forEach(chapterId => {
            const completedSteps = this.dailyReset.todaysProgress[chapterId];
            if (completedSteps instanceof Set) {
                serializedDailyReset.todaysProgress[chapterId] = Array.from(completedSteps);
            } else {
                serializedDailyReset.todaysProgress[chapterId] = completedSteps;
            }
        });

        const saveData = {
            player: this.player,
            currentQuest: this.currentQuest,
            achievements: this.achievements,
            dailyReset: serializedDailyReset
        };
        localStorage.setItem('careerQuest', JSON.stringify(saveData));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('careerQuest');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                
                // Restore player data with defaults
                this.player = {
                    level: data.player?.level || 1,
                    xp: data.player?.xp || 0,
                    streak: data.player?.streak || 0,
                    lastActivity: data.player?.lastActivity ? new Date(data.player.lastActivity) : null,
                    totalDays: data.player?.totalDays || 0
                };
                
                this.currentQuest = data.currentQuest;
                this.achievements = data.achievements || this.achievements;
                
                // Initialize dailyReset with proper structure
                this.dailyReset = {
                    lastReset: data.dailyReset?.lastReset || new Date().toDateString(),
                    todaysProgress: {}
                };
                
                // Safely restore todaysProgress
                if (data.dailyReset?.todaysProgress && typeof data.dailyReset.todaysProgress === 'object') {
                    Object.keys(data.dailyReset.todaysProgress).forEach(chapterId => {
                        const completedSteps = data.dailyReset.todaysProgress[chapterId];
                        this.dailyReset.todaysProgress[chapterId] = this.safeConvertToSet(completedSteps);
                    });
                }
                
                // Migrate old data structures if needed
                this.migrateOldData();
                
            } catch (error) {
                console.error('Error loading saved data:', error);
                // If loading fails, initialize with defaults
                this.initializeDefaults();
            }
        }
    }

    safeConvertToSet(data) {
        if (data instanceof Set) {
            return data;
        } else if (Array.isArray(data)) {
            return new Set(data);
        } else if (data && typeof data === 'object') {
            // Handle plain objects - try to extract values
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
        // Migrate from older versions if needed
        if (this.currentQuest) {
            // Ensure all stages have the required properties
            this.currentQuest.stages.forEach((stage, index) => {
                if (!stage.hasOwnProperty('unlocked')) {
                    stage.unlocked = index === 0; // First stage unlocked by default
                }
                if (!stage.hasOwnProperty('completed')) {
                    stage.completed = false;
                }
                
                // Ensure all steps have required properties
                stage.steps.forEach(step => {
                    if (!step.hasOwnProperty('completedToday')) {
                        step.completedToday = false;
                    }
                    if (!step.hasOwnProperty('completed')) {
                        step.completed = false;
                    }
                });
            });
            
            // Ensure quest has currentDay
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
            totalDays: 0
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
        localStorage.removeItem('careerQuest');
    }
}