class UIManager {
    constructor(questManager) {
        this.questManager = questManager;
        this.isEditMode = false;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Quest creation
        document.getElementById('addStageBtn').addEventListener('click', () => this.addStage());
        document.getElementById('startQuestBtn').addEventListener('click', () => this.startQuest());
        
        // Celebration
        document.getElementById('closeCelebration').addEventListener('click', () => this.hideCelebration());
        
        // Reset functionality
        document.getElementById('resetQuestBtn').addEventListener('click', () => this.showResetConfirmation());
        document.getElementById('confirmResetBtn').addEventListener('click', () => this.confirmReset());
        document.getElementById('cancelResetBtn').addEventListener('click', () => this.hideResetConfirmation());

        // Edit quest functionality
        document.getElementById('toggleEditBtn').addEventListener('click', () => this.showEditQuestModal());
        document.getElementById('addEditStageBtn').addEventListener('click', () => this.addEditStage());
        document.getElementById('saveQuestBtn').addEventListener('click', () => this.saveQuestEdits());
        document.getElementById('cancelEditBtn').addEventListener('click', () => this.hideEditQuestModal());

        // Event delegation for dynamic elements
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-stage')) {
                this.removeStage(e.target.closest('.stage'));
            } else if (e.target.classList.contains('add-step')) {
                this.addStep(e.target.closest('.stage'));
            } else if (e.target.classList.contains('remove-step')) {
                this.removeStep(e.target.closest('.step'));
            } else if (e.target.classList.contains('task-checkbox')) {
                this.handleTaskCompletion(e.target);
            } else if (e.target.classList.contains('daily-toggle-btn')) {
                this.handleDailyToggle(e.target);
            } else if (e.target.classList.contains('complete-stage-btn')) {
                const stageId = parseInt(e.target.getAttribute('data-stage-id'));
                this.completeStage(stageId);
            } else if (e.target.classList.contains('remove-edit-stage')) {
                this.removeEditStage(e.target.closest('.edit-stage'));
            } else if (e.target.classList.contains('add-edit-task')) {
                this.addEditTask(e.target.closest('.edit-stage'));
            } else if (e.target.classList.contains('remove-edit-task')) {
                this.removeEditTask(e.target.closest('.edit-task'));
            }
        });
    }

    // ===== QUEST CREATION METHODS =====
    addStage() {
        const stagesContainer = document.getElementById('stagesContainer');
        const template = document.getElementById('stageTemplate');
        const stageElement = template.content.cloneNode(true);
        stagesContainer.appendChild(stageElement);
        this.animateAdd(stagesContainer.lastElementChild);
    }

    removeStage(stageElement) {
        this.animateRemove(stageElement, () => stageElement.remove());
    }

    addStep(stageElement) {
        const stepsContainer = stageElement.querySelector('.steps-container');
        const template = document.getElementById('stepTemplate');
        const stepElement = template.content.cloneNode(true);
        stepsContainer.appendChild(stepElement);
        this.animateAdd(stepsContainer.lastElementChild);
    }

    removeStep(stepElement) {
        this.animateRemove(stepElement, () => stepElement.remove());
    }

    startQuest() {
        const questTitle = document.getElementById('questTitle').value.trim();
        const stageElements = document.querySelectorAll('.stage');
        
        if (!questTitle) {
            alert('Please enter your career goal!');
            return;
        }

        if (stageElements.length === 0) {
            alert('Please add at least one stage!');
            return;
        }

        const stages = Array.from(stageElements).map(stageElement => {
            const title = stageElement.querySelector('.stage-title').value.trim() || 'Unnamed Stage';
            const steps = Array.from(stageElement.querySelectorAll('.step-title'))
                .map(input => input.value.trim())
                .filter(step => step !== '');
            return { title, steps };
        });

        this.questManager.createQuest(questTitle, stages);
        this.showQuestProgress();
        this.renderQuestProgress();

        this.updatePlayerStats();
    }

    showQuestProgress() {
        document.getElementById('questCreationPanel').classList.add('hidden');
        document.getElementById('questProgressPanel').classList.remove('hidden');
    }

    // ===== QUEST PROGRESS RENDERING =====
    renderQuestProgress() {
        const quest = this.questManager.currentQuest;
        if (!quest) return;

        document.getElementById('currentQuestTitle').textContent = quest.title;
        document.getElementById('destinationTitle').textContent = quest.title;
        this.updatePlayerStats();
        this.renderRoadmap();
        this.renderAllStageDetails();
        this.renderAchievements();
    }

    renderRoadmap() {
        const quest = this.questManager.currentQuest;
        const roadmapStops = document.getElementById('roadmapStops');
        roadmapStops.innerHTML = '';

        quest.stages.forEach((stage, index) => {
            const template = document.getElementById('roadmapStopTemplate');
            const stopElement = template.content.cloneNode(true);
            const stop = stopElement.querySelector('.roadmap-stop');
            stop.setAttribute('data-stage-id', index);

            if (stage.completed) {
                stop.classList.add('completed');
                stop.querySelector('.completion-badge').classList.remove('hidden');
            } else {
                stop.classList.add('active');
            }

            const progressPercent = this.questManager.getStageProgress(index);
            stop.querySelector('.stage-name').textContent = stage.title;
            
            // Show different text based on completion state
            if (stage.completed) {
                stop.querySelector('.stage-progress-text').textContent = 'Completed!';
            } else if (progressPercent === 100) {
                stop.querySelector('.stage-progress-text').textContent = 'Ready to Complete!';
            } else {
                stop.querySelector('.stage-progress-text').textContent = `${Math.round(progressPercent)}% Complete`;
            }
            
            roadmapStops.appendChild(stopElement);
        });

        this.updateRoadProgress();
    }


     updateRoadProgress() {
        const progress = this.questManager.getQuestProgress();
        const roadProgress = document.getElementById('roadProgress');
        const progressTraveler = document.getElementById('progressTraveler');
        const travelerTooltip = document.getElementById('travelerTooltip');
        
        // Road progress shows overall completion including partial stages
        const progressPercent = progress.overall;
        roadProgress.style.width = `${progressPercent}%`;
        
        // Traveler position is based on completed stages + current stage progress
        const completedStages = progress.completedStages;
        const totalStages = progress.totalStages;
        
        let travelerPosition;
        if (completedStages === totalStages) {
            // At destination
            travelerPosition = 100;
        } else if (completedStages === 0) {
            // At start, show progress of first stage
            const firstStageProgress = this.questManager.getStageProgress(0);
            travelerPosition = (firstStageProgress / 100) * (100 / totalStages);
        } else {
            // Completed stages + current stage progress
            const completedPercentage = (completedStages / totalStages) * 100;
            const currentStageIndex = completedStages;
            const currentStageProgress = this.questManager.getStageProgress(currentStageIndex);
            const currentStageContribution = (currentStageProgress / 100) * (100 / totalStages);
            travelerPosition = completedPercentage + currentStageContribution;
        }
        
        progressTraveler.style.left = `${travelerPosition}%`;
        
        // Update traveler tooltip
        const currentStage = this.questManager.currentQuest.stages.find(stage => !stage.completed);
        if (currentStage) {
            const currentStageProgress = this.questManager.getStageProgress(currentStage.id - 1);
            if (currentStageProgress === 100) {
                travelerTooltip.textContent = `Ready to complete: ${currentStage.title}`;
            } else {
                travelerTooltip.textContent = `Working on: ${currentStage.title} (${Math.round(currentStageProgress)}%)`;
            }
        } else if (progress.overall === 100) {
            travelerTooltip.textContent = 'Destination reached! 🎉';
        } else {
            travelerTooltip.textContent = 'Starting journey...';
        }
        
        document.getElementById('distanceTraveled').textContent = `${Math.round(progressPercent)}%`;
    }

    renderAllStageDetails() {
        const quest = this.questManager.currentQuest;
        const stageDetailsContainer = document.getElementById('stageDetailsContainer');
        
        if (!stageDetailsContainer) {
            const stageDetailsPanel = document.querySelector('.stage-details-panel');
            stageDetailsPanel.innerHTML = `
                <h3>All Stages & Tasks</h3>
                <div class="stage-progress-overview">
                    <div class="progress-info">
                        <span>Overall Progress</span>
                        <span id="overallStageProgress">0%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="overallStageProgressFill"></div>
                    </div>
                </div>
                <div class="all-stages-container" id="stageDetailsContainer"></div>
            `;
        }

        const container = document.getElementById('stageDetailsContainer');
        container.innerHTML = '';

        // Update overall stage progress
        const progress = this.questManager.getQuestProgress();
        document.getElementById('overallStageProgress').textContent = `${Math.round(progress.overall)}%`;
        document.getElementById('overallStageProgressFill').style.width = `${progress.overall}%`;

        quest.stages.forEach((stage, stageIndex) => {
            const stageProgress = this.questManager.getStageProgress(stageIndex);
            const isReadyToComplete = stageProgress === 100 && !stage.completed;
            
            const stageElement = document.createElement('div');
            stageElement.className = `stage-section ${stage.completed ? 'completed' : ''} ${isReadyToComplete ? 'ready-to-complete' : ''}`;
            stageElement.innerHTML = `
                <div class="stage-header">
                    <h4 class="stage-title">${stage.title}</h4>
                    <div class="stage-actions">
                        <div class="stage-progress">
                            <span>${stageProgress}% Complete</span>
                            ${isReadyToComplete ? '<span class="ready-badge">Ready!</span>' : ''}
                        </div>
                        <button class="btn ${isReadyToComplete ? 'btn-success' : 'btn-outline'} btn-sm complete-stage-btn" 
                                data-stage-id="${stageIndex}"
                                ${stage.completed ? 'disabled' : ''}>
                            ${stage.completed ? '✓ Completed' : (isReadyToComplete ? 'Complete Stage' : 'Mark Complete')}
                        </button>
                    </div>
                </div>
                <div class="stage-progress-bar">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${stageProgress}%"></div>
                    </div>
                </div>
                <div class="stage-tasks-grid" id="tasks-${stageIndex}"></div>
            `;

            container.appendChild(stageElement);
            this.renderStageTasks(stageIndex, stage);
        });
    }

    renderStageTasks(stageIndex, stage) {
        const tasksContainer = document.getElementById(`tasks-${stageIndex}`);
        tasksContainer.innerHTML = '';

        stage.steps.forEach((task, taskIndex) => {
            const taskElement = document.createElement('div');
            taskElement.className = `stage-task ${task.completedToday ? 'completed' : ''} ${task.isDaily ? 'daily' : ''}`;
            
            // Show different tooltip for daily tasks
            const dailyTooltip = task.isDaily ? 'title="This task resets daily. Completing it counts toward stage progress for today."' : '';
            
            taskElement.innerHTML = `
                <div class="task-content">
                    <input type="checkbox" class="task-checkbox" 
                           data-stage-id="${stageIndex}" 
                           data-task-id="${taskIndex}"
                           ${task.completedToday ? 'checked' : ''}
                           ${stage.completed ? 'disabled' : ''}
                           ${dailyTooltip}>
                    <span class="task-title">${task.title}</span>
                    <button class="btn btn-sm daily-toggle-btn ${task.isDaily ? 'btn-warning' : 'btn-outline'}" 
                            data-stage-id="${stageIndex}" 
                            data-task-id="${taskIndex}"
                            title="${task.isDaily ? 'Remove daily status' : 'Make this a daily practice task'}">
                        ${task.isDaily ? '⭐ Daily' : 'Make Daily'}
                    </button>
                </div>
                <div class="task-info">
                    <span class="task-xp">+${task.xp} XP</span>
                    ${task.isDaily ? '<span class="daily-badge" title="Resets daily">Daily</span>' : ''}
                </div>
            `;
            tasksContainer.appendChild(taskElement);
        });
    }

    getStageProgress(stage) {
        if (stage.completed) return 100;
        const completedTasks = stage.steps.filter(task => task.completed || task.completedToday).length;
        const totalTasks = stage.steps.length;
        return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    }

    handleTaskCompletion(checkbox) {
        const taskId = parseInt(checkbox.getAttribute('data-task-id'));
        const stageId = parseInt(checkbox.getAttribute('data-stage-id'));
        
        const result = this.questManager.completeStep(stageId, taskId);
        
        if (result) {
            const taskElement = checkbox.closest('.stage-task');
            taskElement.classList.add('completed');
            
            this.animateXP(result.xpGained);
            this.updateRoadProgress();
            this.renderAllStageDetails();
            this.updatePlayerStats();
            
            if (result.leveledUp) {
                this.showLevelUpAnimation(result.newLevel);
            }
            
            // CHANGED: Only show stage completion if it actually happened
            // and only for non-daily tasks or when explicitly completed
            if (result.chapterCompleted) {
                this.showStageCompleteAnimation(this.questManager.currentQuest.stages[stageId].title, result.autoCompleted);
            }
            
            this.renderAchievements();
        }
    }

    handleDailyToggle(button) {
            const taskId = parseInt(button.getAttribute('data-task-id'));
            const stageId = parseInt(button.getAttribute('data-stage-id'));
            
            const success = this.questManager.toggleDailyTask(stageId, taskId);
            if (success) {
                // Show feedback about what changed
                const task = this.questManager.currentQuest.stages[stageId].steps[taskId];
                if (task.isDaily) {
                    this.showToast('Task marked as daily practice! It will reset each day.', 'info');
                } else {
                    this.showToast('Task removed from daily practice.', 'info');
                }
                
                this.renderAllStageDetails();
            }
        }

    // Show quick toast messages
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast-message toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'info' ? '#2196F3' : type === 'success' ? '#4CAF50' : '#FF9800'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 2004;
            animation: slideDown 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    completeStage(stageId) {
        const success = this.questManager.completeStage(stageId);
        if (success) {
            this.updateRoadProgress();
            this.renderAllStageDetails();
            this.updatePlayerStats();
            this.showStageCompleteAnimation(this.questManager.currentQuest.stages[stageId].title);
            this.renderAchievements();
        }
    }

    // ===== EDIT QUEST FUNCTIONALITY =====
    showEditQuestModal() {
        const modal = document.getElementById('editQuestModal');
        this.populateEditForm();
        modal.classList.remove('hidden');
    }

    hideEditQuestModal() {
        const modal = document.getElementById('editQuestModal');
        modal.classList.add('hidden');
    }

    populateEditForm() {
        const quest = this.questManager.currentQuest;
        if (!quest) return;
        
        document.getElementById('editQuestTitle').value = quest.title;
        const editStagesContainer = document.getElementById('editStagesContainer');
        editStagesContainer.innerHTML = '';
        
        quest.stages.forEach((stage, index) => {
            const taskTitles = stage.steps.map(task => task.title);
            this.addEditStage(stage.title, taskTitles);
        });
    }

    addEditStage(title = "New Stage", tasks = []) {
        const editStagesContainer = document.getElementById('editStagesContainer');
        const template = document.getElementById('editStageTemplate');
        const stageElement = template.content.cloneNode(true);
        
        const stage = stageElement.querySelector('.edit-stage');
        const titleInput = stage.querySelector('.edit-stage-title');
        titleInput.value = title;
        
        const tasksContainer = stage.querySelector('.edit-tasks-container');
        tasks.forEach(taskTitle => {
            this.addEditTaskToContainer(tasksContainer, taskTitle);
        });
        
        editStagesContainer.appendChild(stage);
        this.animateAdd(editStagesContainer.lastElementChild);
    }

    removeEditStage(stageElement) {
        this.animateRemove(stageElement, () => stageElement.remove());
    }

    addEditTask(stageElement) {
        const tasksContainer = stageElement.querySelector('.edit-tasks-container');
        this.addEditTaskToContainer(tasksContainer);
    }

    addEditTaskToContainer(container, title = "New Task") {
        const template = document.getElementById('editTaskTemplate');
        const taskElement = template.content.cloneNode(true);
        
        const task = taskElement.querySelector('.edit-task');
        const titleInput = task.querySelector('.edit-task-title');
        titleInput.value = title;
        
        container.appendChild(task);
        this.animateAdd(container.lastElementChild);
    }

    removeEditTask(taskElement) {
        this.animateRemove(taskElement, () => taskElement.remove());
    }

    saveQuestEdits() {
        const newTitle = document.getElementById('editQuestTitle').value.trim();
        const stageElements = document.querySelectorAll('.edit-stage');
        
        if (!newTitle) {
            alert('Please enter your career goal!');
            return;
        }

        if (stageElements.length === 0) {
            alert('Please keep at least one stage!');
            return;
        }

        const stages = Array.from(stageElements).map(stageElement => {
            const title = stageElement.querySelector('.edit-stage-title').value.trim() || 'Unnamed Stage';
            const tasks = Array.from(stageElement.querySelectorAll('.edit-task-title'))
                .map(input => input.value.trim())
                .filter(task => task !== '');
            return { title, steps: tasks };
        });

        this.updateExistingQuest(newTitle, stages);
        this.hideEditQuestModal();
        this.renderQuestProgress();
        this.showEditSuccessMessage();
    }

    updateExistingQuest(newTitle, newStages) {
        const oldQuest = this.questManager.currentQuest;
        oldQuest.title = newTitle;
        
        const currentProgress = this.getCurrentProgressState(oldQuest);
        const updatedStages = newStages.map((newStage, index) => {
            return {
                id: index + 1,
                title: newStage.title,
                steps: newStage.steps.map((newStep, stepIndex) => {
                    const oldStep = this.findMatchingStep(currentProgress, newStage.title, newStep, index, stepIndex);
                    return {
                        id: stepIndex + 1,
                        title: newStep,
                        completed: oldStep?.completed || false,
                        completedToday: oldStep?.completedToday || false,
                        xp: this.questManager.calculateStepXP(newStage.steps.length)
                    };
                }),
                completed: this.isStageCompleted(currentProgress, newStage.title, index),
                unlocked: this.isStageUnlocked(currentProgress, newStage.title, index)
            };
        });

        oldQuest.stages = updatedStages;
        this.fixStageProgression(oldQuest);
        this.questManager.saveToLocalStorage();
    }

    getCurrentProgressState(quest) {
        return {
            stages: quest.stages.map(stage => ({
                title: stage.title,
                completed: stage.completed,
                unlocked: stage.unlocked,
                steps: stage.steps.map(step => ({
                    title: step.title,
                    completed: step.completed,
                    completedToday: step.completedToday
                }))
            }))
        };
    }

    findMatchingStep(progress, stageTitle, stepTitle, stageIndex, stepIndex) {
        const exactStage = progress.stages.find(stage => stage.title === stageTitle);
        if (exactStage) {
            const exactStep = exactStage.steps.find(step => step.title === stepTitle);
            if (exactStep) return exactStep;
        }
        
        const indexStage = progress.stages[stageIndex];
        if (indexStage && indexStage.steps[stepIndex]) {
            return indexStage.steps[stepIndex];
        }
        
        return null;
    }

    isStageCompleted(progress, stageTitle, stageIndex) {
        const exactStage = progress.stages.find(stage => stage.title === stageTitle);
        if (exactStage) return exactStage.completed;
        const indexStage = progress.stages[stageIndex];
        return indexStage ? indexStage.completed : false;
    }

    isStageUnlocked(progress, stageTitle, stageIndex) {
        if (stageIndex === 0) return true;
        const exactStage = progress.stages.find(stage => stage.title === stageTitle);
        if (exactStage) return exactStage.unlocked;
        const previousStagesCompleted = progress.stages.slice(0, stageIndex).every(stage => stage.completed);
        return previousStagesCompleted;
    }

    fixStageProgression(quest) {
        let foundIncompleteStage = false;
        quest.stages.forEach((stage, index) => {
            if (index === 0) {
                stage.unlocked = true;
            } else if (foundIncompleteStage) {
                stage.unlocked = false;
            } else {
                const previousStagesCompleted = quest.stages.slice(0, index).every(prevStage => prevStage.completed);
                stage.unlocked = previousStagesCompleted;
            }
            if (!stage.completed && !foundIncompleteStage) {
                foundIncompleteStage = true;
            }
        });
    }

    // ===== UI FEEDBACK AND ANIMATIONS =====
    showEditSuccessMessage() {
        const message = document.createElement('div');
        message.className = 'edit-success-message';
        message.textContent = '✓ Quest updated successfully!';
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 2003;
            animation: slideInRight 0.5s ease;
        `;
        
        document.body.appendChild(message);
        setTimeout(() => {
            if (document.body.contains(message)) {
                message.style.animation = 'slideOutRight 0.5s ease';
                setTimeout(() => message.remove(), 500);
            }
        }, 3000);
    }

     showStageCompleteAnimation(stageTitle, autoCompleted = false) {
        const message = document.createElement('div');
        message.className = 'stage-complete-message';
        
        if (autoCompleted) {
            message.innerHTML = `
                <div class="message-content">
                    <h3>🎉 Stage Auto-Completed!</h3>
                    <p>You finished all tasks in "${stageTitle}"!</p>
                    <p class="auto-complete-note">The stage was automatically marked as complete.</p>
                    <button class="btn btn-primary close-message">Continue Journey</button>
                </div>
            `;
        } else {
            message.innerHTML = `
                <div class="message-content">
                    <h3>🎉 Stage Complete!</h3>
                    <p>You've completed "${stageTitle}"!</p>
                    <button class="btn btn-primary close-message">Continue Journey</button>
                </div>
            `;
        }
        
        message.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2002;
        `;
        
        const content = message.querySelector('.message-content');
        content.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            max-width: 400px;
            animation: popIn 0.5s ease;
        `;
        
        document.body.appendChild(message);
        message.querySelector('.close-message').addEventListener('click', () => {
            message.remove();
            this.renderQuestProgress();
        });
        
        setTimeout(() => {
            if (document.body.contains(message)) {
                message.remove();
                this.renderQuestProgress();
            }
        }, 5000);
    }

    animateXP(xpGained) {
        const xpElement = document.getElementById('playerXP');
        const originalXP = parseInt(xpElement.textContent);
        const newXP = originalXP + xpGained;
        
        const floatingXP = document.createElement('div');
        floatingXP.textContent = `+${xpGained} XP`;
        floatingXP.style.cssText = `
            position: fixed;
            color: #FF9800;
            font-weight: bold;
            font-size: 1.2em;
            pointer-events: none;
            z-index: 1000;
            animation: floatUp 1s ease-out forwards;
        `;
        
        document.body.appendChild(floatingXP);
        
        let current = originalXP;
        const increment = Math.ceil(xpGained / 20);
        const timer = setInterval(() => {
            current += increment;
            if (current >= newXP) {
                current = newXP;
                clearInterval(timer);
            }
            xpElement.textContent = current;
        }, 50);
        
        setTimeout(() => floatingXP.remove(), 1000);
    }

    updatePlayerStats() {
        // Header stats (these use the original IDs)
        document.getElementById('playerLevel').textContent = this.questManager.player.level;
        document.getElementById('playerXP').textContent = this.questManager.player.xp;
        document.getElementById('playerStreak').textContent = this.questManager.player.streak;
        
        // Quest progress panel stats (use the new IDs with 'Progress' suffix)
        document.getElementById('currentDayProgress').textContent = this.questManager.currentQuest.currentDay;
        document.getElementById('totalDaysProgress').textContent = this.questManager.player.totalDays;
        
        // Update distance traveled
        const progress = this.questManager.getQuestProgress();
        document.getElementById('distanceTraveled').textContent = `${Math.round(progress.distanceTraveled)}%`;
    }

    renderAchievements() {
        const grid = document.getElementById('achievementsGrid');
        grid.innerHTML = '';
        
        this.questManager.achievements.forEach(achievement => {
            const template = document.getElementById('achievementTemplate');
            const achievementElement = template.content.cloneNode(true);
            const achievementDiv = achievementElement.querySelector('.achievement');
            const icon = achievementDiv.querySelector('.achievement-icon');
            const title = achievementDiv.querySelector('.achievement-title');
            const description = achievementDiv.querySelector('.achievement-description');
            
            if (achievement.unlocked) {
                achievementDiv.classList.remove('locked');
                achievementDiv.classList.add('unlocked');
                icon.textContent = '🏆';
                title.textContent = achievement.title;
                description.textContent = achievement.description + ` (+${achievement.xp} XP)`;
            } else {
                title.textContent = '???';
                description.textContent = 'Keep progressing to unlock';
            }
            
            grid.appendChild(achievementElement);
        });
    }

    showLevelUpAnimation(newLevel) {
        const celebration = document.getElementById('celebration');
        const newLevelElement = document.getElementById('newLevel');
        newLevelElement.textContent = newLevel;
        celebration.classList.remove('hidden');
        this.createConfetti();
    }

    hideCelebration() {
        document.getElementById('celebration').classList.add('hidden');
    }

    createConfetti() {
        const colors = ['#FFD700', '#FF9800', '#4CAF50', '#2196F3', '#9C27B0'];
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                top: -20px;
                left: ${Math.random() * 100}vw;
                border-radius: 2px;
                animation: confettiFall ${1 + Math.random() * 2}s linear forwards;
                z-index: 1001;
            `;
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 3000);
        }
    }

    // ===== RESET FUNCTIONALITY =====
    showResetConfirmation() {
        document.getElementById('resetModal').classList.remove('hidden');
    }

    hideResetConfirmation() {
        document.getElementById('resetModal').classList.add('hidden');
    }

    confirmReset() {
        this.hideResetConfirmation();
        const resetBtn = document.getElementById('resetQuestBtn');
        const originalText = resetBtn.textContent;
        resetBtn.textContent = 'Resetting...';
        resetBtn.disabled = true;

        setTimeout(() => {
            this.questManager.resetQuest();
            this.showResetMessage();
            this.showQuestCreation();
            resetBtn.textContent = originalText;
            resetBtn.disabled = false;
        }, 1000);
    }

    showResetMessage() {
        const message = document.createElement('div');
        message.className = 'reset-message';
        message.innerHTML = `
            <div class="reset-message-content">
                <h3>🎯 Quest Reset!</h3>
                <p>All progress has been reset. Time for a fresh start!</p>
                <button class="btn btn-primary close-reset-message">Start New Quest</button>
            </div>
        `;
        
        message.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2001;
        `;
        
        const content = message.querySelector('.reset-message-content');
        content.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            max-width: 400px;
            animation: popIn 0.5s ease;
        `;
        
        document.body.appendChild(message);
        message.querySelector('.close-reset-message').addEventListener('click', () => message.remove());
        setTimeout(() => { if (document.body.contains(message)) message.remove(); }, 5000);
    }

    showQuestCreation() {
        document.getElementById('questProgressPanel').classList.add('hidden');
        document.getElementById('questCreationPanel').classList.remove('hidden');
        document.getElementById('questTitle').value = '';
        document.getElementById('stagesContainer').innerHTML = '';
        this.addStage();
    }

    // ===== ANIMATION HELPERS =====
    animateAdd(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(-20px)';
        requestAnimationFrame(() => {
            element.style.transition = 'all 0.3s ease';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        });
    }

    animateRemove(element, callback) {
        element.style.transition = 'all 0.3s ease';
        element.style.opacity = '0';
        element.style.transform = 'translateY(-20px)';
        setTimeout(callback, 300);
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes floatUp {
        0% { transform: translateY(0); opacity: 1; }
        100% { transform: translateY(-50px); opacity: 0; }
    }
    
    @keyframes confettiFall {
        0% { transform: translateY(0) rotate(0deg); }
        100% { transform: translateY(100vh) rotate(360deg); }
    }
    
    @keyframes slideIn {
        0% { transform: translateX(-100%); opacity: 0; }
        100% { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideInRight {
        0% { transform: translateX(100%); opacity: 0; }
        100% { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        0% { transform: translateX(0); opacity: 1; }
        100% { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes popIn {
        0% { transform: scale(0.5); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
    }
    
    .edit-success-message {
        box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
    }
    
    .stage-complete-message {
        z-index: 2002;
    }
`;
document.head.appendChild(style);