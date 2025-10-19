// app.js
class App {
    constructor() {
        this.characterManager = new CharacterManager();
        this.init();
    }

    async init() {
        try {
            // Check if user has selected a character first
            if (!this.characterManager.hasSelectedCharacter()) {
                this.showCharacterSelection();
                return; // Stop here until character is selected
            }

            // Continue with normal app initialization
            await this.initializeApp();

        } catch (error) {
            console.error('App initialization failed:', error);
            this.initializeWithoutFirebase();
        }
    }

    async initializeApp() {
        try {
            // Check if Firebase config exists
            if (typeof firebaseConfig === 'undefined') {
                this.showFirebaseSetupWarning();
                this.initializeWithoutFirebase();
                return;
            }

            // Initialize Firebase first
            this.firebaseManager = new FirebaseManager();
            
            // Wait for Firebase auth to initialize
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Initialize QuestManager with Firebase manager
            this.questManager = new QuestManager(this.firebaseManager);
            
            // Set the QuestManager reference in FirebaseManager
            this.firebaseManager.setQuestManager(this.questManager);
            
            // Try to load from Firebase first
            if (this.firebaseManager.isConnected && this.firebaseManager.userId) {
                console.log('Waiting for Firebase data...');
                // Firebase will load data via the realtime listener
            } else {
                // Fallback to localStorage
                this.questManager.loadFromLocalStorage();
            }
            
            // Initialize UI only after we know which panel to show
            this.initializeUI();
            
            // Add character to UI if we have one
            this.characterManager.addCharacterToProgressPanel();
            
            // Apply theme after everything is loaded
            this.applyCurrentTheme();
            
            // Make available globally for debugging
            window.app = this;
            window.questManager = this.questManager;
            window.uiManager = this.uiManager;
            window.firebaseManager = this.firebaseManager;
            window.characterManager = this.characterManager;
            
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            this.showFirebaseSetupWarning();
            this.initializeWithoutFirebase();
        }
    }

    initializeWithoutFirebase() {
        this.questManager = new QuestManager(null);
        this.questManager.loadFromLocalStorage();
        
        // Initialize UI only after we know which panel to show
        this.initializeUI();
        
        // Add character to UI if we have one
        this.characterManager.addCharacterToProgressPanel();
        
        // Apply theme after initialization
        this.applyCurrentTheme();
        
        console.log('App initialized without Firebase (local storage only)');
    }

    initializeUI() {
        // Show the appropriate panel first, THEN initialize UI manager
        this.showMainContent();
        
        // Now initialize UI manager with the current state
        this.uiManager = new UIManager(this.questManager);
        
        // If we're in progress panel, render the quest progress
        if (this.questManager.currentQuest && document.getElementById('questProgressPanel')?.classList.contains('hidden') === false) {
            this.uiManager.renderQuestProgress();
        }
    }

    showMainContent() {
        // Hide character selection
        document.getElementById('characterSelectionPanel')?.classList.add('hidden');
        
        // Show the appropriate panel based on whether a quest exists
        if (this.questManager.currentQuest) {
            document.getElementById('questProgressPanel')?.classList.remove('hidden');
            document.getElementById('questCreationPanel')?.classList.add('hidden');
        } else {
            document.getElementById('questCreationPanel')?.classList.remove('hidden');
            document.getElementById('questProgressPanel')?.classList.add('hidden');
        }
    }

    showCharacterSelection() {
        // Hide all other panels
        document.getElementById('questCreationPanel')?.classList.add('hidden');
        document.getElementById('questProgressPanel')?.classList.add('hidden');
        document.getElementById('firebaseLoading')?.classList.add('hidden');
        
        // Show character selection
        const characterPanel = document.getElementById('characterSelectionPanel');
        if (characterPanel) {
            characterPanel.classList.remove('hidden');
            this.characterManager.renderCharacterSelection();
            
            // Add event listener for confirm button
            const confirmBtn = document.getElementById('confirmCharacterBtn');
            if (confirmBtn) {
                // Remove any existing listeners to prevent duplicates
                confirmBtn.replaceWith(confirmBtn.cloneNode(true));
                document.getElementById('confirmCharacterBtn').addEventListener('click', () => {
                    if (this.characterManager.confirmSelection()) {
                        this.onCharacterSelected();
                    }
                });
            }
        } else {
            console.error('Character selection panel not found!');
            // Fallback: continue without character selection
            this.initializeApp();
        }
    }

    onCharacterSelected() {
        // Hide character selection
        document.getElementById('characterSelectionPanel').classList.add('hidden');
        
        // Show quest creation panel immediately
        document.getElementById('questCreationPanel').classList.remove('hidden');
        
        // Now initialize the UI manager since we know which panel is visible
        this.uiManager = new UIManager(this.questManager);
        
        // Continue with normal app initialization in background
        this.initializeApp();
    }

    applyCurrentTheme() {
        // Wait a bit for the QuestManager to fully load
        setTimeout(() => {
            if (this.questManager && this.questManager.decorations && this.questManager.decorations.currentTheme) {
                document.body.className = document.body.className.replace(/\btheme-\w+/g, '');
                document.body.classList.add(`theme-${this.questManager.decorations.currentTheme}`);
            } else {
                // Apply original grid style (no theme class)
                document.body.className = document.body.className.replace(/\btheme-\w+/g, '');
            }
        }, 200);
    }

    showFirebaseSetupWarning() {
        const warningElement = document.getElementById('firebaseSetupWarning');
        if (warningElement) {
            warningElement.classList.remove('hidden');
        }
    }

    // Method to allow changing character later (could be added to settings)
    changeCharacter() {
        this.characterManager.resetCharacter();
        this.showCharacterSelection();
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new App();
});