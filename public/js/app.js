// app.js
class App {
    constructor() {
        this.init();
    }

    async init() {
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
            
            // Initialize UI
            this.uiManager = new UIManager(this.questManager);
            
            // Apply theme after everything is loaded
            this.applyCurrentTheme();
            
            // Make available globally for debugging
            window.app = this;
            window.questManager = this.questManager;
            window.uiManager = this.uiManager;
            window.firebaseManager = this.firebaseManager;
            
            console.log('App initialized successfully with Firebase');
            
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            this.showFirebaseSetupWarning();
            this.initializeWithoutFirebase();
        }
    }

    initializeWithoutFirebase() {
        this.questManager = new QuestManager(null);
        this.questManager.loadFromLocalStorage();
        this.uiManager = new UIManager(this.questManager);
        
        // Apply theme after initialization
        this.applyCurrentTheme();
        
        console.log('App initialized without Firebase (local storage only)');
    }

    applyCurrentTheme() {
        // Wait a bit for the QuestManager to fully load
        setTimeout(() => {
            if (this.questManager && this.questManager.decorations && this.questManager.decorations.currentTheme) {
                document.body.className = document.body.className.replace(/\btheme-\w+/g, '');
                document.body.classList.add(`theme-${this.questManager.decorations.currentTheme}`);
                console.log('Applied theme:', this.questManager.decorations.currentTheme);
            } else {
                // Apply original grid style (no theme class)
                document.body.className = document.body.className.replace(/\btheme-\w+/g, '');
                console.log('Applied original grid style theme');
            }
        }, 200);
    }

    showFirebaseSetupWarning() {
        const warningElement = document.getElementById('firebaseSetupWarning');
        if (warningElement) {
            warningElement.classList.remove('hidden');
        }
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new App();
});