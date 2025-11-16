// app.js
class App {
    constructor() {
        //this.characterManager = new CharacterManager();
        this.init();
    }

    async init() {
        try {
            // Check if user has selected a character first
            // if (!this.characterManager.hasSelectedCharacter()) {
            //     this.showCharacterSelection();
            //     return;
            // }

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
                const firebaseData = await this.firebaseManager.loadQuestFromFirebase();
                
                if (firebaseData) {
                    // Data will be automatically loaded via the realtime listener in FirebaseManager
                } else {
                    this.questManager.loadFromLocalStorage();
                }
            } else {
                // Fallback to localStorage
                this.questManager.loadFromLocalStorage();
            }
            
            this.initializeUI();

            // this.characterManager.addCharacterToProgressPanel();
            
            // Apply theme after everything is loaded
            this.applyCurrentTheme();
            
            // Initialize Spotify integration AFTER UI is ready
            this.initializeSpotify();
            
            // Make available globally for debugging
            window.app = this;
            window.questManager = this.questManager;
            window.uiManager = this.uiManager;
            window.firebaseManager = this.firebaseManager;
            // window.characterManager = this.characterManager;
            
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            this.showFirebaseSetupWarning();
            this.initializeWithoutFirebase();
        }
    }

    initializeWithoutFirebase() {
        this.questManager = new QuestManager(null);
        this.questManager.loadFromLocalStorage();
        
        // Initialize UI
        this.initializeUI();
        
        // Add character to UI
        // this.characterManager.addCharacterToProgressPanel();
        
        // Apply theme after initialization
        this.applyCurrentTheme();
        
        // Initialize Spotify integration
        this.initializeSpotify();
    }

    initializeUI() {
        // Show the appropriate panel first, THEN initialize UI manager
        this.showMainContent();
        
        // Now initialize UI manager with the current state
        this.uiManager = new UIManager(this.questManager);
        
        // If in progress panel, render the quest progress
        if (this.questManager.currentQuest && document.getElementById('questProgressPanel')?.classList.contains('hidden') === false) {
            this.uiManager.renderQuestProgress();
        }
    }

    // In app.js - update initializeSpotify method
initializeSpotify() {
    console.log('Initializing Spotify integration...');
    
    // Wait for everything to be ready
    setTimeout(() => {
        if (window.spotifyIntegration && window.SPOTIFY_CONFIG) {
            console.log('Spotify integration available, initializing...');
            
            try {
                window.spotifyIntegration.init(window.SPOTIFY_CONFIG);
                console.log('Spotify integration initialized successfully');
                
                // Check if we need to process an authorization code
                if (window.location.search.includes('code=')) {
                    console.log('Authorization code found, processing...');
                    setTimeout(() => {
                        window.spotifyIntegration.checkAuthentication();
                    }, 1000);
                }
            } catch (error) {
                console.error('Error initializing Spotify integration:', error);
            }
        } else {
            console.error('Spotify integration not available');
        }
    }, 1500);
}

    showMainContent() {
        // Hide character selection
        // document.getElementById('characterSelectionPanel')?.classList.add('hidden');
        
        // Show the appropriate panel based on whether a quest exists
        if (this.questManager.currentQuest) {
            document.getElementById('questProgressPanel')?.classList.remove('hidden');
            document.getElementById('questCreationPanel')?.classList.add('hidden');
        } else {
            document.getElementById('questCreationPanel')?.classList.remove('hidden');
            document.getElementById('questProgressPanel')?.classList.add('hidden');
        }
    }

    // showCharacterSelection() {
    //     document.getElementById('questCreationPanel')?.classList.add('hidden');
    //     document.getElementById('questProgressPanel')?.classList.add('hidden');
    //     document.getElementById('firebaseLoading')?.classList.add('hidden');

    //     const characterPanel = document.getElementById('characterSelectionPanel');
    //     if (characterPanel) {
    //         characterPanel.classList.remove('hidden');
    //         this.characterManager.renderCharacterSelection();
            

    //         const confirmBtn = document.getElementById('confirmCharacterBtn');
    //         if (confirmBtn) {
    //             confirmBtn.replaceWith(confirmBtn.cloneNode(true));
    //             document.getElementById('confirmCharacterBtn').addEventListener('click', () => {
    //                 if (this.characterManager.confirmSelection()) {
    //                     this.onCharacterSelected();
    //                 }
    //             });
    //         }
    //     } else {
    //         console.error('Character selection panel not found!');
    //         this.initializeApp();
    //     }
    // }

    // onCharacterSelected() {
    //     document.getElementById('characterSelectionPanel').classList.add('hidden');

    //     document.getElementById('questCreationPanel').classList.remove('hidden');
    //     this.uiManager = new UIManager(this.questManager);
    //     this.initializeApp();
    // }

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
    // changeCharacter() {
    //     this.characterManager.resetCharacter();
    //     this.showCharacterSelection();
    // }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Starting App initialization');
    new App();
});