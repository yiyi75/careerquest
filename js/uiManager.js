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

        // Edit quest functionality - FIXED: Added proper event listeners
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
            } else if (e.target.classList.contains('level-checkbox')) {
                this.handleLevelCompletion(e.target);
            } else if (e.target.classList.contains('task-checkbox')) {
                this.handleTaskCompletion(e.target);
            } else if (e.target.classList.contains('daily-toggle-btn')) {
                this.handleDailyToggle(e.target);
            } else if (e.target.classList.contains('complete-stage-btn')) {
                // Handled in renderStageTasks
            } else if (e.target.classList.contains('remove-edit-stage')) {
                this.removeEditStage(e.target.closest('.edit-stage'));
            } else if (e.target.classList.contains('add-edit-task')) {
                this.addEditTask(e.target.closest('.edit-stage'));
            } else if (e.target.classList.contains('remove-edit-task')) {
                this.removeEditTask(e.target.closest('.edit-task'));
            }
        });

        console.log('Event listeners initialized!'); // Debug log
    }

    addStage() {
        const stagesContainer = document.getElementById('stagesContainer');
        const template = document.getElementById('stageTemplate');
        const stageElement = template.content.cloneNode(true);
        
        stagesContainer.appendChild(stageElement);
        this.animateAdd(stagesContainer.lastElementChild);
    }

    removeStage(stageElement) {
        this.animateRemove(stageElement, () => {
            stageElement.remove();
        });
    }

    addStep(stageElement) {
        const stepsContainer = stageElement.querySelector('.steps-container');
        const template = document.getElementById('stepTemplate');
        const stepElement = template.content.cloneNode(true);
        
        stepsContainer.appendChild(stepElement);
        this.animateAdd(stepsContainer.lastElementChild);
    }

    removeStep(stepElement) {
        this.animateRemove(stepElement, () => {
            stepElement.remove();
        });
    }

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

        // Create the quest
        this.questManager.createQuest(questTitle, stages);
        
        // Switch to progress view
        this.showQuestProgress();
        this.renderQuestProgress();
    }

    showQuestProgress() {
        document.getElementById('questCreationPanel').classList.add('hidden');
        document.getElementById('questProgressPanel').classList.remove('hidden');
    }

    renderQuestProgress() {
        const quest = this.questManager.currentQuest;
        if (!quest) return;

        // Update quest title and stats
        document.getElementById('currentQuestTitle').textContent = quest.title;
        document.getElementById('destinationTitle').textContent = quest.title;
        this.updatePlayerStats();

        // Render roadmap
        this.renderRoadmap();
        
        // CHANGED: Render ALL stage details, not just current stage
        this.renderAllStageDetails();
        
        // Render achievements
        this.renderAchievements();
    }

    // Render all stages and their tasks
    renderAllStageDetails() {
        const quest = this.questManager.currentQuest;
        const stageDetailsContainer = document.getElementById('stageDetailsContainer');
        
        // Create container for all stages if it doesn't exist
        if (!stageDetailsContainer) {
            const stageDetailsPanel = document.querySelector('.stage-details-panel');
            stageDetailsPanel.innerHTML = `
                <h3>All Stages & Tasks</h3>
                <div class="all-stages-container" id="stageDetailsContainer"></div>
            `;
        }

        const container = document.getElementById('stageDetailsContainer');
        container.innerHTML = '';

        quest.stages.forEach((stage, stageIndex) => {
            const stageElement = document.createElement('div');
            stageElement.className = `stage-section ${stage.completed ? 'completed' : ''}`;
            stageElement.innerHTML = `
                <div class="stage-header">
                    <h4 class="stage-title">${stage.title}</h4>
                    <div class="stage-actions">
                        <div class="stage-progress">
                            <span>${this.getStageProgress(stage)}% Complete</span>
                        </div>
                        <button class="btn btn-outline btn-sm complete-stage-btn" 
                                data-stage-id="${stageIndex}">
                            ${stage.completed ? '✓ Completed' : 'Mark Complete'}
                        </button>
                    </div>
                </div>
                <div class="stage-tasks-grid" id="tasks-${stageIndex}">
                    <!-- Tasks will be added here -->
                </div>
            `;

            container.appendChild(stageElement);

            // Render tasks for this stage
            this.renderStageTasks(stageIndex, stage);
        });
    }

    // Render tasks for a specific stage
    renderStageTasks(stageIndex, stage) {
        const tasksContainer = document.getElementById(`tasks-${stageIndex}`);
        tasksContainer.innerHTML = '';

        stage.steps.forEach((task, taskIndex) => {
            const taskElement = document.createElement('div');
            taskElement.className = `stage-task ${task.completedToday ? 'completed' : ''} ${task.isDaily ? 'daily' : ''}`;
            taskElement.innerHTML = `
                <div class="task-content">
                    <input type="checkbox" class="task-checkbox" 
                           data-stage-id="${stageIndex}" 
                           data-task-id="${taskIndex}"
                           ${task.completedToday ? 'checked' : ''}
                           ${stage.completed && !task.isDaily ? 'disabled' : ''}>
                    <span class="task-title">${task.title}</span>
                    <button class="btn btn-sm daily-toggle-btn ${task.isDaily ? 'btn-warning' : 'btn-outline'}" 
                            data-stage-id="${stageIndex}" 
                            data-task-id="${taskIndex}">
                        ${task.isDaily ? '⭐ Daily' : 'Make Daily'}
                    </button>
                </div>
                <div class="task-info">
                    <span class="task-xp">+${task.xp} XP</span>
                    ${task.isDaily ? '<span class="daily-badge">Daily</span>' : ''}
                </div>
            `;

            tasksContainer.appendChild(taskElement);
        });

        // Add event listener for stage completion button
        const completeBtn = tasksContainer.closest('.stage-section').querySelector('.complete-stage-btn');
        completeBtn.addEventListener('click', (e) => {
            const stageId = parseInt(e.target.getAttribute('data-stage-id'));
            this.completeStage(stageId);
        });
    }

    // Get stage progress percentage
    getStageProgress(stage) {
        const totalTasks = stage.steps.length;
        const completedTasks = stage.steps.filter(task => task.completed || task.completedToday).length;
        return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    }

    // Handle stage completion
    completeStage(stageId) {
        const success = this.questManager.completeStage(stageId);
        if (success) {
            this.renderQuestProgress();
            this.showStageCompleteAnimation(this.questManager.currentQuest.stages[stageId].title);
        }
    }

    renderRoadmap() {
        const quest = this.questManager.currentQuest;
        const roadmapStops = document.getElementById('roadmapStops');
        roadmapStops.innerHTML = '';

        const progress = this.questManager.getQuestProgress();
        
        // Create stops for each stage
        quest.stages.forEach((stage, index) => {
            const template = document.getElementById('roadmapStopTemplate');
            const stopElement = template.content.cloneNode(true);
            
            const stop = stopElement.querySelector('.roadmap-stop');
            stop.setAttribute('data-stage-id', index);
            
            const stageProgress = progress.chapters.find(ch => ch.id === stage.id);
            
            // Set stop state
            if (stage.completed) {
                stop.classList.add('completed');
                stop.querySelector('.completion-badge').classList.remove('hidden');
            } else {
                stop.classList.add('active'); // All stages are active now
            }
            
            // Update stop content with stage progress
            const progressPercent = this.questManager.getStageProgress(index);
            stop.querySelector('.stage-name').textContent = stage.title;
            stop.querySelector('.stage-progress-text').textContent = 
                stage.completed ? 'Completed!' : `${Math.round(progressPercent)}% Complete`;
            
            roadmapStops.appendChild(stopElement);
        });

        // Update progress traveler and road
        this.updateRoadProgress();
    }

    // Handle stage completion
    completeStage(stageId) {
        const success = this.questManager.completeStage(stageId);
        if (success) {
            // Update progress immediately
            this.updateRoadProgress();
            this.renderAllStageDetails();
            this.updatePlayerStats();
            
            // Show celebration
            this.showStageCompleteAnimation(this.questManager.currentQuest.stages[stageId].title);
            
            // Check for achievements
            this.renderAchievements();
        }
    }

    updateRoadProgress() {
        const progress = this.questManager.getQuestProgress();
        const roadProgress = document.getElementById('roadProgress');
        const progressTraveler = document.getElementById('progressTraveler');
        const travelerTooltip = document.getElementById('travelerTooltip');
        
        // Calculate position based on stage completion progress
        const progressPercent = progress.overall;
        
        // Animate road progress
        roadProgress.style.width = `${progressPercent}%`;
        
        // Animate traveler position based on completed stages
        const completedStages = progress.completedStages;
        const totalStages = progress.totalStages;
        
        let travelerPosition;
        if (completedStages === totalStages) {
            // At destination
            travelerPosition = 100;
        } else if (completedStages === 0) {
            // At start
            travelerPosition = 0;
        } else {
            // Between stages - calculate position based on completed stages
            // Add partial progress for current stage
            const currentStageIndex = completedStages;
            if (currentStageIndex < totalStages) {
                const currentStageProgress = this.questManager.getStageProgress(currentStageIndex);
                travelerPosition = (completedStages / totalStages) * 100 + (currentStageProgress / totalStages);
            } else {
                travelerPosition = (completedStages / totalStages) * 100;
            }
        }
        
        progressTraveler.style.left = `${travelerPosition}%`;
        
        // Update traveler tooltip
        const currentStage = this.questManager.currentQuest.stages.find(stage => !stage.completed);
        if (currentStage) {
            const currentStageProgress = this.questManager.getStageProgress(currentStage.id - 1);
            travelerTooltip.textContent = `Working on: ${currentStage.title} (${Math.round(currentStageProgress)}%)`;
        } else if (progress.overall === 100) {
            travelerTooltip.textContent = 'Destination reached! 🎉';
        } else {
            travelerTooltip.textContent = 'Starting journey...';
        }
        
        // Update distance traveled
        document.getElementById('distanceTraveled').textContent = `${Math.round(progressPercent)}%`;
    }

    renderCurrentStageDetails() {
        const quest = this.questManager.currentQuest;
        const currentStage = quest.stages.find(stage => stage.unlocked && !stage.completed) || quest.stages[0];
        
        if (!currentStage) return;
        
        const progress = this.questManager.getQuestProgress();
        const stageProgress = progress.chapters.find(ch => ch.id === currentStage.id);
        
        // Update stage title
        document.getElementById('currentStageTitle').textContent = currentStage.title;
        
        // Update stage progress
        document.getElementById('stageProgressText').textContent = `${Math.round(stageProgress.progress)}%`;
        document.getElementById('stageProgressFill').style.width = `${stageProgress.progress}%`;
        
        // Render tasks
        const stageTasks = document.getElementById('stageTasks');
        stageTasks.innerHTML = '';
        
        currentStage.steps.forEach((task, index) => {
            const template = document.getElementById('stageTaskTemplate');
            const taskElement = template.content.cloneNode(true);
            
            const taskDiv = taskElement.querySelector('.stage-task');
            taskDiv.setAttribute('data-task-id', index);
            taskDiv.setAttribute('data-stage-id', currentStage.id - 1); // Add stage ID for reference
            
            // Apply appropriate classes
            if (task.completedToday) {
                taskDiv.classList.add('completed');
            }
            if (!currentStage.unlocked || currentStage.completed) {
                taskDiv.classList.add('locked');
            }
            
            const checkbox = taskDiv.querySelector('.task-checkbox');
            checkbox.checked = task.completedToday;
            checkbox.disabled = !currentStage.unlocked || currentStage.completed;
            
            // Add data attributes for easier identification
            checkbox.setAttribute('data-task-id', index);
            checkbox.setAttribute('data-stage-id', currentStage.id - 1);
            
            taskDiv.querySelector('.task-title').textContent = task.title;
            taskDiv.querySelector('.task-xp span').textContent = task.xp;
            
            stageTasks.appendChild(taskElement);
        });
        
        console.log('Rendered', currentStage.steps.length, 'tasks for stage:', currentStage.title);
    }

    // Handle task completion for any task
    handleTaskCompletion(checkbox) {
        const taskId = parseInt(checkbox.getAttribute('data-task-id'));
        const stageId = parseInt(checkbox.getAttribute('data-stage-id'));
        
        const result = this.questManager.completeStep(stageId, taskId);
        
        if (result) {
            // Visual feedback
            const taskElement = checkbox.closest('.stage-task');
            taskElement.classList.add('completed');
            
            this.animateXP(result.xpGained);
            
            // Update progress
            this.updateRoadProgress();
            this.renderAllStageDetails(); // Re-render all stages to show updated state
            this.updatePlayerStats();
            
            // Check for level up
            if (result.leveledUp) {
                this.showLevelUpAnimation(result.newLevel);
            }
            
            // Check for stage completion
            if (result.chapterCompleted) {
                this.showStageCompleteAnimation(this.questManager.currentQuest.stages[stageId].title);
            }
            
            // Check for achievements
            this.renderAchievements();
        }
    }

    // Handle daily task toggling
    handleDailyToggle(button) {
        const taskId = parseInt(button.getAttribute('data-task-id'));
        const stageId = parseInt(button.getAttribute('data-stage-id'));
        
        const success = this.questManager.toggleDailyTask(stageId, taskId);
        if (success) {
            this.renderAllStageDetails(); // Refresh to show updated state
        }
    }

    // EDIT QUEST FUNCTIONALITY
    showEditQuestModal() {
        console.log('Edit quest button clicked!'); // Debug log
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
        if (!quest) {
            console.error('No quest found!');
            return;
        }
        
        console.log('Populating edit form with quest:', quest);
        
        document.getElementById('editQuestTitle').value = quest.title;
        
        const editStagesContainer = document.getElementById('editStagesContainer');
        editStagesContainer.innerHTML = '';
        
        quest.stages.forEach((stage, index) => {
            // Use the stage's actual tasks, not just titles
            const taskTitles = stage.steps.map(task => task.title);
            this.addEditStage(stage.title, taskTitles);
        });
        
        console.log('Edit form populated with', quest.stages.length, 'stages');
    }

    addEditStage(title = "New Stage", tasks = []) {
        const editStagesContainer = document.getElementById('editStagesContainer');
        const template = document.getElementById('editStageTemplate');
        const stageElement = template.content.cloneNode(true);
        
        const stage = stageElement.querySelector('.edit-stage');
        const titleInput = stage.querySelector('.edit-stage-title');
        titleInput.value = title;
        
        const tasksContainer = stage.querySelector('.edit-tasks-container');
        
        // Add tasks
        tasks.forEach(taskTitle => {
            this.addEditTaskToContainer(tasksContainer, taskTitle);
        });
        
        editStagesContainer.appendChild(stage);
        this.animateAdd(editStagesContainer.lastElementChild);
    }

    removeEditStage(stageElement) {
        this.animateRemove(stageElement, () => {
            stageElement.remove();
        });
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
        this.animateRemove(taskElement, () => {
            taskElement.remove();
        });
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

        // Create a new quest with the updated data
        this.questManager.createQuest(newTitle, stages);
        
        this.hideEditQuestModal();
        this.renderQuestProgress();
        
        // Show success message
        this.showEditSuccessMessage();
    }

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

    showStageCompleteAnimation(stageTitle) {
        const message = document.createElement('div');
        message.className = 'stage-complete-message';
        message.innerHTML = `
            <div class="message-content">
                <h3>🎉 Stage Complete!</h3>
                <p>You've completed "${stageTitle}"!</p>
                <button class="btn btn-primary close-message">Continue Journey</button>
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
            this.renderQuestProgress(); // Refresh to show next stage
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
        
        // Create floating XP text
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
        
        // Animate XP counter
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
        
        setTimeout(() => {
            floatingXP.remove();
        }, 1000);
    }

    updatePlayerStats() {
        document.getElementById('playerLevel').textContent = this.questManager.player.level;
        document.getElementById('playerXP').textContent = this.questManager.player.xp;
        document.getElementById('playerStreak').textContent = this.questManager.player.streak;
        document.getElementById('currentDay').textContent = this.questManager.currentQuest.currentDay;
        document.getElementById('totalDays').textContent = this.questManager.player.totalDays;
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
            
            setTimeout(() => {
                confetti.remove();
            }, 3000);
        }
    }

    // Reset functionality
    showResetConfirmation() {
        const resetModal = document.getElementById('resetModal');
        resetModal.classList.remove('hidden');
    }

    hideResetConfirmation() {
        const resetModal = document.getElementById('resetModal');
        resetModal.classList.add('hidden');
    }

    confirmReset() {
        this.hideResetConfirmation();
        
        // Show loading state
        const resetBtn = document.getElementById('resetQuestBtn');
        const originalText = resetBtn.textContent;
        resetBtn.textContent = 'Resetting...';
        resetBtn.disabled = true;

        // Perform reset
        setTimeout(() => {
            this.questManager.resetQuest();
            
            // Show reset confirmation message
            this.showResetMessage();
            
            // Switch back to quest creation
            this.showQuestCreation();
            
            // Reset button state
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
        
        // Close message when button is clicked
        message.querySelector('.close-reset-message').addEventListener('click', () => {
            message.remove();
        });
        
        // Auto-close after 5 seconds
        setTimeout(() => {
            if (document.body.contains(message)) {
                message.remove();
            }
        }, 5000);
    }

    showQuestCreation() {
        document.getElementById('questProgressPanel').classList.add('hidden');
        document.getElementById('questCreationPanel').classList.remove('hidden');
        
        // Reset creation form
        document.getElementById('questTitle').value = '';
        document.getElementById('stagesContainer').innerHTML = '';
        
        // Add first stage
        this.addStage();
    }

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


    showStageCompleteAnimation(stageTitle) {
        const message = document.createElement('div');
        message.className = 'stage-complete-message';
        message.innerHTML = `
            <div class="message-content">
                <h3>🎉 Stage Complete!</h3>
                <p>You've completed "${stageTitle}"!</p>
                <button class="btn btn-primary close-message">Continue Journey</button>
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
            this.renderQuestProgress(); // Refresh to show next stage
        });
        
        setTimeout(() => {
            if (document.body.contains(message)) {
                message.remove();
                this.renderQuestProgress();
            }
        }, 5000);
    }

    // Edit Quest Functionality
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
            this.addEditStage(stage.title, stage.steps.map(task => task.title));
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
        
        // Add tasks
        tasks.forEach(taskTitle => {
            this.addEditTaskToContainer(tasksContainer, taskTitle);
        });
        
        editStagesContainer.appendChild(stage);
        this.animateAdd(editStagesContainer.lastElementChild);
    }

    removeEditStage(stageElement) {
        this.animateRemove(stageElement, () => {
            stageElement.remove();
        });
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
        this.animateRemove(taskElement, () => {
            taskElement.remove();
        });
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

        const stages = Array.from(stageElements).map((stageElement, index) => {
            const title = stageElement.querySelector('.edit-stage-title').value.trim() || 'Unnamed Stage';
            const tasks = Array.from(stageElement.querySelectorAll('.edit-task-title'))
                .map(input => input.value.trim())
                .filter(task => task !== '');
            
            return { title, steps: tasks };
        });

        // FIXED: Update the existing quest instead of creating a new one
        this.updateExistingQuest(newTitle, stages);
        
        this.hideEditQuestModal();
        this.renderQuestProgress();
        
        // Show success message
        this.showEditSuccessMessage();
    }

    updateExistingQuest(newTitle, newStages) {
            const oldQuest = this.questManager.currentQuest;
            
            // Update the title
            oldQuest.title = newTitle;
            
            // Store current progress to maintain it
            const currentProgress = this.getCurrentProgressState(oldQuest);
            
            // Create new stages array
            const updatedStages = newStages.map((newStage, index) => {
                return {
                    id: index + 1,
                    title: newStage.title,
                    steps: newStage.steps.map((newStep, stepIndex) => {
                        // Try to find matching old step by exact title match
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

            // Update the quest with new stages
            oldQuest.stages = updatedStages;
            
            // Ensure proper stage progression
            this.fixStageProgression(oldQuest);
            
            // Save changes
            this.questManager.saveToLocalStorage();
            
            console.log('Quest updated successfully. New stages:', updatedStages);
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
            // First try exact match by stage title and step title
            const exactStage = progress.stages.find(stage => stage.title === stageTitle);
            if (exactStage) {
                const exactStep = exactStage.steps.find(step => step.title === stepTitle);
                if (exactStep) return exactStep;
            }
            
            // Fallback: try by index if titles don't match
            const indexStage = progress.stages[stageIndex];
            if (indexStage && indexStage.steps[stepIndex]) {
                return indexStage.steps[stepIndex];
            }
            
            // If no match found, return null (new step)
            return null;
        }

        isStageCompleted(progress, stageTitle, stageIndex) {
            // Try exact title match first
            const exactStage = progress.stages.find(stage => stage.title === stageTitle);
            if (exactStage) return exactStage.completed;
            
            // Fallback to index-based matching
            const indexStage = progress.stages[stageIndex];
            return indexStage ? indexStage.completed : false;
        }

        isStageUnlocked(progress, stageTitle, stageIndex) {
            // First stage is always unlocked
            if (stageIndex === 0) return true;
            
            // Try exact title match first
            const exactStage = progress.stages.find(stage => stage.title === stageTitle);
            if (exactStage) return exactStage.unlocked;
            
            // For new stages, unlock if all previous stages are completed
            const previousStagesCompleted = progress.stages
                .slice(0, stageIndex)
                .every(stage => stage.completed);
            
            return previousStagesCompleted;
        }

        fixStageProgression(quest) {
            let foundIncompleteStage = false;
            
            quest.stages.forEach((stage, index) => {
                if (index === 0) {
                    // First stage is always unlocked
                    stage.unlocked = true;
                } else if (foundIncompleteStage) {
                    // Stages after first incomplete stage are locked
                    stage.unlocked = false;
                } else {
                    // Stage is unlocked if all previous stages are completed
                    const previousStagesCompleted = quest.stages
                        .slice(0, index)
                        .every(prevStage => prevStage.completed);
                    
                    stage.unlocked = previousStagesCompleted;
                }
                
                if (!stage.completed && !foundIncompleteStage) {
                    foundIncompleteStage = true;
                }
            });
        }


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

    handleLevelCompletion(checkbox) {
        const levelElement = checkbox.closest('.level');
        const chapterElement = levelElement.closest('.chapter');
        
        const chapterId = parseInt(chapterElement.getAttribute('data-chapter-id'));
        const levelId = parseInt(levelElement.getAttribute('data-level-id'));
        
        const result = this.questManager.completeStep(chapterId, levelId);
        
        if (result) {
            // Visual feedback
            levelElement.classList.add('completed-today');
            this.animateXP(result.xpGained);
            
            // Update progress
            this.updateProgressBars();
            this.updatePlayerStats();
            
            // Check for level up
            if (result.leveledUp) {
                this.showLevelUpAnimation(result.newLevel);
            }
            
            // Check for stage completion and next stage unlock
            if (result.unlockedNextStage) {
                this.showStageUnlockAnimation(chapterId + 1);
            }
            
            // Check for achievements
            this.renderAchievements();
        }
    }

    // New method for stage unlock animation
    showStageUnlockAnimation(nextStageId) {
        const nextStageElement = document.querySelector(`[data-chapter-id="${nextStageId}"]`);
        if (nextStageElement) {
            nextStageElement.classList.remove('locked');
            nextStageElement.classList.add('unlocking');
            
            // Remove lock icon
            const lockIcon = nextStageElement.querySelector('.lock-icon');
            if (lockIcon) {
                lockIcon.remove();
            }
            
            // Show unlock message
            const unlockMessage = document.createElement('div');
            unlockMessage.className = 'unlock-message';
            unlockMessage.textContent = '🎉 New Stage Unlocked!';
            unlockMessage.style.cssText = `
                background: linear-gradient(135deg, #FFD700, #FF9800);
                color: white;
                padding: 10px;
                border-radius: 8px;
                text-align: center;
                font-weight: bold;
                margin: 10px 0;
                animation: slideIn 0.5s ease;
            `;
            
            nextStageElement.querySelector('.levels-container').before(unlockMessage);
            
            setTimeout(() => {
                unlockMessage.remove();
                nextStageElement.classList.remove('unlocking');
            }, 3000);
        }
    }

    animateXP(xpGained) {
        const xpElement = document.getElementById('playerXP');
        const originalXP = parseInt(xpElement.textContent);
        const newXP = originalXP + xpGained;
        
        // Create floating XP text
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
        
        // Animate XP counter
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
        
        setTimeout(() => {
            floatingXP.remove();
        }, 1000);
    }

    updateProgressBars() {
        const progress = this.questManager.getQuestProgress();
        
        // Update overall progress
        const overallFill = document.getElementById('overallProgressFill');
        const overallText = document.getElementById('overallProgressText');
        
        overallFill.style.width = `${progress.overall}%`;
        overallText.textContent = `${Math.round(progress.overall)}%`;
        
        // Update day counter
        document.getElementById('currentDay').textContent = progress.currentDay;
        document.getElementById('totalDays').textContent = progress.totalDays;
        
        // Update chapter progress
        progress.chapters.forEach(chapterProgress => {
            const chapterElement = document.querySelector(`[data-chapter-id="${chapterProgress.id - 1}"]`);
            if (chapterElement) {
                const progressFill = chapterElement.querySelector('.progress-fill');
                const progressText = chapterElement.querySelector('.progress-text');
                
                progressFill.style.width = `${chapterProgress.progress}%`;
                progressText.textContent = `${Math.round(chapterProgress.progress)}%`;
                
                // Update today's progress
                const todayProgress = chapterElement.querySelector('.today-progress');
                if (todayProgress) {
                    todayProgress.textContent = `Today: ${chapterProgress.completedToday}/${chapterProgress.totalSteps}`;
                }
                
                // Add pulse animation
                progressFill.classList.add('progress-update');
                setTimeout(() => {
                    progressFill.classList.remove('progress-update');
                }, 500);
            }
        });
    }

    updatePlayerStats() {
        document.getElementById('playerLevel').textContent = this.questManager.player.level;
        document.getElementById('playerXP').textContent = this.questManager.player.xp;
        document.getElementById('playerStreak').textContent = this.questManager.player.streak;
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

    // Edit Mode Methods
    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        const editBtn = document.getElementById('toggleEditBtn');
        
        if (this.isEditMode) {
            editBtn.textContent = 'Exit Edit Mode';
            editBtn.classList.add('btn-warning');
        } else {
            editBtn.textContent = 'Edit Quest';
            editBtn.classList.remove('btn-warning');
        }
        
        this.renderQuestProgress();
    }

    editStage(chapterElement) {
        const chapterId = parseInt(chapterElement.getAttribute('data-chapter-id'));
        const currentTitle = chapterElement.querySelector('.chapter-title').textContent;
        
        const editForm = document.createElement('div');
        editForm.className = 'edit-form';
        editForm.innerHTML = `
            <div class="form-group">
                <label>Stage Title:</label>
                <input type="text" class="edit-stage-title" value="${currentTitle}">
            </div>
            <div class="edit-actions">
                <button class="btn btn-success save-edit">Save</button>
                <button class="btn btn-outline cancel-edit">Cancel</button>
            </div>
        `;
        
        chapterElement.querySelector('.chapter-header').appendChild(editForm);
    }

    editStep(levelElement) {
        const chapterElement = levelElement.closest('.chapter');
        const levelId = parseInt(levelElement.getAttribute('data-level-id'));
        const chapterId = parseInt(chapterElement.getAttribute('data-chapter-id'));
        const currentTitle = levelElement.querySelector('.level-title').textContent;
        
        const editForm = document.createElement('div');
        editForm.className = 'edit-form';
        editForm.innerHTML = `
            <div class="form-group">
                <label>Step Title:</label>
                <input type="text" class="edit-step-title" value="${currentTitle}">
            </div>
            <div class="edit-actions">
                <button class="btn btn-success save-edit">Save</button>
                <button class="btn btn-outline cancel-edit">Cancel</button>
            </div>
        `;
        
        levelElement.querySelector('.level-content').appendChild(editForm);
    }

    cancelEdit(formElement) {
        formElement.remove();
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
            
            setTimeout(() => {
                confetti.remove();
            }, 3000);
        }
    }
}

// Add new animations to CSS
const style = document.createElement('style');
const newStyles = document.createElement('style');
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
    
    .locked {
        opacity: 0.6;
        background: rgba(0, 0, 0, 0.05);
    }
    
    .locked .level-checkbox {
        cursor: not-allowed;
    }
    
    .completed-today {
        background: rgba(76, 175, 80, 0.1);
        border-color: #4CAF50;
    }
    
    .completed-permanent .level-title {
        text-decoration: line-through;
        color: #888;
    }
    
    .unlocking {
        animation: pulse 2s ease-in-out;
    }
    
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.02); }
    }
    
    .btn-warning {
        background: linear-gradient(135deg, #FF9800, #F57C00);
        color: white;
    }
    
    .edit-form {
        background: rgba(255, 255, 255, 0.9);
        padding: 15px;
        border-radius: 10px;
        margin: 10px 0;
        border: 2px solid #667eea;
    }
    
    .edit-actions {
        display: flex;
        gap: 10px;
        margin-top: 10px;
    }
    
    .btn-sm {
        padding: 6px 12px;
        font-size: 0.9em;
    }
    
    .today-progress {
        font-size: 0.9em;
        color: #666;
        margin-left: 10px;
    }
`;

    newStyles.textContent = `
        @keyframes slideInRight {
            0% { transform: translateX(100%); opacity: 0; }
            100% { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutRight {
            0% { transform: translateX(0); opacity: 1; }
            100% { transform: translateX(100%); opacity: 0; }
        }
        
        .edit-success-message {
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
        }
        
        .stage-complete-message {
            z-index: 2002;
        }
    `;
document.head.appendChild(newStyles);