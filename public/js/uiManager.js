class DecorationsManager {
    constructor(questManager) {
        this.questManager = questManager;
        this.unlockedThemes = new Set(['default']);
        this.currentTheme = 'default';
        this.unlockedDecorations = new Set();
        this.loadProgress();
    }

    // Save/load progress
    saveProgress() {
        const progress = {
            unlockedThemes: Array.from(this.unlockedThemes),
            currentTheme: this.currentTheme,
            unlockedDecorations: Array.from(this.unlockedDecorations)
        };
        localStorage.setItem('questDecorations', JSON.stringify(progress));
    }

    loadProgress() {
        const saved = localStorage.getItem('questDecorations');
        if (saved) {
            const progress = JSON.parse(saved);
            this.unlockedThemes = new Set(progress.unlockedThemes);
            this.currentTheme = progress.currentTheme;
            this.unlockedDecorations = new Set(progress.unlockedDecorations);
            this.applyTheme(this.currentTheme);
        }
    }

    // Get available themes for UI
    getAvailableThemes() {
        const conditions = this.getUnlockConditions();
        return Object.keys(conditions).map(theme => ({
            name: theme,
            unlocked: this.unlockedThemes.has(theme),
            condition: conditions[theme]
        }));
    }
}

class UIManager {
    constructor(questManager) {
        this.questManager = questManager;
        this.isEditMode = false;
        this.initializeEventListeners();
        // Apply the current theme on initialization
        this.applyCurrentTheme();
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

        document.getElementById('themeSelectorBtn').addEventListener('click', () => this.showThemeSelector());

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

    // Apply the current theme
    applyCurrentTheme() {
        if (this.questManager.decorations && this.questManager.decorations.currentTheme) {
            // Remove all theme classes
            document.body.className = document.body.className.replace(/\btheme-\w+/g, '');
            // Add new theme class
            document.body.classList.add(`theme-${this.questManager.decorations.currentTheme}`);
            
            // Apply theme-specific styles to the entire app
            this.applyThemeStyles(this.questManager.decorations.currentTheme);
            
            // Force UI refresh
            setTimeout(() => this.refreshUIAfterThemeChange(), 100);
        }
    }

    applyThemeStyles(themeName) {
        // Remove any existing theme style elements
        const existingStyle = document.getElementById('dynamic-theme-styles');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        // Add theme-specific global styles
        const style = document.createElement('style');
        style.id = 'dynamic-theme-styles';
        
        // Theme-specific color schemes using CSS variables
        switch(themeName) {
            case 'default':
                style.textContent = `
                    :root {
                        --header-bg: #4a7c59;
                        --header-border: #3a6b47;
                        --header-shadow: #3a6b47;
                        --header-text: #e9b872;
                        
                        --panel-bg: #5d8c66;
                        --panel-border: #3a6b47;
                        
                        --task-bg: #4a7c59;
                        --task-border: #3a6b47;
                        
                        --button-primary-bg: #e9b872;
                        --button-primary-border: #d9a862;
                        --button-primary-text: #2c5530;
                        --button-primary-shadow: #d9a862;
                        
                        --progress-fill: #d1a465ff;
                        --progress-border: #b38b53ff;
                        
                        --stat-value: #e5c79dff;
                        
                        --roadmap-bg: #5d8c66;
                        --roadmap-border: #e9b872;
                        --roadmap-shadow: #e9b872;
                        
                        --stage-title-color: #f8f5f0;
                        --stage-progress-color: #f8f5f0;
                        --stage-label-color: #e9b872;
                        --task-title-color: #f8f5f0;
                        --task-completed-color: #b8d4c0;

                        --progress-completed: #d1a465ff;
                        --progress-completed-border: #b38b53ff;
                    }
                `;
                break;
                
            case 'cafe':
                style.textContent = `
                    :root {
                        --header-bg: #8B4513;
                        --header-border: #5D4037;
                        --header-shadow: #5D4037;
                        --header-text: #F4A460;
                        
                        --panel-bg: #A0522D;
                        --panel-border: #8B4513;
                        
                        --task-bg: #8B4513;
                        --task-border: #5D4037;
                        
                        --button-primary-bg: #D2691E;
                        --button-primary-border: #A0522D;
                        --button-primary-text: #f8f5f0;
                        --button-primary-shadow: #A0522D;
                        
                        --progress-fill: #D2691E;
                        --progress-border: #A0522D;
                        
                        --stat-value: #F4A460;
                        
                        --roadmap-bg: #A0522D;
                        --roadmap-border: #D2691E;
                        --roadmap-shadow: #D2691E;
                        
                        --stage-title-color: #f8f5f0;
                        --stage-progress-color: #f8f5f0;
                        --stage-label-color: #F4A460;
                        --task-title-color: #f8f5f0;
                        --task-completed-color: #D2B48C;

                        --progress-completed: #D2691E;
                        --progress-completed-border: #A0522D;
                    }
                `;
                break;
                
            case 'pond':
                style.textContent = `
                    :root {
                        --header-bg: #1e3a5f;
                        --header-border: #0d1b2a;
                        --header-shadow: #0d1b2a;
                        --header-text: #4facfe;
                        
                        --panel-bg: #2a4b8d;
                        --panel-border: #1e3a5f;
                        
                        --task-bg: #1e3a5f;
                        --task-border: #0d1b2a;
                        
                        --button-primary-bg: #4facfe;
                        --button-primary-border: #2a4b8d;
                        --button-primary-text: #f8f5f0;
                        --button-primary-shadow: #2a4b8d;
                        
                        --progress-fill: #4facfe;
                        --progress-border: #2a4b8d;
                        
                        --stat-value: #00f2fe;
                        
                        --roadmap-bg: #2a4b8d;
                        --roadmap-border: #4facfe;
                        --roadmap-shadow: #4facfe;
                        
                        --stage-title-color: #f8f5f0;
                        --stage-progress-color: #f8f5f0;
                        --stage-label-color: #4facfe;
                        --task-title-color: #f8f5f0;
                        --task-completed-color: #87CEEB;

                        --progress-completed: #4facfe;
                        --progress-completed-border: #2a4b8d;
                    }
                `;
                break;
                
            case 'forest':
                style.textContent = `
                    :root {
                        --header-bg: #1b4332;
                        --header-border: #0d1f14;
                        --header-shadow: #0d1f14;
                        --header-text: #43e97b;
                        
                        --panel-bg: #2d6a4f;
                        --panel-border: #1b4332;
                        
                        --task-bg: #1b4332;
                        --task-border: #0d1f14;
                        
                        --button-primary-bg: #7bdd9ce6;
                        --button-primary-border: #2d6a4f;
                        --button-primary-text: #1b4332;
                        --button-primary-shadow: #2d6a4f;
                        
                        --progress-fill: #89d4a2ff;
                        --progress-border: #2d6a4f;
                        
                        --stat-value: #38f9d7;
                        
                        --roadmap-bg: #2d6a4f;
                        --roadmap-border: #6fdf94ff;
                        --roadmap-shadow: #50c878ff;
                        
                        --stage-title-color: #f8f5f0;
                        --stage-progress-color: #f8f5f0;
                        --stage-label-color: #43e97b;
                        --task-title-color: #f8f5f0;
                        --task-completed-color: #90EE90;

                        --progress-completed: #89d4a2ff;
                        --progress-completed-border: #2d6a4f;
                    }
                `;
                break;
                
            case 'sunset':
                style.textContent = `
                    :root {
                        --header-bg: #6a0572;
                        --header-border: #4a034f;
                        --header-shadow: #4a034f;
                        --header-text: #fa709a;
                        
                        --panel-bg: #8a2be2;
                        --panel-border: #6a0572;
                        
                        --task-bg: #6a0572;
                        --task-border: #4a034f;
                        
                        --button-primary-bg: #fa83a7ff;
                        --button-primary-border: #8a2be2;
                        --button-primary-text: #f8f5f0;
                        --button-primary-shadow: #8a2be2;
                        
                        --progress-fill: #f391aeff;
                        --progress-border: #8a2be2;
                        
                        --stat-value: #fee140;
                        
                        --roadmap-bg: #8a2be2;
                        --roadmap-border: #e984a2ff;
                        --roadmap-shadow: #d77b97ff;
                        
                        --stage-title-color: #f8f5f0;
                        --stage-progress-color: #f8f5f0;
                        --stage-label-color: #fa709a;
                        --task-title-color: #f8f5f0;
                        --task-completed-color: #FFB6C1;

                        --progress-completed: #f391aeff;
                        --progress-completed-border: #8a2be2;
                    }
                `;
                break;
                
            case 'space':
                style.textContent = `
                    :root {
                        --header-bg: #0d1b2a;
                        --header-border: #050a14;
                        --header-shadow: #050a14;
                        --header-text: #415a77;
                        
                        --panel-bg: #1b263b;
                        --panel-border: #0d1b2a;
                        
                        --task-bg: #0d1b2a;
                        --task-border: #050a14;
                        
                        --button-primary-bg: #415a77;
                        --button-primary-border: #1b263b;
                        --button-primary-text: #f8f5f0;
                        --button-primary-shadow: #1b263b;
                        
                        --progress-fill: #415a77;
                        --progress-border: #1b263b;
                        
                        --stat-value: #778da9;
                        
                        --roadmap-bg: #1b263b;
                        --roadmap-border: #415a77;
                        --roadmap-shadow: #415a77;
                        
                        --stage-title-color: #f8f5f0;
                        --stage-progress-color: #f8f5f0;
                        --stage-label-color: #415a77;
                        --task-title-color: #f8f5f0;
                        --task-completed-color: #A9A9A9;

                        --progress-completed: #415a77;
                        --progress-completed-border: #1b263b;
                    }
                `;
                break;
                
            case 'mountain':
                style.textContent = `
                    :root {
                        --header-bg: #2E7D32;
                        --header-border: #1b5e20;
                        --header-shadow: #1b5e20;
                        --header-text: #78909C;
                        
                        --panel-bg: #5D4037;
                        --panel-border: #2E7D32;
                        
                        --task-bg: #2E7D32;
                        --task-border: #1b5e20;
                        
                        --button-primary-bg: #78909C;
                        --button-primary-border: #5D4037;
                        --button-primary-text: #f8f5f0;
                        --button-primary-shadow: #5D4037;
                        
                        --progress-fill: #78909C;
                        --progress-border: #5D4037;
                        
                        --stat-value: #BCAAA4;
                        
                        --roadmap-bg: #5D4037;
                        --roadmap-border: #78909C;
                        --roadmap-shadow: #78909C;
                        
                        --stage-title-color: #f8f5f0;
                        --stage-progress-color: #f8f5f0;
                        --stage-label-color: #78909C;
                        --task-title-color: #f8f5f0;
                        --task-completed-color: #C0C0C0;

                        --progress-completed: #78909C;
                        --progress-completed-border: #5D4037;
                    }
                `;
                break;
                
            case 'beach':
                style.textContent = `
                    :root {
                        --header-bg: #4FC3F7;
                        --header-border: #29b6f6;
                        --header-shadow: #29b6f6;
                        --header-text: #FFF176;
                        
                        --panel-bg: #81D4FA;
                        --panel-border: #4FC3F7;
                        
                        --task-bg: #4FC3F7;
                        --task-border: #29b6f6;
                        
                        --button-primary-bg: #FFF176;
                        --button-primary-border: #81D4FA;
                        --button-primary-text: #1e3a5f;
                        --button-primary-shadow: #81D4FA;
                        
                        --progress-fill: #f9ee93ff;
                        --progress-border: #81D4FA;
                        
                        --stat-value: #FFD54F;
                        
                        --roadmap-bg: #81D4FA;
                        --roadmap-border: #efe692ff;
                        --roadmap-shadow: #dfd68aff;
                        
                        --stage-title-color: #1e3a5f;
                        --stage-progress-color: #1e3a5f;
                        --stage-label-color: #FFF176;
                        --task-title-color: #1e3a5f;
                        --task-completed-color: #87CEEB;

                        --progress-completed: #f9ee93ff;
                        --progress-completed-border: #81D4FA;
                    }
                `;
                break;
                
            case 'library':
                style.textContent = `
                    :root {
                        --header-bg: #5D4037;
                        --header-border: #3E2723;
                        --header-shadow: #3E2723;
                        --header-text: #BCAAA4;
                        
                        --panel-bg: #795548;
                        --panel-border: #5D4037;
                        
                        --task-bg: #5D4037;
                        --task-border: #3E2723;
                        
                        --button-primary-bg: #BCAAA4;
                        --button-primary-border: #795548;
                        --button-primary-text: #3E2723;
                        --button-primary-shadow: #795548;
                        
                        --progress-fill: #BCAAA4;
                        --progress-border: #795548;
                        
                        --stat-value: #D7CCC8;
                        
                        --roadmap-bg: #795548;
                        --roadmap-border: #BCAAA4;
                        --roadmap-shadow: #BCAAA4;
                        
                        --stage-title-color: #f8f5f0;
                        --stage-progress-color: #f8f5f0;
                        --stage-label-color: #BCAAA4;
                        --task-title-color: #f8f5f0;
                        --task-completed-color: #D7CCC8;

                        --progress-completed: #BCAAA4;
                        --progress-completed-border: #795548;
                    }
                `;
                break;
        }
        
        document.head.appendChild(style);
        
        // Force a re-render of all UI elements
        this.refreshUIAfterThemeChange();
    }

    // Add this method to refresh UI after theme changes
    refreshUIAfterThemeChange() {
        // Re-render the quest progress to update all UI elements
        if (this.questManager.currentQuest) {
            this.renderQuestProgress();
        }
        
        // Force browser to repaint
        document.body.offsetHeight;
    }

    // Helper method to update CSS variables
    updateThemeCSSVariables(themeName) {
        const root = document.documentElement;
        
        // Set CSS variables based on theme
        switch(themeName) {
            case 'cafe':
                root.style.setProperty('--theme-primary', '#8B4513');
                root.style.setProperty('--theme-secondary', '#5D4037');
                root.style.setProperty('--theme-accent', '#D2691E');
                break;
            case 'pond':
                root.style.setProperty('--theme-primary', '#1e3a5f');
                root.style.setProperty('--theme-secondary', '#0d1b2a');
                root.style.setProperty('--theme-accent', '#4facfe');
                break;
            case 'forest':
                root.style.setProperty('--theme-primary', '#1b4332');
                root.style.setProperty('--theme-secondary', '#0d1f14');
                root.style.setProperty('--theme-accent', '#43e97b');
                break;
            case 'sunset':
                root.style.setProperty('--theme-primary', '#6a0572');
                root.style.setProperty('--theme-secondary', '#4a034f');
                root.style.setProperty('--theme-accent', '#fa709a');
                break;
            case 'space':
                root.style.setProperty('--theme-primary', '#0d1b2a');
                root.style.setProperty('--theme-secondary', '#050a14');
                root.style.setProperty('--theme-accent', '#415a77');
                break;
            case 'mountain':
                root.style.setProperty('--theme-primary', '#2E7D32');
                root.style.setProperty('--theme-secondary', '#1b5e20');
                root.style.setProperty('--theme-accent', '#78909C');
                break;
            case 'beach':
                root.style.setProperty('--theme-primary', '#4FC3F7');
                root.style.setProperty('--theme-secondary', '#29b6f6');
                root.style.setProperty('--theme-accent', '#FFF176');
                break;
            case 'library':
                root.style.setProperty('--theme-primary', '#5D4037');
                root.style.setProperty('--theme-secondary', '#3E2723');
                root.style.setProperty('--theme-accent', '#BCAAA4');
                break;
        }
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

        // Scroll to the top of the page
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    // ===== QUEST PROGRESS RENDERING =====
    renderQuestProgress() {
        const quest = this.questManager.currentQuest;
        if (!quest) return;

        // Add null checks for these elements
        const currentQuestTitle = document.getElementById('currentQuestTitle');
        const destinationTitle = document.getElementById('destinationTitle');
        
        if (currentQuestTitle) currentQuestTitle.textContent = quest.title;
        if (destinationTitle) destinationTitle.textContent = quest.title;
        
        this.updatePlayerStats();
        
        // Only render roadmap and stage details if we're in the progress view
        const questProgressPanel = document.getElementById('questProgressPanel');
        if (questProgressPanel && !questProgressPanel.classList.contains('hidden')) {
            this.renderRoadmap();
            this.renderCurrentStage();
            this.renderAllStageDetails();
        }
    }

    renderCurrentStage() {
        const quest = this.questManager.currentQuest;
        if (!quest) return;

        // Find the current (first incomplete) stage
        const currentStage = quest.stages.find(stage => !stage.completed) || quest.stages[0];
        if (!currentStage) return;

        const stageIndex = quest.stages.indexOf(currentStage);
        const stageProgress = this.questManager.getStageProgress(stageIndex);

        // Update the current stage panel with null checks
        const currentStageTitle = document.getElementById('currentStageTitle');
        const stageProgressText = document.getElementById('stageProgressText');
        const stageProgressFill = document.getElementById('stageProgressFill');
        
        if (currentStageTitle) currentStageTitle.textContent = currentStage.title;
        if (stageProgressText) stageProgressText.textContent = `${Math.round(stageProgress)}%`;
        if (stageProgressFill) stageProgressFill.style.width = `${stageProgress}%`;

        // Only render tasks if the container exists (quest progress panel is visible)
        const tasksContainer = document.getElementById('stageTasks');
        if (tasksContainer) {
            this.renderStageTasksInPanel(stageIndex, currentStage);
        }
    }

    renderStageTasksInPanel(stageIndex, stage) {
        const tasksContainer = document.getElementById('stageTasks');
        
        // Add null check to prevent errors when element doesn't exist
        if (!tasksContainer) {
            console.log('stageTasks container not found - quest progress panel may be hidden');
            return;
        }
        
        tasksContainer.innerHTML = '';

        stage.steps.forEach((task, taskIndex) => {
            const taskElement = document.createElement('div');
            taskElement.className = `stage-task ${task.completedToday ? 'completed' : ''} ${task.isDaily ? 'daily' : ''}`;
            
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

    renderRoadmap() {
        const quest = this.questManager.currentQuest;
        const roadmapStops = document.getElementById('roadmapStops');
        if (!roadmapStops) {
            console.log('Roadmap stops container not found');
            return;
        }
        
        roadmapStops.innerHTML = '';
        
        // Calculate responsive sizing based on number of stops
        const totalStops = quest.stages.length;
        let stopWidth = '140px'; // Default from your CSS
        let markerSize = '60px';
        let fontSize = '0.9em';
        let smallFontSize = '0.75em';
        
        if (totalStops > 6) {
            stopWidth = '100px';
            markerSize = '50px';
            fontSize = '0.8em';
            smallFontSize = '0.7em';
        } else if (totalStops > 4) {
            stopWidth = '120px';
            markerSize = '55px';
            fontSize = '0.85em';
            smallFontSize = '0.72em';
        }
        
        quest.stages.forEach((stage, index) => {
            const template = document.getElementById('roadmapStopTemplate');
            const stopElement = template.content.cloneNode(true);
            const stop = stopElement.querySelector('.roadmap-stop');
            stop.setAttribute('data-stage-id', index);

            // Apply responsive sizing
            stop.style.maxWidth = stopWidth;
            stop.style.minWidth = stopWidth;
            
            const stopMarker = stop.querySelector('.stop-marker');
            if (stopMarker) {
                stopMarker.style.width = markerSize;
                stopMarker.style.height = markerSize;
            }
            
            const stageName = stop.querySelector('.stop-label h4');
            if (stageName) {
                stageName.style.fontSize = fontSize;
            }
            
            const stageDesc = stop.querySelector('.stop-label p');
            if (stageDesc) {
                stageDesc.style.fontSize = smallFontSize;
            }

            // Calculate stage progress properly
            const stageProgress = this.questManager.getStageProgress(index);

            // Remove any existing state classes
            stop.classList.remove('active', 'completed', 'inactive');
            
            if (stage.completed) {
                stop.classList.add('completed');
                const completionBadge = stop.querySelector('.completion-badge');
                if (completionBadge) completionBadge.classList.remove('hidden');
            } else {
                // Find first incomplete stage and mark it as active
                const firstIncompleteIndex = quest.stages.findIndex(s => !s.completed);
                if (index === firstIncompleteIndex) {
                    stop.classList.add('active');
                } else if (index > firstIncompleteIndex) {
                    stop.classList.add('inactive');
                }
            }

            // Update stage title and progress
            const titleElement = stop.querySelector('.stage-name');
            if (titleElement) titleElement.textContent = stage.title;
            
            // Update progress text display
            const progressText = stop.querySelector('.stage-progress-text');
            if (progressText) {
                if (stage.completed) {
                    progressText.textContent = 'Completed!';
                } else if (stageProgress === 100) {
                    progressText.textContent = 'Ready!';
                } else {
                    progressText.textContent = `${Math.round(stageProgress)}%`;
                }
                progressText.style.fontSize = '0.7em';
            }
            
            roadmapStops.appendChild(stopElement);
        });

        this.updateRoadProgress();
    }

    updateRoadProgress() {
        const quest = this.questManager.currentQuest;
        const roadProgress = document.getElementById('roadProgress');
        const progressTraveler = document.getElementById('progressTraveler');
        const travelerTooltip = document.getElementById('travelerTooltip');
        
        if (!quest || !quest.stages || quest.stages.length === 0) return;
        
        const progress = this.questManager.getQuestProgress();
        const progressPercent = progress.overall;
        
        // Update road progress bar
        if (roadProgress) {
            roadProgress.style.width = `${progressPercent}%`;
        }
        
        // Calculate positions based on actual progress, not just stage completion
        const totalSteps = quest.stages.reduce((sum, stage) => sum + (stage.steps?.length || 1), 0);
        const segmentWidth = quest.stages.map(stage => {
            const stepCount = stage.steps?.length || 1;
            return (stepCount / totalSteps) * 100; // each segment width in percentage
        });
        
        let travelerPosition = 0;
        let tooltipText = 'Starting journey...';
        
        // Find the current stage and calculate precise position
        const currentStageIndex = quest.stages.findIndex(stage => !stage.completed);
        
        if (currentStageIndex === -1) {
            // All stages completed - traveler at destination
            travelerPosition = 100;
            tooltipText = 'Destination reached! 🎉';
        } else {
            const currentStage = quest.stages[currentStageIndex];
            const currentStageProgress = this.questManager.getStageProgress(currentStageIndex);
            
            if (currentStageIndex === 0 && currentStageProgress === 0) {
                // At the very beginning
                travelerPosition = 0;
                tooltipText = 'Starting journey...';
            } else {
                // Calculate position based on completed stages + current stage progress
                
                // Position from completed stages
                const completedStagesProgress = currentStageIndex * segmentWidth;
                
                // Position from current stage progress
                const currentStageSegmentProgress = (currentStageProgress / 100) * segmentWidth;
                
                // Total position = completed stages position + current stage progress within its segment
                travelerPosition = completedStagesProgress + currentStageSegmentProgress;
                
                // Add the start segment (0% to first dynamic stop)
                travelerPosition += segmentWidth;
                
                // Ensure we don't exceed 100%
                travelerPosition = Math.min(travelerPosition, 100);
                
                // Update tooltip
                if (currentStageProgress === 100 && !currentStage.completed) {
                    tooltipText = `Ready to complete: ${currentStage.title}`;
                } else if (currentStage.completed) {
                    tooltipText = `Completed: ${currentStage.title}`;
                } else {
                    tooltipText = `Working on: ${currentStage.title} (${Math.round(currentStageProgress)}%)`;
                }
            }
        }
        
        // Update traveler position with smooth transition
        if (progressTraveler) {
            progressTraveler.style.transition = 'left 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            progressTraveler.style.left = `${travelerPosition}%`;
        }
        
        // Update traveler tooltip
        if (travelerTooltip) {
            travelerTooltip.textContent = tooltipText;
        }
        
        // Update distance traveled display
        const distanceTraveled = document.getElementById('distanceTraveled');
        if (distanceTraveled) {
            distanceTraveled.textContent = `${Math.round(progressPercent)}%`;
        }
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

    // Method to show theme selector
    showThemeSelector() {
        const modal = document.createElement('div');
        modal.className = 'modal theme-selector-modal';
        modal.innerHTML = `
            <div class="modal-content large">
                <h3>🎨 Customize Your Workspace</h3>
                <p>Unlock new themes by making progress!</p>
                <div class="theme-selector-grid" id="themeSelector"></div>
                <div class="modal-actions">
                    <button class="btn btn-primary" id="closeThemeSelector">Close</button>
                </div>
            </div>
        `;

        const themeSelector = modal.querySelector('#themeSelector');
        const themes = this.questManager.getAvailableThemes();

        themes.forEach(theme => {
            const themeOption = document.createElement('div');
            themeOption.className = `theme-option ${theme.unlocked ? '' : 'locked'} ${theme.name === this.questManager.decorations.currentTheme ? 'active' : ''}`;
            
            themeOption.innerHTML = `
                <div class="theme-preview-container">
                    <div class="theme-preview theme-${theme.name}">
                        <div class="preview-content">
                            <div class="preview-icon">${theme.icon}</div>
                            <div class="preview-title">Preview</div>
                        </div>
                    </div>
                    ${!theme.unlocked ? '<div class="lock-overlay">🔒</div>' : ''}
                    ${theme.name === this.questManager.decorations.currentTheme ? '<div class="active-badge">Active</div>' : ''}
                </div>
                <div class="theme-info">
                    <div class="theme-name">${theme.displayName}</div>
                    ${theme.unlocked ? 
                        `<div class="theme-status unlocked">Unlocked! 🎉</div>` : 
                        `<div class="theme-condition">${theme.condition.description}</div>`
                    }
                </div>
            `;

            if (theme.unlocked) {
                themeOption.addEventListener('click', () => {
                    const success = this.questManager.applyTheme(theme.name);
                    if (success) {
                        this.applyCurrentTheme();
                        this.showToast(`Applied ${theme.displayName} theme!`, 'success');
                        
                        // Update active state
                        document.querySelectorAll('.theme-option').forEach(opt => {
                            opt.classList.remove('active');
                            const existingBadge = opt.querySelector('.active-badge');
                            if (existingBadge) existingBadge.remove();
                        });
                        
                        themeOption.classList.add('active');
                        if (!themeOption.querySelector('.active-badge')) {
                            const activeBadge = document.createElement('div');
                            activeBadge.className = 'active-badge';
                            activeBadge.textContent = 'Active';
                            themeOption.querySelector('.theme-preview-container').appendChild(activeBadge);
                        }
                    }
                });
            }

            themeSelector.appendChild(themeOption);
        });

        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        modal.querySelector('#closeThemeSelector').addEventListener('click', () => {
            modal.remove();
        });
    }

    handleTaskCompletion(checkbox) {
        const taskId = parseInt(checkbox.getAttribute('data-task-id'));
        const stageId = parseInt(checkbox.getAttribute('data-stage-id'));
        
        const result = this.questManager.completeStep(stageId, taskId);
        
        if (result) {
            const taskElement = checkbox.closest('.stage-task');
            taskElement.classList.add('completed');
            
            this.animateXP(result.xpGained);
            
            // Refresh ALL UI components after task completion
            this.updateRoadProgress();
            this.renderRoadmap(); // Add this line to refresh roadmap stops
            this.renderAllStageDetails();
            this.updatePlayerStats();
            
            if (result.leveledUp) {
                this.showLevelUpAnimation(result.newLevel);
            }
            
            if (result.chapterCompleted) {
                this.showStageCompleteAnimation(this.questManager.currentQuest.stages[stageId].title, result.autoCompleted);
            }
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
            this.renderRoadmap(); // Add this line
            this.renderAllStageDetails();
            this.updatePlayerStats();
            this.showStageCompleteAnimation(this.questManager.currentQuest.stages[stageId].title);
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
            const taskDailyStatus = stage.steps.map(task => task.isDaily); // GET DAILY STATUS
            this.addEditStage(stage.title, taskTitles, taskDailyStatus);
        });
    }

    addEditStage(title = "New Stage", tasks = [], dailyStatus = []) {
        const editStagesContainer = document.getElementById('editStagesContainer');
        const template = document.getElementById('editStageTemplate');
        const stageElement = template.content.cloneNode(true);
        
        const stage = stageElement.querySelector('.edit-stage');
        const titleInput = stage.querySelector('.edit-stage-title');
        titleInput.value = title;
        
        const tasksContainer = stage.querySelector('.edit-tasks-container');
        tasks.forEach((taskTitle, index) => {
            const isDaily = dailyStatus[index] || false;
            this.addEditTaskToContainer(tasksContainer, taskTitle, isDaily);
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

    addEditTaskToContainer(container, title = "New Task", isDaily = false) {
        const template = document.getElementById('editTaskTemplate');
        const taskElement = template.content.cloneNode(true);
        
        const task = taskElement.querySelector('.edit-task');
        const titleInput = task.querySelector('.edit-task-title');
        titleInput.value = title;
        
        // Add daily toggle button
        const dailyToggle = document.createElement('button');
        dailyToggle.type = 'button';
        dailyToggle.className = `btn btn-sm ${isDaily ? 'btn-warning' : 'btn-outline'} edit-daily-toggle`;
        dailyToggle.textContent = isDaily ? '⭐ Daily' : 'Make Daily';
        dailyToggle.title = isDaily ? 'Remove daily status' : 'Make this a daily practice task';
        dailyToggle.style.marginLeft = '8px';
        
        // Store daily status as data attribute
        task.setAttribute('data-daily', isDaily.toString());
        
        dailyToggle.addEventListener('click', () => {
            const currentDaily = task.getAttribute('data-daily') === 'true';
            const newDaily = !currentDaily;
            
            task.setAttribute('data-daily', newDaily.toString());
            dailyToggle.textContent = newDaily ? '⭐ Daily' : 'Make Daily';
            dailyToggle.className = `btn btn-sm ${newDaily ? 'btn-warning' : 'btn-outline'} edit-daily-toggle`;
            dailyToggle.title = newDaily ? 'Remove daily status' : 'Make this a daily practice task';
        });
        
        titleInput.parentNode.insertBefore(dailyToggle, titleInput.nextSibling);
        
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
            const tasks = Array.from(stageElement.querySelectorAll('.edit-task')).map(taskElement => {
                const taskTitle = taskElement.querySelector('.edit-task-title').value.trim();
                const isDaily = taskElement.getAttribute('data-daily') === 'true';
                return { title: taskTitle, isDaily: isDaily };
            }).filter(task => task.title !== '');
            
            return { 
                title, 
                steps: tasks.map(t => t.title),
                dailyStatus: tasks.map(t => t.isDaily)
            };
        });

        this.updateExistingQuestWithDailyStatus(newTitle, stages);
        this.hideEditQuestModal();
        
        // Only refresh the UI if we're currently viewing the quest progress
        const questProgressPanel = document.getElementById('questProgressPanel');
        if (questProgressPanel && !questProgressPanel.classList.contains('hidden')) {
            this.renderQuestProgress();
        }
        
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
                        isDaily: oldStep?.isDaily || false, // PRESERVE DAILY STATUS
                        xp: this.questManager.calculateStepXP(newStage.steps.length)
                    };
                }),
                completed: this.isStageCompleted(currentProgress, newStage.title, index),
                unlocked: this.isStageUnlocked(currentProgress, newStage.title, index)
            };
        });

        oldQuest.stages = updatedStages;
        this.fixStageProgression(oldQuest);
        this.questManager.saveToFirebase(); // SAVE TO FIREBASE
    }

    updateExistingQuestWithDailyStatus(newTitle, newStages) {
        const oldQuest = this.questManager.currentQuest;
        oldQuest.title = newTitle;
        
        const currentProgress = this.getCurrentProgressState(oldQuest);
        const updatedStages = newStages.map((newStage, index) => {
            return {
                id: index + 1,
                title: newStage.title,
                steps: newStage.steps.map((stepTitle, stepIndex) => {
                    const oldStep = this.findMatchingStep(currentProgress, newStage.title, stepTitle, index, stepIndex);
                    const isDaily = newStage.dailyStatus ? newStage.dailyStatus[stepIndex] : (oldStep?.isDaily || false);
                    
                    return {
                        id: stepIndex + 1,
                        title: stepTitle,
                        completed: oldStep?.completed || false,
                        completedToday: oldStep?.completedToday || false,
                        isDaily: isDaily, // USE PRESERVED DAILY STATUS
                        xp: this.questManager.calculateStepXP(newStage.steps.length)
                    };
                }),
                completed: this.isStageCompleted(currentProgress, newStage.title, index),
                unlocked: this.isStageUnlocked(currentProgress, newStage.title, index)
            };
        });

        oldQuest.stages = updatedStages;
        this.fixStageProgression(oldQuest);
        this.questManager.saveToFirebase(); // SAVE TO FIREBASE
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
                    completedToday: step.completedToday,
                    isDaily: step.isDaily // INCLUDE DAILY STATUS
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
        
        // Then try by index if titles don't match
        const indexStage = progress.stages[stageIndex];
        if (indexStage && indexStage.steps[stepIndex]) {
            return indexStage.steps[stepIndex];
        }
        
        // If no match found, try to find by step title anywhere in the quest
        for (const stage of progress.stages) {
            const step = stage.steps.find(s => s.title === stepTitle);
            if (step) return step;
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
        
        document.body.appendChild(message);
        message.querySelector('.close-message').addEventListener('click', () => {
            message.remove();
            this.renderQuestProgress();
        });
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
        // Header stats with null checks
        const playerLevel = document.getElementById('playerLevel');
        const playerXP = document.getElementById('playerXP');
        const playerStreak = document.getElementById('playerStreak');
        const totalDaysProgress = document.getElementById('totalDaysProgress');
        const distanceTraveled = document.getElementById('distanceTraveled');
        
        if (playerLevel) playerLevel.textContent = this.questManager.player.level;
        if (playerXP) playerXP.textContent = this.questManager.player.xp;
        if (playerStreak) playerStreak.textContent = this.questManager.player.streak;
        if (totalDaysProgress) totalDaysProgress.textContent = this.questManager.player.totalDays;

        // Update distance traveled
        const progress = this.questManager.getQuestProgress();
        if (distanceTraveled) distanceTraveled.textContent = `${Math.round(progress.distanceTraveled)}%`;
    }

    renderThemes() {
        const container = document.getElementById('achievementsGrid'); // Reuse the same container
        if (!container) return;
        
        container.innerHTML = '<h3>🎨 Unlocked Themes</h3>';
        
        const themes = this.questManager.getAvailableThemes();
        const themesGrid = document.createElement('div');
        themesGrid.className = 'themes-grid';
        themesGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-top: 15px;
        `;

        themes.forEach(theme => {
            const themeElement = document.createElement('div');
            themeElement.className = `theme-display ${theme.unlocked ? 'unlocked' : 'locked'}`;
            themeElement.innerHTML = `
                <div class="theme-icon">${theme.icon}</div>
                <div class="theme-info">
                    <div class="theme-name">${theme.displayName}</div>
                    ${theme.unlocked ? 
                        `<div class="theme-status">Unlocked! 🎉</div>` : 
                        `<div class="theme-condition">${theme.condition}</div>`
                    }
                </div>
            `;

            if (theme.unlocked) {
                themeElement.style.cursor = 'pointer';
                themeElement.addEventListener('click', () => {
                    this.questManager.applyTheme(theme.name);
                    this.applyCurrentTheme();
                    this.showToast(`Applied ${theme.displayName} theme!`, 'success');
                });
            }

            themesGrid.appendChild(themeElement);
        });

        container.appendChild(themesGrid);
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
        
        document.body.appendChild(message);
        message.querySelector('.close-reset-message').addEventListener('click', () => {
            message.remove();
        });
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(message)) {
                message.remove();
            }
        }, 5000);
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